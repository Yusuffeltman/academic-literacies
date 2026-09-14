// src/quiz-grading.js
// ─────────────────────────────────────────────
// Pure grading/attempt logic for graded (summative) quizzes.
//
// Design (see the graded-quiz implementation plan):
//   • up to TWO counted attempts, score = best of the two
//   • 60% mastery pass threshold
//   • an attempt is consumed only once it is SUBMITTED (an abandoned or
//     interrupted session does not use one up)
//   • unlimited ungraded PRACTICE runs (mode: 'practice') never affect the mark
//   • each attempt draws a randomised item sample from a larger bank
//   • the quiz block contributes a fixed weight (e.g. 10%) to the final mark,
//     computed as the mean of each student's best score across graded quizzes
//
// This module is deliberately free of Firebase/DOM so it is unit-testable and
// reusable by the attempt engine (server) and the UI (client) alike. It is NOT
// yet wired into the app; wiring, security rules and the gradebook column come
// in later phases.
// ─────────────────────────────────────────────

export const QUIZ_DEFAULTS = Object.freeze({
  maxAttempts: 2,
  passMark: 60,
  weight: 0.10,
  practiceUnlimited: true,
  minGapHours: 0,
});

function _num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

// Normalise a quiz definition, applying defaults.
export function normalizeQuiz(quiz = {}) {
  const bank = Array.isArray(quiz.itemBank) ? quiz.itemBank.filter((it) => it && it.id != null) : [];
  const itemsPerAttempt = Math.min(_num(quiz.itemsPerAttempt, bank.length) || bank.length, bank.length);
  return {
    quizId: String(quiz.quizId || quiz.id || '').trim(),
    title: String(quiz.title || '').trim(),
    unitId: String(quiz.unitId || '').trim(),
    itemBank: bank,
    itemsPerAttempt,
    maxAttempts: _num(quiz.maxAttempts, QUIZ_DEFAULTS.maxAttempts),
    passMark: _num(quiz.passMark, QUIZ_DEFAULTS.passMark),
    weight: quiz.weight == null ? QUIZ_DEFAULTS.weight : _num(quiz.weight, QUIZ_DEFAULTS.weight),
    minGapHours: _num(quiz.minGapHours, QUIZ_DEFAULTS.minGapHours),
    practiceUnlimited: quiz.practiceUnlimited !== false,
  };
}

// Deterministic, seedable RNG (mulberry32) so item sampling is reproducible
// (audit/integrity) and identical on server and client for the same seed.
function _mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function _hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Sample `itemsPerAttempt` item ids from the bank, deterministically for a seed.
export function sampleItemIds(quiz, seed) {
  const q = normalizeQuiz(quiz);
  const ids = q.itemBank.map((it) => it.id);
  const rng = _mulberry32(typeof seed === 'number' ? seed : _hashSeed(String(seed ?? q.quizId)));
  for (let i = ids.length - 1; i > 0; i--) { // Fisher–Yates
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, q.itemsPerAttempt);
}

// Score a single attempt. `answers` maps itemId -> chosen option index.
export function scoreAttempt(quiz, itemIds = [], answers = {}) {
  const q = normalizeQuiz(quiz);
  const byId = new Map(q.itemBank.map((it) => [it.id, it]));
  const ids = itemIds.length ? itemIds : q.itemBank.map((it) => it.id);
  let correct = 0;
  for (const id of ids) {
    const item = byId.get(id);
    if (item && Number(answers[id]) === Number(item.correctIndex)) correct += 1;
  }
  const total = ids.length || 0;
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

// Counted, submitted attempts only (practice and abandoned attempts excluded).
export function countedAttempts(attempts = []) {
  return (Array.isArray(attempts) ? attempts : [])
    .filter((a) => a && a.mode === 'counted' && a.submittedAt);
}

export function attemptsUsed(attempts = []) {
  return countedAttempts(attempts).length;
}

export function remainingAttempts(quiz, attempts = []) {
  return Math.max(0, normalizeQuiz(quiz).maxAttempts - attemptsUsed(attempts));
}

// May the student START another counted attempt? Enforces the cap and the
// optional spacing gap (an in-progress, unsubmitted attempt does not block).
export function canStartCountedAttempt(quiz, attempts = [], now = Date.now()) {
  const q = normalizeQuiz(quiz);
  if (remainingAttempts(q, attempts) <= 0) return { ok: false, reason: 'no-attempts-left' };
  if (q.minGapHours > 0) {
    const last = countedAttempts(attempts)
      .map((a) => new Date(a.submittedAt).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((x, y) => y - x)[0];
    if (last != null && (now - last) < q.minGapHours * 3600000) {
      return { ok: false, reason: 'gap-not-elapsed', nextAllowedAt: last + q.minGapHours * 3600000 };
    }
  }
  return { ok: true };
}

// Best-of-two result for one quiz.
export function resolveQuizResult(quiz, attempts = []) {
  const q = normalizeQuiz(quiz);
  const counted = countedAttempts(attempts);
  const bestPct = counted.length ? Math.max(...counted.map((a) => _num(a.scorePct, 0))) : null;
  return {
    quizId: q.quizId,
    bestPct,
    passed: bestPct != null && bestPct >= q.passMark,
    attemptsUsed: counted.length,
    remaining: Math.max(0, q.maxAttempts - counted.length),
  };
}

// Quiz-block percentage: mean of each quiz's best score (a quiz with no counted
// attempt counts as 0). Returns 0–100.
export function quizBlockPercent(quizzes = [], attemptsByQuizId = {}) {
  const list = Array.isArray(quizzes) ? quizzes : [];
  if (!list.length) return 0;
  const total = list.reduce((sum, quiz) => {
    const q = normalizeQuiz(quiz);
    const r = resolveQuizResult(q, attemptsByQuizId[q.quizId] || []);
    return sum + (r.bestPct == null ? 0 : r.bestPct);
  }, 0);
  return Math.round((total / list.length) * 100) / 100;
}

// The quiz block's contribution to the final mark, in percentage points of the
// final mark (e.g. blockPct 80 at weight 0.10 -> 8.0 points out of 100).
export function quizContributionPoints(quizBlockPct, weight = QUIZ_DEFAULTS.weight) {
  return Math.round(_num(quizBlockPct, 0) * _num(weight, QUIZ_DEFAULTS.weight) * 100) / 100;
}

// ── Authoritative (server-verified) scoring ──────────────────────────────────
// Recompute a stored attempt's score from its answers + the item bank, ignoring
// any client-written scorePct. Used by the gradebook so a tampered scorePct
// cannot inflate a mark.
export function authoritativeAttemptPct(quiz, attempt = {}) {
  return scoreAttempt(quiz, attempt.itemIds || [], attempt.answers || {}).pct;
}

// Best-of-two using authoritative recomputation from stored answers.
export function resolveQuizResultAuthoritative(quiz, attempts = []) {
  const q = normalizeQuiz(quiz);
  const counted = countedAttempts(attempts);
  const bestPct = counted.length ? Math.max(...counted.map((a) => authoritativeAttemptPct(q, a))) : null;
  return {
    quizId: q.quizId,
    bestPct,
    passed: bestPct != null && bestPct >= q.passMark,
    attemptsUsed: counted.length,
    remaining: Math.max(0, q.maxAttempts - counted.length),
  };
}

// Per-quiz WEIGHTED contribution to the final mark. Each quiz contributes its
// own weight (e.g. two quizzes at 0.10 each -> up to 20 final-mark points).
// A quiz with no counted attempt contributes 0. Returns final-mark points and a
// per-quiz breakdown. Set authoritative:false to trust stored scorePct instead.
export function weightedQuizContribution(quizzes = [], attemptsByQuizId = {}, { authoritative = true } = {}) {
  const perQuiz = {};
  let points = 0, maxPoints = 0;
  for (const quiz of (Array.isArray(quizzes) ? quizzes : [])) {
    const q = normalizeQuiz(quiz);
    const attempts = attemptsByQuizId[q.quizId] || [];
    const r = authoritative ? resolveQuizResultAuthoritative(q, attempts) : resolveQuizResult(q, attempts);
    const best = r.bestPct == null ? 0 : r.bestPct;
    const qPoints = Math.round(best * q.weight * 100) / 100;
    perQuiz[q.quizId] = { bestPct: r.bestPct, passed: r.passed, weight: q.weight, points: qPoints, attemptsUsed: r.attemptsUsed };
    points += qPoints;
    maxPoints += q.weight * 100;
  }
  return { points: Math.round(points * 100) / 100, maxPoints: Math.round(maxPoints * 100) / 100, perQuiz };
}

// Running weighted module mark from a flat { componentId: markPct(0-100)|null }
// and a flat { componentId: weight(0-1) } map. Components with no mark yet are
// excluded, so this is meaningful before every component exists:
//   • points        – final-mark points earned so far (out of 100)
//   • weightCovered – fraction of the module assessed so far (0-1)
//   • totalWeight    – sum of all configured weights (should be ~1)
//   • currentPercent – average % over the assessed portion (points/weightCovered)
export function computeModuleFinal(componentMarks = {}, weights = {}) {
  let points = 0, weightCovered = 0, totalWeight = 0;
  for (const [id, w] of Object.entries(weights)) {
    const wt = _num(w, 0);
    totalWeight += wt;
    const mark = componentMarks[id];
    if (mark == null || Number.isNaN(Number(mark))) continue;
    points += _num(mark, 0) * wt;
    weightCovered += wt;
  }
  return {
    points: Math.round(points * 100) / 100,
    weightCovered: Math.round(weightCovered * 1000) / 1000,
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    currentPercent: weightCovered > 0 ? Math.round((points / weightCovered) * 100) / 100 : 0,
  };
}

// Weighted final mark, for when the other assessments' weights are supplied.
// assessments: [{ mark: 0-100, weight: 0-1 }]. Returns points (out of 100) and
// the total weight covered so callers can see whether weights sum to 1.
export function computeFinalMark({ assessments = [], quizBlockPct = 0, quizWeight = 0 } = {}) {
  let points = 0, weightCovered = 0;
  for (const a of (Array.isArray(assessments) ? assessments : [])) {
    const w = _num(a.weight, 0);
    points += _num(a.mark, 0) * w;
    weightCovered += w;
  }
  points += _num(quizBlockPct, 0) * _num(quizWeight, 0);
  weightCovered += _num(quizWeight, 0);
  return { points: Math.round(points * 100) / 100, weightCovered: Math.round(weightCovered * 1000) / 1000 };
}

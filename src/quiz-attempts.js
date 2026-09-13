// src/quiz-attempts.js
// ─────────────────────────────────────────────
// Data access for graded-quiz attempts (RTDB). Pairs with the pure logic in
// quiz-grading.js and the security rules under `quiz-attempts` in
// database.rules.json.
//
// Storage model (server-enforced by rules):
//   quiz-attempts/{quizId}/{uid}/counted/{slot}   slot ∈ {"1","2"}, write-once
//                                                 (immutable) → hard cap of two
//                                                 counted attempts, no function
//   quiz-attempts/{quizId}/{uid}/practice/{pushId} unlimited, ungraded
//
// A counted slot is written ONLY on submission, so an interrupted/abandoned
// session never consumes an attempt. The stored scorePct is a convenience cache;
// the gradebook recomputes the authoritative score from the stored answers and
// the item bank, so a tampered scorePct cannot inflate a mark.
//
// NOTE (integrity limitation): item banks — including correct answers — ship to
// the client (as the formative quizzes already do). This is acceptable for a
// low-stakes 10% mastery component; moving scoring server-side (a Cloud Function
// holding the key) is the hardening path if stronger security is later required.
// ─────────────────────────────────────────────
import { db } from './firebase.js';
import { ref, get, set, push } from 'firebase/database';
import { STATE } from './state.js';
import { normalizeQuiz, scoreAttempt, resolveQuizResult, sampleItemIds } from './quiz-grading.js';

function _uid() { return STATE.user?.uid || null; }
function _nowIso() { return new Date().toISOString(); }

// Load this student's attempts for a quiz → { counted: {slot: attempt}, practice: {...} }.
export async function loadMyQuizAttempts(quizId) {
  const uid = _uid();
  if (!uid || !quizId) return { counted: {}, practice: {} };
  try {
    const snap = await get(ref(db, `quiz-attempts/${quizId}/${uid}`));
    const val = snap.exists() ? (snap.val() || {}) : {};
    return { counted: val.counted || {}, practice: val.practice || {} };
  } catch {
    return { counted: {}, practice: {} };
  }
}

function _countedArray(node = {}) {
  return Object.values(node.counted || {}).filter((a) => a && typeof a === 'object');
}

function _nextCountedSlot(node = {}, maxAttempts = 2) {
  for (let s = 1; s <= maxAttempts; s++) {
    if (!node.counted || !node.counted[String(s)]) return String(s);
  }
  return null; // all slots used
}

// Begin an attempt: return the sampled item ids + seed for this run (nothing is
// written yet — a slot is only consumed on submit).
export function startAttempt(quiz, { seed } = {}) {
  const q = normalizeQuiz(quiz);
  const useSeed = seed != null ? seed : `${q.quizId}:${_uid() || 'anon'}:${Date.now()}:${Math.random()}`;
  return { quizId: q.quizId, seed: useSeed, itemIds: sampleItemIds(q, useSeed), startedAt: _nowIso() };
}

// Submit a counted attempt. Fails cleanly if no slots remain.
export async function submitCountedAttempt(quiz, { itemIds, answers, seed, startedAt } = {}) {
  const uid = _uid();
  if (!uid) return { ok: false, error: 'Not signed in.' };
  const q = normalizeQuiz(quiz);
  try {
    const node = await loadMyQuizAttempts(q.quizId);
    const slot = _nextCountedSlot(node, q.maxAttempts);
    if (!slot) return { ok: false, error: 'You have used both attempts for this quiz.' };
    const { pct } = scoreAttempt(q, itemIds, answers);
    const record = {
      mode: 'counted',
      quizId: q.quizId,
      slot: Number(slot),
      itemIds: Array.isArray(itemIds) ? itemIds : [],
      answers: answers && typeof answers === 'object' ? answers : {},
      scorePct: pct,
      seed: seed != null ? String(seed) : '',
      startedAt: startedAt || _nowIso(),
      submittedAt: _nowIso(),
    };
    await set(ref(db, `quiz-attempts/${q.quizId}/${uid}/counted/${slot}`), record);
    const result = resolveQuizResult(q, [..._countedArray(node), record]);
    return { ok: true, slot, scorePct: pct, result };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not save your attempt.' };
  }
}

// Submit a practice run (never counted, unlimited).
export async function submitPracticeAttempt(quiz, { itemIds, answers, seed, startedAt } = {}) {
  const uid = _uid();
  if (!uid) return { ok: false, error: 'Not signed in.' };
  const q = normalizeQuiz(quiz);
  try {
    const { pct } = scoreAttempt(q, itemIds, answers);
    const record = {
      mode: 'practice', quizId: q.quizId,
      itemIds: Array.isArray(itemIds) ? itemIds : [],
      answers: answers && typeof answers === 'object' ? answers : {},
      scorePct: pct, seed: seed != null ? String(seed) : '',
      startedAt: startedAt || _nowIso(), submittedAt: _nowIso(),
    };
    await set(push(ref(db, `quiz-attempts/${q.quizId}/${uid}/practice`)), record);
    return { ok: true, scorePct: pct };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not save your practice run.' };
  }
}

// This student's current standing on a quiz (best-of-two, pass, remaining).
export async function getMyQuizResult(quiz) {
  const q = normalizeQuiz(quiz);
  const node = await loadMyQuizAttempts(q.quizId);
  return resolveQuizResult(q, _countedArray(node));
}

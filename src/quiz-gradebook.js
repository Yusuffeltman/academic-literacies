// src/quiz-gradebook.js
// ─────────────────────────────────────────────
// Staff-side resolution of graded-quiz marks for the gradebook and exports.
// Scores are recomputed AUTHORITATIVELY from each attempt's stored answers and
// the item bank (quiz-grading.authoritativeAttemptPct), so a client-written
// scorePct cannot inflate a mark.
//
// Weighting model: each quiz carries its own weight (two quizzes at 0.10 =>
// up to 20 final-mark points). The full weighted final mark also needs the
// a1–a3 weights; computeFinalMark() in quiz-grading.js is ready for that once
// the assessment weighting scheme is provided.
// ─────────────────────────────────────────────
import { db } from './firebase.js';
import { ref, get } from 'firebase/database';
import { GRADED_QUIZZES } from '../content/quizzes/graded-quizzes.js';
import { normalizeQuiz, resolveQuizResultAuthoritative, weightedQuizContribution } from './quiz-grading.js';

// Read every student's quiz attempts: { quizId: { uid: { counted:{}, practice:{} } } }.
export async function loadAllQuizAttempts() {
  try {
    const snap = await get(ref(db, 'quiz-attempts'));
    return snap.exists() ? (snap.val() || {}) : {};
  } catch {
    return {};
  }
}

function _countedFor(all, quizId, uid) {
  const node = all?.[quizId]?.[uid];
  return node && node.counted ? Object.values(node.counted).filter((a) => a && typeof a === 'object') : [];
}

// Build one row per student with per-quiz best %, weighted contribution points,
// and pass flags. `students` = [{ uid, name, studentNumber, ... }].
export async function buildQuizMarksRows(students = []) {
  const all = await loadAllQuizAttempts();
  const quizzes = GRADED_QUIZZES.map(normalizeQuiz);
  return (Array.isArray(students) ? students : []).map((s) => {
    const attemptsByQuizId = {};
    for (const q of quizzes) attemptsByQuizId[q.quizId] = _countedFor(all, q.quizId, s.uid);
    const contribution = weightedQuizContribution(quizzes, attemptsByQuizId, { authoritative: true });
    const perQuiz = {};
    for (const q of quizzes) {
      const r = resolveQuizResultAuthoritative(q, attemptsByQuizId[q.quizId]);
      perQuiz[q.quizId] = { bestPct: r.bestPct, passed: r.passed, attemptsUsed: r.attemptsUsed };
    }
    return {
      uid: s.uid,
      name: s.name || '',
      studentNumber: s.studentNumber || '',
      tutorialGroup: s.tutorialGroup || '',
      perQuiz,
      contributionPoints: contribution.points,
      maxPoints: contribution.maxPoints,
    };
  });
}

// The quiz definitions (normalised) in display order — for building headers.
export function gradedQuizzes() {
  return GRADED_QUIZZES.map(normalizeQuiz);
}

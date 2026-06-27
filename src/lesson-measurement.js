// src/lesson-measurement.js
// ─────────────────────────────────────────────
// Lesson Presentation A/B — outcome measurement.
//
// Session-scoped capture of the experiment outcomes and a single
// `lesson_completed` event (per unit per session) carrying: arm,
// time-on-task, comprehension score, perceived effort (Paas), the
// reading-task writing level, and reading completion. Flows through the
// existing trackLearningEvent → xAPI pipeline.
//
// See docs/lesson-presentation-redesign-spec.md
// ─────────────────────────────────────────────

import { resolveArmForUser, isTestUnit } from './lesson-experiment.js';

const _openedAt = {};   // unitId -> epoch ms
const _data = {};       // unitId -> { comprehensionScore, comprehensionMax, effort }
const _logged = {};     // unitId -> true once lesson_completed has fired this session

// Pure: count correct answers. selected/correct are arrays of option indices.
export function scoreAnswers(selected, correct) {
  if (!Array.isArray(selected) || !Array.isArray(correct)) return { score: 0, max: 0 };
  const max = correct.length;
  let score = 0;
  for (let i = 0; i < max; i++) {
    if (Number(selected[i]) === Number(correct[i])) score++;
  }
  return { score, max };
}

export function markLessonOpened(unitId) {
  if (!isTestUnit(unitId)) return;
  _openedAt[unitId] = Date.now();
  _logged[unitId] = false;
  if (!_data[unitId]) _data[unitId] = {};
}

export function recordComprehension(unitId, score, max) {
  if (!_data[unitId]) _data[unitId] = {};
  _data[unitId].comprehensionScore = score;
  _data[unitId].comprehensionMax = max;
}

export function recordEffort(unitId, rating) {
  if (!_data[unitId]) _data[unitId] = {};
  _data[unitId].effort = rating;
}

// Emit lesson_completed (once per unit per session). `user` is STATE.user.
export function completeLesson(unitId, { user = null } = {}) {
  if (!isTestUnit(unitId) || _logged[unitId]) return;
  const openedAt = _openedAt[unitId];
  const timeOnTaskMs = openedAt ? Date.now() - openedAt : null;
  const arm = resolveArmForUser(user, unitId);
  const d = _data[unitId] || {};

  let writingLevel = null;
  let readingComplete = false;
  try {
    writingLevel = window?._rtState?.[`rt-${unitId}`]?.feedback?.level ?? null;
    readingComplete = !!window?.STATE?.progress?.[unitId]?.readingComplete;
  } catch { /* ignore */ }

  _logged[unitId] = true;
  window.trackLearningEvent?.('lesson_completed', {
    unitId,
    presentationArm: arm,
    timeOnTaskMs,
    comprehensionScore: d.comprehensionScore ?? null,
    comprehensionMax: d.comprehensionMax ?? null,
    effort: d.effort ?? null,
    writingLevel,
    readingComplete,
    source: 'lesson-experiment',
  });
}

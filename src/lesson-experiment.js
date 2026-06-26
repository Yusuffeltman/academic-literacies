// src/lesson-experiment.js
// ─────────────────────────────────────────────
// Lesson Presentation A/B — arm assignment + authored chunk boundaries.
//
// Tests whether an "architecture-segmented, prose-continuous" presentation
// (Arm B) beats the current single-scroll unit (Arm A), on measured learning.
// See docs/lesson-presentation-redesign-spec.md and the evidence review.
//
// Design: within-subjects, counterbalanced. Each student experiences BOTH
// formats across the two test units (one arm per unit). Assignment is
// deterministic from the student id, so it is stable and reproducible
// without any persisted state.
// ─────────────────────────────────────────────

export const TEST_UNIT_IDS = ['u7', 'u8'];

// Authored chunk boundaries for Arm B. Each unit is segmented ONLY at
// meaningful activity boundaries; connected content within a chunk stays
// continuous and the reading is never fragmented. chunk[0] starts the unit;
// each later chunk starts at the first node matching its `start` — a heading
// substring (headingIncludes) or a CSS selector (for blocks without a heading,
// e.g. the essay-milestone .ex-block that opens the reflect zone).
const CHUNKS_U7_U8 = [
  { type: 'orient',   title: 'Get oriented' },
  { type: 'watch',    title: 'Watch & check',         start: { headingIncludes: 'Watch First' } },
  { type: 'learn',    title: 'Visual activity',        start: { headingIncludes: 'Visual Activity' } },
  { type: 'learn',    title: 'Choose your challenge',  start: { headingIncludes: 'Pathway Challenge' } },
  { type: 'practise', title: 'Read & write',           start: { headingIncludes: 'Reading & Writing' } },
  { type: 'reflect',  title: 'Apply & reflect',        start: { selector: '.ex-block' } },
];

// unit07 and unit08 are structurally identical, so they share one chunk map.
export const AUTHORED_CHUNKS = { u7: CHUNKS_U7_U8, u8: CHUNKS_U7_U8 };

export function isTestUnit(unitId) {
  return TEST_UNIT_IDS.includes(String(unitId || ''));
}

export function getAuthoredChunks(unitId) {
  return AUTHORED_CHUNKS[String(unitId || '')] || null;
}

// Stable 32-bit FNV-1a hash of a string.
function _hash(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Resolve the presentation arm ('A' | 'B') for a student on a test unit.
// Counterbalanced: a student's parity fixes the arm for u7; u8 gets the
// opposite arm — so every student sees both formats exactly once, and each
// unit is split ~50/50 across the cohort.
export function assignArm(studentId, unitId) {
  if (!isTestUnit(unitId)) return 'A';
  const base = _hash(studentId) % 2;          // 0 or 1, stable per student
  const flip = String(unitId) === 'u8' ? 1 : 0;
  return ((base + flip) % 2 === 0) ? 'A' : 'B';
}

// Convenience: resolve from a user object (uid preferred, email fallback).
// Unknown/empty user → control arm.
export function resolveArmForUser(user, unitId) {
  const sid = String(user?.uid || user?.email || '').trim();
  if (!sid || !isTestUnit(unitId)) return 'A';
  return assignArm(sid, unitId);
}

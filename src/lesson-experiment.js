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
  { type: 'check',    title: 'Quick check',            start: { selector: '.lesson-measure' } },
];

// unit07 and unit08 are structurally identical, so they share one chunk map.
export const AUTHORED_CHUNKS = { u7: CHUNKS_U7_U8, u8: CHUNKS_U7_U8 };

// Comprehension items — the experiment's PRIMARY outcome. Drafted from each
// unit's reading; formative (ungraded). DRAFT — requires lecturer review and
// sign-off before the trial runs. `answer` is the 0-based index of the correct
// option. Kept deliberately short (recall + light inference of the reading).
const COMPREHENSION_U7 = [
  {
    q: 'According to the reading, how do professional fact-checkers mainly evaluate a source?',
    options: [
      'By reading it very carefully from beginning to end',
      'By looking at what independent others say about it (lateral reading)',
      "By studying the source's own “About Us” page",
      'By counting how many citations it provides',
    ],
    answer: 1,
  },
  {
    q: 'The reading calls the “Stop” step perhaps the most important because:',
    options: [
      'It is simply the first letter of SIFT',
      'Misinformation is usually designed to trigger an emotional reaction first',
      'Stopping gives you time to read the whole article',
      'It stops you opening too many browser tabs',
    ],
    answer: 1,
  },
  {
    q: "Why does the reading argue an “About Us” page cannot establish credibility?",
    options: [
      'About Us pages are usually too short to be useful',
      'The source writes its own About Us page, so it cannot independently verify itself',
      'About Us pages are often out of date',
      'Search engines rank them too low to trust',
    ],
    answer: 1,
  },
  {
    q: 'What does the reading claim about the time cost of lateral reading?',
    options: [
      'It takes longer than reading the source but is more accurate',
      'About three minutes — faster and more informative than hours spent reading the source itself',
      'It requires reading the full article first',
      'It is only practical for journalists, not teachers',
    ],
    answer: 1,
  },
];

const COMPREHENSION_U8 = [
  {
    q: "In the reading's opening example, why did the New York lawyer face serious professional consequences?",
    options: [
      'He refused to use AI in his legal work',
      'He submitted a brief citing court cases that ChatGPT had fabricated',
      "He copied another lawyer's brief word for word",
      'He missed an important filing deadline',
    ],
    answer: 1,
  },
  {
    q: 'According to the reading, what makes a hallucinated citation particularly dangerous?',
    options: [
      'It is always poorly formatted and therefore obvious',
      'It is structurally designed to be indistinguishable from a real citation without verification',
      'It can delete your other references',
      'It only ever appears in legal documents',
    ],
    answer: 1,
  },
  {
    q: 'Which option correctly matches the reading’s “create vs retrieve” distinction?',
    options: [
      'ChatGPT retrieves real papers; Elicit creates text',
      'ChatGPT generates text from patterns; Elicit and Scopus AI retrieve real papers from databases',
      'Both ChatGPT and Elicit retrieve from the same database',
      'Retrieval tools invent citations; generative tools verify them',
    ],
    answer: 1,
  },
  {
    q: 'What does the reading give as the non-negotiable rule for chatbot use in academic work?',
    options: [
      'Never use a chatbot for any academic purpose',
      'AI generates, you verify — every specific claim and citation, every time',
      'Only trust citations if the journal name sounds real',
      'Use chatbots only for final proofreading',
    ],
    answer: 1,
  },
];

export const COMPREHENSION_ITEMS = { u7: COMPREHENSION_U7, u8: COMPREHENSION_U8 };

export function getComprehensionItems(unitId) {
  return COMPREHENSION_ITEMS[String(unitId || '')] || null;
}

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

// content/assessments/weighting.js
// ─────────────────────────────────────────────
// Single source of truth for the module's final-mark weighting.
//
// Scheme (per the lecturer, 2026-09-14):
//   • Assignments a1–a4: 10% each  (a4 upcoming)
//   • Quiz 1 + Quiz 2:   10% each
//   • Capstone project:  40% (the final, heaviest component; upcoming)
//   → totals 100%.
//
// NOTE: confirm the CAPSTONE assessment id. Content defines a5
// ('The Genre Translation Studio') and a6; `capstone.id` is set to a5 as a
// placeholder — change it to the real capstone id before the final-mark column
// is relied upon.
// ─────────────────────────────────────────────

export const MODULE_WEIGHTING = Object.freeze({
  assignments: Object.freeze({ a1: 0.10, a2: 0.10, a3: 0.10, a4: 0.10 }),
  quizzes: Object.freeze({ quiz1: 0.10, quiz2: 0.10 }),
  capstone: Object.freeze({ id: 'a5', weight: 0.40 }), // TODO: confirm capstone id (a5 vs a6)
});

// Flatten to { componentId: weight } for the final-mark engine.
export function flatWeights(w = MODULE_WEIGHTING) {
  const out = {};
  for (const [id, wt] of Object.entries(w.assignments || {})) out[id] = wt;
  for (const [id, wt] of Object.entries(w.quizzes || {})) out[id] = wt;
  if (w.capstone?.id) out[w.capstone.id] = w.capstone.weight;
  return out;
}

export default MODULE_WEIGHTING;

// src/spaced-review.js
// ─────────────────────────────────────────────
// Daily Sharpener — spaced-repetition scheduler.
//
// Pure, side-effect-free scheduling over the existing adaptive state
// (STATE.adaptive). Derives "what is due for review" from the skill
// score history and mastery tiers the app already records — no new
// persisted state in v1.
//
// Pedagogy: Leitner box intervals keyed on mastery tier. Weaker skills
// resurface sooner; mastered skills resurface rarely. Promotion and
// demotion happen automatically because the box is derived from
// skill_status, which recordSkillScore() already maintains.
//
// See docs/daily-sharpener-spec.md
// ─────────────────────────────────────────────

// Reverse map: skill → micro-module that trains it.
// research_skills and ai_literacy have no module yet, so v1 does not
// schedule them (they fall back to the AI Tutor path in v2).
export const SKILL_MODULE_MAP = {
  critical_reading:   'reading-strategies',
  evidence_use:       'evidence-booster',
  argument_structure: 'argument-builder',
  academic_tone:      'tone-workshop',
  source_evaluation:  'source-skills',
  citation_practice:  'citation-guide',
};

// Leitner box intervals (days) keyed on mastery tier.
// 'untested' is intentionally absent — nothing to review yet.
export const REVIEW_INTERVALS = { weak: 1, developing: 3, strong: 7 };

const TIER_PRIORITY = { weak: 0, developing: 1, strong: 2 };
const DAY_MS = 24 * 60 * 60 * 1000;

function _lastEntry(entries) {
  return Array.isArray(entries) && entries.length ? entries[entries.length - 1] : null;
}

function _timestampMs(iso) {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? t : null;
}

/**
 * Build the spaced-review queue: module-backed skills that are due for a
 * refresh, ordered weak → developing → strong, then most-overdue first.
 *
 * @param {object} adaptive  STATE.adaptive shape
 * @param {number} now       epoch ms (injectable for tests)
 * @returns {Array<{skillId,moduleId,status,lastPracticedAt,intervalDays,dueAt,daysOverdue}>}
 */
export function getReviewQueue(adaptive, now = Date.now()) {
  if (!adaptive || typeof adaptive !== 'object') return [];
  const status = adaptive.skill_status || {};
  const scores = adaptive.skill_scores || {};

  const queue = [];
  for (const [skillId, moduleId] of Object.entries(SKILL_MODULE_MAP)) {
    const tier = status[skillId];
    const intervalDays = REVIEW_INTERVALS[tier];
    if (!intervalDays) continue;                  // untested / unknown → not scheduled

    const last = _lastEntry(scores[skillId]);
    const lastMs = last ? _timestampMs(last.timestamp) : null;
    if (lastMs == null) continue;                 // never practised with a timestamp → skip

    const dueAt = lastMs + intervalDays * DAY_MS;
    if (now < dueAt) continue;                     // not due yet

    queue.push({
      skillId,
      moduleId,
      status: tier,
      lastPracticedAt: new Date(lastMs).toISOString(),
      intervalDays,
      dueAt: new Date(dueAt).toISOString(),
      daysOverdue: Math.max(0, Math.floor((now - dueAt) / DAY_MS)),
    });
  }

  queue.sort((a, b) => {
    const tp = TIER_PRIORITY[a.status] - TIER_PRIORITY[b.status];
    if (tp !== 0) return tp;                                // weaker tiers first
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue; // most overdue first
    const ai = (scores[a.skillId] || []).length;
    const bi = (scores[b.skillId] || []).length;
    return ai - bi;                                         // tie-break: least-rehearsed
  });

  return queue;
}

/**
 * The single skill most due for review, or null if nothing is due.
 */
export function getNextDue(adaptive, now = Date.now()) {
  return getReviewQueue(adaptive, now)[0] || null;
}

/**
 * Human-readable "last practised" line for a queue item.
 */
export function describeDue(item, now = Date.now()) {
  if (!item) return '';
  const lastMs = _timestampMs(item.lastPracticedAt);
  if (lastMs == null) return 'Due for a quick refresh.';
  const days = Math.max(0, Math.floor((now - lastMs) / DAY_MS));
  if (days === 0) return 'Practised earlier today — a quick refresh locks it in.';
  if (days === 1) return 'You last practised this yesterday.';
  return `You last practised this ${days} days ago.`;
}

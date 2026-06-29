// Run with: node --test src/__tests__/spaced-review.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getReviewQueue,
  getNextDue,
  describeDue,
  SKILL_MODULE_MAP,
  REVIEW_INTERVALS,
} from '../spaced-review.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-23T12:00:00.000Z');

// Build a minimal adaptive object with the given per-skill {status, daysAgo, count}.
function adaptiveOf(spec) {
  const skill_status = {};
  const skill_scores = {};
  for (const [skillId, s] of Object.entries(spec)) {
    skill_status[skillId] = s.status;
    const n = s.count ?? 1;
    const ts = new Date(NOW - (s.daysAgo ?? 0) * DAY).toISOString();
    skill_scores[skillId] = Array.from({ length: n }, (_, i) => ({
      score: s.score ?? 2,
      timestamp: i === n - 1 ? ts : new Date(NOW - (s.daysAgo + 1) * DAY).toISOString(),
    }));
  }
  return { skill_status, skill_scores };
}

test('returns [] for missing or invalid adaptive', () => {
  assert.deepEqual(getReviewQueue(null, NOW), []);
  assert.deepEqual(getReviewQueue(undefined, NOW), []);
  assert.deepEqual(getReviewQueue(42, NOW), []);
  assert.deepEqual(getReviewQueue({}, NOW), []);
});

test('untested skills are never scheduled', () => {
  const a = adaptiveOf({ evidence_use: { status: 'untested', daysAgo: 30 } });
  assert.deepEqual(getReviewQueue(a, NOW), []);
});

test('skills with no micro-module are never scheduled', () => {
  // research_skills + ai_literacy have no module in SKILL_MODULE_MAP
  assert.equal(SKILL_MODULE_MAP.research_skills, undefined);
  const a = adaptiveOf({ research_skills: { status: 'weak', daysAgo: 30 } });
  assert.deepEqual(getReviewQueue(a, NOW), []);
});

test('weak skill is due after 1 day, not before', () => {
  const notYet = adaptiveOf({ evidence_use: { status: 'weak', daysAgo: 0.5 } });
  assert.equal(getReviewQueue(notYet, NOW).length, 0);

  const due = adaptiveOf({ evidence_use: { status: 'weak', daysAgo: 2 } });
  const q = getReviewQueue(due, NOW);
  assert.equal(q.length, 1);
  assert.equal(q[0].skillId, 'evidence_use');
  assert.equal(q[0].moduleId, 'evidence-booster');
  assert.equal(q[0].intervalDays, REVIEW_INTERVALS.weak);
  assert.equal(q[0].daysOverdue, 1);
});

test('developing skill respects the 3-day interval', () => {
  const notYet = adaptiveOf({ academic_tone: { status: 'developing', daysAgo: 2 } });
  assert.equal(getReviewQueue(notYet, NOW).length, 0);

  const due = adaptiveOf({ academic_tone: { status: 'developing', daysAgo: 4 } });
  assert.equal(getReviewQueue(due, NOW).length, 1);
});

test('strong skill respects the 7-day interval', () => {
  const notYet = adaptiveOf({ citation_practice: { status: 'strong', daysAgo: 5 } });
  assert.equal(getReviewQueue(notYet, NOW).length, 0);

  const due = adaptiveOf({ citation_practice: { status: 'strong', daysAgo: 8 } });
  assert.equal(getReviewQueue(due, NOW).length, 1);
});

test('queue orders weak → developing → strong', () => {
  const a = adaptiveOf({
    citation_practice:  { status: 'strong', daysAgo: 20 },
    academic_tone:      { status: 'developing', daysAgo: 20 },
    evidence_use:       { status: 'weak', daysAgo: 20 },
  });
  const order = getReviewQueue(a, NOW).map((i) => i.status);
  assert.deepEqual(order, ['weak', 'developing', 'strong']);
});

test('within a tier, most overdue comes first', () => {
  const a = adaptiveOf({
    evidence_use:       { status: 'weak', daysAgo: 3 },   // 2 overdue
    argument_structure: { status: 'weak', daysAgo: 10 },  // 9 overdue
  });
  const q = getReviewQueue(a, NOW);
  assert.equal(q[0].skillId, 'argument_structure');
  assert.equal(q[1].skillId, 'evidence_use');
});

test('getNextDue returns the top of the queue, or null when empty', () => {
  const a = adaptiveOf({
    evidence_use: { status: 'weak', daysAgo: 5 },
    academic_tone: { status: 'developing', daysAgo: 5 },
  });
  assert.equal(getNextDue(a, NOW).skillId, 'evidence_use');
  assert.equal(getNextDue(adaptiveOf({}), NOW), null);
});

test('describeDue phrasing by recency', () => {
  const mk = (daysAgo) => ({ lastPracticedAt: new Date(NOW - daysAgo * DAY).toISOString() });
  assert.match(describeDue(mk(0), NOW), /earlier today/);
  assert.match(describeDue(mk(1), NOW), /yesterday/);
  assert.match(describeDue(mk(8), NOW), /8 days ago/);
  assert.equal(describeDue(null, NOW), '');
});

test('clock skew (future timestamp) never yields negative daysOverdue', () => {
  const future = adaptiveOf({ evidence_use: { status: 'weak', daysAgo: -3 } });
  // future practice is not yet due, so queue is empty — but guard the math anyway
  assert.equal(getReviewQueue(future, NOW).length, 0);
});

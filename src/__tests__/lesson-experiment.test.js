// Run with: node --test src/__tests__/lesson-experiment.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEST_UNIT_IDS,
  isTestUnit,
  isExperimentEnabled,
  getAuthoredChunks,
  getComprehensionItems,
  assignArm,
  resolveArmForUser,
} from '../lesson-experiment.js';
import {
  scoreAnswers,
  aggregateExperimentEvents,
  aggregateExperimentBySubgroup,
  priorKnowledgeBand,
} from '../lesson-measurement.js';

test('experiment master switch defaults OFF (safe to deploy un-activated)', () => {
  assert.equal(isExperimentEnabled(), false);
});

test('test units are u7 and u8', () => {
  assert.deepEqual(TEST_UNIT_IDS, ['u7', 'u8']);
  assert.equal(isTestUnit('u7'), true);
  assert.equal(isTestUnit('u8'), true);
  assert.equal(isTestUnit('u1'), false);
  assert.equal(isTestUnit(''), false);
});

test('authored chunks exist for both test units, start with orient, end with check', () => {
  for (const u of ['u7', 'u8']) {
    const chunks = getAuthoredChunks(u);
    assert.ok(Array.isArray(chunks) && chunks.length === 7);
    assert.equal(chunks[0].type, 'orient');
    assert.equal(chunks[0].start, undefined); // first chunk has no start matcher
    assert.ok(chunks.slice(1).every((c) => c.start)); // every later chunk has one
    assert.equal(chunks[chunks.length - 1].type, 'check'); // measurement panel last
  }
  assert.equal(getAuthoredChunks('u1'), null);
});

test('comprehension items are well-formed with in-range answer keys', () => {
  for (const u of ['u7', 'u8']) {
    const items = getComprehensionItems(u);
    assert.ok(Array.isArray(items) && items.length >= 3);
    for (const it of items) {
      assert.equal(typeof it.q, 'string');
      assert.ok(Array.isArray(it.options) && it.options.length >= 3);
      assert.ok(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < it.options.length);
    }
  }
  assert.equal(getComprehensionItems('u1'), null);
});

test('scoreAnswers counts correct selections', () => {
  assert.deepEqual(scoreAnswers([1, 1, 1, 1], [1, 1, 1, 1]), { score: 4, max: 4 });
  assert.deepEqual(scoreAnswers([0, 1, 2, 0], [1, 1, 1, 1]), { score: 1, max: 4 });
  assert.deepEqual(scoreAnswers([null, 1], [1, 1]), { score: 1, max: 2 });
  assert.deepEqual(scoreAnswers('bad', [1]), { score: 0, max: 0 });
});

test('aggregateExperimentEvents summarises by unit x arm and dedupes per student/unit', () => {
  const ev = (student, unitId, arm, meta, trustedAt) => ({
    eventType: 'lesson_completed', canonicalStudentKey: student, trustedAt,
    meta: { unitId, presentationArm: arm, ...meta },
  });
  const events = [
    ev('s1', 'u7', 'A', { comprehensionScore: 4, comprehensionMax: 4, effort: 6, writingLevel: 4, readingComplete: true, timeOnTaskMs: 600000 }, '2026-06-01T10:00:00Z'),
    ev('s2', 'u7', 'A', { comprehensionScore: 2, comprehensionMax: 4, effort: 8, writingLevel: 2, readingComplete: false, timeOnTaskMs: 1200000 }, '2026-06-01T11:00:00Z'),
    // s1 retakes u7/A later — only the latest should count
    ev('s1', 'u7', 'A', { comprehensionScore: 3, comprehensionMax: 4, effort: 5, writingLevel: 4, readingComplete: true, timeOnTaskMs: 300000 }, '2026-06-02T10:00:00Z'),
    ev('s3', 'u7', 'B', { comprehensionScore: 4, comprehensionMax: 4, effort: 4, writingLevel: 5, readingComplete: true, timeOnTaskMs: 480000 }, '2026-06-01T10:00:00Z'),
    { eventType: 'unit_open', meta: { unitId: 'u7', presentationArm: 'A' } }, // ignored
  ];
  const s = aggregateExperimentEvents(events);
  // u7/A: s1 (latest: 3/4=75) + s2 (50) => mean comp 62.5 -> 63 (rounded), n=2
  assert.equal(s['u7|A'].n, 2);
  assert.equal(s['u7|A'].comprehensionPct, 63);
  assert.equal(s['u7|A'].effort, 6.5);          // (5 + 8)/2
  assert.equal(s['u7|A'].completionPct, 50);    // 1 of 2
  assert.equal(s['u7|B'].n, 1);
  assert.equal(s['u7|B'].comprehensionPct, 100);
  assert.equal(s['u7|B'].timeMin, 8);           // 480000ms
});

test('priorKnowledgeBand classifies from skill_status', () => {
  assert.equal(priorKnowledgeBand({ a: 'strong', b: 'strong', c: 'developing' }), 'higher');
  assert.equal(priorKnowledgeBand({ a: 'weak', b: 'weak', c: 'developing' }), 'lower');
  assert.equal(priorKnowledgeBand({ a: 'untested', b: 'untested' }), 'unknown');
  assert.equal(priorKnowledgeBand({}), 'unknown');
  assert.equal(priorKnowledgeBand(null), 'unknown');
});

test('aggregateExperimentBySubgroup splits by unit x arm x band', () => {
  const ev = (student, arm, band, comp) => ({
    eventType: 'lesson_completed', canonicalStudentKey: student, trustedAt: '2026-06-01T10:00:00Z',
    meta: { unitId: 'u7', presentationArm: arm, priorKnowledge: band, comprehensionScore: comp, comprehensionMax: 4, readingComplete: true },
  });
  const s = aggregateExperimentBySubgroup([
    ev('s1', 'A', 'lower', 2),
    ev('s2', 'B', 'lower', 4),
    ev('s3', 'B', 'higher', 3),
  ]);
  assert.equal(s['u7|A|lower'].n, 1);
  assert.equal(s['u7|A|lower'].comprehensionPct, 50);
  assert.equal(s['u7|B|lower'].comprehensionPct, 100);
  assert.equal(s['u7|B|higher'].n, 1);
});

test('assignment is deterministic for a given student and unit', () => {
  const a1 = assignArm('student-123', 'u7');
  const a2 = assignArm('student-123', 'u7');
  assert.equal(a1, a2);
  assert.ok(a1 === 'A' || a1 === 'B');
});

test('within-subjects counterbalancing: each student gets opposite arms on u7 vs u8', () => {
  for (const sid of ['alice', 'bob', 'carol@uj.ac.za', 'x', 'a-very-long-student-identifier-0001']) {
    const u7 = assignArm(sid, 'u7');
    const u8 = assignArm(sid, 'u8');
    assert.notEqual(u7, u8, `student ${sid} should see both arms`);
  }
});

test('cohort split is balanced across each unit (~50/50)', () => {
  const N = 2000;
  let u7A = 0;
  for (let i = 0; i < N; i++) {
    if (assignArm(`student-${i}`, 'u7') === 'A') u7A++;
  }
  const ratio = u7A / N;
  assert.ok(ratio > 0.4 && ratio < 0.6, `u7 arm-A ratio ${ratio} should be near 0.5`);
});

test('non-test units always resolve to control (A)', () => {
  assert.equal(assignArm('anyone', 'u1'), 'A');
  assert.equal(assignArm('anyone', 'u20'), 'A');
});

test('resolveArmForUser prefers uid, falls back to email, controls unknown users', () => {
  const byUid = resolveArmForUser({ uid: 'u-1', email: 'e@x.com' }, 'u7');
  assert.equal(byUid, assignArm('u-1', 'u7')); // uid wins
  const byEmail = resolveArmForUser({ email: 'e@x.com' }, 'u7');
  assert.equal(byEmail, assignArm('e@x.com', 'u7'));
  assert.equal(resolveArmForUser({}, 'u7'), 'A'); // unknown → control
  assert.equal(resolveArmForUser(null, 'u7'), 'A');
});

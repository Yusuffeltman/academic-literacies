// Run with: node --test src/__tests__/lesson-experiment.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEST_UNIT_IDS,
  isTestUnit,
  getAuthoredChunks,
  assignArm,
  resolveArmForUser,
} from '../lesson-experiment.js';

test('test units are u7 and u8', () => {
  assert.deepEqual(TEST_UNIT_IDS, ['u7', 'u8']);
  assert.equal(isTestUnit('u7'), true);
  assert.equal(isTestUnit('u8'), true);
  assert.equal(isTestUnit('u1'), false);
  assert.equal(isTestUnit(''), false);
});

test('authored chunks exist for both test units and start the unit with orient', () => {
  for (const u of ['u7', 'u8']) {
    const chunks = getAuthoredChunks(u);
    assert.ok(Array.isArray(chunks) && chunks.length === 6);
    assert.equal(chunks[0].type, 'orient');
    assert.equal(chunks[0].start, undefined); // first chunk has no start matcher
    assert.ok(chunks.slice(1).every((c) => c.start)); // every later chunk has one
    assert.equal(chunks[chunks.length - 1].type, 'reflect');
  }
  assert.equal(getAuthoredChunks('u1'), null);
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

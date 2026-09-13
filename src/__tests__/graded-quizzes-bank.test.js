// Sanity tests for the generated graded-quiz banks (content/quizzes/graded-quizzes.js)
// and their interaction with the pure grading logic.
// Run with: node --test src/__tests__/graded-quizzes-bank.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADED_QUIZZES } from '../../content/quizzes/graded-quizzes.js';
import { normalizeQuiz, sampleItemIds, scoreAttempt, resolveQuizResult } from '../quiz-grading.js';

test('two quizzes, each with a 20-item bank sampling 10 per attempt', () => {
  assert.equal(GRADED_QUIZZES.length, 2);
  for (const q of GRADED_QUIZZES) {
    assert.ok(q.itemBank.length >= q.itemsPerAttempt, 'bank must be >= items per attempt');
    assert.equal(q.itemBank.length, 20);
    assert.equal(q.itemsPerAttempt, 10);
    assert.equal(q.maxAttempts, 2);
    assert.equal(q.passMark, 60);
  }
});

test('every item is well-formed (options + in-range correctIndex + unique ids)', () => {
  const ids = new Set();
  for (const q of GRADED_QUIZZES) {
    for (const it of q.itemBank) {
      assert.ok(typeof it.stem === 'string' && it.stem.length > 0);
      assert.ok(Array.isArray(it.options) && it.options.length >= 2);
      assert.ok(it.correctIndex >= 0 && it.correctIndex < it.options.length, `bad correctIndex on ${it.id}`);
      assert.ok(!ids.has(it.id), `duplicate item id ${it.id}`);
      ids.add(it.id);
    }
  }
  assert.equal(ids.size, 40);
});

test('a full-marks attempt scores 100 and passes; empty answers fail', () => {
  const q = GRADED_QUIZZES[0];
  const seed = 'attempt-seed';
  const itemIds = sampleItemIds(q, seed);
  const byId = new Map(q.itemBank.map((it) => [it.id, it]));
  const perfect = Object.fromEntries(itemIds.map((id) => [id, byId.get(id).correctIndex]));
  assert.equal(scoreAttempt(q, itemIds, perfect).pct, 100);
  assert.equal(scoreAttempt(q, itemIds, {}).pct, 0);
});

test('best-of-two resolves from stored counted attempts on a real quiz', () => {
  const q = normalizeQuiz(GRADED_QUIZZES[1]);
  const attempts = [
    { mode: 'counted', scorePct: 50, submittedAt: '2026-09-13T10:00:00Z' },
    { mode: 'counted', scorePct: 70, submittedAt: '2026-09-13T11:00:00Z' },
  ];
  const r = resolveQuizResult(q, attempts);
  assert.equal(r.bestPct, 70);
  assert.equal(r.passed, true);
  assert.equal(r.remaining, 0);
});

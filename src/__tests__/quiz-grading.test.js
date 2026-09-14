// Tests for src/quiz-grading.js — graded-quiz core (best-of-two, 60% pass,
// submit-only-consumes-attempt, practice excluded, mean-of-best weighting).
// Run with: node --test src/__tests__/quiz-grading.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuiz, sampleItemIds, scoreAttempt, countedAttempts, attemptsUsed,
  remainingAttempts, canStartCountedAttempt, resolveQuizResult,
  quizBlockPercent, quizContributionPoints, QUIZ_DEFAULTS,
  authoritativeAttemptPct, resolveQuizResultAuthoritative, weightedQuizContribution, computeFinalMark,
  computeModuleFinal,
} from '../quiz-grading.js';
import { flatWeights, MODULE_WEIGHTING } from '../../content/assessments/weighting.js';

function bank(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `q${i}`, stem: `Q${i}`, options: ['a', 'b', 'c', 'd'], correctIndex: i % 4 }));
}
const QUIZ = { quizId: 'q-unit03', itemBank: bank(10), itemsPerAttempt: 5 };

function attempt(mode, scorePct, submitted = true, extra = {}) {
  return { mode, scorePct, submittedAt: submitted ? '2026-09-13T10:00:00Z' : null, ...extra };
}

test('defaults: two attempts, 60% pass', () => {
  const q = normalizeQuiz(QUIZ);
  assert.equal(q.maxAttempts, 2);
  assert.equal(q.passMark, 60);
  assert.equal(QUIZ_DEFAULTS.maxAttempts, 2);
});

test('sampleItemIds: deterministic, correct size, subset of bank', () => {
  const a = sampleItemIds(QUIZ, 'seed-1');
  const b = sampleItemIds(QUIZ, 'seed-1');
  const c = sampleItemIds(QUIZ, 'seed-2');
  assert.deepEqual(a, b, 'same seed -> same sample');
  assert.equal(a.length, 5);
  assert.ok(a.every((id) => QUIZ.itemBank.some((it) => it.id === id)));
  assert.notDeepEqual(a, c, 'different seed -> (very likely) different sample');
});

test('scoreAttempt: percentage over the sampled items', () => {
  const ids = ['q0', 'q1', 'q2', 'q3']; // correctIndex 0,1,2,3
  const answers = { q0: 0, q1: 1, q2: 9, q3: 3 }; // 3 of 4 correct
  assert.deepEqual(scoreAttempt(QUIZ, ids, answers), { correct: 3, total: 4, pct: 75 });
});

test('practice and unsubmitted attempts are excluded from counted/score', () => {
  const attempts = [
    attempt('practice', 100),
    attempt('counted', 90, false), // in-progress, not submitted
    attempt('counted', 55),
  ];
  assert.equal(attemptsUsed(attempts), 1, 'only the submitted counted attempt counts');
  assert.equal(countedAttempts(attempts).length, 1);
});

test('best-of-two: higher of two counted attempts is recorded', () => {
  const attempts = [attempt('counted', 52), attempt('counted', 71)];
  const r = resolveQuizResult(QUIZ, attempts);
  assert.equal(r.bestPct, 71);
  assert.equal(r.passed, true); // 71 >= 60
  assert.equal(r.attemptsUsed, 2);
  assert.equal(r.remaining, 0);
});

test('pass threshold is inclusive at 60', () => {
  assert.equal(resolveQuizResult(QUIZ, [attempt('counted', 60)]).passed, true);
  assert.equal(resolveQuizResult(QUIZ, [attempt('counted', 59)]).passed, false);
});

test('no counted attempt -> null best, not passed', () => {
  const r = resolveQuizResult(QUIZ, [attempt('practice', 100)]);
  assert.equal(r.bestPct, null);
  assert.equal(r.passed, false);
  assert.equal(r.remaining, 2);
});

test('attempt cap: two submitted attempts exhaust; practice never consumes one', () => {
  const two = [attempt('counted', 40), attempt('counted', 50)];
  assert.equal(remainingAttempts(QUIZ, two), 0);
  assert.equal(canStartCountedAttempt(QUIZ, two).ok, false);
  const withPractice = [attempt('counted', 40), attempt('practice', 100), attempt('practice', 100)];
  assert.equal(remainingAttempts(QUIZ, withPractice), 1);
  assert.equal(canStartCountedAttempt(QUIZ, withPractice).ok, true);
});

test('an interrupted (unsubmitted) attempt does not consume one', () => {
  const attempts = [attempt('counted', 0, false)];
  assert.equal(attemptsUsed(attempts), 0);
  assert.equal(canStartCountedAttempt(QUIZ, attempts).ok, true);
});

test('minGapHours blocks a too-soon second attempt', () => {
  const q = { ...QUIZ, minGapHours: 24 };
  const last = Date.parse('2026-09-13T10:00:00Z');
  const attempts = [{ mode: 'counted', scorePct: 50, submittedAt: '2026-09-13T10:00:00Z' }];
  assert.equal(canStartCountedAttempt(q, attempts, last + 3600000).ok, false); // 1h later
  assert.equal(canStartCountedAttempt(q, attempts, last + 25 * 3600000).ok, true); // 25h later
});

test('quizBlockPercent: mean of best scores; missing quiz counts as 0', () => {
  const quizzes = [{ quizId: 'qa', itemBank: bank(4) }, { quizId: 'qb', itemBank: bank(4) }];
  const attemptsBy = {
    qa: [attempt('counted', 80), attempt('counted', 90)], // best 90
    // qb: no attempt -> 0
  };
  assert.equal(quizBlockPercent(quizzes, attemptsBy), 45); // (90 + 0)/2
});

test('quizContributionPoints: block% x weight', () => {
  assert.equal(quizContributionPoints(90, 0.10), 9);
  assert.equal(quizContributionPoints(45, 0.10), 4.5);
});

test('authoritative scoring recomputes from answers and ignores a tampered scorePct', () => {
  const ids = ['q0', 'q1', 'q2', 'q3']; // correctIndex 0,1,2,3
  const attempt = { mode: 'counted', submittedAt: 't', itemIds: ids, answers: { q0: 0, q1: 1, q2: 2, q3: 9 }, scorePct: 100 };
  assert.equal(authoritativeAttemptPct(QUIZ, attempt), 75, 'recomputed 3/4 despite scorePct=100');
  const r = resolveQuizResultAuthoritative(QUIZ, [attempt]);
  assert.equal(r.bestPct, 75);
  assert.equal(r.passed, true);
});

test('weightedQuizContribution: each quiz contributes its own weight; missing = 0', () => {
  const q1 = { quizId: 'q1', itemBank: bank(4), weight: 0.10 };
  const q2 = { quizId: 'q2', itemBank: bank(4), weight: 0.10 };
  const byId = new Map(bank(4).map((it) => [it.id, it]));
  const perfect = Object.fromEntries([...byId.keys()].map((id) => [id, byId.get(id).correctIndex]));
  const attemptsBy = {
    q1: [{ mode: 'counted', submittedAt: 't', itemIds: [...byId.keys()], answers: perfect }], // 100
    // q2: none -> 0
  };
  const c = weightedQuizContribution([q1, q2], attemptsBy, { authoritative: true });
  assert.equal(c.perQuiz.q1.bestPct, 100);
  assert.equal(c.perQuiz.q2.bestPct, null);
  assert.equal(c.points, 10);      // 100*0.10 + 0
  assert.equal(c.maxPoints, 20);   // two quizzes x 10 points
});

test('module weighting sums to 1 and computeModuleFinal gives a running total', () => {
  const weights = flatWeights(MODULE_WEIGHTING);
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, 'weights should sum to 100%');
  // Only a1–a3 + both quizzes marked so far (a4 + capstone pending).
  const marks = { a1: 70, a2: 60, a3: 80, quiz1: 90, quiz2: 50 };
  const r = computeModuleFinal(marks, weights);
  assert.equal(r.weightCovered, 0.5);           // 5 × 10%
  assert.equal(r.points, 7 + 6 + 8 + 9 + 5);    // 35 points of the final so far
  assert.equal(r.currentPercent, 70);           // 35 / 0.5 average over assessed portion
});

test('computeFinalMark: weighted blend of assessments + quiz block', () => {
  const r = computeFinalMark({
    assessments: [{ mark: 70, weight: 0.30 }, { mark: 60, weight: 0.30 }, { mark: 50, weight: 0.20 }],
    quizBlockPct: 80, quizWeight: 0.20,
  });
  assert.equal(r.points, 21 + 18 + 10 + 16); // 65
  assert.equal(r.weightCovered, 1);
});

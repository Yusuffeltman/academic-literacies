// Union-resolver tests for src/submission-merge.js — the option 2 safety net.
// Ensures the newest ("anchor") submission is graded/displayed with files unioned
// across a student's active submissions, so a late one-file fragment can no longer
// mask earlier complete work.
//
// Run with: node --test src/__tests__/submission-merge.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMergedActiveSubmission } from '../submission-merge.js';

function file(name, size, extra = {}) {
  return { name, size, type: 'application/pdf', storagePath: `p/${name}`, url: `https://x/${name}`, ...extra };
}

test('no active submissions -> null', () => {
  assert.equal(resolveMergedActiveSubmission({}), null);
  assert.equal(resolveMergedActiveSubmission({ s1: { status: 'cleared', submittedAt: '2026-09-01T00:00:00Z', files: [file('a.pdf', 1)] } }), null);
  assert.equal(resolveMergedActiveSubmission({ s1: { submittedAt: '', files: [] } }), null);
});

test('single submission is returned untouched (same object reference, cache preserved)', () => {
  const sub = { id: 's1', status: 'submitted', submittedAt: '2026-09-06T10:00:00Z', files: [file('report.pdf', 10)], extractionCache: { results: [{ name: 'report.pdf' }] } };
  const res = resolveMergedActiveSubmission({ s1: sub });
  assert.equal(res.submissionId, 's1');
  assert.equal(res.submission, sub, 'unchanged case must not clone the submission');
  assert.equal(res.submission.extractionCache != null, true, 'cache preserved when nothing merged');
  assert.equal(res.mergedFileCount, 1);
});

test('ROOT CAUSE: a newer one-file fragment is unioned with the earlier complete submission', () => {
  const raw = {
    s1: { id: 's1', status: 'submitted', submittedAt: '2026-09-06T09:00:00Z', files: [file('synthesis.pdf', 1), file('guide.pdf', 2), file('annotations.pdf', 3)], extractionCache: { results: [] } },
    s2: { id: 's2', status: 'submitted', submittedAt: '2026-09-06T10:00:00Z', files: [file('references.pdf', 4)] },
  };
  const res = resolveMergedActiveSubmission(raw);
  // Anchor is the newest submission (s2) — the id the gradebook + grading record use.
  assert.equal(res.submissionId, 's2');
  // Files are the full union: anchor file first, then the carried-forward parts.
  assert.deepEqual(res.submission.files.map((f) => f.name), ['references.pdf', 'synthesis.pdf', 'guide.pdf', 'annotations.pdf']);
  assert.equal(res.mergedFileCount, 4);
  assert.deepEqual(res.mergedFrom, ['s1', 's2']);
  // Anchor cache is dropped so a fresh extraction covers the full merged set.
  assert.equal(res.submission.extractionCache, null);
  // Original stored submission is not mutated.
  assert.equal(raw.s2.files.length, 1);
});

test('same filename across submissions: the newest version wins, no duplicate', () => {
  const raw = {
    s1: { id: 's1', status: 'submitted', submittedAt: '2026-09-06T09:00:00Z', files: [file('references.pdf', 400)] },
    s2: { id: 's2', status: 'submitted', submittedAt: '2026-09-06T10:00:00Z', files: [file('references.pdf', 520)] },
  };
  const res = resolveMergedActiveSubmission(raw);
  // Only the anchor's filename exists -> nothing carried -> anchor returned untouched.
  assert.equal(res.submission, raw.s2);
  assert.equal(res.submission.files.length, 1);
  assert.equal(res.submission.files[0].size, 520);
});

test('a newer partial masking an older complete set is healed (the exact production bug)', () => {
  const raw = {
    complete: { id: 'complete', status: 'submitted', submittedAt: '2026-09-06T09:00:00Z', files: [file('a.pdf', 1), file('b.pdf', 2), file('c.pdf', 3), file('d.pdf', 4)] },
    partial: { id: 'partial', status: 'submitted', submittedAt: '2026-09-06T11:00:00Z', files: [file('d.pdf', 9)] },
  };
  const res = resolveMergedActiveSubmission(raw);
  assert.equal(res.submissionId, 'partial');
  assert.deepEqual(res.submission.files.map((f) => f.name).sort(), ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf']);
  // The newest d.pdf (from the partial anchor) wins.
  assert.equal(res.submission.files.find((f) => f.name === 'd.pdf').size, 9);
});

test('cleared submissions are excluded from both anchor selection and the union', () => {
  const raw = {
    s1: { id: 's1', status: 'submitted', submittedAt: '2026-09-06T09:00:00Z', files: [file('keep.pdf', 1)] },
    s2: { id: 's2', status: 'cleared', submittedAt: '2026-09-06T12:00:00Z', files: [file('bad.pdf', 2)] },
  };
  const res = resolveMergedActiveSubmission(raw);
  assert.equal(res.submissionId, 's1');
  assert.deepEqual(res.submission.files.map((f) => f.name), ['keep.pdf']);
});

test('anchor is chosen by submittedAt regardless of key order', () => {
  const raw = {
    zzz: { id: 'zzz', status: 'submitted', submittedAt: '2026-09-06T08:00:00Z', files: [file('old.pdf', 1)] },
    aaa: { id: 'aaa', status: 'submitted', submittedAt: '2026-09-06T20:00:00Z', files: [file('new.pdf', 2)] },
  };
  const res = resolveMergedActiveSubmission(raw);
  assert.equal(res.submissionId, 'aaa');
  assert.equal(res.submission.files[0].name, 'new.pdf');
});

test('falls back to the RTDB key when a submission has no embedded id', () => {
  const raw = { '-Nabc': { status: 'submitted', submittedAt: '2026-09-06T10:00:00Z', files: [file('x.pdf', 1)] } };
  const res = resolveMergedActiveSubmission(raw);
  assert.equal(res.submissionId, '-Nabc');
});

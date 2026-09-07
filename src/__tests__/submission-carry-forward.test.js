// Carry-forward tests for src/submission-files.js.
// Guards the root-cause fix for multi-file assignments being fragment-marked:
// a resubmission must start from the COMPLETE set of already-submitted files, so
// adding one more file yields one submission with all files (not a lone fragment
// that masks the earlier work for the AI marker and gradebook).
//
// Run with: node --test src/__tests__/submission-carry-forward.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapSubmittedFilesToUploadEntries,
  resolveInitialSubmissionFiles,
} from '../submission-files.js';

// A realistic latest submission: the four parts of an a2 assignment.
function makeLatestSubmission() {
  return {
    id: 'sub-1',
    status: 'submitted',
    submittedAt: '2026-09-06T10:00:00.000Z',
    files: [
      { name: 'synthesis.pdf', type: 'application/pdf', size: 1000, storagePath: 'submissions/a2/u1/s-synthesis.pdf', url: 'https://x/synthesis', uploadedAt: '2026-09-06T09:58:00.000Z' },
      { name: 'guide.pdf', type: 'application/pdf', size: 2000, storagePath: 'submissions/a2/u1/s-guide.pdf', url: 'https://x/guide', uploadedAt: '2026-09-06T09:59:00.000Z' },
      { name: 'annotations.pdf', type: 'application/pdf', size: 3000, storagePath: 'submissions/a2/u1/s-annot.pdf', url: 'https://x/annot', uploadedAt: '2026-09-06T09:59:30.000Z' },
      { name: 'references.pdf', type: 'application/pdf', size: 400, storagePath: 'submissions/a2/u1/s-refs.pdf', url: 'https://x/refs', uploadedAt: '2026-09-06T10:00:00.000Z' },
    ],
  };
}

test('mapSubmittedFilesToUploadEntries carries every stored file as a non-pending, carried-forward entry', () => {
  const entries = mapSubmittedFilesToUploadEntries(makeLatestSubmission().files);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((e) => e.name), ['synthesis.pdf', 'guide.pdf', 'annotations.pdf', 'references.pdf']);
  for (const e of entries) {
    assert.equal(e.pendingUpload, false, 'carried files are already in storage');
    assert.equal(e.carriedForward, true, 'flagged so the UI can label them');
    assert.equal(e.slot, null, 'carry-forward is for non-slot assessments');
    assert.ok(e.storagePath && e.url, 'storage references are preserved so no re-upload is needed');
  }
});

test('mapSubmittedFilesToUploadEntries drops files that never reached storage', () => {
  const entries = mapSubmittedFilesToUploadEntries([
    { name: 'good.pdf', storagePath: 'submissions/a2/u1/good.pdf', url: 'https://x/good' },
    { name: 'never-uploaded.pdf' }, // no storagePath and no url
    null,
  ]);
  assert.deepEqual(entries.map((e) => e.name), ['good.pdf']);
});

test('mapSubmittedFilesToUploadEntries tolerates missing/invalid input', () => {
  assert.deepEqual(mapSubmittedFilesToUploadEntries(), []);
  assert.deepEqual(mapSubmittedFilesToUploadEntries(null), []);
  assert.deepEqual(mapSubmittedFilesToUploadEntries('nope'), []);
});

test('ROOT CAUSE: a resubmission with no draft seeds the full prior set, so "add one file" cannot fragment', () => {
  // Student already submitted all four parts, then returns to add a fixed
  // references.pdf. Draft was cleared after the first submit, so no draft exists.
  const staged = resolveInitialSubmissionFiles({
    draft: null,
    latestSubmission: makeLatestSubmission(),
    slotBased: false,
  });
  // The staging area starts with all four files — the student adds/removes from
  // here, so the next submit is the complete set, never a lone references.pdf.
  assert.equal(staged.length, 4);
  assert.ok(staged.every((f) => f.carriedForward));
});

test('an in-progress draft always wins over submission history', () => {
  const draft = { files: [{ name: 'work-in-progress.docx', storagePath: 'p', url: 'u', pendingUpload: true }], note: 'wip' };
  const staged = resolveInitialSubmissionFiles({
    draft,
    latestSubmission: makeLatestSubmission(),
    slotBased: false,
  });
  assert.equal(staged.length, 1);
  assert.equal(staged[0].name, 'work-in-progress.docx');
});

test('an empty draft (e.g. a note-only save) still falls back to carrying prior files forward', () => {
  // This is the trap: a note-only draft used to wipe the file list to empty,
  // which is exactly how partial resubmissions happened.
  const staged = resolveInitialSubmissionFiles({
    draft: { files: [], note: 'a note but no files' },
    latestSubmission: makeLatestSubmission(),
    slotBased: false,
  });
  assert.equal(staged.length, 4);
});

test('no draft and no prior submission yields an empty staging area', () => {
  assert.deepEqual(resolveInitialSubmissionFiles({ draft: null, latestSubmission: null, slotBased: false }), []);
  assert.deepEqual(resolveInitialSubmissionFiles({}), []);
});

test('a1 (slot-based) is never seeded from history and keeps only slotted draft files', () => {
  const draft = {
    files: [
      { name: 'report.pdf', slot: 'a1-slot-report', storagePath: 'p1', url: 'u1' },
      { name: 'stray.pdf', storagePath: 'p2', url: 'u2' }, // no slot -> dropped
    ],
  };
  const staged = resolveInitialSubmissionFiles({
    draft,
    latestSubmission: makeLatestSubmission(), // must be ignored for a1
    slotBased: true,
  });
  assert.deepEqual(staged.map((f) => f.name), ['report.pdf']);
});

test('a1 with no draft stays empty even when a prior submission exists', () => {
  const staged = resolveInitialSubmissionFiles({
    draft: null,
    latestSubmission: makeLatestSubmission(),
    slotBased: true,
  });
  assert.deepEqual(staged, []);
});

// src/submission-files.js
// ─────────────────────────────────────────────
// Pure, dependency-free helpers for the submission upload staging area.
// Kept out of submissions.js (which imports Firebase at module load) so this
// logic is unit-testable under `node --test` without a browser/Firebase env.
//
// A submission is a snapshot of ALL of a student's files, not a single file.
// When a student returns to add or replace a file, the upload area must be
// seeded with the files they already submitted so the next submit carries the
// COMPLETE set. Otherwise a follow-up "add references.pdf" submit creates a new
// latest submission holding only that one file, and the AI marker + gradebook
// (which both read only the latest submission) grade/display a fragment.
// ─────────────────────────────────────────────

function _nowIso() {
  return new Date().toISOString();
}

// Map files from a stored submission into upload-area staging entries. Only
// files that actually landed in storage (have a storagePath or url) can be
// carried forward — a partially-uploaded fragment is not re-stageable.
export function mapSubmittedFilesToUploadEntries(files = []) {
  return (Array.isArray(files) ? files : [])
    .filter((f) => f && (f.storagePath || f.url))
    .map((f) => ({
      name: String(f.name || 'upload'),
      type: String(f.type || 'application/octet-stream'),
      size: Number(f.size || 0) || 0,
      storagePath: String(f.storagePath || ''),
      url: String(f.url || ''),
      uploadedAt: f.uploadedAt || _nowIso(),
      slot: null,
      pendingUpload: false,
      carriedForward: true,
    }));
}

// Decide what the upload staging area should start with when a student opens an
// assessment. Draft (in-progress edits) always wins; otherwise carry forward the
// files from the latest active submission. a1 stays slot-based and is never
// seeded from history (its historical data is reconciled and slot-shaped).
export function resolveInitialSubmissionFiles({ draft = null, latestSubmission = null, slotBased = false } = {}) {
  if (slotBased) {
    return (Array.isArray(draft?.files) ? draft.files : []).filter((f) => f && f.slot);
  }
  const draftFiles = Array.isArray(draft?.files) ? draft.files : [];
  if (draftFiles.length) return draftFiles;
  return mapSubmittedFilesToUploadEntries(latestSubmission?.files || []);
}

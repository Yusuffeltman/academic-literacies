// src/submission-merge.js
// ─────────────────────────────────────────────
// Safety net for already-fragmented multi-file submissions.
//
// A submission is a snapshot of ALL of a student's files. When a student submits
// more than once (e.g. uploads the report, then later a forgotten references.pdf
// as a separate submit), the newest submission can hold only a fragment. The AI
// marker and the gradebook both key on the single newest non-cleared submission,
// so that fragment masks the earlier complete work and gets a near-zero mark.
//
// This resolver returns the newest ("anchor") active submission, but with its
// files[] UNIONED across all of the student's active submissions — newest version
// of each distinct filename wins. The grading record stays keyed to the anchor's
// id, so nothing downstream needs to change: the anchor is simply graded/displayed
// as the whole assignment. When there is nothing to add (one submission, or every
// filename already lives on the anchor), the anchor is returned untouched so
// behaviour is byte-identical to before.
//
// Mirrored for Cloud Functions (CommonJS) in functions/submission-merge.js — keep
// the two copies in lockstep.
// ─────────────────────────────────────────────

function _ms(value) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function _fileKey(file) {
  const name = String(file?.name || '').trim().toLowerCase();
  if (name) return `name:${name}`;
  const storagePath = String(file?.storagePath || '').trim();
  if (storagePath) return `path:${storagePath}`;
  return '';
}

// rawBySubmission: { [submissionId]: submission } exactly as stored under
// submissions/{assessmentId}/{studentUid}. Returns null when the student has no
// active submission, otherwise { submissionId, submission, submittedAtMs,
// mergedFileCount, mergedFrom }.
export function resolveMergedActiveSubmission(rawBySubmission = {}) {
  const active = [];
  for (const [rawId, sub] of Object.entries(rawBySubmission || {})) {
    if (!sub || typeof sub !== 'object') continue;
    if (String(sub.status || '').trim().toLowerCase() === 'cleared') continue;
    const submittedAtMs = _ms(sub.submittedAt || sub.updatedAt);
    if (!submittedAtMs) continue;
    const id = String(sub.id || rawId || '').trim();
    if (!id) continue;
    active.push({ id, sub, submittedAtMs });
  }
  if (!active.length) return null;

  // Oldest -> newest, so the newest version of a repeated filename overwrites,
  // and the last element is the anchor (the current "latest submission").
  active.sort((a, b) => a.submittedAtMs - b.submittedAtMs);
  const anchor = active[active.length - 1];
  const anchorFiles = Array.isArray(anchor.sub.files) ? anchor.sub.files : [];

  const unchanged = {
    submissionId: anchor.id,
    submission: anchor.sub,
    submittedAtMs: anchor.submittedAtMs,
    mergedFileCount: anchorFiles.length,
    mergedFrom: [anchor.id],
  };
  if (active.length === 1) return unchanged;

  // Newest-version-per-filename across every active submission.
  const winner = new Map();
  for (const entry of active) {
    const files = Array.isArray(entry.sub.files) ? entry.sub.files : [];
    for (const file of files) {
      const key = _fileKey(file);
      if (key) winner.set(key, file);
    }
  }

  // Order: the anchor's own files first (its versions win for its filenames),
  // then any file whose filename is not on the anchor, carried from the other
  // active submissions oldest -> newest.
  const ordered = [];
  const used = new Set();
  const anchorKeys = new Set();
  for (const file of anchorFiles) {
    const key = _fileKey(file);
    if (!key) { ordered.push(file); continue; }
    anchorKeys.add(key);
    if (used.has(key)) continue;
    ordered.push(winner.get(key) || file);
    used.add(key);
  }
  for (const entry of active) {
    if (entry === anchor) continue;
    const files = Array.isArray(entry.sub.files) ? entry.sub.files : [];
    for (const file of files) {
      const key = _fileKey(file);
      if (!key || used.has(key) || anchorKeys.has(key)) continue;
      ordered.push(winner.get(key) || file);
      used.add(key);
    }
  }

  const carriedCount = [...used].filter((key) => !anchorKeys.has(key)).length;
  if (!carriedCount) return unchanged; // nothing to add — leave the anchor as-is

  // Drop the anchor's extractionCache: it only covers the anchor's own files, so
  // it must not shadow a fresh extraction over the full merged set.
  const submission = { ...anchor.sub, files: ordered, extractionCache: null, _mergedFrom: active.map((a) => a.id) };
  return {
    submissionId: anchor.id,
    submission,
    submittedAtMs: anchor.submittedAtMs,
    mergedFileCount: ordered.length,
    mergedFrom: active.map((a) => a.id),
  };
}

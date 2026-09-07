// functions/submission-merge.js
// ─────────────────────────────────────────────
// CommonJS mirror of src/submission-merge.js — keep the two copies in lockstep.
//
// Safety net for already-fragmented multi-file submissions. Returns the newest
// ("anchor") active submission with its files[] unioned across all of the
// student's active submissions (newest version of each distinct filename wins),
// so the AI marker grades the whole assignment even when a student split their
// upload across several submissions. The grading record stays keyed to the
// anchor's id, so nothing else in the pipeline changes. When there is nothing to
// add (one submission, or every filename already lives on the anchor), the anchor
// is returned untouched so behaviour is byte-identical to before.
// ─────────────────────────────────────────────

function _ms(value) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function _fileKey(file) {
  const name = String((file && file.name) || "").trim().toLowerCase();
  if (name) return `name:${name}`;
  const storagePath = String((file && file.storagePath) || "").trim();
  if (storagePath) return `path:${storagePath}`;
  return "";
}

function resolveMergedActiveSubmission(rawBySubmission = {}) {
  const active = [];
  for (const [rawId, sub] of Object.entries(rawBySubmission || {})) {
    if (!sub || typeof sub !== "object") continue;
    if (String(sub.status || "").trim().toLowerCase() === "cleared") continue;
    const submittedAtMs = _ms(sub.submittedAt || sub.updatedAt);
    if (!submittedAtMs) continue;
    const id = String(sub.id || rawId || "").trim();
    if (!id) continue;
    active.push({ id, sub, submittedAtMs });
  }
  if (!active.length) return null;

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

  const winner = new Map();
  for (const entry of active) {
    const files = Array.isArray(entry.sub.files) ? entry.sub.files : [];
    for (const f of files) {
      const key = _fileKey(f);
      if (key) winner.set(key, f);
    }
  }

  const ordered = [];
  const used = new Set();
  const anchorKeys = new Set();
  for (const f of anchorFiles) {
    const key = _fileKey(f);
    if (!key) { ordered.push(f); continue; }
    anchorKeys.add(key);
    if (used.has(key)) continue;
    ordered.push(winner.get(key) || f);
    used.add(key);
  }
  for (const entry of active) {
    if (entry === anchor) continue;
    const files = Array.isArray(entry.sub.files) ? entry.sub.files : [];
    for (const f of files) {
      const key = _fileKey(f);
      if (!key || used.has(key) || anchorKeys.has(key)) continue;
      ordered.push(winner.get(key) || f);
      used.add(key);
    }
  }

  const carriedCount = [...used].filter((key) => !anchorKeys.has(key)).length;
  if (!carriedCount) return unchanged;

  const submission = { ...anchor.sub, files: ordered, extractionCache: null, _mergedFrom: active.map((a) => a.id) };
  return {
    submissionId: anchor.id,
    submission,
    submittedAtMs: anchor.submittedAtMs,
    mergedFileCount: ordered.length,
    mergedFrom: active.map((a) => a.id),
  };
}

module.exports = { resolveMergedActiveSubmission };

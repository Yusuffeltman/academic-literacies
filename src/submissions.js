// src/submissions.js
// ─────────────────────────────────────────────
// Assessment Submission System
// Upload, safeguard, and review student assessment files.
// Storage: Firebase Storage  ·  Metadata: Realtime Database
// ─────────────────────────────────────────────
import { db, storage, functions } from './firebase.js';
import { ref, get, push, set, update, onValue, off, remove } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import {
  getCachedAssessmentSettingsOverride,
  getMergedAssessmentConfig,
  loadAssessmentSettingsOverrides,
} from './assessment-settings.js';
import { extractSubmissionBundle, serializeExtractionBundle } from './document-text.js';
import { adaptEltAssessmentToAiDraft } from './elt-assessment.js';
import { deleteLocalDraft, loadLocalDraft, saveLocalDraft } from './draft-store.js';
import { STATE } from './state.js';
import { clearQueuedSubmissionDraftFiles, mirrorSubmissionDraftToCloud } from './sync-engine.js';
import { isAssessmentOpenByDefault } from './unit-access.js';
import * as assessments from '../content/assessments/index.js';

// ── Constants ────────────────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
let _runSynthIdCheckCallable = null;

function _synthIdCheckCallable() {
  if (!_runSynthIdCheckCallable) _runSynthIdCheckCallable = httpsCallable(functions, 'runSubmissionSynthIdCheck');
  return _runSynthIdCheckCallable;
}
const MAX_FILES_PER_SUBMISSION = 5;
const SUBMISSION_DRAFT_SURFACE = 'submission-draft';

export const GRADING_STATUS = Object.freeze({
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  AI_READY: 'ai_ready',
  TUTOR_REVIEWED: 'tutor_reviewed',
  MODERATION_REQUIRED: 'moderation_required',
  RETURNED_TO_TUTOR: 'returned_to_tutor',
  INTEGRITY_REVIEW_REQUIRED: 'integrity_review_required',
  MODERATED: 'moderated',
  FINALISED: 'finalised',
  POSTED: 'posted',
  AI_FAILED: 'ai_failed',
  INGESTION_FAILED: 'ingestion_failed',
});

export const GRADE_BOUNDARIES = Object.freeze([50, 60, 70, 75]);

// ── Helpers ──────────────────────────────────
function _uid() {
  return STATE.user?.uid || null;
}

function _safeName(name = 'upload') {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function _stamp() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function _extension(name = '') {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function _nowIso() {
  return new Date().toISOString();
}

function _draftRecordFromRemote(remoteDraft = {}) {
  const savedAt = remoteDraft?.savedAt || _nowIso();
  return {
    payload: {
      files: _sanitizeDraftFiles(remoteDraft?.files || []),
      note: String(remoteDraft?.note || '').slice(0, 1000),
    },
    updatedAt: savedAt,
    lastSyncAt: savedAt,
    syncState: 'synced',
    revision: 1,
  };
}

function _sanitizeDraftFiles(files = []) {
  return (Array.isArray(files) ? files : []).map((file) => ({
    name: String(file?.name || 'upload'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0) || 0,
    storagePath: String(file?.storagePath || ''),
    url: String(file?.url || ''),
    uploadedAt: file?.uploadedAt || _nowIso(),
    slot: file?.slot || null,
    pendingUpload: Boolean(file?.pendingUpload),
    localDraftId: file?.localDraftId || null,
    syncState: file?.pendingUpload ? 'local' : 'synced',
  }));
}

async function _saveDraftLocally(assessmentId, files, note, syncState = 'local', lastSyncAt = null) {
  const uid = _uid();
  if (!uid) return null;
  const payload = {
    files: _sanitizeDraftFiles(files),
    note: String(note || '').slice(0, 1000),
  };
  return saveLocalDraft({
    userId: uid,
    surface: SUBMISSION_DRAFT_SURFACE,
    scopeId: assessmentId,
    payload,
    syncState,
    lastSyncAt,
    pendingUploads: payload.files.filter((file) => file?.pendingUpload).map((file) => file.localDraftId).filter(Boolean),
  });
}

function _reviewerName() {
  return STATE.user?.displayName?.split(' [')[0]?.trim() || '';
}

function _cleanText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function _cleanActionItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => _cleanText(item, 280))
    .filter(Boolean)
    .slice(0, 5);
}

function _cleanFeedbackSections(sections = {}) {
  return {
    whereYouAreNow: _cleanText(sections.whereYouAreNow, 2400),
    whereYouShouldBe: _cleanText(sections.whereYouShouldBe, 2400),
    relationToOutcomes: _cleanText(sections.relationToOutcomes, 2400),
    whatToDoNext: _cleanText(sections.whatToDoNext, 2400),
  };
}

function _cleanRubricRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    criterion: _cleanText(row?.criterion, 240),
    provisionalMark: row?.provisionalMark == null || Number.isNaN(Number(row.provisionalMark)) ? null : Number(row.provisionalMark),
    maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? null : Number(row.maxMark),
    rationale: _cleanText(row?.rationale, 1200),
    evidenceRefs: (Array.isArray(row?.evidenceRefs) ? row.evidenceRefs : [])
      .map((refText) => _cleanText(refText, 240))
      .filter(Boolean)
      .slice(0, 4),
  }));
}

function _cleanIntegrity(payload = {}) {
  const reasons = (Array.isArray(payload?.reasons) ? payload.reasons : [])
    .map((reason) => _cleanText(reason, 320))
    .filter(Boolean)
    .slice(0, 6);
  const confidenceBand = _cleanText(payload?.confidenceBand, 80) || 'low';
  return {
    advisory: payload?.advisory !== false,
    suspicionScore: payload?.suspicionScore == null || Number.isNaN(Number(payload.suspicionScore)) ? null : Number(payload.suspicionScore),
    confidenceBand,
    reasons,
    requiredHumanFollowUp: _cleanText(payload?.requiredHumanFollowUp, 1200),
    recommendedStaffAction: _cleanText(payload?.recommendedStaffAction, 1200),
    staffResolution: _cleanText(payload?.staffResolution, 1200),
    staffResolutionStatus: _cleanText(payload?.staffResolutionStatus, 80),
    synthId: _cleanSynthId(payload?.synthId),
  };
}

function _cleanQualityChecks(payload = null) {
  if (!payload || typeof payload !== 'object') return null;
  return {
    passed: payload.passed !== false,
    mode: _cleanText(payload.mode, 80) || 'validated',
    issues: (Array.isArray(payload.issues) ? payload.issues : [])
      .map((item) => _cleanText(item, 80))
      .filter(Boolean)
      .slice(0, 8),
    issueLabels: (Array.isArray(payload.issueLabels) ? payload.issueLabels : [])
      .map((item) => _cleanText(item, 160))
      .filter(Boolean)
      .slice(0, 8),
  };
}

function _cleanSynthId(payload = null) {
  if (!payload || typeof payload !== 'object') return null;
  const checkedFiles = (Array.isArray(payload?.checkedFiles) ? payload.checkedFiles : [])
    .map((item) => ({
      name: _cleanText(item?.name, 240),
      ext: _cleanText(item?.ext, 24),
      modality: _cleanText(item?.modality, 40),
      size: item?.size == null || Number.isNaN(Number(item.size)) ? 0 : Number(item.size),
      status: _cleanText(item?.status, 40),
      note: _cleanText(item?.note, 240),
    }))
    .filter((item) => item.name)
    .slice(0, 12);
  const evidence = (Array.isArray(payload?.evidence) ? payload.evidence : [])
    .map((item) => _cleanText(item, 320))
    .filter(Boolean)
    .slice(0, 6);
  const status = _cleanText(payload?.status, 40).toLowerCase();
  if (!status && !checkedFiles.length && !evidence.length && !_cleanText(payload?.summary, 1200) && !_cleanText(payload?.provider, 120)) return null;
  return {
    status,
    provider: _cleanText(payload?.provider, 120),
    detectorVersion: _cleanText(payload?.detectorVersion, 120),
    checkedAt: _cleanText(payload?.checkedAt, 80),
    detected: typeof payload?.detected === 'boolean' ? payload.detected : null,
    confidence: payload?.confidence == null || Number.isNaN(Number(payload.confidence)) ? null : Number(payload.confidence),
    confidenceBand: _cleanText(payload?.confidenceBand, 40) || 'low',
    summary: _cleanText(payload?.summary, 1200),
    evidence,
    checkedFiles,
    requiredHumanFollowUp: _cleanText(payload?.requiredHumanFollowUp, 1200),
    recommendedStaffAction: _cleanText(payload?.recommendedStaffAction, 1200),
  };
}

function _cleanReleasedAnnotations(annotations = []) {
  return (Array.isArray(annotations) ? annotations : [])
    .map((annotation) => {
      const source = _cleanText(annotation?.source || annotation?.sourceKind, 40).toLowerCase();
      const quote = _cleanText(annotation?.quote || annotation?.exact_quote, 1000);
      const comment = _cleanText(annotation?.comment || annotation?.suggested_revision, 1000);
      if (!quote && !comment) return null;
      const sourceLabel = _cleanText(
        annotation?.sourceLabel
        || annotation?.markerName
        || annotation?.feedback_type
        || (source === 'ai' ? 'AI Draft' : 'Marker'),
        120,
      );
      return {
        quote,
        comment,
        source: source || 'marker',
        sourceLabel,
        markerName: _cleanText(annotation?.markerName, 160) || sourceLabel,
        markerRole: _cleanText(annotation?.markerRole, 40),
        includeInDraft: Boolean(annotation?.includeInDraft),
      };
    })
    .filter(Boolean);
}

function _cloneJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return null;
  }
}

async function _getExistingGradingRecord(assessmentId, studentUid, submissionId) {
  try {
    const snap = await get(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`));
    return snap.exists() ? (snap.val() || {}) : {};
  } catch {
    return {};
  }
}

function _workflowHistoryWithEvent(record = {}, event = {}) {
  const prior = Array.isArray(record?.workflowHistory) ? record.workflowHistory : [];
  const next = [...prior, {
    at: _cleanText(event?.at || _nowIso(), 80) || _nowIso(),
    action: _cleanText(event?.action, 80),
    fromStatus: _cleanText(event?.fromStatus, 80),
    toStatus: _cleanText(event?.toStatus, 80),
    byUid: _cleanText(event?.byUid, 120) || _uid() || '',
    byName: _cleanText(event?.byName, 160) || _reviewerName(),
    byRole: _cleanText(event?.byRole, 40) || String(STATE.user?._resolvedRole || STATE.user?.profile?.role || '').trim().toLowerCase(),
    note: _cleanText(event?.note, 1200),
  }].filter((item) => item.action || item.toStatus);
  return next.slice(-40);
}

function _reviewerMeta(roleOverride = '') {
  return {
    uid: _uid(),
    name: _reviewerName(),
    role: String(roleOverride || STATE.user?._resolvedRole || STATE.user?.profile?.role || '').trim().toLowerCase(),
  };
}

function _allowsLateSubmissionException(exception) {
  if (!exception || typeof exception !== 'object') return false;
  if (exception.allowLate !== true) return false;

  const expiresAt = exception.expiresAt || exception.until || exception.deadline;
  if (!expiresAt) return true;

  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return true;
  return Date.now() <= expiresMs;
}

function _buildFeedbackComment({ sections, actionItems, rubricRows }) {
  const parts = [];
  if (sections.whereYouAreNow) parts.push(`Where you are now: ${sections.whereYouAreNow}`);
  if (sections.whereYouShouldBe) parts.push(`Where you should be: ${sections.whereYouShouldBe}`);
  if (sections.relationToOutcomes) parts.push(`How this maps to the task and course outcomes: ${sections.relationToOutcomes}`);
  if (sections.whatToDoNext) parts.push(`What to do next: ${sections.whatToDoNext}`);
  if (actionItems.length) {
    parts.push(`Priority actions:\n${actionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`);
  }
  if (rubricRows.length) {
    const snapshot = rubricRows
      .filter((row) => row.criterion)
      .map((row) => `${row.criterion}: ${row.provisionalMark != null ? row.provisionalMark : '—'}${row.maxMark != null ? `/${row.maxMark}` : ''}`)
      .join('; ');
    if (snapshot) parts.push(`Rubric snapshot: ${snapshot}`);
  }
  return parts.join('\n\n').trim();
}

export function buildStudentFacingFeedbackSummary(payload = {}) {
  const sections = _cleanFeedbackSections(payload.sections || payload.feedback || {});
  const actionItems = _cleanActionItems(payload.actionItems);
  const rubricRows = _cleanRubricRows(payload.rubricRows || payload.criterionRows || []);
  const comment = _buildFeedbackComment({ sections, actionItems, rubricRows });
  return {
    sections,
    actionItems,
    rubricRows,
    comment,
    mark: payload.mark == null || Number.isNaN(Number(payload.mark)) ? null : Number(payload.mark),
  };
}

function _normalizeAssignmentMap(map = {}) {
  const out = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    const safeKey = String(key || '').trim().toUpperCase();
    if (!safeKey) return;
    out[safeKey] = {
      markerUid: _cleanText(value?.markerUid, 120),
      markerName: _cleanText(value?.markerName, 160),
      markerRole: _cleanText(value?.markerRole, 40),
      updatedAt: _cleanText(value?.updatedAt, 80) || _nowIso(),
      updatedByUid: _cleanText(value?.updatedByUid, 120) || _uid() || '',
      updatedByName: _cleanText(value?.updatedByName, 160) || _reviewerName(),
    };
  });
  return out;
}

function _normalizeSubmissionOverrides(map = {}) {
  const out = {};
  Object.entries(map || {}).forEach(([submissionId, value]) => {
    const safeId = _cleanText(submissionId, 160);
    if (!safeId) return;
    out[safeId] = {
      submissionId: safeId,
      studentUid: _cleanText(value?.studentUid, 120),
      markerUid: _cleanText(value?.markerUid, 120),
      markerName: _cleanText(value?.markerName, 160),
      markerRole: _cleanText(value?.markerRole, 40),
      updatedAt: _cleanText(value?.updatedAt, 80) || _nowIso(),
      updatedByUid: _cleanText(value?.updatedByUid, 120) || _uid() || '',
      updatedByName: _cleanText(value?.updatedByName, 160) || _reviewerName(),
    };
  });
  return out;
}

function _normalizeAssignmentsPayload(assessmentId, payload = {}) {
  return {
    assessmentId,
    assignmentMethod: payload.assignmentMethod === 'random_rebalance' ? 'random_rebalance' : 'manual',
    groupAssignments: _normalizeAssignmentMap(payload.groupAssignments),
    submissionOverrides: _normalizeSubmissionOverrides(payload.submissionOverrides),
    markersSnapshot: (Array.isArray(payload.markersSnapshot) ? payload.markersSnapshot : [])
      .map((marker) => ({
        uid: _cleanText(marker?.uid, 120),
        name: _cleanText(marker?.name, 160),
        role: _cleanText(marker?.role, 40),
      }))
      .filter((marker) => marker.uid),
    updatedAt: _nowIso(),
    updatedByUid: _uid() || '',
    updatedByName: _reviewerName(),
    seededFrom: _cleanText(payload.seededFrom, 120),
  };
}

async function _writeReleasedSubmissionFeedback(assessmentId, studentUid, submissionId, summary, meta, sourceStatus = 'reviewed', annotationsPayload = null) {
  const feedback = {
    comment: summary.comment,
    mark: summary.mark,
    reviewerUid: meta.uid,
    reviewerName: meta.name,
    reviewedAt: _nowIso(),
    reviewRole: meta.role,
    sections: summary.sections,
    actionItems: summary.actionItems,
    rubricRows: summary.rubricRows,
  };
  if (annotationsPayload) {
    feedback.annotations = _cleanReleasedAnnotations(annotationsPayload.annotations)
      .filter((annotation) => annotation.includeInDraft);
    feedback.submissionText = _cleanText(annotationsPayload.submissionText || '', 24000);
  }
  await update(ref(db, `submissions/${assessmentId}/${studentUid}/${submissionId}`), {
    feedback,
    status: sourceStatus,
    postedAt: _nowIso(),
    postedByUid: meta.uid,
    postedByName: meta.name,
    updatedAt: _nowIso(),
  });
}

function _cleanPostingDraft(payload = {}) {
  return {
    mark: payload?.mark == null || Number.isNaN(Number(payload.mark)) ? null : Number(payload.mark),
    comment: _cleanText(payload?.comment, 6000),
    sections: _cleanFeedbackSections(payload?.sections || {}),
    actionItems: _cleanActionItems(payload?.actionItems || []),
    rubricRows: _cleanRubricRows(payload?.rubricRows || []),
    annotations: _cleanReleasedAnnotations(payload?.annotations || []),
    submissionText: _cleanText(payload?.submissionText || '', 24000),
    preparedAt: _cleanText(payload?.preparedAt, 80) || _nowIso(),
    preparedByUid: _cleanText(payload?.preparedByUid, 120),
    preparedByName: _cleanText(payload?.preparedByName, 160),
    preparedByRole: _cleanText(payload?.preparedByRole, 40),
  };
}

export function isAllowedFile(file) {
  if (!file) return { ok: false, reason: 'No file provided.' };
  if (file.size > MAX_FILE_SIZE) return { ok: false, reason: `File exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB limit.` };
  const ext = _extension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { ok: false, reason: `File type "${ext || 'unknown'}" is not accepted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  return { ok: true };
}

// ── Upload a submission file to Storage ──────
export async function uploadSubmissionFile(assessmentId, file, opts = {}) {
  const uid = _uid();
  if (!uid) return { ok: false, error: 'Not signed in.' };

  const check = isAllowedFile(file);
  if (!check.ok) return { ok: false, error: check.reason };

  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
  const safeName = _safeName(file.name);
  const stamp = _stamp();
  const path = `submissions/${assessmentId}/${uid}/${stamp}-${safeName}`;
  const sRef = storageRef(storage, path);

  if (onProgress) onProgress(1);

  const timeoutMs = Number(opts.timeoutMs) || 120_000;

  return new Promise((resolve) => {
    const uploadTask = uploadBytesResumable(sRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        uploaderUid: uid,
        assessmentId,
        originalName: file.name || safeName,
      },
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      uploadTask.cancel();
      if (onProgress) onProgress('error', 'Upload timed out. Check your connection or file size.');
      resolve({ ok: false, error: 'Upload timed out.' });
    }, timeoutMs);

    uploadTask.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        const msg = err?.message || err?.code || 'Upload failed';
        if (onProgress) onProgress('error', msg);
        resolve({ ok: false, error: msg });
      },
      async () => {
        if (timedOut) return;
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve({
            ok: true,
            file: {
              name: file.name || safeName,
              type: file.type,
              size: file.size,
              storagePath: path,
              url,
              uploadedAt: new Date().toISOString(),
            },
          });
        } catch (e) {
          resolve({ ok: false, error: 'Could not get download URL.' });
        }
      },
    );
  });
}

// ── Save submission metadata to Realtime DB ──
export async function saveSubmission(assessmentId, files, opts = {}) {
  const uid = _uid();
  if (!uid) return { ok: false, error: 'Not signed in.' };
  if (!files?.length) return { ok: false, error: 'No files to submit.' };

  // Deadline Verification Check
  await loadAssessmentSettingsOverrides({ force: true });
  let assignmentCfg = Object.values(assessments)
    .filter((cfg) => cfg && typeof cfg === 'object' && cfg.id === assessmentId)
    .map((cfg) => getMergedAssessmentConfig(cfg, getCachedAssessmentSettingsOverride(cfg.id)))[0];
  let _isLateSubmission = false;
  if (assignmentCfg && assignmentCfg.deadline && !isAssessmentOpenByDefault(assessmentId)) {
    const deadlineMs = new Date(assignmentCfg.deadline).getTime();
    if (Date.now() > deadlineMs) {
      try {
        const exceptionSnap = await get(ref(db, `submission-exceptions/${assessmentId}/${uid}`));
        const exception = exceptionSnap.val();
        if (!_allowsLateSubmissionException(exception)) {
          return {
            ok: false,
            error: 'Late submissions are only available for students with an approved late-submission exception. The deadline has passed. Please contact your lecturer if you believe an exception should apply.',
          };
        }
        _isLateSubmission = true;
      } catch (err) {
        console.warn('[submissions] Late-submission exception lookup failed.', {
          assessmentId,
          uid,
          message: err?.message || String(err),
        });
        return {
          ok: false,
          error: 'We could not verify your late-submission exception right now. Please refresh and try again. If your lecturer has already approved a late submission, contact them so they can confirm the exception is active.',
        };
      }
    }
  }

  const submissionRef = push(ref(db, `submissions/${assessmentId}/${uid}`));
  const now = new Date().toISOString();

  const payload = {
    id: submissionRef.key,
    assessmentId,
    uid,
    studentName: STATE.user?.displayName?.split(' [')[0]?.trim() || '',
    studentEmail: STATE.user?.email || '',
    studentNumber: STATE.user?._studentProfileContext?.profile?.studentNumber || '',
    files: files.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
      storagePath: f.storagePath,
      url: f.url,
      uploadedAt: f.uploadedAt,
    })),
    note: String(opts.note || '').trim().slice(0, 1000),
    status: 'submitted',
    submittedAt: now,
    updatedAt: now,
    version: 1,
    isLate: _isLateSubmission,
  };

  try {
    const extractionBundle = await extractSubmissionBundle(payload.files || []);
    const extractionCache = serializeExtractionBundle(extractionBundle);
    if ((extractionCache.results || []).length || (extractionCache.unsupported || []).length) {
      payload.extractionCache = extractionCache;
    }
  } catch (err) {
    console.warn('[submissions] Automatic extraction cache generation failed.', {
      assessmentId,
      uid,
      message: err?.message || String(err),
    });
  }

  // Check for previous submissions (version history)
  try {
    const prevSnap = await get(ref(db, `submissions/${assessmentId}/${uid}`));
    if (prevSnap.exists()) {
      const prev = prevSnap.val();
      const versions = Object.values(prev).filter((v) => v && typeof v === 'object' && v.submittedAt);
      payload.version = versions.length + 1;
    }
  } catch { /* first submission */ }

  try {
    await set(submissionRef, payload);

    // Also update the student-facing submission index for quick dashboard lookup
    await update(ref(db, `submission-index/${uid}/${assessmentId}`), {
      latestId: submissionRef.key,
      latestAt: now,
      totalVersions: payload.version,
      assessmentId,
      isLate: _isLateSubmission,
    });

    return { ok: true, submissionId: submissionRef.key, version: payload.version };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save submission.' };
  }
}

// ── Auto-save draft (safeguard against losing work) ──
export async function saveDraft(assessmentId, files, note = '') {
  const uid = _uid();
  if (!uid) return;

  try {
    await _saveDraftLocally(assessmentId, files, note, 'local');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    await mirrorSubmissionDraftToCloud(assessmentId);
  } catch (err) {
    console.warn('Draft save failed:', err);
  }
}

export async function loadDraft(assessmentId) {
  const uid = _uid();
  if (!uid) return null;

  try {
    const snap = await get(ref(db, `submission-drafts/${uid}/${assessmentId}`));
    const remoteDraft = snap.exists() ? snap.val() : null;
    const localDraft = await loadLocalDraft({ userId: uid, surface: SUBMISSION_DRAFT_SURFACE, scopeId: assessmentId });
    if (!localDraft && !remoteDraft) return null;

    const remoteRecord = remoteDraft ? _draftRecordFromRemote(remoteDraft) : null;
    const localWins = localDraft && (
      localDraft.syncState !== 'synced'
      || !remoteRecord
      || Date.parse(localDraft.updatedAt || '') >= Date.parse(remoteRecord.updatedAt || '')
    );
    if (localWins) {
      return localDraft.payload;
    }
    await saveLocalDraft({
      userId: uid,
      surface: SUBMISSION_DRAFT_SURFACE,
      scopeId: assessmentId,
      payload: remoteRecord.payload,
      syncState: 'synced',
      lastSyncAt: remoteRecord.lastSyncAt,
      pendingUploads: [],
      keepHistory: false,
    });
    return remoteRecord.payload;
  } catch {
    const localDraft = await loadLocalDraft({ userId: uid, surface: SUBMISSION_DRAFT_SURFACE, scopeId: assessmentId });
    return localDraft?.payload || null;
  }
}

export async function clearDraft(assessmentId) {
  const uid = _uid();
  if (!uid) return;
  await clearQueuedSubmissionDraftFiles(assessmentId).catch(() => {});
  try {
    await set(ref(db, `submission-drafts/${uid}/${assessmentId}`), null);
  } catch { /* ignore */ }
  await deleteLocalDraft({ userId: uid, surface: SUBMISSION_DRAFT_SURFACE, scopeId: assessmentId }).catch(() => {});
}

// ── Read student's own submissions ───────────
export async function getMySubmissions(assessmentId) {
  const uid = _uid();
  if (!uid) return [];
  try {
    const snap = await get(ref(db, `submissions/${assessmentId}/${uid}`));
    if (!snap.exists()) return [];
    const raw = snap.val();
    return Object.values(raw)
      .filter((s) => s && typeof s === 'object' && s.submittedAt)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch {
    return [];
  }
}

export async function getMySubmissionIndex() {
  const uid = _uid();
  if (!uid) return {};
  try {
    const snap = await get(ref(db, `submission-index/${uid}`));
    return snap.exists() ? snap.val() : {};
  } catch {
    return {};
  }
}

export async function getMySubmissionException(assessmentId) {
  const uid = _uid();
  if (!uid || !assessmentId) return null;
  try {
    const snap = await get(ref(db, `submission-exceptions/${assessmentId}/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch {
    return null;
  }
}

// ── Staff: read all submissions for an assessment ──
export async function getAllSubmissions(assessmentId) {
  try {
    const snap = await get(ref(db, `submissions/${assessmentId}`));
    if (!snap.exists()) return [];
    const byStudent = snap.val();
    const all = [];
    for (const [studentUid, subs] of Object.entries(byStudent)) {
      if (!subs || typeof subs !== 'object') continue;
      for (const [subId, sub] of Object.entries(subs)) {
        if (!sub || typeof sub !== 'object' || !sub.submittedAt) continue;
        all.push({ ...sub, _studentUid: studentUid, _subId: subId });
      }
    }
    return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch {
    return [];
  }
}

// ── Staff: add feedback to a submission ──────
export async function addSubmissionFeedback(assessmentId, studentUid, submissionId, feedback) {
  try {
    await update(ref(db, `submissions/${assessmentId}/${studentUid}/${submissionId}`), {
      feedback: {
        comment: String(feedback.comment || '').slice(0, 2000),
        mark: feedback.mark != null ? Number(feedback.mark) : null,
        reviewerUid: _uid(),
        reviewerName: STATE.user?.displayName?.split(' [')[0]?.trim() || '',
        reviewedAt: new Date().toISOString(),
      },
      status: 'reviewed',
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save feedback.' };
  }
}

// ── Watch submission-index for real-time badge ──
let _indexWatcher = null;
export function watchMySubmissionIndex(callback) {
  const uid = _uid();
  if (!uid) return;
  if (_indexWatcher) _indexWatcher();
  const r = ref(db, `submission-index/${uid}`);
  _indexWatcher = onValue(r, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

export function unwatchMySubmissionIndex() {
  if (_indexWatcher) {
    _indexWatcher();
    _indexWatcher = null;
  }
}

let _lateExceptionWatcher = null;
export function watchMySubmissionException(assessmentId, callback) {
  const uid = _uid();
  if (!uid || !assessmentId) return;
  if (_lateExceptionWatcher) _lateExceptionWatcher();
  const r = ref(db, `submission-exceptions/${assessmentId}/${uid}`);
  _lateExceptionWatcher = onValue(r, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
}

export function unwatchMySubmissionException() {
  if (_lateExceptionWatcher) {
    _lateExceptionWatcher();
    _lateExceptionWatcher = null;
  }
}

export { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES_PER_SUBMISSION };
// ── Tutor Functions: Deadlines & Exceptions ─

export async function grantLateSubmissionException(assessmentId, studentUid) {
  try {
    await set(ref(db, `submission-exceptions/${assessmentId}/${studentUid}`), {
      allowLate: true,
      grantedAt: new Date().toISOString(),
      grantedBy: STATE.user?.uid || 'staff',
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to grant late exception.' };
  }
}

export async function clearErroneousSubmission(assessmentId, studentUid, submissionId) {
  try {
    // We mark the status as cleared instead of permanently destroying the record
    // We also repair the submission index so the student sees the latest valid submission,
    // or "Not submitted" if nothing valid remains.
    await update(ref(db, `submissions/${assessmentId}/${studentUid}/${submissionId}`), {
      status: 'cleared',
      clearedAt: new Date().toISOString(),
      clearedBy: STATE.user?.uid || 'staff'
    });

    const subsSnap = await get(ref(db, `submissions/${assessmentId}/${studentUid}`));
    const activeSubs = subsSnap.exists()
      ? Object.values(subsSnap.val() || {})
        .filter((sub) => sub && typeof sub === 'object' && sub.submittedAt && sub.status !== 'cleared')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      : [];

    if (activeSubs.length) {
      const latest = activeSubs[0];
      await update(ref(db, `submission-index/${studentUid}/${assessmentId}`), {
        latestId: latest.id || '',
        latestAt: latest.submittedAt || latest.updatedAt || new Date().toISOString(),
        totalVersions: activeSubs.length,
        isLate: latest.isLate === true,
      });
    } else {
      await remove(ref(db, `submission-index/${studentUid}/${assessmentId}`));
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to clear submission.' };
  }
}

export async function getGradingAssignments(assessmentId) {
  try {
    const snap = await get(ref(db, `grading-assignments/${assessmentId}`));
    if (!snap.exists()) {
      return {
        assessmentId,
        assignmentMethod: 'manual',
        groupAssignments: {},
        submissionOverrides: {},
        markersSnapshot: [],
      };
    }
    return _normalizeAssignmentsPayload(assessmentId, snap.val() || {});
  } catch {
    return {
      assessmentId,
      assignmentMethod: 'manual',
      groupAssignments: {},
      submissionOverrides: {},
      markersSnapshot: [],
    };
  }
}

export async function saveGradingAssignments(assessmentId, payload = {}) {
  try {
    const next = _normalizeAssignmentsPayload(assessmentId, payload);
    await set(ref(db, `grading-assignments/${assessmentId}`), next);
    return { ok: true, value: next };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save grading assignments.' };
  }
}

export async function getGradingRecords(assessmentId) {
  try {
    const snap = await get(ref(db, `grading-records/${assessmentId}`));
    return snap.exists() ? snap.val() : {};
  } catch {
    return {};
  }
}

export async function runSubmissionSynthIdCheck(assessmentId, studentUid, submissionId) {
  try {
    const callable = _synthIdCheckCallable();
    const response = await callable({ assessmentId, studentUid, submissionId });
    return { ok: true, value: response?.data || {} };
  } catch (err) {
    const code = String(err?.code || '').toLowerCase();
    let message = err?.message || 'Failed to run SynthID check.';
    if (code.includes('not-found')) {
      message = 'The manual SynthID check function is not deployed yet. Deploy Firebase functions and try again.';
    } else if (code.includes('unauthenticated')) {
      message = 'You must be signed in as staff to run a SynthID check.';
    } else if (code.includes('permission-denied')) {
      message = 'Your current staff role is not allowed to run a SynthID check.';
    } else if (code.includes('internal') && /internal/i.test(message)) {
      message = 'The manual SynthID check failed on the server. Deploy the latest Firebase functions, then try again.';
    }
    return { ok: false, error: message };
  }
}

export async function saveSubmissionAIDraft(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta();
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const mappedEltDraft = payload?.eltAssessment ? adaptEltAssessmentToAiDraft(payload.eltAssessment, null) : null;
    const sourceDraft = payload?.aiDraft || mappedEltDraft || {};
    const cleanDraft = {
      overallMark: sourceDraft?.overallMark == null || Number.isNaN(Number(sourceDraft.overallMark)) ? null : Number(sourceDraft.overallMark),
      confidenceNote: _cleanText(sourceDraft?.confidenceNote, 1200),
      evidenceBasis: _cleanText(sourceDraft?.evidenceBasis, 1200),
      criterionRows: _cleanRubricRows(sourceDraft?.criterionRows || sourceDraft?.rubricRows || []),
      feedback: _cleanFeedbackSections(sourceDraft?.feedback || {}),
      actionItems: _cleanActionItems(sourceDraft?.actionItems || []),
      integrity: _cleanIntegrity(sourceDraft?.integrity || payload?.integrity || {}),
      qualityChecks: _cleanQualityChecks(sourceDraft?.qualityChecks),
      generatedAt: now,
      generatedByUid: meta.uid,
      generatedByName: meta.name,
    };

    const nextStatus = GRADING_STATUS.AI_READY;
    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      assessmentId,
      studentUid,
      submissionId,
      tutorialGroup: _cleanText(payload.tutorialGroup, 20),
      assignmentSource: _cleanText(payload.assignmentSource, 80),
      assignedMarkerUid: _cleanText(payload.assignedMarkerUid, 120),
      assignedMarkerName: _cleanText(payload.assignedMarkerName, 160),
      assignedMarkerRole: _cleanText(payload.assignedMarkerRole, 40),
      evidenceNotes: _cleanText(payload.evidenceNotes, 4000),
      eltAssessment: _cloneJsonSafe(payload.eltAssessment),
      eltAssessmentText: _cleanText(payload.eltAssessmentText, 24000),
      eltAssessmentMeta: payload?.eltAssessmentMeta && typeof payload.eltAssessmentMeta === 'object'
        ? {
          ...payload.eltAssessmentMeta,
          generatedAt: _cleanText(payload?.eltAssessmentMeta?.generatedAt || now, 80),
          generatedByUid: _cleanText(payload?.eltAssessmentMeta?.generatedByUid || meta.uid, 120),
          generatedByName: _cleanText(payload?.eltAssessmentMeta?.generatedByName || meta.name, 160),
          model: _cleanText(payload?.eltAssessmentMeta?.model, 80),
          provider: _cleanText(payload?.eltAssessmentMeta?.provider, 80),
          schemaVersion: _cleanText(payload?.eltAssessmentMeta?.schemaVersion, 80),
          sourceTextLength: payload?.eltAssessmentMeta?.sourceTextLength == null || Number.isNaN(Number(payload.eltAssessmentMeta.sourceTextLength)) ? 0 : Number(payload.eltAssessmentMeta.sourceTextLength),
          truncated: Boolean(payload?.eltAssessmentMeta?.truncated),
        }
        : null,
      integrity: _cleanIntegrity(payload.integrity || cleanDraft.integrity),
      aiDraft: cleanDraft,
      aiGeneratedAt: now,
      aiGeneratedByUid: meta.uid,
      aiGeneratedByName: meta.name,
      status: nextStatus,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'ai_draft_saved',
        fromStatus: existing?.status || '',
        toStatus: nextStatus,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: cleanDraft?.qualityChecks?.passed === false
          ? `AI draft withheld: ${(cleanDraft.qualityChecks.issueLabels || []).join('; ') || 'quality checks failed'}`
          : (payload?.integrity?.suspicionScore != null ? `Integrity score: ${payload.integrity.suspicionScore}` : ''),
      }),
      updatedAt: now,
    });
    return { ok: true, value: cleanDraft };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save AI grading draft.' };
  }
}

export async function saveTutorGradingReview(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('tutor');
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const summary = buildStudentFacingFeedbackSummary(payload.tutorReview || {});
    const moderationRequired = Boolean(payload.moderationRequired);
    const moderationReasons = payload.moderationReasons && typeof payload.moderationReasons === 'object'
      ? payload.moderationReasons
      : {};
    const requiresIntegrityReview = Boolean(moderationReasons.integrityFlag);
    const nextStatus = moderationRequired
      ? (requiresIntegrityReview ? GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED : GRADING_STATUS.MODERATION_REQUIRED)
      : GRADING_STATUS.FINALISED;
    const annotationsPayload = (payload.markerAnnotations || payload.submissionText)
      ? { annotations: payload.markerAnnotations || [], submissionText: payload.submissionText || '' }
      : null;
    const postingDraft = _cleanPostingDraft({
      ...summary,
      annotations: annotationsPayload?.annotations || [],
      submissionText: annotationsPayload?.submissionText || '',
      preparedAt: now,
      preparedByUid: meta.uid,
      preparedByName: meta.name,
      preparedByRole: meta.role,
    });

    const baseUpdate = {
      assessmentId,
      studentUid,
      submissionId,
      tutorialGroup: _cleanText(payload.tutorialGroup, 20),
      assignmentSource: _cleanText(payload.assignmentSource, 80),
      assignedMarkerUid: _cleanText(payload.assignedMarkerUid, 120) || meta.uid || '',
      assignedMarkerName: _cleanText(payload.assignedMarkerName, 160) || meta.name,
      assignedMarkerRole: _cleanText(payload.assignedMarkerRole, 40) || 'tutor',
      integrity: _cleanIntegrity(payload.integrity || {}),
      tutorReview: {
        mark: summary.mark,
        sections: summary.sections,
        actionItems: summary.actionItems,
        rubricRows: summary.rubricRows,
        comment: summary.comment,
        reviewerUid: meta.uid,
        reviewerName: meta.name,
        reviewerRole: meta.role,
        reviewedAt: now,
      },
      moderationRequired,
      moderationReasons,
      tutorReviewedAt: now,
      tutorReviewedByUid: meta.uid,
      tutorReviewedByName: meta.name,
      postingDraft,
      updatedAt: now,
      status: nextStatus,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: moderationRequired ? 'tutor_forwarded' : 'tutor_finalised',
        fromStatus: existing?.status || '',
        toStatus: nextStatus,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: requiresIntegrityReview
          ? 'Integrity review required before release.'
          : (moderationRequired ? 'Forwarded to lecturer moderation.' : 'Finalised without moderation.'),
      }),
    };

    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), baseUpdate);

    const queueRef = ref(db, `grading-moderation/${assessmentId}/queue/${submissionId}`);
    if (moderationRequired) {
      await set(queueRef, {
        assessmentId,
        studentUid,
        submissionId,
        tutorialGroup: _cleanText(payload.tutorialGroup, 20),
        assignedMarkerUid: baseUpdate.assignedMarkerUid,
        assignedMarkerName: baseUpdate.assignedMarkerName,
        assignedMarkerRole: baseUpdate.assignedMarkerRole,
        status: nextStatus,
        reasons: moderationReasons,
        mark: summary.mark,
        queuedAt: now,
        queuedByUid: meta.uid,
        queuedByName: meta.name,
      });
    } else {
      await remove(queueRef).catch(() => {});
    }

    return { ok: true, summary, moderationRequired };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save tutor grading review.' };
  }
}

export async function saveModerationDecision(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const summary = buildStudentFacingFeedbackSummary(payload.finalReview || payload.moderation || {});
    const release = payload.action === 'release';
    const integrity = _cleanIntegrity(payload.integrity || {});
    if (payload.integrityResolution) {
      integrity.staffResolution = _cleanText(payload.integrityResolution, 1200);
    }
    if (payload.integrityResolutionStatus) {
      integrity.staffResolutionStatus = _cleanText(payload.integrityResolutionStatus, 80);
    }

    const nextStatus = release ? GRADING_STATUS.FINALISED : GRADING_STATUS.MODERATED;
    const annotationsPayload = (payload.markerAnnotations || payload.submissionText)
      ? { annotations: payload.markerAnnotations || [], submissionText: payload.submissionText || '' }
      : null;
    const postingDraft = _cleanPostingDraft({
      ...summary,
      annotations: annotationsPayload?.annotations || [],
      submissionText: annotationsPayload?.submissionText || '',
      preparedAt: now,
      preparedByUid: meta.uid,
      preparedByName: meta.name,
      preparedByRole: meta.role,
    });
    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      integrity,
      moderation: {
        mark: summary.mark,
        sections: summary.sections,
        actionItems: summary.actionItems,
        rubricRows: summary.rubricRows,
        comment: summary.comment,
        moderatorUid: meta.uid,
        moderatorName: meta.name,
        moderatorRole: meta.role,
        moderatedAt: now,
        integrityResolution: _cleanText(payload.integrityResolution, 1200),
        integrityResolutionStatus: _cleanText(payload.integrityResolutionStatus, 80),
      },
      moderationRequired: false,
      moderatedAt: now,
      moderatedByUid: meta.uid,
      moderatedByName: meta.name,
      postingDraft,
      updatedAt: now,
      status: nextStatus,
      finalisedAt: release ? now : null,
      finalisedByUid: release ? meta.uid : null,
      finalisedByName: release ? meta.name : null,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: release ? 'moderation_released' : 'moderation_saved',
        fromStatus: existing?.status || '',
        toStatus: nextStatus,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: release ? 'Script finalised for posting to the student.' : 'Moderation draft saved.',
      }),
    });

    const queueRef = ref(db, `grading-moderation/${assessmentId}/queue/${submissionId}`);
    if (release) {
      await remove(queueRef).catch(() => {});
    } else {
      await update(queueRef, {
        status: GRADING_STATUS.MODERATED,
        moderatedAt: now,
        moderatedByUid: meta.uid,
        moderatedByName: meta.name,
        integrityResolution: _cleanText(payload.integrityResolution, 1200),
        integrityResolutionStatus: _cleanText(payload.integrityResolutionStatus, 80),
      });
    }

    return { ok: true, summary, released: release };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save moderation decision.' };
  }
}

export async function postFinalisedSubmissionFeedback(assessmentId, studentUid, submissionId) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const status = _cleanText(existing?.status, 80);
    if (status === GRADING_STATUS.POSTED) {
      return {
        ok: false,
        error: `This submission was already posted${existing?.postedAt ? ` on ${existing.postedAt}` : ''}.`,
      };
    }
    if (status !== GRADING_STATUS.FINALISED) {
      return { ok: false, error: 'Only finalised submissions can be posted to students.' };
    }
    const sourceDraft = existing?.postingDraft && typeof existing.postingDraft === 'object'
      ? existing.postingDraft
      : buildStudentFacingFeedbackSummary(existing?.moderation || existing?.tutorReview || {});
    const postingDraft = _cleanPostingDraft(sourceDraft);
    const summary = buildStudentFacingFeedbackSummary({
      mark: postingDraft.mark,
      comment: postingDraft.comment,
      sections: postingDraft.sections,
      actionItems: postingDraft.actionItems,
      rubricRows: postingDraft.rubricRows,
    });
    const annotationsPayload = postingDraft.annotations?.length || postingDraft.submissionText
      ? { annotations: postingDraft.annotations || [], submissionText: postingDraft.submissionText || '' }
      : null;
    await _writeReleasedSubmissionFeedback(assessmentId, studentUid, submissionId, summary, meta, 'posted', annotationsPayload);
    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      status: GRADING_STATUS.POSTED,
      postedAt: now,
      postedByUid: meta.uid,
      postedByName: meta.name,
      updatedAt: now,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'posted_to_student',
        fromStatus: existing?.status || '',
        toStatus: GRADING_STATUS.POSTED,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: 'Final feedback was posted to the student.',
      }),
    });
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to post final feedback.' };
  }
}

export async function retractReleasedSubmissionFeedback(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const status = _cleanText(existing?.status, 80);
    if (status !== GRADING_STATUS.POSTED) {
      return { ok: false, error: 'Only released submissions can be withdrawn from the student view.' };
    }

    const note = _cleanText(payload.reason, 1200);

    await update(ref(db, `submissions/${assessmentId}/${studentUid}/${submissionId}`), {
      feedback: null,
      status: 'submitted',
      postedAt: null,
      postedByUid: null,
      postedByName: null,
      feedbackRetractedAt: now,
      feedbackRetractedByUid: meta.uid,
      feedbackRetractedByName: meta.name,
      updatedAt: now,
    });

    const moderationReasons = existing?.moderationReasons && typeof existing.moderationReasons === 'object'
      ? { ...existing.moderationReasons, releaseRetracted: true }
      : { releaseRetracted: true };

    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      status: GRADING_STATUS.MODERATED,
      moderationRequired: true,
      moderationReasons,
      releaseRetractedAt: now,
      releaseRetractedByUid: meta.uid,
      releaseRetractedByName: meta.name,
      releaseRetractionReason: note,
      finalisedAt: null,
      finalisedByUid: null,
      finalisedByName: null,
      postedAt: null,
      postedByUid: null,
      postedByName: null,
      updatedAt: now,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'release_retracted',
        fromStatus: existing?.status || '',
        toStatus: GRADING_STATUS.MODERATED,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: note || 'Released feedback was withdrawn from the student view and returned to moderation.',
      }),
    });
    await update(ref(db, `grading-moderation/${assessmentId}/queue/${submissionId}`), {
      assessmentId,
      studentUid,
      submissionId,
      status: GRADING_STATUS.MODERATED,
      reasons: moderationReasons,
      releaseRetractedAt: now,
      queuedAt: now,
      queuedByUid: meta.uid,
      queuedByName: meta.name,
    }).catch(() => {});

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to withdraw released feedback.' };
  }
}

export async function returnSubmissionToTutor(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const note = _cleanText(payload.reason, 1200);
    if (!note) return { ok: false, error: 'Add a short reason before returning this submission to the tutor.' };

    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      moderationRequired: false,
      returnedToTutorAt: now,
      returnedToTutorByUid: meta.uid,
      returnedToTutorByName: meta.name,
      returnedToTutorReason: note,
      updatedAt: now,
      status: GRADING_STATUS.RETURNED_TO_TUTOR,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'returned_to_tutor',
        fromStatus: existing?.status || '',
        toStatus: GRADING_STATUS.RETURNED_TO_TUTOR,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note,
      }),
    });
    await remove(ref(db, `grading-moderation/${assessmentId}/queue/${submissionId}`)).catch(() => {});
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to return the submission to the tutor.' };
  }
}

// ── Audited mark changes ─────────────────────

function _resolvedRecordMark(record = {}) {
  const candidates = [
    record?.moderation?.mark,
    record?.tutorReview?.mark,
    record?.postingDraft?.mark,
    record?.aiDraft?.overallMark,
  ];
  for (const value of candidates) {
    if (value != null && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

// Single-step, fully audited mark change. Requires a written justification,
// keeps the posting draft in sync so a later release posts the new mark, and
// amends already-released feedback in place (no retract/re-release cycle).
export async function applyModeratedMarkChange(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const reason = _cleanText(payload.reason, 1200);
    if (!reason) return { ok: false, error: 'Add a short justification before changing this mark.' };
    const mark = Number(payload.mark);
    if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
      return { ok: false, error: 'Enter a mark between 0 and 100.' };
    }

    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    const previousMark = _resolvedRecordMark(existing);
    const wasPosted = _cleanText(existing?.status, 80) === GRADING_STATUS.POSTED;

    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      'moderation/mark': mark,
      'moderation/moderatorUid': meta.uid,
      'moderation/moderatorName': meta.name,
      'moderation/moderatorRole': meta.role,
      'moderation/moderatedAt': now,
      'moderation/markChangeReason': reason,
      'moderation/source': _cleanText(payload.source, 80) || 'mark-change',
      'postingDraft/mark': mark,
      moderatedAt: now,
      moderatedByUid: meta.uid,
      moderatedByName: meta.name,
      updatedAt: now,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'mark_changed',
        fromStatus: existing?.status || '',
        toStatus: existing?.status || GRADING_STATUS.MODERATED,
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: `Mark changed ${previousMark != null ? `from ${previousMark}% ` : ''}to ${mark}%. Reason: ${reason}`,
      }),
    });

    if (wasPosted) {
      await update(ref(db, `submissions/${assessmentId}/${studentUid}/${submissionId}/feedback`), {
        mark,
        amendedAt: now,
        amendedByUid: meta.uid,
        amendedByName: meta.name,
        amendmentReason: reason,
      });
    }

    return { ok: true, mark, previousMark, amendedReleasedFeedback: wasPosted };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to apply the mark change.' };
  }
}

// Records a moderator's written confirmation that a borderline fail (45–49)
// stands because the learning outcomes were genuinely not met. Does not
// change the mark — it makes the fail defensible on the record.
export async function recordBorderlineFailConfirmation(assessmentId, studentUid, submissionId, payload = {}) {
  try {
    const meta = _reviewerMeta('lecturer');
    const now = _nowIso();
    const reason = _cleanText(payload.reason, 1200);
    if (!reason) {
      return { ok: false, error: 'Explain which learning outcomes were not met before confirming this fail.' };
    }
    const existing = await _getExistingGradingRecord(assessmentId, studentUid, submissionId);
    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}`), {
      'moderation/borderlineFailConfirmedAt': now,
      'moderation/borderlineFailConfirmedByUid': meta.uid,
      'moderation/borderlineFailConfirmedByName': meta.name,
      'moderation/borderlineFailJustification': reason,
      updatedAt: now,
      workflowHistory: _workflowHistoryWithEvent(existing, {
        at: now,
        action: 'borderline_fail_confirmed',
        fromStatus: existing?.status || '',
        toStatus: existing?.status || '',
        byUid: meta.uid,
        byName: meta.name,
        byRole: meta.role,
        note: `Borderline fail confirmed after review. Justification: ${reason}`,
      }),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to record the fail confirmation.' };
  }
}

// ── Marker Annotations ───────────────────────

export async function saveMarkerAnnotation(assessmentId, studentUid, submissionId, annotation) {
  try {
    const annotRef = push(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}/markerAnnotations`));
    const anchor = annotation?.anchor && typeof annotation.anchor === 'object'
      ? {
          mode: _cleanText(annotation.anchor.mode || '', 40),
          fileIndex: Number.isFinite(Number(annotation.anchor.fileIndex)) ? Number(annotation.anchor.fileIndex) : null,
          fileName: _cleanText(annotation.anchor.fileName || '', 240),
          previewKind: _cleanText(annotation.anchor.previewKind || '', 40),
        }
      : null;
    const payload = {
      id: annotRef.key,
      quote: _cleanText(annotation.quote || '', 1000),
      comment: _cleanText(annotation.comment || '', 1000),
      markerUid: _cleanText(annotation.markerUid || '', 120),
      markerName: _cleanText(annotation.markerName || '', 160),
      markerRole: _cleanText(annotation.markerRole || '', 40),
      savedAt: _nowIso(),
      includeInDraft: false,
      ...(anchor ? { anchor } : {}),
    };
    await set(annotRef, payload);
    return { ok: true, annotationId: annotRef.key, annotation: payload };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save annotation.' };
  }
}

export async function deleteMarkerAnnotation(assessmentId, studentUid, submissionId, annotationId) {
  if (!annotationId) return { ok: false, error: 'No annotation id.' };
  try {
    await remove(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}/markerAnnotations/${annotationId}`));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to delete annotation.' };
  }
}

export async function updateAnnotationDraftInclusion(assessmentId, studentUid, submissionId, annotationId, include) {
  if (!annotationId) return { ok: false, error: 'No annotation id.' };
  try {
    await update(ref(db, `grading-records/${assessmentId}/${studentUid}/${submissionId}/markerAnnotations/${annotationId}`), {
      includeInDraft: Boolean(include),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to update annotation.' };
  }
}

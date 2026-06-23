// src/components/submission-reviewer.js
import { db, functions } from '../firebase.js';
import { get, ref } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import {
  clearErroneousSubmission,
  deleteMarkerAnnotation,
  getAllSubmissions,
  getGradingAssignments,
  getGradingRecords,
  grantLateSubmissionException,
  GRADE_BOUNDARIES,
  GRADING_STATUS,
  postFinalisedSubmissionFeedback,
  retractReleasedSubmissionFeedback,
  saveGradingAssignments,
  saveModerationDecision,
  saveMarkerAnnotation,
  runSubmissionSynthIdCheck,
  saveSubmissionAIDraft,
  saveTutorGradingReview,
  returnSubmissionToTutor,
  updateAnnotationDraftInclusion,
} from '../submissions.js';
import { renderGradingInterface } from './grading-interface.js';
import {
  clearAssessmentSettingsOverride,
  getCachedAssessmentSettingsOverride,
  getMergedAssessmentConfig,
  loadAssessmentSettingsOverrides,
  saveAssessmentSettingsOverride,
} from '../assessment-settings.js';
import { STATE } from '../state.js';
import { _aiChat, AI_CHAT_CONFIGURED } from '../ai.js';
import {
  describeExtractionBundle,
  extractSubmissionBundle,
  formatExtractionDiagnostics,
  formatExtractionBundleForPrompt,
  loadSubmissionFilePreview,
} from '../document-text.js';
import {
  adaptEltAssessmentToAiDraft,
  buildEltAssessmentMeta,
  buildEltRubric,
  buildEltStudentText,
  detectEltInsufficientEvidence,
  getEltCourseObjectives,
} from '../elt-assessment.js';
import * as assessments from '../../content/assessments/index.js';

function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _jsArg(v = '') {
  return JSON.stringify(String(v ?? '')).replace(/</g, '\\u003c');
}

function _lateStatusSelector(uid = '') {
  const safeUid = String(uid || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `[data-late-status-for="${safeUid}"]`;
}

function _setLateExceptionStatus(uid, text, color = '') {
  document.querySelectorAll(_lateStatusSelector(uid)).forEach((node) => {
    node.textContent = text;
    if (color) node.style.color = color;
  });
}

function _setBulkLateExceptionStatus(text, color = '') {
  document.querySelectorAll('[data-bulk-late-status]').forEach((node) => {
    node.textContent = text;
    if (color) node.style.color = color;
  });
}

function _setManualLateExceptionStatus(text, color = '') {
  document.querySelectorAll('[data-manual-late-status]').forEach((node) => {
    node.textContent = text;
    if (color) node.style.color = color;
  });
}

function _setBulkAiStatus(text, color = '') {
  document.querySelectorAll('[data-bulk-ai-status]').forEach((node) => {
    node.textContent = text;
    if (color) node.style.color = color;
  });
}

function _autoAiKey(assessmentId, studentUid, submissionId) {
  return `${assessmentId || ''}:${studentUid || ''}:${submissionId || ''}`;
}

function _autoAiState(assessmentId, studentUid, submissionId) {
  return _autoAiDraftState[_autoAiKey(assessmentId, studentUid, submissionId)] || null;
}

function _setAutoAiState(assessmentId, studentUid, submissionId, patch = {}) {
  const key = _autoAiKey(assessmentId, studentUid, submissionId);
  _autoAiDraftState[key] = {
    running: false,
    text: '',
    color: 'var(--muted)',
    ...(_autoAiDraftState[key] || {}),
    ...patch,
  };
  const el = document.getElementById(`auto-ai-status-${submissionId}`);
  if (el) {
    el.textContent = _autoAiDraftState[key].text || '';
    el.style.color = _autoAiDraftState[key].color || 'var(--muted)';
  }
}

function _manualSynthIdKey(assessmentId, studentUid, submissionId) {
  return `${assessmentId || ''}:${studentUid || ''}:${submissionId || ''}`;
}

function _manualSynthIdState(assessmentId, studentUid, submissionId) {
  return _markingWorkspaceSynthIdState[_manualSynthIdKey(assessmentId, studentUid, submissionId)] || null;
}

function _setManualSynthIdState(assessmentId, studentUid, submissionId, patch = {}) {
  const key = _manualSynthIdKey(assessmentId, studentUid, submissionId);
  _markingWorkspaceSynthIdState[key] = {
    running: false,
    text: '',
    color: 'var(--muted)',
    ...(_markingWorkspaceSynthIdState[key] || {}),
    ...patch,
  };
  const el = document.getElementById(`workspace-synthid-status-${submissionId}`);
  if (el) {
    el.textContent = _markingWorkspaceSynthIdState[key].text || '';
    el.style.color = _markingWorkspaceSynthIdState[key].color || 'var(--muted)';
  }
}

function _nl2br(v = '') {
  return _esc(v).replace(/\n/g, '<br>');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function _fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function _fileIcon(name = '') {
  const ext = String(name).split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
  return '📎';
}

function _currentRole() {
  if (_isTutorPreviewMode()) return 'tutor';
  return String(
    STATE.user?._resolvedRole
    || STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1]
    || STATE.user?.profile?.role
    || '',
  ).trim().toLowerCase();
}

function _tutorPreviewContext() {
  if (window._dashboardRolePreview !== 'tutor') return null;
  const preview = window._dashboardTutorPreview;
  if (!preview || typeof preview !== 'object') return null;
  if (!preview.uid && !preview.email && !preview.displayName) return null;
  return preview;
}

function _isTutorPreviewMode() {
  return Boolean(_tutorPreviewContext());
}

function _activeTutorUid() {
  return String(_tutorPreviewContext()?.uid || STATE.user?.uid || '').trim();
}

function _activeTutorName() {
  return String(
    _tutorPreviewContext()?.displayName
    || _tutorPreviewContext()?.email
    || _tutorPreviewContext()?.uid
    || STATE.user?.displayName
    || STATE.user?.email
    || STATE.user?.uid
    || '',
  ).replace(/\s*\[(tutor|lecturer|moderator)\]\s*/i, '').trim();
}

function _isLecturerRole() {
  return ['lecturer', 'moderator'].includes(_currentRole());
}

function _isTutorRole() {
  return _currentRole() === 'tutor';
}

function _cleanText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function _buildEltLimitedEvidenceContext(student = null, extractionBundle = {}) {
  const parts = [];
  const studentNote = _cleanText(student?.latest?.note || '', 3000);
  const files = Array.isArray(student?.latest?.files) ? student.latest.files : [];
  const extractionSummary = _cleanText(describeExtractionBundle(extractionBundle), 800);
  const extractionDiagnostics = _cleanText(formatExtractionDiagnostics(extractionBundle), 3000);

  if (studentNote) {
    parts.push(`[Student Submission Note]\n${studentNote}`);
  }
  if (files.length) {
    parts.push(`[Submission File Manifest]\n${files.map((file, idx) => (
      `${idx + 1}. ${file?.name || 'file'}${file?.size ? ` (${_fmtSize(file.size)})` : ''}`
    )).join('\n')}`);
  }
  if (extractionSummary) {
    parts.push(`[Automatic Extraction Status]\n${extractionSummary}`);
  }
  if (extractionDiagnostics) {
    parts.push(`[Per-File Extraction Diagnostics]\n${extractionDiagnostics}`);
  }

  return parts.join('\n\n').trim();
}

function _renderExtractionDiagnostics(submissionId, diagnostics = '', summary = '') {
  if (!diagnostics && !summary) return '';
  return `
    <div id="extraction-diagnostics-${submissionId}" style="margin-top:12px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;">
        <div style="font-size:12px;font-weight:800;color:var(--navy);">Extraction Diagnostics</div>
        ${summary ? `<div style="font-size:11px;color:var(--muted);">${_esc(summary)}</div>` : ''}
      </div>
      <div style="margin-top:8px;font-size:12px;color:#334155;line-height:1.7;white-space:pre-wrap;">${_esc(diagnostics || 'No extraction diagnostics available yet.')}</div>
    </div>
  `;
}

let _eltCallable = null;
let _autoGradeQueueCallable = null;

function _eltReviewCallable() {
  if (!_eltCallable) _eltCallable = httpsCallable(functions, 'generateEltAssessmentReview');
  return _eltCallable;
}

function _requestAssessmentAutoGradeRunCallable() {
  if (!_autoGradeQueueCallable) _autoGradeQueueCallable = httpsCallable(functions, 'requestAssessmentAutoGradeRun');
  return _autoGradeQueueCallable;
}

function _safeJsonParse(raw) {
  const text = String(raw || '').trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const sliced = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text;
  const normalized = sliced
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  const attempts = [normalized, _escapeJsonStringNewlines(normalized)];
  let lastErr = null;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Invalid JSON');
}

function _annotationId(submissionId, annotationIdx) {
  return `elt-annotation-${submissionId}-${annotationIdx}`;
}

function _annotationHitId(submissionId, annotationIdx, hitIdx) {
  return `elt-hit-${submissionId}-${annotationIdx}-${hitIdx}`;
}

function _escapeJsonStringNewlines(text = '') {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && ch === '\n') {
      out += '\\n';
      continue;
    }
    if (inString && ch === '\r') {
      out += '\\r';
      continue;
    }
    if (inString && ch === '\t') {
      out += '\\t';
      continue;
    }
    out += ch;
  }
  return out;
}

async function _repairMalformedJson(raw, parseErr) {
  const prompt = `Repair this malformed JSON and return valid JSON only.

Rules:
- Preserve the existing keys and intended values as closely as possible.
- Do not add markdown or commentary.
- Ensure all strings are properly escaped.

Malformed JSON:
${String(raw || '').slice(0, 12000)}

Original parse error:
${String(parseErr?.message || parseErr || '').slice(0, 500)}`;

  const fixed = await _aiChat(prompt, {
    maxTokens: 1800,
    system: 'You repair malformed JSON. Return valid JSON only.',
  });
  return _safeJsonParse(fixed);
}

function _draftContainsRepairArtifacts(payload = {}) {
  const text = _cleanText(JSON.stringify(payload || {}), 16000).toLowerCase();
  if (!text) return false;
  return [
    'original parse error',
    'malformed json',
    'unterminated string',
    'unexpected token',
    'return valid json only',
  ].some((pattern) => text.includes(pattern));
}

function _extractTagBlock(text = '', tag = '') {
  const match = String(text || '').match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function _extractTaggedList(text = '', tag = '') {
  const block = _extractTagBlock(text, tag);
  if (!block) return [];
  return block
    .split(/\n+/)
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
}

function _fallbackCriterionRows(cfg, prose = '') {
  return (Array.isArray(cfg?.rubric) ? cfg.rubric : []).map((row) => ({
    criterion: _cleanText(row?.criterion, 240),
    provisionalMark: null,
    maxMark: _criterionMax(row),
    rationale: _cleanText(prose, 800),
    evidenceRefs: [],
  }));
}

function _criterionNames(cfg = null) {
  return (Array.isArray(cfg?.rubric) ? cfg.rubric : [])
    .map((row) => _cleanText(row?.criterion, 120))
    .filter(Boolean)
    .slice(0, 4);
}

function _genericDraftPatterns() {
  return [
    /this provisional draft can confirm/i,
    /a strong submission .* should meet/i,
    /final feedback should explain how/i,
    /the marker should now review/i,
    /replace this provisional ai draft/i,
    /open the submitted files and verify performance/i,
  ];
}

function _looksGenericDraftText(value = '') {
  const text = _cleanText(value, 4000);
  return Boolean(text) && _genericDraftPatterns().some((pattern) => pattern.test(text));
}

function _draftQualityIssueLabel(code = '') {
  const map = {
    criterion_rationale_missing: 'Criterion rationale missing',
    criterion_rationale_generic: 'Criterion rationale too generic',
    feedback_generic: 'Feedback sections read as generic',
    fail_justification_missing: 'Fail mark lacks pass-threshold explanation',
    overall_mark_unsupported: 'Overall mark is not supported by criterion rows',
    evidence_basis_missing: 'Evidence basis is too thin',
  };
  return map[code] || code.replace(/_/g, ' ');
}

function _deriveOverallMarkFromCriteria(criterionRows = []) {
  const scoredRows = (Array.isArray(criterionRows) ? criterionRows : []).filter((row) => (
    row?.provisionalMark != null
    && !Number.isNaN(Number(row.provisionalMark))
    && Number(row?.maxMark) > 0
  ));
  if (!scoredRows.length) return null;
  const totals = scoredRows.reduce((acc, row) => ({
    earned: acc.earned + Number(row.provisionalMark || 0),
    possible: acc.possible + Number(row.maxMark || 0),
  }), { earned: 0, possible: 0 });
  if (!totals.possible) return null;
  return Math.round((totals.earned / totals.possible) * 100);
}

function _rankedCriterionRows(criterionRows = []) {
  return (Array.isArray(criterionRows) ? criterionRows : [])
    .filter((row) => row?.criterion && _cleanText(row?.rationale, 1400))
    .map((row) => {
      const provisionalMark = row?.provisionalMark == null || Number.isNaN(Number(row.provisionalMark))
        ? null
        : Number(row.provisionalMark);
      const maxMark = Number(row?.maxMark || 0) > 0 ? Number(row.maxMark) : 0;
      return {
        ...row,
        provisionalMark,
        maxMark,
        ratio: provisionalMark == null || !maxMark ? null : provisionalMark / maxMark,
      };
    });
}

function _resolvedOverallMark(draft = {}) {
  if (draft?.overallMark != null && !Number.isNaN(Number(draft.overallMark))) return Number(draft.overallMark);
  return _deriveOverallMarkFromCriteria(draft?.criterionRows || []);
}

function _isFailingOverallMark(mark) {
  return Number.isFinite(Number(mark)) && Number(mark) < 50;
}

function _isBorderlineFailMark(mark) {
  if (!Number.isFinite(Number(mark))) return false;
  const value = Number(mark);
  return value >= 45 && value < 50;
}

function _isVeryHighMark(mark) {
  return Number.isFinite(Number(mark)) && Number(mark) >= 75;
}

function _weakestCriterionRows(criterionRows = [], limit = 2) {
  return _rankedCriterionRows(criterionRows)
    .filter((row) => row.ratio != null)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}

function _strongestCriterionRows(criterionRows = [], limit = 2) {
  return _rankedCriterionRows(criterionRows)
    .filter((row) => row.ratio != null)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

function _criterionShortfallSummary(row = {}) {
  const criterion = _cleanText(row?.criterion, 200) || 'this criterion';
  const mark = row?.provisionalMark == null || Number(row?.maxMark) <= 0
    ? 'unscored'
    : `${row.provisionalMark}/${row.maxMark}`;
  const rationale = _cleanText(row?.rationale, 260);
  return `${criterion} (${mark})${rationale ? `: ${rationale}` : ''}`.trim();
}

function _criterionImprovementSummary(row = {}) {
  const criterion = _cleanText(row?.criterion, 200) || 'this criterion';
  const rationale = _cleanText(row?.rationale, 220);
  return `${criterion}${rationale ? `: ${rationale}` : ': provide stronger direct evidence against the rubric and tighten the argument.'}`.trim();
}

function _resolvedReviewMark(source = {}) {
  if (source?.mark != null && !Number.isNaN(Number(source.mark))) return Number(source.mark);
  if (source?.overallMark != null && !Number.isNaN(Number(source.overallMark))) return Number(source.overallMark);
  return null;
}

function _isBoundaryMark(mark) {
  if (!Number.isFinite(Number(mark))) return false;
  const value = Number(mark);
  return (value >= 48 && value <= 52) || (value >= 68 && value <= 72);
}

function _reviewHasWeakJustification(review = {}, cfg = null) {
  const rows = Array.isArray(review?.rubricRows) ? review.rubricRows : [];
  const scoredRows = rows.filter((row) => row?.provisionalMark != null && !Number.isNaN(Number(row.provisionalMark)));
  const missingRationale = scoredRows.some((row) => !_cleanText(row?.rationale, 1400));
  if (missingRationale) return true;
  const mark = Number.isFinite(Number(review?.mark)) ? Number(review.mark) : _deriveOverallMarkFromCriteria(rows);
  if (!_isFailingOverallMark(mark)) return false;
  const feedbackText = [
    review?.sections?.whereYouAreNow,
    review?.sections?.whereYouShouldBe,
    review?.sections?.relationToOutcomes,
    review?.sections?.whatToDoNext,
  ].map((value) => _cleanText(value, 2400).toLowerCase()).join(' ');
  return !/50|pass|below pass|below the 50% pass threshold/.test(feedbackText);
}

function _hasAiDraftFeedback(draft = {}) {
  const feedback = draft?.feedback || draft?.sections || {};
  const feedbackSections = [
    feedback?.whereYouAreNow,
    feedback?.whereYouShouldBe,
    feedback?.relationToOutcomes,
    feedback?.whatToDoNext,
  ].map((value) => _cleanText(value, 2400)).filter(Boolean);
  const actionItems = (Array.isArray(draft?.actionItems) ? draft.actionItems : [])
    .map((value) => _cleanText(value, 280))
    .filter(Boolean);
  const criterionRows = (Array.isArray(draft?.criterionRows) ? draft.criterionRows : [])
    .filter((row) => _cleanText(row?.criterion, 200) || _cleanText(row?.rationale, 400));
  return Boolean(feedbackSections.length || actionItems.length || criterionRows.length);
}

function _deriveAutoMarkingProgress(student, record = {}, workflowStatus = '') {
  const sub = student?.latest || null;
  if (!sub) {
    return {
      state: 'not_submitted',
      percent: 0,
      label: 'Not submitted',
      detail: 'No submission has been uploaded yet.',
      tone: 'idle',
      statusMeta: null,
    };
  }
  const queue = _queueStateForAssessment(sub.assessmentId);
  const queueState = String(queue?.state || '').trim().toLowerCase();
  const aiDraft = record?.aiDraft && typeof record.aiDraft === 'object' ? record.aiDraft : null;
  const aiDraftHeld = aiDraft?.qualityChecks?.passed === false;
  const aiMark = _resolvedReviewMark(aiDraft || {});
  const hasAiFeedback = _hasAiDraftFeedback(aiDraft || {});
  const hasTutorOrModeration = Boolean(record?.tutorReview || record?.moderation);
  const completedWorkflow = [
    GRADING_STATUS.MODERATION_REQUIRED,
    GRADING_STATUS.MODERATED,
    GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED,
    GRADING_STATUS.FINALISED,
    GRADING_STATUS.POSTED,
    GRADING_STATUS.RETURNED_TO_TUTOR,
  ].includes(workflowStatus);

  if (hasTutorOrModeration || completedWorkflow) {
    return {
      state: 'staff_review',
      percent: 100,
      label: 'AI step complete',
      detail: 'This submission already moved beyond the automatic first-read stage.',
      tone: 'done',
      statusMeta: null,
    };
  }
  if (aiDraft && Number.isFinite(Number(aiMark)) && hasAiFeedback && !aiDraftHeld) {
    return {
      state: 'ready',
      percent: 100,
      label: 'AI draft ready',
      detail: 'The automatic mark and draft feedback are ready for staff review.',
      tone: 'done',
      statusMeta: {
        label: 'AI Draft Ready',
        bg: '#eef2ff',
        fg: '#4338ca',
        border: '#c7d2fe',
      },
    };
  }
  if (queueState === 'running') {
    return {
      state: 'processing',
      percent: aiDraftHeld ? 72 : 68,
      label: aiDraftHeld ? 'AI re-check in progress' : 'AI marking in progress',
      detail: aiDraftHeld
        ? 'A previous manual-review draft is being reprocessed in the background.'
        : 'The background queue is processing this assessment now.',
      tone: 'active',
      statusMeta: {
        label: 'AI In Progress',
        bg: '#eff6ff',
        fg: '#1d4ed8',
        border: '#bfdbfe',
      },
    };
  }
  if (queueState === 'queued') {
    return {
      state: 'queued',
      percent: aiDraftHeld ? 48 : 42,
      label: aiDraftHeld ? 'Queued for AI re-check' : 'Queued for AI marking',
      detail: aiDraftHeld
        ? 'A previous manual-review draft is queued to be reprocessed automatically.'
        : 'This submission is waiting in the background AI queue.',
      tone: 'active',
      statusMeta: {
        label: 'AI Queued',
        bg: '#eff6ff',
        fg: '#1d4ed8',
        border: '#bfdbfe',
      },
    };
  }
  if (aiDraft && (hasAiFeedback || aiDraftHeld)) {
    return {
      state: 'manual_review',
      percent: 82,
      label: 'Manual-review draft saved',
      detail: 'AI saved a partial first read, but not a defended automatic mark yet.',
      tone: 'warning',
      statusMeta: {
        label: 'Manual Review Draft',
        bg: '#fff7ed',
        fg: '#9a3412',
        border: '#fdba74',
      },
    };
  }
  if (workflowStatus === GRADING_STATUS.AI_FAILED) {
    return {
      state: 'retry',
      percent: 24,
      label: 'Awaiting AI retry',
      detail: 'The last automatic attempt did not finish with a usable draft yet.',
      tone: 'warning',
      statusMeta: {
        label: 'Awaiting AI Retry',
        bg: '#fff7ed',
        fg: '#9a3412',
        border: '#fdba74',
      },
    };
  }
  return {
    state: 'submitted',
    percent: 18,
    label: 'Submitted',
    detail: 'The submission is stored and waiting for the AI pipeline to pick it up.',
    tone: 'idle',
    statusMeta: {
      label: 'Submitted',
      bg: '#f8fafc',
      fg: '#475569',
      border: '#cbd5e1',
    },
  };
}

function _queueFlagsForStudent(student, sampledByMarker) {
  const sub = student?.latest || null;
  if (!sub) {
    return {
      status: 'not_submitted',
      activeMark: null,
      aiMark: null,
      tutorMark: null,
      moderationMark: null,
      moderationOpen: false,
      readyToPost: false,
      posted: false,
      integrityFlag: false,
      boundary: false,
      divergence: false,
      returned: false,
      weakJustification: false,
      belowPass: false,
      borderlineFail: false,
      highMark: false,
      aiProgress: _deriveAutoMarkingProgress(student, {}, 'not_submitted'),
      priority: 0,
    };
  }
  const assignment = _resolveAssignment(student.uid, sub.id, student.group);
  const record = _gradingRecords?.[student.uid]?.[sub.id] || {};
  const status = _workflowStatus(record, assignment);
  const cfg = _getEffectiveAssessmentConfig(sub.assessmentId);
  const aiMark = _resolvedReviewMark(record?.aiDraft || {});
  const tutorMark = _resolvedReviewMark(record?.tutorReview || {});
  const moderationMark = _resolvedReviewMark(record?.moderation || {});
  const activeMark = moderationMark ?? tutorMark ?? aiMark;
  const integrity = record?.integrity || record?.aiDraft?.integrity || {};
  const moderationOpen = status === GRADING_STATUS.MODERATION_REQUIRED
    || status === GRADING_STATUS.MODERATED
    || status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED;
  const readyToPost = status === GRADING_STATUS.FINALISED;
  const posted = status === GRADING_STATUS.POSTED;
  const integrityFlag = status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED
    || Boolean(record?.moderationReasons?.integrityFlag)
    || Number(integrity?.suspicionScore || 0) >= 60;
  const boundary = _isBoundaryMark(activeMark);
  const divergence = Number.isFinite(aiMark) && Number.isFinite(moderationMark ?? tutorMark)
    ? Math.abs(aiMark - (moderationMark ?? tutorMark)) >= 10
    : false;
  const returned = status === GRADING_STATUS.RETURNED_TO_TUTOR;
  const belowPass = Number.isFinite(Number(activeMark)) && Number(activeMark) < 50;
  const borderlineFail = _isBorderlineFailMark(activeMark);
  const highMark = _isVeryHighMark(activeMark);
  const reviewSource = _normalizeReviewSource(record?.moderation || record?.tutorReview || record?.aiDraft || {}, cfg);
  const weakJustification = _reviewHasWeakJustification(reviewSource, cfg) || record?.aiDraft?.qualityChecks?.passed === false;
  const aiProgress = _deriveAutoMarkingProgress(student, record, status);
  const priority = (moderationOpen ? 10 : 0)
    + (readyToPost ? 5 : 0)
    + (integrityFlag ? 7 : 0)
    + (returned ? 6 : 0)
    + (belowPass ? 5 : 0)
    + (borderlineFail ? 6 : 0)
    + (highMark ? 4 : 0)
    + (boundary ? 4 : 0)
    + (divergence ? 4 : 0)
    + (weakJustification ? 3 : 0)
    + (['processing', 'queued', 'retry'].includes(aiProgress.state) ? 2 : 0);
  return {
    status,
    activeMark,
    aiMark,
    tutorMark,
    moderationMark,
    moderationOpen,
    readyToPost,
    posted,
    integrityFlag,
    boundary,
    divergence,
    returned,
    weakJustification,
    belowPass,
    borderlineFail,
    highMark,
    aiProgress,
    priority,
  };
}

function _studentMatchesQueueFilter(student, flags, query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const assignment = student?.latest ? _resolveAssignment(student.uid, student.latest.id, student.group) : _resolveAssignment(student.uid, '', student.group);
  const baseText = [
    student?.name,
    student?.email,
    student?.studentNumber,
    student?.group,
    assignment?.markerName,
    flags?.status,
    flags?.aiProgress?.label,
    flags?.integrityFlag ? 'integrity' : '',
    flags?.boundary ? 'boundary borderline' : '',
    flags?.divergence ? 'divergence' : '',
    flags?.returned ? 'returned tutor' : '',
    flags?.weakJustification ? 'justification rationale' : '',
    flags?.belowPass ? 'fail below pass' : '',
    flags?.borderlineFail ? 'borderline fail near pass threshold' : '',
    flags?.highMark ? 'very high mark distinction high score' : '',
  ].join(' ').toLowerCase();
  if (normalizedQuery && !baseText.includes(normalizedQuery)) return false;
  switch (_staffQueueFilterMode) {
    case 'moderation':
      return Boolean(flags?.moderationOpen);
    case 'boundary':
      return Boolean(flags?.boundary);
    case 'divergence':
      return Boolean(flags?.divergence);
    case 'integrity':
      return Boolean(flags?.integrityFlag);
    case 'returned':
      return Boolean(flags?.returned);
    case 'weak-justification':
      return Boolean(flags?.weakJustification);
    case 'below-pass':
      return Boolean(flags?.belowPass);
    case 'borderline-fail':
      return Boolean(flags?.borderlineFail);
    case 'high-mark':
      return Boolean(flags?.highMark);
    case 'submitted':
      return Boolean(student?.latest);
    case 'ready-to-post':
      return Boolean(flags?.readyToPost);
    case 'posted':
      return Boolean(flags?.posted);
    default:
      return true;
  }
}

function _failJustificationText(draft = {}, cfg = null) {
  const overallMark = _resolvedOverallMark(draft);
  if (!_isFailingOverallMark(overallMark)) return '';
  const weakestRows = _weakestCriterionRows(draft?.criterionRows || [], 2);
  const criteriaText = weakestRows.length
    ? weakestRows.map((row) => _criterionShortfallSummary(row)).join(' ')
    : `the submission does not yet meet pass standard against ${_criterionNames(cfg).join(', ') || 'the rubric'}.`;
  return `The preliminary mark is below the 50% pass threshold because ${criteriaText}`;
}

function _draftHasSpecificFailJustification(draft = {}, cfg = null) {
  const overallMark = _resolvedOverallMark(draft);
  if (!_isFailingOverallMark(overallMark)) return true;
  const text = [
    draft?.confidenceNote,
    draft?.evidenceBasis,
    draft?.feedback?.whereYouAreNow,
    draft?.feedback?.whereYouShouldBe,
    draft?.feedback?.relationToOutcomes,
    draft?.feedback?.whatToDoNext,
  ].map((value) => _cleanText(value, 2400).toLowerCase()).join(' ');
  const weakestCriteria = _weakestCriterionRows(draft?.criterionRows || [], 2)
    .map((row) => _cleanText(row?.criterion, 120).toLowerCase())
    .filter(Boolean);
  const mentionsThreshold = /50|pass|below the 50% pass threshold|below pass/.test(text);
  const mentionsWeakness = weakestCriteria.some((criterion) => text.includes(criterion));
  return mentionsThreshold && mentionsWeakness;
}

function _draftQualityIssues(draft = {}, cfg = null) {
  const criterionRows = Array.isArray(draft?.criterionRows) ? draft.criterionRows : [];
  const scoredRows = criterionRows.filter((row) => row?.provisionalMark != null && !Number.isNaN(Number(row.provisionalMark)));
  const issues = [];
  if (scoredRows.some((row) => _cleanText(row?.rationale, 1400).length < 35)) issues.push('criterion_rationale_missing');
  else if (scoredRows.some((row) => _looksGenericDraftText(row?.rationale || ''))) issues.push('criterion_rationale_generic');
  const feedbackSections = [
    draft?.feedback?.whereYouAreNow,
    draft?.feedback?.whereYouShouldBe,
    draft?.feedback?.relationToOutcomes,
    draft?.feedback?.whatToDoNext,
  ].map((value) => _cleanText(value, 2400)).filter(Boolean);
  if (!feedbackSections.length || feedbackSections.filter((value) => value.length < 30 || _looksGenericDraftText(value)).length >= 2) {
    issues.push('feedback_generic');
  }
  const overallMark = _resolvedOverallMark(draft);
  const derivedMark = _deriveOverallMarkFromCriteria(criterionRows);
  if (Number.isFinite(Number(overallMark)) && Number.isFinite(Number(derivedMark)) && Math.abs(Number(overallMark) - Number(derivedMark)) > 8) {
    issues.push('overall_mark_unsupported');
  }
  if (_isFailingOverallMark(overallMark) && !_draftHasSpecificFailJustification(draft, cfg)) {
    issues.push('fail_justification_missing');
  }
  if (_cleanText(draft?.evidenceBasis, 1200).length < 24) {
    issues.push('evidence_basis_missing');
  }
  return Array.from(new Set(issues));
}

function _buildQualityFallbackDraft(draft = {}, cfg = null, issues = []) {
  const issueLabels = issues.map((code) => _draftQualityIssueLabel(code));
  const criterionRows = (Array.isArray(draft?.criterionRows) ? draft.criterionRows : _fallbackCriterionRows(cfg, 'Manual review required.'))
    .map((row) => ({
      criterion: _cleanText(row?.criterion, 240),
      provisionalMark: null,
      maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? null : Number(row.maxMark),
      rationale: `Automatic draft withheld. ${issueLabels.length ? `Reason: ${issueLabels.join('; ')}.` : 'Reason: the draft quality checks failed.'} Review the source document and mark manually.`,
      evidenceRefs: Array.isArray(row?.evidenceRefs) ? row.evidenceRefs : [],
    }))
    .filter((row) => row.criterion);
  const warning = `Automatic draft withheld because ${issueLabels.length ? issueLabels.join(', ').toLowerCase() : 'the draft quality checks failed'}. Manual review is required before any mark is accepted.`;
  return {
    overallMark: null,
    confidenceNote: warning,
    evidenceBasis: _cleanText(`${draft?.evidenceBasis || 'The initial AI draft did not provide a defensible mark.'} ${warning}`, 1200),
    criterionRows,
    feedback: {
      whereYouAreNow: warning,
      whereYouShouldBe: 'Open the student submission and rebuild the mark with criterion-specific evidence before sending it forward.',
      relationToOutcomes: `Do not rely on the withheld AI score. Re-apply ${_criterionNames(cfg).join(', ') || 'the rubric'} directly to the submission evidence.`,
      whatToDoNext: 'Review the original document, correct the weak or unsupported rationale, and enter a defended mark manually.',
    },
    actionItems: [
      'Open the original submission and verify the evidence against the rubric.',
      'Replace weak or generic criterion rationales with file-specific reasoning.',
      'Do not forward the script until the mark and feedback are fully defended.',
    ],
    integrity: {
      ...(draft?.integrity || {}),
      advisory: true,
    },
    qualityChecks: {
      passed: false,
      mode: 'manual_review_required',
      issues,
      issueLabels,
    },
  };
}

function _finalizeAiDraftForStaff(draft = {}, cfg = null) {
  if (draft?.qualityChecks?.mode === 'manual_review_required') {
    return {
      ...draft,
      qualityChecks: {
        passed: false,
        mode: 'manual_review_required',
        issues: Array.isArray(draft?.qualityChecks?.issues) ? draft.qualityChecks.issues : [],
        issueLabels: Array.isArray(draft?.qualityChecks?.issueLabels) ? draft.qualityChecks.issueLabels : [],
      },
    };
  }
  const issues = _draftQualityIssues(draft, cfg);
  if (issues.length) return _buildQualityFallbackDraft(draft, cfg, issues);
  return {
    ...draft,
    qualityChecks: {
      passed: true,
      mode: 'validated',
      issues: [],
      issueLabels: [],
    },
  };
}

function _criterionEvidenceSummary(row = {}, includeScore = true) {
  const criterion = _cleanText(row?.criterion, 200);
  const rationale = _cleanText(row?.rationale, 800);
  const evidenceRefs = Array.isArray(row?.evidenceRefs) ? row.evidenceRefs.map((item) => _cleanText(item, 120)).filter(Boolean).slice(0, 2) : [];
  const score = includeScore && row?.provisionalMark != null && Number(row?.maxMark) > 0
    ? ` (${row.provisionalMark}/${row.maxMark})`
    : '';
  const evidenceText = evidenceRefs.length ? ` Evidence noted in ${evidenceRefs.join(', ')}.` : '';
  return `${criterion}${score}: ${rationale}${evidenceText}`.trim();
}

function _criterionActionSummary(row = {}) {
  const criterion = _cleanText(row?.criterion, 200) || 'this criterion';
  const rationale = _cleanText(row?.rationale, 220);
  return `${criterion}: ${rationale || 'tighten the work against the rubric with direct evidence from the submission.'}`;
}

function _skillsList(cfg = null) {
  return (Array.isArray(cfg?.skills) ? cfg.skills : [])
    .map((item) => _cleanText(item, 80))
    .filter(Boolean)
    .slice(0, 5);
}

function _courseOutcomesList(cfg = null) {
  return (Array.isArray(cfg?.courseOutcomes) ? cfg.courseOutcomes : [])
    .map((item) => _cleanText(item, 220))
    .filter(Boolean)
    .slice(0, 6);
}

function _productHighlights(cfg = null) {
  return (Array.isArray(cfg?.products) ? cfg.products : [])
    .map((item) => _cleanText(item, 180))
    .filter(Boolean)
    .slice(0, 3);
}

function _fallbackFeedbackSections(cfg = null, draft = {}, criterionRows = []) {
  const criteria = _criterionNames(cfg);
  const criteriaText = criteria.length ? criteria.join(', ') : 'the assessment rubric';
  const confidenceNote = _cleanText(draft?.confidenceNote, 600);
  const courseOutcomes = _courseOutcomesList(cfg);
  const rankedRows = _rankedCriterionRows(criterionRows);
  const scoredRows = rankedRows.filter((row) => row.ratio != null);
  const strongestRows = _strongestCriterionRows(criterionRows, 2);
  const weakestRows = _weakestCriterionRows(criterionRows, 2);
  const unscoredRows = rankedRows.filter((row) => row.provisionalMark == null).slice(0, 2);
  const overallMark = _resolvedOverallMark({ ...draft, criterionRows });
  const failingMark = _isFailingOverallMark(overallMark);
  const failJustification = _failJustificationText({ ...draft, criterionRows }, cfg);
  const providedFeedback = {
    whereYouAreNow: _cleanText(draft?.feedback?.whereYouAreNow, 2400),
    whereYouShouldBe: _cleanText(draft?.feedback?.whereYouShouldBe, 2400),
    relationToOutcomes: _cleanText(draft?.feedback?.relationToOutcomes, 2400),
    whatToDoNext: _cleanText(draft?.feedback?.whatToDoNext, 2400),
  };
  const derivedFeedback = {
    whereYouAreNow: failingMark
      ? `${failJustification}${strongestRows.length ? ` The script shows some control in ${strongestRows.map((row) => row.criterion).join(', ')}, but that is not yet enough to offset the current shortfall.` : ''}`
      : strongestRows.length
      ? `Current performance is strongest in ${strongestRows.map((row) => _criterionEvidenceSummary(row)).join(' ')}`
      : (rankedRows.length
        ? rankedRows.slice(0, 2).map((row) => _criterionEvidenceSummary(row, false)).join(' ')
        : (confidenceNote || 'Readable evidence is still too thin for a defensible criterion-level summary.')),
    whereYouShouldBe: failingMark
      ? (weakestRows.length
        ? `To reach a pass, the submission needs stronger performance in ${weakestRows.map((row) => _criterionImprovementSummary(row)).join(' ')}`
        : `To reach a pass, the work must meet the expectations of ${criteriaText} with clearer evidence and defended judgment.`)
      : weakestRows.length
      ? `To move the mark upward, strengthen ${weakestRows.map((row) => _criterionActionSummary(row)).join(' ')}`
      : (unscoredRows.length
        ? `These criteria still need a defended judgment: ${unscoredRows.map((row) => row.criterion).join(', ')}.`
        : `The next review pass should tighten performance against ${criteriaText} with direct evidence from the submission.`),
    relationToOutcomes: failingMark
      ? (courseOutcomes.length
        ? `Because the script is currently below 50%, the evidence does not yet show secure achievement of ${courseOutcomes.join(' | ')}. The weakest alignment sits in ${weakestRows.map((row) => row.criterion).join(', ') || criteriaText}.`
        : `Because the script is currently below 50%, the evidence does not yet show secure achievement against ${criteriaText}.`)
      : courseOutcomes.length
      ? `This submission needs to show clearer alignment with ${courseOutcomes.join(' | ')}. The strongest rubric evidence currently sits in ${strongestRows.map((row) => row.criterion).join(', ') || criteriaText}, while the weaker areas remain ${weakestRows.map((row) => row.criterion).join(', ') || criteriaText}.`
      : `The submission is being judged against ${criteriaText}. The current draft should stay anchored to the actual file evidence rather than generic advice.`,
    whatToDoNext: failingMark
      ? (weakestRows.length
        ? weakestRows.map((row) => `Revise ${row.criterion} first, using direct evidence from the submitted work, because that criterion is currently preventing the script from reaching the 50% pass threshold.`).join(' ')
        : 'Re-open the script and strengthen the criteria that are still below pass standard before the mark is sent forward.')
      : weakestRows.length
      ? weakestRows.map((row) => `Revise ${row.criterion} using direct evidence from the submitted work and tighten the justification for ${row.provisionalMark}/${row.maxMark || 'the available'} marks.`).join(' ')
      : (unscoredRows.length
        ? `Inspect the original document in the workspace and make a defended mark decision for ${unscoredRows.map((row) => row.criterion).join(', ')} before sending the script forward.`
        : 'Open the original document in the workspace, verify the evidence against the rubric, and amend any section that still reads as generic.'),
  };

  const resolvedWhereNow = providedFeedback.whereYouAreNow && !_looksGenericDraftText(providedFeedback.whereYouAreNow)
    ? (failingMark && !_draftHasSpecificFailJustification({ ...draft, feedback: providedFeedback, criterionRows }, cfg)
      ? `${failJustification} ${providedFeedback.whereYouAreNow}`.trim()
      : providedFeedback.whereYouAreNow)
    : derivedFeedback.whereYouAreNow;
  const resolvedWhereShouldBe = providedFeedback.whereYouShouldBe && !_looksGenericDraftText(providedFeedback.whereYouShouldBe)
    ? (failingMark && !_draftHasSpecificFailJustification({ ...draft, feedback: providedFeedback, criterionRows }, cfg)
      ? `${derivedFeedback.whereYouShouldBe}`.trim()
      : providedFeedback.whereYouShouldBe)
    : derivedFeedback.whereYouShouldBe;
  const resolvedRelationToOutcomes = providedFeedback.relationToOutcomes && !_looksGenericDraftText(providedFeedback.relationToOutcomes)
    ? (failingMark && !_draftHasSpecificFailJustification({ ...draft, feedback: providedFeedback, criterionRows }, cfg)
      ? `${derivedFeedback.relationToOutcomes}`.trim()
      : providedFeedback.relationToOutcomes)
    : derivedFeedback.relationToOutcomes;
  const resolvedWhatNext = providedFeedback.whatToDoNext && !_looksGenericDraftText(providedFeedback.whatToDoNext)
    ? (failingMark && !_draftHasSpecificFailJustification({ ...draft, feedback: providedFeedback, criterionRows }, cfg)
      ? `${derivedFeedback.whatToDoNext}`.trim()
      : providedFeedback.whatToDoNext)
    : derivedFeedback.whatToDoNext;

  return {
    whereYouAreNow: resolvedWhereNow,
    whereYouShouldBe: resolvedWhereShouldBe,
    relationToOutcomes: resolvedRelationToOutcomes,
    whatToDoNext: resolvedWhatNext,
  };
}

function _fallbackActionItems(cfg = null, criterionRows = []) {
  const rankedRows = _rankedCriterionRows(criterionRows);
  const weakestRows = rankedRows.filter((row) => row.ratio != null).sort((a, b) => a.ratio - b.ratio).slice(0, 3);
  if (weakestRows.length) {
    return weakestRows.map((row) => `Improve ${row.criterion} by addressing this issue directly: ${_cleanText(row.rationale, 180) || 'support the mark with clearer evidence from the submission.'}`);
  }
  const criteria = _criterionNames(cfg);
  const firstCriterion = criteria[0] || rankedRows.find((row) => row?.criterion)?.criterion || 'the first rubric criterion';
  return [
    `Verify performance against ${firstCriterion} in the original submission file.`,
    'Tighten the feedback so each section points to actual submission evidence rather than generic guidance.',
    'Confirm the provisional mark and criterion rows before sending the script to the moderation queue.',
  ];
}

function _coerceDraftShape(draft = {}, cfg = null) {
  const criterionRows = Array.isArray(draft?.criterionRows) && draft.criterionRows.length
    ? draft.criterionRows.map((row, idx) => ({
        criterion: _cleanText(row?.criterion || cfg?.rubric?.[idx]?.criterion, 240),
        provisionalMark: row?.provisionalMark == null || Number.isNaN(Number(row.provisionalMark)) ? null : Number(row.provisionalMark),
        maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? _criterionMax(cfg?.rubric?.[idx] || {}) : Number(row.maxMark),
        rationale: _cleanText(row?.rationale, 1400),
        evidenceRefs: Array.isArray(row?.evidenceRefs) ? row.evidenceRefs.map((v) => _cleanText(v, 240)).filter(Boolean).slice(0, 4) : [],
      }))
    : _fallbackCriterionRows(cfg, draft?.confidenceNote || '');

  const feedback = _fallbackFeedbackSections(cfg, draft, criterionRows);

  const actionItems = (Array.isArray(draft?.actionItems) ? draft.actionItems : [])
    .map((item) => _cleanText(item, 280))
    .filter(Boolean)
    .slice(0, 5);
  const resolvedActionItems = actionItems.length ? actionItems : _fallbackActionItems(cfg, criterionRows);

  return {
    overallMark: draft?.overallMark == null || Number.isNaN(Number(draft.overallMark))
      ? _deriveOverallMarkFromCriteria(criterionRows)
      : Number(draft.overallMark),
    confidenceNote: _cleanText(draft?.confidenceNote, 1200),
    evidenceBasis: _cleanText(draft?.evidenceBasis, 1200),
    criterionRows,
    feedback,
    actionItems: resolvedActionItems,
    integrity: {
      advisory: draft?.integrity?.advisory !== false,
      suspicionScore: draft?.integrity?.suspicionScore == null || Number.isNaN(Number(draft.integrity.suspicionScore)) ? 0 : Number(draft.integrity.suspicionScore),
      confidenceBand: _cleanText(draft?.integrity?.confidenceBand, 80) || 'low',
      reasons: (Array.isArray(draft?.integrity?.reasons) ? draft.integrity.reasons : []).map((item) => _cleanText(item, 280)).filter(Boolean).slice(0, 6),
      requiredHumanFollowUp: _cleanText(draft?.integrity?.requiredHumanFollowUp, 1200),
      recommendedStaffAction: _cleanText(draft?.integrity?.recommendedStaffAction, 1200),
      synthId: _coerceSynthIdIntegrity(draft?.integrity?.synthId),
    },
    qualityChecks: draft?.qualityChecks && typeof draft.qualityChecks === 'object'
      ? {
          passed: draft.qualityChecks.passed !== false,
          mode: _cleanText(draft?.qualityChecks?.mode, 80) || 'validated',
          issues: (Array.isArray(draft?.qualityChecks?.issues) ? draft.qualityChecks.issues : []).map((item) => _cleanText(item, 80)).filter(Boolean).slice(0, 8),
          issueLabels: (Array.isArray(draft?.qualityChecks?.issueLabels) ? draft.qualityChecks.issueLabels : []).map((item) => _cleanText(item, 160)).filter(Boolean).slice(0, 8),
        }
      : null,
  };
}

async function _generateTaggedDraftFallback(cfg, contextPrompt = '') {
  const prompt = `Return the grading draft using ONLY these XML-style tags and no JSON:
<overall_mark>number or blank</overall_mark>
<confidence_note>text</confidence_note>
<where_now>text</where_now>
<where_should_be>text</where_should_be>
<outcomes_map>text</outcomes_map>
<what_next>text</what_next>
<action_items>
- item 1
- item 2
- item 3
</action_items>
<integrity_score>number</integrity_score>
<integrity_confidence>low|medium|high</integrity_confidence>
<integrity_reasons>
- reason 1
</integrity_reasons>
<integrity_follow_up>text</integrity_follow_up>
<integrity_staff_action>text</integrity_staff_action>

Do not use quotation marks unless necessary.
${contextPrompt}`;

  const raw = await _aiChat(prompt, {
    maxTokens: 1400,
    system: 'You are a rigorous university marker. Return only the requested tags.',
  });

  return _coerceDraftShape({
    overallMark: _extractTagBlock(raw, 'overall_mark'),
    confidenceNote: _extractTagBlock(raw, 'confidence_note'),
    feedback: {
      whereYouAreNow: _extractTagBlock(raw, 'where_now'),
      whereYouShouldBe: _extractTagBlock(raw, 'where_should_be'),
      relationToOutcomes: _extractTagBlock(raw, 'outcomes_map'),
      whatToDoNext: _extractTagBlock(raw, 'what_next'),
    },
    actionItems: _extractTaggedList(raw, 'action_items'),
    integrity: {
      suspicionScore: _extractTagBlock(raw, 'integrity_score'),
      confidenceBand: _extractTagBlock(raw, 'integrity_confidence'),
      reasons: _extractTaggedList(raw, 'integrity_reasons'),
      requiredHumanFollowUp: _extractTagBlock(raw, 'integrity_follow_up'),
      recommendedStaffAction: _extractTagBlock(raw, 'integrity_staff_action'),
    },
  }, cfg);
}

function _buildEvidenceLimitedAiDraft(cfg = null, extractionBundle = {}, evidenceNotes = '') {
  const warning = _cleanText(
    `${describeExtractionBundle(extractionBundle)}${evidenceNotes ? ' Staff evidence notes were supplied, but they were not enough for a defensible automated grade.' : ''} Manual review is required before any mark is approved.`,
    1200,
  ) || 'Automatic extraction did not recover enough readable evidence for a defensible automated grade. Manual review is required.';
  return _coerceDraftShape({
    overallMark: null,
    confidenceNote: warning,
    evidenceBasis: _cleanText(`${describeExtractionBundle(extractionBundle)}${evidenceNotes ? ' Staff evidence notes were supplied.' : ''} The draft has been left unscored because the readable evidence is insufficient for a defensible automated mark.`, 1200),
    criterionRows: _fallbackCriterionRows(cfg, warning),
    feedback: {
      whereYouAreNow: warning,
      whereYouShouldBe: 'Readable submission evidence is required before criterion-level grading can be defended.',
      relationToOutcomes: 'Open the original document in the in-app viewer and apply the rubric manually if the extraction remains incomplete.',
      whatToDoNext: 'Inspect the source file, run the extraction diagnostics, and complete the mark manually rather than accepting an ungrounded AI score.',
    },
    actionItems: [
      'Open the original submission in the in-app viewer.',
      'Run the extraction diagnostics and verify whether readable text can be recovered.',
      'Complete or amend the review manually before the submission is sent forward.',
    ],
    integrity: {
      advisory: true,
      suspicionScore: 0,
      confidenceBand: 'low',
      reasons: [],
      requiredHumanFollowUp: '',
      recommendedStaffAction: '',
    },
    qualityChecks: {
      passed: false,
      mode: 'manual_review_required',
      issues: ['evidence_basis_missing'],
      issueLabels: ['Readable evidence is insufficient for an automatic mark'],
    },
  }, cfg);
}

function _coerceSynthIdIntegrity(payload = null) {
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

function _escapeHtmlPreserveNewlines(value = '') {
  return _esc(value).replace(/\n/g, '<br>');
}

function _findAllQuoteMatches(text = '', quote = '', caseInsensitive = false) {
  const source = String(text || '');
  const target = String(quote || '');
  if (!source || !target) return [];
  const haystack = caseInsensitive ? source.toLowerCase() : source;
  const needle = caseInsensitive ? target.toLowerCase() : target;
  const matches = [];
  let start = 0;
  while (start < haystack.length) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + target.length });
    start = idx + Math.max(target.length, 1);
  }
  return matches;
}

function _buildEltAnnotationModel(submissionId, text = '', annotations = []) {
  const normalizedText = String(text || '');
  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  const candidateHits = [];
  const annotationMap = safeAnnotations.map((annotation, idx) => {
    const quote = String(annotation?.exact_quote || '');
    const exactHits = _findAllQuoteMatches(normalizedText, quote, false);
    const fallbackHits = exactHits.length ? [] : _findAllQuoteMatches(normalizedText, quote, true);
    const matches = exactHits.length ? exactHits : fallbackHits;
    matches.forEach((hit, hitIdx) => {
      candidateHits.push({
        annotationIdx: idx,
        start: hit.start,
        end: hit.end,
        length: hit.end - hit.start,
        hitId: _annotationHitId(submissionId, idx, hitIdx),
      });
    });
    return {
      annotation,
      idx,
      matched: matches.length > 0,
      firstHitId: null,
      visibleHitCount: 0,
    };
  });

  const selected = [];
  candidateHits
    .sort((a, b) => (b.length - a.length) || (a.start - b.start) || (a.annotationIdx - b.annotationIdx))
    .forEach((hit) => {
      const overlaps = selected.some((chosen) => hit.start < chosen.end && hit.end > chosen.start);
      if (!overlaps) selected.push(hit);
    });

  selected.sort((a, b) => a.start - b.start);
  selected.forEach((hit) => {
    const entry = annotationMap[hit.annotationIdx];
    if (!entry.firstHitId) entry.firstHitId = hit.hitId;
    entry.visibleHitCount += 1;
  });

  let cursor = 0;
  const html = [];
  selected.forEach((hit) => {
    if (hit.start > cursor) html.push(_escapeHtmlPreserveNewlines(normalizedText.slice(cursor, hit.start)));
    const annotation = annotationMap[hit.annotationIdx]?.annotation || {};
    const title = _cleanText(`${annotation.feedback_type || 'annotation'}: ${annotation.comment || ''}`, 800);
    html.push(
      `<mark id="${hit.hitId}" onclick="window._focusEltAnnotation('${_esc(submissionId)}', ${hit.annotationIdx})" title="${_esc(title)}" style="background:#fef3c7;color:#92400e;padding:0 2px;border-radius:3px;cursor:pointer;">${_escapeHtmlPreserveNewlines(normalizedText.slice(hit.start, hit.end))}</mark>`
    );
    cursor = hit.end;
  });
  if (cursor < normalizedText.length) html.push(_escapeHtmlPreserveNewlines(normalizedText.slice(cursor)));

  return {
    html: html.join(''),
    annotations: annotationMap,
    unmatched: annotationMap.filter((item) => !item.matched),
  };
}

function _hash(value = '') {
  let out = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    out = ((out << 5) - out) + str.charCodeAt(i);
    out |= 0;
  }
  return Math.abs(out);
}

function _statusMeta(status) {
  const map = {
    not_submitted: { label: 'Not Submitted', bg: '#fffbeb', fg: '#92400e', border: '#fde68a' },
    [GRADING_STATUS.UNASSIGNED]: { label: 'Unassigned', bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' },
    [GRADING_STATUS.ASSIGNED]: { label: 'Assigned', bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
    [GRADING_STATUS.AI_READY]: { label: 'AI Draft Ready', bg: '#eef2ff', fg: '#4338ca', border: '#c7d2fe' },
    [GRADING_STATUS.RETURNED_TO_TUTOR]: { label: 'Returned To Tutor', bg: '#fff7ed', fg: '#9a3412', border: '#fdba74' },
    [GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED]: { label: 'Integrity Review', bg: '#fef2f2', fg: '#991b1b', border: '#fecaca' },
    [GRADING_STATUS.MODERATION_REQUIRED]: { label: 'Moderation Required', bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
    [GRADING_STATUS.MODERATED]: { label: 'Moderated Draft', bg: '#ede9fe', fg: '#6d28d9', border: '#c4b5fd' },
    [GRADING_STATUS.FINALISED]: { label: 'Finalised', bg: '#ecfdf5', fg: '#166534', border: '#bbf7d0' },
    [GRADING_STATUS.POSTED]: { label: 'Released', bg: '#dcfce7', fg: '#166534', border: '#86efac' },
    [GRADING_STATUS.AI_FAILED]: { label: 'AI Failed', bg: '#fef2f2', fg: '#991b1b', border: '#fecaca' },
    [GRADING_STATUS.INGESTION_FAILED]: { label: 'Ingestion Failed', bg: '#fff7ed', fg: '#9a3412', border: '#fdba74' },
  };
  return map[status] || map[GRADING_STATUS.UNASSIGNED];
}

function _roleLabel(role = '') {
  const value = String(role || '').toLowerCase();
  if (value === 'lecturer') return 'Lecturer';
  if (value === 'moderator') return 'Moderator';
  if (value === 'tutor') return 'Tutor';
  return 'Staff';
}

function _workflowHistoryRows(record = {}) {
  return (Array.isArray(record?.workflowHistory) ? record.workflowHistory : [])
    .filter((item) => item && typeof item === 'object')
    .slice(-5)
    .reverse();
}

function _captureWorkspaceAdvanceTarget() {
  const active = _markingWorkspace.active;
  if (!_markingWorkspace.autoAdvance || !active?.submissionId || !active?.studentUid) return null;
  const queueMeta = _workspaceQueueMeta(active.submissionId, active.studentUid);
  if (!queueMeta?.next?.latest) return null;
  return {
    assessmentId: String(queueMeta.next.latest.assessmentId || active.assessmentId || '').trim(),
    studentUid: String(queueMeta.next.uid || '').trim(),
    submissionId: String(queueMeta.next.latest.id || '').trim(),
    fileIndex: 0,
    viewTab: active.viewTab === 'annotated' ? 'annotated' : 'document',
  };
}

async function _refreshReviewerAndMaybeAdvance(target = null) {
  await _refreshReviewer();
  if (!target?.submissionId || !_markingWorkspace.autoAdvance) return;
  _markingWorkspace.active = {
    assessmentId: target.assessmentId,
    studentUid: target.studentUid,
    submissionId: target.submissionId,
    fileIndex: Number(target.fileIndex) || 0,
    viewTab: target.viewTab === 'annotated' ? 'annotated' : 'document',
  };
  _renderMarkingWorkspace();
  window.setTimeout(() => {
    _ensureWorkspaceAIDraft(target.assessmentId, target.studentUid, target.submissionId);
  }, 0);
}

function _criterionMax(row = {}) {
  let max = 0;
  (Array.isArray(row?.levels) ? row.levels : []).forEach((level) => {
    (String(level?.mark || '').match(/\d+/g) || []).forEach((n) => {
      max = Math.max(max, Number(n) || 0);
    });
  });
  return max || 25;
}

function _getBaseAssessmentConfig(assessmentId) {
  const runtimeCfg = window._atConfigs?.[assessmentId];
  if (runtimeCfg && typeof runtimeCfg === 'object') return runtimeCfg;
  return Object.values(assessments).find((cfg) => cfg && typeof cfg === 'object' && cfg.id === assessmentId) || null;
}

function _getEffectiveAssessmentConfig(assessmentId) {
  const base = _getBaseAssessmentConfig(assessmentId);
  if (!base) return null;
  return getMergedAssessmentConfig(base, getCachedAssessmentSettingsOverride(assessmentId));
}

function _toLocalDateTimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _fromLocalDateTimeValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function _cloneSettingsDraft(cfg) {
  return {
    assessmentId: cfg?.id || '',
    deadlineLocal: _toLocalDateTimeValue(cfg?.deadline || ''),
    checklist: Array.isArray(cfg?.checklist) && cfg.checklist.length ? cfg.checklist.map((item) => ({ title: String(item?.title || ''), detail: String(item?.detail || '') })) : [{ title: '', detail: '' }],
    rubric: Array.isArray(cfg?.rubric) && cfg.rubric.length ? cfg.rubric.map((row) => ({ criterion: String(row?.criterion || ''), levels: Array.isArray(row?.levels) && row.levels.length ? row.levels.map((level) => ({ mark: String(level?.mark || ''), desc: String(level?.desc || '') })) : [{ mark: '', desc: '' }] })) : [{ criterion: '', levels: [{ mark: '', desc: '' }] }],
  };
}

function _safeGroupId(value = '') {
  return String(value || '').trim().toUpperCase();
}

function _getAssessmentList() {
  const source = window._atConfigs && typeof window._atConfigs === 'object' ? Object.values(window._atConfigs) : Object.values(assessments);
  return source
    .filter((cfg) => cfg && typeof cfg === 'object' && cfg.id)
    .map((cfg) => {
      const merged = getMergedAssessmentConfig(cfg, getCachedAssessmentSettingsOverride(cfg.id));
      return { id: merged.id, badge: merged.badge || merged.id, icon: merged.icon || '📋' };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

let _activeAssessment = null;
let _allSubs = [];
let _gradingAssignments = { assignmentMethod: 'manual', groupAssignments: {}, submissionOverrides: {}, markersSnapshot: [] };
let _gradingRecords = {};
let _rosterRows = [];
let _rosterLookup = { byEmail: {}, byStudentNumber: {}, groups: [] };
let _tutorialAssignments = {};
let _markerOptions = [];
let _userIdentityLookup = { byEmail: {}, byStudentNumber: {} };
let _submissionExceptions = {};
let _assessmentSettingsDraft = null;
let _assessmentSettingsDraftId = '';
let _similarityDocCache = {};
let _similarityScoreCache = {};
let _bulkAiRunState = {
  assessmentId: '',
  running: false,
  text: '',
  color: 'var(--muted)',
};
let _autoGradeQueueState = {};
let _autoGradeQueueRefreshTimer = null;
let _bulkPostingState = {
  assessmentId: '',
  running: false,
  text: '',
  color: 'var(--muted)',
};
let _bulkSelectionMode = false;
let _bulkSelectedSubmissions = new Map();
let _bulkModerationRunning = false;
let _triageMode = false;
let _triagePendingMarks = new Map();
let _triageExpandedRows = new Set();
let _triageRunning = false;
let _triageTierCache = { green: [], yellow: [], red: [] };
let _staffQueueFilterMode = 'all';
let _staffQueueSearchQuery = '';
let _markingWorkspace = {
  active: null,
  autoAdvance: false,
  previewCache: {},
  extractionCache: {},
  chat: {},
  previewDraft: {},
};

function _queueStateForAssessment(assessmentId = '') {
  return _autoGradeQueueState?.assessmentId === assessmentId ? (_autoGradeQueueState || {}) : {};
}

function _syncBulkAiRunStateFromQueue(assessmentId = '') {
  if (!assessmentId) return;
  const queue = _queueStateForAssessment(assessmentId);
  if (!queue || typeof queue !== 'object' || !Object.keys(queue).length) return;
  const state = String(queue.state || '').trim().toLowerCase();
  const success = Number(queue.successInCurrentCycle) || 0;
  const failed = Number(queue.failedInCurrentCycle) || 0;
  const pending = Number(queue.pendingCount) || 0;
  if (state === 'running') {
    _bulkAiRunState = {
      assessmentId,
      running: true,
      text: pending
        ? `Background AI pre-marking is running. ${success} updated, ${failed} failed, ${pending} still queued.`
        : 'Background AI pre-marking is running now.',
      color: failed ? '#92400e' : 'var(--muted)',
    };
    return;
  }
  if (state === 'queued') {
    _bulkAiRunState = {
      assessmentId,
      running: true,
      text: pending
        ? `Background AI pre-marking is queued. ${pending} latest submissions still need processing.`
        : 'Background AI pre-marking is queued.',
      color: 'var(--muted)',
    };
    return;
  }
  if (queue.lastSummary) {
    _bulkAiRunState = {
      assessmentId,
      running: false,
      text: String(queue.lastSummary || ''),
      color: failed ? '#92400e' : '#166534',
    };
  }
}

function _scheduleAutoGradeQueueRefresh() {
  if (_autoGradeQueueRefreshTimer) {
    window.clearTimeout(_autoGradeQueueRefreshTimer);
    _autoGradeQueueRefreshTimer = null;
  }
  if (!_isLecturerRole() || !_activeAssessment) return;
  const queue = _queueStateForAssessment(_activeAssessment);
  const state = String(queue?.state || '').trim().toLowerCase();
  if (!['queued', 'running'].includes(state)) return;
  _autoGradeQueueRefreshTimer = window.setTimeout(() => {
    if (_activeAssessment) window._loadStaffSubmissions?.(_activeAssessment);
  }, 12000);
}
const _autoAiDraftState = {};
const _markingWorkspaceSynthIdState = {};

export async function renderSubmissionReviewer(container) {
  if (!container) return;
  await loadAssessmentSettingsOverrides();
  const isTutor = _isTutorRole();
  const assessmentList = _getAssessmentList();
  const header = isTutor ? 'My Grading Queue' : 'Moderation Queue';
  const sub = isTutor
    ? 'Review your assigned submissions, use AI as a drafting assistant, and escalate sampled or risky cases.'
    : 'Moderate flagged work, manage release readiness, and release or withdraw feedback for students.';

  container.innerHTML = `
    <div style="max-width:1120px;margin:0 auto;padding:20px 0;">
      <div style="margin-bottom:20px;">
        <h2 style="margin:0;color:var(--navy);font-size:22px;">${_esc(header)}</h2>
        <p style="margin:6px 0 0 0;color:var(--muted);font-size:13px;line-height:1.6;">${_esc(sub)}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
        ${assessmentList.map((a) => `<button class="btn-prev submission-reviewer-tab" data-assess-tab="${_esc(a.id)}" onclick="window._loadStaffSubmissions('${_esc(a.id)}')" style="display:inline-flex;gap:6px;align-items:center;"><span>${a.icon}</span> ${_esc(a.badge)}</button>`).join('')}
      </div>
      <div id="staff-submissions-mount" style="min-height:120px;"><div style="color:var(--muted);font-size:13px;padding:20px;text-align:center;">Select an assessment above to view the grading queue.</div></div>
    </div>
  `;
  if (isTutor && assessmentList[0]?.id) {
    setTimeout(() => window._loadStaffSubmissions?.(assessmentList[0].id), 0);
  }
}

function _buildRosterLookup(rows = []) {
  const byEmail = {};
  const byStudentNumber = {};
  const groups = new Set();
  rows.forEach((row) => {
    const group = _safeGroupId(row?.tutorialGroup || row?.group || '');
    const email = String(row?.email || '').trim().toLowerCase();
    const studentNumber = String(row?.studentId || row?.studentNumber || row?.studentNo || '').replace(/\D+/g, '');
    if (group) groups.add(group);
    if (email) byEmail[email] = group || byEmail[email] || '';
    if (studentNumber) byStudentNumber[studentNumber] = group || byStudentNumber[studentNumber] || '';
  });
  return { byEmail, byStudentNumber, groups: Array.from(groups).sort() };
}

function _normalizeTutorialAssignments(raw, ownUid = '') {
  if (!raw) return {};
  if (raw.tutor && ownUid) return { [ownUid]: raw };
  return raw;
}

function _buildMarkerOptions(users = {}) {
  const out = [];
  Object.entries(users || {}).forEach(([uid, value]) => {
    const role = String(value?.profile?.role || '').toLowerCase();
    if (role !== 'tutor' || value?.profile?.disabled) return;
    out.push({
      uid,
      name: String(value?.profile?.displayName || value?.profile?.email || uid).replace(/\s*\[(tutor|lecturer|moderator)\]\s*/i, '').trim(),
      role,
    });
  });
  if (_isLecturerRole() && STATE.user?.uid) {
    out.push({
      uid: STATE.user.uid,
      name: String(STATE.user?.displayName || STATE.user?.email || STATE.user.uid).replace(/\s*\[(tutor|lecturer|moderator)\]\s*/i, '').trim(),
      role: _currentRole(),
    });
  }
  const deduped = new Map();
  out.forEach((marker) => deduped.set(marker.uid, marker));
  return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function _buildUserIdentityLookup(users = {}) {
  const byEmail = {};
  const byStudentNumber = {};
  const byUid = {};
  Object.entries(users || {}).forEach(([uid, value]) => {
    const profile = value?.profile || {};
    if (profile?.disabled) return;

    const emails = [
      profile.email,
      profile.personalEmail,
      profile.authEmail,
      profile.username,
    ]
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean);

    emails.forEach((email) => {
      if (!byEmail[email]) byEmail[email] = uid;
    });

    const studentNumbers = [
      profile.studentNumber,
      profile.studentId,
      profile.studentNo,
    ]
      .map((studentNumber) => String(studentNumber || '').replace(/\D+/g, ''))
      .filter(Boolean);

    studentNumbers.forEach((studentNumber) => {
      if (!byStudentNumber[studentNumber]) byStudentNumber[studentNumber] = uid;
    });

    byUid[uid] = {
      email: emails[0] || '',
      studentNumber: studentNumbers[0] || '',
      displayName: String(profile.displayName || '').split(' [')[0].trim(),
    };
  });
  return { byEmail, byStudentNumber, byUid };
}

function _lateExceptionForUid(uid = '') {
  const key = String(uid || '').trim();
  if (!key) return null;
  const value = _submissionExceptions?.[key];
  return value && typeof value === 'object' ? value : null;
}

function _eligibleBulkLateExceptionStudents(students = []) {
  return (Array.isArray(students) ? students : []).filter((student) => (
    student?.canGrantLateException
    && !_lateExceptionForUid(student.uid)?.allowLate
  ));
}

function _resolveLateExceptionTarget(raw = '') {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (_lateExceptionForUid(value) || /^[A-Za-z0-9_-]{20,}$/.test(value)) {
    return { uid: value, label: value, source: 'uid' };
  }
  const normalized = value.toLowerCase();
  const uid = _userIdentityLookup.byEmail[normalized];
  if (uid) return { uid, label: value, source: 'email' };
  return null;
}

async function _loadReviewerState(assessmentId) {
  _similarityDocCache = {};
  _similarityScoreCache = {};
  const tasks = [
    getAllSubmissions(assessmentId),
    getGradingAssignments(assessmentId),
    getGradingRecords(assessmentId),
    get(ref(db, 'rosters/classList')).catch(() => ({ exists: () => false })),
    get(ref(db, `submission-exceptions/${assessmentId}`)).catch(() => ({ exists: () => false })),
    get(ref(db, `grading-auto-queue/${assessmentId}`)).catch(() => ({ exists: () => false })),
  ];
  if (_isLecturerRole()) {
    tasks.push(
      get(ref(db, 'tutorial-groups/assignmentsByTutor')).catch(() => ({ exists: () => false })),
      get(ref(db, 'users')).catch(() => ({ exists: () => false })),
    );
  } else if (_isTutorRole()) {
    tasks.push(get(ref(db, `tutorial-groups/assignmentsByTutor/${_activeTutorUid()}`)).catch(() => ({ exists: () => false })));
  }
  const results = await Promise.all(tasks);
  _allSubs = results[0] || [];
  _gradingAssignments = results[1] || { assignmentMethod: 'manual', groupAssignments: {}, submissionOverrides: {}, markersSnapshot: [] };
  _gradingRecords = results[2] || {};
  _rosterRows = results[3]?.exists?.() ? Object.values(results[3].val() || {}) : [];
  _submissionExceptions = results[4]?.exists?.() ? (results[4].val() || {}) : {};
  _autoGradeQueueState = results[5]?.exists?.() ? (results[5].val() || {}) : {};
  _rosterLookup = _buildRosterLookup(_rosterRows);
  if (_isLecturerRole()) {
    _tutorialAssignments = _normalizeTutorialAssignments(results[6]?.exists?.() ? results[6].val() : {}, '');
    const users = results[7]?.exists?.() ? results[7].val() : {};
    _markerOptions = _buildMarkerOptions(users);
    _userIdentityLookup = _buildUserIdentityLookup(users);
  } else if (_isTutorRole()) {
    _tutorialAssignments = _normalizeTutorialAssignments(results[6]?.exists?.() ? results[6].val() : {}, _activeTutorUid());
    _markerOptions = _activeTutorUid() ? [{
      uid: _activeTutorUid(),
      name: _activeTutorName(),
      role: 'tutor',
    }] : [];
    _userIdentityLookup = { byEmail: {}, byStudentNumber: {} };
  } else {
    _tutorialAssignments = {};
    _markerOptions = [];
    _userIdentityLookup = { byEmail: {}, byStudentNumber: {} };
  }
  _syncBulkAiRunStateFromQueue(assessmentId);
}

function _renderAssessmentSettingsPanel(mount, assessmentId) {
  if (!mount) return;
  if (!_isLecturerRole()) {
    mount.innerHTML = '';
    return;
  }
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  if (!cfg) {
    mount.innerHTML = '';
    return;
  }
  const overrideMeta = getCachedAssessmentSettingsOverride(assessmentId);
  if (_assessmentSettingsDraftId !== assessmentId || !_assessmentSettingsDraft) {
    _assessmentSettingsDraftId = assessmentId;
    _assessmentSettingsDraft = _cloneSettingsDraft(cfg);
  }
  const draft = _assessmentSettingsDraft;
  mount.innerHTML = `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;color:var(--navy);font-size:16px;">Assessment Settings</h3>
          <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:6px;">Manage the due date, critical checklist requirements, and rubric criteria used by the submission flow for <strong style="color:var(--navy);">${_esc(cfg.badge || cfg.id)}</strong>.</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px;">${overrideMeta?.updatedAt ? `Override saved by ${_esc(overrideMeta.updatedByName || 'Staff')} on ${_fmtDate(overrideMeta.updatedAt)}` : 'Using the content defaults until you save an override.'}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="window._resetAssessmentSettingsDraft()">Discard Changes</button>
          <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;border-color:#f59e0b;color:#92400e;" onclick="window._resetAssessmentSettingsToDefaults()">Reset to Defaults</button>
          <button class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._saveAssessmentSettings()">Save Settings</button>
        </div>
      </div>
      <div style="display:grid;gap:16px;margin-top:18px;">
        <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
          <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:8px;">Due Date</div>
          <input type="datetime-local" value="${_esc(draft.deadlineLocal || '')}" onchange="window._updateAssessmentDeadline(this.value)" style="padding:9px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;min-width:240px;" />
        </div>
        <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
            <div style="font-size:12px;font-weight:800;color:var(--navy);">Critical Submission Checklist</div>
            <button class="btn-prev" style="display:inline-flex;padding:5px 9px;font-size:11px;" onclick="window._addAssessmentChecklistItem()">+ Add Checklist Item</button>
          </div>
          <div style="display:grid;gap:10px;">${draft.checklist.map((item, idx) => `
            <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:white;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Checklist ${idx + 1}</div><button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;color:#991b1b;border-color:#fecaca;" onclick="window._removeAssessmentChecklistItem(${idx})">Remove</button></div>
              <input type="text" value="${_esc(item.title)}" placeholder="Checklist title" onchange="window._updateAssessmentChecklistItem(${idx}, 'title', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;margin-bottom:8px;" />
              <textarea rows="2" placeholder="Checklist detail" onchange="window._updateAssessmentChecklistItem(${idx}, 'detail', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(item.detail)}</textarea>
            </div>`).join('')}</div>
        </div>
        <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
            <div style="font-size:12px;font-weight:800;color:var(--navy);">Rubric Criteria</div>
            <button class="btn-prev" style="display:inline-flex;padding:5px 9px;font-size:11px;" onclick="window._addAssessmentRubricCriterion()">+ Add Criterion</button>
          </div>
          <div style="display:grid;gap:12px;">${draft.rubric.map((row, rowIdx) => `
            <div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:white;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;">Criterion ${rowIdx + 1}</div><div style="display:flex;gap:8px;"><button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;" onclick="window._addAssessmentRubricLevel(${rowIdx})">+ Add Level</button><button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;color:#991b1b;border-color:#fecaca;" onclick="window._removeAssessmentRubricCriterion(${rowIdx})">Remove Criterion</button></div></div>
              <input type="text" value="${_esc(row.criterion)}" placeholder="Criterion title" onchange="window._updateAssessmentRubricCriterion(${rowIdx}, this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;margin-bottom:10px;" />
              <div style="display:grid;gap:8px;">${row.levels.map((level, levelIdx) => `
                <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:var(--muted);">Level ${levelIdx + 1}</div><button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;color:#991b1b;border-color:#fecaca;" onclick="window._removeAssessmentRubricLevel(${rowIdx}, ${levelIdx})">Remove Level</button></div>
                  <input type="text" value="${_esc(level.mark)}" placeholder="Mark band" onchange="window._updateAssessmentRubricLevel(${rowIdx}, ${levelIdx}, 'mark', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;margin-bottom:8px;" />
                  <textarea rows="2" placeholder="Descriptor" onchange="window._updateAssessmentRubricLevel(${rowIdx}, ${levelIdx}, 'desc', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(level.desc)}</textarea>
                </div>`).join('')}</div>
            </div>`).join('')}</div>
        </div>
      </div>
      <div id="assessment-settings-status" style="font-size:12px;color:var(--muted);margin-top:12px;"></div>
    </div>
  `;
}

function _studentGroup(sub) {
  const email = String(sub?.studentEmail || '').trim().toLowerCase();
  const studentNumber = String(sub?.studentNumber || '').replace(/\D+/g, '');
  return _safeGroupId(_rosterLookup.byEmail[email] || _rosterLookup.byStudentNumber[studentNumber] || '');
}

function _tutorialFallbackAssignment(group) {
  const safeGroup = _safeGroupId(group);
  if (!safeGroup) return null;
  for (const [uid, entry] of Object.entries(_tutorialAssignments || {})) {
    const groups = Array.isArray(entry?.groups) ? entry.groups : [];
    const match = groups.find((item) => _safeGroupId(item?.id || '') === safeGroup);
    if (match) {
      return {
        markerUid: uid,
        markerName: String(entry?.tutor?.displayName || entry?.tutor?.email || uid).replace(/\s*\[tutor\]\s*/i, '').trim(),
        markerRole: 'tutor',
        source: 'tutorial_fallback',
      };
    }
  }
  return null;
}

function _resolveAssignment(studentUid, submissionId, group) {
  const safeSubmissionId = String(submissionId || '').trim();
  const safeGroup = _safeGroupId(group);
  const override = safeSubmissionId ? _gradingAssignments?.submissionOverrides?.[safeSubmissionId] : null;
  if (override?.markerUid) return { markerUid: override.markerUid, markerName: override.markerName || override.markerUid, markerRole: override.markerRole || 'tutor', source: 'submission_override' };
  const groupAssignment = safeGroup ? _gradingAssignments?.groupAssignments?.[safeGroup] : null;
  if (groupAssignment?.markerUid) return { markerUid: groupAssignment.markerUid, markerName: groupAssignment.markerName || groupAssignment.markerUid, markerRole: groupAssignment.markerRole || 'tutor', source: 'group_assignment' };
  return _tutorialFallbackAssignment(safeGroup) || { markerUid: '', markerName: '', markerRole: '', source: 'unassigned' };
}

function _workflowStatus(record, assignment) {
  if (record?.status) {
    if (record.status === GRADING_STATUS.AI_FAILED && record?.aiDraft) {
      return GRADING_STATUS.AI_READY;
    }
    return record.status;
  }
  return assignment?.markerUid ? GRADING_STATUS.ASSIGNED : GRADING_STATUS.UNASSIGNED;
}

function _submittedStudentKeys(students = []) {
  const keys = new Set();
  students.forEach((student) => {
    const uid = String(student?.uid || '').trim();
    const email = String(student?.email || '').trim().toLowerCase();
    const studentNumber = String(student?.studentNumber || '').replace(/\D+/g, '');
    if (uid) keys.add(`uid:${uid}`);
    if (email) keys.add(`email:${email}`);
    if (studentNumber) keys.add(`studentNumber:${studentNumber}`);
  });
  return keys;
}

function _buildNonSubmitterRows(existingStudents = []) {
  // Build keys from enriched submitted rows (name/email/studentNumber already backfilled)
  const submittedKeys = _submittedStudentKeys(existingStudents);
  return _rosterRows
    .map((row, index) => {
      const email = String(row?.email || '').trim().toLowerCase();
      const studentNumber = String(row?.studentId || row?.studentNumber || row?.studentNo || '').replace(/\D+/g, '');
      const uid = String(
        row?.uid
        || _userIdentityLookup.byEmail[email]
        || _userIdentityLookup.byStudentNumber[studentNumber]
        || ''
      ).trim();
      if ((uid && submittedKeys.has(`uid:${uid}`))
        || (email && submittedKeys.has(`email:${email}`))
        || (studentNumber && submittedKeys.has(`studentNumber:${studentNumber}`))) {
        return null;
      }

      const group = _safeGroupId(row?.tutorialGroup || row?.group || '');
      const lateException = _lateExceptionForUid(uid);
      return {
        uid: uid || `roster-only:${email || studentNumber || index}`,
        latest: null,
        previous: [],
        subs: [],
        name: String(row?.displayName || row?.name || [row?.firstName, row?.surname || row?.lastName].filter(Boolean).join(' ') || email || studentNumber || 'Student').trim(),
        email,
        studentNumber,
        group,
        canGrantLateException: Boolean(uid),
        lateException,
      };
    })
    .filter(Boolean)
    .filter((student) => {
      if (_isLecturerRole()) return true;
  if (_isTutorRole()) return _resolveAssignment(student.uid, '', student.group).markerUid === _activeTutorUid();
      return false;
    });
}

function _buildStudentRows() {
  const byStudent = {};
  _allSubs.forEach((sub) => {
    const uid = sub._studentUid || sub.uid;
    if (!byStudent[uid]) byStudent[uid] = [];
    byStudent[uid].push(sub);
  });
  return Object.entries(byStudent).map(([uid, subs]) => {
    subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const latest = subs.find((sub) => sub.status !== 'cleared') || subs[0] || null;
    // Enrich missing identity fields from the users identity lookup (for students
    // who submitted before completing their profile setup)
    const idFallback = _userIdentityLookup.byUid?.[uid] || {};
    const email = latest?.studentEmail || idFallback.email || '';
    const studentNumber = latest?.studentNumber || idFallback.studentNumber || '';
    const name = latest?.studentName || idFallback.displayName || uid;
    return {
      uid,
      latest,
      previous: latest ? subs.filter((sub) => sub.id !== latest.id && sub.status !== 'cleared') : [],
      subs,
      name,
      email,
      studentNumber,
      group: latest ? (_studentGroup(latest) || _safeGroupId(_rosterLookup.byEmail[email] || _rosterLookup.byStudentNumber[studentNumber] || '')) : '',
    };
  }).filter((row) => row.latest);
}

function _visibleToUser(student) {
  if (_isLecturerRole()) return true;
  if (_isTutorRole()) return _resolveAssignment(student.uid, student.latest?.id, student.group).markerUid === _activeTutorUid();
  return false;
}

function _similarityRecordForSubmission(sub = {}) {
  const studentUid = String(sub?._studentUid || sub?.uid || '').trim();
  const submissionId = String(sub?.id || '').trim();
  if (!studentUid || !submissionId) return {};
  return _gradingRecords?.[studentUid]?.[submissionId] || {};
}

function _readStoredSimilarityText(sub = {}) {
  const record = _similarityRecordForSubmission(sub);
  return String(
    record?.eltAssessmentText
    || sub?.feedback?.submissionText
    || ''
  ).trim();
}

function _cleanSimilarityText(value = '') {
  return String(value || '')
    .replace(/\[file:[^\]]+\]\s*/gi, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function _similarityTokens(text = '') {
  if (!text) return [];
  return text
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token))
    .slice(0, 1800);
}

function _similarityShingles(tokens = [], size = 3) {
  const out = new Set();
  if (!Array.isArray(tokens) || tokens.length < size) return out;
  for (let i = 0; i <= tokens.length - size; i += 1) {
    out.add(tokens.slice(i, i + size).join(' '));
  }
  return out;
}

function _similaritySetJaccard(left, right) {
  if (!(left instanceof Set) || !(right instanceof Set) || !left.size || !right.size) return 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  let intersection = 0;
  smaller.forEach((value) => {
    if (larger.has(value)) intersection += 1;
  });
  const union = left.size + right.size - intersection;
  return union > 0 ? (intersection / union) : 0;
}

function _submissionFileHashes(sub = {}) {
  const hashes = new Set();
  (Array.isArray(sub?.files) ? sub.files : []).forEach((file) => {
    const candidates = [
      file?.sha256,
      file?.sha1,
      file?.md5,
      file?.md5Hash,
      file?.hash,
      file?.checksum,
      file?.contentHash,
    ];
    candidates.forEach((value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized) hashes.add(normalized);
    });
  });
  return hashes;
}

function _submissionFileSignatures(sub = {}) {
  const signatures = new Set();
  (Array.isArray(sub?.files) ? sub.files : []).forEach((file) => {
    const name = String(file?.name || '').trim().toLowerCase();
    const size = Number(file?.size);
    if (!name || !Number.isFinite(size) || size <= 0) return;
    signatures.add(`${name}::${size}`);
  });
  return signatures;
}

function _similarityDocument(sub = {}) {
  const submissionId = String(sub?.id || '').trim();
  if (!submissionId) return null;
  if (_similarityDocCache[submissionId]) return _similarityDocCache[submissionId];

  const rawText = _readStoredSimilarityText(sub);
  const normalizedText = _cleanSimilarityText(rawText);
  const tokens = _similarityTokens(normalizedText);
  const tokenSet = new Set(tokens);
  const shingles = _similarityShingles(tokens, 3);
  const doc = {
    submissionId,
    studentUid: String(sub?._studentUid || sub?.uid || '').trim(),
    fileHashes: _submissionFileHashes(sub),
    fileSignatures: _submissionFileSignatures(sub),
    normalizedText,
    tokenCount: tokens.length,
    textLength: normalizedText.length,
    tokenSet,
    shingles,
  };
  _similarityDocCache[submissionId] = doc;
  return doc;
}

function _calcSimilarity(sub) {
  const submissionId = String(sub?.id || '').trim();
  if (!submissionId) return 0;
  if (_similarityScoreCache[submissionId] != null) return _similarityScoreCache[submissionId];

  const current = _similarityDocument(sub);
  if (!current) {
    _similarityScoreCache[submissionId] = 0;
    return 0;
  }

  let highest = 0;
  for (const other of _allSubs) {
    const otherStudentUid = String(other?._studentUid || other?.uid || '').trim();
    if (!other?.id || !otherStudentUid || otherStudentUid === current.studentUid) continue;
    const candidate = _similarityDocument(other);
    if (!candidate) continue;

    let score = 0;
    if (current.fileHashes.size && candidate.fileHashes.size) {
      const smaller = current.fileHashes.size <= candidate.fileHashes.size ? current.fileHashes : candidate.fileHashes;
      const larger = current.fileHashes.size <= candidate.fileHashes.size ? candidate.fileHashes : current.fileHashes;
      let hashMatch = false;
      smaller.forEach((value) => {
        if (!hashMatch && larger.has(value)) hashMatch = true;
      });
      if (hashMatch) score = 100;
    }

    if (!score && current.normalizedText && candidate.normalizedText) {
      if (current.normalizedText === candidate.normalizedText && current.textLength >= 400) {
        score = 98;
      } else if (current.shingles.size >= 12 && candidate.shingles.size >= 12) {
        const overlap = _similaritySetJaccard(current.shingles, candidate.shingles);
        score = Math.max(score, Math.round(overlap * 100));
      } else if (current.tokenCount >= 20 && candidate.tokenCount >= 20) {
        const tokenOverlap = _similaritySetJaccard(current.tokenSet, candidate.tokenSet);
        score = Math.max(score, Math.round(tokenOverlap * 100));
      }
    }

    if (!score && current.fileSignatures.size && candidate.fileSignatures.size) {
      const smaller = current.fileSignatures.size <= candidate.fileSignatures.size ? current.fileSignatures : candidate.fileSignatures;
      const larger = current.fileSignatures.size <= candidate.fileSignatures.size ? candidate.fileSignatures : current.fileSignatures;
      let signatureMatches = 0;
      smaller.forEach((value) => {
        if (larger.has(value)) signatureMatches += 1;
      });
      if (signatureMatches > 0) score = Math.min(35, 18 + (signatureMatches * 8));
    }

    if (score > highest) highest = score;
    if (highest >= 100) break;
  }

  _similarityScoreCache[submissionId] = Math.max(0, Math.min(100, Math.round(highest)));
  return _similarityScoreCache[submissionId];
}

function _proceduralFlags(sub, cfg) {
  const flags = [];
  const files = Array.isArray(sub?.files) ? sub.files : [];
  if (!files.length) flags.push('missing_files');
  if (String(cfg?.id || '') === 'a1' && files.length < 3) flags.push('insufficient_required_files');
  return flags;
}

function _sampledSetByMarker(students) {
  const byMarker = {};
  students.forEach((student) => {
    const assignment = _resolveAssignment(student.uid, student.latest?.id, student.group);
    if (!assignment.markerUid) return;
    if (!byMarker[assignment.markerUid]) byMarker[assignment.markerUid] = [];
    byMarker[assignment.markerUid].push(student.latest.id);
  });
  const sampled = {};
  Object.entries(byMarker).forEach(([markerUid, ids]) => {
    ids.sort((a, b) => _hash(`${_activeAssessment}:${a}`) - _hash(`${_activeAssessment}:${b}`));
    const size = Math.min(ids.length, Math.max(3, Math.min(10, Math.ceil(ids.length * 0.1))));
    sampled[markerUid] = new Set(ids.slice(0, size));
  });
  return sampled;
}

function _moderationReasons(student, review, integrity, sampledByMarker) {
  const cfg = _getEffectiveAssessmentConfig(student.latest.assessmentId);
  const reasons = {};
  const procedural = _proceduralFlags(student.latest, cfg);
  const mark = Number(review.mark);
  if (procedural.length) reasons.proceduralIrregularity = procedural.join(', ');
  if ((integrity?.suspicionScore || 0) >= 60 || String(integrity?.confidenceBand || '').toLowerCase() === 'high') reasons.integrityFlag = true;
  if (Number.isFinite(mark) && mark < 50) reasons.fail = mark >= 45 ? 'Below pass threshold, close to 50' : 'Below pass threshold';
  if (_isBorderlineFailMark(mark)) reasons.borderlineFail = `Mark ${mark} is close to the 50 pass threshold`;
  if (_isVeryHighMark(mark)) reasons.veryHighMark = `Mark ${mark} is 75 or above`;
  const boundary = GRADE_BOUNDARIES.find((value) => Number.isFinite(mark) && Math.abs(mark - value) <= 3);
  if (boundary != null) reasons.borderline = `Within 3 marks of ${boundary}`;
  const assignment = _resolveAssignment(student.uid, student.latest.id, student.group);
  if (assignment.markerUid && sampledByMarker[assignment.markerUid]?.has(student.latest.id)) reasons.sample = true;
  return reasons;
}

function _hasReasons(reasons = {}) {
  return Object.values(reasons).some(Boolean);
}

function _moderationReasonLabel(key, value) {
  const labels = {
    lecturerModerationRequired: 'Lecturer moderation',
    proceduralIrregularity: 'Procedural issue',
    integrityFlag: 'Integrity flag',
    fail: 'Fail',
    borderlineFail: 'Borderline fail',
    veryHighMark: 'Very high mark',
    borderline: 'Boundary mark',
    sample: 'Calibration sample',
    manualEscalation: 'Manual escalation',
    releaseRetracted: 'Release withdrawn',
  };
  const label = labels[key] || String(key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return typeof value === 'string' && value.trim() ? `${label}: ${value}` : label;
}

function _moderationReasonSummary(reasons = {}) {
  return Object.entries(reasons || {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => _moderationReasonLabel(key, value))
    .join(' · ');
}

function _renderModerationReasonChips(reasons = {}) {
  const entries = Object.entries(reasons || {}).filter(([, value]) => Boolean(value));
  if (!entries.length) return '';
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;">${entries.map(([key, value]) => `<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;">${_esc(_moderationReasonLabel(key, value))}</span>`).join('')}</div>`;
}

function _buildReleaseAnnotationsPayload(giState, record = {}) {
  if (!giState) return null;

  const markerAnnotations = (Array.isArray(giState.markerAnnotations) ? giState.markerAnnotations : [])
    .filter((annotation) => annotation?.includeInDraft)
    .map((annotation) => ({
      ...annotation,
      source: 'marker',
      sourceLabel: annotation?.markerName || 'Tutor Annotation',
    }));

  const aiAnnotations = (Array.isArray(giState.eltAnnotations) ? giState.eltAnnotations : [])
    .filter((annotation) => annotation?.includeInDraft)
    .map((annotation) => ({
      quote: annotation?.exact_quote || '',
      comment: annotation?.comment || '',
      source: 'ai',
      sourceLabel: annotation?.feedback_type || 'AI Draft',
      markerName: 'AI Draft',
    }));

  const annotations = [...aiAnnotations, ...markerAnnotations];
  const submissionText = giState.studentText || record?.eltAssessmentText || '';
  return { annotations, submissionText };
}

function _workspacePreviewCardId(submissionId, fileIndex, annotationIdx) {
  return `workspace-preview-card-${submissionId}-${fileIndex}-${annotationIdx}`;
}

function _workspacePreviewHitId(submissionId, fileIndex, annotationIdx, hitIdx) {
  return `workspace-preview-hit-${submissionId}-${fileIndex}-${annotationIdx}-${hitIdx}`;
}

function _htmlToPlainText(html = '') {
  if (!html) return '';
  try {
    const probe = document.createElement('div');
    probe.innerHTML = html;
    return String(probe.textContent || probe.innerText || '').trim();
  } catch {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function _workspaceAnnotationQuote(annotation = {}) {
  return String(annotation?.exact_quote || annotation?.quote || '').trim();
}

function _workspaceAnnotationComment(annotation = {}) {
  return String(annotation?.comment || '').trim();
}

function _workspaceAnnotationSource(annotation = {}) {
  if (annotation?.source) return String(annotation.source).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(annotation || {}, 'exact_quote') || annotation?.feedback_type) return 'ai';
  return 'marker';
}

function _workspaceAnnotationLabel(annotation = {}) {
  if (_workspaceAnnotationSource(annotation) === 'ai') return String(annotation?.feedback_type || 'AI');
  return String(annotation?.markerName || 'Marker');
}

function _workspaceAnnotationMatchesFile(annotation = {}, fileIndex, fileName, previewText = '') {
  const anchor = annotation?.anchor && typeof annotation.anchor === 'object' ? annotation.anchor : null;
  if (anchor && Number.isFinite(Number(anchor.fileIndex)) && Number(anchor.fileIndex) === Number(fileIndex)) return true;
  if (anchor?.fileName && String(anchor.fileName).trim() === String(fileName || '').trim()) return true;
  const quote = _workspaceAnnotationQuote(annotation);
  if (!quote || !previewText) return false;
  return _findAllQuoteMatches(previewText, quote, false).length > 0 || _findAllQuoteMatches(previewText, quote, true).length > 0;
}

function _workspacePreviewText(preview = {}, bundle = {}, fileIndex = 0, file = {}) {
  if (preview?.kind === 'text') return String(preview.text || '');
  if (preview?.kind === 'html') return _htmlToPlainText(preview.html || '');
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const direct = results[fileIndex];
  if (direct?.text && (!file?.name || direct?.name === file.name)) return String(direct.text || '');
  const fallback = results.find((item) => item?.text && (!file?.name || item?.name === file.name));
  return String(fallback?.text || '');
}

function _workspaceCombinedAnnotations(ctx) {
  const aiAnnotations = (Array.isArray(ctx?.eltAssessment?.annotations) ? ctx.eltAssessment.annotations : []).map((annotation, idx) => ({
    idx,
    giIdx: idx,
    source: 'ai',
    quote: _workspaceAnnotationQuote(annotation),
    comment: _workspaceAnnotationComment(annotation),
    label: _workspaceAnnotationLabel(annotation),
    annotation,
  }));
  const markerAnnotations = _normalizeFirebaseArray(ctx?.record?.markerAnnotations).map((annotation, idx) => ({
    idx: aiAnnotations.length + idx,
    giIdx: aiAnnotations.length + idx,
    source: 'marker',
    quote: _workspaceAnnotationQuote(annotation),
    comment: _workspaceAnnotationComment(annotation),
    label: _workspaceAnnotationLabel(annotation),
    annotation,
  }));
  return [...aiAnnotations, ...markerAnnotations];
}

function _buildWorkspacePreviewAnnotationModel(submissionId, fileIndex, text = '', annotations = []) {
  const normalizedText = String(text || '');
  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  const candidateHits = [];
  const annotationMap = safeAnnotations.map((entry) => {
    const exactHits = _findAllQuoteMatches(normalizedText, entry.quote, false);
    const fallbackHits = exactHits.length ? [] : _findAllQuoteMatches(normalizedText, entry.quote, true);
    const matches = exactHits.length ? exactHits : fallbackHits;
    matches.forEach((hit, hitIdx) => {
      candidateHits.push({
        annotationIdx: entry.idx,
        start: hit.start,
        end: hit.end,
        length: hit.end - hit.start,
        hitId: _workspacePreviewHitId(submissionId, fileIndex, entry.idx, hitIdx),
      });
    });
    return {
      ...entry,
      firstHitId: null,
      visibleHitCount: 0,
      matched: matches.length > 0,
    };
  });

  const selected = [];
  candidateHits
    .sort((a, b) => (b.length - a.length) || (a.start - b.start) || (a.annotationIdx - b.annotationIdx))
    .forEach((hit) => {
      if (!selected.some((chosen) => hit.start < chosen.end && hit.end > chosen.start)) selected.push(hit);
    });

  selected.sort((a, b) => a.start - b.start);
  selected.forEach((hit) => {
    const entry = annotationMap.find((item) => item.idx === hit.annotationIdx);
    if (!entry) return;
    if (!entry.firstHitId) entry.firstHitId = hit.hitId;
    entry.visibleHitCount += 1;
  });

  let cursor = 0;
  const html = [];
  selected.forEach((hit) => {
    if (hit.start > cursor) html.push(_escapeHtmlPreserveNewlines(normalizedText.slice(cursor, hit.start)));
    const entry = annotationMap.find((item) => item.idx === hit.annotationIdx) || {};
    const isAi = entry.source === 'ai';
    const title = _cleanText(`${entry.label || (isAi ? 'AI' : 'Marker')}: ${entry.comment || ''}`, 800);
    html.push(
      `<mark id="${hit.hitId}" onclick="window._focusWorkspacePreviewCard('${_esc(submissionId)}', ${Number(fileIndex) || 0}, ${hit.annotationIdx})" title="${_esc(title)}" style="background:${isAi ? '#fef3c7' : '#dbeafe'};color:${isAi ? '#92400e' : '#1e40af'};padding:0 2px;border-radius:3px;cursor:pointer;">${_escapeHtmlPreserveNewlines(normalizedText.slice(hit.start, hit.end))}</mark>`
    );
    cursor = hit.end;
  });
  if (cursor < normalizedText.length) html.push(_escapeHtmlPreserveNewlines(normalizedText.slice(cursor)));

  return {
    html: html.join(''),
    annotations: annotationMap,
  };
}

function _workspacePreviewContentMarkup(submissionId, fileIndex, file = {}, preview = {}, contentHtml = '', canSelect = false) {
  const selectAttrs = canSelect ? ` onmouseup="window._handleWorkspacePreviewSelection('${_esc(submissionId)}', ${Number(fileIndex) || 0})" ontouchend="window._handleWorkspacePreviewSelection('${_esc(submissionId)}', ${Number(fileIndex) || 0})"` : '';
  const note = preview?.note ? `<div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted);background:#f8fafc;">${_esc(preview.note)}</div>` : '';

  if (preview?.kind === 'iframe') {
    return `${note}<iframe title="${_esc(file?.name || 'document preview')}" src="${_esc(preview.url || file?.url || '')}" style="width:100%;height:100%;border:none;background:white;"></iframe>`;
  }
  if (preview?.kind === 'image') {
    return `${note}<div style="height:100%;overflow:auto;padding:12px;background:#e2e8f0;"><img src="${_esc(preview.url || file?.url || '')}" alt="${_esc(file?.name || 'submission image')}" style="display:block;max-width:100%;height:auto;margin:0 auto;border-radius:10px;box-shadow:0 12px 30px rgba(15,23,42,.12);" /></div>`;
  }
  if (preview?.kind === 'html') {
    return `${note}<div id="workspace-preview-surface-${_esc(submissionId)}-${Number(fileIndex) || 0}"${selectAttrs} style="height:100%;overflow:auto;padding:18px 20px;background:white;color:#1e293b;line-height:1.8;font-size:14px;"><div style="max-width:860px;margin:0 auto;">${preview.html || ''}</div></div>`;
  }
  if (preview?.kind === 'text') {
    return `${note}<div id="workspace-preview-surface-${_esc(submissionId)}-${Number(fileIndex) || 0}"${selectAttrs} style="height:100%;overflow:auto;padding:18px 20px;background:white;color:#1e293b;line-height:1.8;font-size:13px;white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">${contentHtml || _escapeHtmlPreserveNewlines(preview.text || '')}</div>`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:24px;color:var(--muted);font-size:13px;text-align:center;">${_esc(preview?.note || 'This file type is not available for in-app preview yet.')}</div>`;
}

function _renderWorkspacePreviewMarkup(ctx, file = {}, preview = {}, bundle = {}, fileIndex = 0) {
  const previewText = _workspacePreviewText(preview, bundle, fileIndex, file);
  const allAnnotations = _workspaceCombinedAnnotations(ctx);
  const relevantAnnotations = allAnnotations.filter((entry) => _workspaceAnnotationMatchesFile(entry.annotation, fileIndex, file?.name, previewText));
  const model = _buildWorkspacePreviewAnnotationModel(ctx.sub.id, fileIndex, previewText, relevantAnnotations);
  if (preview?.kind !== 'text') model.annotations.forEach((entry) => { entry.firstHitId = null; });
  const canSelect = ctx.canAnnotate && (preview?.kind === 'text' || preview?.kind === 'html');
  const contentHtml = preview?.kind === 'text' ? model.html : '';
  const annotationCards = model.annotations.map((entry) => {
    const isAi = entry.source === 'ai';
    const quoteLabel = entry.quote ? `"${_esc(entry.quote.slice(0, 140))}${entry.quote.length > 140 ? '…' : ''}"` : 'Linked to this file';
    return `
      <button type="button" id="${_workspacePreviewCardId(ctx.sub.id, fileIndex, entry.idx)}" onclick="window._focusWorkspacePreviewEntry('${_esc(ctx.sub.id)}', ${Number(fileIndex) || 0}, ${entry.idx}, ${entry.giIdx})" style="text-align:left;padding:10px 12px;border-radius:12px;border:1px solid ${isAi ? '#fde68a' : '#bfdbfe'};background:${isAi ? '#fffbeb' : '#eff6ff'};cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:${isAi ? '#92400e' : '#1e40af'};">${_esc(entry.label || (isAi ? 'AI' : 'Marker'))}</span>
          <span style="font-size:10px;color:var(--muted);">${entry.firstHitId ? 'In preview' : 'Open annotated view'}</span>
        </div>
        <div style="font-size:11px;color:${isAi ? '#78350f' : '#1e3a8a'};line-height:1.6;margin-top:6px;font-style:${entry.quote ? 'italic' : 'normal'};">${quoteLabel}</div>
        <div style="font-size:12px;color:#334155;line-height:1.6;margin-top:6px;">${_esc(entry.comment || '')}</div>
      </button>`;
  }).join('') || '<div style="font-size:12px;color:var(--muted);line-height:1.7;">No linked annotations for this file yet.</div>';

  return `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;height:100%;min-height:0;">
      <div style="min-height:0;border-right:1px solid var(--border);background:white;position:relative;">
        ${_workspacePreviewContentMarkup(ctx.sub.id, fileIndex, file, preview, contentHtml, canSelect)}
      </div>
      <div style="display:grid;grid-template-rows:auto minmax(0,1fr);min-height:0;background:#f8fafc;">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
            <div>
              <div style="font-size:12px;font-weight:900;color:var(--navy);">Preview Annotations</div>
              <div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:4px;">${canSelect ? 'Select text in the preview to add a linked comment.' : 'Use linked file notes here. Quote-level review remains available in the annotated text view.'}</div>
            </div>
            ${ctx.canAnnotate ? `<button type="button" onclick="window._openWorkspacePreviewNote('${_esc(ctx.sub.id)}', ${Number(fileIndex) || 0})" style="padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:white;color:#334155;font-size:11px;font-weight:800;cursor:pointer;">Add Linked Note</button>` : ''}
          </div>
        </div>
        <div style="min-height:0;overflow:auto;padding:10px;display:grid;gap:8px;align-content:start;">${annotationCards}</div>
      </div>
    </div>
  `;
}

function _upsertWorkspaceMarkerAnnotation(assessmentId, studentUid, submissionId, annotation) {
  if (!assessmentId || !studentUid || !submissionId || !annotation?.id) return;
  if (!_gradingRecords || typeof _gradingRecords !== 'object') _gradingRecords = {};
  if (!_gradingRecords?.[studentUid]) _gradingRecords[studentUid] = {};
  if (!_gradingRecords[studentUid][submissionId]) _gradingRecords[studentUid][submissionId] = {};
  const current = _gradingRecords[studentUid][submissionId].markerAnnotations;
  let next = {};
  if (Array.isArray(current)) {
    current.forEach((item) => {
      if (item?.id) next[item.id] = item;
    });
  } else if (current && typeof current === 'object') {
    next = { ...current };
  }
  next[annotation.id] = annotation;
  _gradingRecords[studentUid][submissionId].markerAnnotations = next;
}

async function _refreshReviewer() {
  if (_activeAssessment) await window._loadStaffSubmissions(_activeAssessment);
  if (_markingWorkspace.active) window._rerenderMarkingWorkspace();
}

window._loadStaffSubmissions = async function (assessmentId) {
  _activeAssessment = assessmentId;
  await loadAssessmentSettingsOverrides();
  document.querySelectorAll('.submission-reviewer-tab').forEach((el) => {
    const active = el.dataset.assessTab === assessmentId;
    el.style.background = active ? 'var(--navy)' : '';
    el.style.color = active ? 'white' : '';
    el.style.borderColor = active ? 'var(--navy)' : '';
  });
  const mount = document.getElementById('staff-submissions-mount');
  const settingsMount = document.getElementById('staff-assessment-settings-mount');
  const gradingMount = document.getElementById('staff-grading-setup-mount');
  if (!mount) return;
  mount.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:30px;justify-content:center;"><div class="rec-spinner" style="width:20px;height:20px;"></div><span style="color:var(--muted);font-size:13px;">Loading grading queue...</span></div>`;
  if (settingsMount) settingsMount.innerHTML = '';
  await _loadReviewerState(assessmentId);
  if (gradingMount) gradingMount.innerHTML = '';
  _renderStaffSubmissionList(mount);
  _scheduleAutoGradeQueueRefresh();
};

function _renderGradingSetupPanel(mount) {
  if (!mount) return;
  if (!_isLecturerRole()) {
    mount.innerHTML = '';
    return;
  }
  const markers = _markerOptions.filter((marker) => marker.role === 'tutor' || marker.uid === STATE.user?.uid);
  const counts = {};
  Object.values(_gradingAssignments?.groupAssignments || {}).forEach((entry) => { if (entry?.markerUid) counts[entry.markerUid] = (counts[entry.markerUid] || 0) + 1; });
  const students = _buildStudentRows();
  const moderation = students.filter((student) => {
    const record = _gradingRecords?.[student.uid]?.[student.latest?.id];
    const status = _workflowStatus(record, _resolveAssignment(student.uid, student.latest?.id, student.group));
    return status === GRADING_STATUS.MODERATION_REQUIRED
      || status === GRADING_STATUS.MODERATED
      || status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED
      || status === GRADING_STATUS.RETURNED_TO_TUTOR;
  });
  mount.innerHTML = `
    <div style="display:grid;gap:18px;margin-bottom:18px;">
      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
          <div><h3 style="margin:0;color:var(--navy);font-size:16px;">Grading Setup</h3><div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">Assign groups to markers, seed from existing tutorial allocations, and rebalance tutor workload where needed.</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="window._seedGradingAssignmentsFromTutorialGroups()">Seed From Tutorial Groups</button><button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;border-color:#1d4ed8;color:#1d4ed8;" onclick="window._randomRebalanceGradingAssignments()">Random Rebalance</button></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">${markers.map((marker) => `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:10px 12px;min-width:160px;"><div style="font-size:13px;font-weight:800;color:var(--navy);">${_esc(marker.name)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(_roleLabel(marker.role))}</div><div style="font-size:12px;color:#0f766e;font-weight:800;margin-top:4px;">${counts[marker.uid] || 0} group(s)</div></div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-top:14px;">${_rosterLookup.groups.map((group) => {
          const current = _gradingAssignments?.groupAssignments?.[group] || {};
          const studentCount = _rosterRows.filter((row) => String(row?.tutorialGroup || row?.group || '').trim().toUpperCase() === group).length;
          return `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;"><div style="font-size:14px;font-weight:900;color:var(--navy);">Group ${_esc(group)}</div><div style="font-size:11px;color:var(--muted);">${studentCount} student(s)</div></div><select onchange="window._assignGradingGroup('${_esc(group)}', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;"><option value="">— Unassigned —</option>${markers.map((marker) => `<option value="${_esc(marker.uid)}" ${current.markerUid === marker.uid ? 'selected' : ''}>${_esc(marker.name)} (${_esc(_roleLabel(marker.role))})</option>`).join('')}</select></div>`;
        }).join('')}</div>
      </div>
      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
          <h3 style="margin:0;color:var(--navy);font-size:15px;">Moderation Queue</h3>
          <button type="button" class="btn-prev" style="display:inline-flex;padding:5px 9px;font-size:11px;border-color:#991b1b;color:#991b1b;" onclick="window._setStaffQueueFilter('moderation')">Focus Queue</button>
        </div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:12px;">Open moderation cases include flagged integrity risk, fails, borderline fails, very high marks, procedural issues, and calibration samples.</div>
        ${moderation.length ? moderation.slice(0, 8).map((student) => `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;margin-bottom:8px;"><div style="font-size:13px;font-weight:800;color:var(--navy);">${_esc(student.name)}${student.group ? ` · Group ${_esc(student.group)}` : ''}</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(_moderationReasonSummary(_gradingRecords?.[student.uid]?.[student.latest?.id]?.moderationReasons || {}) || 'Moderation case')}</div></div>`).join('') : '<div style="font-size:12px;color:var(--muted);">No open moderation cases for this assessment.</div>'}
      </div>
    </div>
  `;
}

function _normalizeReviewSource(source = {}, cfg = null) {
  const rubricRows = (Array.isArray(source?.rubricRows) ? source.rubricRows : Array.isArray(source?.criterionRows) ? source.criterionRows : (Array.isArray(cfg?.rubric) ? cfg.rubric.map((row) => ({ criterion: row.criterion, provisionalMark: null, maxMark: _criterionMax(row), rationale: '' })) : [])).map((row, idx) => ({
    criterion: _cleanText(row?.criterion || cfg?.rubric?.[idx]?.criterion, 240),
    provisionalMark: row?.provisionalMark == null || Number.isNaN(Number(row.provisionalMark)) ? null : Number(row.provisionalMark),
    maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? _criterionMax(cfg?.rubric?.[idx] || {}) : Number(row.maxMark),
    rationale: _cleanText(row?.rationale, 1400),
  }));
  const sections = source?.sections || source?.feedback || {};
  return {
    mark: Number.isFinite(Number(source?.mark)) ? Number(source.mark) : Number.isFinite(Number(source?.overallMark)) ? Number(source.overallMark) : null,
    sections: {
      whereYouAreNow: _cleanText(sections.whereYouAreNow, 2400),
      whereYouShouldBe: _cleanText(sections.whereYouShouldBe, 2400),
      relationToOutcomes: _cleanText(sections.relationToOutcomes, 2400),
      whatToDoNext: _cleanText(sections.whatToDoNext, 2400),
    },
    actionItems: (Array.isArray(source?.actionItems) ? source.actionItems : []).map((item) => _cleanText(item, 280)).filter(Boolean).slice(0, 5),
    rubricRows,
  };
}

function _feedbackValidation(review, opts = {}) {
  if (!Number.isFinite(Number(review?.mark)) || Number(review.mark) < 0 || Number(review.mark) > 100) return 'Add an overall mark between 0 and 100.';
  const sourceRows = Array.isArray(opts.source?.rubricRows) ? opts.source.rubricRows : [];
  const unreasonedMark = (review?.rubricRows || []).find((row, idx) => {
    const sourceMark = sourceRows[idx]?.provisionalMark;
    const hasCriterionMark = row?.provisionalMark != null
    && Number.isFinite(Number(row.provisionalMark))
    && Number(row.provisionalMark) >= 0;
    const markChanged = Number.isFinite(Number(sourceMark))
      ? Number(row.provisionalMark) !== Number(sourceMark)
      : opts.requireCriterionRationale === true;
    return hasCriterionMark && markChanged && _cleanText(row.rationale).length < 20;
  });
  if (unreasonedMark) return `Justify the mark for "${unreasonedMark.criterion || 'this criterion'}" before sending it forward.`;
  if (opts.allowAiConcurrence === true) return '';
  if (_cleanText(review?.sections?.whereYouAreNow).length < 25) return 'Fill in "Where you are now".';
  if (_cleanText(review?.sections?.whereYouShouldBe).length < 25) return 'Fill in "Where you should be".';
  if (_cleanText(review?.sections?.relationToOutcomes).length < 25) return 'Fill in the task/course outcomes section.';
  if (_cleanText(review?.sections?.whatToDoNext).length < 25) return 'Fill in "What to do next".';
  if ((review?.actionItems || []).length < 3) return 'Add at least 3 concrete feedforward actions.';
  return '';
}

function _renderReviewForm(submissionId, cfg, source, prefix, title, helper, buttons) {
  const review = _normalizeReviewSource(source, cfg);
  return `
    <div id="${prefix}-review-form-${submissionId}" style="margin-top:12px;padding:14px;border:2px solid #bbf7d0;border-radius:14px;background:#f8fafc;">
      <div style="font-size:14px;font-weight:800;color:var(--navy);">${_esc(title)}</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">${_esc(helper)}</div>
      <div style="padding:10px 12px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;font-size:12px;line-height:1.6;margin-top:12px;">If you agree with the AI mark and feedback, you may send the script to the lecturer queue without adding comments or repeating feedforward. If you change a criterion mark, add an evidence-based rationale for that change.</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;"><label style="font-size:12px;font-weight:800;color:var(--navy);" for="${prefix}-mark-${submissionId}">Editable overall mark</label><input type="number" min="0" max="100" step="1" id="${prefix}-mark-${submissionId}" value="${review.mark ?? ''}" style="width:96px;padding:8px 10px;border:2px solid #86efac;border-radius:8px;font-size:14px;font-weight:800;background:white;" /></div>
      <div style="display:grid;gap:10px;margin-top:12px;">${review.rubricRows.map((row, idx) => `<div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:white;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;"><div style="font-size:12px;font-weight:800;color:var(--navy);">${_esc(row.criterion || `Criterion ${idx + 1}`)}</div><div style="font-size:11px;color:var(--muted);">Max ${row.maxMark ?? '—'} marks</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;"><label style="font-size:11px;font-weight:800;color:var(--navy);" for="${prefix}-crit-mark-${submissionId}-${idx}">Editable criterion mark</label><input type="number" min="0" max="${row.maxMark ?? 100}" step="1" id="${prefix}-crit-mark-${submissionId}-${idx}" value="${row.provisionalMark ?? ''}" style="width:90px;padding:6px 8px;border:2px solid #bfdbfe;border-radius:8px;font-size:12px;font-weight:800;background:white;" /></div><textarea id="${prefix}-crit-rationale-${submissionId}-${idx}" rows="2" placeholder="Required: justify this criterion mark with evidence from the script" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(row.rationale || '')}</textarea></div>`).join('')}</div>
      <div style="display:grid;gap:10px;margin-top:12px;"><textarea id="${prefix}-where-now-${submissionId}" rows="3" placeholder="Where you are now" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(review.sections.whereYouAreNow || '')}</textarea><textarea id="${prefix}-where-should-${submissionId}" rows="3" placeholder="Where you should be" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(review.sections.whereYouShouldBe || '')}</textarea><textarea id="${prefix}-outcomes-${submissionId}" rows="3" placeholder="How this maps to the task and course outcomes" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(review.sections.relationToOutcomes || '')}</textarea><textarea id="${prefix}-next-${submissionId}" rows="3" placeholder="What to do next" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(review.sections.whatToDoNext || '')}</textarea></div>
      <div style="margin-top:12px;"><div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:6px;">Optional feedforward actions</div><div style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:6px;">Use these only if you want to add tutor-specific next steps beyond the AI feedback.</div><div style="display:grid;gap:8px;">${Array.from({ length: 5 }, (_, idx) => `<input type="text" id="${prefix}-action-${submissionId}-${idx}" value="${_esc(review.actionItems[idx] || '')}" placeholder="Optional action item ${idx + 1}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;" />`).join('')}</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;">${buttons}<span id="${prefix}-status-${submissionId}" style="font-size:11px;color:var(--muted);"></span></div>
    </div>
  `;
}

function _readReviewFromDom(submissionId, cfg, prefix) {
  return {
    mark: Number(document.getElementById(`${prefix}-mark-${submissionId}`)?.value || ''),
    sections: {
      whereYouAreNow: _cleanText(document.getElementById(`${prefix}-where-now-${submissionId}`)?.value || '', 2400),
      whereYouShouldBe: _cleanText(document.getElementById(`${prefix}-where-should-${submissionId}`)?.value || '', 2400),
      relationToOutcomes: _cleanText(document.getElementById(`${prefix}-outcomes-${submissionId}`)?.value || '', 2400),
      whatToDoNext: _cleanText(document.getElementById(`${prefix}-next-${submissionId}`)?.value || '', 2400),
    },
    actionItems: Array.from({ length: 5 }, (_, idx) => _cleanText(document.getElementById(`${prefix}-action-${submissionId}-${idx}`)?.value || '', 280)).filter(Boolean),
    rubricRows: (Array.isArray(cfg?.rubric) ? cfg.rubric : []).map((row, idx) => ({
      criterion: _cleanText(row?.criterion, 240),
      provisionalMark: Number(document.getElementById(`${prefix}-crit-mark-${submissionId}-${idx}`)?.value || ''),
      maxMark: _criterionMax(row),
      rationale: _cleanText(document.getElementById(`${prefix}-crit-rationale-${submissionId}-${idx}`)?.value || '', 1400),
    })),
  };
}

function _renderEltAssessmentPane(submissionId, eltAssessment, studentText = '') {
  if (!eltAssessment || !studentText) return '';
  const summary = eltAssessment?.grading_summary || {};
  const model = _buildEltAnnotationModel(submissionId, studentText, eltAssessment?.annotations || []);
  const evidenceState = detectEltInsufficientEvidence(eltAssessment);
  const overallBadge = evidenceState.insufficient ? 'Manual review required' : `${summary?.overall_percentage ?? '—'}%`;
  const letterBadge = evidenceState.insufficient ? 'Unscored' : _esc(summary?.letter_grade || '—');
  return `
    <div style="margin-top:12px;padding:14px;border:1px solid #bfdbfe;border-radius:14px;background:#f8fbff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:14px;font-weight:800;color:#1d4ed8;">ELT Assessment Specialist</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">Structured review from Vertex AI with criterion scores, quote-based annotations, and objective-linked feedback.</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="font-size:12px;font-weight:800;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:6px 10px;">${overallBadge}</span>
          <span style="font-size:12px;font-weight:800;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:6px 10px;">${letterBadge}</span>
        </div>
      </div>
      ${evidenceState.insufficient ? `<div style="margin-top:12px;padding:10px 12px;border:1px solid #fbbf24;border-radius:10px;background:#fffbeb;font-size:12px;color:#92400e;line-height:1.6;"><strong>Insufficient readable evidence:</strong> ${_esc(evidenceState.warning || 'No readable student text was available for evaluation. Manual review is required.')}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px;">
        <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:white;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:800;">Total earned</div><div style="font-size:20px;font-weight:900;color:var(--navy);margin-top:4px;">${evidenceState.insufficient ? '—' : (summary?.total_points_earned ?? '—')}</div></div>
        <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:white;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:800;">Total possible</div><div style="font-size:20px;font-weight:900;color:var(--navy);margin-top:4px;">${summary?.total_points_possible ?? '—'}</div></div>
      </div>
      <div style="margin-top:12px;border:1px solid var(--border);border-radius:12px;background:white;overflow:hidden;">
        <div style="padding:10px 12px;font-size:12px;font-weight:800;color:var(--navy);border-bottom:1px solid var(--border);background:#f8fafc;">Criteria Breakdown</div>
        <div style="display:grid;gap:0;">${(Array.isArray(eltAssessment?.criteria_breakdown) ? eltAssessment.criteria_breakdown : []).map((row) => `<div style="padding:10px 12px;border-top:1px solid var(--border);"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;"><div style="font-size:12px;font-weight:800;color:var(--navy);">${_esc(row?.criterion_name || 'Criterion')}</div><div style="font-size:12px;font-weight:800;color:#1d4ed8;">${evidenceState.insufficient ? 'Not scored' : `${row?.score ?? '—'}/${row?.max_score ?? '—'}`}</div></div><div style="font-size:12px;color:#334155;line-height:1.6;margin-top:6px;">${_esc(row?.justification || '')}</div></div>`).join('')}</div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:12px;margin-top:12px;">
        <div style="border:1px solid var(--border);border-radius:12px;background:white;overflow:hidden;">
          <div style="padding:10px 12px;font-size:12px;font-weight:800;color:var(--navy);border-bottom:1px solid var(--border);background:#f8fafc;">Annotated Submission Text</div>
          <div style="padding:12px;font-size:12px;color:#334155;line-height:1.8;white-space:normal;max-height:420px;overflow:auto;">${model.html || _esc(studentText)}</div>
        </div>
        <div style="display:grid;gap:12px;">
          <div style="border:1px solid var(--border);border-radius:12px;background:white;overflow:hidden;">
            <div style="padding:10px 12px;font-size:12px;font-weight:800;color:var(--navy);border-bottom:1px solid var(--border);background:#f8fafc;">Annotations</div>
            <div style="padding:10px;display:grid;gap:8px;max-height:420px;overflow:auto;">${model.annotations.map((entry) => `<div id="${_annotationId(submissionId, entry.idx)}" onclick="window._focusEltHighlight('${_esc(submissionId)}', ${entry.idx})" style="padding:10px;border:1px solid var(--border);border-radius:10px;background:${entry.firstHitId ? '#ffffff' : '#fff7ed'};cursor:pointer;"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#475569;">${_esc(entry.annotation?.feedback_type || 'annotation')}</span><span style="font-size:11px;color:var(--muted);">${_esc(entry.annotation?.related_objective || '')}</span></div><div style="font-size:12px;font-weight:700;color:var(--navy);margin-top:6px;">${_esc(entry.annotation?.exact_quote || 'No exact quote')}</div><div style="font-size:12px;color:#334155;line-height:1.6;margin-top:6px;">${_esc(entry.annotation?.comment || '')}</div>${entry.annotation?.suggested_revision ? `<div style="font-size:11px;color:#0f766e;line-height:1.6;margin-top:6px;"><strong>Suggested revision:</strong> ${_esc(entry.annotation.suggested_revision)}</div>` : ''}${entry.firstHitId ? '' : '<div style="font-size:11px;color:#9a3412;margin-top:6px;">No active inline highlight found for this annotation.</div>'}</div>`).join('') || '<div style="font-size:12px;color:var(--muted);">No annotations returned.</div>'}</div>
          </div>
          <div style="border:1px solid var(--border);border-radius:12px;background:white;overflow:hidden;">
            <div style="padding:10px 12px;font-size:12px;font-weight:800;color:var(--navy);border-bottom:1px solid var(--border);background:#f8fafc;">Holistic Feedback</div>
            <div style="padding:12px;font-size:12px;color:#334155;line-height:1.7;display:grid;gap:10px;">
              <div><strong>Strengths:</strong> ${_esc(eltAssessment?.holistic_feedback?.strengths_summary || '')}</div>
              <div><strong>Areas for improvement:</strong> ${_esc(eltAssessment?.holistic_feedback?.areas_for_improvement || '')}</div>
              <div><strong>Alignment with course goals:</strong> ${_esc(eltAssessment?.holistic_feedback?.alignment_with_course_goals || '')}</div>
            </div>
          </div>
        </div>
      </div>
      ${model.unmatched.length ? `<div style="margin-top:12px;padding:10px 12px;border:1px solid #fdba74;border-radius:10px;background:#fff7ed;font-size:12px;color:#9a3412;">${model.unmatched.length} annotation(s) did not match the displayed text exactly and remain available in the annotation list.</div>` : ''}
    </div>
  `;
}

function _flashEltElement(element) {
  if (!element) return;
  const originalBoxShadow = element.style.boxShadow;
  const originalBackground = element.style.backgroundColor;
  element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';
  if (!originalBackground) element.style.backgroundColor = '#eff6ff';
  window.setTimeout(() => {
    element.style.boxShadow = originalBoxShadow;
    if (!originalBackground) element.style.backgroundColor = '';
  }, 1400);
}

window._focusEltAnnotation = function (submissionId, annotationIdx) {
  const target = document.getElementById(_annotationId(submissionId, annotationIdx));
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  _flashEltElement(target);
};

window._focusEltHighlight = function (submissionId, annotationIdx) {
  const target = document.getElementById(_annotationHitId(submissionId, annotationIdx, 0));
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  _flashEltElement(target);
};

function _renderReleasedFeedback(feedback) {
  if (!feedback) return '';
  const label = feedback?.postedAt ? 'Posted Feedback' : 'Released Feedback';
  const actor = feedback.reviewerName || feedback.postedByName || 'Staff';
  const date = feedback.postedAt || feedback.reviewedAt;
  return `<div style="margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;"><div style="font-size:12px;font-weight:800;color:#5b21b6;margin-bottom:4px;">${label} from ${_esc(actor)}</div>${feedback.mark != null ? `<div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:6px;">Mark: ${feedback.mark}</div>` : ''}<div style="font-size:13px;color:#3b0764;line-height:1.7;white-space:pre-wrap;">${_nl2br(feedback.comment || '')}</div><div style="font-size:11px;color:var(--muted);margin-top:6px;">${_fmtDate(date)}</div></div>`;
}

function _renderMarkerDecisionUnavailable(ctx = {}) {
  const status = String(ctx.status || '').trim();
  let title = 'Marker Decision unavailable';
  let detail = 'This submission is visible, but the editable marking form is not available in the current role/status.';
  if (_isTutorPreviewMode()) {
    title = 'Tutor preview is read-only';
    detail = 'You are viewing a tutor dashboard preview from another role. Sign in as the assigned tutor to amend marks and send the script to the lecturer queue.';
  } else if (_isTutorRole()) {
    if (ctx.assignment?.markerUid && ctx.assignment.markerUid !== _activeTutorUid()) {
      title = 'Assigned to another marker';
      detail = `This script is assigned to ${ctx.assignment?.markerName || 'another marker'}, so your account cannot amend the mark.`;
    } else if (status === GRADING_STATUS.FINALISED) {
      title = 'Already finalised';
      detail = 'The lecturer has finalised this script. It can only be posted or reopened by lecturer workflow.';
    } else if (status === GRADING_STATUS.POSTED) {
      title = 'Already posted';
      detail = 'This feedback has already been released to the student, so tutor editing is locked.';
    } else {
      title = 'No marker assignment found';
      detail = 'This tutor account is not currently linked as the assigned marker for this submission. Re-save grading or tutor-group assignments from the lecturer dashboard.';
    }
  } else if (_isLecturerRole()) {
    title = 'Tutor Review is shown only to the assigned tutor';
    detail = status === GRADING_STATUS.MODERATION_REQUIRED || status === GRADING_STATUS.MODERATED || status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED
      ? 'Use the Lecturer Moderation form for this script.'
      : 'A lecturer will see Lecturer Moderation only after the tutor sends the script to the lecturer queue. To test Tutor Review, sign in as the assigned tutor rather than using lecturer view.';
  }
  return `<div style="margin-top:12px;padding:12px 14px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;color:#78350f;">
    <div style="font-size:13px;font-weight:900;">${_esc(title)}</div>
    <div style="font-size:12px;line-height:1.6;margin-top:4px;">${_esc(detail)}</div>
    <div style="font-size:11px;color:#92400e;margin-top:6px;">Status: ${_esc(status || 'unassigned')} · Assigned marker: ${_esc(ctx.assignment?.markerName || 'Unassigned')}</div>
  </div>`;
}

// Converts Firebase push-key object { "-Nxxx": {...} } to array, preserving id as the push key.
function _normalizeFirebaseArray(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return Array.isArray(obj) ? obj : [];
  return Object.entries(obj).map(([key, val]) => ({ id: key, ...val }));
}

function _workspaceRoot() {
  return document.getElementById('marking-workspace-root');
}

function _ensureWorkspaceRoot() {
  let root = _workspaceRoot();
  if (!root) {
    root = document.createElement('div');
    root.id = 'marking-workspace-root';
    document.body.appendChild(root);
  }
  return root;
}

function _workspaceChatLog(submissionId) {
  if (!_markingWorkspace.chat[submissionId]) _markingWorkspace.chat[submissionId] = [];
  return _markingWorkspace.chat[submissionId];
}

function _workspaceReviewPrefix(ctx) {
  if (ctx?.canModerate) return 'moderation';
  if (ctx?.canTutorMark) return 'tutor';
  return '';
}

function _setWorkspaceChatStatus(submissionId, message = '', color = 'var(--muted)') {
  const el = document.getElementById(`workspace-ai-chat-status-${submissionId}`);
  if (!el) return;
  el.textContent = message;
  el.style.color = color;
}

function _renderWorkspaceChatMessages(submissionId) {
  const mount = document.getElementById(`workspace-ai-messages-${submissionId}`);
  if (!mount) return;
  const messages = _workspaceChatLog(submissionId);
  if (!messages.length) {
    mount.innerHTML = '<div style="font-size:12px;color:var(--muted);line-height:1.7;">Ask the AI to explain the submission, test the strength of the evidence, or revise the current feedback before you send it forward.</div>';
    return;
  }
  mount.innerHTML = messages.map((entry) => {
    const isUser = entry.role === 'user';
    const bg = isUser ? '#eff6ff' : '#f8fafc';
    const border = isUser ? '#bfdbfe' : 'var(--border)';
    const fg = isUser ? '#1d4ed8' : '#334155';
    const label = isUser ? 'Marker' : (entry.role === 'system' ? 'System' : 'AI');
    return `<div style="padding:10px 12px;border:1px solid ${border};border-radius:12px;background:${bg};"><div style="font-size:11px;font-weight:800;color:${fg};text-transform:uppercase;">${label}</div><div style="font-size:12px;color:#1e293b;line-height:1.7;margin-top:6px;white-space:pre-wrap;">${_esc(entry.content || '')}</div></div>`;
  }).join('');
  mount.scrollTop = mount.scrollHeight;
}

function _appendWorkspaceMessage(submissionId, role, content) {
  const safeContent = _cleanText(content, 6000);
  if (!safeContent) return;
  const log = _workspaceChatLog(submissionId);
  log.push({ role, content: safeContent, at: new Date().toISOString() });
  if (log.length > 14) log.splice(0, log.length - 14);
  _renderWorkspaceChatMessages(submissionId);
}

function _applyReviewToDom(submissionId, cfg, prefix, review) {
  if (!prefix || !review) return;
  const normalized = _normalizeReviewSource(review, cfg);
  const markEl = document.getElementById(`${prefix}-mark-${submissionId}`);
  if (markEl) markEl.value = normalized.mark ?? '';
  const whereNowEl = document.getElementById(`${prefix}-where-now-${submissionId}`);
  if (whereNowEl) whereNowEl.value = normalized.sections.whereYouAreNow || '';
  const whereShouldEl = document.getElementById(`${prefix}-where-should-${submissionId}`);
  if (whereShouldEl) whereShouldEl.value = normalized.sections.whereYouShouldBe || '';
  const outcomesEl = document.getElementById(`${prefix}-outcomes-${submissionId}`);
  if (outcomesEl) outcomesEl.value = normalized.sections.relationToOutcomes || '';
  const nextEl = document.getElementById(`${prefix}-next-${submissionId}`);
  if (nextEl) nextEl.value = normalized.sections.whatToDoNext || '';

  Array.from({ length: 5 }, (_, idx) => {
    const actionEl = document.getElementById(`${prefix}-action-${submissionId}-${idx}`);
    if (actionEl) actionEl.value = normalized.actionItems[idx] || '';
  });

  normalized.rubricRows.forEach((row, idx) => {
    const markInput = document.getElementById(`${prefix}-crit-mark-${submissionId}-${idx}`);
    if (markInput) markInput.value = row.provisionalMark ?? '';
    const rationaleInput = document.getElementById(`${prefix}-crit-rationale-${submissionId}-${idx}`);
    if (rationaleInput) rationaleInput.value = row.rationale || '';
  });
}

async function _ensureWorkspaceExtractionBundle(ctx) {
  const submissionId = ctx?.sub?.id;
  if (!submissionId) return null;
  if (!_markingWorkspace.extractionCache[submissionId]) {
    _markingWorkspace.extractionCache[submissionId] = extractSubmissionBundle(ctx.sub.files || [], {
      maxCharsPerFile: 6000,
      totalMaxChars: 22000,
    });
  }
  return _markingWorkspace.extractionCache[submissionId];
}

function _activeWorkspaceContext() {
  const active = _markingWorkspace.active;
  if (!active?.submissionId || !active?.studentUid) return null;
  const student = _findStudentForSubmission(active.studentUid, active.submissionId);
  if (!student?.latest) return null;
  const sub = student.latest;
  const assignment = _resolveAssignment(student.uid, sub.id, student.group);
  const record = _gradingRecords?.[student.uid]?.[sub.id] || {};
  const cfg = _getEffectiveAssessmentConfig(sub.assessmentId);
  const status = _workflowStatus(record, assignment);
  const similarity = _calcSimilarity(sub);
  const integrity = record?.integrity || record?.aiDraft?.integrity || {};
  const isAssignedToMe = _isTutorRole() && assignment.markerUid === _activeTutorUid();
  const canTutorMark = isAssignedToMe && status !== GRADING_STATUS.FINALISED && status !== GRADING_STATUS.POSTED && !_isTutorPreviewMode();
  const canModerate = _isLecturerRole() && (
    status === GRADING_STATUS.MODERATION_REQUIRED
    || status === GRADING_STATUS.MODERATED
    || status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED
  );
  const canPost = _isLecturerRole() && status === GRADING_STATUS.FINALISED;
  const canRetractRelease = _isLecturerRole() && status === GRADING_STATUS.POSTED;
  const canAnnotate = (canTutorMark || canModerate || _isLecturerRole()) && status !== GRADING_STATUS.FINALISED && status !== GRADING_STATUS.POSTED;
  return {
    active,
    student,
    sub,
    assignment,
    record,
    cfg,
    status,
    meta: _statusMeta(status),
    similarity,
    integrity,
    canTutorMark,
    canModerate,
    canPost,
    canRetractRelease,
    canAnnotate,
    eltAssessment: record?.eltAssessment || null,
    eltAssessmentText: record?.eltAssessmentText || '',
  };
}

function _workspaceQueueStudents() {
  return _buildStudentRows()
    .filter((student) => _visibleToUser(student) && student?.latest)
    .sort((a, b) => {
      const statusA = _workflowStatus(_gradingRecords?.[a.uid]?.[a.latest?.id], _resolveAssignment(a.uid, a.latest?.id, a.group));
      const statusB = _workflowStatus(_gradingRecords?.[b.uid]?.[b.latest?.id], _resolveAssignment(b.uid, b.latest?.id, b.group));
      return statusA.localeCompare(statusB) || String(a.name || '').localeCompare(String(b.name || ''));
    });
}

function _workspaceQueueMeta(submissionId = '', studentUid = '') {
  const queue = _workspaceQueueStudents();
  const index = queue.findIndex((student) => String(student?.uid || '') === String(studentUid || '').trim() && String(student?.latest?.id || '') === String(submissionId || '').trim());
  return {
    queue,
    index,
    total: queue.length,
    previous: index > 0 ? queue[index - 1] : null,
    next: index >= 0 && index < queue.length - 1 ? queue[index + 1] : null,
  };
}

function _renderWorkspaceFileTabs(ctx) {
  const mount = document.getElementById(`workspace-file-tabs-${ctx.sub.id}`);
  if (!mount) return;
  const selectedIndex = Math.max(0, Math.min(Number(ctx.active.fileIndex) || 0, (ctx.sub.files || []).length - 1));
  const files = Array.isArray(ctx.sub.files) ? ctx.sub.files : [];
  const prevDisabled = selectedIndex <= 0;
  const nextDisabled = selectedIndex >= files.length - 1;
  const navButtons = files.length > 1 ? `
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <button type="button" ${prevDisabled ? 'disabled' : ''} onclick="window._stepMarkingWorkspaceFile(${_jsArg(ctx.sub.id)}, -1)" style="padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:${prevDisabled ? '#f8fafc' : 'white'};color:${prevDisabled ? '#94a3b8' : '#334155'};font-size:12px;font-weight:800;cursor:${prevDisabled ? 'not-allowed' : 'pointer'};">Previous file</button>
      <div style="font-size:11px;font-weight:800;color:var(--muted);min-width:72px;text-align:center;">${selectedIndex + 1} / ${files.length}</div>
      <button type="button" ${nextDisabled ? 'disabled' : ''} onclick="window._stepMarkingWorkspaceFile(${_jsArg(ctx.sub.id)}, 1)" style="padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:${nextDisabled ? '#f8fafc' : 'white'};color:${nextDisabled ? '#94a3b8' : '#334155'};font-size:12px;font-weight:800;cursor:${nextDisabled ? 'not-allowed' : 'pointer'};">Next file</button>
    </div>
  ` : '';
  const tabs = files.map((file, idx) => {
    const active = idx === selectedIndex;
    return `<button type="button" onclick="window._selectMarkingWorkspaceFile(${_jsArg(ctx.sub.id)}, ${idx})" style="padding:8px 12px;border-radius:10px;border:1px solid ${active ? '#93c5fd' : 'var(--border)'};background:${active ? '#eff6ff' : 'white'};color:${active ? '#1d4ed8' : '#334155'};font-size:12px;font-weight:${active ? '800' : '700'};cursor:pointer;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_esc(file?.name || `File ${idx + 1}`)}</button>`;
  }).join('');
  mount.innerHTML = files.length
    ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">${navButtons}<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">${tabs}</div></div>`
    : '<span style="font-size:12px;color:var(--muted);">No files attached to this submission.</span>';
}

async function _loadMarkingWorkspacePreview(submissionId, fileIndex = null) {
  const ctx = _activeWorkspaceContext();
  if (!ctx || ctx.sub.id !== submissionId) return;
  const files = Array.isArray(ctx.sub.files) ? ctx.sub.files : [];
  if (!files.length) return;

  const nextIndex = fileIndex == null ? (Number(ctx.active.fileIndex) || 0) : Number(fileIndex);
  const safeIndex = Math.max(0, Math.min(nextIndex, files.length - 1));
  _markingWorkspace.active.fileIndex = safeIndex;
  _renderWorkspaceFileTabs(ctx);

  const previewEl = document.getElementById(`workspace-preview-${submissionId}`);
  if (!previewEl) return;
  previewEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--muted);font-size:13px;"><div class="rec-spinner" style="width:18px;height:18px;"></div><span>Loading document preview...</span></div>';

  const file = files[safeIndex];
  const cacheKey = `${submissionId}:${safeIndex}`;
  if (!_markingWorkspace.previewCache[cacheKey]) {
    _markingWorkspace.previewCache[cacheKey] = loadSubmissionFilePreview(file);
  }

  const preview = await _markingWorkspace.previewCache[cacheKey];
  if (_markingWorkspace.active?.submissionId !== submissionId || Number(_markingWorkspace.active?.fileIndex) !== safeIndex) return;
  const bundle = await _ensureWorkspaceExtractionBundle(ctx);
  if (_markingWorkspace.active?.submissionId !== submissionId || Number(_markingWorkspace.active?.fileIndex) !== safeIndex) return;
  previewEl.innerHTML = _renderWorkspacePreviewMarkup(ctx, file, preview, bundle, safeIndex);
}

function _renderWorkspaceLaunchButton(studentUid, submissionId, assessmentId, label = 'Open Marking Workspace', fileIndex = 0, focusReview = false) {
  return `<button type="button" class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick='window._openMarkingWorkspace(${_jsArg(assessmentId)}, ${_jsArg(studentUid)}, ${_jsArg(submissionId)}, ${Number(fileIndex) || 0}, ${focusReview ? 'true' : 'false'})'>${_esc(label)}</button>`;
}

function _renderWorkspaceAiQuickPrompts(submissionId) {
  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
      <button type="button" onclick="window._workspaceRunAiQuickAction('${_esc(submissionId)}','Explain the current provisional mark by criterion and evidence.','ask')" style="padding:6px 9px;border-radius:999px;border:1px solid var(--border);background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer;">Why this mark?</button>
      <button type="button" onclick="window._workspaceRunAiQuickAction('${_esc(submissionId)}','Identify the weakest criterion and the missing evidence holding the mark down.','ask')" style="padding:6px 9px;border-radius:999px;border:1px solid var(--border);background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer;">Weakest area</button>
      <button type="button" onclick="window._workspaceRunAiQuickAction('${_esc(submissionId)}','Rewrite the current feedback so it is specific, evidence-based, and direct for the student.','revise')" style="padding:6px 9px;border-radius:999px;border:1px solid var(--border);background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer;">Improve feedback</button>
    </div>`;
}

function _renderWorkspaceAiSummaryCard(submissionId, draft = null, evidenceState = {}, integrityOverride = null, synthState = null) {
  if (!draft) {
    const fallbackSynthId = _coerceSynthIdIntegrity(integrityOverride?.synthId || {
      status: 'unavailable',
      provider: 'grading-record',
      confidenceBand: 'low',
      summary: 'No SynthID result has been saved on this grading record yet.',
      recommendedStaffAction: 'Treat the missing SynthID result as unknown provenance. Use notebook evidence, drafting history, and staff review instead.',
    });
    const fallbackPalette = (() => {
      const status = fallbackSynthId?.status || '';
      if (status === 'detected') return { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', label: 'SynthID detected' };
      if (status === 'uncertain') return { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', label: 'SynthID inconclusive' };
      if (status === 'not_detected') return { bg: '#f8fafc', border: 'var(--border)', fg: '#334155', label: 'No SynthID found' };
      if (status === 'unsupported') return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID unsupported' };
      if (status === 'unavailable') return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID not configured' };
      if (status === 'error') return { bg: '#fff7ed', border: '#fdba74', fg: '#9a3412', label: 'SynthID check failed' };
      return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID status' };
    })();
    const synthRunning = Boolean(synthState?.running);
    return `
      <div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);">
        <div style="font-size:14px;font-weight:900;color:var(--navy);">AI First Read</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">The automatic mark is still being prepared. When ready, the mark, criterion-level justification, and drafted student feedback will appear here.</div>
        <div style="display:grid;gap:8px;padding:10px 12px;border-radius:12px;background:${fallbackPalette.bg};border:1px solid ${fallbackPalette.border};margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
            <div style="font-size:12px;font-weight:800;color:${fallbackPalette.fg};">${fallbackPalette.label}</div>
            <div style="font-size:11px;color:${fallbackPalette.fg};font-weight:700;">${_esc(fallbackSynthId?.provider || 'provider not set')}${fallbackSynthId?.confidenceBand ? ` · ${_esc(fallbackSynthId.confidenceBand)}` : ''}</div>
          </div>
          ${fallbackSynthId?.summary ? `<div style="font-size:12px;color:${fallbackPalette.fg};line-height:1.6;">${_esc(fallbackSynthId.summary)}</div>` : ''}
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;${synthRunning ? 'opacity:.6;cursor:not-allowed;' : ''}" onclick="window._workspaceRunSynthIdCheck('${_esc(submissionId)}')" ${synthRunning ? 'disabled' : ''}>${synthRunning ? 'Checking...' : 'Run SynthID Check'}</button>
            <span id="workspace-synthid-status-${_esc(submissionId)}" style="font-size:11px;color:${_esc(synthState?.color || 'var(--muted)')};">${_esc(synthState?.text || '')}</span>
          </div>
        </div>
      </div>`;
  }

  const overallMark = evidenceState.insufficient
    ? 'Manual review'
    : (draft.overallMark ?? _deriveOverallMarkFromCriteria(draft.criterionRows || []) ?? '—');
  const synthId = _coerceSynthIdIntegrity(draft?.integrity?.synthId || integrityOverride?.synthId || {
    status: 'unavailable',
    provider: 'grading-record',
    confidenceBand: 'low',
    summary: 'No SynthID result has been saved on this grading record yet.',
    recommendedStaffAction: 'Treat the missing SynthID result as unknown provenance. Use notebook evidence, drafting history, and staff review instead.',
  });
  const criterionRows = (Array.isArray(draft.criterionRows) ? draft.criterionRows : [])
    .filter((row) => row?.criterion)
    .slice(0, 6);
  const feedbackBlocks = [
    ['Current performance', draft.feedback?.whereYouAreNow || ''],
    ['Needed improvement', draft.feedback?.whereYouShouldBe || ''],
    ['Outcome alignment', draft.feedback?.relationToOutcomes || ''],
    ['Next revision step', draft.feedback?.whatToDoNext || ''],
  ].filter(([, value]) => _cleanText(value, 2400));
  const synthPalette = (() => {
    const status = synthId?.status || '';
    if (status === 'detected') return { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', label: 'SynthID detected' };
    if (status === 'uncertain') return { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', label: 'SynthID inconclusive' };
    if (status === 'not_detected') return { bg: '#f8fafc', border: 'var(--border)', fg: '#334155', label: 'No SynthID found' };
    if (status === 'unsupported') return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID unsupported' };
    if (status === 'unavailable') return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID not configured' };
    if (status === 'error') return { bg: '#fff7ed', border: '#fdba74', fg: '#9a3412', label: 'SynthID check failed' };
    return { bg: '#f8fafc', border: 'var(--border)', fg: '#475569', label: 'SynthID status' };
  })();
  const synthRunning = Boolean(synthState?.running);
  const qualityIssues = Array.isArray(draft?.qualityChecks?.issueLabels) && draft.qualityChecks.issueLabels.length
    ? draft.qualityChecks.issueLabels
    : (Array.isArray(draft?.qualityChecks?.issues) ? draft.qualityChecks.issues.map((code) => _draftQualityIssueLabel(code)) : []);
  const synthActionMarkup = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
        <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;${synthRunning ? 'opacity:.6;cursor:not-allowed;' : ''}" onclick="window._workspaceRunSynthIdCheck('${_esc(submissionId)}')" ${synthRunning ? 'disabled' : ''}>${synthRunning ? 'Checking...' : 'Run SynthID Check'}</button>
        <span id="workspace-synthid-status-${_esc(submissionId)}" style="font-size:11px;color:${_esc(synthState?.color || 'var(--muted)')};">${_esc(synthState?.text || '')}</span>
      </div>`;
  const synthIdMarkup = synthId
    ? `<div style="display:grid;gap:8px;padding:10px 12px;border-radius:12px;background:${synthPalette.bg};border:1px solid ${synthPalette.border};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
          <div style="font-size:12px;font-weight:800;color:${synthPalette.fg};">${synthPalette.label}</div>
          <div style="font-size:11px;color:${synthPalette.fg};font-weight:700;">${_esc(synthId.provider || 'provider not set')}${synthId.confidenceBand ? ` · ${_esc(synthId.confidenceBand)}` : ''}</div>
        </div>
        ${synthId.summary ? `<div style="font-size:12px;color:${synthPalette.fg};line-height:1.6;">${_esc(synthId.summary)}</div>` : ''}
        ${synthId.checkedFiles?.length ? `<div style="font-size:11px;color:${synthPalette.fg};line-height:1.6;"><strong>Checked files:</strong> ${synthId.checkedFiles.map((item) => _esc(item.name)).join(', ')}</div>` : ''}
        ${synthId.evidence?.length ? `<div style="display:grid;gap:4px;">${synthId.evidence.map((item) => `<div style="font-size:11px;color:${synthPalette.fg};line-height:1.5;">• ${_esc(item)}</div>`).join('')}</div>` : ''}
        ${synthId.recommendedStaffAction ? `<div style="font-size:11px;color:${synthPalette.fg};line-height:1.6;"><strong>Staff action:</strong> ${_esc(synthId.recommendedStaffAction)}</div>` : ''}
        ${synthId.requiredHumanFollowUp ? `<div style="font-size:11px;color:${synthPalette.fg};line-height:1.6;"><strong>Follow-up:</strong> ${_esc(synthId.requiredHumanFollowUp)}</div>` : ''}
        ${synthActionMarkup}
      </div>`
    : '';

  return `
    <div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);display:grid;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:14px;font-weight:900;color:var(--navy);">AI First Read</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">This is the AI's initial mark, why it landed there, and the draft feedback the marker can amend.</div>
        </div>
        <div style="padding:8px 10px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;min-width:108px;">
          <div style="font-size:10px;font-weight:800;color:#4338ca;text-transform:uppercase;">Initial mark</div>
          <div style="font-size:18px;font-weight:900;color:#4338ca;margin-top:2px;">${_esc(String(overallMark))}</div>
        </div>
      </div>
      ${draft.confidenceNote ? `<div style="padding:10px 12px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);font-size:12px;color:#334155;line-height:1.6;"><strong>Confidence:</strong> ${_esc(draft.confidenceNote)}</div>` : ''}
      ${draft.evidenceBasis ? `<div style="font-size:12px;color:#334155;line-height:1.7;"><strong>Evidence basis:</strong> ${_esc(draft.evidenceBasis)}</div>` : ''}
      ${draft?.qualityChecks?.passed === false ? `<div style="padding:10px 12px;border:1px solid #fdba74;border-radius:12px;background:#fff7ed;font-size:12px;color:#9a3412;line-height:1.6;"><strong>Manual review required.</strong> The automatic draft was withheld because ${qualityIssues.length ? qualityIssues.join('; ').toLowerCase() : 'the quality checks failed'}. Rebuild the mark against the source document before sending it forward.</div>` : ''}
      ${synthIdMarkup}
      ${evidenceState.insufficient ? `<div style="padding:10px 12px;border:1px solid #fbbf24;border-radius:12px;background:#fffbeb;font-size:12px;color:#92400e;line-height:1.6;">Readable evidence was limited, so this remains <strong>manual review required</strong> rather than a defended final score.</div>` : ''}
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:8px;">Why the mark landed here</div>
        <div style="display:grid;gap:8px;max-height:280px;overflow:auto;padding-right:2px;">
          ${criterionRows.map((row) => `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;"><div style="font-size:12px;font-weight:800;color:var(--navy);">${_esc(row.criterion)}</div><div style="font-size:11px;font-weight:800;color:#4338ca;">${row.provisionalMark == null ? 'Unscored' : `${_esc(String(row.provisionalMark))}/${_esc(String(row.maxMark || '—'))}`}</div></div><div style="font-size:12px;color:#334155;line-height:1.6;margin-top:6px;">${_esc(row.rationale || 'No criterion-level justification was saved for this row yet.')}</div></div>`).join('') || '<div style="font-size:12px;color:var(--muted);">No criterion-level justifications were saved.</div>'}
        </div>
      </div>
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:8px;">Draft student feedback</div>
        <div style="display:grid;gap:8px;">
          ${feedbackBlocks.map(([label, value]) => `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:white;"><div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;">${_esc(label)}</div><div style="font-size:12px;color:#334155;line-height:1.7;margin-top:6px;">${_esc(value)}</div></div>`).join('')}
        </div>
      </div>
      ${Array.isArray(draft.actionItems) && draft.actionItems.length ? `<div><div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:8px;">Immediate actions for the student</div><div style="display:grid;gap:6px;">${draft.actionItems.map((item, idx) => `<div style="font-size:12px;color:#334155;line-height:1.6;">${idx + 1}. ${_esc(item)}</div>`).join('')}</div></div>` : ''}
      ${_renderWorkspaceAiQuickPrompts(submissionId)}
    </div>`;
}

function _renderWorkspaceAiAssistantCard(submissionId, chatEnabled = true) {
  return `
    <div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);display:grid;gap:10px;">
      <div>
        <div style="font-size:14px;font-weight:900;color:var(--navy);">AI Assistant</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">Ask one short question, or use the quick actions above. The reply stays grounded in the current script, mark draft, and rubric.</div>
      </div>
      ${chatEnabled ? '' : `<div style="padding:10px 12px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;font-size:12px;color:#92400e;line-height:1.6;">Browser-side AI chat is disabled in this build. Automatic pre-marking still works, but this assistant cannot answer follow-up questions here.</div>`}
      <div id="workspace-ai-messages-${_esc(submissionId)}" style="display:grid;gap:8px;max-height:220px;overflow:auto;padding-right:2px;"></div>
      <textarea id="workspace-ai-input-${_esc(submissionId)}" rows="2" placeholder="Ask about the current mark, weak evidence, or how to improve the feedback." style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:10px;font-size:12px;resize:vertical;font-family:inherit;${chatEnabled ? '' : 'background:#f8fafc;color:#64748b;'}" ${chatEnabled ? '' : 'disabled'}></textarea>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;${chatEnabled ? '' : 'opacity:.6;cursor:not-allowed;'}" onclick="window._workspaceAskAi('${_esc(submissionId)}')" ${chatEnabled ? '' : 'disabled'}>Ask</button>
        <button type="button" class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;${chatEnabled ? '' : 'opacity:.6;cursor:not-allowed;'}" onclick="window._workspaceReviseFeedback('${_esc(submissionId)}')" ${chatEnabled ? '' : 'disabled'}>Apply To Feedback</button>
        <span id="workspace-ai-chat-status-${_esc(submissionId)}" style="font-size:11px;color:var(--muted);"></span>
      </div>
    </div>`;
}

function _renderMarkingWorkspace() {
  const ctx = _activeWorkspaceContext();
  const root = _ensureWorkspaceRoot();
  if (!ctx) {
    root.innerHTML = '';
    document.body.style.overflow = '';
    return;
  }

  const { student, sub, assignment, record, cfg, meta, similarity, integrity, canTutorMark, canModerate, canPost, canRetractRelease, canAnnotate, eltAssessment, eltAssessmentText } = ctx;
  const evidenceState = detectEltInsufficientEvidence(eltAssessment || {});
  const reviewSource = _normalizeReviewSource(record?.moderation || record?.tutorReview || record?.aiDraft || {}, cfg);
  const reasons = record?.moderationReasons || {};
  const autoAi = _autoAiState(sub.assessmentId, student.uid, sub.id);
  const synthIdState = _manualSynthIdState(sub.assessmentId, student.uid, sub.id);
  const activeView = ctx.active?.viewTab === 'annotated' ? 'annotated' : 'document';
  const activeFiles = Array.isArray(sub.files) ? sub.files : [];
  const activeFileIndex = Math.max(0, Math.min(Number(ctx.active?.fileIndex) || 0, Math.max(activeFiles.length - 1, 0)));
  const activeFile = activeFiles[activeFileIndex] || null;
  const aiDraftRecord = record?.aiDraft ? _coerceDraftShape(record.aiDraft, cfg) : null;
  const workflowHistory = _workflowHistoryRows(record);
  const headerTitle = `${student.name} · ${cfg?.badge || cfg?.id || sub.assessmentId?.toUpperCase() || 'Assessment'}`;
  const workflowGuide = canModerate
    ? 'Review the AI first read, adjust the moderation form only where needed, then finalise it for posting.'
    : (canRetractRelease
      ? 'This script has been released to the student. Withdraw it only if the mark or feedback needs correction before re-release.'
      : (canPost
      ? 'This script is finalised. Release it to make the mark and feedback visible to the student.'
      : 'Read the script, check the AI first read, adjust the review if needed, then send it on.'));
  const aiDraftBadge = record?.aiDraft
    ? `<div style="font-size:12px;font-weight:800;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;padding:6px 10px;">Initial mark: ${evidenceState.insufficient || aiDraftRecord?.qualityChecks?.passed === false ? 'Manual review' : (aiDraftRecord?.overallMark ?? record.aiDraft.overallMark ?? '—')}</div>`
    : (autoAi?.running
      ? '<div style="font-size:12px;font-weight:800;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:6px 10px;">Preparing mark...</div>'
      : '<div style="font-size:11px;color:var(--muted);font-weight:700;">Preparing on open</div>');
  const aiConversationBadge = _clientAiAvailable()
    ? '<div style="font-size:11px;color:var(--muted);font-weight:700;">Click to open</div>'
    : '<div style="font-size:11px;color:#92400e;font-weight:700;">Disabled in this build</div>';
  const aiSummaryMarkup = _renderWorkspaceAiSummaryCard(sub.id, aiDraftRecord, evidenceState, integrity, synthIdState);
  const aiAssistantMarkup = _renderWorkspaceAiAssistantCard(sub.id, _clientAiAvailable());
  const queueMeta = _workspaceQueueMeta(sub.id, student.uid);
  const previousStudent = queueMeta.previous;
  const nextStudent = queueMeta.next;
  const queueLabel = queueMeta.index >= 0 ? `${queueMeta.index + 1} of ${queueMeta.total}` : `${queueMeta.total}`;
  const prevSubmissionDisabled = !previousStudent;
  const nextSubmissionDisabled = !nextStudent;
  const markerDecisionMarkup = canTutorMark
    ? _renderReviewForm(
      sub.id,
      cfg,
      reviewSource,
      'tutor',
      'Amend Mark / Tutor Review',
      'If you agree with the AI mark and feedback, send it as-is. Amend the mark only when needed, and justify any criterion mark changes with evidence.',
      `<button class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._saveTutorReview('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Send To Lecturer Queue</button><button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;border-color:#92400e;color:#92400e;" onclick="window._escalateSubmissionToLecturer('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Escalate</button>`
    )
    : (canModerate
      ? _renderReviewForm(
        sub.id,
        cfg,
        reviewSource,
        'moderation',
        'Lecturer Moderation Decision',
        'Approve or amend the marker decision, then finalise it for posting.',
        `<select id="moderation-resolution-${sub.id}" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;"><option value="">Integrity resolution</option><option value="no_issue" ${record?.moderation?.integrityResolutionStatus === 'no_issue' ? 'selected' : ''}>No issue</option><option value="needs_student_clarification" ${record?.moderation?.integrityResolutionStatus === 'needs_student_clarification' ? 'selected' : ''}>Needs student clarification</option><option value="formal_escalation" ${record?.moderation?.integrityResolutionStatus === 'formal_escalation' ? 'selected' : ''}>Formal escalation</option></select><button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;border-color:#9a3412;color:#9a3412;" onclick="window._returnSubmissionToTutor('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Return To Tutor</button><button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._saveModerationDraft('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Save Draft</button><button class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._releaseModerationFeedback('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Ready For Release</button><textarea id="moderation-resolution-note-${sub.id}" rows="2" placeholder="Staff-only integrity or moderation note" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;margin-top:8px;">${_esc(record?.returnedToTutorReason || record?.moderation?.integrityResolution || '')}</textarea>`
      )
      : _renderMarkerDecisionUnavailable(ctx));
  const releaseControlMarkup = (canPost || canRetractRelease || record?.postedAt)
    ? `<div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);display:grid;gap:10px;"><div><div style="font-size:14px;font-weight:900;color:var(--navy);">Release Control</div><div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">Ready-for-release scripts stay staff-only until they are released to the student submission record. Withdrawing a release removes the mark, feedback, and annotated script from the student's Submission History and returns the script to Open Moderation for correction.</div></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${canPost ? `<button type="button" class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._postSubmissionFeedback('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Release To Student</button>` : ''}${canRetractRelease ? `<button type="button" class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;border-color:#be123c;color:#be123c;" onclick="window._retractSubmissionFeedback('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Withdraw From Student</button>` : ''}<span id="posting-status-${_esc(sub.id)}" style="font-size:11px;color:var(--muted);">${record?.postedAt ? `Released ${_esc(_fmtDate(record.postedAt))}${record?.postedByName ? ` by ${_esc(record.postedByName)}` : ''}` : (record?.releaseRetractedAt ? `Withdrawn ${_esc(_fmtDate(record.releaseRetractedAt))}` : 'Ready to release to the student.')}</span></div></div>`
    : '';

  root.innerHTML = `
    <div style="position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.58);backdrop-filter:blur(4px);display:flex;align-items:stretch;justify-content:center;padding:8px;" onclick="if(event.target===this) window._closeMarkingWorkspace()">
      <div style="width:min(1960px,calc(100vw - 16px));height:calc(100vh - 16px);background:#f8fafc;border:1px solid rgba(148,163,184,.28);border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.28);display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,#ffffff,#eff6ff);display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div style="font-size:17px;font-weight:900;color:var(--navy);">${_esc(headerTitle)}</div>
              <span style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;background:${meta.bg};color:${meta.fg};border:1px solid ${meta.border};">${_esc(meta.label)}</span>
              ${sub.isLate ? '<span style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fbbf24;">Late submission</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:6px;">${_esc(student.email)}${student.studentNumber ? ` · ${_esc(student.studentNumber)}` : ''}${student.group ? ` · Group ${_esc(student.group)}` : ''} · Assigned marker: ${_esc(assignment.markerName || 'Unassigned')}${assignment.markerRole ? ` (${_esc(_roleLabel(assignment.markerRole))})` : ''} · Submitted ${_esc(_fmtDate(sub.submittedAt))}</div>
            <div style="font-size:11px;color:#334155;line-height:1.6;margin-top:6px;">${_esc(workflowGuide)}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;border-radius:12px;background:white;border:1px solid var(--border);">
              <button type="button" ${prevSubmissionDisabled ? 'disabled' : ''} onclick="window._stepMarkingWorkspaceSubmission(-1)" style="padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:${prevSubmissionDisabled ? '#f8fafc' : 'white'};color:${prevSubmissionDisabled ? '#94a3b8' : '#334155'};font-size:12px;font-weight:800;cursor:${prevSubmissionDisabled ? 'not-allowed' : 'pointer'};">Previous submission</button>
              <div style="font-size:11px;font-weight:800;color:var(--muted);min-width:64px;text-align:center;">${queueLabel}</div>
              <button type="button" ${nextSubmissionDisabled ? 'disabled' : ''} onclick="window._stepMarkingWorkspaceSubmission(1)" style="padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:${nextSubmissionDisabled ? '#f8fafc' : 'white'};color:${nextSubmissionDisabled ? '#94a3b8' : '#334155'};font-size:12px;font-weight:800;cursor:${nextSubmissionDisabled ? 'not-allowed' : 'pointer'};">Next submission</button>
            </div>
            <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:white;border:1px solid var(--border);font-size:11px;font-weight:800;color:#334155;">
              <input type="checkbox" ${_markingWorkspace.autoAdvance ? 'checked' : ''} onchange="window._setMarkingWorkspaceAutoAdvance(this.checked)" />
              Auto-advance
            </label>
            <div style="padding:8px 12px;border-radius:12px;background:white;border:1px solid #bbf7d0;min-width:110px;">
              <div style="font-size:10px;font-weight:800;color:#166534;text-transform:uppercase;">Similarity</div>
              <div style="font-size:18px;font-weight:900;color:#166534;margin-top:2px;">${similarity}%</div>
            </div>
            <div style="padding:8px 12px;border-radius:12px;background:white;border:1px solid ${(integrity?.suspicionScore || 0) >= 60 ? '#fecaca' : 'var(--border)'};min-width:120px;">
              <div style="font-size:10px;font-weight:800;color:${(integrity?.suspicionScore || 0) >= 60 ? '#991b1b' : '#475569'};text-transform:uppercase;">Integrity</div>
              <div style="font-size:18px;font-weight:900;color:${(integrity?.suspicionScore || 0) >= 60 ? '#991b1b' : 'var(--navy)'};margin-top:2px;">${integrity?.suspicionScore != null ? integrity.suspicionScore : '—'}</div>
            </div>
            <button type="button" class="btn-prev" style="display:inline-flex;padding:8px 14px;" onclick="window._closeMarkingWorkspace()">Close</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0,3.1fr) minmax(290px,.58fr);min-height:0;">
          <div style="display:grid;grid-template-rows:auto minmax(0,1fr);gap:0;min-height:0;border-right:1px solid var(--border);background:#e2e8f0;">
            <div style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:13px;font-weight:900;color:var(--navy);">Submission Surface</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;">Read the student's document first. Add comments directly on the viewed file or switch to text annotations when you need quote-level commenting.</div>
                <div style="font-size:11px;color:#334155;margin-top:6px;font-weight:700;">Current file: ${_esc(activeFile?.name || 'No file selected')}${activeFiles.length ? ` · ${activeFileIndex + 1} of ${activeFiles.length}` : ''}</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
                <button type="button" onclick="window._setMarkingWorkspaceView('${_esc(sub.id)}','document')" style="padding:8px 12px;border-radius:10px;border:1px solid ${activeView === 'document' ? '#93c5fd' : 'var(--border)'};background:${activeView === 'document' ? '#eff6ff' : 'white'};color:${activeView === 'document' ? '#1d4ed8' : '#334155'};font-size:12px;font-weight:${activeView === 'document' ? '800' : '700'};cursor:pointer;">Document Preview</button>
                <button type="button" onclick="window._setMarkingWorkspaceView('${_esc(sub.id)}','annotated')" style="padding:8px 12px;border-radius:10px;border:1px solid ${activeView === 'annotated' ? '#93c5fd' : 'var(--border)'};background:${activeView === 'annotated' ? '#eff6ff' : 'white'};color:${activeView === 'annotated' ? '#1d4ed8' : '#334155'};font-size:12px;font-weight:${activeView === 'annotated' ? '800' : '700'};cursor:pointer;">Annotated Submission</button>
                ${canAnnotate ? `<button type="button" onclick="window._openWorkspacePreviewNote('${_esc(sub.id)}', ${Number(ctx.active?.fileIndex) || 0})" style="padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:white;color:#334155;font-size:12px;font-weight:700;cursor:pointer;">Add Comment To File</button>` : ''}
                <div id="workspace-file-tabs-${_esc(sub.id)}" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;"></div>
              </div>
            </div>
            <div style="min-height:0;position:relative;background:white;">
              <div id="workspace-preview-panel-${_esc(sub.id)}" style="display:${activeView === 'document' ? 'block' : 'none'};height:100%;min-height:0;background:white;">
                <div id="workspace-preview-${_esc(sub.id)}" style="height:100%;min-height:0;background:white;"></div>
              </div>
              <div id="workspace-annotated-panel-${_esc(sub.id)}" style="display:${activeView === 'annotated' ? 'block' : 'none'};height:100%;min-height:0;padding:16px;background:#f8fafc;overflow:auto;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                  <div>
                    <div style="font-size:13px;font-weight:900;color:var(--navy);">Inline Annotations on Submission Text</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px;">Select text to add marker comments. AI annotations and approved marker notes appear inline and remain tied to the submission text.</div>
                  </div>
                  <div style="font-size:11px;color:var(--muted);">Source files: ${(sub.files || []).length}</div>
                </div>
                <div id="workspace-gi-mount-${_esc(sub.id)}"></div>
              </div>
              <div id="workspace-preview-popover-${_esc(sub.id)}" style="display:none;position:fixed;z-index:10020;background:white;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 18px 40px rgba(15,23,42,.2);width:300px;">
                <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:6px;">Preview Annotation</div>
                <div id="workspace-preview-anchor-${_esc(sub.id)}" style="font-size:11px;color:#64748b;background:#f8fafc;border-radius:8px;padding:6px 8px;line-height:1.6;margin-bottom:8px;"></div>
                <textarea id="workspace-preview-comment-${_esc(sub.id)}" rows="3" placeholder="Add a linked comment for this submission..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;">
                  <button type="button" onclick="window._saveWorkspacePreviewAnnotation('${_esc(sub.id)}')" style="flex:1;padding:7px 10px;border-radius:8px;border:none;background:#1d4ed8;color:white;font-size:12px;font-weight:800;cursor:pointer;">Save</button>
                  <button type="button" onclick="window._closeWorkspacePreviewPopover('${_esc(sub.id)}')" style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:#f8fafc;color:#475569;font-size:12px;cursor:pointer;">Cancel</button>
                </div>
              </div>
            </div>
          </div>

          <div style="min-height:0;overflow:auto;padding:10px;background:#f8fafc;display:grid;gap:10px;align-content:start;">
            ${markerDecisionMarkup}
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
              <div style="padding:10px 12px;border-radius:12px;background:white;border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">Status</div>
                <div style="font-size:14px;font-weight:900;color:var(--navy);margin-top:4px;">${_esc(meta.label)}</div>
              </div>
              <div style="padding:10px 12px;border-radius:12px;background:white;border:1px solid var(--border);">
                <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">Mark</div>
                <div style="font-size:14px;font-weight:900;color:#4338ca;margin-top:4px;">${record?.aiDraft ? (evidenceState.insufficient || aiDraftRecord?.qualityChecks?.passed === false ? 'Manual review' : (aiDraftRecord?.overallMark ?? record.aiDraft.overallMark ?? '—')) : '—'}</div>
              </div>
            </div>
            ${releaseControlMarkup}
            ${workflowHistory.length ? `<div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);display:grid;gap:8px;"><div><div style="font-size:14px;font-weight:900;color:var(--navy);">Workflow History</div><div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">Recent status changes on this grading record.</div></div><div style="display:grid;gap:8px;">${workflowHistory.map((item) => `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;"><div style="font-size:12px;font-weight:800;color:var(--navy);">${_esc(String(item.event || 'workflow_update').replace(/_/g, ' '))}</div><div style="font-size:11px;color:#64748b;">${_esc(_fmtDate(item.at || item.timestamp || ''))}</div></div><div style="font-size:11px;color:#475569;line-height:1.6;margin-top:6px;">${_esc(item.byName || item.byUid || 'System')}${item.note ? ` · ${_esc(item.note)}` : ''}</div></div>`).join('')}</div></div>` : ''}
            ${aiSummaryMarkup}
            <div style="padding:14px;border-radius:16px;background:white;border:1px solid var(--border);display:grid;gap:10px;">
              <div>
                <div style="font-size:14px;font-weight:900;color:var(--navy);">AI Draft Controls</div>
                <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">Refresh the initial mark, inspect extraction quality, or add short evidence notes from the document.</div>
                <div id="auto-ai-status-${_esc(sub.id)}" style="font-size:11px;color:${_esc(autoAi?.color || 'var(--muted)')};font-weight:800;margin-top:6px;">${_esc(autoAi?.text || (record?.aiDraft ? 'AI mark and feedback are ready.' : 'Preparing AI mark and feedback...'))}</div>
              </div>
              <div style="margin-top:2px;"><div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:6px;">Evidence notes</div><textarea id="ai-evidence-${_esc(sub.id)}" rows="3" placeholder="Paste short evidence excerpts from the document when the AI needs a stronger basis for the mark." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;">${_esc(record?.evidenceNotes || '')}</textarea></div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${(_isLecturerRole() || canTutorMark) ? `<button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._generateSubmissionAIDraft('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">${record?.aiDraft ? 'Refresh AI First Read' : 'Generate AI First Read'}</button><button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;border-color:#475569;color:#334155;" onclick="window._inspectSubmissionExtraction('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Check Extraction</button>` : ''}${canTutorMark && record?.aiDraft ? `<button class="btn-next" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="window._acceptSubmissionAIDraft('${_esc(sub.assessmentId)}','${_esc(student.uid)}','${_esc(sub.id)}')">Accept Draft To Queue</button>` : ''}<span id="ai-status-${_esc(sub.id)}" style="font-size:11px;color:var(--muted);"></span></div>
              <div id="extraction-diagnostics-wrap-${_esc(sub.id)}"></div>
              ${_renderModerationReasonChips(reasons)}
            </div>
            ${_renderReleasedFeedback(sub.feedback)}
            ${aiAssistantMarkup}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.style.overflow = 'hidden';
  _renderWorkspaceFileTabs(ctx);
  _renderWorkspaceChatMessages(sub.id);
  const giMount = document.getElementById(`workspace-gi-mount-${sub.id}`);
  if (giMount) {
    renderGradingInterface(giMount, {
      submissionId: sub.id,
      studentUid: student.uid,
      assessmentId: sub.assessmentId,
      studentText: eltAssessmentText || '',
      subFiles: Array.isArray(sub.files) ? sub.files : [],
      markerAnnotations: _normalizeFirebaseArray(record?.markerAnnotations),
      eltAnnotations: eltAssessment?.annotations || null,
      eltAssessment: eltAssessment || null,
      mode: canModerate ? 'moderator' : 'tutor',
      canEdit: canAnnotate,
    });
  }
  _loadMarkingWorkspacePreview(sub.id, ctx.active.fileIndex);
}

function _focusWorkspaceReviewForm(submissionId, mode = '') {
  const targetId = `${mode || _workspaceReviewPrefix(_activeWorkspaceContext())}-review-form-${submissionId}`;
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.style.boxShadow = '0 0 0 4px rgba(34,197,94,.22)';
  window.setTimeout(() => { target.style.boxShadow = ''; }, 1800);
  const firstInput = target.querySelector('input[type="number"], textarea');
  firstInput?.focus?.();
}

window._openMarkingWorkspace = function (assessmentId, studentUid, submissionId, fileIndex = 0, focusReview = false) {
  _markingWorkspace.active = {
    assessmentId: String(assessmentId || '').trim(),
    studentUid: String(studentUid || '').trim(),
    submissionId: String(submissionId || '').trim(),
    fileIndex: Number(fileIndex) || 0,
    viewTab: 'document',
    focusReview: Boolean(focusReview),
  };
  _renderMarkingWorkspace();
  if (focusReview) {
    window.setTimeout(() => _focusWorkspaceReviewForm(String(submissionId || '').trim()), 120);
  }
  window.setTimeout(() => {
    _ensureWorkspaceAIDraft(assessmentId, studentUid, submissionId);
  }, 0);
};

window._setMarkingWorkspaceAutoAdvance = function (checked) {
  _markingWorkspace.autoAdvance = Boolean(checked);
};

window._stepMarkingWorkspaceSubmission = function (direction = 1) {
  const active = _markingWorkspace.active;
  if (!active?.submissionId || !active?.studentUid) return;
  const queueMeta = _workspaceQueueMeta(active.submissionId, active.studentUid);
  if (queueMeta.index < 0) return;
  const target = Number(direction) < 0 ? queueMeta.previous : queueMeta.next;
  if (!target?.latest) return;
  const nextAssessmentId = String(target.latest.assessmentId || active.assessmentId || '').trim();
  const nextStudentUid = String(target.uid || '').trim();
  const nextSubmissionId = String(target.latest.id || '').trim();
  const nextViewTab = active.viewTab === 'annotated' ? 'annotated' : 'document';
  window._closeWorkspacePreviewPopover(active.submissionId);
  _markingWorkspace.active = {
    assessmentId: nextAssessmentId,
    studentUid: nextStudentUid,
    submissionId: nextSubmissionId,
    fileIndex: 0,
    viewTab: nextViewTab,
  };
  _renderMarkingWorkspace();
  window.setTimeout(() => {
    _ensureWorkspaceAIDraft(nextAssessmentId, nextStudentUid, nextSubmissionId);
  }, 0);
};

window._closeMarkingWorkspace = function () {
  if (_markingWorkspace.active?.submissionId) delete _markingWorkspace.previewDraft[_markingWorkspace.active.submissionId];
  _markingWorkspace.active = null;
  const root = _workspaceRoot();
  if (root) root.innerHTML = '';
  document.body.style.overflow = '';
};

window._rerenderMarkingWorkspace = function () {
  if (!_markingWorkspace.active) return;
  _renderMarkingWorkspace();
};

window._setMarkingWorkspaceView = function (submissionId, view = 'document') {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  _markingWorkspace.active.viewTab = view === 'annotated' ? 'annotated' : 'document';
  _renderMarkingWorkspace();
};

window._workspaceRunAiQuickAction = function (submissionId, prompt = '', mode = 'ask') {
  const inputEl = document.getElementById(`workspace-ai-input-${submissionId}`);
  if (inputEl) inputEl.value = String(prompt || '').trim();
  if (mode === 'revise') {
    window._workspaceReviseFeedback(submissionId);
    return;
  }
  window._workspaceAskAi(submissionId);
};

function _openWorkspacePreviewPopover(submissionId, draft = {}, rect = null) {
  const popover = document.getElementById(`workspace-preview-popover-${submissionId}`);
  const anchor = document.getElementById(`workspace-preview-anchor-${submissionId}`);
  const input = document.getElementById(`workspace-preview-comment-${submissionId}`);
  if (!popover) return;
  _markingWorkspace.previewDraft[submissionId] = { ...(draft || {}) };
  if (anchor) {
    anchor.textContent = draft?.quote
      ? `"${String(draft.quote || '').slice(0, 180)}${String(draft.quote || '').length > 180 ? '…' : ''}"`
      : `Linked to ${draft?.fileName || 'current file'}`;
  }
  if (input) input.value = '';
  popover.style.display = 'block';
  const top = Math.min(rect?.bottom != null ? rect.bottom + 10 : 120, window.innerHeight - 240);
  const left = Math.min(rect?.left != null ? rect.left : 80, window.innerWidth - 320);
  popover.style.top = `${Math.max(12, top)}px`;
  popover.style.left = `${Math.max(12, left)}px`;
  if (input) window.setTimeout(() => input.focus(), 20);
}

window._closeWorkspacePreviewPopover = function (submissionId) {
  const popover = document.getElementById(`workspace-preview-popover-${submissionId}`);
  if (popover) popover.style.display = 'none';
  delete _markingWorkspace.previewDraft[submissionId];
};

window._handleWorkspacePreviewSelection = function (submissionId, fileIndex = 0) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const ctx = _activeWorkspaceContext();
  if (!ctx || !ctx.canAnnotate) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const quote = String(selection.toString() || '').trim();
  if (!quote || quote.length < 3) return;
  const file = Array.isArray(ctx.sub.files) ? ctx.sub.files[fileIndex] : null;
  let rect = null;
  try {
    rect = selection.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
  } catch {
    rect = null;
  }
  _openWorkspacePreviewPopover(submissionId, {
    mode: 'selection',
    fileIndex: Number(fileIndex) || 0,
    fileName: file?.name || '',
    quote,
    previewKind: 'selection',
  }, rect);
};

window._openWorkspacePreviewNote = function (submissionId, fileIndex = 0) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const ctx = _activeWorkspaceContext();
  if (!ctx || !ctx.canAnnotate) return;
  const file = Array.isArray(ctx.sub.files) ? ctx.sub.files[fileIndex] : null;
  _openWorkspacePreviewPopover(submissionId, {
    mode: 'file',
    fileIndex: Number(fileIndex) || 0,
    fileName: file?.name || '',
    quote: '',
    previewKind: 'linked-note',
  });
};

window._saveWorkspacePreviewAnnotation = async function (submissionId) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const ctx = _activeWorkspaceContext();
  if (!ctx) return;
  const draft = _markingWorkspace.previewDraft[submissionId];
  if (!draft) return;
  const input = document.getElementById(`workspace-preview-comment-${submissionId}`);
  const comment = _cleanText(input?.value || '', 1000);
  if (!comment) {
    if (input) input.focus();
    return;
  }
  const annotation = {
    quote: _cleanText(draft.quote || '', 1000),
    comment,
    markerUid: STATE.user?.uid || '',
    markerName: STATE.user?.displayName?.split(' [')[0]?.trim() || '',
    markerRole: String(STATE.user?._resolvedRole || STATE.user?.profile?.role || '').trim().toLowerCase(),
    anchor: {
      mode: draft.mode || 'file',
      fileIndex: Number(draft.fileIndex) || 0,
      fileName: draft.fileName || '',
      previewKind: draft.previewKind || '',
    },
  };
  const result = await saveMarkerAnnotation(ctx.sub.assessmentId, ctx.student.uid, ctx.sub.id, annotation);
  if (!result.ok) return;
  _upsertWorkspaceMarkerAnnotation(ctx.sub.assessmentId, ctx.student.uid, ctx.sub.id, result.annotation || { ...annotation, id: result.annotationId });
  window._closeWorkspacePreviewPopover(submissionId);
  _renderMarkingWorkspace();
};

window._focusWorkspacePreviewCard = function (submissionId, fileIndex, annotationIdx) {
  const card = document.getElementById(_workspacePreviewCardId(submissionId, fileIndex, annotationIdx));
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  card.style.outline = '2px solid #6366f1';
  window.setTimeout(() => { card.style.outline = ''; }, 1200);
};

window._focusWorkspacePreviewEntry = function (submissionId, fileIndex, annotationIdx, giIdx = -1) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const hit = document.getElementById(_workspacePreviewHitId(submissionId, fileIndex, annotationIdx, 0));
  if (hit) {
    hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    hit.style.outline = '2px solid #6366f1';
    window.setTimeout(() => { hit.style.outline = ''; }, 1200);
    return;
  }
  _markingWorkspace.active.viewTab = 'annotated';
  _renderMarkingWorkspace();
  window.setTimeout(() => {
    if (Number.isFinite(Number(giIdx)) && Number(giIdx) >= 0 && typeof window._giFocusHit === 'function') window._giFocusHit(submissionId, Number(giIdx));
  }, 120);
};

async function _ensureWorkspaceAIDraft(assessmentId, studentUid, submissionId) {
  const safeAssessmentId = String(assessmentId || '').trim();
  const safeStudentUid = String(studentUid || '').trim();
  const safeSubmissionId = String(submissionId || '').trim();
  if (!safeAssessmentId || !safeStudentUid || !safeSubmissionId) return;
  if (_markingWorkspace.active?.submissionId !== safeSubmissionId) return;

  const existingState = _autoAiState(safeAssessmentId, safeStudentUid, safeSubmissionId);
  if (existingState?.running) return;

  const ctx = _activeWorkspaceContext();
  if (!ctx || ctx.sub.id !== safeSubmissionId) return;
  if (ctx.status === GRADING_STATUS.FINALISED) return;
  if (!(_isLecturerRole() || ctx.canTutorMark)) return;
  if (!_draftNeedsAiRefresh(ctx.record || {})) {
    _setAutoAiState(safeAssessmentId, safeStudentUid, safeSubmissionId, {
      running: false,
      text: ctx.record?.aiDraft?.qualityChecks?.passed === false ? 'AI draft was withheld. Manual review is required.' : 'AI mark and feedback are ready.',
      color: ctx.record?.aiDraft?.qualityChecks?.passed === false ? '#9a3412' : '#166534',
    });
    return;
  }

  _setAutoAiState(safeAssessmentId, safeStudentUid, safeSubmissionId, {
    running: true,
    text: 'Preparing AI mark and feedback for this submission...',
    color: 'var(--muted)',
  });

  try {
    await _generateBestAvailableAIDraft(safeAssessmentId, safeStudentUid, safeSubmissionId, {
      student: ctx.student,
      assignment: ctx.assignment,
      cfg: ctx.cfg,
      record: ctx.record || {},
      statusEl: document.getElementById(`ai-status-${safeSubmissionId}`) || document.getElementById(`auto-ai-status-${safeSubmissionId}`),
      preferElt: true,
      refreshAfterSave: false,
    });
    await _loadReviewerState(safeAssessmentId);
    _setAutoAiState(safeAssessmentId, safeStudentUid, safeSubmissionId, {
      running: false,
      text: _gradingRecords?.[safeStudentUid]?.[safeSubmissionId]?.aiDraft?.qualityChecks?.passed === false ? 'AI draft was withheld. Manual review is required.' : 'AI mark and feedback are ready.',
      color: _gradingRecords?.[safeStudentUid]?.[safeSubmissionId]?.aiDraft?.qualityChecks?.passed === false ? '#9a3412' : '#166534',
    });
    if (_markingWorkspace.active?.submissionId === safeSubmissionId) {
      _renderMarkingWorkspace();
    }
    const mount = document.getElementById('staff-submissions-mount');
    if (mount) _renderStaffSubmissionList(mount);
  } catch (err) {
    _setAutoAiState(safeAssessmentId, safeStudentUid, safeSubmissionId, {
      running: false,
      text: err?.message || 'AI marking could not be prepared automatically.',
      color: '#991b1b',
    });
    const statusEl = document.getElementById(`ai-status-${safeSubmissionId}`);
    if (statusEl) {
      statusEl.textContent = err?.message || 'AI marking could not be prepared automatically.';
      statusEl.style.color = '#991b1b';
    }
  }
}

window._workspaceRunSynthIdCheck = async function (submissionId) {
  const ctx = _activeWorkspaceContext();
  if (!ctx || ctx.sub.id !== submissionId) return;
  const assessmentId = String(ctx.sub.assessmentId || '').trim();
  const studentUid = String(ctx.student?.uid || '').trim();
  const safeSubmissionId = String(submissionId || '').trim();
  if (!assessmentId || !studentUid || !safeSubmissionId) return;
  const existingState = _manualSynthIdState(assessmentId, studentUid, safeSubmissionId);
  if (existingState?.running) return;

  _setManualSynthIdState(assessmentId, studentUid, safeSubmissionId, {
    running: true,
    text: 'Checking SynthID provenance...',
    color: 'var(--muted)',
  });
  _renderMarkingWorkspace();

  try {
    const result = await runSubmissionSynthIdCheck(assessmentId, studentUid, safeSubmissionId);
    if (!result.ok) throw new Error(result.error || 'SynthID check failed.');
    await _loadReviewerState(assessmentId);
    _setManualSynthIdState(assessmentId, studentUid, safeSubmissionId, {
      running: false,
      text: 'SynthID check saved to this grading record.',
      color: '#166534',
    });
    if (_markingWorkspace.active?.submissionId === safeSubmissionId) _renderMarkingWorkspace();
    const mount = document.getElementById('staff-submissions-mount');
    if (mount) _renderStaffSubmissionList(mount);
  } catch (err) {
    _setManualSynthIdState(assessmentId, studentUid, safeSubmissionId, {
      running: false,
      text: err?.message || 'SynthID check failed.',
      color: '#991b1b',
    });
    if (_markingWorkspace.active?.submissionId === safeSubmissionId) _renderMarkingWorkspace();
  }
};

window._selectMarkingWorkspaceFile = function (submissionId, fileIndex) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const nextIndex = Number(fileIndex) || 0;
  if (Number(_markingWorkspace.active.fileIndex) === nextIndex) return;
  window._closeWorkspacePreviewPopover(submissionId);
  _markingWorkspace.active.fileIndex = nextIndex;
  _markingWorkspace.active.viewTab = 'document';
  _renderMarkingWorkspace();
};

window._stepMarkingWorkspaceFile = function (submissionId, delta = 1) {
  if (_markingWorkspace.active?.submissionId !== submissionId) return;
  const ctx = _activeWorkspaceContext();
  const files = Array.isArray(ctx?.sub?.files) ? ctx.sub.files : [];
  if (!files.length) return;
  const currentIndex = Number(_markingWorkspace.active.fileIndex) || 0;
  const nextIndex = Math.max(0, Math.min(currentIndex + (Number(delta) || 0), files.length - 1));
  if (nextIndex === currentIndex) return;
  window._closeWorkspacePreviewPopover(submissionId);
  _markingWorkspace.active.fileIndex = nextIndex;
  _markingWorkspace.active.viewTab = 'document';
  _renderMarkingWorkspace();
};

window._workspaceAskAi = async function (submissionId) {
  const ctx = _activeWorkspaceContext();
  if (!ctx || ctx.sub.id !== submissionId) return;
  if (!_clientAiAvailable()) {
    _setWorkspaceChatStatus(submissionId, 'AI chat is disabled in this build. Use Generate ELT Review or Generate AI Mark instead.', '#92400e');
    return;
  }
  const inputEl = document.getElementById(`workspace-ai-input-${submissionId}`);
  const question = _cleanText(inputEl?.value || '', 2400);
  if (!question) {
    _setWorkspaceChatStatus(submissionId, 'Add a question first.', '#991b1b');
    return;
  }

  _appendWorkspaceMessage(submissionId, 'user', question);
  if (inputEl) inputEl.value = '';
  _setWorkspaceChatStatus(submissionId, 'Thinking...', 'var(--muted)');

  try {
    const bundle = await _ensureWorkspaceExtractionBundle(ctx);
    const prefix = _workspaceReviewPrefix(ctx);
    const currentReview = prefix ? _readReviewFromDom(submissionId, ctx.cfg, prefix) : null;
    const savedAiDraft = ctx.record?.aiDraft ? _normalizeReviewSource(ctx.record.aiDraft, ctx.cfg) : null;
    const savedTutorReview = ctx.record?.tutorReview ? _normalizeReviewSource(ctx.record.tutorReview, ctx.cfg) : null;
    const savedModeration = ctx.record?.moderation ? _normalizeReviewSource(ctx.record.moderation, ctx.cfg) : null;
    const prompt = `You are assisting a university marker inside an in-app marking workspace.

Respond directly to the marker's question about the submission, current draft, and rubric.
Rules:
- Be conservative and evidence-based.
- Do not invent quotations or details from files.
- If the extracted evidence is limited, say so clearly.
- When useful, refer to file names rather than vague references.
- If a provisional or saved mark exists, you may explain how it was reached by referring to criterion rows, rationale, evidence basis, confidence note, and feedback sections.
- Prefer the current editable review form if it contains a mark or filled sections. Otherwise use the saved AI draft or saved review records below.
- Do not output JSON.

Assessment: ${ctx.cfg?.title || ctx.sub.assessmentId}
Brief: ${ctx.cfg?.brief || 'Not configured'}
Rubric criteria: ${(ctx.cfg?.rubric || []).map((row) => row?.criterion).filter(Boolean).join(' | ') || 'Not configured'}
Student note: ${ctx.sub.note || 'None'}
Files: ${(ctx.sub.files || []).map((file) => `${file.name} (${_fmtSize(file.size)})`).join(' | ')}
Extraction summary: ${describeExtractionBundle(bundle || {})}

Extracted content:
${formatExtractionBundleForPrompt(bundle || {}) || 'No extracted content available.'}

Current review draft:
${currentReview ? JSON.stringify(currentReview, null, 2) : 'No editable review form is active yet.'}

Saved AI draft:
${ctx.record?.aiDraft ? JSON.stringify({
      normalizedReview: savedAiDraft,
      overallMark: ctx.record.aiDraft?.overallMark,
      confidenceNote: ctx.record.aiDraft?.confidenceNote || '',
      evidenceBasis: ctx.record.aiDraft?.evidenceBasis || '',
      criterionRows: ctx.record.aiDraft?.criterionRows || [],
      feedback: ctx.record.aiDraft?.feedback || {},
      actionItems: ctx.record.aiDraft?.actionItems || [],
    }, null, 2) : 'No saved AI draft.'}

Saved tutor review:
${savedTutorReview ? JSON.stringify(savedTutorReview, null, 2) : 'No saved tutor review.'}

Saved moderation review:
${savedModeration ? JSON.stringify(savedModeration, null, 2) : 'No saved moderation review.'}

Marker question:
${question}`;

    const reply = await _aiChat(prompt, {
      maxTokens: 1100,
      system: 'You are a careful academic marking assistant. Answer only from the supplied evidence.',
    });
    _appendWorkspaceMessage(submissionId, 'assistant', reply || 'No response returned.');
    _setWorkspaceChatStatus(submissionId, 'Answer ready.', '#166534');
  } catch (err) {
    _setWorkspaceChatStatus(submissionId, err?.message || 'The AI request failed.', '#991b1b');
  }
};

window._workspaceReviseFeedback = async function (submissionId) {
  const ctx = _activeWorkspaceContext();
  if (!ctx || ctx.sub.id !== submissionId) return;
  if (!_clientAiAvailable()) {
    _setWorkspaceChatStatus(submissionId, 'AI feedback revision is disabled in this build. Edit the review form directly.', '#92400e');
    return;
  }
  const prefix = _workspaceReviewPrefix(ctx);
  if (!prefix) {
    _setWorkspaceChatStatus(submissionId, 'No editable review form is available in this workspace state.', '#991b1b');
    return;
  }

  const inputEl = document.getElementById(`workspace-ai-input-${submissionId}`);
  const instruction = _cleanText(inputEl?.value || '', 2400) || 'Tighten the feedback, keep the tone rigorous, and align each section more directly with the evidence and rubric.';
  const currentReview = _readReviewFromDom(submissionId, ctx.cfg, prefix);
  _appendWorkspaceMessage(submissionId, 'user', `Revise current feedback: ${instruction}`);
  if (inputEl) inputEl.value = '';
  _setWorkspaceChatStatus(submissionId, 'Revising current feedback...', 'var(--muted)');

  try {
    const bundle = await _ensureWorkspaceExtractionBundle(ctx);
    const prompt = `You are revising a marker's current feedback draft inside an in-app grading workspace.

Return ONLY valid JSON with this exact shape:
{"mark":0,"sections":{"whereYouAreNow":"","whereYouShouldBe":"","relationToOutcomes":"","whatToDoNext":""},"actionItems":["","",""],"rubricRows":[{"criterion":"","provisionalMark":0,"maxMark":25,"rationale":""}]}

Rules:
- Preserve the intent of the current review unless the instruction clearly asks for change.
- Be conservative and evidence-based.
- Do not invent quotations or claims not supported by the extracted evidence.
- Keep 3 to 5 action items.
- Keep the response usable as final staff-edited feedback.
- Use the rubric criteria already provided.
- Do not add markdown fences.

Assessment: ${ctx.cfg?.title || ctx.sub.assessmentId}
Brief: ${ctx.cfg?.brief || 'Not configured'}
Rubric criteria: ${(ctx.cfg?.rubric || []).map((row) => `${row?.criterion || 'Criterion'} (max ${_criterionMax(row)})`).join(' | ') || 'Not configured'}
Student note: ${ctx.sub.note || 'None'}
Files: ${(ctx.sub.files || []).map((file) => `${file.name} (${_fmtSize(file.size)})`).join(' | ')}
Extraction summary: ${describeExtractionBundle(bundle || {})}

Extracted content:
${formatExtractionBundleForPrompt(bundle || {}) || 'No extracted content available.'}

Current review JSON:
${JSON.stringify(currentReview, null, 2)}

Revision instruction:
${instruction}`;

    const raw = await _aiChat(prompt, {
      maxTokens: 1500,
      system: 'You rewrite academic feedback and output valid JSON only.',
    });

    let revised;
    try {
      revised = _normalizeReviewSource(_safeJsonParse(raw), ctx.cfg);
    } catch (parseErr) {
      revised = _normalizeReviewSource(await _repairMalformedJson(raw, parseErr), ctx.cfg);
    }

    _applyReviewToDom(submissionId, ctx.cfg, prefix, revised);
    _appendWorkspaceMessage(submissionId, 'assistant', 'Revision applied to the live feedback form. Review it, amend anything you want, and then send or release through the normal workflow controls.');
    _setWorkspaceChatStatus(submissionId, 'Revision applied to the form.', '#166534');
  } catch (err) {
    _setWorkspaceChatStatus(submissionId, err?.message || 'The revision request failed.', '#991b1b');
  }
};

function _renderStaffSubmissionList(mount) {
  const submittedStudents = _buildStudentRows();
  const nonSubmitters = _buildNonSubmitterRows(submittedStudents);
  const allStudents = [...submittedStudents, ...nonSubmitters];
  const students = allStudents.filter((student) => _visibleToUser(student));
  if (!students.length) {
    mount.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px;">${_isTutorRole() ? 'No students are currently assigned to you for this assessment.' : 'No roster-matched students or submissions are available for this assessment yet.'}</div>`;
    return;
  }
  const sampledByMarker = _sampledSetByMarker(submittedStudents);

  // Accurate counts — based on all students (not just the visible subset for tutors)
  const totalRecords = _allSubs.filter((s) => s.status !== 'cleared').length;
  const uniqueSubmitters = submittedStudents.length;
  const lateCount = submittedStudents.filter((s) => s.latest?.isLate).length;
  const rosterTotal = _rosterRows.length;
  const notSubmitted = rosterTotal > 0 ? Math.max(0, rosterTotal - uniqueSubmitters) : null;

  const counts = { aiReady: 0, aiStaffReview: 0, aiInProgress: 0, aiFailed: 0, moderation: 0, finalised: 0, posted: 0, pending: 0 };
  submittedStudents.forEach((student) => {
    const status = _workflowStatus(_gradingRecords?.[student.uid]?.[student.latest?.id], _resolveAssignment(student.uid, student.latest?.id, student.group));
    const flags = _queueFlagsForStudent(student, sampledByMarker);
    if (flags.aiProgress?.state === 'ready') counts.aiReady += 1;
    if (flags.aiProgress?.state === 'staff_review') counts.aiStaffReview += 1;
    if (['processing', 'queued', 'submitted', 'retry'].includes(flags.aiProgress?.state)) counts.aiInProgress += 1;
    if (flags.aiProgress?.state === 'manual_review') counts.aiFailed += 1;
    if (status === GRADING_STATUS.MODERATION_REQUIRED || status === GRADING_STATUS.MODERATED) counts.moderation += 1;
    if (status === GRADING_STATUS.FINALISED) counts.finalised += 1;
    if (status === GRADING_STATUS.POSTED) counts.posted += 1;
    if (status === GRADING_STATUS.UNASSIGNED || status === GRADING_STATUS.ASSIGNED) counts.pending += 1;
  });

  students.sort((a, b) => {
    const sa = a.latest ? _workflowStatus(_gradingRecords?.[a.uid]?.[a.latest?.id], _resolveAssignment(a.uid, a.latest?.id, a.group)) : 'not_submitted';
    const sb = b.latest ? _workflowStatus(_gradingRecords?.[b.uid]?.[b.latest?.id], _resolveAssignment(b.uid, b.latest?.id, b.group)) : 'not_submitted';
    return sa.localeCompare(sb) || a.name.localeCompare(b.name);
  });
  const sortedNonSubmitters = _isTutorRole()
    ? []
    : [...nonSubmitters].sort((a, b) => a.name.localeCompare(b.name));
  const bulkLateEligible = _eligibleBulkLateExceptionStudents(sortedNonSubmitters);
  const aiQueue = _queueStateForAssessment(_activeAssessment);
  const aiQueueState = String(aiQueue?.state || '').trim().toLowerCase();
  const aiQueuePending = Math.max(0, Number(aiQueue?.pendingCount || 0));
  const aiQueueProcessed = Math.max(0, Number(aiQueue?.processedInCurrentCycle || 0));
  const aiQueueSucceeded = Math.max(0, Number(aiQueue?.successInCurrentCycle || 0));
  const aiQueueFailed = Math.max(0, Number(aiQueue?.failedInCurrentCycle || 0));
  const aiCompleteCount = Math.min(uniqueSubmitters, counts.aiReady + counts.aiStaffReview);
  const aiActiveCount = Math.min(uniqueSubmitters, counts.aiInProgress);
  const aiManualCount = Math.min(uniqueSubmitters, counts.aiFailed);
  const aiAccountedCount = Math.min(uniqueSubmitters, aiCompleteCount + aiActiveCount + aiManualCount);
  const aiWaitingCount = Math.max(0, uniqueSubmitters - aiAccountedCount);
  const aiCompletionPercent = uniqueSubmitters ? Math.round((aiCompleteCount / uniqueSubmitters) * 100) : 0;
  const aiQueueLabel = aiQueueState === 'running'
    ? 'Background AI queue running'
    : aiQueueState === 'queued'
      ? 'Background AI queue queued'
      : aiQueueState
        ? `Background AI queue ${aiQueueState}`
        : 'Background AI queue idle';
  const aiQueueDetail = aiQueueState === 'running'
    ? `${aiQueueProcessed} processed in this run, ${aiQueuePending} still pending.`
    : aiQueueState === 'queued'
      ? `${aiQueuePending} pending submissions are waiting for the next server pass.`
      : aiQueuePending
        ? `${aiQueuePending} pending submissions are waiting to be queued.`
        : 'No server queue backlog is currently reported.';
  const aiProgressSegment = (count, background, label) => {
    const percent = uniqueSubmitters ? Math.max(0, Math.min(100, (count / uniqueSubmitters) * 100)) : 0;
    if (!count || percent <= 0) return '';
    return `<div title="${_esc(label)}" style="width:${percent}%;min-width:8px;height:100%;background:${background};"></div>`;
  };
  const aiProgressBar = uniqueSubmitters
    ? [
      aiProgressSegment(aiCompleteCount, '#16a34a', `${aiCompleteCount} AI first reads complete`),
      aiProgressSegment(aiActiveCount, 'repeating-linear-gradient(45deg,#2563eb 0 10px,#60a5fa 10px 20px)', `${aiActiveCount} AI marking in progress`),
      aiProgressSegment(aiManualCount, '#f59e0b', `${aiManualCount} manual-review drafts need retry or review`),
      aiProgressSegment(aiWaitingCount, '#cbd5e1', `${aiWaitingCount} waiting for AI pickup`),
    ].join('')
    : '<div style="width:100%;height:100%;background:#e2e8f0;"></div>';

  const isTutor = _isTutorRole();
  const visibleSubmittedStudents = students.filter((student) => student.latest);
  const queueAnalytics = submittedStudents.map((student) => ({
    student,
    flags: _queueFlagsForStudent(student, sampledByMarker),
  }));
  const moderationCounts = {
    moderation: queueAnalytics.filter((entry) => entry.flags.moderationOpen).length,
    readyToPost: queueAnalytics.filter((entry) => entry.flags.readyToPost).length,
    posted: queueAnalytics.filter((entry) => entry.flags.posted).length,
    boundary: queueAnalytics.filter((entry) => entry.flags.boundary).length,
    divergence: queueAnalytics.filter((entry) => entry.flags.divergence).length,
    integrity: queueAnalytics.filter((entry) => entry.flags.integrityFlag).length,
    returned: queueAnalytics.filter((entry) => entry.flags.returned).length,
    weakJustification: queueAnalytics.filter((entry) => entry.flags.weakJustification).length,
    belowPass: queueAnalytics.filter((entry) => entry.flags.belowPass).length,
    borderlineFail: queueAnalytics.filter((entry) => entry.flags.borderlineFail).length,
    highMark: queueAnalytics.filter((entry) => entry.flags.highMark).length,
  };
  const filteredStudents = students
    .filter((student) => _studentMatchesQueueFilter(student, _queueFlagsForStudent(student, sampledByMarker), _staffQueueSearchQuery))
    .sort((a, b) => {
      const flagsA = _queueFlagsForStudent(a, sampledByMarker);
      const flagsB = _queueFlagsForStudent(b, sampledByMarker);
      const priorityDiff = (flagsB.priority || 0) - (flagsA.priority || 0);
      if (priorityDiff) return priorityDiff;
      const submittedAtA = a.latest?.submittedAt ? new Date(a.latest.submittedAt).getTime() : 0;
      const submittedAtB = b.latest?.submittedAt ? new Date(b.latest.submittedAt).getTime() : 0;
      return submittedAtB - submittedAtA || a.name.localeCompare(b.name);
    });

  if (isTutor) {
    mount.innerHTML = `
      <div id="staff-submission-list" style="display:grid;gap:12px;">${students.map((student) => _renderStudentRow(student, sampledByMarker)).join('')}</div>
    `;
    return;
  }

  mount.innerHTML = `
    <div style="margin-bottom:18px;">
      <div style="padding:16px;border:1px solid #dbeafe;border-radius:16px;background:linear-gradient(135deg,#ffffff,#f8fbff);">
        <div style="font-size:16px;font-weight:900;color:#1d4ed8;">Moderation Stats</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <span style="padding:6px 10px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1d4ed8;font-weight:800;">${uniqueSubmitters} submitted</span>
          <span style="padding:6px 10px;border-radius:999px;background:#eef2ff;border:1px solid #c7d2fe;font-size:12px;color:#4338ca;font-weight:800;">${isTutor ? visibleSubmittedStudents.filter((student) => _queueFlagsForStudent(student, sampledByMarker).aiProgress?.state === 'ready').length : counts.aiReady} AI ready</span>
          <span style="padding:6px 10px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1d4ed8;font-weight:800;">${isTutor ? visibleSubmittedStudents.filter((student) => ['processing', 'queued', 'submitted', 'retry'].includes(_queueFlagsForStudent(student, sampledByMarker).aiProgress?.state)).length : counts.aiInProgress} AI in progress</span>
          <span style="padding:6px 10px;border-radius:999px;background:#fff7ed;border:1px solid #fdba74;font-size:12px;color:#9a3412;font-weight:800;">${counts.aiFailed} manual review drafts</span>
          <span style="padding:6px 10px;border-radius:999px;background:#f1f5f9;border:1px solid var(--border);font-size:12px;color:#475569;font-weight:800;">${isTutor ? visibleSubmittedStudents.filter((student) => {
            const status = _workflowStatus(_gradingRecords?.[student.uid]?.[student.latest?.id], _resolveAssignment(student.uid, student.latest?.id, student.group));
            return status === GRADING_STATUS.UNASSIGNED || status === GRADING_STATUS.ASSIGNED;
          }).length : counts.pending} pending</span>
          <span style="padding:6px 10px;border-radius:999px;background:#fee2e2;border:1px solid #fecaca;font-size:12px;color:#991b1b;font-weight:800;">${counts.moderation} moderation</span>
          <span style="padding:6px 10px;border-radius:999px;background:#ecfdf5;border:1px solid #bbf7d0;font-size:12px;color:#166534;font-weight:800;">${counts.finalised} ready for release</span>
          <span style="padding:6px 10px;border-radius:999px;background:#f5f3ff;border:1px solid #c4b5fd;font-size:12px;color:#5b21b6;font-weight:800;">${counts.posted} released</span>
          ${notSubmitted !== null ? `<span style="padding:6px 10px;border-radius:999px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#92400e;font-weight:800;">${notSubmitted} not submitted</span>` : ''}
        </div>
        <div style="margin-top:14px;padding:14px;border:1px solid #dbeafe;border-radius:14px;background:white;box-shadow:0 8px 20px rgba(30,64,175,.06);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:13px;font-weight:900;color:#0f172a;">AI marking progress</div>
              <div style="font-size:12px;color:#475569;margin-top:3px;">${aiCompleteCount} of ${uniqueSubmitters} submitted scripts have a complete AI first read (${aiCompletionPercent}%).</div>
            </div>
            <div style="text-align:right;">
              <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:${aiQueueState === 'running' ? '#dcfce7' : aiQueueState === 'queued' ? '#eff6ff' : '#f8fafc'};border:1px solid ${aiQueueState === 'running' ? '#86efac' : aiQueueState === 'queued' ? '#bfdbfe' : '#cbd5e1'};font-size:12px;color:${aiQueueState === 'running' ? '#166534' : aiQueueState === 'queued' ? '#1d4ed8' : '#475569'};font-weight:900;">
                <span style="width:8px;height:8px;border-radius:50%;background:${aiQueueState === 'running' ? '#22c55e' : aiQueueState === 'queued' ? '#3b82f6' : '#94a3b8'};display:inline-block;"></span>
                ${_esc(aiQueueLabel)}
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:5px;">${_esc(aiQueueDetail)}</div>
            </div>
          </div>
          <div style="height:14px;border-radius:999px;background:#e2e8f0;overflow:hidden;display:flex;margin-top:12px;border:1px solid #cbd5e1;" aria-label="AI marking progress">${aiProgressBar}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:12px;">
            <div style="padding:10px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;">
              <div style="font-size:18px;font-weight:900;color:#166534;">${counts.aiReady}</div>
              <div style="font-size:11px;color:#166534;font-weight:800;">AI draft ready</div>
            </div>
            <div style="padding:10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
              <div style="font-size:18px;font-weight:900;color:#1d4ed8;">${aiActiveCount}</div>
              <div style="font-size:11px;color:#1d4ed8;font-weight:800;">in progress / queued</div>
            </div>
            <div style="padding:10px;border-radius:12px;background:#fff7ed;border:1px solid #fdba74;">
              <div style="font-size:18px;font-weight:900;color:#9a3412;">${aiManualCount}</div>
              <div style="font-size:11px;color:#9a3412;font-weight:800;">manual-review draft</div>
            </div>
            <div style="padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1;">
              <div style="font-size:18px;font-weight:900;color:#475569;">${aiWaitingCount}</div>
              <div style="font-size:11px;color:#475569;font-weight:800;">waiting pickup</div>
            </div>
            <div style="padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1;">
              <div style="font-size:18px;font-weight:900;color:#0f172a;">${aiQueuePending}</div>
              <div style="font-size:11px;color:#475569;font-weight:800;">server pending</div>
            </div>
            <div style="padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #cbd5e1;">
              <div style="font-size:18px;font-weight:900;color:#0f172a;">${aiQueueSucceeded}/${aiQueueFailed}</div>
              <div style="font-size:11px;color:#475569;font-weight:800;">run success / warning</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-bottom:18px;padding:16px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#ffffff,#eff6ff);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:16px;font-weight:900;color:#1d4ed8;">AI Pre-Marking</div>
            <div style="font-size:12px;color:#334155;line-height:1.6;margin-top:4px;">Background AI marking now continues on the server for submitted work. Use these controls only to queue pending latest submissions or force-refresh existing AI drafts.</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_bulkAiRunState.running ? 'opacity:.6;cursor:not-allowed;' : 'border-color:#1d4ed8;color:#1d4ed8;'}" ${_bulkAiRunState.running ? 'disabled' : `onclick='window._bulkGenerateAssessmentAIDrafts(${_jsArg(_activeAssessment)})'`}>${_bulkAiRunState.running ? 'Background Queue Running...' : 'Queue Pending Submissions'}</button>
            <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_bulkAiRunState.running ? 'opacity:.6;cursor:not-allowed;' : 'border-color:#0f766e;color:#0f766e;'}" ${_bulkAiRunState.running ? 'disabled' : `onclick='window._bulkGenerateAssessmentAIDrafts(${_jsArg(_activeAssessment)}, true)'`}>Refresh All Backend Drafts</button>
          </div>
        </div>
      <div data-bulk-ai-status style="font-size:12px;color:${_bulkAiRunState.assessmentId === _activeAssessment ? _bulkAiRunState.color : 'var(--muted)'};margin-top:10px;">${_esc(_bulkAiRunState.assessmentId === _activeAssessment ? _bulkAiRunState.text : '')}</div>
    </div>
    <div style="margin-bottom:18px;padding:16px;border:1px solid var(--border);border-radius:16px;background:white;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-size:16px;font-weight:900;color:var(--navy);">Lecturer Moderation Queue</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:4px;">Focus the queue by moderation need, release readiness, boundary marks, marker-AI divergence, integrity flags, returned scripts, or weak justifications.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_staffQueueFilterMode === 'all' ? 'background:var(--navy);border-color:var(--navy);color:white;' : ''}" onclick="window._setStaffQueueFilter('all')">All Submitted</button>
          <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_staffQueueFilterMode === 'moderation' ? 'background:#991b1b;border-color:#991b1b;color:white;' : 'border-color:#fecaca;color:#991b1b;'}" onclick="window._setStaffQueueFilter('moderation')">Open Moderation</button>
          <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_staffQueueFilterMode === 'ready-to-post' ? 'background:#166534;border-color:#166534;color:white;' : 'border-color:#bbf7d0;color:#166534;'}" onclick="window._setStaffQueueFilter('ready-to-post')">Ready For Release</button>
          <button type="button" class="btn-next" style="display:inline-flex;padding:6px 10px;font-size:12px;${!moderationCounts.readyToPost || _bulkPostingState.running ? 'opacity:.6;cursor:not-allowed;' : ''}" ${!moderationCounts.readyToPost || _bulkPostingState.running ? 'disabled' : `onclick='window._bulkPostFinalisedFeedback(${_jsArg(_activeAssessment)})'`}>${_bulkPostingState.running ? 'Releasing...' : `Release Ready Scripts (${moderationCounts.readyToPost})`}</button>
          <button type="button" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_bulkSelectionMode ? 'background:var(--navy);border-color:var(--navy);color:white;' : ''}" onclick="window._toggleBulkSelectionMode()">
            ${_bulkSelectionMode ? `Select Mode On (${_bulkSelectedSubmissions.size})` : 'Select Students'}
          </button>
          <button type="button" class="btn-next" style="display:inline-flex;padding:6px 10px;font-size:12px;${_triageMode ? 'background:#7c3aed;border-color:#7c3aed;' : 'border-color:#c4b5fd;color:#6d28d9;'}" onclick="window._toggleTriageMode()">
            ${_triageMode ? 'Exit Triage' : 'Triage View'}
          </button>
        </div>
      </div>
      <div data-bulk-post-status style="font-size:12px;color:${_bulkPostingState.assessmentId === _activeAssessment ? _bulkPostingState.color : 'var(--muted)'};margin-top:10px;">${_esc(_bulkPostingState.assessmentId === _activeAssessment ? _bulkPostingState.text : '')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px;">
        ${[
          ['moderation', 'Open Moderation', moderationCounts.moderation, '#991b1b', '#fee2e2', '#fecaca'],
          ['ready-to-post', 'Ready For Release', moderationCounts.readyToPost, '#166534', '#ecfdf5', '#bbf7d0'],
          ['posted', 'Released', moderationCounts.posted, '#5b21b6', '#f5f3ff', '#c4b5fd'],
          ['boundary', 'Boundary Marks', moderationCounts.boundary, '#92400e', '#fffbeb', '#fde68a'],
          ['below-pass', 'Below Pass', moderationCounts.belowPass, '#9f1239', '#fff1f2', '#fecdd3'],
          ['borderline-fail', 'Borderline Fails', moderationCounts.borderlineFail, '#be123c', '#fff1f2', '#fecdd3'],
          ['high-mark', 'Very High Marks', moderationCounts.highMark, '#047857', '#ecfdf5', '#a7f3d0'],
          ['divergence', 'AI / Marker Divergence', moderationCounts.divergence, '#4338ca', '#eef2ff', '#c7d2fe'],
          ['integrity', 'Integrity Flags', moderationCounts.integrity, '#991b1b', '#fef2f2', '#fecaca'],
          ['returned', 'Returned To Tutor', moderationCounts.returned, '#9a3412', '#fff7ed', '#fdba74'],
          ['weak-justification', 'Weak Justification', moderationCounts.weakJustification, '#0f766e', '#ecfeff', '#99f6e4'],
        ].map(([mode, label, count, fg, bg, border]) => `<button type="button" onclick="window._setStaffQueueFilter('${mode}')" style="text-align:left;padding:12px;border-radius:12px;border:1px solid ${_staffQueueFilterMode === mode ? fg : border};background:${_staffQueueFilterMode === mode ? bg : 'white'};cursor:pointer;"><div style="font-size:11px;font-weight:800;color:${fg};text-transform:uppercase;">${_esc(label)}</div><div style="font-size:22px;font-weight:900;color:${fg};margin-top:4px;">${count}</div></button>`).join('')}
      </div>
    </div>
    <div id="staff-submission-filter" style="margin-bottom:14px;display:grid;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <input id="staff-sub-search" value="${_esc(_staffQueueSearchQuery)}" type="text" placeholder="Search by name, email, student number, group, marker, or queue reason..." oninput="window._filterStaffSubmissions()" style="width:100%;max-width:420px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
        <div style="font-size:12px;color:var(--muted);font-weight:800;">${filteredStudents.length} row(s) shown${_staffQueueFilterMode !== 'all' ? ` · filter ${_esc(_staffQueueFilterMode.replace(/-/g, ' '))}` : ''}</div>
      </div>
    </div>
    ${_bulkSelectionMode ? `
    <div id="bulk-action-bar" style="position:sticky;top:0;z-index:20;margin-bottom:12px;padding:12px 16px;border:2px solid var(--navy);border-radius:14px;background:white;box-shadow:0 4px 16px rgba(15,23,42,.12);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--navy);cursor:pointer;">
            <input type="checkbox" id="bulk-select-all-cb" onchange="window._bulkSelectAllVisible(this.checked)"
              ${_bulkSelectedSubmissions.size === filteredStudents.filter((s) => s.latest).length && filteredStudents.some((s) => s.latest) ? 'checked' : ''} />
            Select all (${_bulkSelectedSubmissions.size} selected)
          </label>
          <button type="button" class="btn-prev" style="font-size:11px;padding:3px 9px;" onclick="window._toggleBulkSelectionMode()">Cancel</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="bulk-action-buttons">
          <button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 12px;background:#059669;border-color:#059669;${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
            ${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'disabled' : "onclick='window._bulkFinaliseSelected()'"}>
            Finalise Selected (${_bulkSelectedSubmissions.size})
          </button>
          <button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 12px;${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
            ${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'disabled' : "onclick='window._bulkReleaseSelected()'"}>
            Release Selected (${_bulkSelectedSubmissions.size})
          </button>
          <button type="button" class="btn-prev" style="display:inline-flex;font-size:12px;padding:6px 12px;border-color:#fca5a5;color:#991b1b;${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
            ${!_bulkSelectedSubmissions.size || _bulkModerationRunning ? 'disabled' : "onclick='window._bulkReturnToTutor()'"}>
            Return to Tutor (${_bulkSelectedSubmissions.size})
          </button>
        </div>
      </div>
      <div id="bulk-moderation-status" style="font-size:12px;color:var(--muted);margin-top:8px;min-height:16px;"></div>
    </div>` : ''}
    ${_triageMode
      ? `<div id="triage-view">${_renderTriageView(filteredStudents, sampledByMarker)}</div>`
      : `<div id="staff-submission-list" style="display:grid;gap:12px;">${filteredStudents.length ? filteredStudents.map((student) => _renderStudentRow(student, sampledByMarker)).join('') : `<div style="padding:22px;border:1px dashed var(--border);border-radius:14px;background:#f8fafc;font-size:13px;color:var(--muted);text-align:center;">No submissions match the current moderation filter.</div>`}</div>`
    }
  `;
}

function _triageClassify(student, sampledByMarker) {
  const flags = _queueFlagsForStudent(student, sampledByMarker);
  if (!student.latest || flags.tutorMark == null) return 'red';
  if (flags.integrityFlag || flags.returned) return 'red';
  const gap = flags.aiMark != null ? Math.abs(flags.tutorMark - flags.aiMark) : 0;
  if (gap >= 15) return 'red';
  if (flags.belowPass && Number(flags.activeMark) < 40) return 'red';
  if (!flags.divergence && !flags.boundary && !flags.borderlineFail && !flags.highMark
      && !flags.weakJustification && !flags.belowPass) return 'green';
  return 'yellow';
}

function _renderCriterionPanel(student) {
  const sub = student.latest;
  if (!sub) return '';
  const record = _gradingRecords?.[student.uid]?.[sub.id] || {};
  const tutorRows = record?.tutorReview?.rubricRows || record?.moderation?.rubricRows || [];
  const aiRows = record?.aiDraft?.criterionRows || [];
  const maxLen = Math.max(tutorRows.length, aiRows.length);
  if (!maxLen) {
    return '<div style="padding:12px 16px;font-size:12px;color:var(--muted);">No criterion breakdown available yet.</div>';
  }
  const rows = Array.from({ length: maxLen }, (_, i) => {
    const t = tutorRows[i] || {};
    const a = aiRows[i] || {};
    const tMark = t.provisionalMark ?? null;
    const aMark = a.provisionalMark ?? null;
    const gap = tMark != null && aMark != null ? Math.round((tMark - aMark) * 10) / 10 : null;
    const absGap = gap == null ? 0 : Math.abs(gap);
    const gapColor = absGap >= 5 ? '#991b1b' : absGap >= 2 ? '#92400e' : '#166534';
    const rowBg = absGap >= 5 ? '#fef2f2' : 'transparent';
    const rationale = t.rationale || a.rationale || '';
    return `<tr style="border-top:1px solid #e2e8f0;background:${rowBg};">
      <td style="padding:7px 10px;font-size:12px;font-weight:700;color:var(--navy);">${_esc(t.criterion || a.criterion || `Criterion ${i + 1}`)}</td>
      <td style="padding:7px 10px;font-size:12px;font-weight:900;color:#1d4ed8;text-align:center;white-space:nowrap;">${tMark != null ? `${tMark}${t.maxMark != null ? `/${t.maxMark}` : ''}` : '—'}</td>
      <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#475569;text-align:center;white-space:nowrap;">${aMark != null ? `${aMark}${a.maxMark != null ? `/${a.maxMark}` : ''}` : '—'}</td>
      <td style="padding:7px 10px;font-size:12px;font-weight:900;color:${gapColor};text-align:center;">${gap != null ? (gap > 0 ? `+${gap}` : String(gap)) : '—'}</td>
      <td style="padding:7px 10px;font-size:11px;color:#475569;max-width:320px;">${_esc(rationale.slice(0, 180))}${rationale.length > 180 ? '…' : ''}</td>
    </tr>`;
  }).join('');
  const comment = record?.tutorReview?.comment || record?.moderation?.comment || '';
  const confidenceNote = record?.aiDraft?.confidenceNote || '';
  return `<div style="padding:12px 16px;background:#f8fafc;border-top:1px solid var(--border);">
    <table style="width:100%;border-collapse:collapse;margin-bottom:${comment || confidenceNote ? '10px' : '0'};">
      <thead>
        <tr style="background:#eef2f7;">
          <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Criterion</th>
          <th style="padding:6px 10px;text-align:center;font-size:10px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.06em;">Tutor</th>
          <th style="padding:6px 10px;text-align:center;font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.06em;">AI</th>
          <th style="padding:6px 10px;text-align:center;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Gap</th>
          <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Tutor rationale</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${comment ? `<div style="padding:8px 10px;background:white;border:1px solid var(--border);border-radius:8px;font-size:11px;color:#334155;line-height:1.5;margin-bottom:6px;"><strong style="color:var(--navy);">Tutor comment:</strong> ${_esc(comment.slice(0, 400))}${comment.length > 400 ? '…' : ''}</div>` : ''}
    ${confidenceNote ? `<div style="padding:8px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11px;color:#1d4ed8;line-height:1.5;"><strong>AI confidence:</strong> ${_esc(confidenceNote.slice(0, 240))}${confidenceNote.length > 240 ? '…' : ''}</div>` : ''}
  </div>`;
}

function _renderTriageRow(student, tier, sampledByMarker) {
  const sub = student.latest;
  const flags = _queueFlagsForStudent(student, sampledByMarker);
  const pendingKey = `${student.uid}:${sub.id}`;
  const pending = _triagePendingMarks.get(pendingKey);
  const displayMark = pending?.mark ?? flags.tutorMark;
  const isExpanded = _triageExpandedRows.has(sub.id);
  const gap = flags.aiMark != null && flags.tutorMark != null
    ? Math.round((flags.tutorMark - flags.aiMark) * 10) / 10 : null;
  const absGap = gap == null ? 0 : Math.abs(gap);
  const gapColor = absGap >= 15 ? '#991b1b' : absGap >= 10 ? '#9a3412' : absGap >= 5 ? '#92400e' : '#166534';
  const markColor = displayMark != null ? (Number(displayMark) < 50 ? '#991b1b' : '#166534') : 'var(--muted)';
  const hasPending = pending != null;
  const isYellow = tier === 'yellow';
  const isRed = tier === 'red';

  const chips = [
    flags.integrityFlag && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;">Integrity</span>`,
    flags.belowPass && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#fef2f2;color:#9f1239;border:1px solid #fecdd3;">Fail</span>`,
    flags.borderlineFail && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;">Borderline</span>`,
    flags.boundary && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;">Boundary</span>`,
    flags.highMark && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">High</span>`,
    flags.divergence && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;">Diverge</span>`,
    flags.weakJustification && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#ecfeff;color:#0f766e;border:1px solid #99f6e4;">Weak just.</span>`,
    flags.returned && `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;">Returned</span>`,
  ].filter(Boolean).join(' ');

  const cols = isYellow ? 8 : 7;

  return `
    <tr style="border-top:1px solid var(--border);${hasPending ? 'background:#fefce8;' : ''}">
      <td style="padding:8px 12px;">
        <div style="font-weight:800;color:var(--navy);font-size:12px;">${_esc(student.name)}</div>
        <div style="font-size:10px;color:var(--muted);">${_esc(student.email || '')}</div>
      </td>
      <td style="padding:8px 12px;font-size:12px;color:var(--muted);">${_esc(student.group || '—')}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:900;font-size:13px;color:${markColor};">
        ${flags.tutorMark != null ? `${flags.tutorMark}%` : '—'}
        ${hasPending ? `<div style="font-size:10px;color:#92400e;font-weight:800;">→ ${pending.mark}%</div>` : ''}
      </td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;font-size:12px;color:#475569;">${flags.aiMark != null ? `${flags.aiMark}%` : '—'}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:900;font-size:12px;color:${gapColor};">${gap != null ? (gap > 0 ? `+${gap}` : String(gap)) : '—'}</td>
      ${isYellow ? `<td style="padding:6px 12px;text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;">
          <input type="number" min="0" max="100"
            value="${displayMark != null ? displayMark : ''}" placeholder="—"
            style="width:60px;padding:4px 6px;border:1px solid ${hasPending ? '#f59e0b' : 'var(--border)'};border-radius:6px;font-size:12px;font-weight:900;text-align:center;background:${hasPending ? '#fffbeb' : 'white'};"
            oninput='window._triageRecordEdit(${_jsArg(student.uid)},${_jsArg(sub.id)},${_jsArg(sub.assessmentId)},this.value)' />
          <span style="font-size:10px;color:var(--muted);">%</span>
        </div>
      </td>` : ''}
      <td style="padding:8px 12px;">${chips || '<span style="font-size:10px;color:var(--muted);">—</span>'}</td>
      <td style="padding:6px 12px;">
        <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
          ${!isRed ? `<button type="button" class="btn-next" style="display:inline-flex;font-size:10px;padding:3px 9px;background:#059669;border-color:#059669;${_triageRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
            ${_triageRunning ? 'disabled' : `onclick='window._triageApproveOne(${_jsArg(student.uid)},${_jsArg(sub.id)},${_jsArg(sub.assessmentId)})'`}>Approve</button>` : ''}
          ${isYellow ? `<button type="button" class="btn-prev" style="display:inline-flex;font-size:10px;padding:3px 9px;${isExpanded ? 'background:var(--navy);color:white;border-color:var(--navy);' : ''}"
            onclick='window._triageToggleRow(${_jsArg(sub.id)})'>${isExpanded ? 'Hide' : 'Criteria'}</button>` : ''}
          <button type="button" class="btn-prev" style="display:inline-flex;font-size:10px;padding:3px 9px;"
            onclick='window._openMarkingWorkspace(${_jsArg(sub.assessmentId)},${_jsArg(student.uid)},${_jsArg(sub.id)})'>Open</button>
        </div>
      </td>
    </tr>
    ${isExpanded ? `<tr><td colspan="${cols}" style="padding:0;">${_renderCriterionPanel(student)}</td></tr>` : ''}`;
}

function _renderTriageTier(tier, label, students, sampledByMarker) {
  const palette = {
    green: { bg: '#ecfdf5', border: '#bbf7d0', fg: '#166534', header: '#dcfce7' },
    yellow: { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', header: '#fef3c7' },
    red: { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', header: '#fee2e2' },
  }[tier];
  const hasApprove = tier !== 'red' && students.length > 0;
  const approveLabel = tier === 'green'
    ? `Approve All Clear (${students.length})`
    : `Approve All Reviewed (${students.length})`;
  const cols = tier === 'yellow' ? 8 : 7;
  return `
    <div style="margin-bottom:16px;border:1px solid ${palette.border};border-radius:14px;overflow:hidden;">
      <div style="padding:12px 16px;background:${palette.header};display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div>
          <span style="font-size:13px;font-weight:900;color:${palette.fg};">${_esc(label)}</span>
          <span style="font-size:12px;color:${palette.fg};margin-left:8px;opacity:.75;">${students.length} student${students.length === 1 ? '' : 's'}</span>
        </div>
        ${hasApprove ? `<button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 14px;background:${palette.fg};border-color:${palette.fg};${_triageRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
          ${_triageRunning ? 'disabled' : `onclick='window._triageBulkApproveTier(${_jsArg(tier)})'`}>${_esc(approveLabel)}</button>` : ''}
      </div>
      ${students.length === 0
        ? `<div style="padding:14px 16px;font-size:12px;color:var(--muted);text-align:center;">No submissions in this tier.</div>`
        : `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.07em;">
                <th style="padding:8px 12px;text-align:left;min-width:160px;">Student</th>
                <th style="padding:8px 12px;text-align:left;">Group</th>
                <th style="padding:8px 12px;text-align:center;">Tutor</th>
                <th style="padding:8px 12px;text-align:center;">AI</th>
                <th style="padding:8px 12px;text-align:center;">Gap</th>
                ${tier === 'yellow' ? '<th style="padding:8px 12px;text-align:center;min-width:90px;">Adjust</th>' : ''}
                <th style="padding:8px 12px;text-align:left;">Flags</th>
                <th style="padding:8px 12px;text-align:left;">Actions</th>
              </tr>
            </thead>
            <tbody>${students.map((s) => _renderTriageRow(s, tier, sampledByMarker)).join('')}</tbody>
          </table></div>`
      }
    </div>`;
}

function _renderTriageView(filteredStudents, sampledByMarker) {
  const withSubs = filteredStudents.filter((s) => s.latest);
  const green = [], yellow = [], red = [];
  withSubs.forEach((s) => {
    const t = _triageClassify(s, sampledByMarker);
    if (t === 'green') green.push(s);
    else if (t === 'yellow') yellow.push(s);
    else red.push(s);
  });
  green.sort((a, b) => a.name.localeCompare(b.name));
  const byPriority = (a, b) => (_queueFlagsForStudent(b, sampledByMarker).priority || 0) - (_queueFlagsForStudent(a, sampledByMarker).priority || 0) || a.name.localeCompare(b.name);
  yellow.sort(byPriority);
  red.sort(byPriority);
  _triageTierCache = { green, yellow, red };

  const pendingCount = _triagePendingMarks.size;
  return `
    ${pendingCount > 0 ? `<div style="position:sticky;top:0;z-index:20;margin-bottom:12px;padding:10px 16px;border:2px solid #059669;border-radius:12px;background:#ecfdf5;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 4px 14px rgba(5,150,105,.12);">
      <div style="font-size:13px;font-weight:800;color:#166534;">${pendingCount} pending mark adjustment${pendingCount === 1 ? '' : 's'}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 12px;background:#059669;border-color:#059669;${_triageRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
          ${_triageRunning ? 'disabled' : "onclick='window._triageSavePending()'"}>${_triageRunning ? 'Saving…' : 'Save & Finalise Adjusted'}</button>
        <button type="button" class="btn-prev" style="display:inline-flex;font-size:12px;padding:5px 10px;" onclick="window._triageClearPending()">Discard</button>
      </div>
    </div>` : ''}
    ${_renderTriageTier('green', 'Clear — no flags, AI agrees within 5 marks', green, sampledByMarker)}
    ${_renderTriageTier('yellow', 'Review — check criteria before approving', yellow, sampledByMarker)}
    ${_renderTriageTier('red', 'Full review required — open workspace', red, sampledByMarker)}`;
}

function _renderStudentRow(student, sampledByMarker) {
  const sub = student.latest;
  const assignment = _resolveAssignment(student.uid, sub?.id || '', student.group);
  const cfg = sub ? _getEffectiveAssessmentConfig(sub.assessmentId) : _getEffectiveAssessmentConfig(_activeAssessment);
  const record = sub ? (_gradingRecords?.[student.uid]?.[sub.id] || {}) : {};
  const eltAssessment = record?.eltAssessment || null;
  const eltAssessmentText = record?.eltAssessmentText || '';
  const evidenceState = detectEltInsufficientEvidence(eltAssessment || {});
  const status = sub ? _workflowStatus(record, assignment) : 'not_submitted';
  const reviewSource = _normalizeReviewSource(record?.moderation || record?.tutorReview || record?.aiDraft || {}, cfg);
  const integrity = record?.integrity || record?.aiDraft?.integrity || {};
  const reasons = record?.moderationReasons || {};
  const isAssignedToMe = _isTutorRole() && assignment.markerUid === _activeTutorUid();
  const canTutorMark = isAssignedToMe && status !== GRADING_STATUS.FINALISED && status !== GRADING_STATUS.POSTED && !_isTutorPreviewMode();
  const canModerate = _isLecturerRole() && (
    status === GRADING_STATUS.MODERATION_REQUIRED
    || status === GRADING_STATUS.MODERATED
    || status === GRADING_STATUS.INTEGRITY_REVIEW_REQUIRED
  );
  const queueFlags = _queueFlagsForStudent(student, sampledByMarker);
  const aiProgress = queueFlags.aiProgress || _deriveAutoMarkingProgress(student, record, status);
  const meta = aiProgress.statusMeta || _statusMeta(status);
  const similarity = sub ? _calcSimilarity(sub) : 0;
  const searchText = [student.name, student.email, student.studentNumber, student.group, assignment.markerName, status, aiProgress.label].join(' ').toLowerCase();

  if (!sub) {
    const hasLateException = student.lateException?.allowLate === true;
    return `
      <details class="staff-sub-row" data-search-text="${_esc(searchText)}" style="border:1px solid ${isAssignedToMe ? '#6366f1' : 'var(--border)'};border-radius:14px;padding:0 14px;background:${isAssignedToMe ? '#fafafe' : 'white'};">
        <summary style="list-style:none;cursor:pointer;padding:14px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:800;color:var(--navy);">${_esc(student.name)}${isAssignedToMe ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;margin-left:7px;vertical-align:middle;">Yours</span>` : ''}${hasLateException ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;margin-left:7px;vertical-align:middle;">Late Exception Active</span>` : ''}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(student.email)}${student.studentNumber ? ` · ${_esc(student.studentNumber)}` : ''}${student.group ? ` · Group ${_esc(student.group)}` : ''} · 0 version(s)</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Assigned marker: <strong style="color:var(--navy);">${_esc(assignment.markerName || 'Unassigned')}</strong>${assignment.markerRole ? ` · ${_esc(_roleLabel(assignment.markerRole))}` : ''}</div>
            ${hasLateException ? `<div style="font-size:11px;color:#166534;margin-top:4px;">Granted ${_esc(_fmtDate(student.lateException?.grantedAt || ''))}</div>` : ''}
          </div>
          <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:${meta.bg};color:${meta.fg};border:1px solid ${meta.border};">${meta.label}</span>
        </summary>
        <div style="padding:0 0 14px 0;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
            ${_isLecturerRole() && student.canGrantLateException
              ? `<button type="button" class="btn-prev" style="font-size:11px;padding:4px 8px;${hasLateException ? 'border-color:#bbf7d0;color:#166534;' : ''}" onclick='window._grantStaffLateException(${_jsArg(_activeAssessment)}, ${_jsArg(student.uid)})'>${hasLateException ? 'Grant Again' : 'Grant Late Exception'}</button>`
              : (_isLecturerRole() ? `<button type="button" class="btn-prev" style="font-size:11px;padding:4px 8px;opacity:.55;cursor:not-allowed;" disabled title="This roster row is not linked to a student account yet.">Grant Late Exception</button>` : '')}
            <span data-late-status-for="${_esc(student.uid)}" style="font-size:11px;color:var(--muted);margin-left:8px;align-self:center;"></span>
          </div>
          <div style="padding:12px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;">
            <div style="font-size:12px;font-weight:800;color:#92400e;">No submission received yet</div>
            <div style="font-size:12px;color:#92400e;line-height:1.6;margin-top:8px;">This student is on the roster for ${_esc(_activeAssessment.toUpperCase())} but has not submitted any files yet.</div>
            <div style="font-size:12px;color:#92400e;line-height:1.6;margin-top:6px;">${student.canGrantLateException
              ? 'You can grant a late-submission exception now so the student can submit after the deadline.'
              : 'A late exception cannot be granted from this row because the roster entry is not linked to a student UID yet. Link or sync the student account first.'}</div>
          </div>
        </div>
      </details>
    `;
  }

  const aiProgressPalette = aiProgress.tone === 'done'
    ? { track: '#e0e7ff', fill: '#4338ca', text: '#3730a3', bg: '#eef2ff', border: '#c7d2fe' }
    : (aiProgress.tone === 'warning'
      ? { track: '#ffedd5', fill: '#ea580c', text: '#9a3412', bg: '#fff7ed', border: '#fdba74' }
      : (aiProgress.tone === 'active'
        ? { track: '#dbeafe', fill: '#2563eb', text: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' }
        : { track: '#e2e8f0', fill: '#64748b', text: '#475569', bg: '#f8fafc', border: '#cbd5e1' }));
  const aiProgressMarkup = `
    <div style="margin-top:12px;padding:12px;border:1px solid ${aiProgressPalette.border};border-radius:14px;background:${aiProgressPalette.bg};">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-size:12px;font-weight:800;color:${aiProgressPalette.text};">AI Marking Progress</div>
        <div style="font-size:11px;font-weight:800;color:${aiProgressPalette.text};">${_esc(aiProgress.label)}</div>
      </div>
      <div style="margin-top:10px;height:10px;border-radius:999px;background:${aiProgressPalette.track};overflow:hidden;">
        <div style="height:100%;width:${Math.max(0, Math.min(100, Number(aiProgress.percent) || 0))}%;background:${aiProgressPalette.fill};border-radius:999px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <div style="font-size:11px;color:${aiProgressPalette.text};line-height:1.5;">${_esc(aiProgress.detail || '')}</div>
        <div style="font-size:11px;font-weight:800;color:${aiProgressPalette.text};">${_esc(String(aiProgress.percent || 0))}%</div>
      </div>
    </div>
  `;

  const isSelected = _bulkSelectedSubmissions.has(sub.id);
  const selectionWrapOpen = _bulkSelectionMode
    ? `<div style="display:flex;align-items:flex-start;gap:10px;">
        <label style="padding-top:18px;cursor:pointer;" title="Select ${_esc(student.name)}">
          <input type="checkbox" data-bulk-sub-id="${_esc(sub.id)}" ${isSelected ? 'checked' : ''}
            onchange="window._bulkToggleSubmission(${_jsArg(sub.id)},${_jsArg(student.uid)},${_jsArg(sub.assessmentId)},this.checked)" />
        </label>
        <div style="flex:1;min-width:0;">`
    : '';
  const selectionWrapClose = _bulkSelectionMode ? '</div></div>' : '';

  return `${selectionWrapOpen}
    <details class="staff-sub-row" data-search-text="${_esc(searchText)}" style="border:1px solid ${isSelected ? '#2563eb' : (isAssignedToMe ? '#6366f1' : 'var(--border)')};border-radius:14px;padding:0 14px;background:${isSelected ? '#eff6ff' : (isAssignedToMe ? '#fafafe' : 'white')};">
      <summary style="list-style:none;cursor:pointer;padding:14px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:800;color:var(--navy);">${_esc(student.name)}${isAssignedToMe ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;margin-left:7px;vertical-align:middle;">Yours</span>` : ''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(student.email)}${student.studentNumber ? ` · ${_esc(student.studentNumber)}` : ''}${student.group ? ` · Group ${_esc(student.group)}` : ''} · ${student.subs.length} version(s)</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">Assigned marker: <strong style="color:var(--navy);">${_esc(assignment.markerName || 'Unassigned')}</strong>${assignment.markerRole ? ` · ${_esc(_roleLabel(assignment.markerRole))}` : ''}</div>
        </div>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:${meta.bg};color:${meta.fg};border:1px solid ${meta.border};">${meta.label}</span>
      </summary>
        <div style="padding:0 0 14px 0;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
          ${_isLecturerRole() ? `<button type="button" class="btn-prev" style="font-size:11px;padding:4px 8px;" onclick='window._grantStaffLateException(${_jsArg(_activeAssessment)}, ${_jsArg(student.uid)})'>Grant Late Exception</button>
          <button type="button" class="btn-prev" style="font-size:11px;padding:4px 8px;color:#991b1b;border-color:#fca5a5;" onclick='window._clearStaffErroneousSub(${_jsArg(_activeAssessment)}, ${_jsArg(student.uid)}, ${_jsArg(sub.id)})'>Clear Latest Submission</button>${queueFlags.readyToPost ? `<button type="button" class="btn-next" style="display:inline-flex;font-size:11px;padding:4px 10px;" onclick='window._postSubmissionFeedback(${_jsArg(sub.assessmentId)}, ${_jsArg(student.uid)}, ${_jsArg(sub.id)})'>Release To Student</button>` : ''}${queueFlags.posted ? `<button type="button" class="btn-prev" style="display:inline-flex;font-size:11px;padding:4px 10px;border-color:#be123c;color:#be123c;" onclick='window._retractSubmissionFeedback(${_jsArg(sub.assessmentId)}, ${_jsArg(student.uid)}, ${_jsArg(sub.id)})'>Withdraw Release</button>` : ''}` : ''}
          ${_isLecturerRole() ? `<select onchange='window._assignSubmissionOverride(${_jsArg(student.uid)}, ${_jsArg(sub.id)}, this.value)' style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:11px;background:white;"><option value="">Override marker (optional)</option>${_markerOptions.map((marker) => `<option value="${_esc(marker.uid)}" ${String(_gradingAssignments?.submissionOverrides?.[sub.id]?.markerUid || '') === marker.uid ? 'selected' : ''}>${_esc(marker.name)} (${_esc(_roleLabel(marker.role))})</option>`).join('')}</select>` : ''}
          ${_renderWorkspaceLaunchButton(student.uid, sub.id, sub.assessmentId)}
          <span data-late-status-for="${_esc(student.uid)}" style="font-size:11px;color:var(--muted);margin-left:8px;align-self:center;"></span>
        </div>
        <div style="padding:12px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div style="font-size:12px;font-weight:800;color:var(--navy);">Latest Submission · Version ${sub.version || 1}${sub.isLate ? ` <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fbbf24;vertical-align:middle;">Late</span>` : ''}</div><div style="font-size:11px;color:var(--muted);">${_fmtDate(sub.submittedAt)}</div></div>
          <div style="display:grid;gap:6px;margin-top:10px;">${(sub.files || []).map((file, idx) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:white;"><div style="display:flex;align-items:center;gap:8px;min-width:0;"><span>${_fileIcon(file.name)}</span><button type="button" onclick='window._openMarkingWorkspace(${_jsArg(sub.assessmentId)}, ${_jsArg(student.uid)}, ${_jsArg(sub.id)}, ${idx})' style="background:none;border:none;padding:0;margin:0;font-size:12px;font-weight:700;color:var(--navy);word-break:break-all;text-align:left;cursor:pointer;">${_esc(file.name)}</button></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;"><span style="font-size:11px;color:var(--muted);">${_fmtSize(file.size)}</span><button type="button" class="btn-prev" style="display:inline-flex;font-size:11px;padding:4px 10px;" onclick='window._openMarkingWorkspace(${_jsArg(sub.assessmentId)}, ${_jsArg(student.uid)}, ${_jsArg(sub.id)}, ${idx})'>Open in App</button></div></div>`).join('')}${sub.note ? `<div style="margin-top:4px;padding:10px;border-radius:10px;background:white;border:1px solid var(--border);font-size:12px;color:#334155;line-height:1.6;"><strong>Student note:</strong> ${_esc(sub.note)}</div>` : ''}</div>
          ${student.previous.length ? `<details style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--navy);">Older Versions (${student.previous.length})</summary><div style="display:grid;gap:8px;margin-top:8px;">${student.previous.map((prev) => `<div style="padding:10px;border:1px solid var(--border);border-radius:10px;background:white;"><div style="font-size:12px;font-weight:700;color:var(--navy);">Version ${prev.version || 1} · ${_fmtDate(prev.submittedAt)}</div><div style="display:grid;gap:6px;margin-top:8px;">${(prev.files || []).map((file) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;"><span>${_fileIcon(file.name)} ${_esc(file.name)}</span><a href="${_esc(file.url)}" target="_blank" rel="noopener" class="btn-prev" style="display:inline-flex;font-size:10px;padding:3px 8px;">Download</a></div>`).join('')}</div></div>`).join('')}</div></details>` : ''}
        </div>
        <div style="margin-top:12px;padding:12px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <span style="padding:5px 9px;border-radius:999px;background:${similarity > 20 ? '#fffbeb' : '#f0fdf4'};border:1px solid ${similarity > 20 ? '#fde68a' : '#bbf7d0'};font-size:11px;font-weight:800;color:${similarity > 20 ? '#92400e' : '#166534'};">Similarity ${similarity}%</span>
              <span style="padding:5px 9px;border-radius:999px;background:${(integrity?.suspicionScore || 0) >= 60 ? '#fee2e2' : '#f8fafc'};border:1px solid ${(integrity?.suspicionScore || 0) >= 60 ? '#fecaca' : 'var(--border)'};font-size:11px;font-weight:800;color:${(integrity?.suspicionScore || 0) >= 60 ? '#991b1b' : '#475569'};">Integrity ${integrity?.suspicionScore != null ? integrity.suspicionScore : '—'}</span>
              <span style="padding:5px 9px;border-radius:999px;background:${aiProgressPalette.bg};border:1px solid ${aiProgressPalette.border};font-size:11px;font-weight:800;color:${aiProgressPalette.text};">${record?.aiDraft ? (Number.isFinite(Number(queueFlags.aiMark)) ? `Draft ${queueFlags.aiMark}` : aiProgress.label) : aiProgress.label}</span>
            </div>
            ${canTutorMark ? _renderWorkspaceLaunchButton(student.uid, sub.id, sub.assessmentId, 'Amend Mark', 0, true) : ''}
            ${_renderWorkspaceLaunchButton(student.uid, sub.id, sub.assessmentId, canTutorMark ? 'Open Workspace' : 'Open Workspace')}
          </div>
          <div style="font-size:12px;color:#334155;line-height:1.6;margin-top:10px;">${canTutorMark ? 'Use Amend Mark to edit the overall mark, criterion marks, rationales, and feedback, then send the completed marking to the lecturer queue.' : 'Open the workspace to review the provisional mark, amend feedback, and send the script forward.'}</div>
          ${record?.aiDraft?.confidenceNote ? `<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">${_esc(record.aiDraft.confidenceNote)}</div>` : ''}
          ${aiProgressMarkup}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            ${queueFlags.moderationOpen ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;">Open moderation</span>' : ''}
            ${queueFlags.boundary ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;">Boundary mark</span>' : ''}
            ${queueFlags.belowPass ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;">Below pass</span>' : ''}
            ${queueFlags.divergence ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;">AI / marker divergence</span>' : ''}
            ${queueFlags.integrityFlag ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;">Integrity flag</span>' : ''}
            ${queueFlags.returned ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;">Returned to tutor</span>' : ''}
            ${queueFlags.weakJustification ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#ecfeff;color:#0f766e;border:1px solid #99f6e4;">Weak justification</span>' : ''}
            ${queueFlags.borderlineFail ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;">Borderline fail</span>' : ''}
            ${queueFlags.highMark ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">Very high mark</span>' : ''}
            ${queueFlags.readyToPost ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;">Ready for release</span>' : ''}
            ${queueFlags.posted ? '<span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;">Released to student</span>' : ''}
          </div>
          ${Object.keys(reasons).length ? `<div style="margin-top:10px;">${_renderModerationReasonChips(reasons)}</div>` : ''}
        </div>
        ${_renderReleasedFeedback(sub.feedback)}
      </div>
    </details>
  ${selectionWrapClose}`;
}

async function _persistAssignments(nextAssignments) {
  const result = await saveGradingAssignments(_activeAssessment, {
    ...nextAssignments,
    markersSnapshot: _markerOptions.map((marker) => ({ uid: marker.uid, name: marker.name, role: marker.role })),
  });
  if (!result.ok) throw new Error(result.error || 'Failed to save grading assignments.');
  _gradingAssignments = result.value;
}

window._seedGradingAssignmentsFromTutorialGroups = async function () {
  try {
    const groupAssignments = {};
    Object.values(_tutorialAssignments || {}).forEach((entry) => {
      (Array.isArray(entry?.groups) ? entry.groups : []).forEach((group) => {
        const id = String(group?.id || '').trim().toUpperCase();
        if (!id) return;
        groupAssignments[id] = { markerUid: entry?.tutor?.uid || '', markerName: String(entry?.tutor?.displayName || entry?.tutor?.email || '').replace(/\s*\[tutor\]\s*/i, '').trim(), markerRole: 'tutor' };
      });
    });
    await _persistAssignments({ ..._gradingAssignments, assignmentMethod: 'manual', groupAssignments });
    await _refreshReviewer();
  } catch (err) { alert(err.message || 'Failed to seed grading assignments.'); }
};

window._randomRebalanceGradingAssignments = async function () {
  try {
    const tutors = _markerOptions.filter((marker) => marker.role === 'tutor');
    if (!tutors.length) throw new Error('No tutors are available for random rebalance.');
    const groupAssignments = {};
    [..._rosterLookup.groups].sort((a, b) => _hash(`${_activeAssessment}:${a}`) - _hash(`${_activeAssessment}:${b}`)).forEach((group, idx) => {
      const marker = tutors[idx % tutors.length];
      groupAssignments[group] = { markerUid: marker.uid, markerName: marker.name, markerRole: marker.role };
    });
    await _persistAssignments({ ..._gradingAssignments, assignmentMethod: 'random_rebalance', groupAssignments });
    await _refreshReviewer();
  } catch (err) { alert(err.message || 'Failed to random rebalance.'); }
};

window._assignGradingGroup = async function (group, markerUid) {
  try {
    const safeGroup = _safeGroupId(group);
    const marker = _markerOptions.find((item) => item.uid === markerUid);
    const groupAssignments = { ...(_gradingAssignments?.groupAssignments || {}) };
    if (!markerUid) delete groupAssignments[safeGroup];
    else if (safeGroup) groupAssignments[safeGroup] = { markerUid: marker.uid, markerName: marker.name, markerRole: marker.role };
    await _persistAssignments({ ..._gradingAssignments, assignmentMethod: 'manual', groupAssignments });
    await _refreshReviewer();
  } catch (err) { alert(err.message || 'Failed to update group assignment.'); }
};

window._assignSubmissionOverride = async function (studentUid, submissionId, markerUid) {
  try {
    const submissionOverrides = { ...(_gradingAssignments?.submissionOverrides || {}) };
    if (!markerUid) delete submissionOverrides[submissionId];
    else {
      const marker = _markerOptions.find((item) => item.uid === markerUid);
      submissionOverrides[submissionId] = { submissionId, studentUid, markerUid: marker.uid, markerName: marker.name, markerRole: marker.role };
    }
    await _persistAssignments({ ..._gradingAssignments, submissionOverrides });
    await _refreshReviewer();
  } catch (err) { alert(err.message || 'Failed to update submission override.'); }
};

function _findStudentForSubmission(studentUid, submissionId) {
  const safeStudentUid = String(studentUid || '').trim();
  const safeSubmissionId = String(submissionId || '').trim();
  if (!safeStudentUid || !safeSubmissionId) return null;
  const student = _buildStudentRows().find((item) => item.uid === safeStudentUid && Array.isArray(item.subs) && item.subs.some((sub) => sub?.id === safeSubmissionId));
  if (!student) return null;
  const matched = student.subs.find((sub) => sub?.id === safeSubmissionId);
  if (!matched) return null;
  return {
    ...student,
    latest: matched,
    previous: student.subs.filter((sub) => sub?.id !== matched.id && sub?.status !== 'cleared'),
    group: _studentGroup(matched) || student.group || '',
  };
}

function _readEvidenceNotes(submissionId, fallback = '') {
  return _cleanText(document.getElementById(`ai-evidence-${submissionId}`)?.value || fallback, 4000);
}

function _clientAiAvailable() {
  return AI_CHAT_CONFIGURED;
}

function _isAiAccessDeniedError(err) {
  const message = String(err?.message || err || '');
  return /denied access/i.test(message)
    || /contact support/i.test(message)
    || /permission denied/i.test(message)
    || /does not have access/i.test(message)
    || /api key not valid/i.test(message);
}

function _canUseEltReview(cfg = null) {
  return getEltCourseObjectives(cfg).length > 0 && buildEltRubric(cfg).length > 0;
}

function _draftNeedsAiRefresh(record = {}) {
  const aiDraft = record?.aiDraft || null;
  if (!aiDraft) return true;
  const evidenceState = detectEltInsufficientEvidence(record?.eltAssessment || {});
  if (evidenceState.insufficient) return false;
  if (aiDraft?.qualityChecks?.mode === 'manual_review_required') return false;
  if (aiDraft?.overallMark == null && _deriveOverallMarkFromCriteria(aiDraft?.criterionRows || []) == null) return true;
  if (!_draftHasSpecificFailJustification(aiDraft)) return true;
  if (_draftQualityIssues(aiDraft).length) return true;
  const feedback = aiDraft?.feedback || {};
  const sections = [feedback.whereYouAreNow, feedback.whereYouShouldBe, feedback.relationToOutcomes, feedback.whatToDoNext]
    .map((value) => _cleanText(value, 2400))
    .filter(Boolean);
  return !sections.length || sections.every((value) => _looksGenericDraftText(value));
}

async function _generateAIDraftPayload(student, assignment, cfg, record, options = {}) {
  const evidenceNotes = _cleanText(options?.evidenceNotes || '', 4000);
  const extractionBundle = options?.extractionBundle || await extractSubmissionBundle(student.latest.files || []);
  const extractedContent = formatExtractionBundleForPrompt(extractionBundle);
  const extractionDiagnostics = formatExtractionDiagnostics(extractionBundle);
  const evidenceBasis = _cleanText(`${describeExtractionBundle(extractionBundle)}${evidenceNotes ? ' Staff evidence notes were also supplied.' : ''}`, 1200);
  const contextPrompt = `Assessment: ${cfg?.title || ''}
Brief: ${cfg?.brief || ''}
Course outcomes: ${(cfg?.courseOutcomes || []).join(' | ') || 'Not explicitly configured'}
Checklist: ${(cfg?.checklist || []).map((item) => item.title).join(' | ')}
Rubric: ${(cfg?.rubric || []).map((row) => `${row.criterion}: ${(row.levels || []).map((level) => `${level.mark}=${level.desc}`).join(' | ')}`).join('\n')}
Student note: ${student.latest.note || 'None'}
Files: ${(student.latest.files || []).map((file) => `${file.name} (${_fmtSize(file.size)})`).join(' | ')}
Automatic extraction summary: ${describeExtractionBundle(extractionBundle)}
Per-file extraction diagnostics:
${extractionDiagnostics || 'No per-file extraction diagnostics available.'}
Automatically extracted submission content:
${extractedContent || 'No automatic PDF, DOCX, TXT, or image extraction was available. Rely only on metadata and any marker evidence notes.'}
Similarity metadata score: ${_calcSimilarity(student.latest)}
Existing integrity notes: ${(record?.integrity?.reasons || []).join(' | ') || 'none'}
Marker evidence notes: ${evidenceNotes || 'No marker evidence notes supplied. The draft must acknowledge limited evidence.'}`;
  const prompt = `You are an academic marker drafting a tutor-facing moderation aid for a South African first-year academic literacies course.
Return ONLY valid JSON with this exact shape:
{"overallMark":0,"confidenceNote":"","criterionRows":[{"criterion":"","provisionalMark":0,"maxMark":25,"rationale":"","evidenceRefs":[""]}],"feedback":{"whereYouAreNow":"","whereYouShouldBe":"","relationToOutcomes":"","whatToDoNext":""},"actionItems":["","",""],"integrity":{"advisory":true,"suspicionScore":0,"confidenceBand":"low","reasons":[""],"requiredHumanFollowUp":"","recommendedStaffAction":""}}
Rules: be conservative; do not invent quotations from the files; evidenceRefs must be file references or marker notes only.
If there is enough readable evidence, overallMark must be a numeric percentage between 0 and 100.
Each criterion row must contain a defensible mark or null plus a rationale tied to actual submission evidence.
Each feedback section must mention the real submission, products, or rubric criteria. Generic placeholder advice is forbidden.
If overallMark is below 50, explain explicitly why the submission is below the 50% pass threshold and name the weakest criteria preventing a pass.
Use plain academic prose without quotation marks inside free-text values unless absolutely necessary.
If extracted document content is available, evaluate the actual submission content against the rubric instead of relying only on metadata.
If extracted content is missing or partial, set overallMark to null unless staff evidence notes make a criterion-level judgment defensible, and say so clearly in confidenceNote.
Do not include markdown fences.
${contextPrompt}`;
  const raw = await _aiChat(prompt, { maxTokens: 1600, system: 'You are a rigorous university marker. Output valid JSON only.' });
  try {
    const parsed = _safeJsonParse(raw);
    if (_draftContainsRepairArtifacts(parsed)) throw new Error('AI draft contained JSON repair artefacts.');
    const aiDraft = _finalizeAiDraftForStaff(_coerceDraftShape(parsed, cfg), cfg);
    aiDraft.evidenceBasis = evidenceBasis;
    return { evidenceNotes, aiDraft };
  } catch (parseErr) {
    try {
      const repaired = await _repairMalformedJson(raw, parseErr);
      if (_draftContainsRepairArtifacts(repaired)) throw new Error('Repaired AI draft still contained JSON repair artefacts.');
      const aiDraft = _finalizeAiDraftForStaff(_coerceDraftShape(repaired, cfg), cfg);
      aiDraft.evidenceBasis = evidenceBasis;
      return { evidenceNotes, aiDraft };
    } catch (_repairErr) {
      const aiDraft = _finalizeAiDraftForStaff(await _generateTaggedDraftFallback(cfg, contextPrompt), cfg);
      aiDraft.evidenceBasis = evidenceBasis;
      return { evidenceNotes, aiDraft };
    }
  }
}

async function _generateEltDraftPayload(assessmentId, studentUid, submissionId, student, assignment, cfg, evidenceNotes = '', extractionBundle = null) {
  const bundle = extractionBundle || await extractSubmissionBundle(student.latest.files || []);
  const extractedBundle = buildEltStudentText(bundle);
  const limitedEvidenceContext = _buildEltLimitedEvidenceContext(student, bundle);
  const eltTextParts = [];
  if (extractedBundle.text) eltTextParts.push(extractedBundle.text);
  else if (limitedEvidenceContext) eltTextParts.push(limitedEvidenceContext);
  if (evidenceNotes) eltTextParts.push(`[Staff Evidence Excerpts]\n${evidenceNotes}`);
  const studentText = String(eltTextParts.join('\n\n')).trim().slice(0, 20000);
  const hasReadableExtractedText = Boolean(extractedBundle.text);
  const usedLimitedEvidenceFallback = !extractedBundle.text && Boolean(limitedEvidenceContext);
  if (!studentText) {
    throw new Error('No submission evidence was available for ELT review. Add files, a student submission note, or paste excerpts into Optional Evidence Excerpts.');
  }
  if (!_canUseEltReview(cfg)) {
    throw new Error('No course outcomes or rubric criteria are configured for ELT review for this assessment.');
  }

  if (!hasReadableExtractedText) {
    const aiDraft = _buildEvidenceLimitedAiDraft(cfg, bundle, evidenceNotes);
    return {
      assignedMarkerUid: assignment.markerUid,
      assignedMarkerName: assignment.markerName,
      assignedMarkerRole: assignment.markerRole,
      assignmentSource: assignment.source,
      tutorialGroup: student.group,
      evidenceNotes,
      eltAssessment: null,
      eltAssessmentText: studentText,
      eltAssessmentMeta: buildEltAssessmentMeta({
        generatedByUid: STATE.user?.uid || '',
        generatedByName: STATE.user?.displayName?.split(' [')[0]?.trim() || '',
        sourceTextLength: studentText.length,
        truncated: extractedBundle.truncated || studentText.length >= 20000,
      }),
      aiDraft,
      integrity: aiDraft?.integrity || {},
    };
  }

  const callable = _eltReviewCallable();
  const response = await callable({
    student_id: studentUid,
    assignment_id: assessmentId,
    submission_id: submissionId,
    student_text: studentText,
    course_objectives: getEltCourseObjectives(cfg),
    rubric: buildEltRubric(cfg),
    timestamp: new Date().toISOString(),
  });
  const eltAssessment = response?.data || {};
  const aiDraft = _finalizeAiDraftForStaff(adaptEltAssessmentToAiDraft(eltAssessment, cfg), cfg);
  aiDraft.evidenceBasis = _cleanText(
    usedLimitedEvidenceFallback
      ? `${describeExtractionBundle(bundle)}${student.latest.note ? ' Student submission note was included.' : ''}${evidenceNotes ? ' Staff evidence excerpts were also included.' : ''} The ELT review was generated from limited submission context because no readable file text was recovered automatically.`
      : `${describeExtractionBundle(bundle)}${evidenceNotes ? ' Staff evidence excerpts were also included.' : ''}`,
    1200,
  );
  const eltAssessmentMeta = buildEltAssessmentMeta({
    generatedByUid: STATE.user?.uid || '',
    generatedByName: STATE.user?.displayName?.split(' [')[0]?.trim() || '',
    sourceTextLength: studentText.length,
    truncated: extractedBundle.truncated || studentText.length >= 20000,
  });

  return {
    assignedMarkerUid: assignment.markerUid,
    assignedMarkerName: assignment.markerName,
    assignedMarkerRole: assignment.markerRole,
    assignmentSource: assignment.source,
    tutorialGroup: student.group,
    evidenceNotes,
    eltAssessment,
    eltAssessmentText: studentText,
    eltAssessmentMeta,
    aiDraft,
    integrity: aiDraft?.integrity || {},
  };
}

async function _generateBestAvailableAIDraft(assessmentId, studentUid, submissionId, options = {}) {
  const student = options?.student || _findStudentForSubmission(studentUid, submissionId);
  if (!student) throw new Error('Submission could not be found for AI drafting.');
  const assignment = options?.assignment || _resolveAssignment(studentUid, submissionId, student.group);
  const cfg = options?.cfg || _getEffectiveAssessmentConfig(assessmentId);
  const record = options?.record || (_gradingRecords?.[studentUid]?.[submissionId] || {});
  const evidenceNotes = _cleanText(options?.evidenceNotes ?? _readEvidenceNotes(submissionId), 4000);
  const extractionBundle = options?.extractionBundle || await extractSubmissionBundle(student.latest.files || []);
  const statusEl = options?.statusEl || null;
  const refreshAfterSave = options?.refreshAfterSave !== false;
  const preferElt = options?.preferElt !== false;

  if (statusEl) {
    statusEl.textContent = preferElt && _canUseEltReview(cfg) ? 'Generating AI mark...' : 'Generating AI draft...';
    statusEl.style.color = 'var(--muted)';
  }

  let payload = null;
  let source = 'ai';
  let eltError = null;
  if (preferElt && _canUseEltReview(cfg)) {
    try {
      payload = await _generateEltDraftPayload(assessmentId, studentUid, submissionId, student, assignment, cfg, evidenceNotes, extractionBundle);
      source = 'elt';
    } catch (err) {
      eltError = err;
    }
  }

  if (!payload) {
    const extractedContent = formatExtractionBundleForPrompt(extractionBundle);
    if (!extractedContent && !evidenceNotes) {
      const aiDraft = _buildEvidenceLimitedAiDraft(cfg, extractionBundle, evidenceNotes);
      payload = {
        assignedMarkerUid: assignment.markerUid,
        assignedMarkerName: assignment.markerName,
        assignedMarkerRole: assignment.markerRole,
        assignmentSource: assignment.source,
        tutorialGroup: student.group,
        evidenceNotes,
        aiDraft,
        integrity: aiDraft?.integrity || {},
      };
      source = 'manual-review';
    } else if (!_clientAiAvailable()) {
      const aiDraft = _buildEvidenceLimitedAiDraft(cfg, extractionBundle, evidenceNotes);
      aiDraft.confidenceNote = _cleanText(
        `${aiDraft.confidenceNote} Browser-side AI chat is not configured in this build, so only the backend ELT path is available for automated marking.`,
        1200,
      );
      payload = {
        assignedMarkerUid: assignment.markerUid,
        assignedMarkerName: assignment.markerName,
        assignedMarkerRole: assignment.markerRole,
        assignmentSource: assignment.source,
        tutorialGroup: student.group,
        evidenceNotes,
        aiDraft,
        integrity: aiDraft?.integrity || {},
      };
      source = 'manual-review';
    } else {
      try {
        const generated = await _generateAIDraftPayload(student, assignment, cfg, record, { evidenceNotes, extractionBundle });
        payload = {
          assignedMarkerUid: assignment.markerUid,
          assignedMarkerName: assignment.markerName,
          assignedMarkerRole: assignment.markerRole,
          assignmentSource: assignment.source,
          tutorialGroup: student.group,
          evidenceNotes: generated.evidenceNotes,
          aiDraft: generated.aiDraft,
          integrity: generated.aiDraft?.integrity || {},
        };
        source = 'ai';
      } catch (err) {
        if (!_isAiAccessDeniedError(err)) throw err;
        const aiDraft = _buildEvidenceLimitedAiDraft(cfg, extractionBundle, evidenceNotes);
        aiDraft.confidenceNote = _cleanText(
          `${aiDraft.confidenceNote} Automated AI marking is currently unavailable because the configured Google AI project was denied model access. Staff must complete the mark manually until model access is restored.`,
          1200,
        );
        payload = {
          assignedMarkerUid: assignment.markerUid,
          assignedMarkerName: assignment.markerName,
          assignedMarkerRole: assignment.markerRole,
          assignmentSource: assignment.source,
          tutorialGroup: student.group,
          evidenceNotes,
          aiDraft,
          integrity: aiDraft?.integrity || {},
        };
        source = 'manual-review';
        eltError = eltError || err;
      }
    }
  }

  const preservedIntegrity = {
    ...(record?.integrity || {}),
    ...(payload?.integrity || {}),
  };
  if (!preservedIntegrity.synthId && record?.aiDraft?.integrity?.synthId) {
    preservedIntegrity.synthId = record.aiDraft.integrity.synthId;
  }
  if (payload?.aiDraft) {
    payload.aiDraft.integrity = {
      ...(payload.aiDraft.integrity || {}),
      ...(preservedIntegrity.synthId ? { synthId: preservedIntegrity.synthId } : {}),
    };
  }
  payload.integrity = preservedIntegrity;

  const result = await saveSubmissionAIDraft(assessmentId, studentUid, submissionId, payload);
  if (!result.ok) throw new Error(result.error || 'Failed to save AI draft.');
  if (statusEl) {
    const qualityHeld = result?.value?.qualityChecks?.passed === false;
    const message = qualityHeld
      ? 'AI draft withheld. Manual review draft saved.'
      : (source === 'elt'
      ? 'AI mark saved.'
      : (source === 'manual-review'
        ? (eltError ? 'Backend AI was unavailable. Manual-review draft saved.' : 'Evidence-limited draft saved.')
        : 'AI draft saved.'));
    statusEl.textContent = `${message}${eltError ? ' ELT was unavailable, so the backup draft path was used.' : ''}`;
    statusEl.style.color = qualityHeld ? '#9a3412' : '#166534';
  }
  if (refreshAfterSave) await _refreshReviewer();
  return { source, payload: result.value };
}

async function _runWithConcurrency(items = [], limit = 2, worker = async () => null) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      try {
        results[current] = await worker(items[current], current);
      } catch (err) {
        results[current] = { ok: false, error: err?.message || 'Worker failed.' };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

window._generateSubmissionAIDraft = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`ai-status-${submissionId}`);
  try {
    await _generateBestAvailableAIDraft(assessmentId, studentUid, submissionId, { statusEl, preferElt: true, refreshAfterSave: true });
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err.message || 'AI draft failed.';
      statusEl.style.color = '#991b1b';
    }
  }
};

window._generateEltAssessmentReview = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`ai-status-${submissionId}`);
  const student = _findStudentForSubmission(studentUid, submissionId);
  if (!student) return;
  const assignment = _resolveAssignment(studentUid, submissionId, student.group);
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  const evidenceNotes = _readEvidenceNotes(submissionId);
  if (statusEl) {
    statusEl.textContent = 'Generating ELT review...';
    statusEl.style.color = 'var(--muted)';
  }
  try {
    const payload = await _generateEltDraftPayload(assessmentId, studentUid, submissionId, student, assignment, cfg, evidenceNotes);
    const result = await saveSubmissionAIDraft(assessmentId, studentUid, submissionId, payload);
    if (!result.ok) throw new Error(result.error || 'Failed to save ELT review.');
    if (statusEl) {
      statusEl.textContent = 'ELT review saved.';
      statusEl.style.color = '#166534';
    }
    await _refreshReviewer();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err.message || 'ELT review failed.';
      statusEl.style.color = '#991b1b';
    }
  }
};

window._bulkGenerateAssessmentAIDrafts = async function (assessmentId, forceRefresh = false) {
  if (!_isLecturerRole() || !assessmentId || _bulkAiRunState.running) return;
  _bulkAiRunState = {
    assessmentId,
    running: true,
    text: forceRefresh ? 'Queueing a full backend AI refresh...' : 'Queueing backend AI pre-marking...',
    color: 'var(--muted)',
  };
  _setBulkAiStatus(_bulkAiRunState.text, _bulkAiRunState.color);
  try {
    const callable = _requestAssessmentAutoGradeRunCallable();
    const response = await callable({ assessmentId, forceRefresh: forceRefresh === true });
    const payload = response?.data || {};
    _bulkAiRunState = {
      assessmentId,
      running: true,
      text: payload?.pendingCount
        ? `Background AI queue started for ${payload.pendingCount} latest submission(s).`
        : 'Background AI queue started.',
      color: '#1d4ed8',
    };
    _setBulkAiStatus(_bulkAiRunState.text, _bulkAiRunState.color);
    await _refreshReviewer();
  } catch (err) {
    _bulkAiRunState = {
      assessmentId,
      running: false,
      text: err?.message || 'The backend AI queue could not be started.',
      color: '#991b1b',
    };
    _setBulkAiStatus(_bulkAiRunState.text, _bulkAiRunState.color);
  }
};

window._bulkPostFinalisedFeedback = async function (assessmentId) {
  if (!_isLecturerRole() || !assessmentId || _bulkPostingState.running) return;
  const targets = _buildStudentRows()
    .filter((student) => student?.latest?.id)
    .filter((student) => {
      const submissionId = student.latest?.id;
      const record = _gradingRecords?.[student.uid]?.[submissionId] || {};
      return _workflowStatus(record, _resolveAssignment(student.uid, submissionId, student.group)) === GRADING_STATUS.FINALISED;
    });
  if (!targets.length) {
    _bulkPostingState = {
      assessmentId,
      running: false,
      text: 'No scripts are marked ready for release.',
      color: '#166534',
    };
    const emptyStatusEl = document.querySelector('[data-bulk-post-status]');
    if (emptyStatusEl) {
      emptyStatusEl.textContent = _bulkPostingState.text;
      emptyStatusEl.style.color = _bulkPostingState.color;
    }
    await _refreshReviewer();
    return;
  }

  _bulkPostingState = {
    assessmentId,
    running: true,
    text: `Releasing ${targets.length} ready script${targets.length === 1 ? '' : 's'} to students...`,
    color: 'var(--muted)',
  };
  const statusEl = document.querySelector('[data-bulk-post-status]');
  if (statusEl) {
    statusEl.textContent = _bulkPostingState.text;
    statusEl.style.color = _bulkPostingState.color;
  }
  await _refreshReviewer();

  let posted = 0;
  let failed = 0;
  for (const student of targets) {
    const result = await postFinalisedSubmissionFeedback(assessmentId, student.uid, student.latest.id);
    if (result?.ok) posted += 1;
    else failed += 1;
    _bulkPostingState = {
      assessmentId,
      running: true,
      text: `Releasing ${posted + failed}/${targets.length} ready scripts... ${posted} released, ${failed} failed.`,
      color: failed ? '#92400e' : 'var(--muted)',
    };
    if (statusEl) {
      statusEl.textContent = _bulkPostingState.text;
      statusEl.style.color = _bulkPostingState.color;
    }
  }

  _bulkPostingState = {
    assessmentId,
    running: false,
    text: failed
      ? `Release finished. ${posted} released, ${failed} failed.`
      : `Release finished. ${posted} script${posted === 1 ? '' : 's'} released to students.`,
    color: failed ? '#92400e' : '#166534',
  };
  if (statusEl) {
    statusEl.textContent = _bulkPostingState.text;
    statusEl.style.color = _bulkPostingState.color;
  }
  await _refreshReviewer();
};

window._toggleBulkSelectionMode = function () {
  _bulkSelectionMode = !_bulkSelectionMode;
  if (!_bulkSelectionMode) _bulkSelectedSubmissions.clear();
  _refreshReviewer();
};

window._bulkToggleSubmission = function (submissionId, studentUid, assessmentId, checked) {
  if (checked) {
    _bulkSelectedSubmissions.set(submissionId, { submissionId, studentUid, assessmentId });
  } else {
    _bulkSelectedSubmissions.delete(submissionId);
  }
  _refreshReviewer();
};
window._bulkSelectAllVisible = function (checked) {
  const rows = document.querySelectorAll('[data-bulk-sub-id]');
  rows.forEach((cb) => {
    const subId = cb.dataset.bulkSubId;
    if (!subId) return;
    const existing = _bulkSelectedSubmissions.get(subId);
    if (checked && existing) { cb.checked = true; return; }
    if (!checked) { _bulkSelectedSubmissions.delete(subId); cb.checked = false; return; }
    // parse uid/assessmentId from the onchange attribute encoded values
    const onchange = cb.getAttribute('onchange') || '';
    const m = onchange.match(/_bulkToggleSubmission\("([^"]+)","([^"]+)","([^"]+)"/);
    if (m) {
      _bulkSelectedSubmissions.set(subId, { submissionId: m[1], studentUid: m[2], assessmentId: m[3] });
    }
    cb.checked = true;
  });
  _refreshReviewer();
};

function _bulkSetStatus(text, color = 'var(--muted)') {
  const el = document.getElementById('bulk-moderation-status');
  if (el) { el.textContent = text; el.style.color = color; }
}

window._bulkFinaliseSelected = async function () {
  const targets = Array.from(_bulkSelectedSubmissions.values());
  if (!targets.length) return;
  if (!confirm(`Finalise ${targets.length} submission${targets.length === 1 ? '' : 's'}? This approves the current tutor mark and sets each script as ready to release.`)) return;
  _bulkModerationRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const { submissionId, studentUid, assessmentId } of targets) {
    _bulkSetStatus(`Finalising ${done + failed + 1}/${targets.length}…`);
    const record = _gradingRecords?.[studentUid]?.[submissionId] || {};
    const review = record.moderation || record.tutorReview || record.aiDraft || {};
    const result = await saveModerationDecision(assessmentId, studentUid, submissionId, {
      action: 'release',
      finalReview: review,
      moderation: review,
    });
    if (result?.ok) done++; else failed++;
  }
  _bulkModerationRunning = false;
  _bulkSelectedSubmissions.clear();
  _bulkSetStatus(
    failed ? `Finalised ${done}, ${failed} failed.` : `${done} script${done === 1 ? '' : 's'} finalised.`,
    failed ? '#92400e' : '#166534',
  );
  await _refreshReviewer();
};

window._bulkReleaseSelected = async function () {
  const targets = Array.from(_bulkSelectedSubmissions.values());
  if (!targets.length) return;
  if (!confirm(`Release ${targets.length} script${targets.length === 1 ? '' : 's'} to students? Only finalised scripts will post successfully.`)) return;
  _bulkModerationRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const { submissionId, studentUid, assessmentId } of targets) {
    _bulkSetStatus(`Releasing ${done + failed + 1}/${targets.length}…`);
    const result = await postFinalisedSubmissionFeedback(assessmentId, studentUid, submissionId);
    if (result?.ok) done++; else failed++;
  }
  _bulkModerationRunning = false;
  _bulkSelectedSubmissions.clear();
  _bulkSetStatus(
    failed ? `Released ${done}, ${failed} failed (must be finalised first).` : `${done} script${done === 1 ? '' : 's'} released to students.`,
    failed ? '#92400e' : '#166534',
  );
  await _refreshReviewer();
};

const _RETURN_REASON_PRESETS = [
  { id: 'mark_too_high',       label: 'Mark too high',          detail: 'The awarded mark is higher than the evidence in the submission supports. Please review the criteria and adjust accordingly.' },
  { id: 'mark_too_low',        label: 'Mark too low',           detail: 'The awarded mark appears lower than warranted. Please re-read the submission against the rubric and reconsider.' },
  { id: 'weak_justification',  label: 'Weak justification',     detail: 'The marking rationale does not adequately explain how the mark was derived. Please expand your criterion comments.' },
  { id: 'criterion_misapplied',label: 'Criterion misapplied',   detail: 'One or more criteria have been applied incorrectly. Please re-read the rubric descriptors and re-mark the affected criteria.' },
  { id: 'integrity_concern',   label: 'Integrity concern',      detail: 'There are indicators of possible academic integrity issues that require further investigation before this submission can be finalised.' },
  { id: 'incomplete_marking',  label: 'Incomplete marking',     detail: 'Not all criteria have been marked. Please complete all rubric rows before resubmitting for moderation.' },
];

function _returnReasonModalHTML(overlayId, confirmFn, count) {
  const chips = _RETURN_REASON_PRESETS.map((p) => `
    <button type="button" class="return-reason-chip"
      data-detail="${_esc(p.detail)}"
      onclick="window._returnReasonSelectChip(this)"
      style="text-align:left;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;background:white;font-size:12px;cursor:pointer;color:var(--navy);transition:border-color .15s,background .15s;"
    >${_esc(p.label)}</button>`).join('');
  return `
    <div style="background:white;border-radius:18px;padding:28px;width:100%;max-width:500px;box-shadow:0 20px 60px rgba(15,23,42,.22);">
      <div style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:4px;">Return ${count} Script${count === 1 ? '' : 's'} to Tutor</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px;">Select a reason — this will be recorded for all selected submissions.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">${chips}</div>
      <textarea id="${overlayId}-reason" rows="3"
        placeholder="Optional: add specific details or instructions for the tutor…"
        style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('${overlayId}')?.remove()">Cancel</button>
        <button class="btn-next" style="display:inline-flex;background:#991b1b;border-color:#991b1b;" onclick="window.${confirmFn}()">Return Selected</button>
      </div>
    </div>`;
}

window._returnReasonSelectChip = function (btn) {
  const overlay = btn.closest('[id$="-overlay"]');
  if (!overlay) return;
  overlay.querySelectorAll('.return-reason-chip').forEach((c) => {
    c.style.borderColor = 'var(--border)';
    c.style.background = 'white';
    c.style.color = 'var(--navy)';
    c.style.fontWeight = 'normal';
  });
  btn.style.borderColor = '#991b1b';
  btn.style.background = '#fff1f2';
  btn.style.color = '#991b1b';
  btn.style.fontWeight = '700';
  const textarea = overlay.querySelector('textarea');
  if (textarea && !textarea.value.trim()) textarea.value = btn.dataset.detail || '';
};

window._bulkReturnToTutor = function () {
  const targets = Array.from(_bulkSelectedSubmissions.values());
  if (!targets.length) return;
  const existing = document.getElementById('bulk-return-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bulk-return-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = _returnReasonModalHTML('bulk-return-overlay', '_bulkReturnToTutorConfirm', targets.length);
  document.body.appendChild(overlay);
};

window._bulkReturnToTutorConfirm = async function () {
  const reason = String(document.getElementById('bulk-return-overlay-reason')?.value || '').trim();
  if (!reason) { alert('Please select a reason before returning.'); return; }
  document.getElementById('bulk-return-overlay')?.remove();
  const targets = Array.from(_bulkSelectedSubmissions.values());
  _bulkModerationRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const { submissionId, studentUid, assessmentId } of targets) {
    _bulkSetStatus(`Returning ${done + failed + 1}/${targets.length}…`);
    const result = await returnSubmissionToTutor(assessmentId, studentUid, submissionId, { reason });
    if (result?.ok) done++; else failed++;
  }
  _bulkModerationRunning = false;
  _bulkSelectedSubmissions.clear();
  _bulkSetStatus(
    failed ? `Returned ${done}, ${failed} failed.` : `${done} script${done === 1 ? '' : 's'} returned to tutor.`,
    failed ? '#92400e' : '#166534',
  );
  await _refreshReviewer();
};

window._toggleTriageMode = function () {
  _triageMode = !_triageMode;
  _triagePendingMarks.clear();
  _triageExpandedRows.clear();
  if (_bulkSelectionMode) { _bulkSelectionMode = false; _bulkSelectedSubmissions.clear(); }
  _refreshReviewer();
  if (_triageMode) window._triageOfferAutoApproveGreens();
};

window._triageOfferAutoApproveGreens = async function () {
  await new Promise((r) => setTimeout(r, 350));
  const greens = _triageTierCache.green || [];
  if (!greens.length) return;
  const existing = document.getElementById('triage-autoapprove-bar');
  if (existing) return;
  const bar = document.createElement('div');
  bar.id = 'triage-autoapprove-bar';
  bar.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:8000;background:#052e16;color:white;border-radius:14px;padding:14px 22px;display:flex;align-items:center;gap:16px;box-shadow:0 8px 32px rgba(5,46,22,.35);font-size:13px;min-width:340px;max-width:92vw;';
  bar.innerHTML = `
    <div style="flex:1;">
      <span style="font-weight:800;">${greens.length} submission${greens.length === 1 ? '' : 's'}</span> in the Green tier — AI and tutor agree, no flags.
    </div>
    <button type="button" onclick="window._triageAutoApproveGreens()" style="flex-shrink:0;padding:8px 18px;border-radius:10px;border:none;background:#16a34a;color:white;font-weight:800;font-size:13px;cursor:pointer;">
      Approve All ${greens.length}
    </button>
    <button type="button" onclick="document.getElementById('triage-autoapprove-bar')?.remove()" style="flex-shrink:0;padding:8px 12px;border-radius:10px;border:none;background:rgba(255,255,255,.12);color:white;font-size:13px;cursor:pointer;">
      Review manually
    </button>`;
  document.body.appendChild(bar);
};

window._triageAutoApproveGreens = async function () {
  document.getElementById('triage-autoapprove-bar')?.remove();
  const targets = _triageTierCache.green || [];
  if (!targets.length) return;
  _triageRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const student of targets) {
    const sub = student.latest;
    const record = _gradingRecords?.[student.uid]?.[sub.id] || {};
    const base = record.moderation || record.tutorReview || record.aiDraft || {};
    const result = await saveModerationDecision(sub.assessmentId, student.uid, sub.id, {
      action: 'release',
      finalReview: base,
      moderation: base,
    });
    if (result?.ok) done++; else failed++;
  }
  _triageRunning = false;
  await _refreshReviewer();
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:8000;background:#166534;color:white;border-radius:12px;padding:12px 22px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(22,101,52,.3);pointer-events:none;';
  msg.textContent = failed ? `Approved ${done}, ${failed} failed — check red tier.` : `${done} green submission${done === 1 ? '' : 's'} finalised. Yellow and Red still need your attention.`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
};

window._triageToggleRow = function (submissionId) {
  if (_triageExpandedRows.has(submissionId)) _triageExpandedRows.delete(submissionId);
  else _triageExpandedRows.add(submissionId);
  _refreshReviewer();
};

window._triageRecordEdit = function (uid, submissionId, assessmentId, value) {
  const key = `${uid}:${submissionId}`;
  const num = Number(value);
  if (value === '' || value == null || !Number.isFinite(num)) {
    _triagePendingMarks.delete(key);
  } else {
    const clamped = Math.max(0, Math.min(100, Math.round(num)));
    _triagePendingMarks.set(key, { uid, submissionId, assessmentId, mark: clamped });
  }
};

window._triageClearPending = function () {
  _triagePendingMarks.clear();
  _refreshReviewer();
};

window._triageApproveOne = async function (uid, submissionId, assessmentId) {
  const key = `${uid}:${submissionId}`;
  const pending = _triagePendingMarks.get(key);
  const record = _gradingRecords?.[uid]?.[submissionId] || {};
  const base = record.moderation || record.tutorReview || record.aiDraft || {};
  const review = pending?.mark != null ? { ...base, mark: pending.mark } : base;
  _triageRunning = true;
  await _refreshReviewer();
  const result = await saveModerationDecision(assessmentId, uid, submissionId, {
    action: 'release',
    finalReview: review,
    moderation: review,
  });
  if (result?.ok) _triagePendingMarks.delete(key);
  _triageRunning = false;
  await _refreshReviewer();
};

window._triageBulkApproveTier = async function (tier) {
  const targets = _triageTierCache[tier] || [];
  if (!targets.length) return;
  const label = tier === 'green' ? 'clear' : 'reviewed';
  if (!confirm(`Approve and finalise ${targets.length} ${label} submission${targets.length === 1 ? '' : 's'}?`)) return;
  _triageRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const student of targets) {
    const sub = student.latest;
    const key = `${student.uid}:${sub.id}`;
    const pending = _triagePendingMarks.get(key);
    const record = _gradingRecords?.[student.uid]?.[sub.id] || {};
    const base = record.moderation || record.tutorReview || record.aiDraft || {};
    const review = pending?.mark != null ? { ...base, mark: pending.mark } : base;
    const result = await saveModerationDecision(sub.assessmentId, student.uid, sub.id, {
      action: 'release',
      finalReview: review,
      moderation: review,
    });
    if (result?.ok) { done++; _triagePendingMarks.delete(key); }
    else failed++;
  }
  _triageRunning = false;
  await _refreshReviewer();
};

window._triageSavePending = async function () {
  const targets = Array.from(_triagePendingMarks.values());
  if (!targets.length) return;
  if (!confirm(`Save and finalise ${targets.length} adjusted mark${targets.length === 1 ? '' : 's'}?`)) return;
  _triageRunning = true;
  await _refreshReviewer();
  let done = 0; let failed = 0;
  for (const { uid, submissionId, assessmentId, mark } of targets) {
    const record = _gradingRecords?.[uid]?.[submissionId] || {};
    const base = record.moderation || record.tutorReview || record.aiDraft || {};
    const review = { ...base, mark };
    const result = await saveModerationDecision(assessmentId, uid, submissionId, {
      action: 'release',
      finalReview: review,
      moderation: review,
    });
    if (result?.ok) { done++; _triagePendingMarks.delete(`${uid}:${submissionId}`); }
    else failed++;
  }
  _triageRunning = false;
  await _refreshReviewer();
};

window._inspectSubmissionExtraction = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`ai-status-${submissionId}`);
  const wrapEl = document.getElementById(`extraction-diagnostics-wrap-${submissionId}`);
  const student = _findStudentForSubmission(studentUid, submissionId);
  if (!student || !wrapEl) return;
  if (statusEl) {
    statusEl.textContent = 'Running extraction check...';
    statusEl.style.color = 'var(--muted)';
  }
  try {
    const extractionBundle = await extractSubmissionBundle(student.latest.files || []);
    wrapEl.innerHTML = _renderExtractionDiagnostics(
      submissionId,
      formatExtractionDiagnostics(extractionBundle),
      describeExtractionBundle(extractionBundle),
    );
    if (statusEl) {
      statusEl.textContent = 'Extraction check complete.';
      statusEl.style.color = '#166534';
    }
  } catch (err) {
    wrapEl.innerHTML = _renderExtractionDiagnostics(
      submissionId,
      err?.message || 'The extraction check failed before the files could be read.',
      'Extraction check failed.',
    );
    if (statusEl) {
      statusEl.textContent = err?.message || 'Extraction check failed.';
      statusEl.style.color = '#991b1b';
    }
  }
};

async function _persistTutorReview(assessmentId, studentUid, submissionId, review, extraReasons = {}) {
  const student = _findStudentForSubmission(studentUid, submissionId);
  if (!student) throw new Error('Submission not found.');
  const assignment = _resolveAssignment(student.uid, student.latest.id, student.group);
  const sampledByMarker = _sampledSetByMarker(_buildStudentRows());
  const record = _gradingRecords?.[student.uid]?.[student.latest.id] || {};
  const giState = window._giState?.[submissionId];
  const annotationsPayload = _buildReleaseAnnotationsPayload(giState, record);
  const reasons = {
    lecturerModerationRequired: true,
    ..._moderationReasons(student, review, record?.integrity || record?.aiDraft?.integrity || {}, sampledByMarker),
    ...extraReasons,
  };
  const result = await saveTutorGradingReview(assessmentId, studentUid, submissionId, {
    assignedMarkerUid: assignment.markerUid,
    assignedMarkerName: assignment.markerName,
    assignedMarkerRole: assignment.markerRole,
    assignmentSource: assignment.source,
    tutorialGroup: student.group,
    integrity: record?.integrity || record?.aiDraft?.integrity || {},
    tutorReview: review,
    moderationRequired: true,
    moderationReasons: reasons,
    markerAnnotations: annotationsPayload?.annotations || null,
    submissionText: annotationsPayload?.submissionText || null,
  });
  if (!result.ok) throw new Error(result.error || 'Failed to save review.');
  return result;
}

window._acceptSubmissionAIDraft = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`tutor-status-${submissionId}`);
  const student = _findStudentForSubmission(studentUid, submissionId);
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  const record = _gradingRecords?.[studentUid]?.[submissionId] || {};
  if (!student || !record?.aiDraft) return;
  const review = _normalizeReviewSource(record.aiDraft, cfg);
  const error = _feedbackValidation(review, { allowAiConcurrence: true, source: review });
  if (error) { if (statusEl) { statusEl.textContent = error; statusEl.style.color = '#991b1b'; } return; }
  try {
    const advanceTarget = _captureWorkspaceAdvanceTarget();
    const result = await _persistTutorReview(assessmentId, studentUid, submissionId, review);
    if (statusEl) { statusEl.textContent = 'Saved and routed to lecturer moderation.'; statusEl.style.color = '#166534'; }
    await _refreshReviewerAndMaybeAdvance(advanceTarget);
  } catch (err) { if (statusEl) { statusEl.textContent = err.message || 'Failed.'; statusEl.style.color = '#991b1b'; } }
};

window._saveTutorReview = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`tutor-status-${submissionId}`);
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  const record = _gradingRecords?.[studentUid]?.[submissionId] || {};
  const source = _normalizeReviewSource(record?.tutorReview || record?.aiDraft || {}, cfg);
  const review = _readReviewFromDom(submissionId, cfg, 'tutor');
  const error = _feedbackValidation(review, { allowAiConcurrence: true, source });
  if (error) { if (statusEl) { statusEl.textContent = error; statusEl.style.color = '#991b1b'; } return; }
  try {
    const advanceTarget = _captureWorkspaceAdvanceTarget();
    const result = await _persistTutorReview(assessmentId, studentUid, submissionId, review);
    if (statusEl) { statusEl.textContent = 'Saved and routed to lecturer moderation.'; statusEl.style.color = '#166534'; }
    await _refreshReviewerAndMaybeAdvance(advanceTarget);
  } catch (err) { if (statusEl) { statusEl.textContent = err.message || 'Failed.'; statusEl.style.color = '#991b1b'; } }
};

window._escalateSubmissionToLecturer = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`tutor-status-${submissionId}`);
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  const record = _gradingRecords?.[studentUid]?.[submissionId] || {};
  const source = _normalizeReviewSource(record?.tutorReview || record?.aiDraft || {}, cfg);
  const review = _readReviewFromDom(submissionId, cfg, 'tutor');
  const error = _feedbackValidation(review, { allowAiConcurrence: true, source });
  if (error) { if (statusEl) { statusEl.textContent = error; statusEl.style.color = '#991b1b'; } return; }
  try {
    const advanceTarget = _captureWorkspaceAdvanceTarget();
    await _persistTutorReview(assessmentId, studentUid, submissionId, review, { manualEscalation: true });
    if (statusEl) { statusEl.textContent = 'Escalated to lecturer moderation.'; statusEl.style.color = '#166534'; }
    await _refreshReviewerAndMaybeAdvance(advanceTarget);
  } catch (err) { if (statusEl) { statusEl.textContent = err.message || 'Failed.'; statusEl.style.color = '#991b1b'; } }
};

async function _persistModeration(assessmentId, studentUid, submissionId, action) {
  const statusEl = document.getElementById(`moderation-status-${submissionId}`);
  const cfg = _getEffectiveAssessmentConfig(assessmentId);
  const record = _gradingRecords?.[studentUid]?.[submissionId] || {};
  const source = _normalizeReviewSource(record?.moderation || record?.tutorReview || record?.aiDraft || {}, cfg);
  const review = _readReviewFromDom(submissionId, cfg, 'moderation');
  const error = _feedbackValidation(review, { allowAiConcurrence: true, source });
  if (error) { if (statusEl) { statusEl.textContent = error; statusEl.style.color = '#991b1b'; } return; }
  const giState = window._giState?.[submissionId];
  const annotationsPayload = _buildReleaseAnnotationsPayload(giState, record);
  const result = await saveModerationDecision(assessmentId, studentUid, submissionId, {
    action,
    finalReview: review,
    integrity: record?.integrity || record?.aiDraft?.integrity || {},
    integrityResolutionStatus: document.getElementById(`moderation-resolution-${submissionId}`)?.value || '',
    integrityResolution: document.getElementById(`moderation-resolution-note-${submissionId}`)?.value || '',
    markerAnnotations: annotationsPayload?.annotations || null,
    submissionText: annotationsPayload?.submissionText || null,
  });
  if (!result.ok) { if (statusEl) { statusEl.textContent = result.error || 'Failed.'; statusEl.style.color = '#991b1b'; } return; }
  const advanceTarget = action === 'release' ? _captureWorkspaceAdvanceTarget() : null;
  if (action === 'release') _staffQueueFilterMode = 'ready-to-post';
  if (statusEl) { statusEl.textContent = action === 'release' ? 'Script marked ready for release. Use Ready For Release to release it to students.' : 'Moderation draft saved.'; statusEl.style.color = '#166534'; }
  await _refreshReviewerAndMaybeAdvance(advanceTarget);
}

window._saveModerationDraft = async function (assessmentId, studentUid, submissionId) { await _persistModeration(assessmentId, studentUid, submissionId, 'save'); };
window._releaseModerationFeedback = async function (assessmentId, studentUid, submissionId) { await _persistModeration(assessmentId, studentUid, submissionId, 'release'); };
window._postSubmissionFeedback = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`posting-status-${submissionId}`);
  try {
    const advanceTarget = _captureWorkspaceAdvanceTarget();
    const result = await postFinalisedSubmissionFeedback(assessmentId, studentUid, submissionId);
    if (!result.ok) throw new Error(result.error || 'Failed to post final feedback.');
    if (statusEl) {
      statusEl.textContent = 'Final feedback released to the student.';
      statusEl.style.color = '#166534';
    }
    await _refreshReviewerAndMaybeAdvance(advanceTarget);
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err?.message || 'Failed to release final feedback.';
      statusEl.style.color = '#991b1b';
    }
  }
};
window._retractSubmissionFeedback = async function (assessmentId, studentUid, submissionId) {
  if (!_isLecturerRole()) return;
  const statusEl = document.getElementById(`posting-status-${submissionId}`);
  const reason = window.prompt(
    'Reason for withdrawing this released script from the student view? This is kept in staff workflow history.',
    'Released in error; requires correction before re-release.',
  );
  if (reason === null) return;
  try {
    const result = await retractReleasedSubmissionFeedback(assessmentId, studentUid, submissionId, { reason });
    if (!result.ok) throw new Error(result.error || 'Failed to withdraw released feedback.');
    _staffQueueFilterMode = 'moderation';
    if (statusEl) {
      statusEl.textContent = 'Released feedback withdrawn. The script is back in Open Moderation.';
      statusEl.style.color = '#166534';
    }
    await _refreshReviewer();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err?.message || 'Failed to withdraw released feedback.';
      statusEl.style.color = '#991b1b';
    }
  }
};
window._returnSubmissionToTutor = async function (assessmentId, studentUid, submissionId) {
  const statusEl = document.getElementById(`moderation-status-${submissionId}`);
  const note = String(document.getElementById(`moderation-resolution-note-${submissionId}`)?.value || '').trim();
  if (!note) {
    if (statusEl) {
      statusEl.textContent = 'Add a short note before returning this script to the tutor.';
      statusEl.style.color = '#991b1b';
    }
    return;
  }
  try {
    const advanceTarget = _captureWorkspaceAdvanceTarget();
    const result = await returnSubmissionToTutor(assessmentId, studentUid, submissionId, {
      reason: note,
      byName: STATE.user?.displayName || STATE.user?.email || 'Lecturer',
      byUid: STATE.user?.uid || '',
    });
    if (!result?.ok) throw new Error(result?.error || 'Failed to return submission.');
    if (statusEl) {
      statusEl.textContent = 'Returned to tutor with lecturer note.';
      statusEl.style.color = '#166534';
    }
    await _refreshReviewerAndMaybeAdvance(advanceTarget);
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err?.message || 'Failed to return submission.';
      statusEl.style.color = '#991b1b';
    }
  }
};

window._updateAssessmentDeadline = function (value) { const draft = _assessmentSettingsDraft || _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || {}); _assessmentSettingsDraft = draft; draft.deadlineLocal = String(value || ''); };
window._addAssessmentChecklistItem = function () { const draft = _assessmentSettingsDraft || _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || {}); draft.checklist.push({ title: '', detail: '' }); _assessmentSettingsDraft = draft; _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._removeAssessmentChecklistItem = function (index) { const draft = _assessmentSettingsDraft || _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || {}); draft.checklist.splice(index, 1); if (!draft.checklist.length) draft.checklist.push({ title: '', detail: '' }); _assessmentSettingsDraft = draft; _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._updateAssessmentChecklistItem = function (index, field, value) { const draft = _assessmentSettingsDraft; if (draft?.checklist[index]) draft.checklist[index][field] = String(value || ''); };
window._addAssessmentRubricCriterion = function () { const draft = _assessmentSettingsDraft || _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || {}); draft.rubric.push({ criterion: '', levels: [{ mark: '', desc: '' }] }); _assessmentSettingsDraft = draft; _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._removeAssessmentRubricCriterion = function (index) { const draft = _assessmentSettingsDraft || _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || {}); draft.rubric.splice(index, 1); if (!draft.rubric.length) draft.rubric.push({ criterion: '', levels: [{ mark: '', desc: '' }] }); _assessmentSettingsDraft = draft; _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._updateAssessmentRubricCriterion = function (index, value) { const draft = _assessmentSettingsDraft; if (draft?.rubric[index]) draft.rubric[index].criterion = String(value || ''); };
window._addAssessmentRubricLevel = function (rowIndex) { const draft = _assessmentSettingsDraft; if (draft?.rubric[rowIndex]) draft.rubric[rowIndex].levels.push({ mark: '', desc: '' }); _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._removeAssessmentRubricLevel = function (rowIndex, levelIndex) { const draft = _assessmentSettingsDraft; if (draft?.rubric[rowIndex]) { draft.rubric[rowIndex].levels.splice(levelIndex, 1); if (!draft.rubric[rowIndex].levels.length) draft.rubric[rowIndex].levels.push({ mark: '', desc: '' }); _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); } };
window._updateAssessmentRubricLevel = function (rowIndex, levelIndex, field, value) { const draft = _assessmentSettingsDraft; if (draft?.rubric[rowIndex]?.levels[levelIndex]) draft.rubric[rowIndex].levels[levelIndex][field] = String(value || ''); };
window._resetAssessmentSettingsDraft = function () { _assessmentSettingsDraftId = _activeAssessment; _assessmentSettingsDraft = _cloneSettingsDraft(_getEffectiveAssessmentConfig(_activeAssessment) || { id: _activeAssessment, checklist: [], rubric: [] }); _renderAssessmentSettingsPanel(document.getElementById('staff-assessment-settings-mount'), _activeAssessment); };
window._resetAssessmentSettingsToDefaults = async function () { if (!_activeAssessment || !confirm('Reset this assessment back to the content defaults and remove the saved override?')) return; const result = await clearAssessmentSettingsOverride(_activeAssessment); if (!result.ok) return alert(result.error || 'Failed to reset settings.'); await loadAssessmentSettingsOverrides({ force: true }); window._resetAssessmentSettingsDraft(); };
window._saveAssessmentSettings = async function () { const draft = _assessmentSettingsDraft; if (!draft?.assessmentId) return; const result = await saveAssessmentSettingsOverride(draft.assessmentId, { deadline: _fromLocalDateTimeValue(draft.deadlineLocal), checklist: draft.checklist, rubric: draft.rubric }); if (!result.ok) return alert(result.error || 'Failed to save assessment settings.'); await loadAssessmentSettingsOverrides({ force: true }); window._resetAssessmentSettingsDraft(); };
window._setStaffQueueFilter = function (mode = 'all') {
  _staffQueueFilterMode = String(mode || 'all').trim() || 'all';
  const mount = document.getElementById('staff-submissions-mount');
  if (mount) _renderStaffSubmissionList(mount);
};
window._filterStaffSubmissions = function () {
  _staffQueueSearchQuery = String(document.getElementById('staff-sub-search')?.value || '').trim();
  const mount = document.getElementById('staff-submissions-mount');
  if (mount) _renderStaffSubmissionList(mount);
};
window._grantStaffLateException = async function (assessmentId, uid) {
  if (!confirm('Are you sure you want to allow a late submission exception for this student?')) return;
  _setLateExceptionStatus(uid, 'Granting exception...', 'var(--muted)');
  const result = await grantLateSubmissionException(assessmentId, uid);
  _setLateExceptionStatus(uid, result.ok ? 'Exception granted.' : `Failed: ${result.error}`, result.ok ? '#166534' : '#991b1b');
  if (result.ok) {
    _submissionExceptions[uid] = {
      allowLate: true,
      grantedAt: new Date().toISOString(),
      grantedBy: STATE.user?.uid || 'staff',
    };
    await _refreshReviewer();
  }
};
window._grantBulkLateExceptions = async function (assessmentId) {
  const targetStudents = _eligibleBulkLateExceptionStudents(_buildNonSubmitterRows(_buildStudentRows()));
  if (!targetStudents.length) {
    _setBulkLateExceptionStatus('No eligible students need a late exception right now.', '#92400e');
    return;
  }
  if (!confirm(`Grant late exceptions for ${targetStudents.length} student${targetStudents.length === 1 ? '' : 's'} in ${String(assessmentId || '').toUpperCase()}?`)) return;

  _setBulkLateExceptionStatus(`Granting late exceptions for ${targetStudents.length} student${targetStudents.length === 1 ? '' : 's'}...`, 'var(--muted)');
  targetStudents.forEach((student) => _setLateExceptionStatus(student.uid, 'Granting exception...', 'var(--muted)'));

  const results = await Promise.allSettled(targetStudents.map((student) => grantLateSubmissionException(assessmentId, student.uid)));
  let successCount = 0;
  let failureCount = 0;

  results.forEach((result, idx) => {
    const student = targetStudents[idx];
    if (result.status === 'fulfilled' && result.value?.ok) {
      successCount += 1;
      _submissionExceptions[student.uid] = {
        allowLate: true,
        grantedAt: new Date().toISOString(),
        grantedBy: STATE.user?.uid || 'staff',
      };
      _setLateExceptionStatus(student.uid, 'Exception granted.', '#166534');
    } else {
      failureCount += 1;
      const error = result.status === 'fulfilled'
        ? (result.value?.error || 'Failed to grant late exception.')
        : (result.reason?.message || 'Failed to grant late exception.');
      _setLateExceptionStatus(student.uid, `Failed: ${error}`, '#991b1b');
    }
  });

  _setBulkLateExceptionStatus(
    failureCount
      ? `Granted ${successCount} late exception${successCount === 1 ? '' : 's'}; ${failureCount} failed.`
      : `Granted ${successCount} late exception${successCount === 1 ? '' : 's'}.`,
    failureCount ? '#991b1b' : '#166534',
  );

  await _refreshReviewer();
};
window._grantManualLateExceptions = async function (assessmentId) {
  const raw = document.getElementById('manual-late-targets')?.value || '';
  const entries = Array.from(new Set(
    raw
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  ));
  if (!entries.length) {
    _setManualLateExceptionStatus('Paste at least one UID or email/username first.', '#991b1b');
    return;
  }

  const resolved = [];
  const unresolved = [];
  entries.forEach((entry) => {
    const target = _resolveLateExceptionTarget(entry);
    if (target) resolved.push(target);
    else unresolved.push(entry);
  });

  if (!resolved.length) {
    _setManualLateExceptionStatus(`Could not resolve any accounts. Unresolved: ${unresolved.join(', ')}`, '#991b1b');
    return;
  }

  if (!confirm(`Grant late exceptions for ${resolved.length} manually specified account${resolved.length === 1 ? '' : 's'} in ${String(assessmentId || '').toUpperCase()}?`)) return;

  _setManualLateExceptionStatus(`Granting late exceptions for ${resolved.length} account${resolved.length === 1 ? '' : 's'}...`, 'var(--muted)');
  resolved.forEach((target) => _setLateExceptionStatus(target.uid, 'Granting exception...', 'var(--muted)'));

  const results = await Promise.allSettled(resolved.map((target) => grantLateSubmissionException(assessmentId, target.uid)));
  let successCount = 0;
  let failureCount = 0;

  results.forEach((result, idx) => {
    const target = resolved[idx];
    if (result.status === 'fulfilled' && result.value?.ok) {
      successCount += 1;
      _submissionExceptions[target.uid] = {
        allowLate: true,
        grantedAt: new Date().toISOString(),
        grantedBy: STATE.user?.uid || 'staff',
      };
      _setLateExceptionStatus(target.uid, 'Exception granted.', '#166534');
    } else {
      failureCount += 1;
      const error = result.status === 'fulfilled'
        ? (result.value?.error || 'Failed to grant late exception.')
        : (result.reason?.message || 'Failed to grant late exception.');
      _setLateExceptionStatus(target.uid, `Failed: ${error}`, '#991b1b');
    }
  });

  const parts = [];
  parts.push(`Granted ${successCount} of ${resolved.length}.`);
  if (unresolved.length) parts.push(`Unresolved: ${unresolved.join(', ')}`);
  if (failureCount) parts.push(`${failureCount} failed.`);
  _setManualLateExceptionStatus(parts.join(' '), failureCount || unresolved.length ? '#991b1b' : '#166534');

  await _refreshReviewer();
};
window._clearStaffErroneousSub = async function (assessmentId, uid, subId) { if (!confirm('Are you sure you want to clear this student\'s latest submission? They will be allowed to upload again.')) return; const statusEl = document.getElementById(`tutor-action-status-${uid}`); if (statusEl) statusEl.textContent = 'Clearing...'; const result = await clearErroneousSubmission(assessmentId, uid, subId); if (statusEl) { statusEl.textContent = result.ok ? 'Submission cleared.' : `Failed: ${result.error}`; statusEl.style.color = result.ok ? '#166534' : '#991b1b'; } if (result.ok) await _refreshReviewer(); };

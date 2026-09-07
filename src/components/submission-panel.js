// src/components/submission-panel.js
// ─────────────────────────────────────────────
// Student Submission Panel — Upload & track assessment files
// ─────────────────────────────────────────────
import {
  getMySubmissionException,
  saveSubmission,
  saveDraft,
  loadDraft,
  clearDraft,
  getMySubmissions,
  getMySubmissionIndex,
  resolveInitialSubmissionFiles,
  isAllowedFile,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_SUBMISSION,
  watchMySubmissionException,
  unwatchMySubmissionException,
  watchMySubmissionIndex,
  unwatchMySubmissionIndex,
} from '../submissions.js';
import { cancelSubmissionDraftFile, flushSyncQueue, queueSubmissionDraftFile } from '../sync-engine.js';
import {
  getCachedAssessmentSettingsOverride,
  getMergedAssessmentConfig,
  loadAssessmentSettingsOverrides,
} from '../assessment-settings.js';
import { isAssessmentOpenByDefault } from '../unit-access.js';
import * as assessments from '../../content/assessments/index.js';
import { buildAnnotatedHtmlReadOnly } from './grading-interface.js';

function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _fileIcon(name = '') {
  const ext = String(name).split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📑';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️';
  return '📎';
}

function _getMergedAssessmentConfigById(assessmentId) {
  const base = window._atConfigs?.[assessmentId]
    || Object.values(assessments).find((cfg) => cfg && typeof cfg === 'object' && cfg.id === assessmentId);
  if (!base) return null;
  return getMergedAssessmentConfig(base, getCachedAssessmentSettingsOverride(assessmentId));
}

// Assessment list derived from content/assessments
function _getAssessmentList() {
  const list = [];
  const runtimeConfigs = window._atConfigs && typeof window._atConfigs === 'object'
    ? Object.values(window._atConfigs)
    : [];
  const sourceList = runtimeConfigs.length
    ? runtimeConfigs
    : Object.values(assessments);
  for (const cfg of sourceList) {
    if (cfg && typeof cfg === 'object' && cfg.id) {
      const merged = getMergedAssessmentConfig(cfg, getCachedAssessmentSettingsOverride(cfg.id));
      list.push({ id: merged.id, badge: merged.badge || merged.id, title: merged.title || merged.id, icon: merged.icon || '📋', marks: merged.marks, deadline: merged.deadline || null });
    }
  }
  return list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function _deadlineInfo(deadline) {
  if (!deadline) return { passed: false, label: '' };
  const dl = new Date(deadline);
  const now = Date.now();
  if (Number.isNaN(dl.getTime())) return { passed: false, label: '' };
  const diff = dl.getTime() - now;
  if (diff <= 0) return { passed: true, label: 'Deadline passed' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return { passed: false, label: `${days}d ${hours}h remaining` };
  return { passed: false, label: `${hours}h remaining` };
}

// ── State ────────────────────────────────────
let _uploadedFiles = [];
let _uploadingCount = 0;
let _selectedAssessment = null;
let _submissionNote = '';
let _isGroupLeader = false;
let _assessmentListCache = [];
let _submissionIndexCache = {};
let _activeLateException = null;
const PORTAL_ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];

function _portalAcceptedExtensions() {
  return PORTAL_ACCEPTED_EXTENSIONS;
}

function _portalAcceptedLabel() {
  return 'PDF, DOCX, PNG, JPG';
}

function _hasActiveLateException(exception) {
  if (!exception || typeof exception !== 'object') return false;
  if (exception.allowLate !== true) return false;
  const expiresAt = exception.expiresAt || exception.until || exception.deadline;
  if (!expiresAt) return true;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return true;
  return Date.now() <= expiresMs;
}

function _assessmentCardsMarkup() {
  return _assessmentListCache.map((a) => {
    const sub = _submissionIndexCache[a.id];
    const hasSubmission = Boolean(sub?.latestAt);
    const dlInfo = _deadlineInfo(a.deadline);
    const openForAll = isAssessmentOpenByDefault(a.id);
    const dlBadge = openForAll
      ? `<div style="font-size:10px;font-weight:700;color:#047857;margin-top:4px;">Open for all students</div>`
      : (a.deadline ? (dlInfo.passed
      ? `<div style="font-size:10px;font-weight:700;color:#991b1b;margin-top:4px;">🔒 ${dlInfo.label}</div>`
      : `<div style="font-size:10px;font-weight:600;color:#047857;margin-top:4px;">⏳ ${dlInfo.label}</div>`
    ) : '');
    return `
      <button class="submission-assess-card" data-assess-id="${_esc(a.id)}" onclick="window._selectSubmissionAssessment('${_esc(a.id)}')" style="text-align:left;cursor:pointer;background:${_selectedAssessment === a.id ? '#f0f4ff' : 'white'};border:1px solid ${_selectedAssessment === a.id ? 'var(--navy)' : 'var(--border)'};border-radius:14px;padding:16px;box-shadow:0 4px 14px rgba(15,23,42,.04);transition:transform .15s,box-shadow .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 8px 20px rgba(15,23,42,.08)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(15,23,42,.04)'">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:22px;">${a.icon}</div>
            <div>
              <div style="font-weight:800;color:var(--navy);font-size:14px;">${_esc(a.badge)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">${_esc(a.title)}${a.marks ? ` · ${a.marks} marks` : ''}</div>
              ${a.deadline ? `<div style="font-size:10px;color:var(--muted);margin-top:2px;">Deadline: ${_fmtDate(a.deadline)}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right;">
            ${hasSubmission
              ? `<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;">Submitted (v${sub.totalVersions || 1})</span>${sub.isLate ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fbbf24;margin-left:5px;">Late</span>` : ''}
                 <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_fmtDate(sub.latestAt)}</div>`
              : `<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;">Not submitted</span>`}
            ${dlBadge}
          </div>
        </div>
      </button>`;
  }).join('');
}

function _renderAssessmentCards() {
  const mount = document.getElementById('submission-assessment-list');
  if (mount) mount.innerHTML = _assessmentCardsMarkup();
}

function _matchesExistingFile(file, slot = '') {
  const name = String(file?.name || '').trim().toLowerCase();
  const size = Number(file?.size || 0);
  return _uploadedFiles.some((existing) => {
    if (!existing) return false;
    if (slot && existing.slot === slot) return false;
    return String(existing.name || '').trim().toLowerCase() === name && Number(existing.size || 0) === size;
  });
}

function _hasPendingDraftUploads() {
  return _uploadedFiles.some((file) => file?.pendingUpload);
}

async function _getLatestActiveSubmission(assessmentId) {
  try {
    const subs = await getMySubmissions(assessmentId); // newest-first, only real submissions
    return subs.find((s) => s && s.status !== 'cleared') || null;
  } catch {
    return null;
  }
}

async function _syncSubmissionDraftIntoUi(assessmentId) {
  if (!assessmentId || _selectedAssessment !== assessmentId) return;
  const draft = await loadDraft(assessmentId);
  const isSlotBased = assessmentId === 'a1';
  const draftFiles = Array.isArray(draft?.files)
    ? (isSlotBased ? draft.files.filter((file) => file.slot) : draft.files)
    : [];
  // Only overwrite the staged files when the draft actually has files. An empty
  // draft (e.g. a note-only save) must not wipe carried-forward submission files.
  if (draftFiles.length) _uploadedFiles = draftFiles;
  _submissionNote = draft?.note || _submissionNote;
  const uploadArea = document.getElementById('submission-upload-area');
  if (uploadArea) _renderUploadArea(uploadArea);
}

function _collectSubmissionReadiness() {
  const declPlag = document.getElementById('decl-plag')?.checked;
  const declAi = document.getElementById('decl-ai')?.checked;
  const isAssessment1 = _selectedAssessment === 'a1';

  let filesOk = false;
  let missingMsg = '';
  if (isAssessment1) {
    const hasReport = _uploadedFiles.some((f) => f.slot === 'a1-slot-report');
    const hasPolicy = _uploadedFiles.some((f) => f.slot === 'a1-slot-policy');
    const hasRefs = _uploadedFiles.some((f) => f.slot === 'a1-slot-refs');
    const isLeader = _isGroupLeader;
    const hasCollab = _uploadedFiles.some((f) => f.slot === 'a1-slot-collab');
    const individualOk = hasReport && hasPolicy && hasRefs;
    filesOk = individualOk && (!isLeader || hasCollab);
    if (!individualOk) {
      missingMsg = 'All three individual document slots must be filled.';
    } else if (isLeader && !hasCollab) {
      missingMsg = 'Group Leaders must also upload the collaborative cross-platform report (slot 1.4).';
    }
  } else {
    filesOk = _uploadedFiles.length > 0;
    if (!filesOk) missingMsg = 'Select files to upload.';
  }

  return {
    declPlag,
    declAi,
    filesOk,
    missingMsg,
    canSubmit: filesOk && _uploadingCount === 0 && !_hasPendingDraftUploads() && declPlag && declAi,
  };
}

// ── Render the full panel ────────────────────
export async function renderSubmissionPanel(container) {
  if (!container) return;

  await loadAssessmentSettingsOverrides();
  _assessmentListCache = _getAssessmentList();
  _submissionIndexCache = await getMySubmissionIndex();
  unwatchMySubmissionIndex();
  watchMySubmissionIndex((index) => {
    _submissionIndexCache = index || {};
    _renderAssessmentCards();
  });

  if (!window._submissionDraftUpdateBound) {
    window._submissionDraftUpdateBound = true;
    window.addEventListener('submission-draft-updated', (event) => {
      const assessmentId = String(event?.detail?.assessmentId || '').trim();
      if (!assessmentId) return;
      _syncSubmissionDraftIntoUi(assessmentId).catch(console.error);
    });
  }

  container.innerHTML = `
    <div class="submission-panel anim-fade" style="max-width:900px;margin:0 auto;padding:20px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div>
          <h2 style="margin:0;color:var(--navy);font-size:22px;">Submit Assessment Tasks</h2>
          <p style="margin:6px 0 0 0;color:var(--muted);font-size:13px;line-height:1.6;">Upload your assessment files here. All submissions are safely stored and versioned — you will never lose your work.</p>
        </div>
        <button class="btn-prev" style="display:inline-flex;" onclick="window.renderStudentDashboard()">← Dashboard</button>
      </div>

      <div id="submission-assessment-list" style="display:grid;gap:12px;margin-bottom:24px;">
        ${_assessmentCardsMarkup()}
      </div>

      <div id="submission-upload-area" style="display:none;"></div>
      <div id="submission-history-area"></div>
    </div>
  `;

  const initialAssessmentId = String(window._submissionPanelInitialAssessment || '').trim();
  if (initialAssessmentId && _assessmentListCache.some((a) => a.id === initialAssessmentId)) {
    window._submissionPanelInitialAssessment = '';
    await window._selectSubmissionAssessment(initialAssessmentId);
  }
}

// ── Select an assessment to upload for ───────
window._selectSubmissionAssessment = async function (assessmentId) {
  _selectedAssessment = assessmentId;
  _uploadedFiles = [];
  _submissionNote = '';
  _isGroupLeader = false;
  _activeLateException = await getMySubmissionException(assessmentId);
  unwatchMySubmissionException();
  watchMySubmissionException(assessmentId, (exception) => {
    _activeLateException = exception;
    const uploadArea = document.getElementById('submission-upload-area');
    if (uploadArea) _renderUploadArea(uploadArea);
  });

  // Highlight selected card
  _renderAssessmentCards();

  const uploadArea = document.getElementById('submission-upload-area');
  const historyArea = document.getElementById('submission-history-area');
  if (!uploadArea || !historyArea) return;
  uploadArea.style.display = 'block';

  // Check deadline — default-open assessments stay available for all students.
  const assessCfg = _getMergedAssessmentConfigById(assessmentId);
  let _showLateBanner = false;
  if (assessCfg?.deadline && !isAssessmentOpenByDefault(assessmentId)) {
    const dlInfo = _deadlineInfo(assessCfg.deadline);
    if (dlInfo.passed) {
      _showLateBanner = true;
    }
  }
  window._submissionLateWarning = _showLateBanner;

  // Load draft (in-progress edits) and, for non-slot assessments, the files from
  // the latest active submission. A resubmission must start from the COMPLETE set
  // the student already submitted so adding one more file does not create a new
  // latest submission holding only that fragment.
  const isSlotBased = assessmentId === 'a1';
  const draft = await loadDraft(assessmentId);
  const latestSubmission = isSlotBased ? null : await _getLatestActiveSubmission(assessmentId);
  _uploadedFiles = resolveInitialSubmissionFiles({ draft, latestSubmission, slotBased: isSlotBased });
  _submissionNote = draft?.note || '';

  _renderUploadArea(uploadArea);
  if (_hasPendingDraftUploads() && typeof navigator !== 'undefined' && navigator.onLine) {
    flushSyncQueue('submission-panel-select').catch(console.error);
  }
  await _renderHistory(historyArea, assessmentId);
};

function _renderUploadArea(el) {
  const hasFiles = _uploadedFiles.length > 0;
  const isAssessment1 = _selectedAssessment === 'a1';

  let specificInstructions = '';
  let groupLeaderCheckbox = '';

  if (isAssessment1) {
    specificInstructions = `
      <div style="background:rgba(236,253,245,0.7);border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:18px;">
        <h4 style="margin:0 0 8px 0;color:#065f46;font-size:14px;">Assessment 1 Requirements</h4>
        <ul style="margin:0;padding-left:20px;color:#047857;font-size:13px;line-height:1.6;">
          <li><strong>Individual submissions:</strong> Ensure your document includes:
            <ul style="margin:4px 0 8px 0;padding-left:20px;">
              <li>1.1. A 300-word Platform Intelligence Report (include space for images/evidence of filter bubble evidence, algorithm behaviour, based on role/platform).</li>
              <li>1.2. A 700-word Media Literacy Policy Recommendation addressed to a school principal.</li>
              <li>1.3. A Reference List (APA 7th, minimum 3 verified sources).</li>
            </ul>
          </li>
          <li><strong>Wait, are you the group leader?</strong> Collaborative work should be submitted by the group leader only.</li>
        </ul>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;">
          <input type="checkbox" id="is-group-leader-chk" style="width:16px;height:16px;cursor:pointer;" onchange="window._toggleGroupLeaderSlot()">
          <span style="font-size:13px;font-weight:700;color:#065f46;">I am the Group Leader acting on behalf of my collaborative group</span>
        </label>
      </div>
    `;
  }

  const restrictedAcceptedExts = _portalAcceptedExtensions();

  const carriedCount = _uploadedFiles.filter((f) => f?.carriedForward).length;
  const carryForwardBanner = (!isAssessment1 && carriedCount) ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:14px 16px;margin-bottom:18px;display:flex;gap:12px;align-items:flex-start;">
      <div style="font-size:20px;line-height:1;">📎</div>
      <div>
        <div style="font-weight:800;color:#1e40af;font-size:14px;margin-bottom:4px;">Your ${carriedCount} previously submitted file${carriedCount === 1 ? '' : 's'} ${carriedCount === 1 ? 'is' : 'are'} loaded below</div>
        <div style="font-size:13px;color:#1e40af;line-height:1.6;">Add or remove files, then submit again to update your submission with the <strong>complete set</strong>. Submitting only a new file would replace — not add to — your earlier work. Every previous version is always kept.</div>
      </div>
    </div>
  ` : '';

  const hasLateException = _hasActiveLateException(_activeLateException);
  const lateBanner = window._submissionLateWarning ? (hasLateException ? `
    <div style="background:#ecfdf5;border:1px solid #86efac;border-radius:14px;padding:16px 18px;margin-bottom:18px;display:flex;gap:12px;align-items:flex-start;">
      <div style="font-size:22px;line-height:1;">✅</div>
      <div>
        <div style="font-weight:800;color:#166534;font-size:14px;margin-bottom:4px;">Late Exception Approved</div>
        <div style="font-size:13px;color:#166534;line-height:1.6;">Your lecturer has approved a late-submission exception for this assessment. You may submit below, and the submission will be <strong>marked as late</strong>.</div>
      </div>
    </div>
  ` : `
    <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:14px;padding:16px 18px;margin-bottom:18px;display:flex;gap:12px;align-items:flex-start;">
      <div style="font-size:22px;line-height:1;">⚠️</div>
      <div>
        <div style="font-weight:800;color:#92400e;font-size:14px;margin-bottom:4px;">Late Submission</div>
        <div style="font-size:13px;color:#92400e;line-height:1.6;">The deadline for this assessment has passed. Students with an approved late-submission exception may still submit below, and the submission will be <strong>marked as late</strong>. If you do not have an approved exception, the submission will be blocked and you should contact your lecturer.</div>
      </div>
    </div>
  `) : '';

  el.innerHTML = `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);margin-bottom:18px;">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Upload Submission Files</h3>
      <p style="margin:0 0 14px 0;color:var(--muted);font-size:12px;">Accepted: ${_portalAcceptedLabel()}. Up to ${MAX_FILES_PER_SUBMISSION} files. Maximum file size: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB each.</p>

      ${lateBanner}
      ${carryForwardBanner}
      ${specificInstructions}

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:16px;">
        <strong style="color:#92400e;font-size:13px;display:block;margin-bottom:4px;">📄 Important Document Upload Notice</strong>
        <span style="color:#92400e;font-size:12px;line-height:1.5;">Where PDFs are derived from converting DOCX, you must ensure that the PDF is readable and pages are not exported as images. Files must be readable by text analysis tools.</span>
      </div>

      ${isAssessment1 ? `
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px;">
          <!-- Slot 1.1 -->
          <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:#f8fafc;">
            <div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:8px;">1.1 Platform Intelligence Report (300 words)</div>
            ${_renderSlotUploadBtn('a1-slot-report')}
          </div>
          <!-- Slot 1.2 -->
          <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:#f8fafc;">
            <div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:8px;">1.2 Media Literacy Policy Recommendation (700 words)</div>
            ${_renderSlotUploadBtn('a1-slot-policy')}
          </div>
          <!-- Slot 1.3 -->
          <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:#f8fafc;">
            <div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:8px;">1.3 Reference List (APA 7th)</div>
            ${_renderSlotUploadBtn('a1-slot-refs')}
          </div>
          <!-- Slot 1.4 — Group Leader Collaborative Document -->
          <div id="a1-group-collab-slot" style="display:${_isGroupLeader ? 'block' : 'none'};border:1px solid #c4b5fd;border-radius:10px;padding:14px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:16px;">👥</span>
              <div style="font-size:13px;font-weight:800;color:#5b21b6;">1.4 Collaborative Cross-Platform Report (1000 words)</div>
            </div>
            <div style="font-size:11px;color:#6d28d9;line-height:1.5;margin-bottom:10px;">Group Leader only: Upload the jointly authored cross-platform comparison report on behalf of your group. This document must synthesise findings from all five platform monitors.</div>
            ${_renderSlotUploadBtn('a1-slot-collab')}
          </div>
        </div>
      ` : `
        <div id="submission-dropzone" style="border:2px dashed var(--border);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;" onclick="document.getElementById('submission-file-input').click()">
          <div style="font-size:32px;margin-bottom:8px;">📤</div>
          <div style="font-size:14px;font-weight:700;color:var(--navy);">Click to select files or drag & drop</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">Drag and drop enabled. Documents and valid screenshots only.</div>
          <input id="submission-file-input" type="file" multiple accept="${restrictedAcceptedExts.join(',')}" style="display:none;" onchange="window._handleSubmissionFiles(this.files, null, this)" />
        </div>
      `}

      <div id="submission-progress" style="margin-top:12px;display:none;"></div>

      ${!isAssessment1 ? `
      <div id="submission-file-list" style="margin-top:14px;">
        ${hasFiles ? _renderFileList() : ''}
      </div>` : ''}

      <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:16px;">
        <h4 style="margin:0 0 10px 0;color:var(--navy);font-size:14px;">Declarations (Required)</h4>
        <div style="background:#fee2e2;border:1px solid #f87171;border-radius:10px;padding:12px;margin-bottom:12px;">
          <strong style="color:#991b1b;font-size:12px;display:block;margin-bottom:4px;">⚠️ Academic Integrity Warning</strong>
          <span style="color:#991b1b;font-size:12px;line-height:1.5;display:block;">A breach of academic integrity (including plagiarism, fabrication, or unauthorised AI generation) may result in severe negative consequences such as a mark of zero, disciplinary action, and failure of the module.</span>
        </div>
        <label style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;cursor:pointer;">
          <input type="checkbox" id="decl-plag" style="width:16px;height:16px;margin-top:3px;cursor:pointer;" onchange="window._updateSubmitButton()">
          <span style="font-size:13px;color:#1e293b;line-height:1.5;"><strong>Academic Integrity Declaration:</strong> I declare that this assessment is my own original work. Where I have used the work of others, I have acknowledged it correctly. I understand the rules regarding plagiarism and academic misconduct.</span>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;cursor:pointer;">
          <input type="checkbox" id="decl-ai" style="width:16px;height:16px;margin-top:3px;cursor:pointer;" onchange="window._updateSubmitButton()">
          <span style="font-size:13px;color:#1e293b;line-height:1.5;"><strong>AI Ethical Use Declaration:</strong> I declare that I have followed the module guidelines for the ethical use of Artificial Intelligence. I have not used AI to generate final text or circumvent the learning outcomes of this task.</span>
        </label>
      </div>

      <div style="margin-top:14px;">
        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Submission Note (optional)</label>
        <textarea id="submission-note" rows="2" placeholder="Add a note for your lecturer or tutor..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;resize:vertical;font-family:inherit;">${_esc(_submissionNote)}</textarea>
      </div>

      <div style="display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap;">
        <button id="submission-submit-btn" class="btn-next" style="display:inline-flex;padding:10px 22px;font-weight:700;" onclick="window._submitAssessmentFiles()" disabled>
          Submit Assessment
        </button>
        <div id="submission-status" style="font-size:12px;color:var(--muted);">Select files and sign declarations to submit.</div>
      </div>
    </div>
  `;

  // Drag & drop
  const dropzone = document.getElementById('submission-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--navy)'; dropzone.style.background = '#f0f4ff'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border)'; dropzone.style.background = ''; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border)';
      dropzone.style.background = '';
      if (e.dataTransfer?.files?.length) window._handleSubmissionFiles(e.dataTransfer.files);
    });
  }

  const noteEl = document.getElementById('submission-note');
  if (noteEl) {
    noteEl.addEventListener('input', async () => {
      _submissionNote = noteEl.value || '';
      await saveDraft(_selectedAssessment, _uploadedFiles, _submissionNote);
      _setStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'Saved locally. Cloud sync will resume when you reconnect.' : 'Saved locally.');
    });
  }

  // Run a layout refresh for button states
  setTimeout(() => window._updateSubmitButton(), 0);
}

function _renderSlotUploadBtn(slotId) {
  const existingFile = _uploadedFiles.find(f => f.slot === slotId);
  const restrictedAcceptedExts = _portalAcceptedExtensions();
  
  if (existingFile) {
    const pendingLabel = existingFile.pendingUpload
      ? '<div style="font-size:11px;font-weight:700;color:#1d4ed8;">Saved locally • Uploading in background</div>'
      : '<div style="font-size:11px;color:var(--muted);">Cloud copy synced</div>';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:white;border:1px solid #bbf7d0;border-radius:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">${existingFile.pendingUpload ? '💾' : '✅'}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:#166534;">${_esc(existingFile.name)}</div>
            <div style="font-size:11px;color:var(--muted);">${_fmtSize(existingFile.size)}</div>
            ${pendingLabel}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button type="button" onclick="window._removeSubmissionSlot('${slotId}')" style="background:none;border:none;cursor:pointer;font-size:12px;color:#991b1b;">Replace/Remove</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <div style="position:relative;display:inline-block;">
        <span class="btn-prev" style="display:inline-flex;font-size:12px;padding:6px 14px;background:white;user-select:none;pointer-events:none;">Choose File</span>
        <input id="input-${slotId}" type="file" accept="${restrictedAcceptedExts.join(',')}"
          style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;"
          onchange="window._handleSubmissionFiles(this.files, '${slotId}', this)" />
      </div>
      <span style="font-size:11px;color:var(--muted);">Select one ${_portalAcceptedLabel()} file for this slot.</span>
    </div>
  `;
}

window._openSubmissionSlotPicker = function(slotId) {
  const input = document.getElementById(`input-${slotId}`);
  if (!input) {
    _setStatus('The file picker could not be opened. Please reload the page and try again.', true);
    return;
  }
  input.value = '';
  input.click();
};

window._removeSubmissionSlot = function(slotId) {
  const removed = _uploadedFiles.find((file) => file.slot === slotId);
  _uploadedFiles = _uploadedFiles.filter(f => f.slot !== slotId);
  const uploadArea = document.getElementById('submission-upload-area');
  if (uploadArea) _renderUploadArea(uploadArea);
  if (removed?.pendingUpload && removed.localDraftId) {
    cancelSubmissionDraftFile({ assessmentId: _selectedAssessment, draftFileId: removed.localDraftId }).catch(console.error);
  }
  saveDraft(_selectedAssessment, _uploadedFiles, document.getElementById('submission-note')?.value || '');
};

window._toggleGroupLeaderSlot = function() {
  _isGroupLeader = document.getElementById('is-group-leader-chk')?.checked || false;
  const collabSlot = document.getElementById('a1-group-collab-slot');
  if (collabSlot) {
    collabSlot.style.display = _isGroupLeader ? 'block' : 'none';
  }
  // If group leader unchecked, remove any collab file so validation won't block
  if (!_isGroupLeader) {
    _uploadedFiles = _uploadedFiles.filter(f => f.slot !== 'a1-slot-collab');
  }
  _updateSubmitButton();
};

function _renderFileList() {
  if (!_uploadedFiles.length) return '';
  return `<div style="display:grid;gap:8px;">
    ${_uploadedFiles.map((f, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">${_fileIcon(f.name)}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--navy);word-break:break-all;">${_esc(f.name)}</div>
            <div style="font-size:11px;color:var(--muted);">${_fmtSize(f.size)} · ${f.pendingUpload ? 'Saved locally' : 'Uploaded'} ${_fmtDate(f.uploadedAt)}</div>
            <div style="font-size:11px;font-weight:700;color:${f.pendingUpload ? '#1d4ed8' : '#166534'};">${f.pendingUpload ? 'Waiting to sync to Firebase' : 'Cloud copy synced'}</div>
            ${f.carriedForward ? `<div style="font-size:10px;font-weight:700;color:#1e40af;">Previously submitted</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${f.url ? `<a href="${_esc(f.url)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--navy);text-decoration:none;font-weight:600;">Preview</a>` : '<span style="font-size:11px;color:var(--muted);">Preview after sync</span>'}
          <button onclick="window._removeSubmissionFile(${i})" style="background:none;border:none;cursor:pointer;font-size:14px;color:#991b1b;" title="Remove">✕</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Handle file selection ────────────────────
window._handleSubmissionFiles = async function (fileList, targetSlot = null, sourceInput = null) {
  if (!fileList?.length || !_selectedAssessment) return;

  const files = Array.from(fileList);
  const effectiveCount = targetSlot
    ? _uploadedFiles.filter((file) => file.slot !== targetSlot).length
    : _uploadedFiles.length;
  const remaining = MAX_FILES_PER_SUBMISSION - effectiveCount;
  if (remaining <= 0) {
    _setStatus(`Maximum ${MAX_FILES_PER_SUBMISSION} files allowed.`, true);
    if (sourceInput) sourceInput.value = '';
    return;
  }

  const rejected = [];
  const queue = targetSlot ? files.slice(0, 1) : files.slice(0, remaining);
  if (targetSlot && files.length > 1) {
    rejected.push('Only one file can be uploaded into each required slot.');
  }
  if (!targetSlot && files.length > remaining) {
    rejected.push(`Only ${remaining} more file${remaining === 1 ? '' : 's'} can be uploaded before reaching the ${MAX_FILES_PER_SUBMISSION}-file limit.`);
  }

  const progressEl = document.getElementById('submission-progress');
  if (progressEl) progressEl.style.display = 'block';

  const restrictedAcceptedExts = _portalAcceptedExtensions();
  let uploadedCount = 0;
  for (const file of queue) {
    const ext = String(file.name).split('.').pop()?.toLowerCase() || '';
    if (!restrictedAcceptedExts.includes('.' + ext)) {
      rejected.push(`${file.name}: file type ".${ext || 'unknown'}" is not accepted. Use ${_portalAcceptedLabel()}.`);
      continue;
    }

    const check = isAllowedFile(file);
    if (!check.ok) {
      rejected.push(`${file.name}: ${check.reason}`);
      continue;
    }

    if (_matchesExistingFile(file, targetSlot)) {
      rejected.push(`${file.name}: this file is already in the submission list.`);
      continue;
    }

    _uploadingCount++;
    _updateSubmitButton();

    if (progressEl) {
      progressEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">
          <div class="rec-spinner" style="width:18px;height:18px;"></div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--navy);">Saving ${_esc(file.name)} locally...</div>
            <div id="submission-pct" style="font-size:11px;color:var(--muted);">Protecting your draft first</div>
          </div>
        </div>`;
    }

    try {
      const pending = await queueSubmissionDraftFile({
        assessmentId: _selectedAssessment,
        slot: targetSlot,
        file,
      });
      if (targetSlot) {
        const previous = _uploadedFiles.find((entry) => entry.slot === targetSlot);
        if (previous?.pendingUpload && previous.localDraftId) {
          await cancelSubmissionDraftFile({ assessmentId: _selectedAssessment, draftFileId: previous.localDraftId }).catch(() => {});
        }
        _uploadedFiles = _uploadedFiles.filter(f => f.slot !== targetSlot);
      }
      _uploadedFiles.push(pending);
      uploadedCount += 1;
      await saveDraft(_selectedAssessment, _uploadedFiles, document.getElementById('submission-note')?.value || '');
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        flushSyncQueue('submission-file-selected').catch(console.error);
      }
    } catch (err) {
      const errMsg = err?.message || 'Could not preserve this file locally.';
      console.error('[Submission upload error]', errMsg);
      if (typeof window.showToast === 'function') window.showToast(`File not protected yet: ${errMsg}`, 'error');
      rejected.push(`${file.name}: ${errMsg}`);
    } finally {
      _uploadingCount--;
    }
  }

  if (progressEl) progressEl.style.display = 'none';
  if (sourceInput) sourceInput.value = '';

  // Re-render
  if (_selectedAssessment === 'a1') {
    const uploadArea = document.getElementById('submission-upload-area');
    if (uploadArea) _renderUploadArea(uploadArea);
  } else {
    const listEl = document.getElementById('submission-file-list');
    if (listEl) listEl.innerHTML = _renderFileList();
  }
  
  _updateSubmitButton();
  if (rejected.length) {
    const successText = uploadedCount ? `${uploadedCount} file(s) saved locally. ` : '';
    _setStatus(`${successText}${rejected.join(' ')}`, true);
  } else {
    const mode = typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'Draft saved locally. Uploads will resume when you reconnect.'
      : 'Draft saved locally. Background upload is in progress.';
    _setStatus(_uploadedFiles.length ? mode : '');
  }
};

window._removeSubmissionFile = function (index) {
  const removed = _uploadedFiles[index];
  _uploadedFiles.splice(index, 1);
  const listEl = document.getElementById('submission-file-list');
  if (listEl) listEl.innerHTML = _renderFileList();
  _updateSubmitButton();
  if (removed?.pendingUpload && removed.localDraftId) {
    cancelSubmissionDraftFile({ assessmentId: _selectedAssessment, draftFileId: removed.localDraftId }).catch(console.error);
  }
  saveDraft(_selectedAssessment, _uploadedFiles, document.getElementById('submission-note')?.value || '');
};

// ── Submit ───────────────────────────────────
window._submitAssessmentFiles = async function () {
  if (!_selectedAssessment || !_uploadedFiles.length) return;

  const readiness = _collectSubmissionReadiness();
  
  if (_uploadingCount > 0) {
    _setStatus('Please wait for all uploads to finish before submitting.', true);
    return;
  }

  if (_hasPendingDraftUploads()) {
    _setStatus('Some files are still saved locally and have not finished syncing to Firebase yet. Reconnect or wait for background upload to finish before submitting.', true);
    return;
  }

  if (!readiness.filesOk) {
    _setStatus(readiness.missingMsg || 'Your submission is not complete yet.', true);
    return;
  }

  if (!readiness.declPlag || !readiness.declAi) {
    _setStatus('You must acknowledge both the academic integrity and AI ethical use declarations to submit.', true);
    return;
  }

  const isGroupLeader = document.getElementById('is-group-leader-chk')?.checked || false;
  let note = document.getElementById('submission-note')?.value || '';
  _submissionNote = note;
  if (isGroupLeader) {
    note = '[Group Leader Submission] ' + note;
  }

  _activeLateException = await getMySubmissionException(_selectedAssessment);

  const btn = document.getElementById('submission-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  const result = await saveSubmission(_selectedAssessment, _uploadedFiles, { note });

  if (result.ok) {
    _setStatus(`Submitted successfully (version ${result.version}). Your work is safely stored.`);
    await clearDraft(_selectedAssessment);
    _uploadedFiles = [];
    _submissionNote = '';

    // Refresh
    const uploadArea = document.getElementById('submission-upload-area');
    if (uploadArea) _renderUploadArea(uploadArea);
    const historyArea = document.getElementById('submission-history-area');
    if (historyArea) await _renderHistory(historyArea, _selectedAssessment);

    // Update card badge
    const card = document.querySelector(`.submission-assess-card[data-assess-id="${_selectedAssessment}"]`);
    if (card) {
      const badge = card.querySelector('span[style*="background:#fffbeb"]');
      if (badge) {
        badge.style.background = '#ecfdf5';
        badge.style.color = '#166534';
        badge.style.borderColor = '#bbf7d0';
        badge.textContent = `Submitted (v${result.version})`;
      }
    }
  } else {
    _setStatus(result.error || 'Submission failed. Your draft is saved — try again.', true);
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Assessment'; }
  }
};

// ── Submission history ───────────────────────
async function _renderHistory(el, assessmentId) {
  const subs = await getMySubmissions(assessmentId);
  if (!subs.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 14px 0;color:var(--navy);font-size:16px;">Submission History</h3>
      <p style="margin:0 0 14px 0;color:var(--muted);font-size:12px;">All your previous submissions are safely stored below. Every version is kept — you can always access older submissions.</p>
      <div style="display:grid;gap:12px;">
        ${subs.map((s) => `
          <details style="border:1px solid var(--border);border-radius:12px;padding:0 14px;background:#f8fafc;">
            <summary style="list-style:none;cursor:pointer;padding:14px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div>
                <span style="font-weight:800;color:var(--navy);">Version ${s.version || 1}</span>
                <span style="font-size:12px;color:var(--muted);margin-left:8px;">${_fmtDate(s.submittedAt)}</span>
                ${s.isLate ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#fffbeb;color:#92400e;border:1px solid #fbbf24;margin-left:6px;">Late</span>` : ''}
              </div>
              <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:${s.status === 'reviewed' ? '#ede9fe' : '#ecfdf5'};color:${s.status === 'reviewed' ? '#5b21b6' : '#166534'};border:1px solid ${s.status === 'reviewed' ? '#c4b5fd' : '#bbf7d0'};">${s.status === 'reviewed' ? 'Reviewed' : 'Submitted'}</span>
            </summary>
            <div style="padding:0 0 14px 0;">
              ${(s.files || []).map((f) => `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:white;margin-bottom:6px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;">${_fileIcon(f.name)}</span>
                    <div>
                      <div style="font-size:12px;font-weight:700;color:var(--navy);word-break:break-all;">${_esc(f.name)}</div>
                      <div style="font-size:11px;color:var(--muted);">${_fmtSize(f.size)}</div>
                    </div>
                  </div>
                  <a href="${_esc(f.url)}" target="_blank" rel="noopener" class="btn-prev" style="display:inline-flex;font-size:11px;padding:4px 10px;">Download</a>
                </div>
              `).join('')}
              ${s.note ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#f1f5f9;font-size:12px;color:var(--muted);"><strong>Note:</strong> ${_esc(s.note)}</div>` : ''}
              ${s.feedback ? (() => {
                const hasAnnotatedView = s.feedback.submissionText && Array.isArray(s.feedback.annotations) && s.feedback.annotations.length > 0;
                if (hasAnnotatedView) {
                  const annotatedHtml = buildAnnotatedHtmlReadOnly(s.feedback.submissionText, s.feedback.annotations);
                  const cards = s.feedback.annotations.map((ann, idx) => {
                    const quote = String(ann.quote || '').slice(0, 200);
                    const comment = String(ann.comment || '');
                    const sourceLabel = String(ann.sourceLabel || ann.markerName || 'Marker');
                    const isAi = String(ann.source || '').toLowerCase() === 'ai';
                    const badgeBg = isAi ? '#fef3c7' : '#dbeafe';
                    const badgeFg = isAi ? '#92400e' : '#1e40af';
                    const badgeBorder = isAi ? '#fde68a' : '#93c5fd';
                    const cardBg = isAi ? '#fffbeb' : '#eff6ff';
                    const quoteBg = isAi ? '#fef3c7' : '#dbeafe';
                    const quoteFg = isAi ? '#78350f' : '#1e3a8a';
                    const icon = isAi ? '🤖' : '✏️';
                    return `<div id="gi-ro-card-${idx}" style="border:1px solid ${badgeBorder};border-radius:10px;padding:10px 12px;background:${cardBg};"><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:${badgeBg};color:${badgeFg};border:1px solid ${badgeBorder};display:inline-block;margin-bottom:6px;">${icon} ${_esc(sourceLabel)}</span>${quote ? `<div style="font-size:11px;color:${quoteFg};background:${quoteBg};border-radius:6px;padding:4px 8px;margin-bottom:6px;font-style:italic;">"${_esc(quote.slice(0, 120))}${quote.length > 120 ? '…' : ''}"</div>` : ''}<div style="font-size:12px;color:#1e293b;line-height:1.5;">${_esc(comment)}</div></div>`;
                  }).join('');
                  return `
                    <div style="margin-top:10px;border:1px solid #c4b5fd;border-radius:12px;overflow:hidden;">
                      <div style="padding:10px 14px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-bottom:1px solid #c4b5fd;">
                        <div style="font-size:12px;font-weight:800;color:#5b21b6;">Feedback from ${_esc(s.feedback.reviewerName || 'Staff')}</div>
                        ${s.feedback.mark != null ? `<div style="font-size:16px;font-weight:900;color:#5b21b6;margin-top:2px;">Mark: ${s.feedback.mark}</div>` : ''}
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_fmtDate(s.feedback.reviewedAt)}</div>
                      </div>
                      <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:0;">
                        <div style="padding:14px;border-right:1px solid #e2e8f0;font-size:12px;color:#334155;line-height:1.8;max-height:400px;overflow:auto;white-space:normal;">${annotatedHtml}</div>
                        <div style="padding:12px;display:grid;gap:8px;align-content:start;max-height:400px;overflow:auto;">${cards}</div>
                      </div>
                      ${s.feedback.comment ? `<div style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:13px;color:#3b0764;line-height:1.6;white-space:pre-wrap;">${_esc(s.feedback.comment)}</div>` : ''}
                    </div>
                  `;
                }
                return `
                  <div style="margin-top:10px;padding:12px;border-radius:10px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;">
                    <div style="font-size:12px;font-weight:800;color:#5b21b6;margin-bottom:4px;">Feedback from ${_esc(s.feedback.reviewerName || 'Staff')}</div>
                    ${s.feedback.mark != null ? `<div style="font-size:13px;font-weight:900;color:#5b21b6;margin-bottom:6px;">Mark: ${s.feedback.mark}</div>` : ''}
                    <div style="font-size:13px;color:#3b0764;line-height:1.6;white-space:pre-wrap;">${_esc(s.feedback.comment)}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:6px;">${_fmtDate(s.feedback.reviewedAt)}</div>
                  </div>
                `;
              })() : ''}
            </div>
          </details>
        `).join('')}
      </div>
    </div>
  `;
}

function _updateSubmitButton() {
  const btn = document.getElementById('submission-submit-btn');
  const status = document.getElementById('submission-status');
  
  if (!btn) return;
  const readiness = _collectSubmissionReadiness();
  btn.disabled = !readiness.canSubmit;
  
  if (_uploadingCount > 0) {
    btn.textContent = 'Uploading...';
    if (status) status.textContent = 'Uploading files...';
  } else if (_hasPendingDraftUploads()) {
    btn.textContent = 'Waiting for Sync...';
    if (status) status.textContent = 'Files are saved locally and syncing to Firebase in the background.';
  } else {
    btn.textContent = 'Submit Assessment';
    if (status && readiness.filesOk) {
      if (!readiness.declPlag || !readiness.declAi) {
         status.textContent = 'Sign the declarations to submit.';
      } else {
         status.textContent = `All set! You may now submit.`;
      }
    } else if (status) {
       status.textContent = readiness.missingMsg || 'Select files and sign declarations to submit.';
    }
  }
}
window._updateSubmitButton = _updateSubmitButton;

function _setStatus(msg, isError = false) {
  const el = document.getElementById('submission-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#991b1b' : 'var(--muted)';
}

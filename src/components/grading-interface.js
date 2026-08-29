// src/components/grading-interface.js
// ─────────────────────────────────────────────
// Inline Grading Interface — split-panel document + annotation component
// Used inside the submission reviewer for tutors and moderators.
// ─────────────────────────────────────────────
import {
  saveMarkerAnnotation,
  deleteMarkerAnnotation,
  updateAnnotationDraftInclusion,
} from '../submissions.js';
import { extractSubmissionBundle } from '../document-text.js';
import { STATE } from '../state.js';
import { findQuoteMatches } from '../quote-match.js';

// ── Module-level state ───────────────────────
window._giState = window._giState || {};
window._giPending = window._giPending || {};

// ── Helpers ──────────────────────────────────
function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _escNl(v = '') {
  return _esc(v).replace(/\n/g, '<br>');
}

function _cleanText(v, max = 1000) {
  return String(v || '').trim().slice(0, max);
}

function _nowIso() {
  return new Date().toISOString();
}

function _uid() {
  return STATE.user?.uid || '';
}

function _userName() {
  return STATE.user?.displayName?.split(' [')[0]?.trim() || '';
}

function _userRole() {
  return String(STATE.user?._resolvedRole || STATE.user?.profile?.role || '').trim().toLowerCase();
}

function _stamp() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Build highlighted HTML from annotations — supports multi-source (AI + tutor)
// Each annotation must have: { id, quote, comment, source: 'ai'|'tutor' }
function _giBuildHighlightedHtml(submissionId, studentText, allAnnotations) {
  const text = String(studentText || '');
  if (!text) return '<em style="color:#94a3b8;font-size:13px;">No submission text available.</em>';

  const candidateHits = [];
  const annotationMap = allAnnotations.map((annotation, idx) => {
    const quote = String(annotation?.quote || '');
    const matches = findQuoteMatches(text, quote);
    matches.forEach((hit, hitIdx) => {
      candidateHits.push({
        annotationIdx: idx,
        start: hit.start,
        end: hit.end,
        length: hit.end - hit.start,
        hitId: `gi-hit-${_esc(submissionId)}-${idx}-${hitIdx}`,
      });
    });
    return { annotation, idx, matched: matches.length > 0, firstHitId: null };
  });

  // Non-overlapping selection — longest wins
  const selected = [];
  candidateHits
    .sort((a, b) => (b.length - a.length) || (a.start - b.start) || (a.annotationIdx - b.annotationIdx))
    .forEach((hit) => {
      if (!selected.some((c) => hit.start < c.end && hit.end > c.start)) selected.push(hit);
    });

  selected.sort((a, b) => a.start - b.start);
  selected.forEach((hit) => {
    const entry = annotationMap[hit.annotationIdx];
    if (!entry.firstHitId) entry.firstHitId = hit.hitId;
  });

  let cursor = 0;
  const parts = [];
  selected.forEach((hit) => {
    if (hit.start > cursor) parts.push(_escNl(text.slice(cursor, hit.start)));
    const ann = annotationMap[hit.annotationIdx]?.annotation || {};
    const isAi = ann.source === 'ai';
    const bg = isAi ? '#fef3c7' : '#dbeafe';
    const fg = isAi ? '#92400e' : '#1e40af';
    const title = _cleanText(`${isAi ? 'AI' : 'Marker'}: ${ann.comment || ''}`, 400);
    parts.push(
      `<mark id="${hit.hitId}" onclick="window._giFocusCard('${_esc(submissionId)}',${hit.annotationIdx})" title="${_esc(title)}" style="background:${bg};color:${fg};padding:0 2px;border-radius:3px;cursor:pointer;">${_escNl(text.slice(hit.start, hit.end))}</mark>`
    );
    cursor = hit.end;
  });
  if (cursor < text.length) parts.push(_escNl(text.slice(cursor)));

  return parts.join('');
}

// Build annotation cards for the sidebar
function _giRenderCards(submissionId, markerAnnotations, eltAnnotations, mode, studentUid, assessmentId) {
  const cards = [];

  if (Array.isArray(eltAnnotations)) {
    eltAnnotations.forEach((ann, idx) => {
      const quote = _cleanText(ann.exact_quote || '', 200);
      const comment = _cleanText(ann.comment || '', 600);
      const type = _cleanText(ann.feedback_type || 'AI', 40);
      const checked = ann.includeInDraft ? 'checked' : '';
      cards.push(`
        <div id="gi-card-${_esc(submissionId)}-${idx}" style="border:1px solid #fde68a;border-radius:10px;padding:10px 12px;background:#fffbeb;cursor:pointer;" onclick="window._giFocusHit('${_esc(submissionId)}',${idx})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;text-transform:uppercase;">🤖 ${_esc(type)}</span>
            ${mode === 'moderator'
              ? `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;color:#92400e;font-weight:700;white-space:nowrap;">
                  <input type="checkbox" ${checked} onchange="window._giToggleEltInclusion('${_esc(submissionId)}',${idx},this.checked)" style="cursor:pointer;">
                  Include
                </label>`
              : '<span style="font-size:11px;color:#92400e;font-weight:700;white-space:nowrap;">AI annotation</span>'}
          </div>
          ${quote ? `<div style="font-size:11px;color:#78350f;background:#fef9c3;border-radius:6px;padding:4px 8px;margin-bottom:6px;font-style:italic;">"${_esc(quote.slice(0, 120))}${quote.length > 120 ? '…' : ''}"</div>` : ''}
          <div style="font-size:12px;color:#451a03;line-height:1.5;">${_esc(comment)}</div>
        </div>`);
    });
  }

  if (Array.isArray(markerAnnotations)) {
    markerAnnotations.forEach((ann, idx) => {
      const globalIdx = (mode === 'moderator' && eltAnnotations ? eltAnnotations.length : 0) + idx;
      const quote = _cleanText(ann.quote || '', 200);
      const comment = _cleanText(ann.comment || '', 600);
      const markerName = _esc(ann.markerName || 'Marker');
      const isIncluded = ann.includeInDraft;
      cards.push(`
        <div id="gi-card-${_esc(submissionId)}-${globalIdx}" style="border:1px solid ${isIncluded ? '#93c5fd' : 'var(--border, #e2e8f0)'};border-radius:10px;padding:10px 12px;background:${isIncluded ? '#eff6ff' : 'white'};cursor:pointer;" onclick="window._giFocusHit('${_esc(submissionId)}',${globalIdx})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;">✏️ ${markerName}</span>
            ${mode === 'moderator' ? `
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;color:#1e40af;font-weight:700;white-space:nowrap;">
                <input type="checkbox" ${isIncluded ? 'checked' : ''} onchange="window._giToggleIncludeInDraft('${_esc(submissionId)}','${_esc(ann.id)}',this.checked,'${_esc(studentUid)}','${_esc(assessmentId)}')" style="cursor:pointer;">
                Include
              </label>` : `
              <button onclick="event.stopPropagation();window._giDeleteAnnotation('${_esc(submissionId)}','${_esc(ann.id)}','${_esc(studentUid)}','${_esc(assessmentId)}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:#991b1b;padding:0;">Remove</button>`}
          </div>
          ${quote ? `<div style="font-size:11px;color:#1e3a8a;background:#dbeafe;border-radius:6px;padding:4px 8px;margin-bottom:6px;font-style:italic;">"${_esc(quote.slice(0, 120))}${quote.length > 120 ? '…' : ''}"</div>` : ''}
          <div style="font-size:12px;color:#1e293b;line-height:1.5;">${_esc(comment)}</div>
        </div>`);
    });
  }

  if (!cards.length) {
    return `<div style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 10px;">${mode === 'moderator' ? 'No annotations yet.' : 'Select text in the submission to add a comment.'}</div>`;
  }
  return cards.join('');
}

// Rebuild the text panel and annotation sidebar in-place after state changes
function _giRefresh(submissionId) {
  const state = window._giState?.[submissionId];
  if (!state) return;

  // Rebuild highlighted text
  const textPanel = document.getElementById(`gi-text-${submissionId}`);
  if (textPanel) {
    const allAnnotations = _giGetAllAnnotations(state);
    textPanel.innerHTML = _giBuildHighlightedHtml(submissionId, state.studentText, allAnnotations);
  }

  // Rebuild cards
  const cardsPanel = document.getElementById(`gi-cards-${submissionId}`);
  if (cardsPanel) {
    cardsPanel.innerHTML = _giRenderCards(submissionId, state.markerAnnotations, state.eltAnnotations, state.mode, state.studentUid, state.assessmentId);
  }

  // Update annotation count badge
  const badge = document.getElementById(`gi-count-${submissionId}`);
  if (badge) {
    const count = (state.markerAnnotations?.length || 0) + (state.eltAnnotations?.length || 0);
    badge.textContent = count > 0 ? `(${count})` : '';
  }
}

function _giGetAllAnnotations(state) {
  const all = [];
  if (Array.isArray(state.eltAnnotations)) {
    state.eltAnnotations.forEach((ann, idx) => {
      all.push({ id: `elt-${idx}`, quote: ann.exact_quote || '', comment: ann.comment || '', source: 'ai', includeInDraft: ann.includeInDraft || false });
    });
  }
  if (Array.isArray(state.markerAnnotations)) {
    state.markerAnnotations.forEach((ann) => {
      all.push({ ...ann, source: 'tutor' });
    });
  }
  return all;
}

// ── Public API ───────────────────────────────

export function renderGradingInterface(container, opts) {
  if (!container) return;
  const {
    submissionId, studentUid, assessmentId,
    studentText = '',
    subFiles = [],
    markerAnnotations = [],
    eltAnnotations = null,
    eltAssessment = null,
    mode = 'tutor',
    canEdit = true,
  } = opts;

  window._giState[submissionId] = {
    submissionId, studentUid, assessmentId,
    studentText,
    subFiles: Array.isArray(subFiles) ? subFiles : [],
    markerAnnotations: Array.isArray(markerAnnotations) ? markerAnnotations : [],
    eltAnnotations: Array.isArray(eltAnnotations) ? eltAnnotations : null,
    eltAssessment,
    mode,
    canEdit,
    pendingQuote: '',
  };

  const state = window._giState[submissionId];
  const allAnnotations = _giGetAllAnnotations(state);
  const highlightedHtml = studentText
    ? _giBuildHighlightedHtml(submissionId, studentText, allAnnotations)
    : '<div style="display:flex;align-items:center;gap:8px;padding:20px;color:#94a3b8;font-size:13px;"><div class="rec-spinner" style="width:16px;height:16px;flex-shrink:0;"></div>Loading submission text…</div>';

  const totalCount = (state.markerAnnotations?.length || 0) + (state.eltAnnotations?.length || 0);
  const countLabel = totalCount > 0 ? `(${totalCount})` : '';
  const panelTitle = Array.isArray(state.eltAnnotations) && state.eltAnnotations.length ? 'Inline Annotations' : (mode === 'moderator' ? 'All Annotations' : 'My Annotations');
  const sIdSafe = _esc(submissionId);
  const uIdSafe = _esc(studentUid);
  const aIdSafe = _esc(assessmentId);

  // Compact ELT AI draft collapsible (tutor mode)
  let aiDraftPanel = '';
  if (eltAssessment) {
    const summary = eltAssessment.grading_summary || {};
    const mark = summary.overall_percentage != null ? `${summary.overall_percentage}%` : '—';
    aiDraftPanel = `
      <details style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:10px;">
        <summary style="list-style:none;cursor:pointer;font-size:12px;font-weight:800;color:#4338ca;display:flex;align-items:center;gap:6px;">
          <span>🤖 AI Draft</span>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#eef2ff;border:1px solid #c7d2fe;">${_esc(mark)}</span>
        </summary>
        <div style="margin-top:8px;font-size:12px;color:#1e293b;line-height:1.6;">
          ${eltAssessment.holistic_feedback?.strengths_summary ? `<div style="margin-bottom:6px;"><strong>Strengths:</strong> ${_esc(_cleanText(eltAssessment.holistic_feedback.strengths_summary, 600))}</div>` : ''}
          ${eltAssessment.holistic_feedback?.areas_for_improvement ? `<div style="margin-bottom:6px;"><strong>Areas for improvement:</strong> ${_esc(_cleanText(eltAssessment.holistic_feedback.areas_for_improvement, 600))}</div>` : ''}
        </div>
      </details>`;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(0,1.45fr) 280px;gap:0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:white;margin-bottom:14px;min-height:680px;height:min(76vh,860px);">
      <!-- Left: student text -->
      <div style="border-right:1px solid #e2e8f0;display:flex;flex-direction:column;min-height:0;">
        <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:800;color:#475569;">
          ${mode === 'moderator' ? 'Submission Text' : 'Submission Text'}
          <span style="font-weight:400;color:#94a3b8;margin-left:6px;font-size:11px;">${canEdit ? '— select text to comment directly on the submission' : ''}</span>
        </div>
        <div
          id="gi-text-${sIdSafe}"
          ${canEdit ? `onmouseup="window._giHandleTextSelection('${sIdSafe}')" ontouchend="window._giHandleTextSelection('${sIdSafe}')"` : ''}
          style="flex:1;min-height:0;padding:18px;font-size:13px;line-height:1.8;color:#1e293b;overflow-y:auto;user-select:text;"
        >${highlightedHtml}</div>
      </div>

      <!-- Right: annotations sidebar -->
      <div style="display:flex;flex-direction:column;background:#f8fafc;min-height:0;">
        <div style="padding:10px 14px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:800;color:#475569;display:flex;justify-content:space-between;align-items:center;">
          <span>${_esc(panelTitle)} <span id="gi-count-${sIdSafe}" style="font-weight:400;color:#94a3b8;">${countLabel}</span></span>
        </div>
        <div id="gi-cards-${sIdSafe}" style="flex:1;min-height:0;padding:10px;display:grid;gap:8px;overflow-y:auto;align-content:start;">
          ${_giRenderCards(submissionId, state.markerAnnotations, state.eltAnnotations, mode, studentUid, assessmentId)}
        </div>
        ${aiDraftPanel}
      </div>
    </div>

    <!-- Text selection popover -->
    <div id="gi-popover-${sIdSafe}" style="display:none;position:fixed;z-index:9999;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);width:280px;">
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Selected text</div>
      <div id="gi-quote-preview-${sIdSafe}" style="font-size:11px;color:#64748b;background:#f8fafc;border-radius:6px;padding:4px 8px;margin-bottom:8px;font-style:italic;max-height:48px;overflow:hidden;"></div>
      <textarea id="gi-annot-ta-${sIdSafe}" rows="3" placeholder="Add your comment…" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;resize:vertical;font-family:inherit;box-sizing:border-box;"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button onclick="window._giSaveAnnotation('${sIdSafe}','${uIdSafe}','${aIdSafe}')" style="flex:1;padding:6px 10px;border-radius:8px;background:#1e40af;color:white;border:none;cursor:pointer;font-size:12px;font-weight:700;">Save</button>
        <button onclick="window._giClosePopover('${sIdSafe}')" style="padding:6px 10px;border-radius:8px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;cursor:pointer;font-size:12px;">Cancel</button>
      </div>
    </div>
  `;

  // If no studentText, start async extraction
  if (!studentText) {
    const subFiles = state.subFiles;
    if (Array.isArray(subFiles) && subFiles.length) {
      extractSubmissionBundle(subFiles, { maxCharsPerFile: 5000, maxTotalChars: 18000 }).then((bundle) => {
        const text = bundle.results.map((r) => r.text || '').filter(Boolean).join('\n\n');
        if (text && window._giState[submissionId]) {
          window._giState[submissionId].studentText = text;
          _giRefresh(submissionId);
        } else if (!text) {
          const tp = document.getElementById(`gi-text-${submissionId}`);
          if (tp) tp.innerHTML = '<em style="color:#94a3b8;font-size:13px;">Could not extract text from this submission.</em>';
        }
      });
    } else {
      const tp = document.getElementById(`gi-text-${submissionId}`);
      if (tp) tp.innerHTML = '<em style="color:#94a3b8;font-size:13px;">No submission text available.</em>';
    }
  }
}

// ── Window handlers ──────────────────────────

window._giHandleTextSelection = function (submissionId) {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const quote = sel.toString().trim();
  if (!quote || quote.length < 3) return;
  const state = window._giState?.[submissionId];
  if (!state || !state.canEdit) return;

  state.pendingQuote = quote;
  const popover = document.getElementById(`gi-popover-${submissionId}`);
  const preview = document.getElementById(`gi-quote-preview-${submissionId}`);
  const ta = document.getElementById(`gi-annot-ta-${submissionId}`);
  if (!popover) return;

  if (preview) preview.textContent = `"${quote.slice(0, 120)}${quote.length > 120 ? '…' : ''}"`;
  if (ta) ta.value = '';

  // Position near selection
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  popover.style.display = 'block';
  const top = Math.min(rect.bottom + 8, window.innerHeight - 220);
  const left = Math.min(rect.left, window.innerWidth - 296);
  popover.style.top = `${Math.max(8, top)}px`;
  popover.style.left = `${Math.max(8, left)}px`;
  if (ta) setTimeout(() => ta.focus(), 50);
};

window._giClosePopover = function (submissionId) {
  const popover = document.getElementById(`gi-popover-${submissionId}`);
  if (popover) popover.style.display = 'none';
  const state = window._giState?.[submissionId];
  if (state) state.pendingQuote = '';
};

window._giSaveAnnotation = async function (submissionId, studentUid, assessmentId) {
  const state = window._giState?.[submissionId];
  if (!state) return;
  const ta = document.getElementById(`gi-annot-ta-${submissionId}`);
  const comment = (ta?.value || '').trim();
  if (!comment) { if (ta) ta.focus(); return; }

  const annotation = {
    id: _stamp(),
    quote: state.pendingQuote || '',
    comment,
    markerUid: _uid(),
    markerName: _userName(),
    markerRole: _userRole(),
    savedAt: _nowIso(),
    includeInDraft: false,
  };

  window._giClosePopover(submissionId);

  const result = await saveMarkerAnnotation(assessmentId, studentUid, submissionId, annotation);
  if (result.ok) {
    annotation.id = result.annotationId || annotation.id;
    state.markerAnnotations = [...(state.markerAnnotations || []), { ...annotation, id: result.annotationId || annotation.id }];
    _giRefresh(submissionId);
  } else {
    console.error('[grading-interface] saveMarkerAnnotation failed:', result.error);
  }
};

window._giDeleteAnnotation = async function (submissionId, annotationId, studentUid, assessmentId) {
  const state = window._giState?.[submissionId];
  if (!state) return;
  const result = await deleteMarkerAnnotation(assessmentId, studentUid, submissionId, annotationId);
  if (result.ok) {
    state.markerAnnotations = (state.markerAnnotations || []).filter((a) => a.id !== annotationId);
    _giRefresh(submissionId);
  } else {
    console.error('[grading-interface] deleteMarkerAnnotation failed:', result.error);
  }
};

window._giToggleIncludeInDraft = async function (submissionId, annotationId, include, studentUid, assessmentId) {
  const state = window._giState?.[submissionId];
  if (!state) return;
  const result = await updateAnnotationDraftInclusion(assessmentId, studentUid, submissionId, annotationId, include);
  if (result.ok) {
    state.markerAnnotations = (state.markerAnnotations || []).map((a) =>
      a.id === annotationId ? { ...a, includeInDraft: Boolean(include) } : a
    );
    _giRefresh(submissionId);
  } else {
    console.error('[grading-interface] updateAnnotationDraftInclusion failed:', result.error);
  }
};

// ELT annotation include toggle (moderator — stored locally only, included at release time)
window._giToggleEltInclusion = function (submissionId, idx, include) {
  const state = window._giState?.[submissionId];
  if (!state || !Array.isArray(state.eltAnnotations)) return;
  state.eltAnnotations = state.eltAnnotations.map((ann, i) =>
    i === idx ? { ...ann, includeInDraft: Boolean(include) } : ann
  );
  // No Firebase write — ELT include state is threaded through at release time.
  _giRefresh(submissionId);
};

// Scroll focus: card → text highlight
window._giFocusHit = function (submissionId, cardIdx) {
  const hitEl = document.getElementById(`gi-hit-${submissionId}-${cardIdx}-0`);
  if (hitEl) {
    hitEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    hitEl.style.outline = '2px solid #6366f1';
    setTimeout(() => { hitEl.style.outline = ''; }, 1200);
  }
};

// Scroll focus: text → card
window._giFocusCard = function (submissionId, annotationIdx) {
  const cardEl = document.getElementById(`gi-card-${submissionId}-${annotationIdx}`);
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    cardEl.style.outline = '2px solid #6366f1';
    setTimeout(() => { cardEl.style.outline = ''; }, 1200);
  }
};

// Lazy init — called by ontoggle on the submission <details> element
window._giInit = function (submissionId) {
  const pending = window._giPending?.[submissionId];
  if (!pending) return;
  const container = document.getElementById(`gi-mount-${submissionId}`);
  if (!container) return;
  delete window._giPending[submissionId];
  renderGradingInterface(container, pending);
};

// ── Helper for submission-panel read-only view ───────────────────────────────
// Exported for use in submission-panel.js without importing from reviewer
export function buildAnnotatedHtmlReadOnly(submissionText, annotations) {
  const text = String(submissionText || '');
  if (!text || !Array.isArray(annotations) || !annotations.length) return _escNl(text);

  const candidateHits = [];
  const annotationMap = annotations.map((ann, idx) => {
    const quote = String(ann?.quote || '');
    const matches = findQuoteMatches(text, quote);
    matches.forEach((hit, hitIdx) => {
      candidateHits.push({ annotationIdx: idx, start: hit.start, end: hit.end, length: hit.end - hit.start, hitId: `ro-hit-${idx}-${hitIdx}` });
    });
    return { ann, idx, matched: matches.length > 0 };
  });

  const selected = [];
  candidateHits
    .sort((a, b) => (b.length - a.length) || (a.start - b.start) || (a.annotationIdx - b.annotationIdx))
    .forEach((hit) => {
      if (!selected.some((c) => hit.start < c.end && hit.end > c.start)) selected.push(hit);
    });

  selected.sort((a, b) => a.start - b.start);

  let cursor = 0;
  const parts = [];
  selected.forEach((hit) => {
    if (hit.start > cursor) parts.push(_escNl(text.slice(cursor, hit.start)));
    const ann = annotationMap[hit.annotationIdx]?.ann || {};
    const title = _cleanText(ann.comment || '', 300);
    parts.push(`<mark id="${hit.hitId}" onclick="window._giRoFocusCard(${hit.annotationIdx})" title="${_esc(title)}" style="background:#dbeafe;color:#1e40af;padding:0 2px;border-radius:3px;cursor:pointer;">${_escNl(text.slice(hit.start, hit.end))}</mark>`);
    cursor = hit.end;
  });
  if (cursor < text.length) parts.push(_escNl(text.slice(cursor)));
  return parts.join('');
}

window._giRoFocusCard = function (idx) {
  const el = document.getElementById(`gi-ro-card-${idx}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.style.outline = '2px solid #6366f1';
    setTimeout(() => { el.style.outline = ''; }, 1200);
  }
};

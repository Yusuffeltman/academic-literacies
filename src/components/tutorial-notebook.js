// src/components/tutorial-notebook.js
// ─────────────────────────────────────────────
// Tutorial Notebook — student-facing
// Provides unit tabs, prompts, note fields, search, and uploads.
// ─────────────────────────────────────────────
import { STATE, persistLocalStateSoon, saveState } from '../state.js';
import { UNITS } from '../../content/units/index.js';
import { SESSIONS } from '../../content/sessions/sessions.js';
import { writeNotebookSaveEvent, writeUploadSuccessEvent } from '../analytics.js';
import { _aiChat } from '../ai.js';
import { showToast } from './toaster.js';
import { queueNotebookAttachment } from '../sync-engine.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB limit for tutorial notebook uploads

const TUTORIAL_SESSIONS = Object.values(SESSIONS)
  .filter((s) => s && s.type === 'tutorial')
  .sort((a, b) => _unitNum(a.unit) - _unitNum(b.unit));

const TUTORIAL_BY_UNIT = new Map(TUTORIAL_SESSIONS.map((s) => [s.unit, s]));
const TUTORIAL_BY_ID = new Map(TUTORIAL_SESSIONS.map((s) => [s.id, s]));
const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));

let _activeUnitId = null;
let _searchQuery = '';

function _analyticsProfile() {
  return STATE.user?._studentProfileContext?.profile || {
    uid: STATE.user?.uid || '',
    role: 'student',
    authEmail: STATE.user?.email || '',
    username: STATE.user?.email || '',
    displayName: STATE.user?.displayName || '',
  };
}
const _saveTimers = new Map();

export function renderTutorialNotebook(opts = {}) {
  const area = document.getElementById('content-area');
  if (!area) return;

  _ensureState();
  _refreshNotebookAnalytics();
  _activeUnitId = _resolveActiveUnit(opts);
  _searchQuery = typeof opts.searchQuery === 'string' ? opts.searchQuery : _searchQuery || '';

  _renderPage(area);
  _bindEvents(area);
}

function _resolveActiveUnit(opts) {
  const fromSession = opts?.sessionId && TUTORIAL_BY_ID.get(opts.sessionId)?.unit;
  const fromUnitOpt = opts?.unitId;
  const fromState = STATE.tutorialNotebook?.lastUnitId;
  const activeIdx = Number.isInteger(STATE.activeUnit) ? STATE.activeUnit : null;
  const fromActive = activeIdx != null ? `u${activeIdx + 1}` : null;

  const candidate = fromSession || fromUnitOpt || fromState || fromActive;
  if (candidate && TUTORIAL_BY_UNIT.has(candidate)) return candidate;

  return TUTORIAL_SESSIONS[0]?.unit || 'u1';
}

function _renderPage(area) {
  const session = TUTORIAL_BY_UNIT.get(_activeUnitId) || TUTORIAL_SESSIONS[0];
  if (!session) {
    area.innerHTML = '<div style="padding:40px;color:var(--muted);">No tutorial sessions available.</div>';
    return;
  }

  const unit = UNIT_BY_ID.get(session.unit);
  const entry = _getEntry(session.id);
  const responseText = entry?.response || '';
  const notesText = entry?.notes || '';
  const searchText = entry?.searchLog || '';
  const attachmentCount = entry?.attachments?.length || 0;
  const lastSaved = entry?.updatedAt ? _formatTime(entry.updatedAt) : '—';
  const feedbackText = entry?.aiFeedback || '';
  const feedbackTime = entry?.aiFeedbackAt ? _formatTime(entry.aiFeedbackAt) : '';
  const wordCount = _wordCount(`${responseText}\n${notesText}\n${searchText}`);
  const tags = Array.isArray(session.tags) ? session.tags : [];
  const preWork = Array.isArray(session.preWork) ? session.preWork : [];
  const isArchived = _isUnitArchived(session.unit);
  const archiveMeta = _archiveMeta(session.unit);
  const analytics = STATE.tutorialNotebook?.analytics || {};
  const archivedUnits = Object.entries(STATE.tutorialNotebook?.archivedUnits || {})
    .sort((a, b) => _parseDateSafe(b[1]?.archivedAt) - _parseDateSafe(a[1]?.archivedAt));

  area.innerHTML = `
    <div class="contact-notebook anim-fade">
      <section class="cn-workspace-head">
        <div class="cn-workspace-main">
          <div class="cn-hero-label">${_esc(session.phase || 'Tutorial Session')} · ${_esc(unit?.badge || `Unit ${_unitNum(session.unit)}`)}</div>
          <h1 class="cn-workspace-title">${_esc(session.title)}</h1>
          <p class="cn-workspace-goal">${_esc(_studentizePrompt(session.goal || 'You will respond to today\'s instruction in your own words.'))}</p>
          <div class="cn-chip-row">
            ${tags.map((t) => `<span class="cn-chip">${_esc(t)}</span>`).join('')}
            <span class="cn-chip cn-chip-soft">${isArchived ? `Archived ${_esc(_formatTime(archiveMeta?.archivedAt || ''))}` : 'Active workspace'}</span>
          </div>
        </div>
        <div class="cn-workspace-meta">
          <div class="cn-meta-card">
            <div class="cn-meta-label">Autosave</div>
            <div class="cn-meta-value">${isArchived ? 'Read-only' : 'On'}</div>
            <div class="cn-meta-sub">Last saved: <span id="cn-last-saved">${_esc(lastSaved)}</span></div>
          </div>
          <div class="cn-meta-card">
            <div class="cn-meta-label">Notebook signals</div>
            <div class="cn-meta-value">${analytics.totalWords || 0}</div>
            <div class="cn-meta-sub">Words across ${analytics.sessionsWithActivity || 0} active sessions</div>
          </div>
          <div class="cn-meta-card">
            <div class="cn-meta-label">Attachments</div>
            <div class="cn-meta-value">${attachmentCount}</div>
            <div class="cn-meta-sub">${analytics.totalAttachments || 0} files · ${analytics.totalVideoLinks || 0} video links</div>
          </div>
        </div>
      </section>

      <section class="cn-toolbar">
        <div class="cn-search-wrap">
          <span class="cn-search-icon">🔍</span>
          <input id="cn-search" class="cn-search-input" type="text" placeholder="Search across your notebook…" value="${_escAttr(_searchQuery)}" />
          <button id="cn-search-clear" class="cn-search-clear" title="Clear search">✕</button>
        </div>
        <div class="cn-toolbar-actions">
          <button class="btn-prev" id="cn-archive-btn">${isArchived ? 'Unarchive unit' : 'Archive unit'}</button>
          <button class="btn-prev" id="cn-copy-all">Copy current session</button>
          <button class="btn-next" id="cn-download">Download .txt</button>
        </div>
      </section>

      <div class="cn-search-results" id="cn-search-results"></div>

      <nav class="cn-tabs" id="cn-tabs">
        ${TUTORIAL_SESSIONS.map((s) => _tabHTML(s, s.unit === _activeUnitId)).join('')}
      </nav>

      <div class="cn-focus-grid">
        <section class="cn-notebook-card cn-notebook-card-primary">
          <div class="cn-section">
            <div class="cn-section-head">
              <span>Tutorial Submission</span>
              <span class="cn-section-meta">Words: <span id="cn-word-count">${wordCount}</span></span>
            </div>
            <textarea id="cn-response" rows="10" placeholder="Write your response to the instruction here…" ${isArchived ? 'readonly' : ''}>${_escText(responseText)}</textarea>
            <div class="cn-ai-row">
              <button class="btn-feedback" id="cn-ai-btn" ${isArchived ? 'disabled' : ''}>Get AI feedback</button>
              <button class="btn-prev" id="cn-ai-clear" ${isArchived ? 'disabled' : ''}>Clear feedback</button>
              <span id="cn-ai-msg" class="cn-ai-msg"></span>
            </div>
            <div id="cn-ai-feedback" class="ai-feedback ${feedbackText ? 'show' : ''}">
              <div class="ai-feedback-header">
                <div class="ai-feedback-icon">🤖</div>
                <div class="ai-feedback-title">AI Writing Feedback ${feedbackTime ? `· ${_esc(feedbackTime)}` : ''}</div>
              </div>
              <div class="ai-feedback-body" id="cn-ai-feedback-body" style="white-space:pre-wrap;">${_esc(feedbackText)}</div>
            </div>
          </div>

          <div class="cn-section">
            <div class="cn-section-head">
              <span>Working Notes</span>
              <span class="cn-section-meta">Key ideas, quotes, or insights</span>
            </div>
            <textarea id="cn-notes" rows="11" placeholder="Capture notes, evidence, or feedback from the session…" ${isArchived ? 'readonly' : ''}>${_escText(notesText)}</textarea>
          </div>

          <div class="cn-section cn-upload-section">
            <div class="cn-section-head">
              <span>Uploads & media</span>
              <span class="cn-section-meta">${isArchived ? 'Archived media' : 'Slides, drafts, screenshots, PDFs, and video links'}</span>
            </div>
            <div class="cn-upload-row">
              <input id="cn-file" type="file" accept="image/*,video/*,audio/*,text/*,application/pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.csv,.json,.xlsx" ${isArchived ? 'disabled' : ''} />
              <button class="btn-next" id="cn-upload-btn" ${isArchived ? 'disabled' : ''}>Upload</button>
            </div>
            <div class="cn-link-row">
              <input id="cn-video-link" type="url" placeholder="Paste a YouTube, Vimeo, Loom, or direct video link…" ${isArchived ? 'disabled' : ''} />
              <button class="btn-prev" id="cn-video-link-btn" ${isArchived ? 'disabled' : ''}>Add video link</button>
            </div>
            <div id="cn-upload-msg" class="cn-upload-msg"></div>
            <div id="cn-upload-progress" class="cn-upload-progress" aria-hidden="true">
              <div id="cn-upload-progress-bar" class="cn-upload-progress-bar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="width:0%;"></div>
            </div>
            <div id="cn-attachments-list" class="cn-attachments">
              ${_attachmentsHTML(entry?.attachments || [])}
            </div>
          </div>
        </section>

        <aside class="cn-support-rail">
          ${session.exitTicket?.prompt ? `
            <details class="cn-panel">
              <summary>Today’s instruction</summary>
              <div class="cn-panel-body">
                <p>${_esc(_studentizePrompt(session.exitTicket.prompt))}</p>
                ${session.exitTicket?.stems?.length ? `
                  <div class="cn-stems">
                    ${session.exitTicket.stems.map((s) => `<div class="cn-stem">"${_esc(_studentizePrompt(s))}"</div>`).join('')}
                  </div>
                ` : ''}
              </div>
            </details>
          ` : ''}
          ${preWork.length ? `
            <details class="cn-panel">
              <summary>Before class</summary>
              <div class="cn-panel-body">
                <ul class="cn-prework">
                  ${preWork.map((p) => `<li><strong>${_esc(p.item || '')}</strong>${p.detail ? ` — ${_esc(p.detail)}` : ''}</li>`).join('')}
                </ul>
              </div>
            </details>
          ` : ''}
          <details class="cn-panel">
            <summary>Session flow</summary>
            <div class="cn-panel-body">
              <div class="cn-flow">
                ${session.blocks?.slice(0, 6).map((b) => `
                  <div class="cn-flow-item">
                    <span class="cn-flow-time">${_esc(b.time || '')}</span>
                    <span class="cn-flow-title">${_esc(_studentizeTitle(b.title || b.type || 'Activity'))}</span>
                    ${b.description ? `<span class="cn-flow-desc">${_esc(_studentizePrompt(b.description))}</span>` : ''}
                  </div>
                `).join('') || '<div class="cn-flow-empty">No session flow available.</div>'}
              </div>
            </div>
          </details>
          <details class="cn-panel">
            <summary>Search log & sources</summary>
            <div class="cn-panel-body">
              <textarea id="cn-search-log" rows="7" placeholder="Log what you searched, where you searched, and what you found…" ${isArchived ? 'readonly' : ''}>${_escText(searchText)}</textarea>
            </div>
          </details>
          <details class="cn-panel" open>
            <summary>Archive & analytics</summary>
            <div class="cn-panel-body">
              <div class="cn-analytics-grid">
                <div class="cn-analytics-card"><span>Words</span><strong>${analytics.totalWords || 0}</strong></div>
                <div class="cn-analytics-card"><span>Uploads</span><strong>${analytics.totalAttachments || 0}</strong></div>
                <div class="cn-analytics-card"><span>Video links</span><strong>${analytics.totalVideoLinks || 0}</strong></div>
                <div class="cn-analytics-card"><span>Archived units</span><strong>${analytics.archivedUnits || 0}</strong></div>
              </div>
              <div class="cn-archive-summary">
                ${archiveMeta ? `<div class="cn-archive-note">This unit was archived on ${_esc(_formatTime(archiveMeta.archivedAt))}. Reopen it any time to continue editing.</div>` : '<div class="cn-archive-note">Archive completed units to preserve notes, uploads, and developmental signals without deleting them.</div>'}
              </div>
              ${archivedUnits.length ? `
                <div class="cn-archive-list">
                  ${archivedUnits.map(([unitId, meta]) => `
                    <div class="cn-archive-item">
                      <div>
                        <div class="cn-archive-title">${_esc(UNIT_BY_ID.get(unitId)?.badge || unitId.toUpperCase())}</div>
                        <div class="cn-archive-meta">${_esc(_formatTime(meta.archivedAt))} · ${meta.wordCount || 0} words · ${meta.attachmentCount || 0} uploads</div>
                      </div>
                      <button class="btn-prev" data-cn-open-archive="${_escAttr(unitId)}">Open</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </details>
        </aside>
      </div>

    </div>
  `;
}

function _bindEvents(area) {
  const session = TUTORIAL_BY_UNIT.get(_activeUnitId);
  if (!session) return;

  const searchEl = area.querySelector('#cn-search');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      _searchQuery = e.target.value || '';
      _renderSearchResults();
    });
  }
  const clearBtn = area.querySelector('#cn-search-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      _searchQuery = '';
      if (searchEl) searchEl.value = '';
      _renderSearchResults();
    });
  }

  area.querySelectorAll('[data-cn-unit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const unitId = btn.getAttribute('data-cn-unit');
      if (!unitId || unitId === _activeUnitId) return;
      _activeUnitId = unitId;
      _ensureState();
      STATE.tutorialNotebook.lastUnitId = unitId;
      STATE.tutorialNotebook.lastSessionId = TUTORIAL_BY_UNIT.get(unitId)?.id || null;
      saveState();
      _renderPage(area);
      _bindEvents(area);
    });
  });

  const responseEl = area.querySelector('#cn-response');
  const notesEl = area.querySelector('#cn-notes');
  const searchLogEl = area.querySelector('#cn-search-log');

  if (responseEl) {
    responseEl.addEventListener('input', () => _handleFieldChange(session, 'response', responseEl.value));
  }
  if (notesEl) {
    notesEl.addEventListener('input', () => _handleFieldChange(session, 'notes', notesEl.value));
  }
  if (searchLogEl) {
    searchLogEl.addEventListener('input', () => _handleFieldChange(session, 'searchLog', searchLogEl.value));
  }

  const copyBtn = area.querySelector('#cn-copy-all');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => _copyCurrentSession(session.id));
  }
  const archiveBtn = area.querySelector('#cn-archive-btn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', async () => {
      if (_isUnitArchived(session.unit)) {
        _unarchiveUnit(session.unit);
        await saveState();
        _renderPage(area);
        _bindEvents(area);
        return;
      }
      const ok = confirm(`Archive ${UNIT_BY_ID.get(session.unit)?.badge || session.unit.toUpperCase()}? You can unarchive it later.`);
      if (!ok) return;
      _archiveUnit(session.unit);
      await saveState();
      _renderPage(area);
      _bindEvents(area);
    });
  }
  const dlBtn = area.querySelector('#cn-download');
  if (dlBtn) {
    dlBtn.addEventListener('click', () => _downloadCurrentSession(session.id));
  }

  const uploadBtn = area.querySelector('#cn-upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => _handleUpload(session.id));
  }
  const videoLinkBtn = area.querySelector('#cn-video-link-btn');
  const videoLinkInput = area.querySelector('#cn-video-link');
  if (videoLinkBtn) {
    videoLinkBtn.addEventListener('click', () => _handleVideoLink(session.id));
  }
  if (videoLinkInput) {
    videoLinkInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      _handleVideoLink(session.id);
    });
  }

  if (!window._tutorialNotebookUploadSyncBound) {
    window._tutorialNotebookUploadSyncBound = true;
    window.addEventListener('notebook-upload-complete', (event) => {
      const detail = event?.detail || {};
      if (detail.notebookType !== 'tutorial') return;
      const activeSession = TUTORIAL_BY_UNIT.get(_activeUnitId);
      if (!activeSession || detail.sessionId !== activeSession.id) return;
      const list = document.getElementById('cn-attachments-list');
      const entry = _getEntry(activeSession.id);
      if (list && entry) list.innerHTML = _attachmentsHTML(entry.attachments || []);
      const msg = document.getElementById('cn-upload-msg');
      if (msg) msg.textContent = 'Upload synced.';
      _updateMeta();
    });
  }

  const aiBtn = area.querySelector('#cn-ai-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => _handleAiFeedback(session));
  }
  const aiClearBtn = area.querySelector('#cn-ai-clear');
  if (aiClearBtn) {
    aiClearBtn.addEventListener('click', () => _clearAiFeedback(session.id));
  }

  const attachList = area.querySelector('#cn-attachments-list');
  if (attachList) {
    attachList.addEventListener('click', (e) => {
      const moveBtn = e.target.closest('[data-cn-move]');
      if (moveBtn) {
        const idx = Number(moveBtn.getAttribute('data-cn-index'));
        const dir = moveBtn.getAttribute('data-cn-move');
        if (Number.isNaN(idx) || !dir) return;
        _moveAttachment(session.id, idx, dir === 'up' ? -1 : 1);
        return;
      }
      const btn = e.target.closest('[data-cn-remove]');
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-cn-remove'));
      if (Number.isNaN(idx)) return;
      _removeAttachment(session.id, idx);
    });
  }

  area.querySelectorAll('[data-cn-open-archive]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const unitId = btn.getAttribute('data-cn-open-archive');
      if (!unitId || unitId === _activeUnitId) return;
      _activeUnitId = unitId;
      STATE.tutorialNotebook.lastUnitId = unitId;
      STATE.tutorialNotebook.lastSessionId = TUTORIAL_BY_UNIT.get(unitId)?.id || null;
      saveState();
      _renderPage(area);
      _bindEvents(area);
    });
  });

  _renderSearchResults();
}

function _handleFieldChange(session, field, value) {
  if (_isUnitArchived(session.unit)) return;
  _ensureState();
  const entry = _ensureEntry(session);
  entry[field] = value;
  entry.updatedAt = new Date().toISOString();
  STATE.tutorialNotebook.lastUnitId = session.unit;
  STATE.tutorialNotebook.lastSessionId = session.id;
  _refreshNotebookAnalytics();
  persistLocalStateSoon('tutorial-notebook-input');

  _scheduleSave(session.id);
  _updateMeta();
}

function _scheduleSave(sessionId) {
  const existing = _saveTimers.get(sessionId);
  if (existing) clearTimeout(existing);
  _saveTimers.set(sessionId, setTimeout(async () => {
    const synced = await saveState();
    if (!synced) return;
    const session = TUTORIAL_BY_ID.get(sessionId);
    const entry = session ? _getEntry(session.id) : null;
    if (session && entry) {
      writeNotebookSaveEvent({
        user: STATE.user || {},
        profile: _analyticsProfile(),
        notebookType: 'tutorial',
        sessionId: session.id,
        unitId: session.unit,
        entry,
        wordCount: _wordCount(`${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`),
        source: 'tutorial-notebook-autosave',
      }).catch(() => {});
    }
  }, 700));
}

function _updateMeta() {
  const session = TUTORIAL_BY_UNIT.get(_activeUnitId);
  if (!session) return;
  const entry = _getEntry(session.id);
  const lastSaved = entry?.updatedAt ? _formatTime(entry.updatedAt) : '—';
  const responseText = entry?.response || '';
  const notesText = entry?.notes || '';
  const searchText = entry?.searchLog || '';
  const wordCount = _wordCount(`${responseText}\n${notesText}\n${searchText}`);

  const savedEl = document.getElementById('cn-last-saved');
  const wcEl = document.getElementById('cn-word-count');
  if (savedEl) savedEl.textContent = lastSaved;
  if (wcEl) wcEl.textContent = wordCount;
}

async function _handleUpload(sessionId) {
  const fileInput = document.getElementById('cn-file');
  const msg = document.getElementById('cn-upload-msg');
  const progressWrap = document.getElementById('cn-upload-progress');
  const progressBar = document.getElementById('cn-upload-progress-bar');
  const file = fileInput?.files?.[0];
  if (!file) {
    if (msg) msg.textContent = 'Select a file first.';
    return;
  }

  const limitMb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
  if (Number(file.size) > MAX_UPLOAD_BYTES) {
    const text = `File too large. Max ${limitMb} MB.`;
    if (msg) msg.textContent = text;
    showToast(text, 'error');
    return;
  }

  const setProgress = (pct) => {
    const safePct = Math.max(6, Math.min(100, Number.isFinite(pct) ? pct : 6));
    if (progressWrap) {
      progressWrap.classList.add('show');
      progressWrap.setAttribute('aria-hidden', 'false');
      progressWrap.style.display = 'block';
    }
    if (progressBar) {
      progressBar.style.width = `${safePct}%`;
      progressBar.setAttribute('aria-valuenow', String(safePct));
    }
  };

  const resetProgress = () => {
    if (progressWrap) {
      progressWrap.classList.remove('show');
      progressWrap.setAttribute('aria-hidden', 'true');
    }
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.setAttribute('aria-valuenow', '0');
    }
  };

  if (msg) msg.textContent = 'Saving file locally…';
  setProgress(8);

  if (_isUnitArchived(_activeUnitId)) {
    if (msg) msg.textContent = 'This unit is archived. Unarchive it to add new files.';
    showToast('This unit is archived.', 'error');
    return;
  }

  try {
    const previewMeta = await _buildAttachmentPreviewMeta(file);
    const asset = await queueNotebookAttachment({
      notebookType: 'tutorial',
      sessionId,
      file,
    });
    Object.assign(asset, previewMeta);
    _ensureState();
    const session = TUTORIAL_BY_ID.get(sessionId);
    if (!session) {
      resetProgress();
      return;
    }
    const entry = _ensureEntry(session);
    entry.attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
    entry.attachments.push(asset);
    entry.updatedAt = new Date().toISOString();
    _refreshNotebookAnalytics();

    if (fileInput) fileInput.value = '';
    if (msg) msg.textContent = navigator.onLine ? 'Saved locally. Uploading in the background…' : 'Saved locally. Will upload when you are back online.';
    setProgress(100);
    setTimeout(resetProgress, 600);
    await saveState({ localOnly: true });
    await writeUploadSuccessEvent({
      user: STATE.user || {},
      profile: _analyticsProfile(),
      scope: 'tutorial-notebook',
      unitId: session.unit,
      sessionId: session.id,
      asset,
      source: 'tutorial-notebook-upload',
    }).catch(() => {});

    const list = document.getElementById('cn-attachments-list');
    if (list) list.innerHTML = _attachmentsHTML(entry.attachments);
    _updateMeta();
    showToast(navigator.onLine ? 'File saved locally and queued for upload.' : 'File saved locally for later upload.', 'success');
  } catch (err) {
    resetProgress();
    if (msg) msg.textContent = `Upload failed: ${err?.message || 'Try again.'}`;
    showToast('Upload failed. Try again.', 'error');
  }
}

function _handleVideoLink(sessionId) {
  const input = document.getElementById('cn-video-link');
  const msg = document.getElementById('cn-upload-msg');
  const raw = String(input?.value || '').trim();
  if (!raw) {
    if (msg) msg.textContent = 'Paste a video link first.';
    return;
  }
  if (_isUnitArchived(_activeUnitId)) {
    if (msg) msg.textContent = 'This unit is archived. Unarchive it to add links.';
    showToast('This unit is archived.', 'error');
    return;
  }

  const asset = _videoLinkAssetFromUrl(raw);
  if (!asset) {
    if (msg) msg.textContent = 'Use a valid YouTube, Vimeo, Loom, or direct video URL.';
    showToast('Unsupported video link.', 'error');
    return;
  }

  _ensureState();
  const session = TUTORIAL_BY_ID.get(sessionId);
  if (!session) return;
  const entry = _ensureEntry(session);
  entry.attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
  entry.attachments.push(asset);
  entry.updatedAt = new Date().toISOString();
  _refreshNotebookAnalytics();
  saveState();

  if (input) input.value = '';
  if (msg) msg.textContent = 'Video link added.';
  const list = document.getElementById('cn-attachments-list');
  if (list) list.innerHTML = _attachmentsHTML(entry.attachments);
  _updateMeta();
  showToast('Video link added.', 'success');
}

async function _handleAiFeedback(session) {
  const msg = document.getElementById('cn-ai-msg');
  const feedbackBox = document.getElementById('cn-ai-feedback');
  const feedbackBody = document.getElementById('cn-ai-feedback-body');
  const text = (document.getElementById('cn-response')?.value || '').trim();

  if (text.length < 40) {
    if (msg) msg.textContent = 'Write a fuller response (at least 40 characters) before requesting feedback.';
    return;
  }

  if (msg) msg.textContent = 'Analysing your response…';
  if (feedbackBody) feedbackBody.textContent = '';
  if (feedbackBox) feedbackBox.classList.add('show');

  const prompt = `You are an academic writing tutor. A student responded to this tutorial-session instruction:\n"${session.exitTicket?.prompt || session.title}"\n\nStudent response:\n"${text}"\n\nGive 3–5 sentences of feedback. Include: 1 strength, 1 concrete improvement, and 1 next step. Be direct and specific.`;

  try {
    const feedback = await _aiChat(prompt, { maxTokens: 220 });
    _ensureState();
    const entry = _ensureEntry(session);
    entry.aiFeedback = feedback;
    entry.aiFeedbackAt = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    await saveState();

    if (feedbackBody) feedbackBody.textContent = feedback;
    if (msg) msg.textContent = 'Feedback ready.';
    _updateMeta();
  } catch (err) {
    if (msg) msg.textContent = `AI feedback unavailable: ${err.message}`;
  }
}

function _clearAiFeedback(sessionId) {
  const entry = _getEntry(sessionId);
  if (!entry) return;
  entry.aiFeedback = '';
  entry.aiFeedbackAt = null;
  entry.updatedAt = new Date().toISOString();
  saveState();
  const feedbackBody = document.getElementById('cn-ai-feedback-body');
  const feedbackBox = document.getElementById('cn-ai-feedback');
  const msg = document.getElementById('cn-ai-msg');
  if (feedbackBody) feedbackBody.textContent = '';
  if (feedbackBox) feedbackBox.classList.remove('show');
  if (msg) msg.textContent = 'Feedback cleared.';
}

function _removeAttachment(sessionId, idx) {
  const session = TUTORIAL_BY_ID.get(sessionId);
  if (!session) return;
  if (_isUnitArchived(session.unit)) return;
  const entry = _getEntry(sessionId);
  if (!entry || !Array.isArray(entry.attachments)) return;

  const ok = confirm('Remove this attachment from your notebook?');
  if (!ok) return;

  entry.attachments.splice(idx, 1);
  entry.updatedAt = new Date().toISOString();
  _refreshNotebookAnalytics();
  saveState();
  const list = document.getElementById('cn-attachments-list');
  if (list) list.innerHTML = _attachmentsHTML(entry.attachments);
  _updateMeta();
}

function _moveAttachment(sessionId, idx, delta) {
  const session = TUTORIAL_BY_ID.get(sessionId);
  if (!session || _isUnitArchived(session.unit)) return;
  const entry = _getEntry(sessionId);
  if (!entry || !Array.isArray(entry.attachments)) return;
  const nextIdx = idx + delta;
  if (idx < 0 || nextIdx < 0 || idx >= entry.attachments.length || nextIdx >= entry.attachments.length) return;

  const [moved] = entry.attachments.splice(idx, 1);
  entry.attachments.splice(nextIdx, 0, moved);
  entry.updatedAt = new Date().toISOString();
  _refreshNotebookAnalytics();
  saveState();

  const list = document.getElementById('cn-attachments-list');
  if (list) list.innerHTML = _attachmentsHTML(entry.attachments);
  _updateMeta();
}

function _renderSearchResults() {
  const box = document.getElementById('cn-search-results');
  if (!box) return;

  const q = _searchQuery.trim().toLowerCase();
  if (!q) {
    box.innerHTML = '<div class="cn-search-empty">Search for a word or phrase to jump to the right unit.</div>';
    return;
  }

  const results = TUTORIAL_SESSIONS.map((s) => {
    const entry = _getEntry(s.id);
    if (!entry) return null;
    const hay = `${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`.toLowerCase();
    if (!hay.includes(q)) return null;
    const snippet = _snippet(hay, q);
    return {
      unit: s.unit,
      title: s.title,
      snippet,
    };
  }).filter(Boolean);

  if (!results.length) {
    box.innerHTML = '<div class="cn-search-empty">No matches found yet. Try a different phrase.</div>';
    return;
  }

  box.innerHTML = `
    <div class="cn-search-hits">
      ${results.map((r) => `
        <button class="cn-search-hit" data-cn-unit="${_escAttr(r.unit)}">
          <div class="cn-search-hit-title">${_esc(r.title)} · ${_esc(r.unit.toUpperCase())}</div>
          <div class="cn-search-hit-snippet">${_esc(r.snippet)}</div>
        </button>
      `).join('')}
    </div>
  `;

  box.querySelectorAll('[data-cn-unit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const unitId = btn.getAttribute('data-cn-unit');
      if (!unitId || unitId === _activeUnitId) return;
      _activeUnitId = unitId;
      _ensureState();
      STATE.tutorialNotebook.lastUnitId = unitId;
      STATE.tutorialNotebook.lastSessionId = TUTORIAL_BY_UNIT.get(unitId)?.id || null;
      saveState();
      const area = document.getElementById('content-area');
      if (!area) return;
      _renderPage(area);
      _bindEvents(area);
    });
  });
}

function _copyCurrentSession(sessionId) {
  const session = TUTORIAL_BY_ID.get(sessionId);
  if (!session) return;
  const entry = _getEntry(sessionId) || {};
  const text = _exportText(session, entry);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => alert('Session notes copied to clipboard.')).catch(() => _fallbackCopy(text));
    return;
  }
  _fallbackCopy(text);
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'readonly');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    alert('Session notes copied to clipboard.');
  } catch {
    alert('Copy failed. You can manually copy the notes.');
  } finally {
    ta.remove();
  }
}

function _downloadCurrentSession(sessionId) {
  const session = TUTORIAL_BY_ID.get(sessionId);
  if (!session) return;
  const entry = _getEntry(sessionId) || {};
  const text = _exportText(session, entry);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tutorial-notebook-${session.id}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function _exportText(session, entry) {
  const unit = UNIT_BY_ID.get(session.unit);
  const attachments = (entry.attachments || []).map((a) => `${a.name || 'file'} (${a.url})`);
  return [
    `Tutorial Notebook`,
    `Unit: ${unit?.badge || session.unit.toUpperCase()} — ${unit?.title || session.title}`,
    `Session: ${session.title}`,
    `Updated: ${entry.updatedAt || '—'}`,
    '',
    'Tutorial Submission:',
    entry.response || '',
    '',
    'Working Notes:',
    entry.notes || '',
    '',
    'Search Log & Sources:',
    entry.searchLog || '',
    '',
    'AI Feedback:',
    entry.aiFeedback || '—',
    '',
    'Attachments:',
    attachments.length ? attachments.join('\n') : 'None',
  ].join('\n');
}

function _attachmentsHTML(list) {
  if (!list?.length) {
    return '<div class="cn-attachments-empty">No files uploaded yet.</div>';
  }
  const locked = _isUnitArchived(_activeUnitId);
  return list.map((a, i) => `
    <div class="cn-attachment">
      <div class="cn-attachment-media">
        ${_attachmentPreviewHTML(a)}
      </div>
      <div class="cn-attachment-copy">
        <div class="cn-attachment-name">${_esc(a.name || 'Untitled file')}</div>
        <div class="cn-attachment-meta">${_esc(_formatBytes(a.size || 0))} · ${_esc((a.type || 'file').split('/')[0])}</div>
      </div>
      <div class="cn-attachment-footer">
        <div class="cn-attachment-actions">
          <a class="cn-attachment-link" href="${_escAttr(a.url || '#')}" target="_blank" rel="noopener">Open</a>
          <button class="cn-attachment-move" data-cn-move="up" data-cn-index="${i}" ${(locked || i === 0) ? 'disabled' : ''}>Up</button>
          <button class="cn-attachment-move" data-cn-move="down" data-cn-index="${i}" ${(locked || i === list.length - 1) ? 'disabled' : ''}>Down</button>
        </div>
        <button class="cn-attachment-remove" data-cn-remove="${i}" ${locked ? 'disabled' : ''}>Remove</button>
      </div>
    </div>
  `).join('');
}

function _attachmentPreviewHTML(asset) {
  if (_isVideoLinkAsset(asset)) {
    return asset.embedUrl
      ? `<div class="cn-attachment-preview-shell"><iframe class="cn-attachment-embed" src="${_escAttr(asset.embedUrl)}" title="${_escAttr(asset.name || 'Embedded video')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
      : `<div class="cn-attachment-preview-fallback" aria-hidden="true">${_esc(asset.provider || 'VIDEO')}</div>`;
  }
  if (_isImageAsset(asset)) {
    return `<a class="cn-attachment-preview-link" href="${_escAttr(asset.url || '#')}" target="_blank" rel="noopener"><img class="cn-attachment-preview" src="${_escAttr(asset.url || '')}" alt="${_escAttr(asset.name || 'Uploaded image')}" loading="lazy" /></a>`;
  }
  if (_isVideoAsset(asset)) {
    return `<div class="cn-attachment-preview-shell"><video class="cn-attachment-video" src="${_escAttr(asset.url || '')}" preload="metadata" muted playsinline controls></video></div>`;
  }
  if (_isTextAsset(asset)) {
    return `<div class="cn-attachment-preview-shell cn-attachment-text-preview"><div class="cn-attachment-text-label">${_esc(_attachmentExtension(asset.name || asset.type || 'TXT'))}</div><div class="cn-attachment-text-body">${_esc(asset.previewText || 'Text preview unavailable.')}</div></div>`;
  }
  return `<div class="cn-attachment-preview-fallback" aria-hidden="true">${_esc(_attachmentExtension(asset.name || asset.type || 'FILE'))}</div>`;
}

function _isImageAsset(asset) {
  const type = String(asset?.type || '').toLowerCase();
  return type.startsWith('image/');
}

function _isVideoLinkAsset(asset) {
  return String(asset?.previewKind || '').toLowerCase() === 'video-link';
}

function _isVideoAsset(asset) {
  const type = String(asset?.type || '').toLowerCase();
  return type.startsWith('video/');
}

function _isTextAsset(asset) {
  const type = String(asset?.type || '').toLowerCase();
  const name = String(asset?.name || '').toLowerCase();
  return type.startsWith('text/')
    || ['.txt', '.md', '.csv', '.json'].some((ext) => name.endsWith(ext));
}

async function _buildAttachmentPreviewMeta(file) {
  if (_isImageAsset(file)) return { previewKind: 'image' };
  if (_isVideoAsset(file)) return { previewKind: 'video' };
  if (_isTextAsset(file)) {
    return {
      previewKind: 'text',
      previewText: await _readTextPreview(file),
    };
  }
  return { previewKind: 'file' };
}

async function _readTextPreview(file) {
  try {
    const text = await file.text();
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) || 'Text preview unavailable.';
  } catch {
    return 'Text preview unavailable.';
  }
}

function _attachmentExtension(value) {
  const text = String(value || '').trim();
  const match = text.match(/\.([a-z0-9]+)$/i);
  if (match) return match[1].toUpperCase();
  return text.slice(0, 4).toUpperCase() || 'FILE';
}

function _videoLinkAssetFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const youtubeId = _youtubeVideoId(url);
    if (youtubeId) {
      return _buildVideoLinkAsset(rawUrl, `https://www.youtube.com/embed/${youtubeId}`, 'YouTube');
    }

    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const match = url.pathname.match(/\/(\d+)/);
      if (match?.[1]) {
        return _buildVideoLinkAsset(rawUrl, `https://player.vimeo.com/video/${match[1]}`, 'Vimeo');
      }
    }

    if (host === 'loom.com' || host.endsWith('.loom.com')) {
      const match = url.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      if (match?.[1]) {
        return _buildVideoLinkAsset(rawUrl, `https://www.loom.com/embed/${match[1]}`, 'Loom');
      }
    }

    if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url.pathname)) {
      return {
        name: `Direct video (${host})`,
        type: 'video/link',
        size: 0,
        url: rawUrl,
        uploadedAt: new Date().toISOString(),
        previewKind: 'video-link',
        embedUrl: rawUrl,
        provider: 'Direct',
      };
    }
  } catch {
    return null;
  }
  return null;
}

function _buildVideoLinkAsset(rawUrl, embedUrl, provider) {
  return {
    name: `${provider} video`,
    type: 'video/link',
    size: 0,
    url: rawUrl,
    uploadedAt: new Date().toISOString(),
    previewKind: 'video-link',
    embedUrl,
    provider,
  };
}

function _youtubeVideoId(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] || null;
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const embedMatch = url.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    if (embedMatch?.[2]) return embedMatch[2];
  }
  return null;
}

function _parseDateSafe(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : 0;
}

function _tabHTML(session, active) {
  const unit = UNIT_BY_ID.get(session.unit);
  const label = unit?.badge || `Unit ${_unitNum(session.unit)}`;
  const title = unit?.title || session.title;
  return `
    <button class="cn-tab ${active ? 'active' : ''}" data-cn-unit="${_escAttr(session.unit)}">
      <span class="cn-tab-label">${_esc(label)}</span>
      <span class="cn-tab-title">${_esc(title)}</span>
    </button>
  `;
}

function _ensureState() {
  if (!STATE.tutorialNotebook || typeof STATE.tutorialNotebook !== 'object') {
    STATE.tutorialNotebook = { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} };
  }
  if (!STATE.tutorialNotebook.entries || typeof STATE.tutorialNotebook.entries !== 'object') {
    STATE.tutorialNotebook.entries = {};
  }
  if (!STATE.tutorialNotebook.archivedUnits || typeof STATE.tutorialNotebook.archivedUnits !== 'object') {
    STATE.tutorialNotebook.archivedUnits = {};
  }
  if (!STATE.tutorialNotebook.analytics || typeof STATE.tutorialNotebook.analytics !== 'object') {
    STATE.tutorialNotebook.analytics = {};
  }
}

function _ensureEntry(session) {
  const entries = STATE.tutorialNotebook.entries;
  if (!entries[session.id]) {
    entries[session.id] = {
      sessionId: session.id,
      sessionTitle: session.title,
      unitId: session.unit,
      response: '',
      notes: '',
      searchLog: '',
      attachments: [],
      aiFeedback: '',
      aiFeedbackAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
  }
  return entries[session.id];
}

function _getEntry(sessionId) {
  return STATE.tutorialNotebook?.entries?.[sessionId] || null;
}

function _isUnitArchived(unitId) {
  return Boolean(STATE.tutorialNotebook?.archivedUnits?.[unitId]);
}

function _archiveMeta(unitId) {
  return STATE.tutorialNotebook?.archivedUnits?.[unitId] || null;
}

function _refreshNotebookAnalytics() {
  _ensureState();
  const entries = Object.values(STATE.tutorialNotebook.entries || {});
  const attachments = entries.flatMap((entry) => Array.isArray(entry.attachments) ? entry.attachments : []);
  const totalWords = entries.reduce((sum, entry) => sum + _wordCount(`${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`), 0);
  const latestUpdatedAt = entries
    .map((entry) => entry.updatedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  STATE.tutorialNotebook.analytics = {
    totalWords,
    totalAttachments: attachments.length,
    totalVideoLinks: attachments.filter((asset) => _isVideoLinkAsset(asset)).length,
    sessionsWithActivity: entries.filter((entry) => _entryHasActivity(entry)).length,
    archivedUnits: Object.keys(STATE.tutorialNotebook.archivedUnits || {}).length,
    lastUpdatedAt: latestUpdatedAt,
  };

  if (!STATE.progress) STATE.progress = {};
  STATE.progress.tutorialNotebookAnalytics = { ...STATE.tutorialNotebook.analytics };
}

function _entryHasActivity(entry) {
  return Boolean(
    String(entry?.response || '').trim()
    || String(entry?.notes || '').trim()
    || String(entry?.searchLog || '').trim()
    || (Array.isArray(entry?.attachments) && entry.attachments.length)
  );
}

function _archiveUnit(unitId) {
  _ensureState();
  const sessions = TUTORIAL_SESSIONS.filter((session) => session.unit === unitId);
  const entries = sessions.map((session) => _getEntry(session.id)).filter(Boolean);
  STATE.tutorialNotebook.archivedUnits[unitId] = {
    archivedAt: new Date().toISOString(),
    sessionIds: sessions.map((session) => session.id),
    wordCount: entries.reduce((sum, entry) => sum + _wordCount(`${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`), 0),
    attachmentCount: entries.reduce((sum, entry) => sum + ((entry.attachments || []).length), 0),
  };
  _refreshNotebookAnalytics();
}

function _unarchiveUnit(unitId) {
  if (!STATE.tutorialNotebook?.archivedUnits?.[unitId]) return;
  delete STATE.tutorialNotebook.archivedUnits[unitId];
  _refreshNotebookAnalytics();
}

function _studentizePrompt(text = '') {
  const raw = String(text || '');
  const trimmed = raw.trim();
  return trimmed
    .replace(/^Students?\b/i, 'You')
    .replace(/^Pairs?\b/i, 'You and a partner')
    .replace(/^Whole class\b/i, 'Together as a class')
    .replace(/\bstudents\b/gi, 'you');
}

function _studentizeTitle(text = '') {
  const raw = String(text || '');
  return raw.replace(/^Students?\b/i, 'You');
}

function _unitNum(unitId = '') {
  const m = String(unitId).match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function _wordCount(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function _formatTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function _snippet(hay, needle) {
  const idx = hay.indexOf(needle);
  if (idx < 0) return '';
  const start = Math.max(0, idx - 28);
  const end = Math.min(hay.length, idx + needle.length + 40);
  const raw = hay.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${raw}${end < hay.length ? '…' : ''}`;
}

function _formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function _esc(v = '') {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _escAttr(v = '') {
  return String(v ?? '').replace(/"/g, '&quot;');
}

function _escText(v = '') {
  return String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

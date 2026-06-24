// src/components/reading-task.js
// ─────────────────────────────────────────────
// Self-contained reading & writing component.
// Five steps: Vocabulary → Reading → Comprehension → Writing → Feedback
//
// FEEDBACK PHILOSOPHY:
//   Honest, specific, academically rigorous.
//   Not sycophantic. Not harsh. Diagnostic.
//   Uses a 4-level rating system that clearly names
//   when writing falls below university standard.
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';
import { scoreSubmissionForAI, getStudentBaselineProfile } from '../ai-detection.js';
import { writeLearningEvent } from '../analytics.js';
import { db } from '../firebase.js';
import { persistLocalStateSoon } from '../state.js';
import { ref, set, remove } from 'firebase/database';

window._rtCfg = window._rtCfg || {};
window._rtState = window._rtState || {};
window._rtSaveTimers = window._rtSaveTimers || {};

// Host mode: when a reading task is driven by an outer linear navigator
// (see unit-reader.js), it hides its own step indicator + per-step nav
// buttons and exposes a navigation contract on window._stepperNav so the
// outer Back/Next can drive it as part of one continuous flow.
window._rtHost = window._rtHost || {};
window._stepperNav = window._stepperNav || {};

const RT_STEPS = ['vocab', 'reading', 'questions', 'survey', 'writing', 'feedback'];
const RT_STEP_LABELS = ['Vocabulary', 'Reading', 'Questions', 'Survey', 'Writing', 'Feedback'];
const RT_MIN_ANSWER_CHARS = 15;
const RT_MIN_WRITING_WORDS = 30;

function _rtLiveWritingWords(id) {
  const ta = document.getElementById(`rt-writing-${id}`);
  const text = (ta ? ta.value : (window._rtState[id]?.writing || '')).trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function _rtLiveAnswersComplete(id) {
  const cfg = window._rtCfg[id];
  const st = window._rtState[id];
  if (!cfg || !st) return false;
  return cfg.questions.every((_, i) => {
    const ta = document.getElementById(`rt-ans-${id}-${i}`);
    const val = (ta ? ta.value : (st.answers[i] || '')).trim();
    return val.length >= RT_MIN_ANSWER_CHARS;
  });
}

// Notify any outer navigator that this task's step or gate state changed.
function _rtEmitNav(id) {
  try {
    document.dispatchEvent(new CustomEvent('rt:stepchange', { detail: { id } }));
  } catch { /* no-op */ }
}

// Register the navigation contract the outer reader delegates to.
function _rtRegisterNav(id) {
  window._stepperNav[id] = {
    steps: RT_STEPS.slice(),
    labels: RT_STEP_LABELS.slice(),
    index: () => RT_STEPS.indexOf(window._rtState[id]?.step || 'vocab'),
    count: () => RT_STEPS.length,
    current: () => window._rtState[id]?.step || 'vocab',
    canPrev: () => RT_STEPS.indexOf(window._rtState[id]?.step || 'vocab') > 0,
    canNext: () => {
      const step = window._rtState[id]?.step || 'vocab';
      if (step === 'questions') return _rtLiveAnswersComplete(id);
      if (step === 'writing') return _rtLiveWritingWords(id) >= RT_MIN_WRITING_WORDS;
      return true; // vocab, reading, survey, feedback
    },
    nextLabel: () => {
      const step = window._rtState[id]?.step || 'vocab';
      switch (step) {
        case 'vocab': return 'Start reading →';
        case 'writing': return '✨ Submit for feedback';
        case 'feedback': return 'Next →';
        default: return 'Continue →';
      }
    },
    // Performs the primary action for the current step. Returns 'exit' when
    // the task is complete (outer navigator should advance to the next screen).
    next: () => {
      const step = window._rtState[id]?.step || 'vocab';
      switch (step) {
        case 'vocab': window._rtAdvance(id, 'reading'); return;
        case 'reading': window._rtAdvance(id, 'questions'); return;
        case 'questions': window._rtSubmitComprehension(id); return;
        case 'survey': window._rtAdvance(id, 'writing'); return;
        case 'writing': window._rtSubmitWriting(id); return;
        case 'feedback': return 'exit';
        default: return;
      }
    },
    prev: () => {
      const i = RT_STEPS.indexOf(window._rtState[id]?.step || 'vocab');
      if (i > 0) window._rtAdvance(id, RT_STEPS[i - 1]);
    },
    goTo: (step) => { if (RT_STEPS.includes(step)) window._rtAdvance(id, step); },
  };
}

const RT_STORAGE_PREFIX = 'acadlit-rt-v1';

function _rtStorageKey(id) {
  const cfg = window._rtCfg[id] || {};
  return `${RT_STORAGE_PREFIX}:${cfg.unitId || 'nouid'}:${id}`;
}

function _rtCloudState(id) {
  const cfg = window._rtCfg[id] || {};
  const unitId = cfg.unitId || '';
  if (!unitId || !window.STATE?.progress?.[unitId]?.readingTaskState) return null;
  return window.STATE.progress[unitId].readingTaskState[id] || null;
}

function _rtSubmissionPath(id) {
  const cfg = window._rtCfg[id] || {};
  const unitId = String(cfg.unitId || '').trim();
  const uid = String(window.STATE?.user?.uid || '').trim();
  if (!unitId || !uid) return '';
  return `analytics/reading-task-submissions/${unitId}/${uid}/${id}`;
}

function _rtSubmissionPayload(id) {
  const st = window._rtState[id];
  const cfg = window._rtCfg[id] || {};
  const user = window.STATE?.user || {};
  const unitId = String(cfg.unitId || '').trim();
  const uid = String(user.uid || '').trim();
  if (!st || !unitId || !uid) return null;

  const writing = String(st.writing || '').trim();
  const answers = st.answers || {};
  const annotations = Array.isArray(st.annotations) ? st.annotations : [];
  const answerCount = Object.values(answers).filter((value) => String(value || '').trim().length > 0).length;
  const writingWordCount = writing ? writing.split(/\s+/).filter(Boolean).length : 0;
  const hasWork = Boolean(answerCount || writingWordCount || st.feedback || st.survey || annotations.length);

  return {
    uid,
    email: String(user.email || '').trim(),
    displayName: String(user.displayName || '').trim(),
    unitId,
    unitNum: Number(cfg.unitNum || 0) || null,
    taskId: id,
    title: String(cfg.title || '').trim(),
    source: String(cfg.source || '').trim(),
    step: String(st.step || 'vocab').trim(),
    answers,
    answerCount,
    writing,
    writingWordCount,
    feedback: st.feedback || null,
    survey: st.survey || null,
    surveySubmittedAt: st.surveySubmittedAt || null,
    annotations,
    annotationCount: annotations.length,
    aiDetection: st.aiDetection || null,
    savedAt: st.savedAt || Date.now(),
    updatedAt: new Date().toISOString(),
    status: st.feedback ? 'reviewed' : (hasWork ? 'in_progress' : 'empty'),
  };
}

async function _rtSyncDedicatedSubmission(id, { cleared = false } = {}) {
  const path = _rtSubmissionPath(id);
  if (!path) return false;

  try {
    if (cleared) {
      await remove(ref(db, path));
      return true;
    }

    const payload = _rtSubmissionPayload(id);
    if (!payload) return false;
    await set(ref(db, path), payload);
    return true;
  } catch (err) {
    console.error('Reading task Firebase submission sync failed:', err);
    return false;
  }
}

function _rtSaveMeta(st = {}) {
  return st._saveMeta || {
    status: 'idle',
    savedAt: st.savedAt || 0,
  };
}

function _rtFormatSavedAt(savedAt = 0) {
  const dateObj = new Date(savedAt || 0);
  if (Number.isNaN(dateObj.getTime()) || !savedAt) return '';
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function _rtSetSaveIndicator(id) {
  const el = document.getElementById(`rt-save-${id}`);
  const st = window._rtState[id];
  if (!el || !st) return;

  const meta = _rtSaveMeta(st);
  const labelTime = _rtFormatSavedAt(meta.savedAt || st.savedAt || 0);

  if (meta.status === 'saving') {
    el.textContent = labelTime ? `Saving… last local save ${labelTime}` : 'Saving…';
    el.style.color = 'var(--amber2)';
    return;
  }

  if (meta.status === 'cloud') {
    el.textContent = labelTime ? `Saved to app at ${labelTime}` : 'Saved to app';
    el.style.color = 'var(--green)';
    return;
  }

  if (meta.status === 'error' || meta.status === 'local') {
    el.textContent = labelTime ? `Saved locally at ${labelTime}` : 'Saved locally';
    el.style.color = meta.status === 'error' ? 'var(--orange)' : 'var(--muted)';
    return;
  }

  el.textContent = labelTime ? `Last saved at ${labelTime}` : 'Autosave ready';
  el.style.color = 'var(--muted)';
}

async function _rtSyncToCloud(id, { immediate = false } = {}) {
  const st = window._rtState[id];
  if (!st || typeof window.saveState !== 'function') return false;

  if (window._rtSaveTimers[id]) {
    clearTimeout(window._rtSaveTimers[id]);
    delete window._rtSaveTimers[id];
  }

  const run = async () => {
    const latest = window._rtState[id];
    if (!latest) return false;

    latest._saveMeta = {
      ..._rtSaveMeta(latest),
      status: 'saving',
      savedAt: latest.savedAt || Date.now(),
    };
    _rtSetSaveIndicator(id);

    try {
      const [stateOk, submissionOk] = await Promise.all([
        window.saveState(),
        _rtSyncDedicatedSubmission(id),
      ]);
      const ok = Boolean(stateOk && submissionOk);
      if (stateOk && !submissionOk) console.warn('Reading task: state saved but submission sync failed for', id);
      if (!stateOk && submissionOk) console.warn('Reading task: submission saved but state sync failed for', id);
      latest._saveMeta = {
        ..._rtSaveMeta(latest),
        status: ok ? 'cloud' : 'error',
        savedAt: latest.savedAt || Date.now(),
      };
      _rtSetSaveIndicator(id);
      return Boolean(ok);
    } catch {
      latest._saveMeta = {
        ..._rtSaveMeta(latest),
        status: 'error',
        savedAt: latest.savedAt || Date.now(),
      };
      _rtSetSaveIndicator(id);
      return false;
    }
  };

  if (immediate) return run();

  window._rtSaveTimers[id] = window.setTimeout(() => {
    delete window._rtSaveTimers[id];
    void run();
  }, 900);
  return true;
}

function _rtPersist(id) {
  const st = window._rtState[id];
  if (!st) return;
  try {
    const now = new Date();
    const cfg = window._rtCfg[id] || {}; // Define cfg here for use in STATE sync
    const data = {
      step: st.step,
      answers: st.answers || {},
      writing: st.writing || '',
      feedback: st.feedback || null,
      annotations: st.annotations || [],
      survey: st.survey || null,
      surveySubmittedAt: st.surveySubmittedAt || null,
      aiDetection: st.aiDetection || null,
      savedAt: now.getTime(),
    };
    st.savedAt = data.savedAt;
    st._saveMeta = {
      ..._rtSaveMeta(st),
      status: 'local',
      savedAt: data.savedAt,
    };
    localStorage.setItem(_rtStorageKey(id), JSON.stringify(data));

    // Sync with global STATE for Firebase persistence
    if (window.STATE && window.STATE.progress && cfg.unitId) {
      if (!window.STATE.progress[cfg.unitId]) window.STATE.progress[cfg.unitId] = {};
      window.STATE.progress[cfg.unitId].readingTaskState = window.STATE.progress[cfg.unitId].readingTaskState || {};
      window.STATE.progress[cfg.unitId].readingTaskState[id] = data;
      persistLocalStateSoon('reading-task');
    }

    _rtSetSaveIndicator(id);
    void _rtSyncToCloud(id);
  } catch (err) {
    console.error('Reading task persist failed for', id, err);
  }
}

function _rtRestore(id, baseState) {
  try {
    const raw = localStorage.getItem(_rtStorageKey(id));
    const localSaved = raw ? JSON.parse(raw) : null;
    const cloudSaved = _rtCloudState(id);
    const saved = Number(localSaved?.savedAt || 0) >= Number(cloudSaved?.savedAt || 0)
      ? (localSaved || cloudSaved)
      : (cloudSaved || localSaved);
    if (!saved) return baseState;
    return {
      ...baseState,
      step: saved.step || baseState.step,
      answers: saved.answers || baseState.answers,
      writing: saved.writing || baseState.writing,
      feedback: saved.feedback ?? baseState.feedback,
      annotations: saved.annotations || baseState.annotations,
      survey: saved.survey || baseState.survey,
      surveySubmittedAt: saved.surveySubmittedAt || baseState.surveySubmittedAt || null,
      aiDetection: saved.aiDetection || baseState.aiDetection || null,
      savedAt: saved.savedAt || 0,
      _saveMeta: {
        status: cloudSaved && saved === cloudSaved ? 'cloud' : 'local',
        savedAt: saved.savedAt || 0,
      },
    };
  } catch {
    return baseState;
  }
}

function _rtAnalyticsProfile() {
  return window.STATE?.user?._studentProfileContext?.profile || {
    uid: window.STATE?.user?.uid || '',
    role: 'student',
    authEmail: window.STATE?.user?.email || '',
    username: window.STATE?.user?.email || '',
    displayName: window.STATE?.user?.displayName || '',
  };
}

export function readingTask(id, config) {
  window._rtCfg[id] = config;
  return `<div id="${id}" class="rt-container" aria-label="Reading and Writing Activity"></div>`;
}

export function initAllReadingTasks() {
  document.querySelectorAll('.rt-container:not([data-rt-ready])').forEach(el => {
    const cfg = window._rtCfg[el.id];
    if (!cfg) return;
    el.dataset.rtReady = '1';

    let savedAnnotations = [];
    if (window.STATE && window.STATE.progress && window.STATE.progress[cfg.unitId] && window.STATE.progress[cfg.unitId].annotations) {
      savedAnnotations = window.STATE.progress[cfg.unitId].annotations;
    }

    const baseState = { step: 'vocab', answers: {}, writing: '', feedback: null, annotations: savedAnnotations, survey: null, aiDetection: null, savedAt: 0 };
    window._rtState[el.id] = _rtRestore(el.id, baseState);
    _rtRegisterNav(el.id);
    _render(el.id);
  });
}

// Allow an outer navigator to toggle host mode and force a re-render.
window._rtSetHostMode = (id, on) => {
  window._rtHost[id] = !!on;
  if (window._rtState[id]) _render(id);
};

function _render(id) {
  const el = document.getElementById(id);
  const cfg = window._rtCfg[id];
  const st = window._rtState[id];
  if (!el || !cfg || !st) return;

  const STEPS = RT_STEPS;
  const LABELS = RT_STEP_LABELS;
  const idx = STEPS.indexOf(st.step);
  const host = !!window._rtHost[id];

  el.innerHTML = `
    <div class="rt-wrapper ${host ? 'rt-host' : ''}">
      <div class="rt-header">
        <div class="rt-header-icon">📖</div>
        <div>
          <div class="rt-header-label">Reading & Writing Activity</div>
          <div class="rt-header-title">${cfg.title}</div>
        </div>
      </div>

      <div class="rt-steps">
        ${STEPS.map((s, i) => `
          <div class="rt-step-item ${i < idx ? 'completed' : ''} ${i === idx ? 'active' : ''}">
            <div class="rt-step-dot">${i < idx ? '✓' : i + 1}</div>
            <div class="rt-step-lbl">${LABELS[i]}</div>
          </div>
          ${i < STEPS.length - 1 ? `<div class="rt-step-connector ${i < idx ? 'done' : ''}"></div>` : ''}
        `).join('')}
      </div>

      <div class="rt-body" id="rt-body-${id}">
        ${_renderStep(id, cfg, st)}
      </div>
    </div>`;

  _rtSetSaveIndicator(id);

  if (st.step === 'writing') {
    const wc = document.getElementById(`rt-wc-${id}`);
    if (wc) {
      const count = String(st.writing || '').trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = `${count} words`;
      wc.style.color = count >= Number(cfg.wordTarget || 0) ? 'var(--green)' : 'var(--muted)';
    }
  }

  // Tell any outer linear navigator that the step (and gate state) changed.
  _rtEmitNav(id);
}

function _renderStep(id, cfg, st) {
  switch (st.step) {
    case 'vocab': return _vocabStep(id, cfg);
    case 'reading': return _readingStep(id, cfg);
    case 'questions': return _questionsStep(id, cfg, st);
    case 'survey': return _surveyStep(id, cfg, st);
    case 'writing': return _writingStep(id, cfg, st);
    case 'feedback': return _feedbackStep(id, cfg, st);
    default: return '';
  }
}

// ── Step 1: Vocabulary ────────────────────────
function _vocabStep(id, cfg) {
  return `
    <div class="rt-step-content anim-fade">
      <p class="rt-instruction">Before you read, study these key terms. You will need them in the comprehension questions and writing task. Take a moment with each one — don't rush.</p>
      <div class="rt-vocab-grid">
        ${cfg.vocab.map(v => `
          <div class="rt-vocab-card">
            <div class="rt-vocab-term">${v.term}</div>
            <div class="rt-vocab-def">${v.definition}</div>
            ${v.example ? `<div class="rt-vocab-example">"${v.example}"</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="rt-nav">
        <button class="rt-btn-primary" onclick="_rtAdvance('${id}', 'reading')">I understand these terms — start reading →</button>
      </div>
    </div>`;
}

// ── Step 2: Reading ───────────────────────────
function _readingStep(id, cfg) {
  const st = window._rtState[id];
  const annotationsHtml = st.annotations && st.annotations.length > 0
    ? st.annotations.map((a, i) => `
        <div class="rt-note-card">
          <div class="rt-note-quote">"${a.quote}"</div>
          <div class="rt-note-text">${a.text}</div>
          <button class="rt-note-del" onclick="_rtDeleteAnnotation('${id}', ${i})">Delete</button>
        </div>
      `).join('')
    : `<p class="rt-note-empty">Highlight any text in the reading to add a note.</p>`;

  return `
    <div class="rt-step-content anim-fade">
      <div class="rt-source-bar">
        <span class="rt-source-label">Source</span>
        <span class="rt-source-name">${cfg.source}</span>
        ${cfg.sourceUrl ? `<a href="${cfg.sourceUrl}" target="_blank" rel="noopener" class="rt-source-link">↗ Visit</a>` : ''}
        <button type="button" class="rt-source-pdf" onclick="_rtDownloadReadingPdf('${id}')" title="Save this reading as a PDF">⬇ Download PDF</button>
      </div>

      <div class="rt-reading-layout">
        <div class="rt-reading-main" id="rt-read-main-${id}" onmouseup="_rtHandleTextSelection('${id}')" ontouchend="_rtHandleTextSelection('${id}')">
          <div class="rt-reading-text">${cfg.text}</div>

          ${cfg.visual ? `
            <div class="rt-visual-block">
              <div class="rt-visual-label">📊 Visual — Study this carefully before answering the questions.</div>
              ${cfg.visual}
            </div>` : ''}
        </div>
        
        <div class="rt-reading-sidebar">
          <div class="rt-annotations-header">
            <span class="rt-annotations-title">📝 Active Reading Notes</span>
          </div>
          <div class="rt-annotations-list">
            ${annotationsHtml}
          </div>
          <div id="rt-annot-popover-${id}" class="rt-annot-popover" style="display:none;">
            <div class="rt-annot-quote" id="rt-annot-quote-${id}"></div>
            <textarea id="rt-annot-ta-${id}" class="rt-textarea" rows="3" placeholder="Add your note..."></textarea>
            <div class="rt-annot-actions">
              <button class="rt-btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="document.getElementById('rt-annot-popover-${id}').style.display='none'">Cancel</button>
              <button class="rt-btn-primary" style="padding:6px 12px;font-size:12px;" onclick="_rtSaveAnnotation('${id}')">Save Note</button>
            </div>
          </div>
        </div>
      </div>

      <div class="rt-reading-tip" style="margin-top: 28px;">
        💡 <strong>Reading tip:</strong> First pass — read for the general idea. Second pass — identify the main argument. Third pass — notice specific details, examples, and any words you don't know. You can return to this reading at any time using the back button.
      </div>

      <div class="rt-nav">
        <button class="rt-btn-secondary" onclick="_rtAdvance('${id}', 'vocab')">← Vocabulary</button>
        <button class="rt-btn-primary" onclick="_rtAdvance('${id}', 'questions')">I have finished reading →</button>
      </div>
    </div>`;
}

// ── Step 3: Comprehension ─────────────────────
function _questionsStep(id, cfg, st) {
  return `
    <div class="rt-step-content anim-fade">
      <p class="rt-instruction">Answer all three questions in your own words before the writing task unlocks. Do not copy sentences from the text — paraphrase and use your own thinking. There is no word limit, but aim for at least 2–3 sentences per answer.</p>

      ${cfg.questions.map((q, i) => `
        <div class="rt-question-block">
          <label class="rt-q-label">Question ${i + 1} of ${cfg.questions.length}</label>
          <p class="rt-q-text">${q}</p>
          <textarea id="rt-ans-${id}-${i}" class="rt-textarea" rows="3"
            placeholder="Write your answer here in your own words…"
            oninput="_rtCheckAnswers('${id}')">${st.answers[i] || ''}</textarea>
        </div>
      `).join('')}

      <p id="rt-q-err-${id}" class="rt-err" style="display:none;">Please write at least one sentence for each question before continuing.</p>

      <div class="rt-nav">
        <button class="rt-btn-secondary" onclick="_rtAdvance('${id}', 'reading')">← Back to reading</button>
        <button class="rt-btn-primary" onclick="_rtSubmitComprehension('${id}')">Continue to Survey →</button>
      </div>
    </div>`;
}

// ── Step 3.5: Reading Strategy Survey ─────────
function _surveyStep(id, cfg, st) {
  const survey = st.survey || { difficulty: 3, interest: 3, strategies: [] };

  return `
    <div class="rt-step-content anim-fade">
      <div class="rt-survey-box">
        <h3 class="rt-survey-title">📊 Reading Experience Survey</h3>
        <p class="rt-survey-desc">Before you write, tell us about your experience reading this text. This helps us adapt future tasks to your level.</p>
        
        <div class="rt-survey-q">
          <label>1. How challenging was the language and vocabulary in this text?</label>
          <div class="rt-survey-scale">
            <span>Too Easy</span>
            <input type="range" id="rt-surv-diff-${id}" min="1" max="5" value="${survey.difficulty}" onchange="_rtUpdateSurvey('${id}')">
            <span>Too Hard</span>
          </div>
        </div>

        <div class="rt-survey-q">
          <label>2. How interesting did you find the topic?</label>
          <div class="rt-survey-scale">
            <span>Boring</span>
            <input type="range" id="rt-surv-int-${id}" min="1" max="5" value="${survey.interest}" onchange="_rtUpdateSurvey('${id}')">
            <span>Fascinating</span>
          </div>
        </div>

        <div class="rt-survey-q">
          <label>3. Which active reading strategies did you use today? (Check all that apply)</label>
          <div class="rt-survey-checks">
            <label><input type="checkbox" value="highlighting" class="rt-surv-chk-${id}" ${survey.strategies.includes('highlighting') ? 'checked' : ''} onchange="_rtUpdateSurvey('${id}')"> Highlighting key quotes</label>
            <label><input type="checkbox" value="rereading" class="rt-surv-chk-${id}" ${survey.strategies.includes('rereading') ? 'checked' : ''} onchange="_rtUpdateSurvey('${id}')"> Re-reading difficult paragraphs</label>
            <label><input type="checkbox" value="summarising" class="rt-surv-chk-${id}" ${survey.strategies.includes('summarising') ? 'checked' : ''} onchange="_rtUpdateSurvey('${id}')"> Summarising ideas in my head</label>
            <label><input type="checkbox" value="guessing" class="rt-surv-chk-${id}" ${survey.strategies.includes('guessing') ? 'checked' : ''} onchange="_rtUpdateSurvey('${id}')"> Guessing unknown words from context</label>
          </div>
        </div>
      </div>

      <div class="rt-nav">
        <button class="rt-btn-secondary" onclick="_rtAdvance('${id}', 'questions')">← Back to questions</button>
        <button class="rt-btn-primary" onclick="_rtAdvance('${id}', 'writing')">Continue to writing task →</button>
      </div>
    </div>`;
}

// ── Step 4: Writing ───────────────────────────
function _writingStep(id, cfg, st) {
  let promptText = cfg.writingPrompt;
  let adaptiveHintHtml = '';

  if (st.survey) {
    const diff = st.survey.difficulty;
    const hasStrats = st.survey.strategies && st.survey.strategies.length > 0;

    if (diff <= 2 && hasStrats) {
      // Found it easy AND used strategies = push them harder
      adaptiveHintHtml = `
        <div class="rt-adaptive-nudge push-harder">
          <div class="rt-adaptive-icon">🚀</div>
          <div>
            <strong>Level Up Challenge:</strong> Because you found the reading manageable and used active reading strategies, push your analysis further today. Try to identify one hidden assumption the author makes, or connect this text to a real-world South African example not mentioned in the text.
          </div>
        </div>
      `;
    } else if (diff >= 4) {
      // Found it difficult = scaffold them
      adaptiveHintHtml = `
        <div class="rt-adaptive-nudge scaffold">
          <div class="rt-adaptive-icon">🪜</div>
          <div>
            <strong>Scaffolding Hint:</strong> Because this text was challenging, don't worry about being perfect. Focus only on the core idea. You can start your paragraph like this: <em>"The main argument of the text is..."</em>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="rt-step-content anim-fade">
      <div class="rt-task-card">
        <div class="rt-task-label">✍️ Writing Task</div>
        <p class="rt-task-prompt">${promptText}</p>
        <div class="rt-task-meta">
          <span>🎯 Target: ${cfg.wordTarget} words</span>
          <span>📚 Level: ${cfg.level}</span>
        </div>
      </div>
      
      ${adaptiveHintHtml}

      <div class="rt-writing-tips">
        <strong>Before you write, ask yourself:</strong>
        <ul>
          <li>What is the single most important idea I want to communicate?</li>
          <li>Do I have a specific example — from the reading or my own experience?</li>
          <li>Am I writing in complete sentences with correct punctuation?</li>
          <li>Would a lecturer at university find this an acceptable standard of writing?</li>
        </ul>
      </div>

      <textarea id="rt-writing-${id}" class="rt-textarea rt-writing-area" rows="8"
        placeholder="Start writing here…"
        oninput="_rtWordCount('${id}')">${st.writing || ''}</textarea>

      <div class="rt-writing-footer">
        <span class="rt-word-count" id="rt-wc-${id}">0 words</span>
        <span class="rt-word-target">Target: ${cfg.wordTarget} words</span>
        <span id="rt-save-${id}" style="font-size:12px;color:var(--muted);">Autosave ready</span>
      </div>

      <p id="rt-w-err-${id}" class="rt-err" style="display:none;">Please write at least 30 words before submitting.</p>

      <div class="rt-nav">
        <button class="rt-btn-secondary" onclick="_rtAdvance('${id}', 'questions')">← Back to questions</button>
        <button class="rt-btn-secondary" onclick="_rtClearWork('${id}')">Clear response</button>
        <button class="rt-btn-submit" onclick="_rtSubmitWriting('${id}')">✨ Submit for Feedback</button>
      </div>
    </div>`;
}

// ── Step 5: Feedback ──────────────────────────

// Level config — used to render the rating badge and colour-coded bar
const LEVELS = {
  1: { label: 'Needs significant development', color: '#ef4444', bg: '#fef2f2', bar: 20, icon: '🔴' },
  2: { label: 'Below university standard', color: '#f97316', bg: '#fff7ed', bar: 40, icon: '🟠' },
  3: { label: 'Approaching university standard', color: '#eab308', bg: '#fefce8', bar: 60, icon: '🟡' },
  4: { label: 'Meets university standard', color: '#22c55e', bg: '#f0fdf4', bar: 80, icon: '🟢' },
  5: { label: 'Exceeds university standard', color: '#6366f1', bg: '#f5f3ff', bar: 100, icon: '🌟' },
};

function _feedbackStep(id, cfg, st) {
  const fb = st.feedback;

  if (!fb) {
    return `
      <div class="rt-step-content rt-loading-state">
        <div class="rt-spinner"></div>
        <p>Analysing your writing…</p>
      </div>`;
  }

  const lv = LEVELS[fb.level] || LEVELS[3];
  const canRevise = fb.level <= 2; // prompt revision for below-standard work

  // AI detection warning
  const aiWarn = st.aiDetection && st.aiDetection.isRiskFlag ? `
    <div style="background:#fee2e2;border:1.5px solid #fca5a5;border-radius:6px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;gap:12px;">
        <div style="font-size:24px;">⚠️</div>
        <div style="flex:1;">
          <div style="font-weight:700;color:#991b1b;margin-bottom:6px;">Academic Integrity Warning</div>
          <p style="color:#7f1d1d;font-size:14px;margin:0;line-height:1.5;">${st.aiDetection.recommendation}</p>
          ${st.aiDetection.reasons && st.aiDetection.reasons.length > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #fca5a5;font-size:12px;color:#991b1b;"><strong>Detected signs:</strong><ul style="margin:4px 0 0 18px;padding:0;">${st.aiDetection.reasons.map(r => '<li>' + r + '</li>').join('')}</ul></div>` : ''}
        </div>
      </div>
    </div>
  ` : '';

  const voiceChallenge = fb.voice_challenge ? `
    <div class="rt-voice-challenge">
      <div class="rt-vc-icon">🎙️</div>
      <div class="rt-vc-title">Tell Us More About Your Thinking</div>
      <p class="rt-vc-text">${fb.originality_note}</p>
      <p class="rt-vc-prompt">Add 2–3 sentences below: <em>What was difficult about this task? What did you change your mind about while writing? Where did you get stuck?</em></p>
      <textarea id="rt-vc-${id}" class="rt-textarea" rows="4" placeholder="Write your reflection here…"></textarea>
      <button class="rt-btn-primary" style="margin-top:10px;" onclick="_rtSubmitVoiceChallenge('${id}')">Submit reflection →</button>
    </div>` : '';

  return `
    <div class="rt-step-content anim-fade">

      <div class="rt-feedback-header">
        ${aiWarn}
        <div class="rt-feedback-icon">📋</div>
        <div>
          <div class="rt-feedback-title">Tutor Feedback</div>
          <div class="rt-feedback-sub">Unit ${cfg.unitNum} — ${cfg.title}</div>
        </div>
      </div>

      <!-- Level rating -->
      <div class="rt-level-card" style="background:${lv.bg};border:1.5px solid ${lv.color}20;">
        <div class="rt-level-top">
          <span class="rt-level-icon">${lv.icon}</span>
          <div>
            <div class="rt-level-label" style="color:${lv.color};">Writing Level</div>
            <div class="rt-level-name" style="color:${lv.color};">${lv.label}</div>
          </div>
        </div>
        <div class="rt-level-bar-bg">
          <div class="rt-level-bar-fill" style="width:${lv.bar}%;background:${lv.color};"></div>
        </div>
        <div class="rt-level-scale">
          <span>Needs development</span>
          <span>Meets standard</span>
          <span>Exceeds standard</span>
        </div>
      </div>

      <!-- Feedback panels -->
      <div class="rt-feedback-grid">
        <div class="rt-fb-card">
          <div class="rt-fb-card-label">📌 Content & Task Response</div>
          <p>${fb.content}</p>
        </div>
        <div class="rt-fb-card">
          <div class="rt-fb-card-label">📝 Language & Sentence Construction</div>
          <p>${fb.language}</p>
        </div>
        <div class="rt-fb-card">
          <div class="rt-fb-card-label">🎯 Academic Register & Vocabulary</div>
          <p>${fb.register}</p>
        </div>
        <div class="rt-fb-card ${fb.level >= 4 ? 'rt-fb-highlight' : 'rt-fb-develop'}">
          <div class="rt-fb-card-label">🔧 Priority: What to Work On Next</div>
          <p>${fb.priority}</p>
        </div>
      </div>

      ${fb.knowledge_gap_advice ? `
        <div class="rt-adaptive-nudge scaffold" style="margin-top:20px;">
          <div class="rt-adaptive-icon">🧱</div>
          <div>
            <strong>Foundational Concept Review:</strong> ${fb.knowledge_gap_advice}
          </div>
        </div>
      ` : ''}

      ${fb.extension_reading ? `
        <div class="rt-adaptive-nudge push-harder" style="margin-top:20px;">
          <div class="rt-adaptive-icon">🚀</div>
          <div>
            <strong>Autonomous Learning Challenge:</strong> ${fb.extension_reading} You can find advanced texts in the Extensive Reading section of the sidebar.
          </div>
        </div>
      ` : ''}

      ${fb.example_correction ? `
        <div class="rt-correction-block">
          <div class="rt-correction-label">✏️ Sentence-Level Example</div>
          <div class="rt-correction-row">
            <div class="rt-correction-original"><span class="rt-corr-tag original">Your sentence</span>${fb.example_correction.original}</div>
            <div class="rt-correction-arrow">→</div>
            <div class="rt-correction-improved"><span class="rt-corr-tag improved">Improved version</span>${fb.example_correction.improved}</div>
          </div>
          <p class="rt-correction-note">${fb.example_correction.explanation}</p>
        </div>` : ''}

      ${voiceChallenge}

      <!-- Student's own writing -->
      <div class="rt-your-writing">
        <div class="rt-yw-label">Your Submission</div>
        <div class="rt-yw-text">${st.writing.replace(/\n/g, '<br>')}</div>
      </div>

      <div class="rt-nav" style="margin-top:24px;">
        <button class="rt-btn-secondary" onclick="_rtAdvance('${id}', 'writing')">
          ← ${canRevise ? '⚠️ Revise and resubmit' : 'Revise my writing'}
        </button>
        <button class="rt-btn-secondary" onclick="_rtClearWork('${id}')">Clear response</button>
        <div id="rt-save-${id}" style="font-size:12px;color:var(--muted);align-self:center;">Autosave ready</div>
        ${canRevise
      ? `<div class="rt-revise-nudge">Your tutor recommends revising before moving on.</div>`
      : `<div style="font-size:13px;color:var(--muted);align-self:center;">✅ Activity complete</div>`}
      </div>
    </div>`;
}

// ── Global Handlers ───────────────────────────

window._rtHandleTextSelection = (id) => {
  setTimeout(() => {
    const sel = window.getSelection();
    const text = sel.toString().trim();
    const popover = document.getElementById(`rt-annot-popover-${id}`);
    const quoteEl = document.getElementById(`rt-annot-quote-${id}`);
    const ta = document.getElementById(`rt-annot-ta-${id}`);
    if (text.length > 5) {
      if (popover && quoteEl) {
        quoteEl.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        quoteEl.dataset.fullQuote = text;
        popover.style.display = 'block';
        if (ta) ta.value = '';
      }
    }
  }, 50);
};

window._rtSaveAnnotation = (id) => {
  const quoteEl = document.getElementById(`rt-annot-quote-${id}`);
  const ta = document.getElementById(`rt-annot-ta-${id}`);
  const st = window._rtState[id];
  const cfg = window._rtCfg[id];

  if (!quoteEl || !ta || !st || !cfg) return;
  const quote = quoteEl.dataset.fullQuote || quoteEl.textContent;
  const note = ta.value.trim();

  if (note.length === 0) return;

  if (!st.annotations) st.annotations = [];
  st.annotations.push({ quote, text: note, timestamp: new Date().toISOString() });

  if (window.STATE && window.STATE.progress && cfg.unitId) {
    if (!window.STATE.progress[cfg.unitId]) window.STATE.progress[cfg.unitId] = {};
    window.STATE.progress[cfg.unitId].annotations = st.annotations;
    if (window.saveState) void _rtSyncToCloud(id, { immediate: true });
  }

  _rtPersist(id);

  _render(id);
};

window._rtDeleteAnnotation = (id, idx) => {
  const st = window._rtState[id];
  const cfg = window._rtCfg[id];
  if (!st || !st.annotations) return;

  st.annotations.splice(idx, 1);

  if (window.STATE && window.STATE.progress && cfg.unitId) {
    window.STATE.progress[cfg.unitId].annotations = st.annotations;
    if (window.saveState) void _rtSyncToCloud(id, { immediate: true });
  }

  _rtPersist(id);

  _render(id);
};

window._rtAdvance = (id, step) => {
  if (window._rtState[id]?.step === 'writing') {
    const ta = document.getElementById(`rt-writing-${id}`);
    if (ta) window._rtState[id].writing = ta.value;
  }
  if (window._rtState[id]?.step === 'questions') {
    const cfg = window._rtCfg[id];
    cfg.questions.forEach((_, i) => {
      const ta = document.getElementById(`rt-ans-${id}-${i}`);
      if (ta) window._rtState[id].answers[i] = ta.value;
    });
  }
  window._rtState[id].step = step;
  _rtPersist(id);
  _render(id);
};

window._rtCheckAnswers = (id) => {
  const cfg = window._rtCfg[id];
  cfg.questions.forEach((_, i) => {
    const ta = document.getElementById(`rt-ans-${id}-${i}`);
    if (ta) window._rtState[id].answers[i] = ta.value;
  });
  _rtPersist(id);
  _rtEmitNav(id); // refresh outer Next gate as the student types
};

window._rtSubmitComprehension = (id) => {
  const cfg = window._rtCfg[id];
  const st = window._rtState[id];
  const err = document.getElementById(`rt-q-err-${id}`);
  const allAnswered = cfg.questions.every((_, i) => {
    const ta = document.getElementById(`rt-ans-${id}-${i}`);
    const val = ta?.value?.trim() ?? '';
    if (ta) st.answers[i] = ta.value;
    return val.length >= 15;
  });
  if (!allAnswered) { if (err) err.style.display = 'block'; return; }
  if (err) err.style.display = 'none';
  _rtAdvance(id, 'survey');
};

window._rtUpdateSurvey = (id) => {
  void (async () => {
  const st = window._rtState[id];
  const cfg = window._rtCfg[id];
  if (!st) return;

  const diff = document.getElementById(`rt-surv-diff-${id}`)?.value || 3;
  const int = document.getElementById(`rt-surv-int-${id}`)?.value || 3;
  const strats = Array.from(document.querySelectorAll(`.rt-surv-chk-${id}:checked`)).map(c => c.value);

  st.survey = { difficulty: parseInt(diff), interest: parseInt(int), strategies: strats };

  _rtPersist(id);

  if (window.STATE && window.STATE.progress && cfg.unitId) {
    if (!window.STATE.progress[cfg.unitId]) window.STATE.progress[cfg.unitId] = {};
    window.STATE.progress[cfg.unitId].readingSurvey = st.survey;
    if (window.saveState) void _rtSyncToCloud(id, { immediate: true });
  }
  if (!st.surveySubmittedAt && window.STATE?.user && cfg?.unitId) {
    st.surveySubmittedAt = new Date().toISOString();
    _rtPersist(id);
    try {
      await writeLearningEvent('survey_submit', {
        user: window.STATE.user || {},
        profile: _rtAnalyticsProfile(),
        unitId: cfg.unitId,
        timestamp: st.surveySubmittedAt,
        eventId: `survey__${cfg.unitId || 'nouid'}__${id}__${window.STATE.user.uid || 'unknown'}`,
        source: 'reading-task-survey',
        meta: {
          taskId: id,
          surveyType: 'reading-experience',
          difficulty: st.survey.difficulty,
          interest: st.survey.interest,
          strategyCount: Array.isArray(st.survey.strategies) ? st.survey.strategies.length : 0,
        },
      });
    } catch (err) {
      console.error('Survey analytics write failed:', err);
    }
  }
  })();
};

window._rtWordCount = (id) => {
  const ta = document.getElementById(`rt-writing-${id}`);
  const wc = document.getElementById(`rt-wc-${id}`);
  const cfg = window._rtCfg[id];
  if (!ta || !wc) return;
  const count = ta.value.trim().split(/\s+/).filter(Boolean).length;
  window._rtState[id].writing = ta.value;
  _rtPersist(id);
  wc.textContent = `${count} words`;
  wc.style.color = count >= cfg.wordTarget ? 'var(--green)' : 'var(--muted)';
  _rtEmitNav(id); // refresh outer Submit gate live
};

window._rtSubmitWriting = async (id) => {
  const ta = document.getElementById(`rt-writing-${id}`);
  const err = document.getElementById(`rt-w-err-${id}`);
  const cfg = window._rtCfg[id];
  const st = window._rtState[id];

  const text = ta?.value?.trim() ?? '';
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) { if (err) err.style.display = 'block'; return; }
  if (err) err.style.display = 'none';

  st.writing = text;
  st.step = 'feedback';
  st.feedback = null;
  _rtPersist(id);
  _render(id);

  // ── THE FEEDBACK ALGORITHM ─────────────────────────────────────────────
  // Design principles:
  //   1. Honest: clearly names when writing falls below university standard
  //   2. Diagnostic: tells the student exactly WHAT is wrong and WHY
  //   3. Actionable: shows a corrected example, not just a description of the problem
  //   4. Not sycophantic: no empty praise — strength only mentioned if genuine
  //   5. Context-aware: accounts for English as second/third language
  //   6. 5-level rating: makes standing completely transparent
  // ──────────────────────────────────────────────────────────────────────

  const strippedText = cfg.text.replace(/(<([^>]+)>)/gi, '').substring(0, 500);

  const systemPrompt = `You are an academic literacy tutor at a South African university. Your students are first-year Bachelor of Education students. Many write in English as their second or third language. Your role is to give HONEST, DIAGNOSTIC, and SPECIFIC feedback that will help students genuinely improve — not feedback designed to protect their feelings.

═══ CORE RULES — NEVER VIOLATE THESE ═══

1. NEVER open with praise. Never use phrases like "well done", "great effort", "this is a good start", "I can see you are trying", or "your passion shows." These are sycophantic and useless. Start immediately with your assessment.

2. IF THE WRITING IS BELOW STANDARD — SAY SO. Use the exact level label. Do not soften it. "This writing is at Level 1 — it needs significant development before it would be acceptable at university" is more helpful than vague encouragement.

3. BE SPECIFIC. Do not say "your language could be improved." Say: "The sentence 'AI is very good and useful' is too vague for academic writing — it makes a claim without explaining what 'good' or 'useful' means, or for whom, or in what context."

4. QUOTE THE STUDENT'S WORDS when pointing out problems. This shows you have actually read their work.

5. SECOND-LANGUAGE CONTEXT: Acknowledge when errors are likely second-language patterns (e.g. omitted articles, subject-verb agreement) and name the specific pattern. Do not over-penalise these relative to conceptual weaknesses. BUT: second-language status does not excuse lack of engagement with the task, vague ideas, or informal register.

═══ WHAT TO LOOK FOR — LEVEL 1 AND 2 INDICATORS ═══

Flag these as Level 1 (needs significant development):
- Sentences fewer than 8 words that make assertions without any explanation ("AI is good." "Teachers need to know about this.")
- Ideas that are completely disconnected from the reading text
- No specific examples of any kind
- Informal conversational language throughout ("stuff", "things", "a lot", "like", "basically")
- Writing that simply restates the question rather than answering it
- Fewer than 3 distinct ideas in the entire submission

Flag these as Level 2 (below university standard):
- Addresses the task but with minimal engagement — 1-sentence answers where 3-4 sentences were asked for
- Vague generalisations with no specific examples ("AI can do many things in education")
- Informal register mixed with attempts at academic language
- Ideas present but underdeveloped — states a point without explaining it
- No reference to the reading material at all despite being asked to engage with it
- Run-on sentences OR very short choppy sentences only

═══ READING CONTEXT ═══
"${strippedText}…"

═══ WRITING TASK ═══
"${cfg.writingPrompt.substring(0, 350)}"

═══ STUDENT SUBMISSION ═══
"${text}"

═══ LEVEL RUBRIC ═══
Level 1 — Needs significant development: Fragmented, incomplete ideas, very limited vocabulary, does not meaningfully address the task. Cannot be submitted as university work in its current state.
Level 2 — Below university standard: Addresses the task minimally but uses informal language, lacks specificity and examples, shows limited engagement with the reading, has structural problems. Needs substantial revision.
Level 3 — Approaching university standard: Task addressed with partial success. Ideas present but underdeveloped. Errors and weaknesses exist but core thinking is visible. Revision would bring this to standard.
Level 4 — Meets university standard: Clearly addresses the task, appropriate academic register, includes specific examples or evidence, well-structured, largely error-free. Acceptable for submission.
Level 5 — Exceeds university standard: Analytically sophisticated, genuine critical thinking, evidence integrated fluently, precise academic language. Outstanding for a first-year student.

Respond ONLY with valid JSON — no markdown fences, no preamble, no trailing text:
{
  "level": <1, 2, 3, 4, or 5>,
  "content": "<2 sentences. Sentence 1: state directly and honestly whether they addressed the task — if they did not, say so. Sentence 2: name the specific content gap or strength, quoting their words if illustrating a problem.>",
  "language": "<2 sentences. Sentence 1: name specific grammatical or structural issues — if there are run-on sentences, name them; if sentences are too short and simplistic, say so; if subject-verb agreement is wrong, quote the example. Sentence 2: if there are no major issues, say so briefly. Do NOT say 'your language is clear and readable' if it is not.>",
  "register": "<2 sentences. Sentence 1: assess whether the register is appropriate for a university assignment — if they used informal language, QUOTE the specific phrase and name the problem. Sentence 2: suggest a more academic alternative for the most prominent informal expression.>",
  "priority": "<1–2 sentences. The single most important thing they must address. Begin with: 'The most urgent issue in this submission is...' Be specific. If they need to add examples, say what kind of example. If sentences need to be more complex, show them what that means.>",
  "example_correction": ${text.length > 40 ? `{
    "original": "<copy verbatim one sentence from their submission that most clearly illustrates the main problem>",
    "improved": "<rewrite that exact sentence at university standard — this should be a meaningful transformation, not a minor tweak>",
    "explanation": "<one sentence: name exactly what changed — e.g. 'Added a specific example, replaced vague adjective with a precise academic claim, and restructured as a compound sentence with a causal connector.'>"
  }` : 'null'},
  "originality_score": <integer 1–10. 10 = clearly personal, specific, authentic, contains details only a real human in their context would know. 1 = generic, impersonal, could have been written by anyone, no specific examples, implausibly well-structured for a first-year student with no errors. Signs of AI generation: perfect hedging, no comma splices or run-ons, every sentence a similar length, no personal references, ideas that are technically correct but feel like summaries rather than responses>,
  "originality_note": "<if score below 6: a direct but non-accusatory 2-sentence note. Do not say 'we think you used AI.' Say: 'Your writing does not yet show a personal voice — there are no specific examples from your own experience, and the phrasing is very general. Please add 2–3 sentences explaining your own thinking: what specifically surprised you, confused you, or connected to your real experience.'> <if score 6 or above: null>",
  "voice_challenge": <true if originality_score below 6, false otherwise>,
  "knowledge_gap_advice": "<if level is 1, 2, or 3: Provide 2 specific, actionable sentences identifying a foundational concept or skill they are missing and how to practice it. if level is 4 or 5: null>",
  "extension_reading": "<if level is 4 or 5: Provide a 1-sentence recommendation for a more challenging topic or specific type of reading they should tackle next to push their skills further. if level is 1, 2, or 3: null>"
}`;

  try {
    const raw = await _aiChat(systemPrompt, { maxTokens: 600 });
    const clean = raw.replace(/```json|```/g, '').trim();
    st.feedback = JSON.parse(clean);

    // Check for potential AI use and store detection result
    const baseline = getStudentBaselineProfile(cfg.unitId);
    const aiScore = scoreSubmissionForAI(text, baseline);
    st.aiDetection = aiScore;
  } catch (e) {
    // Honest fallback — does not pretend to have evaluated the writing
    st.feedback = {
      level: 3,
      content: 'Feedback could not be generated at this time — the AI service is unavailable. Please resubmit or check back shortly.',
      language: 'Unable to evaluate language at this time.',
      register: 'Unable to evaluate register at this time.',
      priority: 'Please resubmit your writing when the service is restored.',
      example_correction: null,
      originality_score: 7,
      originality_note: null,
      voice_challenge: false,
      knowledge_gap_advice: null,
      extension_reading: null
    };
  }

  if (window.STATE) {
    const unitId = cfg.unitId;
    if (!window.STATE.progress[unitId]) window.STATE.progress[unitId] = {};
    window.STATE.progress[unitId].readingComplete = true;
    window.STATE.progress[unitId].readingAiDetection = st.aiDetection || null;
    if (window.saveState) await _rtSyncToCloud(id, { immediate: true });
  }

  _rtPersist(id);

  _render(id);
};

window._rtSubmitVoiceChallenge = async (id) => {
  const ta = document.getElementById(`rt-vc-${id}`);
  const text = ta?.value?.trim() ?? '';
  if (text.length < 30) { alert('Please write a fuller reflection before submitting.'); return; }
  const st = window._rtState[id];
  if (st.feedback) {
    st.feedback.voice_challenge = false;
    st.feedback.originality_note = null;
    st.feedback.register += ` Your additional reflection shows personal thinking — this kind of specificity is exactly what university writing requires.`;
  }
  _rtPersist(id);
  await _rtSyncToCloud(id, { immediate: true });
  _render(id);
};

window._rtClearWork = (id) => {
  if (!confirm('Clear your saved response and feedback for this activity?')) return;
  const st = window._rtState[id];
  if (!st) return;

  st.answers = {};
  st.writing = '';
  st.feedback = null;
  st.survey = null;
  st.surveySubmittedAt = null;
  st.aiDetection = null;
  st.step = st.step === 'feedback' ? 'writing' : st.step;

  try { localStorage.removeItem(_rtStorageKey(id)); } catch { }
  const cfg = window._rtCfg[id] || {};
  if (cfg.unitId && window.STATE?.progress?.[cfg.unitId]?.readingTaskState) {
    delete window.STATE.progress[cfg.unitId].readingTaskState[id];
  }
  if (window._rtSaveTimers[id]) {
    clearTimeout(window._rtSaveTimers[id]);
    delete window._rtSaveTimers[id];
  }
  if (typeof window.saveState === 'function') {
    void window.saveState();
  }
  void _rtSyncDedicatedSubmission(id, { cleared: true });
  _render(id);
  const el = document.getElementById(`rt-save-${id}`);
  if (el) { el.textContent = 'Cleared'; el.style.color = 'var(--muted)'; }
};

// Download the reading as a PDF via the browser's print-to-PDF, using a
// clean reading-only document. No popup (avoids blockers / WebView limits):
// it injects a print root, isolates it with @media print rules, and prints.
window._rtDownloadReadingPdf = (id) => {
  const cfg = window._rtCfg[id];
  if (!cfg) return;

  const sourceLine = cfg.source ? `<div class="rt-print-source">Source: ${cfg.source}</div>` : '';
  const titleText = cfg.title || 'Reading';

  document.getElementById('rt-print-root')?.remove();
  const root = document.createElement('div');
  root.id = 'rt-print-root';
  root.innerHTML = `
    <article class="rt-print-doc">
      <header class="rt-print-head">
        <div class="rt-print-kicker">Academic Literacies${cfg.unitNum ? ` · Unit ${cfg.unitNum}` : ''} — Reading</div>
        <h1 class="rt-print-title">${titleText}</h1>
        ${sourceLine}
      </header>
      <div class="rt-print-body">${cfg.text || ''}</div>
    </article>`;
  document.body.appendChild(root);

  // Use the reading title as the default PDF filename.
  const prevTitle = document.title;
  document.title = titleText;
  document.body.classList.add('rt-printing');

  const cleanup = () => {
    document.body.classList.remove('rt-printing');
    document.title = prevTitle;
    document.getElementById('rt-print-root')?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  // Fallback cleanup in case afterprint never fires (some WebViews).
  setTimeout(() => { if (document.getElementById('rt-print-root')) cleanup(); }, 60000);

  window.print();
};

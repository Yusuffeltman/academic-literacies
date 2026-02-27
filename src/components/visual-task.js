// src/components/visual-task.js
// ─────────────────────────────────────────────
// Visual Literacy Task Component
// Presents a chart, graph, table, or infographic
// with guided analysis questions that students answer
// before receiving AI feedback on their visual reading.
//
// Usage:
//   import { visualTask } from '../src/components/visual-task.js';
//   // In unit html():
//   ${visualTask('vt-u5', VT_CONFIG)}
//   // After DOM injection:
//   initAllVisualTasks(); // called by app.js same as reading tasks
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';

window._vtCfg   = window._vtCfg   || {};
window._vtState = window._vtState || {};

// ── Public API ────────────────────────────────
export function visualTask(id, config) {
  window._vtCfg[id] = config;
  return `<div id="${id}" class="vt-container" aria-label="Visual Literacy Activity"></div>`;
}

export function initAllVisualTasks() {
  document.querySelectorAll('.vt-container:not([data-vt-ready])').forEach(el => {
    const cfg = window._vtCfg[el.id];
    if (!cfg) return;
    el.dataset.vtReady = '1';
    window._vtState[el.id] = { phase: 'observe', answers: {}, submitted: false };
    _vtRender(el.id);
  });
}

// ── Renderer ──────────────────────────────────
function _vtRender(id) {
  const el  = document.getElementById(id);
  const cfg = window._vtCfg[id];
  const st  = window._vtState[id];
  if (!el || !cfg) return;

  el.innerHTML = `
    <div class="vt-wrapper">
      <div class="vt-header">
        <div class="vt-header-icon">📊</div>
        <div>
          <div class="vt-header-label">Visual Literacy Activity</div>
          <div class="vt-header-title">${cfg.title}</div>
        </div>
      </div>

      <div class="vt-body">
        ${st.phase === 'observe' ? _vtObservePhase(id, cfg) : ''}
        ${st.phase === 'analyse' ? _vtAnalysePhase(id, cfg, st) : ''}
        ${st.phase === 'feedback' ? _vtFeedbackPhase(id, cfg, st) : ''}
      </div>
    </div>`;
}

// ── Phase 1: Observe ──────────────────────────
function _vtObservePhase(id, cfg) {
  return `
    <div class="vt-phase anim-fade">
      <div class="vt-observe-instruction">
        <div class="vt-obs-step">Step 1 of 3 — Observe</div>
        <p>${cfg.observePrompt || 'Study this visual carefully before answering. Look at the title, labels, scales, and any patterns you notice.'}</p>
      </div>

      <div class="vt-visual">
        ${cfg.visual}
      </div>

      <div class="vt-source">
        <span class="vt-source-label">Source</span>
        <span>${cfg.source}</span>
      </div>

      <div class="vt-observe-checklist">
        <div class="vt-cl-label">Before you continue, check that you have noticed:</div>
        ${cfg.observeChecklist.map((item, i) => `
          <label class="vt-cl-item">
            <input type="checkbox" id="vtcl-${id}-${i}" onchange="_vtCheckAllBoxes('${id}')">
            <span>${item}</span>
          </label>`).join('')}
      </div>

      <div class="vt-nav">
        <div class="vt-nav-hint" id="vt-obs-hint-${id}" style="font-size:13px;color:var(--muted);font-style:italic;">
          Tick all boxes above to continue.
        </div>
        <button class="vt-btn-primary" id="vt-obs-btn-${id}"
          style="opacity:.4;pointer-events:none;"
          onclick="_vtAdvance('${id}', 'analyse')">
          I have studied this visual →
        </button>
      </div>
    </div>`;
}

// ── Phase 2: Analyse ──────────────────────────
function _vtAnalysePhase(id, cfg, st) {
  return `
    <div class="vt-phase anim-fade">
      <div class="vt-observe-instruction">
        <div class="vt-obs-step">Step 2 of 3 — Analyse</div>
        <p>Answer each question about what you see. Write in complete sentences. Do not just name what you see — explain what it <em>means</em>.</p>
      </div>

      <div class="vt-visual vt-visual-compact">
        ${cfg.visual}
      </div>

      <div class="vt-questions">
        ${cfg.questions.map((q, i) => `
          <div class="vt-question-block">
            <label class="vt-q-label">Question ${i + 1}</label>
            <p class="vt-q-text">${q.q}</p>
            ${q.hint ? `<p class="vt-q-hint">💡 Hint: ${q.hint}</p>` : ''}
            <textarea id="vt-ans-${id}-${i}" class="vt-textarea" rows="3"
              placeholder="Write your answer here…"
              oninput="_vtSaveAnswer('${id}', ${i})">${st.answers[i] || ''}</textarea>
          </div>`).join('')}
      </div>

      <p id="vt-err-${id}" class="vt-err" style="display:none;">
        Please write at least one sentence in each answer box before submitting.
      </p>

      <div class="vt-nav">
        <button class="vt-btn-secondary" onclick="_vtAdvance('${id}', 'observe')">← Back to visual</button>
        <button class="vt-btn-primary" onclick="_vtSubmit('${id}')">Get feedback →</button>
      </div>
    </div>`;
}

// ── Phase 3: Feedback ─────────────────────────
function _vtFeedbackPhase(id, cfg, st) {
  if (!st.feedback) {
    return `
      <div class="vt-phase vt-loading">
        <div class="rt-spinner"></div>
        <p>Analysing your responses…</p>
      </div>`;
  }

  const fb = st.feedback;
  return `
    <div class="vt-phase anim-fade">
      <div class="vt-fb-header">
        <div class="vt-fb-icon">📈</div>
        <div>
          <div class="vt-fb-title">Visual Analysis Feedback</div>
          <div class="vt-fb-sub">${cfg.title}</div>
        </div>
      </div>

      <!-- Model answer reveal -->
      <div class="vt-model-grid">
        ${cfg.questions.map((q, i) => `
          <div class="vt-model-card">
            <div class="vt-model-q">${q.q}</div>
            <div class="vt-model-sections">
              <div class="vt-model-yours">
                <div class="vt-model-tag your-tag">Your answer</div>
                <p>${(st.answers[i] || '').replace(/\n/g, '<br>') || '<em>No answer provided</em>'}</p>
              </div>
              <div class="vt-model-expert">
                <div class="vt-model-tag expert-tag">Key insight</div>
                <p>${q.modelAnswer}</p>
              </div>
            </div>
          </div>`).join('')}
      </div>

      <!-- AI feedback -->
      <div class="vt-ai-feedback">
        <div class="vt-ai-fb-label">📋 Tutor Feedback on Your Visual Reading</div>
        <div class="vt-fb-grid">
          <div class="vt-fb-card">
            <div class="vt-fb-card-label">What you read accurately</div>
            <p>${fb.accurate}</p>
          </div>
          <div class="vt-fb-card">
            <div class="vt-fb-card-label">What you missed or misread</div>
            <p>${fb.missed}</p>
          </div>
          <div class="vt-fb-card vt-fb-develop">
            <div class="vt-fb-card-label">🎯 Critical thinking skill to develop</div>
            <p>${fb.develop}</p>
          </div>
          <div class="vt-fb-card vt-fb-tip">
            <div class="vt-fb-card-label">💡 Visual literacy tip for this type of chart</div>
            <p>${fb.tip}</p>
          </div>
        </div>
      </div>

      <div class="vt-nav" style="margin-top:20px;">
        <button class="vt-btn-secondary" onclick="_vtAdvance('${id}', 'analyse')">← Revise my answers</button>
        <div style="font-size:13px;color:var(--muted);align-self:center;">✅ Visual activity complete</div>
      </div>
    </div>`;
}

// ── Global handlers ───────────────────────────
window._vtCheckAllBoxes = (id) => {
  const cfg   = window._vtCfg[id];
  const all   = cfg.observeChecklist.every((_, i) =>
    document.getElementById(`vtcl-${id}-${i}`)?.checked
  );
  const btn   = document.getElementById(`vt-obs-btn-${id}`);
  const hint  = document.getElementById(`vt-obs-hint-${id}`);
  if (btn) {
    btn.style.opacity        = all ? '1' : '0.4';
    btn.style.pointerEvents  = all ? 'auto' : 'none';
  }
  if (hint) hint.style.display = all ? 'none' : 'block';
};

window._vtAdvance = (id, phase) => {
  window._vtState[id].phase = phase;
  _vtRender(id);
};

window._vtSaveAnswer = (id, i) => {
  const ta = document.getElementById(`vt-ans-${id}-${i}`);
  if (ta) window._vtState[id].answers[i] = ta.value;
};

window._vtSubmit = async (id) => {
  const cfg = window._vtCfg[id];
  const st  = window._vtState[id];
  const err = document.getElementById(`vt-err-${id}`);

  // Save all answers
  cfg.questions.forEach((_, i) => {
    const ta = document.getElementById(`vt-ans-${id}-${i}`);
    if (ta) st.answers[i] = ta.value;
  });

  // Validate
  const allFilled = cfg.questions.every((_, i) =>
    (st.answers[i] || '').trim().length >= 15
  );
  if (!allFilled) {
    if (err) err.style.display = 'block';
    return;
  }
  if (err) err.style.display = 'none';

  st.phase    = 'feedback';
  st.feedback = null;
  _vtRender(id);

  // Build prompt
  const qaSummary = cfg.questions.map((q, i) =>
    `Q${i+1}: "${q.q}"\nStudent answered: "${st.answers[i] || 'No answer'}"\nModel insight: "${q.modelAnswer}"`
  ).join('\n\n');

  const prompt = `You are an academic literacy tutor evaluating a first-year South African education student's visual literacy skills. They were asked to analyse this visual: "${cfg.title}" (${cfg.visualDescription}).

${qaSummary}

Give honest, specific feedback. Do NOT be sycophantic. If they missed something important, say so clearly.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "accurate": "<1-2 sentences on what they correctly identified or interpreted in the visual>",
  "missed": "<1-2 sentences on what they failed to notice, misread, or under-explained — be specific, quote their words if illustrating a problem. If they answered everything well, say so briefly.>",
  "develop": "<1 sentence identifying the most important visual literacy skill they need to practice — e.g. reading axis scales, identifying trends vs outliers, distinguishing correlation from causation>",
  "tip": "<1 practical tip specific to this type of visual (${cfg.chartType}) that will help them read similar visuals more accurately in future>"
}`;

  try {
    const raw   = await _aiChat(prompt, { maxTokens: 400 });
    st.feedback = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    st.feedback = {
      accurate: 'Your responses show engagement with the visual — you identified some key features.',
      missed:   'AI feedback is unavailable right now. Compare your answers with the model insights above.',
      develop:  'Practice reading the scale labels and units on every axis before drawing conclusions.',
      tip:      'Always ask: what does the title claim? Does the data actually support that claim?',
    };
  }

  _vtRender(id);
};

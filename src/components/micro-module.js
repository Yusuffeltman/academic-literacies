// src/components/micro-module.js
// ── Micro-module renderer and AI feedback loop ─

import { MICRO_MODULE_MAP } from '../../content/micro-modules/index.js';
import { _aiChat }          from '../ai.js';
import { recordSkillScore } from '../state.js';

let _activeModule = null; // track currently open module

// ── Entry point ───────────────────────────────
export function renderMicroModule(id) {
  _activeModule = MICRO_MODULE_MAP[id];
  if (!_activeModule) {
    console.warn(`Micro-module not found: ${id}`);
    return;
  }

  document.getElementById('app').innerHTML = `
    <div class="mm-view anim-fade">
      ${_activeModule.html()}
    </div>
  `;

  _bootModule();
}

// ── Boot interactivity ────────────────────────
function _bootModule() {
  // Back button
  document.getElementById('mm-back-btn')?.addEventListener('click', () => {
    if (window.renderStudentDashboard) window.renderStudentDashboard();
  });

  // Expose submit handler for inline onclick
  window._submitMicroModule = _handleSubmit;
}

// ── AI feedback loop ──────────────────────────
async function _handleSubmit() {
  const mod  = _activeModule;
  if (!mod) return;

  const ta   = document.getElementById('mm-practice-ta');
  const text = ta?.value?.trim() ?? '';

  if (text.length < 50) {
    _showError('Please write a fuller response before submitting (at least 50 characters).');
    return;
  }

  const btn = document.getElementById('mm-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Analysing…';

  try {
    const raw     = await _aiChat(mod.buildPrompt(text), {
      system:    mod.system,
      maxTokens: 400,
    });
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const data    = JSON.parse(cleaned);
    const score   = Math.min(mod.maxScore, Math.max(0, mod.parseScore(data)));

    // Record to adaptive engine
    recordSkillScore(mod.skill, score, mod.maxScore, 'micro_module', mod.id);

    _renderFeedback(data, score, mod.maxScore);
  } catch (err) {
    console.error('Micro-module feedback error:', err);
    btn.disabled    = false;
    btn.textContent = 'Get AI Feedback →';
    _showError('Something went wrong getting feedback. Please try again.');
  }
}

// ── Feedback renderer ─────────────────────────
function _renderFeedback(data, score, maxScore) {
  const pct      = Math.round((score / maxScore) * 100);
  const scoreColor = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 4 ? 'Strong' : score >= 3 ? 'Developing' : 'Needs work';

  const fb = document.getElementById('mm-feedback');
  fb.style.display = 'block';
  fb.innerHTML = `
    <h2>Your Feedback</h2>

    <div class="mm-score-row">
      <div class="mm-score-circle" style="border-color:${scoreColor}">
        <div class="mm-score-num" style="color:${scoreColor}">${score}</div>
        <div class="mm-score-denom">/ ${maxScore}</div>
      </div>
      <div class="mm-score-meta">
        <div class="mm-score-label" style="color:${scoreColor}">${scoreLabel}</div>
        <div class="mm-score-bar-bg">
          <div class="mm-score-bar-fill" style="width:${pct}%; background:${scoreColor}"></div>
        </div>
        <div class="mm-score-sub">Score recorded · your skill profile has been updated</div>
      </div>
    </div>

    <div class="mm-fb-grid">
      ${data.strengths ? `
        <div class="mm-fb-card mm-fb-good">
          <div class="mm-fb-card-label">✓ What worked well</div>
          <p>${data.strengths}</p>
        </div>` : ''}
      ${data.improve ? `
        <div class="mm-fb-card mm-fb-improve">
          <div class="mm-fb-card-label">→ One thing to improve</div>
          <p>${data.improve}</p>
        </div>` : ''}
    </div>

    ${data.example ? `
      <div class="mm-fb-example">
        <div class="mm-fb-card-label">💡 Improved example</div>
        <p>${data.example}</p>
      </div>` : ''}

    <div class="mm-fb-actions">
      <button class="mm-retry-btn" onclick="window._retryMicroModule()">Try Again</button>
      <button class="mm-done-btn" onclick="window.renderStudentDashboard?.()">← Back to Dashboard</button>
    </div>
  `;

  fb.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Expose retry
  window._retryMicroModule = () => {
    fb.style.display = 'none';
    const ta  = document.getElementById('mm-practice-ta');
    const btn = document.getElementById('mm-submit-btn');
    if (ta)  ta.value           = '';
    if (btn) { btn.disabled = false; btn.textContent = 'Get AI Feedback →'; }
    document.getElementById('mm-practice-ta')?.focus();
    document.querySelector('.mm-task-box')?.scrollIntoView({ behavior: 'smooth' });
  };
}

// ── Error helper ──────────────────────────────
function _showError(msg) {
  const existing = document.getElementById('mm-error-msg');
  if (existing) existing.remove();
  const el = document.createElement('p');
  el.id        = 'mm-error-msg';
  el.className = 'mm-error';
  el.textContent = msg;
  document.getElementById('mm-submit-btn')?.insertAdjacentElement('afterend', el);
}

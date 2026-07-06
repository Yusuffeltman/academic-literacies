// src/components/lesson-measure.js
// ─────────────────────────────────────────────
// End-of-lesson measurement panel for the presentation A/B (test units only).
// A short, ungraded comprehension check (primary outcome) plus a one-item
// Paas mental-effort rating (subjective load). On submit it scores, records,
// and emits the lesson_completed event via the measurement module.
//
// Formative and confidential (responses used only in aggregate; stored
// pseudonymously) — see the equity section of
// docs/lesson-presentation-redesign-spec.md.
// ─────────────────────────────────────────────

import { STATE } from '../state.js';
import { getComprehensionItems } from '../lesson-experiment.js';
import { scoreAnswers, recordComprehension, recordEffort, completeLesson } from '../lesson-measurement.js';

const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderLessonMeasurePanel(unitId) {
  const items = getComprehensionItems(unitId);
  if (!items || !items.length) return '';

  const questions = items.map((it, qi) => `
    <div class="lm-q" data-q="${qi}">
      <div class="lm-q-text">${qi + 1}. ${_esc(it.q)}</div>
      <div class="lm-options">
        ${it.options.map((opt, oi) => `
          <label class="lm-opt">
            <input type="radio" name="lm-${unitId}-q${qi}" value="${oi}" />
            <span>${_esc(opt)}</span>
          </label>`).join('')}
      </div>
    </div>`).join('');

  return `
    <div class="lesson-measure" id="lm-${unitId}" data-unit="${unitId}">
      <div class="lm-head">
        <div class="lm-kicker">Quick check</div>
        <h2 class="lm-title">Before you move on</h2>
        <p class="lm-note">A few quick questions to help us improve how this unit is presented. Your answers are <strong>not graded</strong> and are used <strong>only in aggregate</strong> — answer honestly.</p>
      </div>

      <div class="lm-section">${questions}</div>

      <div class="lm-section lm-effort">
        <div class="lm-q-text">How much mental effort did working through this unit take?</div>
        <div class="lm-scale">
          <span>Very low</span>
          <input type="range" id="lm-effort-${unitId}" min="1" max="9" step="1" value="5"
            oninput="document.getElementById('lm-effort-val-${unitId}').textContent=this.value" />
          <span>Very high</span>
        </div>
        <div class="lm-effort-readout">Effort: <strong id="lm-effort-val-${unitId}">5</strong> / 9</div>
      </div>

      <p id="lm-err-${unitId}" class="lm-err" style="display:none;">Please answer every question before submitting.</p>
      <button type="button" class="lm-submit" onclick="window._submitLessonMeasure('${unitId}')">Submit &amp; finish unit</button>
    </div>`;
}

window._submitLessonMeasure = function (unitId) {
  const items = getComprehensionItems(unitId) || [];
  const selected = [];
  for (let qi = 0; qi < items.length; qi++) {
    const checked = document.querySelector(`input[name="lm-${unitId}-q${qi}"]:checked`);
    selected[qi] = checked ? Number(checked.value) : null;
  }
  const allAnswered = selected.length === items.length && selected.every((v) => v != null);
  const err = document.getElementById(`lm-err-${unitId}`);
  if (!allAnswered) { if (err) err.style.display = 'block'; return; }
  if (err) err.style.display = 'none';

  const key = items.map((it) => it.answer);
  const { score, max } = scoreAnswers(selected, key);
  recordComprehension(unitId, score, max);

  const effort = Number(document.getElementById(`lm-effort-${unitId}`)?.value || 0) || null;
  recordEffort(unitId, effort);

  completeLesson(unitId, { user: STATE.user });

  const panel = document.getElementById(`lm-${unitId}`);
  if (panel) {
    panel.innerHTML = `
      <div class="lm-head">
        <div class="lm-kicker">Thank you</div>
        <h2 class="lm-title">Response recorded</h2>
        <p class="lm-note">Thanks — your feedback helps us improve this unit. You can continue to the next unit.</p>
      </div>`;
  }
};

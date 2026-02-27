// src/components/assessment-task.js
// ─────────────────────────────────────────────
// Assessment Task Component
// Renders a 2-week major task with:
//   - Real-world context + brief
//   - Jigsaw collaboration protocol
//   - Week-by-week milestone tracker
//   - Group contribution panel (reads from Firebase)
//   - Individual submission checklist + self-assessment
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';

window._atState = window._atState || {};

// ── Public render function ────────────────────
export function assessmentTask(cfg) {
  // Initialise state if not present
  if (!window._atState[cfg.id]) {
    window._atState[cfg.id] = {
      milestones:  {},           // {milestoneId: checked}
      checklist:   {},           // {checkId: checked}
      selfScore:   null,
      reflection:  '',
      submitted:   false,
    };
  }
  return `<div id="at-${cfg.id}" class="at-container"></div>`;
}

export function initAllAssessmentTasks() {
  document.querySelectorAll('.at-container:not([data-at-ready])').forEach(el => {
    const id  = el.id.replace('at-', '');
    const cfg = window._atConfigs?.[id];
    if (!cfg) return;
    el.dataset.atReady = '1';
    _atRender(id);
  });
}

// Register config globally so it persists after navigation
export function registerAssessment(cfg) {
  window._atConfigs = window._atConfigs || {};
  window._atConfigs[cfg.id] = cfg;
}

// ── Main renderer ─────────────────────────────
function _atRender(id) {
  const el  = document.getElementById(`at-${id}`);
  const cfg = window._atConfigs[id];
  const st  = window._atState[id];
  if (!el || !cfg) return;

  const totalMilestones = cfg.weeks.flatMap(w => w.milestones).length;
  const doneMilestones  = Object.values(st.milestones).filter(Boolean).length;
  const pct             = Math.round((doneMilestones / totalMilestones) * 100);

  el.innerHTML = `
    <div class="at-wrapper">

      ${_atHero(cfg)}
      ${_atContext(cfg)}
      ${_atCollab(cfg)}
      ${_atProgress(id, cfg, st, pct)}
      ${_atWeeks(id, cfg, st)}
      ${_atContributions(id, cfg)}
      ${_atSubmission(id, cfg, st)}

    </div>`;

  // Re-attach any saved checkbox states
  Object.entries(st.milestones).forEach(([mid, val]) => {
    const cb = document.getElementById(`at-ms-${id}-${mid}`);
    if (cb) cb.checked = val;
  });
  Object.entries(st.checklist).forEach(([cid, val]) => {
    const cb = document.getElementById(`at-cl-${id}-${cid}`);
    if (cb) cb.checked = val;
  });

  _atUpdateProgress(id);
}

// ── Sections ──────────────────────────────────
function _atHero(cfg) {
  return `
    <div class="at-hero" style="background:${cfg.color};">
      <div class="at-hero-left">
        <div class="at-hero-badge">${cfg.badge}</div>
        <h1 class="at-hero-title">${cfg.title}</h1>
        <p class="at-hero-sub">${cfg.subtitle}</p>
        <div class="at-hero-tags">
          <span class="at-tag">⏱ 2 weeks</span>
          <span class="at-tag">👥 Collaborative + Individual</span>
          <span class="at-tag">📋 ${cfg.marks} marks</span>
          ${cfg.skills.map(s => `<span class="at-tag skill">${s}</span>`).join('')}
        </div>
      </div>
      <div class="at-hero-icon">${cfg.icon}</div>
    </div>`;
}

function _atContext(cfg) {
  return `
    <div class="at-section">
      <div class="at-section-label">Real-World Context</div>
      <div class="at-context-box">
        <div class="at-context-scenario">${cfg.scenario}</div>
        <div class="at-context-brief">
          <div class="at-brief-label">Your Brief</div>
          <p>${cfg.brief}</p>
        </div>
        <div class="at-context-product">
          <div class="at-brief-label">What You Will Produce</div>
          <ul>${cfg.products.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;
}

function _atCollab(cfg) {
  const c = cfg.collaboration;
  return `
    <div class="at-section">
      <div class="at-section-label">Collaboration Protocol — ${c.type}</div>
      <div class="at-collab-box">
        <div class="at-collab-mechanic">
          <div class="at-collab-icon">${c.icon}</div>
          <div>
            <div class="at-collab-name">${c.name}</div>
            <p class="at-collab-how">${c.how}</p>
          </div>
        </div>
        <div class="at-collab-why">
          <div class="at-collab-why-label">🔗 Why this is interdependent</div>
          <p>${c.interdependence}</p>
        </div>
        <div class="at-roles-grid">
          ${c.roles.map((r, i) => `
            <div class="at-role-card ${r.isYours ? 'at-role-yours' : ''}">
              <div class="at-role-num">Role ${i + 1}</div>
              <div class="at-role-title">${r.icon} ${r.title}</div>
              <p class="at-role-desc">${r.description}</p>
              <div class="at-role-contributes">Contributes: <strong>${r.contributes}</strong></div>
              ${r.isYours ? '<div class="at-role-badge-yours">← Your role (confirm with lecturer)</div>' : ''}
            </div>`).join('')}
        </div>
        <div class="at-collab-note">
          <strong>📌 Note to students:</strong> Your lecturer will assign you to a group and confirm your role.
          Each group should have one student per role. Do not duplicate roles in a group.
        </div>
      </div>
    </div>`;
}

function _atProgress(id, cfg, st, pct) {
  return `
    <div class="at-section">
      <div class="at-section-label">Your Progress</div>
      <div class="at-progress-row">
        <div class="at-progress-bar-bg">
          <div class="at-progress-bar-fill" id="at-prog-fill-${id}" style="width:${pct}%;"></div>
        </div>
        <div class="at-progress-pct" id="at-prog-pct-${id}">${pct}%</div>
      </div>
    </div>`;
}

function _atWeeks(id, cfg, st) {
  return cfg.weeks.map((week, wi) => `
    <div class="at-week">
      <div class="at-week-header">
        <div class="at-week-num">Week ${wi + 1}</div>
        <div class="at-week-title">${week.title}</div>
        <div class="at-week-focus">${week.focus}</div>
      </div>
      <div class="at-week-body">
        ${week.milestones.map((m, mi) => {
          const msId = `w${wi}m${mi}`;
          const done = st.milestones[msId] || false;
          return `
            <div class="at-milestone ${done ? 'at-ms-done' : ''}">
              <label class="at-ms-label">
                <input type="checkbox" id="at-ms-${id}-${msId}" ${done ? 'checked' : ''}
                  onchange="_atToggleMilestone('${id}','${msId}',this.checked)">
                <div class="at-ms-content">
                  <div class="at-ms-day">Day ${m.day}${m.dayEnd ? '–' + m.dayEnd : ''}</div>
                  <div class="at-ms-title">${m.title}</div>
                  <p class="at-ms-desc">${m.desc}</p>
                  ${m.tools ? `<div class="at-ms-tools">${m.tools.map(t => `<span class="at-tool">${t}</span>`).join('')}</div>` : ''}
                  ${m.tip  ? `<div class="at-ms-tip">💡 ${m.tip}</div>` : ''}
                </div>
              </label>
            </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function _atContributions(id, cfg) {
  return `
    <div class="at-section">
      <div class="at-section-label">Group Contributions Panel</div>
      <div class="at-contrib-box">
        <p class="at-contrib-intro">${cfg.collaboration.groupPanelNote}</p>
        <div class="at-contrib-slots">
          ${cfg.collaboration.roles.map(r => `
            <div class="at-contrib-slot">
              <div class="at-contrib-role">${r.icon} ${r.title}</div>
              <div class="at-contrib-expects">Expects: ${r.contributes}</div>
              <div class="at-contrib-placeholder">
                <span class="at-placeholder-icon">⏳</span>
                Waiting for your group member's contribution
              </div>
            </div>`).join('')}
        </div>
        <div class="at-collab-note" style="margin-top:16px;">
          In the full deployment, this panel shows your group members' submitted contributions in real time
          via the shared Firebase database. Your lecturer can also post example contributions here.
        </div>
      </div>
    </div>`;
}

function _atSubmission(id, cfg, st) {
  const allChecked = cfg.checklist.every((_, i) => st.checklist[i] || false);

  return `
    <div class="at-section">
      <div class="at-section-label">Individual Submission Checklist</div>
      <div class="at-checklist-box">
        <p style="font-size:14px;color:var(--muted);margin-bottom:18px;">
          Tick each item only when you have genuinely completed it.
          You cannot submit until all items are checked.
        </p>
        ${cfg.checklist.map((item, i) => {
          const done = st.checklist[i] || false;
          return `
            <label class="at-cl-item ${done ? 'at-cl-done' : ''}">
              <input type="checkbox" id="at-cl-${id}-${i}" ${done ? 'checked' : ''}
                onchange="_atToggleChecklist('${id}',${i},this.checked)">
              <div class="at-cl-content">
                <div class="at-cl-title">${item.title}</div>
                <p class="at-cl-detail">${item.detail}</p>
              </div>
            </label>`;
        }).join('')}
      </div>

      <div class="at-section-label" style="margin-top:32px;">Self-Assessment</div>
      <div class="at-self-assess">
        <p>Before submitting, rate your work honestly against the assessment criteria below.</p>
        <div class="at-rubric">
          ${cfg.rubric.map(r => `
            <div class="at-rubric-row">
              <div class="at-rubric-criterion">${r.criterion}</div>
              <div class="at-rubric-levels">
                ${r.levels.map((lv, li) => `
                  <div class="at-rubric-cell">
                    <div class="at-rubric-mark">${lv.mark}</div>
                    <div class="at-rubric-desc">${lv.desc}</div>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>

        <div class="at-self-score">
          <div class="at-self-score-label">Your estimated mark (honest self-assessment):</div>
          <input type="number" id="at-ss-${id}" min="0" max="${cfg.marks}"
            value="${st.selfScore || ''}"
            placeholder="e.g. 68" class="at-score-input"
            oninput="_atSaveScore('${id}',this.value)">
          <span style="font-size:13px;color:var(--muted);">/ ${cfg.marks}</span>
        </div>

        <div class="at-reflection-box">
          <label for="at-refl-${id}" class="at-refl-label">
            Reflection: What is the strongest aspect of your submission — and what would you strengthen with more time? (2–3 sentences)
          </label>
          <textarea id="at-refl-${id}" class="at-refl-ta" rows="4"
            placeholder="Write honestly…"
            oninput="_atSaveReflection('${id}',this.value)">${st.reflection}</textarea>
        </div>

        <div class="at-submit-row">
          <button class="at-submit-btn ${allChecked ? '' : 'at-submit-disabled'}"
            id="at-submit-${id}"
            onclick="_atFinalSubmit('${id}')"
            ${allChecked ? '' : 'disabled'}>
            ${st.submitted ? '✅ Submitted' : `Submit ${cfg.badge}`}
          </button>
          ${!allChecked ? `<span class="at-submit-hint">Complete the checklist above to unlock submission.</span>` : ''}
          ${st.submitted ? `<span class="at-submitted-note">Submitted on ${st.submittedAt || 'record'} — your lecturer can view this.</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Global handlers ───────────────────────────
window._atToggleMilestone = (id, msId, val) => {
  window._atState[id].milestones[msId] = val;
  _atUpdateProgress(id);
  _atSaveToFirebase(id);
};

window._atToggleChecklist = (id, i, val) => {
  window._atState[id].checklist[i] = val;
  _atCheckSubmitUnlock(id);
  _atSaveToFirebase(id);
};

window._atSaveScore = (id, val) => {
  window._atState[id].selfScore = parseInt(val) || null;
};

window._atSaveReflection = (id, val) => {
  window._atState[id].reflection = val;
};

window._atFinalSubmit = async (id) => {
  const cfg = window._atConfigs[id];
  const st  = window._atState[id];
  const btn = document.getElementById(`at-submit-${id}`);

  if (!cfg.checklist.every((_, i) => st.checklist[i])) return;

  btn.textContent = 'Submitting…';
  btn.disabled    = true;

  st.submitted   = true;
  st.submittedAt = new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });

  await _atSaveToFirebase(id);

  if (window.STATE?.progress) {
    if (!window.STATE.progress[cfg.unitId]) window.STATE.progress[cfg.unitId] = {};
    window.STATE.progress[cfg.unitId].readingComplete = true;
    window.STATE.progress[cfg.unitId].assessmentSubmitted = true;
    if (window.saveState) window.saveState();
  }

  _atRender(id);
};

function _atUpdateProgress(id) {
  const cfg = window._atConfigs[id];
  const st  = window._atState[id];
  const total = cfg.weeks.flatMap(w => w.milestones).length;
  const done  = Object.values(st.milestones).filter(Boolean).length;
  const pct   = Math.round((done / total) * 100);

  const fill = document.getElementById(`at-prog-fill-${id}`);
  const pctEl = document.getElementById(`at-prog-pct-${id}`);
  if (fill)  fill.style.width   = pct + '%';
  if (pctEl) pctEl.textContent  = pct + '%';
}

function _atCheckSubmitUnlock(id) {
  const cfg = window._atConfigs[id];
  const st  = window._atState[id];
  const all = cfg.checklist.every((_, i) => st.checklist[i] || false);
  const btn = document.getElementById(`at-submit-${id}`);
  const hint = btn?.nextElementSibling;
  if (btn) {
    btn.disabled = !all;
    btn.classList.toggle('at-submit-disabled', !all);
  }
  if (hint && hint.classList.contains('at-submit-hint')) {
    hint.style.display = all ? 'none' : '';
  }
}

async function _atSaveToFirebase(id) {
  try {
    if (window.STATE && window.saveState) {
      if (!window.STATE.assessments) window.STATE.assessments = {};
      window.STATE.assessments[id] = window._atState[id];
      await window.saveState();
    }
  } catch { /* non-critical */ }
}

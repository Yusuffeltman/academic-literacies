// src/dashboards/tutor.js
// ─────────────────────────────────────────────
// Tutor Dashboard — Tutorial Session Plans (45 min)
// Visible to users with role [tutor]
// Mirrors lecturer.js but surfaces tutorial sessions only.
// ─────────────────────────────────────────────
import { SESSIONS, SESSION_META } from '../../content/sessions/sessions.js';
import { renderSessionPlan }      from '../components/session-plan.js';

export function renderTutorDashboard(container) {
  container.innerHTML = `
    <div class="dash-wrapper">
      ${_buildSidebar()}
      <div class="dash-content" id="dash-content">
        ${_buildWelcome()}
      </div>
    </div>`;

  document.querySelectorAll('.dash-nav-item[data-session]').forEach(el => {
    el.addEventListener('click', () => {
      const sid = el.dataset.session;
      _loadSession(sid);
      document.querySelectorAll('.dash-nav-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
    });
  });

  window._dashLoadSession = _loadSession;
}

function _buildSidebar() {
  const meta = SESSION_META.tutorial;

  const phases = [
    { label: 'Phase 1 — Units 1–3',    items: meta.slice(0, 3) },
    { label: 'Phase 2a — Units 4–6',   items: meta.slice(3, 6) },
    { label: 'Phase 2b — Units 7–9',   items: meta.slice(6, 9) },
    { label: 'Phase 3a — Units 10–12', items: meta.slice(9, 12) },
    { label: 'Phase 3b — Units 13–15', items: meta.slice(12, 15) },
    { label: 'Phase 4 — Units 16–18',  items: meta.slice(15, 18) },
    { label: 'Phase 5 — Units 19–20',  items: meta.slice(18, 20) },
  ];

  return `
    <aside class="dash-sidebar">
      <div class="dash-sidebar-header">
        <div class="dash-role-badge tutor-badge">👥 Tutor</div>
        <div class="dash-sidebar-title">Tutorial Sessions</div>
        <div class="dash-sidebar-sub">45 minutes · Targeted support</div>
      </div>

      <div class="dash-session-type-bar">
        <span class="dst-active">Tutorial (45 min)</span>
      </div>

      ${phases.map(ph => `
        <div class="dash-phase-group">
          <div class="dash-phase-label">${ph.label}</div>
          ${ph.items.map(m => `
            <div class="dash-nav-item" data-session="${m.id}">
              <div class="dash-nav-id tutorial-id">${m.id.toUpperCase()}</div>
              <div class="dash-nav-label">${m.label.replace(/^T\d+ — /, '')}</div>
            </div>`).join('')}
        </div>`).join('')}

      <div class="dash-sidebar-footer">
        <div class="dash-quick-tools">
          <div class="dash-qt-label">Quick Tools</div>
          <button class="dash-qt-btn" onclick="_fullPomodoro()">🍅 Group Timer</button>
          <button class="dash-qt-btn" onclick="_randomiser()">🎲 Cold Call</button>
          <button class="dash-qt-btn" onclick="_printSession()">🖨️ Print Plan</button>
          <button class="dash-qt-btn" onclick="_diagnosticBuilder()">📊 Diagnostic</button>
        </div>
      </div>
    </aside>`;
}

function _loadSession(sid) {
  const session = SESSIONS[sid];
  if (!session) return;
  const content = document.getElementById('dash-content');
  if (!content) return;
  content.innerHTML = `<div id="sp-mount-${sid}"></div>`;
  renderSessionPlan(session, `sp-mount-${sid}`);
  content.scrollTop = 0;
}

function _buildWelcome() {
  return `
    <div class="dash-welcome">
      <div class="dash-welcome-icon">👥</div>
      <h1 class="dash-welcome-title">Tutorial Session Planner</h1>
      <p class="dash-welcome-sub">
        Select a session from the left to view the full 45-minute tutorial plan.
        Every session assumes students have done their module pre-work — your role is to deepen, diagnose, and build.
      </p>
      <div class="dash-welcome-cards">
        <div class="dash-wc">
          <div class="dash-wc-icon">🔬</div>
          <div class="dash-wc-title">Diagnostic First</div>
          <p>Every tutorial opens with a quick diagnostic check — where are students actually stuck? Spend your 45 minutes where they need it most.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🔧</div>
          <div class="dash-wc-title">Artefact Workshops</div>
          <p>Most sessions include a live artefact workshop — students work on a real assignment component with immediate feedback loops.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">✍️</div>
          <div class="dash-wc-title">Process Writing</div>
          <p>Tutorials often focus on one stage of the process writing cycle: pre-writing, structural drafting, or targeted revision. Never all stages at once.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🍅</div>
          <div class="dash-wc-title">Timed Micro-Writes</div>
          <p>Short Pomodoro blocks (10–15 min) give students a defined window to produce. The constraint drives focus better than open-ended time.</p>
        </div>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:14px;margin-top:24px;">← Select a tutorial from the sidebar to begin</p>
    </div>`;
}

// ── Quick tools ───────────────────────────────
window._diagnosticBuilder = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pom-fullscreen';
  overlay.innerHTML = `
    <div class="pom-fs-inner" style="max-width:500px;text-align:left;">
      <div class="pom-fs-title" style="margin-bottom:16px;">📊 Quick Diagnostic</div>
      <p style="font-size:14px;opacity:.8;margin-bottom:16px;">Ask students to rate themselves 1–5 on three things:</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        <div class="diag-item">1. I understand this week's key concept</div>
        <div class="diag-item">2. I can apply it to my own writing</div>
        <div class="diag-item">3. I know exactly where I'm stuck</div>
      </div>
      <p style="font-size:13px;opacity:.7;">Collect by hands or a quick whiteboard tally. Anyone scoring 1–2 on item 3 is your priority group today.</p>
      <button onclick="this.closest('.pom-fullscreen').remove()" 
        style="margin-top:20px;background:var(--amber);color:var(--navy);border:none;border-radius:30px;padding:10px 24px;font-weight:700;cursor:pointer;font-size:14px;">
        Close
      </button>
    </div>`;
  document.body.appendChild(overlay);
};

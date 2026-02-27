// src/dashboards/student.js
import { STATE } from '../state.js';
import { UNITS } from '../../content/units/index.js';
import { DASHBOARD_CONTENT } from '../../content/dashboard.js';
import { getCoordinatorRecommendation } from '../ai.js';

// ── Skill display config ──────────────────────
const SKILL_LABELS = {
  critical_reading:   'Critical Reading',
  evidence_use:       'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone:      'Academic Tone',
  source_evaluation:  'Source Evaluation',
  citation_practice:  'Citation & Integrity',
  research_skills:    'Research Skills',
  ai_literacy:        'AI Literacy',
};

const SKILL_ICONS = {
  critical_reading:   '📖',
  evidence_use:       '🔬',
  argument_structure: '🗺',
  academic_tone:      '✍',
  source_evaluation:  '🔍',
  citation_practice:  '📎',
  research_skills:    '🔭',
  ai_literacy:        '🤖',
};

const STATUS_CONFIG = {
  untested:   { label: 'Not yet assessed', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'transparent' },
  weak:       { label: 'Needs work',       color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  developing: { label: 'Developing',       color: '#f59e0b', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  strong:     { label: 'Strong',           color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)' },
};

const REC_TYPE_CONFIG = {
  remediate: { icon: '⚠',  borderColor: '#f59e0b', bg: 'rgba(251,191,36,0.08)',    btnBg: '#f59e0b', btnColor: '#0f172a' },
  continue:  { icon: '▶',  borderColor: '#6366f1', bg: 'rgba(99,102,241,0.06)',    btnBg: '#6366f1', btnColor: '#fff'    },
  extend:    { icon: '✦',  borderColor: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',    btnBg: '#8b5cf6', btnColor: '#fff'    },
  intervene: { icon: '🔔', borderColor: '#ef4444', bg: 'rgba(239,68,68,0.06)',     btnBg: '#ef4444', btnColor: '#fff'    },
  celebrate: { icon: '🏆', borderColor: '#fbbf24', bg: 'rgba(251,191,36,0.1)',     btnBg: '#fbbf24', btnColor: '#0f172a' },
};

// Set of known micro-module ids — these open the full micro-module page
const MICRO_MODULE_IDS = new Set([
  'evidence-booster', 'argument-builder', 'tone-workshop',
  'source-skills', 'citation-guide', 'reading-strategies',
]);

const MODULE_LABELS = {
  'evidence-booster':   'Evidence Booster',
  'argument-builder':   'Argument Builder',
  'tone-workshop':      'Tone Workshop',
  'source-skills':      'Source Skills',
  'citation-guide':     'Citation Guide',
  'reading-strategies': 'Reading Strategies',
};

// ── Main render ───────────────────────────────
export function renderStudentDashboard() {
  const user      = STATE.user;
  const name      = user.displayName?.split(' [')[0] ?? user.email;
  const firstName = name.split(' ')[0];
  const adaptive  = STATE.adaptive;

  const visitedCount = Object.values(STATE.progress).filter(p => p.visited).length;
  const progressPct  = Math.round((visitedCount / UNITS.length) * 100);

  document.getElementById('app').innerHTML = `
    <div class="student-dash anim-fade">

      <div class="student-dash-topbar">
        <div class="student-dash-logo">ACADLIT · AI</div>
        <div class="user-pill">
          <div class="user-avatar">${name[0].toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${name}</div>
            <div class="user-role">Student</div>
          </div>
          <button class="btn-signout" onclick="appSignOut()">Sign Out</button>
        </div>
      </div>

      <main class="student-dash-main">

        <div class="student-dash-header">
          <h1>Welcome back, ${firstName}</h1>
          <p>ALE00Y1 — Academic Literacies in the Age of AI</p>
        </div>

        <!-- Recommendation card — loads async -->
        <div id="rec-card" class="rec-card rec-card--loading">
          <div class="rec-loading-row">
            <div class="rec-spinner"></div>
            <span>Personalising your learning path…</span>
          </div>
        </div>

        <!-- Skill map -->
        <section class="dash-section">
          <h2 class="dash-section-heading">Your Skill Profile</h2>
          <div class="skill-map-grid">
            ${renderSkillMap(adaptive)}
          </div>
        </section>

        <!-- Standard info grid -->
        <div class="student-dash-grid">

          <div class="dash-card">
            <div class="dash-card-header"><h3>📢 Announcements</h3></div>
            <div class="dash-card-body">
              ${DASHBOARD_CONTENT.announcements.map(a => `
                <div class="info-item">
                  <div class="info-icon">${a.icon}</div>
                  <div><h4>${a.title}</h4><p>${a.content}</p></div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-header"><h3>💡 Reminders & Key Info</h3></div>
            <div class="dash-card-body">
              ${DASHBOARD_CONTENT.reminders.map(r => `
                <div class="info-item">
                  <div class="info-icon">${r.icon}</div>
                  <div><h4>${r.title}</h4><p>${r.content}</p></div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-header"><h3>📊 Your Progress</h3></div>
            <div class="dash-card-body">
              <div class="prog-container" style="padding:0;border:none;">
                <div class="prog-label">
                  <span>Course Progress</span>
                  <span>${progressPct}%</span>
                </div>
                <div class="prog-bar-bg">
                  <div class="prog-bar-fill" style="width:${progressPct}%;"></div>
                </div>
              </div>
              <p style="font-size:14px;color:var(--muted);margin-top:16px;">
                You have visited ${visitedCount} of ${UNITS.length} units.
              </p>
              <button class="btn-primary" onclick="window.goToCourse()">Start Learning →</button>
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-header"><h3>📅 Attendance</h3></div>
            <div class="dash-card-body">
              <p style="font-size:14px;color:var(--muted);">
                Attendance tracking will be enabled once contact sessions begin.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  `;

  // Populate recommendation card after render
  _loadRecommendation();
}

// ── Skill map renderer ────────────────────────
function renderSkillMap(adaptive) {
  return Object.entries(SKILL_LABELS).map(([skillId, label]) => {
    const status   = adaptive?.skill_status?.[skillId] || 'untested';
    const entries  = adaptive?.skill_scores?.[skillId] || [];
    const cfg      = STATUS_CONFIG[status];
    const needsFocus = (adaptive?.needs_remediation || []).includes(skillId);

    const recentScores = entries.slice(-3).map(e => e.score);
    const avg = recentScores.length
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length * 10) / 10
      : 0;
    const barPct = Math.round((avg / 5) * 100);

    return `
      <div class="skill-card ${needsFocus ? 'skill-card--focus' : ''}"
           style="border-left: 3px solid ${cfg.border}; background: ${cfg.bg}">
        <div class="skill-card-top">
          <span class="skill-card-icon">${SKILL_ICONS[skillId]}</span>
          <span class="skill-card-name">${label}</span>
          ${needsFocus ? '<span class="skill-focus-tag">⚠ Focus area</span>' : ''}
        </div>
        <span class="skill-badge" style="color:${cfg.color}; background:rgba(0,0,0,0.04)">
          ${cfg.label}
        </span>
        ${entries.length >= 2 ? `
          <div class="skill-bar-bg">
            <div class="skill-bar-fill" style="width:${barPct}%; background:${cfg.color}"></div>
          </div>
          <span class="skill-count">${avg}/5 · ${entries.length} interaction${entries.length !== 1 ? 's' : ''}</span>
        ` : `
          <span class="skill-count">Use the AI tools to assess this skill</span>
        `}
      </div>`;
  }).join('');
}

// ── Recommendation card async loader ─────────
async function _loadRecommendation() {
  const card = document.getElementById('rec-card');
  if (!card) return;

  try {
    const rec = await getCoordinatorRecommendation();
    if (!rec) { card.style.display = 'none'; return; }

    const cfg = REC_TYPE_CONFIG[rec.type] || REC_TYPE_CONFIG.continue;

    // Build action button
    let btnHtml = '';
    if (rec.action_label) {
      const target  = rec.action_target;
      const toolLbl = target ? (MODULE_LABELS[target] ?? target) : null;

      if (target && MICRO_MODULE_IDS.has(target)) {
        // Opens the full micro-module page
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToMicroModule('${target}')">
          ${rec.action_label} — ${toolLbl}
        </button>`;
      } else if (target === 'study_buddy' || target === 'ai_tutor') {
        // Opens the AI Tutor
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToCourse(); setTimeout(() => document.getElementById('ai-tutor-toggle')?.click(), 800)">
          ${rec.action_label} — Study Buddy
        </button>`;
      } else {
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToCourse()">
          ${rec.action_label}
        </button>`;
      }
    }

    card.className = 'rec-card anim-slide-up';
    card.style.cssText = `
      border-left: 4px solid ${cfg.borderColor};
      background: ${cfg.bg};
    `;
    card.innerHTML = `
      <div class="rec-icon" style="color:${cfg.borderColor}">${cfg.icon}</div>
      <div class="rec-body">
        <p class="rec-message">${rec.message}</p>
        ${btnHtml}
      </div>
    `;
  } catch {
    if (card) card.style.display = 'none';
  }
}

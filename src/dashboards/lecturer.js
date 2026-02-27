// src/dashboards/lecturer.js
// ─────────────────────────────────────────────
// Lecturer Dashboard — Contact Session Plans (90 min)
// Visible only to users with role [lecturer]
// ─────────────────────────────────────────────
import { SESSIONS, SESSION_META } from '../../content/sessions/sessions.js';
import { renderSessionPlan }      from '../components/session-plan.js';
import { db } from '../firebase.js';
import { ref, get } from 'firebase/database';
import { SEED_RESOURCES } from '../../content/resources.js';
import { addResource, vettResource, removeResource } from '../resources.js';

let _activeSession = 'c1';

export function renderLecturerDashboard(container) {
  container.innerHTML = `
    <div class="dash-wrapper">
      ${_buildSidebar('contact')}
      <div class="dash-content" id="dash-content">
        ${_buildWelcome('lecturer')}
      </div>
    </div>`;

  // Wire sidebar clicks
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

function _buildSidebar(type) {
  const isContact = type === 'contact';
  const meta      = SESSION_META[type];

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
        <div class="dash-role-badge lecturer-badge">🏫 Lecturer</div>
        <div class="dash-sidebar-title">Session Planner</div>
        <div class="dash-sidebar-sub">${isContact ? '90-min contact · Flipped' : '45-min tutorial · Targeted'}</div>
      </div>

      <div class="dash-session-type-bar">
        <button class="dst-btn ${isContact ? 'dst-active' : ''}"
          onclick="_switchSessionType('contact')">🏫 Contact (90m)</button>
        <button class="dst-btn ${type === 'tutorial' ? 'dst-active' : ''}"
          onclick="_switchSessionType('tutorial')">👥 Tutorial (45m)</button>
        <button class="dst-btn"
          onclick="_switchSessionType('analytics')">📊 Analytics</button>
      </div>

      ${phases.map(ph => `
        <div class="dash-phase-group">
          <div class="dash-phase-label">${ph.label}</div>
          ${ph.items.map(m => `
            <div class="dash-nav-item" data-session="${m.id}">
              <div class="dash-nav-id ${isContact ? '' : 'tutorial-id'}">${m.id.toUpperCase()}</div>
              <div class="dash-nav-label">${m.label.replace(/^[CT]\d+ — /, '')}</div>
            </div>`).join('')}
        </div>`).join('')}

      <div class="dash-sidebar-footer">
        <div class="dash-quick-tools">
          <div class="dash-qt-label">Quick Tools</div>
          <button class="dash-qt-btn" onclick="_fullPomodoro()">🍅 Class Pomodoro</button>
          <button class="dash-qt-btn" onclick="_randomiser()">🎲 Random Selector</button>
          <button class="dash-qt-btn" onclick="_printSession()">🖨️ Print Plan</button>
        </div>
      </div>
    </aside>`;
}

function _navItems(items) {
  return items.map(m => `
    <div class="dash-nav-item" data-session="${m.id}">
      <div class="dash-nav-id">${m.id.toUpperCase()}</div>
      <div class="dash-nav-label">${m.label.replace(/^[CT]\d+ — /, '')}</div>
    </div>`).join('');
}

let _currentType = 'contact';

function _switchSessionType(type) {
  _currentType = type;
  // Re-render the whole dashboard with the new type
  const wrapper = document.querySelector('.dash-wrapper');
  if (!wrapper) return;

  if (type === 'analytics') {
    wrapper.querySelector('aside').outerHTML = _buildAnalyticsSidebar();
    wrapper.querySelector('.dash-content').innerHTML = '<div id="analytics-mount" style="height:100%;overflow-y:auto;"><div style="padding:40px;color:var(--muted);text-align:center;margin-top:40px;">⏳ Loading cohort data...</div></div>';
    _loadAnalytics();
    return;
  }

  wrapper.querySelector('aside').outerHTML = _buildSidebar(type);
  wrapper.querySelector('.dash-content').innerHTML = _buildWelcome('lecturer');
  // Re-wire the new sidebar
  document.querySelectorAll('.dash-nav-item[data-session]').forEach(el => {
    el.addEventListener('click', () => {
      const sid = el.dataset.session;
      _loadSession(sid);
      document.querySelectorAll('.dash-nav-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
    });
  });
}
window._switchSessionType = _switchSessionType;

function _loadSession(sid) {
  _activeSession = sid;
  const session  = SESSIONS[sid];
  if (!session) return;

  const content = document.getElementById('dash-content');
  if (!content) return;

  content.innerHTML = `<div id="sp-mount-${sid}"></div>`;
  renderSessionPlan(session, `sp-mount-${sid}`);

  // Scroll to top
  content.scrollTop = 0;
}

function _buildWelcome(role) {
  const isContact = role === 'lecturer';
  return `
    <div class="dash-welcome">
      <div class="dash-welcome-icon">${isContact ? '🏫' : '👥'}</div>
      <h1 class="dash-welcome-title">${isContact ? 'Contact Session Planner' : 'Tutorial Session Planner'}</h1>
      <p class="dash-welcome-sub">
        ${isContact
          ? 'Select a session from the left to view the full 90-minute plan, including activity blocks, Pomodoro timers, process writing stages, and facilitator scripts.'
          : 'Select a session from the left to view the full 45-minute tutorial plan with targeted support activities, diagnostic tools, and artefact workshops.'}
      </p>
      <div class="dash-welcome-cards">
        <div class="dash-wc">
          <div class="dash-wc-icon">🔄</div>
          <div class="dash-wc-title">Flipped Classroom</div>
          <p>Content is delivered in the module. Sessions build on pre-work — never re-teach what students should have done.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🍅</div>
          <div class="dash-wc-title">Live Pomodoro Timer</div>
          <p>Every session includes a live Pomodoro timer you project to the class. Set it and let the rhythm drive focus.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">✍️</div>
          <div class="dash-wc-title">Process Writing</div>
          <p>Each session ties writing activities to the 5-stage process: pre-write → draft → peer feedback → revision → reflect.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🎫</div>
          <div class="dash-wc-title">Exit Tickets</div>
          <p>Every session ends with a specific exit ticket. Collect and read before the next session to target gaps.</p>
        </div>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:14px;margin-top:24px;">← Select a session from the sidebar to begin</p>
    </div>`;
}

// ── Quick tools ───────────────────────────────
window._fullPomodoro = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pom-fullscreen';
  overlay.id = 'pom-fs';
  overlay.innerHTML = `
    <div class="pom-fs-inner">
      <div class="pom-fs-title">Class Pomodoro</div>
      <div class="pom-fs-time" id="pfs-time">25:00</div>
      <div class="pom-fs-mode" id="pfs-mode">Work block</div>
      <div class="pom-fs-controls">
        <button onclick="_pfsControl('start')">▶ Start</button>
        <button onclick="_pfsControl('pause')">⏸ Pause</button>
        <button onclick="_pfsControl('reset')">↺ Reset</button>
        <button onclick="document.getElementById('pom-fs').remove()">✕ Close</button>
      </div>
      <div class="pom-fs-presets">
        ${[25,20,15,10,5].map(m => `<button onclick="_pfsSet(${m})">${m}m</button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let secs = 25 * 60, total = 25 * 60, running = false, interval = null;

  window._pfsControl = (a) => {
    if (a === 'start' && !running) {
      running = true;
      interval = setInterval(() => {
        secs--;
        if (secs < 0) { clearInterval(interval); running = false; secs = 0; }
        const m = Math.floor(secs / 60), s = secs % 60;
        const el = document.getElementById('pfs-time');
        if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }, 1000);
    } else if (a === 'pause') { clearInterval(interval); running = false; }
    else if (a === 'reset')  { clearInterval(interval); running = false; secs = total;
      const el = document.getElementById('pfs-time');
      const m = Math.floor(secs/60);
      if (el) el.textContent = `${String(m).padStart(2,'0')}:00`;
    }
  };
  window._pfsSet = (m) => {
    clearInterval(interval); running = false; secs = total = m * 60;
    const el = document.getElementById('pfs-time');
    if (el) el.textContent = `${String(m).padStart(2,'0')}:00`;
  };
};

window._randomiser = () => {
  const names = prompt('Paste student names (one per line):');
  if (!names) return;
  const list = names.split('\n').map(n => n.trim()).filter(Boolean);
  if (!list.length) return;
  const picked = list[Math.floor(Math.random() * list.length)];
  alert(`🎲 Selected: ${picked}`);
};

window._printSession = () => window.print();

// ── Analytics Module ──────────────────────────────
function _buildAnalyticsSidebar() {
  return `
    <aside class="dash-sidebar">
      <div class="dash-sidebar-header">
        <div class="dash-role-badge lecturer-badge">🏫 Lecturer</div>
        <div class="dash-sidebar-title">Data Analytics</div>
        <div class="dash-sidebar-sub">Student Performance</div>
      </div>

      <div class="dash-session-type-bar">
        <button class="dst-btn" onclick="_switchSessionType('contact')">🏫 Contact (90m)</button>
        <button class="dst-btn" onclick="_switchSessionType('tutorial')">👥 Tutorial (45m)</button>
        <button class="dst-btn dst-active">📊 Analytics</button>
      </div>

      <div class="dash-phase-group">
        <div class="dash-phase-label">Reports</div>
        <div class="dash-nav-item active" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadAnalytics()">
          <div class="dash-nav-id">📈</div>
          <div class="dash-nav-label">Cohort Overview</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadSkillAnalytics()">
          <div class="dash-nav-id">🧠</div>
          <div class="dash-nav-label">Skill Analytics</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadPhaseAnalysis()">
          <div class="dash-nav-id">🔍</div>
          <div class="dash-nav-label">Phase Robust Analysis</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadResourceManager()">
          <div class="dash-nav-id">📚</div>
          <div class="dash-nav-label">Resource Library</div>
        </div>
      </div>

      <div class="dash-sidebar-footer" style="padding:20px; text-align:center;">
        <div style="font-size:12px; color:var(--muted); line-height:1.4;">
          Data is pulled securely from Firebase in real-time. Only active students are shown.
        </div>
      </div>
    </aside>`;
}

let _cachedStudents = [];

const SKILL_LABELS_LEC = {
  critical_reading:   'Critical Reading',
  evidence_use:       'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone:      'Academic Tone',
  source_evaluation:  'Source Evaluation',
  citation_practice:  'Citation & Integrity',
  research_skills:    'Research Skills',
  ai_literacy:        'AI Literacy',
};

async function _loadAnalytics() {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  try {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading cohort data...</div>';

    const snap = await get(ref(db, 'users'));

    if (!snap.exists()) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No student data found in the database yet.</div>';
      return;
    }

    const users = snap.val();
    _cachedStudents = [];
    const TOTAL_UNITS = 20;

    for (const [uid, user] of Object.entries(users)) {
      if (!user.state) continue;

      const s = user.state;
      const progressObj  = s.progress  || {};
      const adaptiveData = s.adaptive  || {};
      const visitedCount   = Object.values(progressObj).filter(p => p.visited).length;
      const completedCount = Object.values(progressObj).filter(p => p.readingComplete).length;

      const pct     = Math.round((visitedCount / TOTAL_UNITS) * 100);
      const erMarks = s.erProgress?.extraMarks || 0;

      // Reading engagement metrics
      let totalAnnotations = 0;
      let totalDifficulty  = 0;
      let surveyCount      = 0;
      let activeStrats     = 0;

      Object.values(progressObj).forEach(p => {
        if (p.annotations) totalAnnotations += p.annotations.length;
        if (p.readingSurvey) {
          totalDifficulty += p.readingSurvey.difficulty || 0;
          surveyCount++;
          if (p.readingSurvey.strategies) activeStrats += p.readingSurvey.strategies.length;
        }
      });

      const avgDifficulty = surveyCount > 0 ? (totalDifficulty / surveyCount).toFixed(1) : 'N/A';

      // Adaptive skill data
      const skillStatus    = adaptiveData.skill_status   || {};
      const skillScores    = adaptiveData.skill_scores   || {};
      const needsRem       = adaptiveData.needs_remediation || [];
      const frustrationIdx = adaptiveData.frustration_index || 0;
      const highPerformer  = adaptiveData.high_performer || false;
      const studyTopics    = adaptiveData.study_topics   || [];
      const escalations    = (s.escalations || []).filter(e => !e.resolved);
      const studentOutcomes = adaptiveData.outcomes || [];

      // Per-skill averages for this student
      const skillAvgs = {};
      Object.entries(skillScores).forEach(([id, entries]) => {
        if (entries && entries.length >= 2) {
          const recent = entries.slice(-3).map(e => e.score);
          skillAvgs[id] = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length * 10) / 10;
        }
      });

      // ── Risk Assessment ──────────────────────
      let riskScore   = 0;
      let riskFactors = [];

      // Course progress
      if (pct < 20) { riskScore += 2; riskFactors.push('Low course completion'); }
      // Self-reported difficulty
      if (avgDifficulty !== 'N/A' && parseFloat(avgDifficulty) >= 4.0) { riskScore += 2; riskFactors.push('Reporting high text difficulty'); }
      // Passive reading
      if (visitedCount > 3 && totalAnnotations === 0) { riskScore += 1; riskFactors.push('Passive reading — no annotations'); }
      if (surveyCount > 0 && activeStrats === 0)      { riskScore += 1; riskFactors.push('Not using active reading strategies'); }
      // Adaptive signals
      if (frustrationIdx >= 3)      { riskScore += 2; riskFactors.push(`High frustration index (${frustrationIdx.toFixed(1)}/5)`); }
      if (needsRem.length >= 2)     { riskScore += 1; riskFactors.push(`${needsRem.length} skills flagged for remediation`); }
      // Positive signal — reduce risk if high performer
      if (highPerformer)             { riskScore = Math.max(0, riskScore - 1); }

      let riskLevel = 'Low';
      let riskColor = 'var(--green)';
      if (riskScore >= 4) { riskLevel = 'High';   riskColor = 'var(--red)'; }
      else if (riskScore >= 2) { riskLevel = 'Medium'; riskColor = 'var(--amber2)'; }

      _cachedStudents.push({
        uid,
        name:          user.profile?.displayName || `Student_${uid.substring(0,6)}`,
        email:         user.profile?.email || 'N/A',
        pct, completedCount, erMarks, totalAnnotations, avgDifficulty,
        riskLevel, riskColor, riskFactors, progressObj,
        // adaptive
        skillStatus, skillScores, skillAvgs, needsRem,
        frustrationIdx, highPerformer, studyTopics,
        escalations, outcomes: studentOutcomes,
      });
    }

    if (_cachedStudents.length === 0) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No active student states found.</div>';
      return;
    }

    // Sort by risk (High -> Low), then by progress
    _cachedStudents.sort((a, b) => {
      const riskVal = { "High": 3, "Medium": 2, "Low": 1 };
      if (riskVal[b.riskLevel] !== riskVal[a.riskLevel]) return riskVal[b.riskLevel] - riskVal[a.riskLevel];
      return a.pct - b.pct;
    });

    const avgProg     = Math.round(_cachedStudents.reduce((acc, s) => acc + s.pct, 0) / _cachedStudents.length);
    const atRiskCount = _cachedStudents.filter(s => s.riskLevel === 'High').length;
    const frustCount  = _cachedStudents.filter(s => s.frustrationIdx >= 3).length;

    // ── Class-wide skill heatmap ──────────────
    const classSkillData = {};
    Object.keys(SKILL_LABELS_LEC).forEach(id => {
      const scores = _cachedStudents
        .map(st => st.skillAvgs[id])
        .filter(v => v != null);
      const weakCount = _cachedStudents.filter(st => st.skillStatus[id] === 'weak').length;
      classSkillData[id] = {
        avg:       scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null,
        assessed:  scores.length,
        weakCount,
      };
    });

    const heatmapRows = Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
      const d = classSkillData[id];
      if (!d.assessed) {
        return `<div class="lec-skill-row">
          <span class="lec-skill-name">${label}</span>
          <div class="lec-skill-bar-bg" style="flex:1"><div class="lec-skill-bar-fill" style="width:0%;background:#e2e8f0"></div></div>
          <span class="lec-skill-meta" style="color:var(--muted)">No data yet</span>
        </div>`;
      }
      const pct   = Math.round((d.avg / 5) * 100);
      const color = d.avg < 2.5 ? '#ef4444' : d.avg < 3.5 ? '#f59e0b' : '#10b981';
      const flag  = d.weakCount > 0 ? `<span style="color:#ef4444;font-size:11px;font-weight:700;"> ⚠ ${d.weakCount} weak</span>` : '';
      return `<div class="lec-skill-row">
        <span class="lec-skill-name">${label}</span>
        <div class="lec-skill-bar-bg" style="flex:1">
          <div class="lec-skill-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="lec-skill-meta">${d.avg}/5 · ${d.assessed} assessed${flag}</span>
      </div>`;
    }).join('');

    // ── Escalation & curriculum alert data ───────
    const escalatedStudents = _cachedStudents.filter(s => s.escalations.length > 0);
    const curriculumAlerts  = Object.entries(classSkillData)
      .filter(([, d]) => d.assessed > 0 && (d.weakCount / _cachedStudents.length) >= 0.6)
      .map(([id]) => SKILL_LABELS_LEC[id]);

    const studentRows = _cachedStudents.map((s, index) => {
      const frustDots = Array.from({length: 5}, (_, i) =>
        `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:2px;background:${i < Math.round(s.frustrationIdx) ? '#f59e0b' : '#e2e8f0'}"></span>`
      ).join('');
      const weakSkills = Object.entries(s.skillStatus).filter(([,v]) => v === 'weak').map(([id]) => SKILL_LABELS_LEC[id]?.split(' ')[0] || id);
      return `
      <tr style="cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='var(--cream2)'" onmouseout="this.style.background='transparent'" onclick="_renderStudentProfile(${index})">
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);color:var(--navy);font-weight:600;">
          ${s.name.split(' [')[0]}
          ${s.highPerformer ? '<span style="font-size:10px;background:rgba(16,185,129,0.12);color:#10b981;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:700;">★ High</span>' : ''}
          <div style="font-size:11px;color:var(--muted);font-weight:normal;font-family:monospace;">${s.email}</div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;background:var(--cream2);border-radius:6px;height:7px;overflow:hidden;">
              <div style="width:${s.pct}%;background:var(--accent);height:100%;border-radius:6px;"></div>
            </div>
            <div style="font-size:13px;font-weight:600;min-width:36px;">${s.pct}%</div>
          </div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">
          <span style="background:${s.riskColor}20;color:${s.riskColor};padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;">${s.riskLevel}</span>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:2px;" title="Frustration index ${s.frustrationIdx.toFixed(1)}/5">${frustDots}</div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);font-size:12px;color:${weakSkills.length ? '#ef4444' : 'var(--muted)'};">
          ${weakSkills.length ? weakSkills.join(', ') : '—'}
        </td>
      </tr>`;
    });

    mount.innerHTML = `
      <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.5s ease;">
        <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:32px;margin-bottom:32px;">📊 Cohort Analytics & Risk Overview</h1>

        <!-- Metric cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px;">
          ${_metricCard('👥', 'Active Students', _cachedStudents.length, 'var(--navy)')}
          ${_metricCard('📈', 'Avg Progress', `${avgProg}<span style="font-size:20px">%</span>`, 'var(--accent)')}
          ${_metricCard('⚠️', 'At-Risk Students', atRiskCount, atRiskCount > 0 ? 'var(--red)' : 'var(--green)')}
          ${_metricCard('😤', 'High Frustration', frustCount, frustCount > 0 ? '#f59e0b' : 'var(--green)')}
        </div>

        <!-- Students Needing Attention -->
        ${escalatedStudents.length ? `
        <div style="background:white;border-radius:16px;border:2px solid rgba(239,68,68,0.3);padding:24px;margin-bottom:28px;">
          <h2 style="font-size:16px;color:#ef4444;margin-bottom:4px;font-family:'DM Sans',sans-serif;">
            🔔 Students Needing Attention (${escalatedStudents.length})
          </h2>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
            These students have crossed escalation thresholds. Consider reaching out directly.
          </p>
          ${escalatedStudents.map(st => `
            <div style="padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;display:flex;gap:16px;align-items:flex-start;">
              <div style="flex:1;">
                <div style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:4px;">${st.name.split(' [')[0]}</div>
                ${st.escalations.map(e => `<div style="font-size:12px;color:#dc2626;">⚠ <strong>${e.trigger.replace(/-/g,' ')}</strong> — ${e.message}</div>`).join('')}
              </div>
              <span style="font-size:10px;color:#ef4444;background:#fecaca;padding:2px 8px;border-radius:4px;white-space:nowrap;font-weight:700;flex-shrink:0;">
                ${(st.escalations[0]?.severity || 'alert').toUpperCase()}
              </span>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- Curriculum alerts -->
        ${curriculumAlerts.length ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:28px;display:flex;gap:14px;align-items:flex-start;">
          <div style="font-size:20px;flex-shrink:0;">⚡</div>
          <div>
            <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:4px;">Curriculum Alert</div>
            <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
              More than 60% of the class is struggling with:
              <strong>${curriculumAlerts.join(', ')}</strong>.
              Consider adjusting upcoming session plans to address this gap directly.
            </p>
          </div>
        </div>` : ''}

        <!-- Skill heatmap -->
        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:32px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:'DM Sans',sans-serif;">🧠 Class Skill Heatmap</h2>
            <span style="font-size:12px;color:var(--muted);">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;margin-right:4px;"></span>Weak (&lt;2.5)
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f59e0b;margin:0 4px 0 10px;"></span>Developing
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10b981;margin:0 4px 0 10px;"></span>Strong (≥3.5)
            </span>
          </div>
          <div class="lec-heatmap">${heatmapRows}</div>
          <p style="font-size:12px;color:var(--muted);margin-top:14px;">
            Based on last 3 interactions per student. Only students with ≥2 interactions per skill are included.
            <a href="#" style="color:var(--accent);margin-left:8px;" onclick="event.preventDefault();document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active'));event.target.closest('.dash-nav-item+.dash-nav-item')?.classList.add('active');_loadSkillAnalytics()">→ Full Skill Analytics</a>
          </p>
        </div>

        <h2 style="font-size:20px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">
          Student Roster
          <span style="font-size:14px;color:var(--muted);font-weight:normal;">(Click a student for detailed profile)</span>
        </h2>
        <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;text-align:left;">
            <thead>
              <tr>
                <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)">Student</th>
                <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);width:25%">Progress</th>
                <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Risk</th>
                <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Frustration</th>
                <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Weak Skills</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows.join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } catch (err) {
    mount.innerHTML = `<div style="padding:40px;color:red;text-align:center;">Failed to load analytics: ${err.message}</div>`;
  }
}

window._renderStudentProfile = (index) => {
  const mount = document.getElementById('analytics-mount');
  const student = _cachedStudents[index];
  if (!mount || !student) return;

  const notesHtml = [];
  Object.entries(student.progressObj).forEach(([unitId, data]) => {
    if (data.annotations && data.annotations.length > 0) {
      data.annotations.forEach(a => {
        notesHtml.push(`
          <div style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;font-family:monospace;">${unitId.toUpperCase()}</div>
            <div style="font-size:13px;color:var(--muted);font-style:italic;border-left:2px solid var(--amber);padding-left:8px;margin-bottom:8px;">"${a.quote}"</div>
            <div style="font-size:14px;color:var(--navy);">${a.text}</div>
          </div>
        `);
      });
    }
  });

  const factorsHtml = student.riskFactors.length > 0 
    ? student.riskFactors.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')
    : '<li style="color:var(--muted);">No immediate risk factors identified.</li>';

  mount.innerHTML = `
    <div style="padding:40px;max-width:900px;margin:0 auto;animation:fadeIn 0.3s ease;">
      <button onclick="_loadAnalytics()" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:14px;margin-bottom:20px;font-family:'Lora',serif;">← Back to Cohort Overview</button>
      
      <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);padding:32px;margin-bottom:24px;display:flex;gap:24px;align-items:flex-start;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0;">
          ${student.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:28px;margin-bottom:4px;">${student.name.split(' [')[0]}</h1>
          <div style="font-size:14px;color:var(--muted);font-family:monospace;margin-bottom:16px;">${student.email}</div>
          
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <span style="background:var(--cream2);padding:6px 12px;border-radius:8px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Progress:</strong> ${student.pct}%</span>
            <span style="background:var(--cream2);padding:6px 12px;border-radius:8px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Completed Units:</strong> ${student.completedCount}</span>
            <span style="background:${student.riskColor}20;color:${student.riskColor};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.riskColor}40;">Risk Level: ${student.riskLevel}</span>
          </div>
        </div>
      </div>

      <!-- Skill profile grid -->
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">
          🧠 Skill Profile
          ${student.highPerformer ? '<span style="font-size:12px;background:rgba(16,185,129,0.1);color:#10b981;padding:3px 8px;border-radius:6px;margin-left:8px;">★ High Performer</span>' : ''}
          ${student.frustrationIdx >= 3 ? `<span style="font-size:12px;background:rgba(245,158,11,0.1);color:#f59e0b;padding:3px 8px;border-radius:6px;margin-left:8px;">⚠ Frustration ${student.frustrationIdx.toFixed(1)}/5</span>` : ''}
        </h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
            const status  = student.skillStatus[id] || 'untested';
            const avg     = student.skillAvgs[id];
            const colors  = { untested:'#94a3b8', weak:'#ef4444', developing:'#f59e0b', strong:'#10b981' };
            const labels  = { untested:'Not assessed', weak:'Weak', developing:'Developing', strong:'Strong' };
            const col     = colors[status];
            const inRem   = student.needsRem.includes(id);
            return `<div style="background:white;border:1px solid var(--border);border-left:3px solid ${col};border-radius:10px;padding:12px;">
              <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">${label}</div>
              <span style="font-size:11px;font-weight:700;color:${col};background:${col}18;padding:2px 7px;border-radius:4px;">${labels[status]}</span>
              ${avg != null ? `<div style="margin-top:8px;height:3px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="width:${Math.round(avg/5*100)}%;height:100%;background:${col};"></div></div><div style="font-size:10px;color:var(--muted);margin-top:4px;">${avg}/5</div>` : ''}
              ${inRem ? '<div style="font-size:10px;color:#ef4444;margin-top:4px;font-weight:700;">⚠ Needs focus</div>' : ''}
            </div>`;
          }).join('')}
        </div>
        ${student.studyTopics.length ? `<div style="margin-top:12px;font-size:12px;color:var(--muted);">
          Study Buddy topics: ${student.studyTopics.map(t => `<span style="background:var(--cream2);border:1px solid var(--border);padding:2px 8px;border-radius:4px;margin-right:4px;">${t.replace(/_/g,' ')}</span>`).join('')}
        </div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">Diagnostic Assessment</h2>
          <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:20px;">
            <ul style="padding-left:20px;font-size:14px;color:var(--red);line-height:1.6;">
              ${factorsHtml}
            </ul>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:13px;">
              <span style="color:var(--muted);">Avg Reported Text Difficulty:</span>
              <strong style="color:var(--navy);">${student.avgDifficulty} / 5</strong>
            </div>
          </div>
        </div>

        <div>
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">Reading Engagement (${student.totalAnnotations} Notes)</h2>
          <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:20px;max-height:300px;overflow-y:auto;">
            ${notesHtml.length > 0 ? notesHtml.join('') : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No active reading annotations recorded yet.</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
};

// ── Shared helpers ────────────────────────────
function _metricCard(icon, label, value, color) {
  return `<div style="background:white;padding:22px;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.04);border:1px solid var(--border);position:relative;overflow:hidden;">
    <div style="position:absolute;top:-8px;right:-8px;font-size:60px;opacity:0.05;">${icon}</div>
    <div style="font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:1px;margin-bottom:8px;font-weight:700;">${label}</div>
    <div style="font-size:34px;font-weight:800;color:${color};line-height:1;">${value}</div>
  </div>`;
}

// ── Skill Analytics view ──────────────────────
window._loadSkillAnalytics = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  if (!_cachedStudents.length) {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading data… <a href="#" onclick="event.preventDefault();_loadAnalytics().then(()=>_loadSkillAnalytics())">Load Cohort first</a></div>';
    return;
  }

  // ── Delta scores: pre vs post micro-module ──
  const MODULE_NAMES = {
    'evidence-booster':   'Evidence Booster',
    'argument-builder':   'Argument Builder',
    'tone-workshop':      'Tone Workshop',
    'source-skills':      'Source Skills',
    'citation-guide':     'Citation Guide',
    'reading-strategies': 'Reading Strategies',
  };
  const MODULE_SKILL = {
    'evidence-booster':   'evidence_use',
    'argument-builder':   'argument_structure',
    'tone-workshop':      'academic_tone',
    'source-skills':      'source_evaluation',
    'citation-guide':     'citation_practice',
    'reading-strategies': 'critical_reading',
  };

  const deltaData = {};
  Object.entries(MODULE_NAMES).forEach(([mod]) => { deltaData[mod] = { deltas: [], count: 0 }; });

  // Outcome effectiveness from outcome records
  const effectivenessData = {};
  Object.keys(MODULE_NAMES).forEach(mod => {
    const closed = _cachedStudents.flatMap(st =>
      (st.outcomes || []).filter(o => o.moduleId === mod && o.status !== 'pending')
    );
    if (closed.length) {
      const improved = closed.filter(o => o.status === 'improved').length;
      effectivenessData[mod] = { pct: Math.round((improved / closed.length) * 100), total: closed.length };
    }
  });

  _cachedStudents.forEach(st => {
    Object.entries(MODULE_SKILL).forEach(([mod, skillId]) => {
      const entries = st.skillScores[skillId] || [];
      const postEntries = entries.filter(e => e.triggered_by === mod);
      if (!postEntries.length) return;
      // Find most recent pre-module score (no triggered_by)
      const preEntries = entries.filter(e => !e.triggered_by && new Date(e.timestamp) < new Date(postEntries[0].timestamp));
      if (!preEntries.length) return;
      const pre  = preEntries[preEntries.length - 1].score;
      const post = postEntries[0].score;
      deltaData[mod].deltas.push(post - pre);
      deltaData[mod].count++;
    });
  });

  const deltaRows = Object.entries(MODULE_NAMES).map(([mod, name]) => {
    const d = deltaData[mod];
    if (!d.count) {
      return `<div class="lec-delta-row">
        <span class="lec-delta-name">${name}</span>
        <span style="color:var(--muted);font-size:13px;">No completions yet</span>
      </div>`;
    }
    const avg   = d.deltas.reduce((a, b) => a + b, 0) / d.deltas.length;
    const color = avg > 0 ? '#10b981' : avg < 0 ? '#ef4444' : '#94a3b8';
    const sign  = avg > 0 ? '+' : '';
    const eff   = effectivenessData[mod];
    const effBadge = eff
      ? `<span style="font-size:11px;background:${eff.pct >= 60 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};color:${eff.pct >= 60 ? '#10b981' : '#ef4444'};padding:2px 8px;border-radius:4px;font-weight:700;white-space:nowrap;">${eff.pct}% effective · ${eff.total}</span>`
      : '';
    return `<div class="lec-delta-row">
      <span class="lec-delta-name">${name}</span>
      <span style="font-size:20px;font-weight:800;color:${color};min-width:70px;">${sign}${avg.toFixed(2)}</span>
      <span style="font-size:13px;color:var(--muted);">${d.count} student${d.count !== 1 ? 's' : ''}</span>
      ${effBadge}
      <div style="flex:1;background:var(--cream2);border-radius:4px;height:6px;overflow:hidden;max-width:200px;">
        <div style="width:${Math.min(100,Math.abs(avg)/2*100)}%;height:100%;background:${color};border-radius:4px;"></div>
      </div>
    </div>`;
  }).join('');

  // ── Study topics across cohort ──────────────
  const topicFreq = {};
  _cachedStudents.forEach(st => {
    st.studyTopics.forEach(t => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
  });
  const topicPills = Object.entries(topicFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span style="background:var(--accent-dim);color:var(--accent);border:1px solid rgba(99,102,241,0.2);padding:5px 12px;border-radius:20px;font-size:13px;font-weight:600;margin:4px;">${t.replace(/_/g,' ')} <span style="opacity:0.6;font-size:11px;">${n}</span></span>`)
    .join('') || '<span style="color:var(--muted);font-size:14px;">No Study Buddy interactions recorded yet.</span>';

  mount.innerHTML = `
    <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.4s ease;">
      <button onclick="_loadAnalytics()" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:14px;margin-bottom:24px;font-family:'Lora',serif;">← Back to Cohort Overview</button>

      <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:30px;margin-bottom:8px;">🧠 Skill Analytics</h1>
      <p style="color:var(--muted);font-size:15px;margin-bottom:32px;">Skill performance patterns and micro-module efficacy across ${_cachedStudents.length} students.</p>

      <!-- Module efficacy -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;margin-bottom:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:6px;font-family:'DM Sans',sans-serif;">📐 Micro-Module Efficacy (Delta Scores)</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px;">Average score improvement from before to after completing each micro-module. Positive = improvement.</p>
        <div class="lec-delta-table">${deltaRows}</div>
      </div>

      <!-- Study Buddy topics -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;margin-bottom:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:6px;font-family:'DM Sans',sans-serif;">💬 Study Buddy — What Students Are Asking About</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Topics detected from student Study Buddy conversations across the cohort.</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${topicPills}</div>
      </div>

      <!-- Per-skill weak student breakdown -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">👥 Students Flagged as Weak Per Skill</h2>
        ${Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
          const weakStudents = _cachedStudents.filter(st => st.skillStatus[id] === 'weak');
          if (!weakStudents.length) return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;"><span style="min-width:180px;color:var(--navy);font-weight:600;">${label}</span><span style="color:#10b981;">✓ No weak students</span></div>`;
          return `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <span style="min-width:180px;color:var(--navy);font-weight:600;font-size:14px;padding-top:4px;">${label}</span>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${weakStudents.map(st => `<span style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:3px 10px;border-radius:6px;font-size:12px;">${st.name.split(' [')[0].split(' ')[0]}</span>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
};

window._loadPhaseAnalysis = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  try {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Running deep phase analysis across cohort...</div>';
    
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No student data found for phase analysis.</div>';
      return;
    }

    const users = snap.val();
    
    let deviceData = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    let gapCounters = {
      'Sentence Construction': 0,
      'Evidence/Examples': 0,
      'Academic Register': 0,
      'Engagement with Reading': 0
    };
    
    let totalStudents = 0;

    for (const [uid, user] of Object.entries(users)) {
      if (!user.state) continue;
      totalStudents++;
      const s = user.state;
      
      if (s.deviceInfo && s.deviceInfo.type) {
        deviceData[s.deviceInfo.type] = (deviceData[s.deviceInfo.type] || 0) + 1;
      } else {
        deviceData.Unknown++;
      }
      
      if (s.progress) {
        Object.values(s.progress).forEach(p => {
          if (p.feedback && p.feedback.priority) {
            const prio = p.feedback.priority.toLowerCase();
            if (prio.includes('sentence') || prio.includes('run-on') || prio.includes('grammar')) gapCounters['Sentence Construction']++;
            if (prio.includes('example') || prio.includes('evidence')) gapCounters['Evidence/Examples']++;
            if (prio.includes('informal') || prio.includes('register') || prio.includes('vocabulary')) gapCounters['Academic Register']++;
            if (prio.includes('text') || prio.includes('reading') || prio.includes('task')) gapCounters['Engagement with Reading']++;
          }
        });
      }
    }

    let topGap = 'None identified yet';
    let maxGap = 0;
    Object.entries(gapCounters).forEach(([gap, count]) => {
      if (count > maxGap) { maxGap = count; topGap = gap; }
    });
    
    const mobilePct = totalStudents > 0 ? Math.round(((deviceData.Mobile + deviceData.Tablet) / totalStudents) * 100) : 0;

    mount.innerHTML = `
      <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.5s ease;">
        <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:32px;margin-bottom:12px;">🔍 Phase Robust Analysis</h1>
        <p style="font-size:16px;color:var(--muted);margin-bottom:32px;">Deep cognitive and structural insights automatically extracted from student writing tasks and device metrics.</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">📱 Device Analytics</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">${mobilePct > 50 ? '📱' : '💻'}</div>
              <div>
                <div style="font-size:28px;font-weight:700;color:var(--navy);line-height:1;">${mobilePct}% Mobile</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Desktop: ${deviceData.Desktop} | Mobile/Tablet: ${deviceData.Mobile + deviceData.Tablet}</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Pedagogical Implication:</strong> ${mobilePct > 50 ? 'With a high mobile user base, ensure long readings are broken into smaller chunks and avoid complex dragging interactions in upcoming assessments.' : 'Students are primarily using desktops; you can safely assign more complex, multi-window research tasks.'}
            </div>
          </div>

          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">🧠 Primary Cohort Knowledge Gap</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">⚠️</div>
              <div>
                <div style="font-size:24px;font-weight:700;color:var(--red);line-height:1.2;">${topGap}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Identified in ${maxGap} writing submissions across the cohort.</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#166534;line-height:1.5;">
              <strong>Recommended Intervention:</strong> ${
                topGap === 'Evidence/Examples' ? 'The next reading task should force students to highlight a specific quote before writing.' :
                topGap === 'Sentence Construction' ? 'Start the next contact session with a 10-minute sentence combining activity.' :
                topGap === 'Academic Register' ? 'Provide a formal vs informal translation exercise in the next tutorial.' :
                'Introduce a pre-reading quiz to force closer engagement with the text.'
              }
            </div>
          </div>
        </div>

        <h2 style="font-size:20px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">Curriculum Adaptation Engine</h2>
        <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);padding:24px;">
          <p style="font-size:14px;color:var(--navy);line-height:1.6;margin-bottom:16px;">Based on the recent phase analysis, the system recommends the following automated adaptations for the upcoming units to ensure autonomous learning:</p>
          
          <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:var(--navy);">
            <li><strong>For High-Performing Students (Levels 4-5):</strong> Automatically unlock a supplementary peer-reviewed text in the next unit instead of the Access Level text.</li>
            <li><strong>For Below-Standard Students (Levels 1-2):</strong> Inject a mandatory Argument Outline scaffolding step before they are permitted to draft their paragraph in the next unit.</li>
            <li><strong>For Mobile Users:</strong> Toggle Focus Mode by default to hide the sidebar and increase reading font sizes automatically to prevent eye strain.</li>
          </ul>
        </div>
      </div>
    `;

  } catch (err) {
    mount.innerHTML = `<div style="padding:40px;color:red;text-align:center;">Failed to run analysis: ${err.message}</div>`;
  }
};

// ── Resource Manager ──────────────────────────
const SKILL_LABELS_RES = {
  critical_reading:   'Critical Reading',
  evidence_use:       'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone:      'Academic Tone',
  source_evaluation:  'Source Evaluation',
  citation_practice:  'Citation & Integrity',
  research_skills:    'Research Skills',
  ai_literacy:        'AI Literacy',
};

window._loadResourceManager = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading resource library…</div>';

  // Fetch all Firebase resources including unvetted (to show pending queue)
  let allFbRaw = [];
  try {
    const snap = await get(ref(db, 'resources'));
    if (snap.exists()) {
      allFbRaw = Object.entries(snap.val()).map(([id, d]) => ({ id, ...d }));
    }
  } catch { /* silent — no resources yet or no permission */ }

  const pending  = allFbRaw.filter(r => !r.vetted && !r.removed);
  const approved = allFbRaw.filter(r =>  r.vetted && !r.removed);

  mount.innerHTML = `
    <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.4s ease;">
      <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:30px;margin-bottom:6px;">📚 Resource Library Manager</h1>
      <p style="color:var(--muted);font-size:14px;margin-bottom:32px;">
        Approve submitted resources, add new ones, and manage the student-facing library.
        The library ships with ${SEED_RESOURCES.length} curated seed resources (always visible).
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;">

        <!-- Pending queue -->
        <div style="background:white;border-radius:16px;border:2px solid ${pending.length ? 'rgba(245,158,11,0.4)' : 'var(--border)'};padding:24px;">
          <h2 style="font-size:15px;color:var(--navy);margin-bottom:4px;font-family:'DM Sans',sans-serif;">
            ⏳ Pending Approval
            ${pending.length ? `<span style="font-size:12px;background:#fde68a;color:#92400e;padding:2px 8px;border-radius:8px;margin-left:8px;">${pending.length}</span>` : ''}
          </h2>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px;">Resources submitted by lecturers awaiting vetting.</p>
          <div id="rm-pending-list">
            ${pending.length ? pending.map(r => _rmPendingCard(r)).join('') : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No pending resources.</p>'}
          </div>
        </div>

        <!-- Add resource form -->
        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;">
          <h2 style="font-size:15px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">➕ Add Resource</h2>
          <form id="rm-add-form" style="display:flex;flex-direction:column;gap:12px;">
            ${_rmInput('rm-title',       'Title *',       'text',   'Resource title')}
            ${_rmInput('rm-url',         'URL *',         'url',    'https://')}
            ${_rmTextarea('rm-desc',     'Description *', 'One or two sentences describing this resource')}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${_rmSelect('rm-type', 'Type *', ['video','pdf','podcast','article','tiktok','tweet','image','link'])}
              ${_rmSelect('rm-embed', 'Embed type *', ['youtube','pdf','audio','link'])}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${_rmSelect('rm-source', 'Source *', ['YouTube','TikTok','X','Spotify','Podcast','Journal','University','Other'])}
              ${_rmInput('rm-duration', 'Duration', 'text', 'e.g. 8 min')}
            </div>
            <div>
              <label style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:6px;">Skill Tags *</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;" id="rm-skill-tags">
                ${Object.entries(SKILL_LABELS_RES).map(([id, label]) => `
                  <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:4px 9px;">
                    <input type="checkbox" value="${id}" style="margin:0;cursor:pointer;"> ${label}
                  </label>
                `).join('')}
              </div>
            </div>
            <div id="rm-add-err" style="font-size:12px;color:#ef4444;display:none;"></div>
            <button type="submit" style="padding:10px;background:var(--accent);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s;">Submit Resource</button>
          </form>
        </div>
      </div>

      <!-- Approved resources table -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;">
        <h2 style="font-size:15px;color:var(--navy);margin-bottom:4px;font-family:'DM Sans',sans-serif;">
          ✅ Approved Lecturer-Added Resources
          <span style="font-size:12px;color:var(--muted);font-weight:normal;margin-left:8px;">(${approved.length} items)</span>
        </h2>
        <p style="font-size:12px;color:var(--muted);margin-bottom:16px;">These are visible in the student library alongside the ${SEED_RESOURCES.length} seed resources.</p>
        <div id="rm-approved-list">
          ${approved.length ? `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr>
                  ${['Title','Type','Skills','Source',''].map(h => `<th style="padding:10px 14px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:left;">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${approved.map(r => `
                  <tr>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--navy);font-weight:600;">${_esc(r.title)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--muted);">${r.type || ''}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;">
                      ${(r.skillTags || []).map(t => `<span style="background:var(--cream2,#f0f4ff);border:1px solid var(--border);padding:1px 7px;border-radius:6px;margin-right:3px;">${SKILL_LABELS_RES[t] || t}</span>`).join('')}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--muted);">${r.source || ''}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right;">
                      <button onclick="_rmRemove('${r.id}')" style="font-size:11px;background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:3px 10px;cursor:pointer;">Remove</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>` : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No lecturer-added resources approved yet.</p>'}
        </div>
      </div>
    </div>`;

  // Wire up form
  document.getElementById('rm-add-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('rm-add-err');
    errEl.style.display = 'none';

    const title   = document.getElementById('rm-title')?.value.trim();
    const url     = document.getElementById('rm-url')?.value.trim();
    const desc    = document.getElementById('rm-desc')?.value.trim();
    const type    = document.getElementById('rm-type')?.value;
    const embed   = document.getElementById('rm-embed')?.value;
    const source  = document.getElementById('rm-source')?.value;
    const dur     = document.getElementById('rm-duration')?.value.trim();
    const skills  = [...document.querySelectorAll('#rm-skill-tags input:checked')].map(i => i.value);

    if (!title || !url || !desc || !skills.length) {
      errEl.textContent = 'Please fill in Title, URL, Description, and at least one Skill Tag.';
      errEl.style.display = 'block';
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    const key = await addResource({
      type, embedType: embed, title, description: desc, url, source,
      duration: dur || null, skillTags: skills, phaseTags: [],
      addedBy: 'lecturer',
    });

    btn.disabled = false;
    btn.textContent = 'Submit Resource';

    if (key) {
      alert('Resource submitted! It will appear in the Pending Approval queue.');
      window._loadResourceManager();
    } else {
      errEl.textContent = 'Failed to save. Check your Firebase permissions.';
      errEl.style.display = 'block';
    }
  });
};

function _rmPendingCard(r) {
  return `
    <div id="rmp-${r.id}" style="background:var(--cream,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:4px;">${_esc(r.title)}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${_esc(r.type)} · ${_esc(r.source || '')} · <a href="${_esc(r.url)}" target="_blank" rel="noopener" style="color:var(--accent);">Preview ↗</a></div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;">${_esc(r.description || '')}</div>
      <div style="display:flex;gap:8px;">
        <button onclick="_rmApprove('${r.id}')" style="flex:1;padding:7px;background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.3);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">✓ Approve</button>
        <button onclick="_rmRemove('${r.id}')" style="flex:1;padding:7px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.25);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">✗ Remove</button>
      </div>
    </div>`;
}

window._rmApprove = async (id) => {
  const ok = await vettResource(id, true);
  if (ok) { alert('Resource approved and now visible to students.'); window._loadResourceManager(); }
  else alert('Failed to approve. Check Firebase permissions.');
};

window._rmRemove = async (id) => {
  if (!confirm('Remove this resource? It will no longer appear in the student library.')) return;
  const ok = await removeResource(id);
  if (ok) { alert('Resource removed.'); window._loadResourceManager(); }
  else alert('Failed to remove. Check Firebase permissions.');
};

function _rmInput(id, label, type, placeholder) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <input id="${id}" type="${type}" placeholder="${placeholder}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;box-sizing:border-box;outline:none;" />
  </div>`;
}

function _rmTextarea(id, label, placeholder) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <textarea id="${id}" rows="3" placeholder="${placeholder}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;box-sizing:border-box;resize:vertical;outline:none;"></textarea>
  </div>`;
}

function _rmSelect(id, label, options) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <select id="${id}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;background:white;box-sizing:border-box;outline:none;">
      ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>
  </div>`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

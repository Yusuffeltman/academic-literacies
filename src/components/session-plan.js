// src/components/session-plan.js
// ─────────────────────────────────────────────
// Session Plan Component — Contact (90 min) and Tutorial (45 min)
// Includes: live Pomodoro timer, process writing stages,
// activity cards, facilitator notes, exit tickets
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';
import { scoreSubmissionForAI, getStudentBaselineProfile } from '../ai-detection.js';

// ── Process Writing persistence ───────────────────────────
const PW_STORAGE_PREFIX = 'acadlit-pw-v1';
const _pwSaveTimers = new Map();

function _pwStorageKey(sid, i) {
  return `${PW_STORAGE_PREFIX}:${sid}:${i}`;
}

function _pwNotebookKey(sid, i) {
  return `process-writing:${sid}:${i}`;
}

function _pwRestoreFromState(sid, i) {
  const entry = window.STATE?.tutorialNotebook?.entries?.[_pwNotebookKey(sid, i)];
  if (!entry || typeof entry !== 'object') return null;
  return {
    text: entry.text || '',
    feedback: entry.feedback || null,
    aiDetection: entry.aiDetection || null,
    savedAt: entry.savedAt || new Date(entry.updatedAt || entry.timestamp || Date.now()).getTime(),
  };
}

function _pwScheduleStateSave(sid, i, payload) {
  if (!window.STATE) return;
  if (!window.STATE.tutorialNotebook || typeof window.STATE.tutorialNotebook !== 'object') {
    window.STATE.tutorialNotebook = { entries: {} };
  }
  if (!window.STATE.tutorialNotebook.entries || typeof window.STATE.tutorialNotebook.entries !== 'object') {
    window.STATE.tutorialNotebook.entries = {};
  }

  const savedAt = Number(payload.savedAt) || Date.now();
  window.STATE.tutorialNotebook.entries[_pwNotebookKey(sid, i)] = {
    type: 'process-writing',
    sessionId: sid,
    stageIndex: i,
    text: payload.text || '',
    feedback: payload.feedback || null,
    aiDetection: payload.aiDetection || null,
    savedAt,
    timestamp: new Date(savedAt).toISOString(),
    updatedAt: new Date(savedAt).toISOString(),
  };

  const timerKey = `${sid}:${i}`;
  const existing = _pwSaveTimers.get(timerKey);
  if (existing) clearTimeout(existing);
  _pwSaveTimers.set(timerKey, setTimeout(() => {
    window.saveState?.().catch(() => {});
  }, 700));
}

function _pwPersist(sid, i) {
  const ta = document.getElementById(`pw-ta-${sid}-${i}`);
  const fbEl = document.getElementById(`pw-fb-${sid}-${i}`);
  if (!ta) return;
  try {
    const now = new Date();
    const payload = {
      text: ta.value,
      feedback: fbEl?.innerHTML || null,
      aiDetection: window._pwAiDetection?.[`${sid}:${i}`] || null,
      savedAt: now.getTime(),
    };
    localStorage.setItem(_pwStorageKey(sid, i), JSON.stringify(payload));
    _pwScheduleStateSave(sid, i, payload);
    _pwSetSaveIndicator(sid, i, now);
  } catch {}
}

function _pwRestore(sid, i) {
  const fromState = _pwRestoreFromState(sid, i);
  if (fromState) return fromState;
  try {
    const raw = localStorage.getItem(_pwStorageKey(sid, i));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _pwSetSaveIndicator(sid, i, dateObj = null) {
  const el = document.getElementById(`pw-save-${sid}-${i}`);
  if (!el) return;
  if (!dateObj) dateObj = new Date();
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  el.textContent = `Last saved at ${h}:${m}`;
  el.style.color = 'var(--green)';
}

// ── Pomodoro state (global, one timer at a time) ──────────
window._pom = window._pom || {
  interval:  null,
  seconds:   25 * 60,
  mode:      'work',   // 'work' | 'break'
  running:   false,
  cycle:     0,
  targetId:  null,
};

// ── Main render ───────────────────────────────
export function renderSessionPlan(cfg, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  window._spSessionCfg = window._spSessionCfg || {};
  window._spSessionCfg[cfg.id] = cfg;
  el.innerHTML = _buildPlan(cfg);
  const roleSelect = document.getElementById(`sp-role-${cfg.id}`);
  if (roleSelect) _spSetRoleView(cfg.id, roleSelect.value);
}

function _buildPlan(cfg) {
  const isContact = cfg.type === 'contact';
  const color     = isContact ? 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' : 'linear-gradient(135deg,#1a3a2a,#15803d)';
  const typeLabel = isContact ? '90-Minute Contact Session' : '45-Minute Tutorial Session';
  const userRole = (window.STATE?.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student').toLowerCase();
  const defaultView = userRole === 'lecturer' ? 'lecturer' : userRole === 'tutor' ? 'tutor' : 'student';
  const roleOptions = userRole === 'lecturer'
    ? ['lecturer', 'tutor', 'student']
    : userRole === 'tutor'
      ? ['tutor', 'student']
      : ['student'];

  return `
    <div class="sp-wrapper" id="sp-root-${cfg.id}" data-sp-session="${cfg.id}" data-sp-view="${defaultView}">

      <!-- Hero -->
      <div class="sp-hero" style="background:${color};">
        <div class="sp-hero-left">
          <div class="sp-hero-type">${typeLabel} · ${cfg.phase}</div>
          <h1 class="sp-hero-title">${cfg.title}</h1>
          <p class="sp-hero-sub">${cfg.subtitle}</p>
          <div class="sp-hero-tags">
            <span class="sp-tag">📚 Pre-work required</span>
            <span class="sp-tag">🔄 Flipped classroom</span>
            ${cfg.tags?.map(t => `<span class="sp-tag">${t}</span>`).join('') || ''}
          </div>
        </div>
        <div class="sp-hero-icon">${isContact ? '🏫' : '👥'}</div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:white;border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:12px 0 14px 0;">
        <button class="sp-pom-btn start" style="border-radius:10px;" onclick="_spOpenPresentation('${cfg.id}')">🖥️ Presentation Mode</button>
        <label style="font-size:12px;color:var(--muted);font-weight:700;">View as</label>
        <select id="sp-role-${cfg.id}" onchange="_spSetRoleView('${cfg.id}', this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
          ${roleOptions.map(r => `<option value="${r}" ${r === defaultView ? 'selected' : ''}>${r[0].toUpperCase() + r.slice(1)} View</option>`).join('')}
        </select>
      </div>

      <div class="sp-section" style="margin-top:0;">
        <div class="sp-section-label">🧭 Class Workflow</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${cfg.blocks.map((b, i) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:#fff;font-size:12px;color:var(--navy);">${i + 1}. ${b.title}</span>`).join('')}
        </div>
      </div>

      <!-- Two-col layout: plan + tools -->
      <div class="sp-body">
        <div class="sp-main">

          <!-- Pre-session requirements -->
          <div class="sp-section">
            <div class="sp-section-label">📋 Pre-Session Requirements</div>
            <div class="sp-prework-box">
              <div class="sp-prework-note">Students must complete ALL of the following before arriving. The session assumes this work is done.</div>
              <ul class="sp-prework-list">
                ${cfg.preWork.map(p => `<li><strong>${p.item}</strong>${p.detail ? ` — ${p.detail}` : ''}</li>`).join('')}
              </ul>
              ${cfg.preWorkNote ? `<div class="sp-prework-warn">⚠️ ${cfg.preWorkNote}</div>` : ''}
            </div>
          </div>

          <!-- Session goal -->
          <div class="sp-section">
            <div class="sp-section-label">🎯 Session Goal</div>
            <div class="sp-goal-box">${cfg.goal}</div>
          </div>

          <!-- Timeline -->
          <div class="sp-section">
            <div class="sp-section-label">⏱ Session Timeline</div>
            <div class="sp-timeline">
              ${cfg.blocks.map((b, i) => _buildBlock(b, i, cfg.id)).join('')}
            </div>
          </div>

          <!-- Facilitator notes -->
          ${cfg.facilitatorNotes ? `
            <div class="sp-section" data-min-role="lecturer">
              <div class="sp-section-label">📝 Facilitator Notes</div>
              <div class="sp-notes-box">
                ${cfg.facilitatorNotes.map(n => `<div class="sp-note"><span class="sp-note-icon">•</span><p>${n}</p></div>`).join('')}
              </div>
            </div>` : ''}

          <!-- Exit ticket -->
          ${cfg.exitTicket ? `
            <div class="sp-section">
              <div class="sp-section-label">🎫 Exit Ticket</div>
              <div class="sp-exit-box">
                <p class="sp-exit-prompt">${cfg.exitTicket.prompt}</p>
                ${cfg.exitTicket.stems ? `
                  <div class="sp-exit-stems">
                    ${cfg.exitTicket.stems.map(s => `<div class="sp-exit-stem">"${s}…"</div>`).join('')}
                  </div>` : ''}
                <div class="sp-exit-note">Time: ${cfg.exitTicket.time}. Collect ${cfg.exitTicket.collect}.</div>
              </div>
            </div>` : ''}

        </div>

        <!-- Right panel: tools -->
        <div class="sp-tools-panel" data-min-role="tutor">
          ${_buildPomodoro(cfg.id)}
          ${_buildProcessWriting(cfg.id, cfg.processWritingStages)}
          ${cfg.resources ? _buildResources(cfg.resources) : ''}
          ${cfg.differentiations ? _buildDiff(cfg.differentiations) : ''}
        </div>
      </div>
    </div>`;
}

// ── Activity block renderer ───────────────────
function _buildBlock(b, i, sessionId) {
  const typeConfig = {
    'activation':    { icon: '⚡', color: '#fbbf24', label: 'Activation' },
    'pomodoro':      { icon: '🍅', color: '#ef4444', label: 'Pomodoro Work Block' },
    'think-pair':    { icon: '💬', color: '#8b5cf6', label: 'Think–Pair–Share' },
    'close-read':    { icon: '🔍', color: '#0891b2', label: 'Close Reading' },
    'process-write': { icon: '✍️', color: '#0d9488', label: 'Process Writing' },
    'peer-feedback': { icon: '🤝', color: '#15803d', label: 'Peer Feedback' },
    'discussion':    { icon: '🗣️', color: '#6366f1', label: 'Discussion' },
    'jigsaw':        { icon: '🧩', color: '#f59e0b', label: 'Jigsaw Activity' },
    'gallery-walk':  { icon: '🖼️', color: '#ec4899', label: 'Gallery Walk' },
    'live-demo':     { icon: '🖥️', color: '#334155', label: 'Live Demonstration' },
    'workshop':      { icon: '🔧', color: '#7c3aed', label: 'Artefact Workshop' },
    'diagnostic':    { icon: '📊', color: '#0369a1', label: 'Diagnostic Check' },
    'mini-lesson':   { icon: '📣', color: '#b45309', label: 'Mini-Lesson' },
    'revision':      { icon: '🔄', color: '#059669', label: 'Revision' },
    'break':         { icon: '☕', color: '#94a3b8', label: 'Break' },
  };

  const tc = typeConfig[b.type] || { icon: '📌', color: '#64748b', label: b.type };

  const isPom = b.type === 'pomodoro';

  return `
    <div class="sp-block ${isPom ? 'sp-block-pom' : ''}">
      <div class="sp-block-time">
        <div class="sp-time-start">${b.time}</div>
        <div class="sp-time-dur">${b.duration}m</div>
      </div>
      <div class="sp-block-bar" style="background:${tc.color};"></div>
      <div class="sp-block-content">
        <div class="sp-block-head">
          <span class="sp-act-type" style="color:${tc.color};">${tc.icon} ${tc.label}</span>
          <span class="sp-block-title">${b.title}</span>
        </div>
        <p class="sp-block-desc">${b.description}</p>
        ${b.steps ? `<ol class="sp-steps">${b.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
        ${b.facilitatorScript ? `<div class="sp-script" data-min-role="tutor"><span class="sp-script-label">Script:</span> <em>"${b.facilitatorScript}"</em></div>` : ''}
        ${b.materials ? `<div class="sp-materials">Materials: ${b.materials.map(m => `<span class="sp-material">${m}</span>`).join('')}</div>` : ''}
        ${isPom ? `<button class="sp-pom-launch" onclick="_launchPomodoro(${b.pomMinutes || 25}, '${sessionId}-${i}')">
          🍅 Start ${b.pomMinutes || 25}-minute Pomodoro
        </button>` : ''}
      </div>
    </div>`;
}

// ── Pomodoro widget ───────────────────────────
function _buildPomodoro(sessionId) {
  return `
    <div class="sp-tool-card sp-pom-card" id="pom-card-${sessionId}">
      <div class="sp-tool-label">🍅 Pomodoro Timer</div>
      <div class="sp-pom-display" id="pom-display-${sessionId}">25:00</div>
      <div class="sp-pom-mode" id="pom-mode-${sessionId}">Work block</div>
      <div class="sp-pom-progress-ring">
        <svg width="120" height="120" id="pom-ring-${sessionId}">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" stroke-width="8"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#ef4444" stroke-width="8"
            stroke-dasharray="326.7" stroke-dashoffset="0"
            id="pom-arc-${sessionId}"
            style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .5s;"/>
        </svg>
        <div class="sp-pom-inner">
          <div class="sp-pom-big" id="pom-big-${sessionId}">25:00</div>
          <div class="sp-pom-cycle" id="pom-cycles-${sessionId}">Cycle 0</div>
        </div>
      </div>
      <div class="sp-pom-controls">
        <button class="sp-pom-btn start" onclick="_pomControl('start','${sessionId}')">▶ Start</button>
        <button class="sp-pom-btn pause" onclick="_pomControl('pause','${sessionId}')">⏸ Pause</button>
        <button class="sp-pom-btn reset" onclick="_pomControl('reset','${sessionId}')">↺ Reset</button>
      </div>
      <div class="sp-pom-presets">
        <span class="sp-pom-label-sm">Quick set:</span>
        <button class="sp-pom-preset" onclick="_pomSet(25,'${sessionId}')">25m</button>
        <button class="sp-pom-preset" onclick="_pomSet(20,'${sessionId}')">20m</button>
        <button class="sp-pom-preset" onclick="_pomSet(15,'${sessionId}')">15m</button>
        <button class="sp-pom-preset" onclick="_pomSet(10,'${sessionId}')">10m</button>
        <button class="sp-pom-preset" onclick="_pomSet(5,'${sessionId}')">5m</button>
      </div>
      <div class="sp-pom-cycles-row" id="pom-cycle-dots-${sessionId}">
        <span class="sp-cycle-dot" id="pom-d0-${sessionId}"></span>
        <span class="sp-cycle-dot" id="pom-d1-${sessionId}"></span>
        <span class="sp-cycle-dot" id="pom-d2-${sessionId}"></span>
        <span class="sp-cycle-dot" id="pom-d3-${sessionId}"></span>
      </div>
    </div>`;
}

// ── Process writing widget ────────────────────
function _buildProcessWriting(sessionId, stages) {
  if (!stages?.length) return '';

  return `
    <div class="sp-tool-card sp-pw-card">
      <div class="sp-tool-label">✍️ Process Writing Stages</div>
      <div class="sp-pw-stages">
        ${stages.map((s, i) => `
          <div class="sp-pw-stage" id="pw-stage-${sessionId}-${i}">
            <div class="sp-pw-stage-head" onclick="_togglePWStage('${sessionId}',${i})">
              <span class="sp-pw-num">${i + 1}</span>
              <span class="sp-pw-stage-title">${s.icon} ${s.title}</span>
              <span class="sp-pw-chevron">▾</span>
            </div>
            <div class="sp-pw-stage-body" id="pw-body-${sessionId}-${i}" style="display:none;">
              <p class="sp-pw-desc">${s.description}</p>
              ${s.time ? `<div class="sp-pw-time">⏱ ${s.time}</div>` : ''}
              ${s.prompts ? `<ul class="sp-pw-prompts">${s.prompts.map(p => `<li>"${p}"</li>`).join('')}</ul>` : ''}
              ${s.feedbackStems ? `
                <div class="sp-pw-stems">
                  <div class="sp-pw-stems-label">Feedback sentence starters:</div>
                  ${s.feedbackStems.map(f => `<div class="sp-pw-stem">"${f}"</div>`).join('')}
                </div>` : ''}
              ${s.aiPrompt ? `
                <div class="sp-pw-ai">
                  <div class="sp-pw-ai-label">AI feedback available</div>
                  <textarea id="pw-ta-${sessionId}-${i}" class="sp-pw-ta" rows="3"
                    placeholder="Paste student writing here for AI analysis…"
                    oninput="_pwAutoSave('${sessionId}',${i})"></textarea>
                  <div style="display:flex;gap:10px;align-items:center;margin-top:8px;">
                    <button class="sp-pw-ai-btn"
                      onclick="_getPWFeedback('${sessionId}',${i},'${encodeURIComponent(s.aiPrompt)}')">Get feedback</button>
                    <button style="padding:6px 12px;font-size:13px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;" onclick="_pwClear('${sessionId}',${i})">Clear</button>
                    <span id="pw-save-${sessionId}-${i}" style="font-size:12px;color:var(--green);">Last saved at --:--</span>
                  </div>
                  <div id="pw-fb-${sessionId}-${i}" class="sp-pw-fb"></div>
                </div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Resources widget ──────────────────────────
function _buildResources(resources) {
  return `
    <div class="sp-tool-card">
      <div class="sp-tool-label">🗂️ Resources & Materials</div>
      <ul class="sp-resources">
        ${resources.map(r => `
          <li class="sp-resource-item">
            <span class="sp-resource-icon">${r.icon || '📄'}</span>
            <div>
              <div class="sp-resource-name">${r.name}</div>
              ${r.note ? `<div class="sp-resource-note">${r.note}</div>` : ''}
            </div>
          </li>`).join('')}
      </ul>
    </div>`;
}

// ── Differentiation widget ────────────────────
function _buildDiff(diffs) {
  return `
    <div class="sp-tool-card" data-min-role="lecturer">
      <div class="sp-tool-label">🎯 Differentiation</div>
      <div class="sp-diff-list">
        ${diffs.map(d => `
          <div class="sp-diff-item">
            <div class="sp-diff-label">${d.for}</div>
            <p class="sp-diff-action">${d.action}</p>
          </div>`).join('')}
      </div>
    </div>`;
}

const _SP_ROLE_RANK = { student: 1, tutor: 2, lecturer: 3 };

window._spSetRoleView = (sessionId, role) => {
  const root = document.getElementById(`sp-root-${sessionId}`);
  if (!root) return;
  const selected = _SP_ROLE_RANK[role] ? role : 'student';
  root.dataset.spView = selected;

  root.querySelectorAll('[data-min-role]').forEach((node) => {
    const minRole = node.getAttribute('data-min-role') || 'student';
    const allowed = (_SP_ROLE_RANK[selected] || 1) >= (_SP_ROLE_RANK[minRole] || 1);
    node.style.display = allowed ? '' : 'none';
  });
};

window._spDeckState = window._spDeckState || null;

const _SP_VISUAL_MAP = {
  overview: { icon: '🧭', label: 'Session Overview' },
  workflow: { icon: '🗺️', label: 'Class Workflow' },
  activation: { icon: '⚡', label: 'Activation' },
  pomodoro: { icon: '🍅', label: 'Focused Work' },
  'think-pair': { icon: '💬', label: 'Peer Discussion' },
  'close-read': { icon: '🔍', label: 'Close Reading' },
  'process-write': { icon: '✍️', label: 'Process Writing' },
  'peer-feedback': { icon: '🤝', label: 'Peer Feedback' },
  discussion: { icon: '🗣️', label: 'Discussion' },
  jigsaw: { icon: '🧩', label: 'Jigsaw' },
  'gallery-walk': { icon: '🖼️', label: 'Gallery Walk' },
  'live-demo': { icon: '🖥️', label: 'Live Demo' },
  workshop: { icon: '🔧', label: 'Workshop' },
  diagnostic: { icon: '📊', label: 'Diagnostic' },
  'mini-lesson': { icon: '📣', label: 'Mini-Lesson' },
  revision: { icon: '🔄', label: 'Revision' },
  break: { icon: '☕', label: 'Break' },
};

function _spVisualSrc(type = 'overview', title = '') {
  const vis = _SP_VISUAL_MAP[type] || _SP_VISUAL_MAP.overview;
  const safeTitle = String(title || vis.label).replace(/[<&>]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#g)"/>
      <circle cx="560" cy="80" r="52" fill="rgba(255,255,255,0.08)"/>
      <circle cx="80" cy="300" r="70" fill="rgba(255,255,255,0.06)"/>
      <text x="44" y="138" font-size="78" fill="#f8fafc">${vis.icon}</text>
      <text x="44" y="198" font-size="34" font-family="Arial, sans-serif" fill="#e2e8f0">${vis.label}</text>
      <text x="44" y="236" font-size="20" font-family="Arial, sans-serif" fill="#94a3b8">${safeTitle}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function _spBuildSlides(cfg) {
  const workflow = cfg.blocks.map((b, i) => `${i + 1}. ${b.time} · ${b.title}`).join('\n');
  const slides = [
    {
      heading: cfg.title,
      subheading: `${cfg.type === 'contact' ? 'Contact' : 'Tutorial'} session · ${cfg.phase}`,
      body: cfg.goal,
      bullets: [
        `Duration: ${cfg.type === 'contact' ? '90' : '45'} minutes`,
        `Focus: ${cfg.subtitle}`,
      ],
      visualType: 'overview',
    },
    {
      heading: 'Class Workflow',
      subheading: 'Session sequence overview',
      body: workflow,
      bullets: [],
      visualType: 'workflow',
    },
  ];

  cfg.blocks.forEach((b) => {
    slides.push({
      heading: `${b.time} · ${b.title}`,
      subheading: `${b.duration} minutes · ${b.type}`,
      body: b.description,
      bullets: [
        ...(b.steps || []),
      ],
      visualType: b.type || 'overview',
    });
  });

  return slides;
}

function _spRenderDeck() {
  const st = window._spDeckState;
  if (!st) return;
  const slide = st.slides[st.index];
  const total = st.slides.length;

  const title = document.getElementById('sp-deck-title');
  const sub = document.getElementById('sp-deck-sub');
  const body = document.getElementById('sp-deck-body');
  const bullets = document.getElementById('sp-deck-bullets');
  const count = document.getElementById('sp-deck-count');
  const progress = document.getElementById('sp-deck-progress');
  const visual = document.getElementById('sp-deck-visual');

  if (title) title.textContent = slide.heading || '';
  if (sub) sub.textContent = slide.subheading || '';
  if (body) body.textContent = slide.body || '';
  if (bullets) bullets.innerHTML = (slide.bullets || []).length
    ? `<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;">${slide.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
    : '';
  if (count) count.textContent = `Slide ${st.index + 1} / ${total}`;
  if (progress) progress.style.width = `${Math.round(((st.index + 1) / total) * 100)}%`;
  if (visual) {
    visual.src = _spVisualSrc(slide.visualType || 'overview', slide.heading || 'Session');
    visual.alt = `${slide.heading || 'Session'} visual`;
  }
}

window._spOpenPresentation = (sessionId) => {
  const cfg = window._spSessionCfg?.[sessionId];
  if (!cfg) return;
  const slides = _spBuildSlides(cfg);
  window._spDeckState = { sessionId, slides, index: 0 };

  const existing = document.getElementById('sp-deck-overlay');
  if (existing) existing.remove();

  const controls = document.querySelector(`#sp-root-${sessionId} .sp-section`)?.previousElementSibling;
  const roleBar = document.querySelector(`#sp-root-${sessionId} select[id^="sp-role-"]`)?.closest('div');
  if (roleBar) roleBar.style.display = 'none';
  if (controls && controls.id !== 'sp-deck-overlay') {
    // no-op placeholder; keep for stable structure
  }

  const overlay = document.createElement('div');
  overlay.id = 'sp-deck-overlay';
  overlay.className = 'sp-deck-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#070b1b;z-index:99999;color:white;display:flex;align-items:center;justify-content:center;padding:28px;';
  overlay.innerHTML = `
    <div class="sp-deck-clock" id="sp-deck-clock"></div>
    <div class="sp-deck-inner" role="dialog" aria-modal="true">
      <div class="sp-deck-controls">
        <div id="sp-deck-count" class="sp-deck-count"></div>
        <div class="sp-deck-btns">
          <button onclick="_spDeckFullscreen()">⛶ Full Screen</button>
          <button onclick="_spPrevSlide()">← Prev</button>
          <button onclick="_spNextSlide()">Next →</button>
          <button onclick="_spClosePresentation()">Close</button>
        </div>
      </div>
      <div class="sp-deck-progress">
        <div id="sp-deck-progress" class="sp-deck-progress-bar"></div>
      </div>
      <div class="sp-deck-frame">
        <div class="sp-deck-content">
          <div>
            <h1 id="sp-deck-title"></h1>
            <div id="sp-deck-sub" class="sp-deck-sub"></div>
            <div id="sp-deck-body" class="sp-deck-body"></div>
            <div id="sp-deck-bullets" class="sp-deck-bullets"></div>
          </div>
          <div class="sp-deck-visual-wrap">
            <img id="sp-deck-visual" alt="Session visual" />
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  if (window._spDeckClockInterval) {
    clearInterval(window._spDeckClockInterval);
  }
  window._spDeckClockTick = () => {
    const clock = document.getElementById('sp-deck-clock');
    if (clock) {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  window._spDeckClockTick();
  window._spDeckClockInterval = setInterval(() => window._spDeckClockTick(), 1000);

  window._spDeckKeyHandler = (e) => {
    if (e.key === 'ArrowRight') window._spNextSlide();
    if (e.key === 'ArrowLeft') window._spPrevSlide();
    if (e.key === 'Escape') window._spClosePresentation();
  };
  document.addEventListener('keydown', window._spDeckKeyHandler);
  window._spDeckFullscreen();
  _spRenderDeck();
};

  window._spDeckFullscreen = async () => {
    const overlay = document.getElementById('sp-deck-overlay');
    if (!overlay) return;
    try {
    if (!document.fullscreenElement && overlay.requestFullscreen) {
      await overlay.requestFullscreen();
    }
  } catch {
    // Ignore if fullscreen is blocked by browser policy
  }
};

window._spClosePresentation = () => {
  const st = window._spDeckState;
  if (st?.sessionId) {
    const roleBar = document.querySelector(`#sp-root-${st.sessionId} select[id^="sp-role-"]`)?.closest('div');
    if (roleBar) roleBar.style.display = '';
  }
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  document.getElementById('sp-deck-overlay')?.remove();
  if (window._spDeckKeyHandler) {
    document.removeEventListener('keydown', window._spDeckKeyHandler);
  }
  window._spDeckState = null;
  if (window._spDeckClockInterval) {
    clearInterval(window._spDeckClockInterval);
    window._spDeckClockInterval = null;
  }
  };

window._spNextSlide = () => {
  const st = window._spDeckState;
  if (!st) return;
  st.index = Math.min(st.slides.length - 1, st.index + 1);
  _spRenderDeck();
};

window._spPrevSlide = () => {
  const st = window._spDeckState;
  if (!st) return;
  st.index = Math.max(0, st.index - 1);
  _spRenderDeck();
};

// ── Pomodoro handlers ─────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 52; // r=52

window._pomState = window._pomState || {};

window._pomControl = (action, sid) => {
  let st = window._pomState[sid];
  if (!st) {
    st = { seconds: 25*60, totalSeconds: 25*60, mode: 'work', cycle: 0, running: false, interval: null };
    window._pomState[sid] = st;
  }

  if (action === 'start' && !st.running) {
    st.running = true;
    st.interval = setInterval(() => {
      st.seconds--;
      if (st.seconds < 0) {
        clearInterval(st.interval);
        st.running = false;
        if (st.mode === 'work') {
          st.cycle++;
          st.mode = 'break';
          st.seconds = 5 * 60;
          st.totalSeconds = 5 * 60;
          _pomPlaySound('break');
        } else {
          st.mode = 'work';
          st.seconds = 25 * 60;
          st.totalSeconds = 25 * 60;
          _pomPlaySound('work');
        }
        _pomUpdate(sid);
        // Auto-start next
        setTimeout(() => window._pomControl('start', sid), 800);
      } else {
        _pomUpdate(sid);
      }
    }, 1000);
    _pomUpdate(sid);
  } else if (action === 'pause') {
    clearInterval(st.interval);
    st.running = false;
  } else if (action === 'reset') {
    clearInterval(st.interval);
    st.running = false;
    st.seconds = 25 * 60;
    st.totalSeconds = 25 * 60;
    st.mode = 'work';
    st.cycle = 0;
    _pomUpdate(sid);
  }
};

window._pomSet = (mins, sid) => {
  if (!window._pomState[sid]) window._pomState[sid] = { cycle: 0, running: false, interval: null, mode: 'work' };
  const st = window._pomState[sid];
  clearInterval(st.interval);
  st.running = false;
  st.seconds = mins * 60;
  st.totalSeconds = mins * 60;
  st.mode = 'work';
  _pomUpdate(sid);
};

window._launchPomodoro = (mins, sid) => {
  window._pomSet(mins, sid);
  // Scroll to pom card
  const card = document.getElementById(`pom-card-${sid.split('-')[0]}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => window._pomControl('start', sid), 300);
};

function _pomUpdate(sid) {
  const st = window._pomState[sid];
  if (!st) return;

  const m    = Math.floor(st.seconds / 60);
  const s    = st.seconds % 60;
  const disp = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct  = st.seconds / st.totalSeconds;
  const offset = CIRCUMFERENCE * (1 - pct);

  // Find the session card id (first part before first dash that isn't a number)
  const cardSid = sid.includes('-') ? sid.split('-')[0] : sid;

  const bigEl  = document.getElementById(`pom-big-${cardSid}`);
  const dispEl = document.getElementById(`pom-display-${cardSid}`);
  const modeEl = document.getElementById(`pom-mode-${cardSid}`);
  const arcEl  = document.getElementById(`pom-arc-${cardSid}`);
  const cycleEl= document.getElementById(`pom-cycles-${cardSid}`);
  const card   = document.getElementById(`pom-card-${cardSid}`);

  if (bigEl)  bigEl.textContent  = disp;
  if (dispEl) dispEl.textContent = disp;
  if (arcEl) {
    arcEl.style.strokeDashoffset = offset;
    arcEl.style.stroke = st.mode === 'work' ? '#ef4444' : '#22c55e';
  }
  if (modeEl) {
    modeEl.textContent = st.mode === 'work' ? `Work block ${st.cycle + 1}` : '☕ Break time';
    modeEl.style.color = st.mode === 'work' ? '#ef4444' : '#22c55e';
  }
  if (cycleEl) cycleEl.textContent = `Cycle ${st.cycle}`;
  if (card)    card.classList.toggle('pom-running', st.running);

  // Cycle dots
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pom-d${i}-${cardSid}`);
    if (dot) dot.classList.toggle('filled', i < st.cycle);
  }
}

function _pomPlaySound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = type === 'break' ? 880 : 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

// ── Process writing handlers ──────────────────
window._togglePWStage = (sid, i) => {
  const body = document.getElementById(`pw-body-${sid}-${i}`);
  const head = document.getElementById(`pw-stage-${sid}-${i}`);
  if (!body) return;
  const open = body.style.display !== 'none';
  const opening = open ? false : true;
  body.style.display = opening ? 'block' : 'none';
  head?.classList.toggle('pw-open', opening);

  // Restore saved text and feedback when opening
  if (opening) {
    const ta = document.getElementById(`pw-ta-${sid}-${i}`);
    const fbEl = document.getElementById(`pw-fb-${sid}-${i}`);
    const saved = _pwRestore(sid, i);
    if (saved) {
      if (ta) ta.value = saved.text;
      if (fbEl && saved.feedback) fbEl.innerHTML = saved.feedback;
      window._pwAiDetection = window._pwAiDetection || {};
      window._pwAiDetection[`${sid}:${i}`] = saved.aiDetection || null;
      _pwSetSaveIndicator(sid, i, new Date(saved.savedAt));
    }
  }
};

window._getPWFeedback = async (sid, i, encodedPrompt) => {
  const prompt    = decodeURIComponent(encodedPrompt);
  const ta        = document.getElementById(`pw-ta-${sid}-${i}`);
  const fbEl      = document.getElementById(`pw-fb-${sid}-${i}`);
  const text      = ta?.value?.trim() ?? '';
  window._pwAiDetection = window._pwAiDetection || {};
  if (!text || text.length < 20) { if (ta) ta.style.borderColor = '#ef4444'; return; }
  if (fbEl) fbEl.innerHTML = '<span class="sp-pw-loading">Analysing…</span>';

  const fullPrompt = `${prompt}\n\nStudent writing:\n"${text}"\n\nGive 3–4 sentences of honest, specific feedback. Quote the student's words where relevant. Be direct. No sycophantic openers.`;
  const sidParts = String(sid).split('-');
  const unitId = sidParts.find(p => /^u\d+/i.test(p));
  const baseline = unitId ? getStudentBaselineProfile(unitId) : null;
  const aiScore = scoreSubmissionForAI(text, baseline);
  window._pwAiDetection[`${sid}:${i}`] = aiScore;
  if (window.STATE) {
    if (!window.STATE.progress.__sessions) window.STATE.progress.__sessions = {};
    if (!window.STATE.progress.__sessions[sid]) window.STATE.progress.__sessions[sid] = { processWritingAiDetections: {} };
    if (!window.STATE.progress.__sessions[sid].processWritingAiDetections) {
      window.STATE.progress.__sessions[sid].processWritingAiDetections = {};
    }
    window.STATE.progress.__sessions[sid].processWritingAiDetections[i] = aiScore;
    if (window.saveState) window.saveState();
  }
  const aiWarn = aiScore && aiScore.isRiskFlag ? `
    <div style="background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:12px;margin:0 0 10px 0;">
      <div style="display:flex;gap:12px;align-items:flex-start;font-size:13px;">
        <div style="font-size:20px;flex-shrink:0;">⚠️</div>
        <div style="flex:1;">
          <div style="font-weight:700;color:#991b1b;margin-bottom:4px;">Academic Integrity Alert</div>
          <p style="color:#7f1d1d;margin:0 0 4px 0;font-size:12px;">${aiScore.recommendation}</p>
          <div style="font-size:11px;color:#7f1d1d;"><strong>Why:</strong> ${(aiScore.reasons || []).slice(0, 2).join(' ')}</div>
        </div>
      </div>
    </div>
  ` : '';

  try {
    const ans = await _aiChat(fullPrompt, { maxTokens: 300 });
    if (fbEl) fbEl.innerHTML = `${aiWarn}<div class="sp-pw-fb-text">💬 ${ans}</div>`;
    _pwPersist(sid, i);
  } catch (err) {
    if (fbEl) fbEl.innerHTML = `${aiWarn}<div class="sp-pw-fb-text">AI unavailable: ${err.message}</div>`;
    _pwPersist(sid, i);
  }
};

window._pwAutoSave = (sid, i) => {
  _pwPersist(sid, i);
};

window._pwClear = (sid, i) => {
  if (!confirm('Clear your saved writing and feedback for this stage?')) return;
  const ta = document.getElementById(`pw-ta-${sid}-${i}`);
  const fbEl = document.getElementById(`pw-fb-${sid}-${i}`);
  const saveEl = document.getElementById(`pw-save-${sid}-${i}`);

  if (ta) ta.value = '';
  if (fbEl) fbEl.innerHTML = '';
  if (window._pwAiDetection) window._pwAiDetection[`${sid}:${i}`] = null;
  if (saveEl) { saveEl.textContent = 'Cleared'; saveEl.style.color = 'var(--muted)'; }

  try { localStorage.removeItem(_pwStorageKey(sid, i)); } catch {}
  const timerKey = `${sid}:${i}`;
  const existing = _pwSaveTimers.get(timerKey);
  if (existing) clearTimeout(existing);
  _pwSaveTimers.delete(timerKey);
  if (window.STATE?.tutorialNotebook?.entries) {
    delete window.STATE.tutorialNotebook.entries[_pwNotebookKey(sid, i)];
    window.saveState?.().catch(() => {});
  }
};

// src/components/session-plan.js
// ─────────────────────────────────────────────
// Session Plan Component — Contact (90 min) and Tutorial (45 min)
// Includes: live Pomodoro timer, process writing stages,
// activity cards, facilitator notes, exit tickets
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';
import { scoreSubmissionForAI, getStudentBaselineProfile } from '../ai-detection.js';
import { persistLocalStateSoon } from '../state.js';

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
  persistLocalStateSoon('process-writing');

  const timerKey = `${sid}:${i}`;
  const existing = _pwSaveTimers.get(timerKey);
  if (existing) clearTimeout(existing);
  _pwSaveTimers.set(timerKey, setTimeout(() => {
    window.saveState?.();
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
  const isContact = cfg.type === 'contact';
  const slides = [
    // Title slide — full-width hero
    {
      layout: 'hero',
      heading: cfg.title,
      subheading: cfg.subtitle,
      accent: isContact ? '#3b82f6' : '#22c55e',
      gradient: isContact ? 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 40%,#1d4ed8 100%)' : 'linear-gradient(135deg,#0f172a 0%,#1a3a2a 40%,#15803d 100%)',
      icon: isContact ? '🏫' : '👥',
      meta: `${cfg.phase} · ${isContact ? '90' : '45'} minutes`,
    },
    // Goal slide
    {
      layout: 'focus',
      heading: 'Session Goal',
      body: cfg.goal,
      icon: '🎯',
      accent: '#f59e0b',
    },
    // Workflow overview — numbered steps
    {
      layout: 'workflow',
      heading: 'Class Workflow',
      steps: cfg.blocks.map((b, i) => ({
        num: i + 1,
        time: b.time,
        title: b.title,
        duration: b.duration,
        type: b.type,
        icon: (_SP_VISUAL_MAP[b.type] || _SP_VISUAL_MAP.overview).icon,
      })),
    },
  ];

  // Pre-work slide
  if (cfg.preWork?.length) {
    slides.push({
      layout: 'checklist',
      heading: 'Pre-Session Requirements',
      icon: '📋',
      accent: '#ef4444',
      items: cfg.preWork.map(p => ({
        text: p.item,
        detail: p.detail || '',
      })),
      warning: cfg.preWorkNote || null,
    });
  }

  // Individual block slides
  cfg.blocks.forEach((b, i) => {
    const vis = _SP_VISUAL_MAP[b.type] || _SP_VISUAL_MAP.overview;
    slides.push({
      layout: (b.steps?.length) ? 'steps' : 'focus',
      heading: b.title,
      subheading: `${b.time} · ${b.duration} min`,
      body: b.description,
      bullets: b.steps || [],
      icon: vis.icon,
      accent: _blockAccent(b.type),
      blockNum: i + 1,
      totalBlocks: cfg.blocks.length,
      facilitatorScript: b.facilitatorScript || null,
    });
  });

  // Process writing stages (if present)
  if (cfg.processWritingStages?.length) {
    slides.push({
      layout: 'stages',
      heading: 'Process Writing Stages',
      icon: '✍️',
      stages: cfg.processWritingStages,
    });
  }

  // Inject interactive games mapped to this session
  const games = _SESSION_GAMES[cfg.id] || [];
  games.forEach(g => slides.push(g));

  return slides;
}

// ── Interactive Game Engine ─────────────────────────
// Games are mapped per session for maximum educational relevance.
// Each game is a slide with layout: 'game-*' that renders interactive content.

const _SESSION_GAMES = {
  // ── C1: AI in Education ──────────────────────
  c1: [
    {
      layout: 'game-ai-or-human',
      heading: 'AI or Human?',
      icon: '🤖',
      instruction: 'Read each paragraph. Decide: was it written by AI or a student?',
      items: [
        { text: 'Artificial intelligence in education presents both opportunities and challenges. As future teachers, we must consider the implications of AI-driven tools in our classrooms, particularly in the South African context where access to technology varies significantly across communities.', answer: 'human', reveal: 'Written by a 1st-year student — notice the personal voice and specific SA context.' },
        { text: 'The integration of artificial intelligence in educational settings represents a paradigm shift in pedagogical approaches. AI-powered tools can facilitate personalized learning experiences, enable real-time assessment feedback, and support educators in identifying at-risk students through predictive analytics.', answer: 'ai', reveal: 'AI-generated — notice the generic language, no personal stance, perfect but empty structure.' },
        { text: 'I think AI is scary because what if it takes my job one day? But also my cousin used ChatGPT to help study for matric and she passed everything. So maybe it depends on how you use it, not whether you use it.', answer: 'human', reveal: 'Student writing — authentic voice, personal example, honest uncertainty.' },
        { text: 'The pedagogical implications of AI adoption necessitate a comprehensive re-evaluation of assessment methodologies, curriculum design frameworks, and the fundamental nature of teacher-student interactions in contemporary educational ecosystems.', answer: 'ai', reveal: 'AI — overloaded with jargon, says nothing specific, no human perspective.' },
      ],
    },
    {
      layout: 'game-four-corners',
      heading: 'Four Corners',
      icon: '🧭',
      instruction: 'Move to the corner that matches your position. Be ready to defend it.',
      statement: 'Students should be allowed to use AI tools like ChatGPT for all their university assignments.',
      corners: [
        { label: 'Strongly Agree', color: '#22c55e', argument: 'AI is a tool like a calculator — banning it prepares students for a world that no longer exists.' },
        { label: 'Agree', color: '#3b82f6', argument: 'With proper guidelines, AI can enhance learning without replacing thinking.' },
        { label: 'Disagree', color: '#f59e0b', argument: 'Students need to develop foundational skills first before using AI shortcuts.' },
        { label: 'Strongly Disagree', color: '#ef4444', argument: 'AI use in assignments is academic dishonesty and undermines the purpose of education.' },
      ],
    },
  ],

  // ── C2: Algorithms & Filter Bubbles ──────────
  c2: [
    {
      layout: 'game-ai-or-human',
      heading: 'Headline or Hoax?',
      icon: '📰',
      instruction: 'Are these real headlines from South African news, or AI-generated fakes?',
      items: [
        { text: 'Department of Education announces AI tutors for all Grade 12 learners by 2026', answer: 'ai', reveal: 'Fake — AI-generated headline. No such announcement exists. Did it feel plausible? That\'s how filter bubbles work.' },
        { text: 'South African students spend average of 4.5 hours daily on social media', answer: 'human', reveal: 'Real — from a 2024 Digital Citizenship report. Your algorithm probably never showed you this.' },
        { text: 'University of Johannesburg launches Africa\'s first AI-powered student support chatbot', answer: 'human', reveal: 'Real — this actually happened. Did your search bubble surface it?' },
        { text: 'Study proves students who use TikTok perform 30% worse in academic writing', answer: 'ai', reveal: 'Fake — no such study. But it confirms existing biases, which is exactly how misinformation spreads.' },
      ],
    },
    {
      layout: 'game-standup',
      heading: 'Stand Up / Sit Down',
      icon: '🧍',
      instruction: 'Stand if the statement is TRUE. Stay seated if FALSE.',
      statements: [
        { text: 'Google shows the same search results to everyone.', answer: false, explain: 'False — Google personalises results based on location, search history, and browsing behaviour.' },
        { text: 'Your social media feed is curated by algorithms, not shown in chronological order.', answer: true, explain: 'True — engagement-based algorithms decide what you see, creating filter bubbles.' },
        { text: 'Using incognito mode stops websites from tracking you.', answer: false, explain: 'False — incognito only hides history locally. Websites, ISPs, and networks can still track you.' },
        { text: 'Two students sitting next to each other can get different results for the same Google search.', answer: true, explain: 'True — personalisation means the same query returns different results for different users.' },
        { text: 'AI-generated content always contains factual errors.', answer: false, explain: 'False — AI can be factually correct. The danger is that you can\'t tell when it isn\'t without verifying.' },
      ],
    },
  ],

  // ── C3: Critical Thinking & SIFT ─────────────
  c3: [
    {
      layout: 'game-spot-error',
      heading: 'Spot the Bias',
      icon: '🔍',
      instruction: 'Each statement contains a cognitive bias. Can you name it?',
      items: [
        { text: 'I read one article that says vaccines cause autism, so it must be true.', error: 'Confirmation bias + anecdotal evidence', explain: 'One source is never enough. The overwhelming scientific consensus says otherwise.' },
        { text: 'Everyone on my Twitter timeline agrees that online learning is better, so most people must think so.', error: 'False consensus effect + filter bubble', explain: 'Your timeline is curated. The people you follow are not representative of "most people."' },
        { text: 'This website looks professional and has a .org domain, so the information must be reliable.', error: 'Authority bias + appearance heuristic', explain: 'Anyone can buy a .org domain. Professional design ≠ credible information. Always check WHO is behind it.' },
        { text: 'I\'ve always believed this, so the new evidence against it must be wrong.', error: 'Belief perseverance / backfire effect', explain: 'When new evidence contradicts existing beliefs, we often reject the evidence rather than update our beliefs.' },
      ],
    },
    {
      layout: 'game-quiz',
      heading: 'SIFT Speed Round',
      icon: '⚡',
      instruction: '10 seconds per question. What does each letter in SIFT stand for?',
      questions: [
        { q: 'What does the S in SIFT stand for?', options: ['Search', 'Stop', 'Source', 'Study'], correct: 1, explain: 'STOP — before you share or use information, stop and check.' },
        { q: 'What does the I stand for?', options: ['Investigate', 'Interpret', 'Integrate', 'Inquire'], correct: 0, explain: 'INVESTIGATE the source — who is behind the information?' },
        { q: 'What does the F stand for?', options: ['Filter', 'Find better coverage', 'Fact-check', 'Follow'], correct: 1, explain: 'FIND BETTER COVERAGE — look for other sources reporting the same claim.' },
        { q: 'What does the T stand for?', options: ['Test', 'Think', 'Trace claims', 'Track'], correct: 2, explain: 'TRACE claims, quotes, and media back to the original context.' },
        { q: 'You find a shocking statistic on a blog. First SIFT step?', options: ['Share it quickly', 'Google the statistic', 'Stop and check the source', 'Ask a friend'], correct: 2, explain: 'Always STOP first. Don\'t react or share before verifying.' },
      ],
    },
  ],

  // ── C4: Deep Work ────────────────────────────
  c4: [
    {
      layout: 'game-standup',
      heading: 'Deep Work Truth or Myth',
      icon: '🧠',
      instruction: 'Stand if TRUE, sit if FALSE.',
      statements: [
        { text: 'Multitasking makes you more productive.', answer: false, explain: 'Myth — research shows task-switching reduces productivity by up to 40% and increases errors.' },
        { text: 'It takes an average of 23 minutes to refocus after a distraction.', answer: true, explain: 'True — University of California research found it takes 23 minutes and 15 seconds on average.' },
        { text: 'Checking your phone once during a study session has no measurable impact.', answer: false, explain: 'False — even a brief phone check creates a "attention residue" that lingers for minutes.' },
        { text: 'You can train your capacity for deep work like a muscle.', answer: true, explain: 'True — Cal Newport\'s research shows focused practice gradually increases your concentration capacity.' },
        { text: 'The best students study for the longest hours.', answer: false, explain: 'False — research shows quality (deep, focused work) matters far more than quantity.' },
      ],
    },
    {
      layout: 'game-challenge',
      heading: 'The Focus Challenge',
      icon: '🍅',
      instruction: 'Can you beat your own record?',
      challenge: 'Write as many complete sentences about "what deep work means for my studies" as you can in exactly 5 minutes. No phones, no talking. Count your sentences when the timer ends.',
      timer: 300,
      debrief: 'How many did you write? Was it harder than expected? What distracted you? This is what deep work feels like — uncomfortable at first, then powerful.',
    },
  ],

  // ── C5: Finding Sources ──────────────────────
  c5: [
    {
      layout: 'game-quiz',
      heading: 'Source or Sauce?',
      icon: '📚',
      instruction: 'Which of these would be acceptable as an academic source?',
      questions: [
        { q: 'A Wikipedia article about climate change', options: ['Acceptable', 'Not acceptable', 'Use for background only', 'Cite the references it lists'], correct: 2, explain: 'Wikipedia is useful for background reading, but cite the original sources it references — not Wikipedia itself.' },
        { q: 'A peer-reviewed journal article from 2019', options: ['Too old', 'Acceptable', 'Only if nothing newer exists', 'Depends on the field'], correct: 1, explain: 'Peer-reviewed articles are the gold standard. 2019 is recent enough for most fields.' },
        { q: 'A blog post by a professor at Harvard', options: ['Always acceptable', 'Never acceptable', 'Check if peer-reviewed', 'Acceptable as grey literature'], correct: 2, explain: 'Being from Harvard doesn\'t make it peer-reviewed. Check if it has been published in a journal.' },
        { q: 'A YouTube video with 10 million views', options: ['Views = credibility', 'Never cite videos', 'Check who made it and why', 'Only if it\'s a TED talk'], correct: 2, explain: 'Popularity ≠ credibility. Always investigate the creator\'s expertise and potential bias.' },
      ],
    },
    {
      layout: 'game-spot-error',
      heading: 'Abstract Jigsaw',
      icon: '🧩',
      instruction: 'These abstract sentences are scrambled. What is the correct order?',
      items: [
        { text: '1. Results showed a 34% improvement in critical thinking scores among the experimental group.', error: 'This is a RESULTS sentence — it reports findings.', explain: '' },
        { text: '2. This study investigated the impact of AI-assisted feedback on undergraduate writing quality.', error: 'This is a PURPOSE sentence — it belongs first.', explain: '' },
        { text: '3. The findings suggest that AI feedback tools, when combined with human instruction, can enhance academic writing development.', error: 'This is a CONCLUSION sentence — it belongs last.', explain: '' },
        { text: '4. A mixed-methods design was employed with 120 first-year students at a South African university.', error: 'This is a METHODS sentence — it explains how the study was done.', explain: '' },
      ],
    },
  ],

  // ── C7: Lateral Reading ──────────────────────
  c7: [
    {
      layout: 'game-ai-or-human',
      heading: 'Trustworthy or Tricky?',
      icon: '🕵️',
      instruction: 'Would a fact-checker trust this source? Vote YES or NO.',
      items: [
        { text: 'A news article on health benefits of a product, written by the company that sells it.', answer: 'ai', reveal: 'NO — massive conflict of interest. The company profits from positive claims.' },
        { text: 'A systematic review published in The Lancet, with declared funding and no conflicts of interest.', answer: 'human', reveal: 'YES — peer-reviewed, transparent funding, no conflicts. This is what reliable looks like.' },
        { text: 'A WhatsApp forward that says "doctors confirm" something, with no named doctors or links.', answer: 'ai', reveal: 'NO — unnamed sources, no verifiable claims, classic misinformation pattern.' },
        { text: 'A government statistical report from Stats SA with methodology section and raw data.', answer: 'human', reveal: 'YES — transparent methodology, government statistical agency, raw data available for verification.' },
      ],
    },
  ],

  // ── C8: AI Hallucinations ────────────────────
  c8: [
    {
      layout: 'game-spot-error',
      heading: 'Hallucination Hunt',
      icon: '👻',
      instruction: 'Each reference was generated by AI. Find what\'s wrong.',
      items: [
        { text: 'Smith, J. & Patel, R. (2022). Digital literacy in South African schools. Journal of Educational Technology, 45(3), 112-128.', error: 'Fabricated reference', explain: 'This journal article does not exist. AI invented the authors, journal, and page numbers. Always verify in Google Scholar or Scopus.' },
        { text: 'According to Vygotsky (1978), the zone of proximal development was first described in his work "Thinking and Speech" published in 1934.', error: 'Date contradiction', explain: 'The citation says 1978, but the work described was published in 1934. AI mixed up the original publication date with the English translation date.' },
        { text: 'The South African Department of Basic Education (2023) reported that 89.7% of schools now have reliable internet access.', error: 'Fabricated statistic', explain: 'This statistic is fabricated. The actual connectivity rate is much lower. AI generates plausible-sounding but false statistics.' },
        { text: 'Brown, A.L. (1992). Design experiments: Theoretical and methodological challenges. Journal of the Learning Sciences, 2(2), 141-178.', error: 'This one is actually real!', explain: 'Trick question — this is a real, frequently cited paper. Not every AI output is wrong, which is what makes verification essential.' },
      ],
    },
    {
      layout: 'game-quiz',
      heading: 'Verification Speed Test',
      icon: '✅',
      instruction: 'What is the fastest way to verify each claim?',
      questions: [
        { q: 'An AI gives you a journal article citation. First step?', options: ['Read it carefully', 'Search Google Scholar for the exact title', 'Trust it if the format looks correct', 'Check the author on LinkedIn'], correct: 1, explain: 'Google Scholar is the fastest way to verify if a citation actually exists.' },
        { q: 'AI says "research shows 73% of teachers support AI." How to verify?', options: ['73% sounds specific so probably real', 'Search for the original study', 'Ask AI for the source', 'Check if other articles cite this stat'], correct: 1, explain: 'Specific numbers sound convincing but can be fabricated. Find the original study or it doesn\'t exist.' },
        { q: 'You find the cited journal exists, but not the specific article. What happened?', options: ['The article was retracted', 'AI hallucinated the article in a real journal', 'The article is behind a paywall', 'It must be a preprint'], correct: 1, explain: 'AI commonly generates fake articles in real journals — it knows journal names but invents content.' },
      ],
    },
  ],

  // ── C9: Citations & Zotero ───────────────────
  c9: [
    {
      layout: 'game-spot-error',
      heading: 'Citation Crime Scene',
      icon: '🔎',
      instruction: 'Find the APA 7th edition error in each citation.',
      items: [
        { text: 'Nkosi, T. (2021). "Understanding Academic Literacy." Journal of Higher Education, 15(2), pp. 45-60.', error: 'Quotation marks around title + "pp." prefix', explain: 'In APA 7th: no quotation marks around article titles, and no "pp." for journal articles. Correct: Nkosi, T. (2021). Understanding academic literacy. Journal of Higher Education, 15(2), 45–60.' },
        { text: 'Department of Education. (2023). Annual report on school performance. Pretoria: Government Printer.', error: 'Location before publisher (old APA 6th style)', explain: 'APA 7th removed the publisher location. Correct: Department of Education. (2023). Annual report on school performance. Government Printer.' },
        { text: '(Molefe, Dlamini, Sithole, Van der Merwe, & Ngcobo, 2022)', error: 'Using "&" with 5+ authors', explain: 'APA 7th: for 3+ authors, use first author et al. from the first citation. Correct: (Molefe et al., 2022)' },
        { text: 'Retrieved from https://www.education.gov.za/report2023.pdf on 15 March 2024.', error: '"Retrieved from" and retrieval date', explain: 'APA 7th: no "Retrieved from" — just the URL. Only include retrieval dates for content that changes (e.g., wikis). Correct: https://www.education.gov.za/report2023.pdf' },
      ],
    },
  ],

  // ── C10: Strategic Reading ───────────────────
  c10: [
    {
      layout: 'game-challenge',
      heading: 'Speed Scan Challenge',
      icon: '⏱️',
      instruction: 'Test your reading strategy!',
      challenge: 'You have 60 seconds to scan a journal article abstract. After the time is up, you must answer: (1) What is the study about? (2) What method was used? (3) What was the main finding? Ready?',
      timer: 60,
      debrief: 'Could you answer all three? If yes, you used strategic reading. If you tried to read every word, you ran out of time. The three-pass method teaches you to extract what matters first.',
    },
    {
      layout: 'game-standup',
      heading: 'Reading Confessions',
      icon: '📖',
      instruction: 'Stand if this describes YOUR reading habit. No judgement!',
      statements: [
        { text: 'I highlight everything in the article because it all seems important.', answer: true, explain: 'If everything is highlighted, nothing is highlighted. Strategic readers are selective.' },
        { text: 'I read the abstract and conclusion first before reading the full article.', answer: true, explain: 'This is actually a great strategy! It gives you a map before you dive into details.' },
        { text: 'I re-read the same paragraph multiple times without understanding it better.', answer: true, explain: 'This is common but inefficient. Try writing a summary sentence instead — forcing output helps comprehension.' },
        { text: 'I skip articles that are longer than 10 pages.', answer: true, explain: 'Length ≠ difficulty. A well-structured 30-page article can be easier than a dense 5-page one. Use the three-pass method.' },
      ],
    },
  ],

  // ── C12: PEEL Paragraphs ─────────────────────
  c12: [
    {
      layout: 'game-spot-error',
      heading: 'PEEL or No PEEL?',
      icon: '🏗️',
      instruction: 'Which PEEL component is missing from each paragraph?',
      items: [
        { text: 'According to Vygotsky (1978), learning occurs through social interaction. The zone of proximal development suggests that learners achieve more with guidance than alone. A study by Smith (2020) found that collaborative learning improved test scores by 22%.', error: 'Missing: LINK', explain: 'Has Point, Evidence (Smith, 2020), Explanation (Vygotsky), but no Link back to the essay question or forward to the next paragraph.' },
        { text: 'AI tools are transforming education in South Africa. ChatGPT usage among university students increased by 340% between 2023 and 2024 (Stats SA, 2024). This trend is reshaping how institutions approach assessment integrity.', error: 'Missing: EXPLANATION', explain: 'Has Point, Evidence (Stats SA), and Link, but no Explanation of WHY this statistic matters or what it means.' },
        { text: 'Furthermore, the digital divide in South Africa means that not all students benefit equally from AI tools. Rural students with limited internet access are disadvantaged compared to their urban counterparts. This inequality must be addressed before AI can be equitably integrated into education.', error: 'Missing: EVIDENCE', explain: 'Has Point, Explanation, and Link, but no cited Evidence. Claims need sources.' },
      ],
    },
    {
      layout: 'game-quiz',
      heading: 'Topic Sentence Showdown',
      icon: '🎯',
      instruction: 'Which is the strongest topic sentence for an academic paragraph?',
      questions: [
        { q: 'Topic: AI in education', options: ['AI is interesting.', 'This paragraph discusses AI.', 'AI-powered feedback tools can improve student writing when combined with human instruction.', 'There are many opinions about AI.'], correct: 2, explain: 'A strong topic sentence makes a specific, arguable claim — not a vague statement or announcement.' },
        { q: 'Topic: Academic reading strategies', options: ['Reading is important for university.', 'The three-pass reading method enables students to extract key arguments more efficiently than linear reading.', 'In this essay I will discuss reading.', 'Many students struggle with reading.'], correct: 1, explain: 'Specific claim + method + outcome = strong topic sentence. Avoid announcements ("I will discuss") and vague claims.' },
      ],
    },
  ],

  // ── C13: Academic Voice ──────────────────────
  c13: [
    {
      layout: 'game-transform',
      heading: 'Register Flip',
      icon: '🔄',
      instruction: 'Transform each informal sentence into academic register. You have 30 seconds per sentence.',
      items: [
        { informal: 'Kids these days are glued to their phones and it\'s making them dumb.', academic: 'Contemporary research suggests that excessive smartphone usage among adolescents may negatively impact cognitive development and attention span (Ward et al., 2017).', hint: 'Replace slang, add hedging language, cite evidence.' },
        { informal: 'The government is doing nothing about the problem and it\'s getting worse.', academic: 'Despite growing public concern, government intervention has been limited, and current data indicates a continued deterioration of outcomes (National Report, 2023).', hint: 'Remove emotional language, add specificity, use formal alternatives.' },
        { informal: 'Everyone knows that group work is a waste of time.', academic: 'While collaborative learning is widely prescribed in higher education, its effectiveness remains contested, with some studies reporting minimal gains in individual performance (Johnson & Smith, 2021).', hint: 'Replace "everyone knows" with hedged claims and evidence.' },
        { informal: 'AI is basically just copying stuff from the internet.', academic: 'Large language models generate responses by predicting statistically probable sequences based on patterns in their training data, which may include publicly available internet text (Brown et al., 2020).', hint: 'Replace casual description with precise technical language.' },
      ],
    },
    {
      layout: 'game-quiz',
      heading: 'Hedging Master',
      icon: '🌿',
      instruction: 'Which sentence uses hedging language correctly?',
      questions: [
        { q: 'Choose the correctly hedged academic sentence:', options: ['AI will definitely replace teachers.', 'AI may potentially complement existing pedagogical approaches.', 'AI is sort of useful sometimes.', 'AI might maybe possibly help.'], correct: 1, explain: '"May potentially complement" — appropriate hedging without being vague or over-hedged.' },
        { q: 'Which hedging phrase is appropriate for uncertain findings?', options: ['This proves that...', 'The evidence suggests that...', 'Obviously...', 'It is a known fact that...'], correct: 1, explain: '"The evidence suggests" appropriately hedges while maintaining authority. Avoid absolute claims and "obviously."' },
        { q: 'Rewrite: "Social media causes depression in teenagers."', options: ['Social media definitely causes depression.', 'Some researchers have found an association between social media usage and depressive symptoms among adolescents.', 'Social media might cause depression or maybe not.', 'Depression is caused by social media according to science.'], correct: 1, explain: 'Correlation ≠ causation. Use "association," cite researchers, specify the population.' },
      ],
    },
  ],
};

// Also add games for tutorial sessions
Object.assign(_SESSION_GAMES, {
  t1: [{
    layout: 'game-quiz',
    heading: 'AI Vocabulary Check',
    icon: '📝',
    instruction: 'Match the AI term to its correct definition.',
    questions: [
      { q: 'What is a "large language model"?', options: ['A very long essay', 'An AI trained on text data to predict and generate language', 'A dictionary database', 'A grammar checker'], correct: 1, explain: 'LLMs like ChatGPT are trained on massive text datasets to predict and generate human-like language.' },
      { q: 'What does "hallucination" mean in AI?', options: ['The AI is dreaming', 'The AI generates confident but false information', 'The AI has a virus', 'The AI is confused'], correct: 1, explain: 'AI hallucination = generating plausible-sounding but fabricated facts, citations, or data.' },
      { q: 'What is a "prompt"?', options: ['A deadline reminder', 'The instruction you give an AI to generate a response', 'An error message', 'A citation format'], correct: 1, explain: 'A prompt is the input text you provide to an AI system to guide its output.' },
    ],
  }],
  t3: [{
    layout: 'game-standup',
    heading: 'Assessment 1 Ready Check',
    icon: '✅',
    instruction: 'Stand if you\'ve completed this. Stay seated if not yet.',
    statements: [
      { text: 'I have chosen my platform for the observation log.', answer: true, explain: 'You need a platform chosen by now. If not, decide today.' },
      { text: 'I understand what SIFT stands for and can apply it.', answer: true, explain: 'S = Stop, I = Investigate, F = Find better coverage, T = Trace claims.' },
      { text: 'I have started writing observation entries.', answer: true, explain: 'Don\'t wait until the deadline. Start observing patterns NOW.' },
      { text: 'I know the difference between describing and analysing.', answer: true, explain: 'Description = what happened. Analysis = why it matters and what it reveals.' },
    ],
  }],
  t6: [{
    layout: 'game-spot-error',
    heading: 'Synthesis vs Summary',
    icon: '🔗',
    instruction: 'Is each example a SYNTHESIS (combining sources) or just a SUMMARY (restating one source)?',
    items: [
      { text: 'According to Smith (2020), digital literacy is important for students. Smith argues that schools should invest in technology.', error: 'SUMMARY — only one source, no comparison or integration.', explain: 'This just restates what Smith said. Synthesis requires combining multiple sources.' },
      { text: 'While Smith (2020) argues that technology investment is essential, Nkosi (2021) challenges this view by demonstrating that pedagogy, rather than infrastructure, drives improved outcomes.', error: 'SYNTHESIS — two sources in dialogue, showing agreement/disagreement.', explain: 'This puts sources in conversation. Notice "while... challenges" — the writer is orchestrating the discussion.' },
      { text: 'Research shows that academic writing is difficult (Brown, 2019). Other research also shows that academic writing is difficult (Jones, 2020).', error: 'LIST, not synthesis — sources are stacked, not integrated.', explain: 'Listing sources that say the same thing is not synthesis. Show HOW they relate, differ, or build on each other.' },
    ],
  }],
});

function _blockAccent(type) {
  const map = {
    activation: '#f59e0b', pomodoro: '#ef4444', 'think-pair': '#3b82f6',
    'close-read': '#8b5cf6', 'process-write': '#10b981', 'peer-feedback': '#06b6d4',
    discussion: '#6366f1', jigsaw: '#ec4899', 'gallery-walk': '#f97316',
    'live-demo': '#14b8a6', workshop: '#84cc16', diagnostic: '#a855f7',
    'mini-lesson': '#0ea5e9', revision: '#22c55e', break: '#64748b',
  };
  return map[type] || '#3b82f6';
}

function _spRenderDeck() {
  const st = window._spDeckState;
  if (!st) return;
  const slide = st.slides[st.index];
  const total = st.slides.length;

  const count = document.getElementById('sp-deck-count');
  const progress = document.getElementById('sp-deck-progress');
  const frame = document.querySelector('.sp-deck-frame');

  if (count) count.textContent = `${st.index + 1} / ${total}`;
  if (progress) progress.style.width = `${Math.round(((st.index + 1) / total) * 100)}%`;
  if (!frame) return;

  // Animate transition
  frame.style.opacity = '0';
  frame.style.transform = 'translateY(12px)';
  setTimeout(() => {
    frame.innerHTML = _spRenderSlideContent(slide);
    frame.style.transition = 'opacity .35s ease, transform .35s ease';
    frame.style.opacity = '1';
    frame.style.transform = 'translateY(0)';
    // Initialize quiz if this is a quiz slide
    if (slide.layout === 'game-quiz') _spRenderQuiz();
  }, 80);
}

function _spEsc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

function _spRenderSlideContent(slide) {
  const layout = slide.layout || 'focus';

  if (layout === 'hero') {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;background:${slide.gradient};border-radius:18px;padding:60px 40px;">
        <div style="font-size:80px;margin-bottom:20px;filter:drop-shadow(0 8px 24px rgba(0,0,0,.3));">${slide.icon || ''}</div>
        <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:16px;">${_spEsc(slide.meta)}</div>
        <h1 style="font-size:clamp(36px,5vw,56px);font-weight:900;line-height:1.15;margin:0 0 16px 0;color:white;max-width:900px;">${_spEsc(slide.heading)}</h1>
        <p style="font-size:clamp(18px,2.5vw,26px);color:rgba(255,255,255,.8);margin:0;max-width:700px;line-height:1.5;">${_spEsc(slide.subheading)}</p>
      </div>`;
  }

  if (layout === 'focus') {
    const accent = slide.accent || '#3b82f6';
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:40px 48px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
          <div style="width:64px;height:64px;border-radius:18px;background:${accent}22;display:flex;align-items:center;justify-content:center;font-size:34px;border:2px solid ${accent}44;">${slide.icon || '📌'}</div>
          <div>
            ${slide.subheading ? `<div style="font-size:14px;color:${accent};font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;">${_spEsc(slide.subheading)}</div>` : ''}
            <h1 style="font-size:clamp(32px,4vw,48px);font-weight:900;margin:0;line-height:1.2;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(20px,2.5vw,28px);line-height:1.7;color:rgba(255,255,255,.9);max-width:850px;">${_spEsc(slide.body)}</p>
        ${slide.facilitatorScript ? `
          <div style="margin-top:28px;padding:18px 22px;border-left:4px solid ${accent};background:rgba(255,255,255,.05);border-radius:0 12px 12px 0;">
            <div style="font-size:11px;color:${accent};text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin-bottom:6px;">Facilitator Script</div>
            <p style="font-size:clamp(16px,1.8vw,20px);color:rgba(255,255,255,.8);line-height:1.6;margin:0;font-style:italic;">"${_spEsc(slide.facilitatorScript)}"</p>
          </div>` : ''}
      </div>`;
  }

  if (layout === 'steps') {
    const accent = slide.accent || '#3b82f6';
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:36px 44px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;">
          <div style="width:52px;height:52px;border-radius:14px;background:${accent}22;display:flex;align-items:center;justify-content:center;font-size:28px;border:2px solid ${accent}44;">${slide.icon || '📌'}</div>
          <div>
            <div style="font-size:13px;color:${accent};font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${_spEsc(slide.subheading)} · Step ${slide.blockNum}/${slide.totalBlocks}</div>
            <h1 style="font-size:clamp(28px,3.5vw,42px);font-weight:900;margin:0;line-height:1.2;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(16px,1.8vw,22px);line-height:1.6;color:rgba(255,255,255,.8);margin:8px 0 20px 0;max-width:800px;">${_spEsc(slide.body)}</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(slide.bullets || []).map((b, i) => `
            <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;">
              <div style="width:32px;height:32px;border-radius:10px;background:${accent};color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0;">${i + 1}</div>
              <p style="font-size:clamp(15px,1.6vw,20px);line-height:1.5;color:rgba(255,255,255,.9);margin:0;">${_spEsc(b)}</p>
            </div>`).join('')}
        </div>
        ${slide.facilitatorScript ? `
          <div style="margin-top:20px;padding:14px 18px;border-left:4px solid ${accent};background:rgba(255,255,255,.04);border-radius:0 12px 12px 0;">
            <div style="font-size:10px;color:${accent};text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin-bottom:4px;">Script</div>
            <p style="font-size:clamp(14px,1.4vw,18px);color:rgba(255,255,255,.7);line-height:1.5;margin:0;font-style:italic;">"${_spEsc(slide.facilitatorScript)}"</p>
          </div>` : ''}
      </div>`;
  }

  if (layout === 'workflow') {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:36px 44px;">
        <h1 style="font-size:clamp(30px,3.5vw,44px);font-weight:900;margin:0 0 24px 0;color:white;">🗺️ ${_spEsc(slide.heading)}</h1>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          ${(slide.steps || []).map(s => {
            const accent = _blockAccent(s.type);
            return `
            <div style="padding:16px 18px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:12px;background:${accent}33;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${s.icon}</div>
              <div>
                <div style="font-size:clamp(14px,1.5vw,18px);font-weight:800;color:white;">${_spEsc(s.title)}</div>
                <div style="font-size:clamp(12px,1.2vw,14px);color:rgba(255,255,255,.6);">${_spEsc(s.time)} · ${s.duration} min</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (layout === 'checklist') {
    const accent = slide.accent || '#ef4444';
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:40px 48px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
          <span style="font-size:42px;">${slide.icon || '📋'}</span>
          <h1 style="font-size:clamp(30px,3.5vw,44px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${(slide.items || []).map(item => `
            <div style="display:flex;align-items:flex-start;gap:14px;padding:16px 20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;">
              <div style="width:28px;height:28px;border-radius:8px;background:${accent}33;color:${accent};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">✓</div>
              <div>
                <div style="font-size:clamp(16px,1.8vw,22px);font-weight:700;color:white;">${_spEsc(item.text)}</div>
                ${item.detail ? `<div style="font-size:clamp(13px,1.4vw,17px);color:rgba(255,255,255,.65);margin-top:4px;line-height:1.5;">${_spEsc(item.detail)}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
        ${slide.warning ? `
          <div style="margin-top:20px;padding:14px 18px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:12px;">
            <p style="font-size:clamp(14px,1.5vw,18px);color:#fca5a5;margin:0;line-height:1.5;">⚠️ ${_spEsc(slide.warning)}</p>
          </div>` : ''}
      </div>`;
  }

  if (layout === 'stages') {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:36px 44px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
          <span style="font-size:42px;">${slide.icon || '✍️'}</span>
          <h1 style="font-size:clamp(28px,3vw,40px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${(slide.stages || []).map((s, i) => `
            <div style="flex:1;min-width:160px;padding:18px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);">
              <div style="font-size:28px;margin-bottom:8px;">${s.icon || ''}</div>
              <div style="font-size:clamp(14px,1.5vw,18px);font-weight:800;color:white;margin-bottom:4px;">${_spEsc(s.title)}</div>
              <div style="font-size:clamp(11px,1.1vw,14px);color:rgba(255,255,255,.5);margin-bottom:8px;">${_spEsc(s.time || '')}</div>
              <div style="font-size:clamp(12px,1.2vw,15px);color:rgba(255,255,255,.7);line-height:1.5;">${_spEsc(s.description || '')}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Game layouts ──────────────────────────────

  if (layout === 'game-ai-or-human') {
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
          <span style="font-size:38px;">${slide.icon || '🤖'}</span>
          <div>
            <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;">Interactive Game</div>
            <h1 style="font-size:clamp(28px,3.5vw,40px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(15px,1.5vw,19px);color:rgba(255,255,255,.7);margin:0 0 16px 0;">${_spEsc(slide.instruction)}</p>
        <div style="flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;" id="sp-game-items">
          ${(slide.items || []).map((item, i) => `
            <div id="sp-game-item-${i}" style="padding:18px 22px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .3s ease;" onclick="_spRevealGameItem(${i}, '${item.answer === 'human' || item.answer === true ? 'true' : 'false'}')">
              <p style="font-size:clamp(15px,1.6vw,20px);color:rgba(255,255,255,.9);line-height:1.6;margin:0 0 8px 0;">"${_spEsc(item.text)}"</p>
              <div id="sp-game-reveal-${i}" style="display:none;margin-top:10px;padding:12px 16px;border-radius:10px;font-size:clamp(13px,1.3vw,17px);line-height:1.5;"></div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (layout === 'game-four-corners') {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:36px 44px;text-align:center;">
        <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;margin-bottom:8px;">Interactive Game</div>
        <div style="font-size:52px;margin-bottom:12px;">${slide.icon || '🧭'}</div>
        <h1 style="font-size:clamp(30px,3.5vw,44px);font-weight:900;margin:0 0 12px 0;color:white;">${_spEsc(slide.heading)}</h1>
        <p style="font-size:clamp(14px,1.4vw,18px);color:rgba(255,255,255,.65);margin:0 0 20px 0;">${_spEsc(slide.instruction)}</p>
        <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:24px 28px;margin-bottom:24px;">
          <p style="font-size:clamp(20px,2.5vw,30px);font-weight:800;color:white;margin:0;line-height:1.4;">"${_spEsc(slide.statement)}"</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${(slide.corners || []).map((c, i) => `
            <div id="sp-corner-${i}" style="padding:18px;border-radius:14px;background:${c.color}22;border:2px solid ${c.color}66;cursor:pointer;transition:all .3s ease;" onclick="_spRevealCorner(${i})">
              <div style="font-size:clamp(16px,1.8vw,22px);font-weight:800;color:${c.color};">${_spEsc(c.label)}</div>
              <div id="sp-corner-arg-${i}" style="display:none;font-size:clamp(13px,1.3vw,16px);color:rgba(255,255,255,.75);margin-top:8px;line-height:1.5;">${_spEsc(c.argument)}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (layout === 'game-standup') {
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
          <span style="font-size:38px;">${slide.icon || '🧍'}</span>
          <div>
            <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;">Interactive Game</div>
            <h1 style="font-size:clamp(26px,3vw,38px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(14px,1.4vw,18px);color:rgba(255,255,255,.65);margin:0 0 16px 0;">${_spEsc(slide.instruction)}</p>
        <div style="flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;">
          ${(slide.statements || []).map((s, i) => `
            <div id="sp-standup-${i}" style="padding:18px 22px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .3s ease;" onclick="_spRevealStandup(${i}, ${s.answer})">
              <div style="display:flex;align-items:center;gap:14px;">
                <div id="sp-standup-icon-${i}" style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">❓</div>
                <p style="font-size:clamp(16px,1.7vw,22px);color:white;margin:0;font-weight:600;line-height:1.4;">${_spEsc(s.text)}</p>
              </div>
              <div id="sp-standup-reveal-${i}" style="display:none;margin-top:10px;padding:10px 14px;border-radius:10px;font-size:clamp(13px,1.3vw,17px);line-height:1.5;margin-left:54px;"></div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (layout === 'game-quiz') {
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
          <span style="font-size:38px;">${slide.icon || '⚡'}</span>
          <div>
            <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;">Quiz</div>
            <h1 style="font-size:clamp(24px,3vw,36px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(13px,1.3vw,17px);color:rgba(255,255,255,.6);margin:0 0 14px 0;">${_spEsc(slide.instruction)}</p>
        <div id="sp-quiz-mount" style="flex:1;overflow-y:auto;"></div>
      </div>`;
  }

  if (layout === 'game-spot-error') {
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
          <span style="font-size:38px;">${slide.icon || '🔍'}</span>
          <div>
            <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;">Interactive Game</div>
            <h1 style="font-size:clamp(24px,3vw,36px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(13px,1.3vw,17px);color:rgba(255,255,255,.6);margin:0 0 14px 0;">${_spEsc(slide.instruction)}</p>
        <div style="flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;">
          ${(slide.items || []).map((item, i) => `
            <div id="sp-error-${i}" style="padding:16px 20px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .3s ease;" onclick="_spRevealError(${i})">
              <p style="font-size:clamp(14px,1.5vw,19px);color:rgba(255,255,255,.9);line-height:1.5;margin:0;font-family:var(--font-mono);">${_spEsc(item.text)}</p>
              <div id="sp-error-reveal-${i}" style="display:none;margin-top:10px;"></div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (layout === 'game-challenge') {
    return `
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;padding:40px;text-align:center;">
        <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;margin-bottom:10px;">Timed Challenge</div>
        <div style="font-size:56px;margin-bottom:16px;">${slide.icon || '⏱️'}</div>
        <h1 style="font-size:clamp(28px,3.5vw,42px);font-weight:900;margin:0 0 16px 0;color:white;">${_spEsc(slide.heading)}</h1>
        <p style="font-size:clamp(16px,1.8vw,22px);color:rgba(255,255,255,.85);margin:0 0 24px 0;max-width:700px;line-height:1.6;">${_spEsc(slide.challenge)}</p>
        <div id="sp-challenge-timer" style="font-size:clamp(48px,8vw,96px);font-weight:900;color:#f59e0b;font-family:var(--font-mono);margin-bottom:20px;">${Math.floor((slide.timer || 300) / 60)}:00</div>
        <div style="display:flex;gap:12px;">
          <button onclick="_spStartChallengeTimer(${slide.timer || 300})" style="padding:14px 28px;border-radius:14px;border:none;background:#22c55e;color:white;font-weight:800;font-size:18px;cursor:pointer;">▶ Start</button>
          <button onclick="_spStopChallengeTimer()" style="padding:14px 28px;border-radius:14px;border:none;background:rgba(255,255,255,.1);color:white;font-weight:700;font-size:18px;cursor:pointer;">⏸ Stop</button>
        </div>
        <div id="sp-challenge-debrief" style="display:none;margin-top:24px;padding:18px 24px;background:rgba(255,255,255,.08);border-radius:14px;max-width:600px;">
          <p style="font-size:clamp(15px,1.6vw,20px);color:rgba(255,255,255,.85);margin:0;line-height:1.6;">${_spEsc(slide.debrief || '')}</p>
        </div>
      </div>`;
  }

  if (layout === 'game-transform') {
    return `
      <div style="display:flex;flex-direction:column;height:100%;padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
          <span style="font-size:38px;">${slide.icon || '🔄'}</span>
          <div>
            <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:.2em;font-weight:800;">Interactive Game</div>
            <h1 style="font-size:clamp(24px,3vw,36px);font-weight:900;margin:0;color:white;">${_spEsc(slide.heading)}</h1>
          </div>
        </div>
        <p style="font-size:clamp(13px,1.3vw,17px);color:rgba(255,255,255,.6);margin:0 0 14px 0;">${_spEsc(slide.instruction)}</p>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px;overflow-y:auto;">
          ${(slide.items || []).map((item, i) => `
            <div id="sp-transform-${i}" style="padding:18px 22px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);">
              <div style="font-size:11px;color:#ef4444;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:6px;">Informal</div>
              <p style="font-size:clamp(14px,1.5vw,19px);color:rgba(255,255,255,.9);line-height:1.5;margin:0;">"${_spEsc(item.informal)}"</p>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin:8px 0 4px 0;">💡 Hint: ${_spEsc(item.hint)}</div>
              <button onclick="_spRevealTransform(${i})" style="margin-top:8px;padding:8px 16px;border-radius:10px;border:none;background:rgba(255,255,255,.1);color:white;font-size:13px;cursor:pointer;font-weight:600;">Show Academic Version</button>
              <div id="sp-transform-reveal-${i}" style="display:none;margin-top:10px;padding:14px 18px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:10px;">
                <div style="font-size:11px;color:#22c55e;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:6px;">Academic</div>
                <p style="font-size:clamp(14px,1.5vw,19px);color:rgba(255,255,255,.9);line-height:1.5;margin:0;">${_spEsc(item.academic)}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // Fallback
  return `
    <div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:40px 48px;">
      <h1 style="font-size:clamp(32px,4vw,48px);font-weight:900;margin:0 0 16px 0;color:white;">${_spEsc(slide.heading)}</h1>
      ${slide.subheading ? `<div style="font-size:clamp(16px,2vw,22px);color:rgba(147,197,253,.9);margin-bottom:12px;">${_spEsc(slide.subheading)}</div>` : ''}
      ${slide.body ? `<p style="font-size:clamp(18px,2vw,24px);line-height:1.6;color:rgba(255,255,255,.9);">${_spEsc(slide.body)}</p>` : ''}
    </div>`;
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
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div id="sp-deck-count" class="sp-deck-count"></div>
          <div id="sp-deck-wake-status" style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.02em;background:#1e293b;color:#cbd5e1;border:1px solid rgba(148,163,184,.35);">Checking screen wake…</div>
        </div>
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
      <div class="sp-deck-frame"></div>
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
  window._spDeckWakeVisibilityHandler = () => {
    if (document.visibilityState === 'visible' && window._spDeckState) {
      window._spDeckRequestWakeLock?.();
    }
  };
  document.addEventListener('visibilitychange', window._spDeckWakeVisibilityHandler);
  window._spDeckSetWakeStatus?.(
    window._spDeckWakeLockSupported ? 'Trying to keep screen awake' : 'Screen wake lock not supported',
    window._spDeckWakeLockSupported ? 'pending' : 'unsupported'
  );
  window._spDeckFullscreen();
  window._spDeckRequestWakeLock?.();
  _spRenderDeck();
};

window._spDeckWakeLock = null;
window._spDeckWakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
window._spDeckSetWakeStatus = (label, tone = 'neutral') => {
  const el = document.getElementById('sp-deck-wake-status');
  if (!el) return;
  const palette = {
    active: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
    pending: { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' },
    unsupported: { bg: '#e2e8f0', fg: '#334155', border: '#cbd5e1' },
    blocked: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
    neutral: { bg: '#1e293b', fg: '#cbd5e1', border: 'rgba(148,163,184,.35)' },
  };
  const colors = palette[tone] || palette.neutral;
  el.textContent = label;
  el.style.background = colors.bg;
  el.style.color = colors.fg;
  el.style.border = `1px solid ${colors.border}`;
};

window._spDeckRequestWakeLock = async () => {
  if (!window._spDeckWakeLockSupported || !window._spDeckState) {
    window._spDeckSetWakeStatus?.('Screen wake lock not supported', 'unsupported');
    return;
  }
  if (window._spDeckWakeLock) {
    window._spDeckSetWakeStatus?.('Screen will stay awake', 'active');
    return;
  }
  window._spDeckSetWakeStatus?.('Trying to keep screen awake', 'pending');
  try {
    const lock = await navigator.wakeLock.request('screen');
    window._spDeckWakeLock = lock;
    window._spDeckSetWakeStatus?.('Screen will stay awake', 'active');
    lock.addEventListener('release', () => {
      if (window._spDeckWakeLock === lock) {
        window._spDeckWakeLock = null;
      }
      if (window._spDeckState) {
        window._spDeckSetWakeStatus?.('Screen wake lock released', 'pending');
      }
    }, { once: true });
  } catch {
    window._spDeckSetWakeStatus?.('Chrome blocked screen wake lock', 'blocked');
  }
};

window._spDeckReleaseWakeLock = async () => {
  const lock = window._spDeckWakeLock;
  window._spDeckWakeLock = null;
  if (!lock) return;
  try {
    await lock.release();
  } catch {
    // Ignore release failures if the browser already cleared the lock
  }
};

window._spDeckFullscreen = async () => {
  const overlay = document.getElementById('sp-deck-overlay');
  if (!overlay) return;
  try {
    if (!document.fullscreenElement && overlay.requestFullscreen) {
      await overlay.requestFullscreen();
    }
    await window._spDeckRequestWakeLock?.();
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
    window._spDeckKeyHandler = null;
  }
  if (window._spDeckWakeVisibilityHandler) {
    document.removeEventListener('visibilitychange', window._spDeckWakeVisibilityHandler);
    window._spDeckWakeVisibilityHandler = null;
  }
  window._spDeckState = null;
  window._spDeckReleaseWakeLock?.();
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

// ── Game interaction handlers ─────────────────
window._spRevealGameItem = (index, isCorrectStr) => {
  const el = document.getElementById(`sp-game-reveal-${index}`);
  const card = document.getElementById(`sp-game-item-${index}`);
  if (!el || el.style.display !== 'none') return;
  const st = window._spDeckState;
  const slide = st?.slides?.[st?.index];
  const item = slide?.items?.[index];
  if (!item) return;
  el.style.display = 'block';
  el.style.background = isCorrectStr === 'true' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)';
  el.style.color = 'rgba(255,255,255,.85)';
  el.innerHTML = `<strong style="color:${isCorrectStr === 'true' ? '#4ade80' : '#f87171'};">${item.answer === 'human' || item.answer === true ? '✅ Human / True' : '🤖 AI / False'}</strong><br>${_spEsc(item.reveal)}`;
  if (card) {
    card.style.borderColor = isCorrectStr === 'true' ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.5)';
    card.style.background = isCorrectStr === 'true' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)';
  }
};

window._spRevealCorner = (index) => {
  const el = document.getElementById(`sp-corner-arg-${index}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window._spRevealStandup = (index, answer) => {
  const reveal = document.getElementById(`sp-standup-reveal-${index}`);
  const icon = document.getElementById(`sp-standup-icon-${index}`);
  const card = document.getElementById(`sp-standup-${index}`);
  if (!reveal || reveal.style.display !== 'none') return;
  const st = window._spDeckState;
  const slide = st?.slides?.[st?.index];
  const stmt = slide?.statements?.[index];
  if (!stmt) return;
  reveal.style.display = 'block';
  reveal.style.background = answer ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
  reveal.style.borderRadius = '10px';
  reveal.style.padding = '10px 14px';
  reveal.innerHTML = `<strong style="color:${answer ? '#4ade80' : '#f87171'};">${answer ? '✅ TRUE' : '❌ FALSE'}</strong> — ${_spEsc(stmt.explain)}`;
  if (icon) icon.textContent = answer ? '✅' : '❌';
  if (card) card.style.borderColor = answer ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)';
};

window._spRevealError = (index) => {
  const el = document.getElementById(`sp-error-reveal-${index}`);
  const card = document.getElementById(`sp-error-${index}`);
  if (!el || el.style.display !== 'none') return;
  const st = window._spDeckState;
  const slide = st?.slides?.[st?.index];
  const item = slide?.items?.[index];
  if (!item) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div style="padding:12px 16px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:10px;">
      <div style="font-size:clamp(14px,1.4vw,18px);font-weight:700;color:#fbbf24;margin-bottom:4px;">🔍 ${_spEsc(item.error)}</div>
      ${item.explain ? `<div style="font-size:clamp(12px,1.2vw,16px);color:rgba(255,255,255,.7);line-height:1.5;">${_spEsc(item.explain)}</div>` : ''}
    </div>`;
  if (card) card.style.borderColor = 'rgba(245,158,11,.4)';
};

window._spRevealTransform = (index) => {
  const el = document.getElementById(`sp-transform-reveal-${index}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// Quiz engine
window._spQuizState = null;

function _spRenderQuiz() {
  const mount = document.getElementById('sp-quiz-mount');
  const st = window._spDeckState;
  if (!mount || !st) return;
  const slide = st.slides[st.index];
  const qs = slide?.questions || [];
  if (!window._spQuizState || window._spQuizState.slideIndex !== st.index) {
    window._spQuizState = { slideIndex: st.index, current: 0, score: 0, answered: false };
  }
  const qst = window._spQuizState;
  if (qst.current >= qs.length) {
    mount.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">🏆</div>
        <h2 style="font-size:clamp(28px,3vw,40px);font-weight:900;color:white;margin:0 0 10px 0;">Quiz Complete!</h2>
        <p style="font-size:clamp(18px,2vw,26px);color:rgba(255,255,255,.8);">Score: ${qst.score} / ${qs.length}</p>
        <button onclick="window._spQuizState=null;_spRenderQuiz();" style="margin-top:16px;padding:12px 24px;border-radius:12px;border:none;background:var(--accent);color:white;font-weight:700;font-size:16px;cursor:pointer;">Restart</button>
      </div>`;
    return;
  }
  const q = qs[qst.current];
  mount.innerHTML = `
    <div style="display:flex;flex-direction:column;justify-content:center;height:100%;">
      <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:8px;">Question ${qst.current + 1} of ${qs.length}</div>
      <h2 style="font-size:clamp(22px,2.5vw,32px);font-weight:800;color:white;margin:0 0 20px 0;line-height:1.3;">${_spEsc(q.q)}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${q.options.map((opt, i) => {
          const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
          return `<button id="sp-quiz-opt-${i}" onclick="_spQuizAnswer(${i}, ${q.correct})" style="padding:18px 20px;border-radius:14px;border:2px solid ${colors[i]}66;background:${colors[i]}22;color:white;font-size:clamp(15px,1.6vw,20px);font-weight:700;cursor:pointer;text-align:left;transition:all .2s ease;">${_spEsc(opt)}</button>`;
        }).join('')}
      </div>
      <div id="sp-quiz-feedback" style="display:none;margin-top:16px;padding:14px 18px;border-radius:12px;font-size:clamp(14px,1.5vw,18px);line-height:1.5;"></div>
    </div>`;
};

window._spQuizAnswer = (selected, correct) => {
  const qst = window._spQuizState;
  if (!qst || qst.answered) return;
  qst.answered = true;
  const st = window._spDeckState;
  const slide = st?.slides?.[st?.index];
  const q = slide?.questions?.[qst.current];
  const isCorrect = selected === correct;
  if (isCorrect) qst.score++;

  // Highlight options
  for (let i = 0; i < (q?.options?.length || 4); i++) {
    const btn = document.getElementById(`sp-quiz-opt-${i}`);
    if (!btn) continue;
    btn.style.cursor = 'default';
    if (i === correct) {
      btn.style.background = 'rgba(34,197,94,.3)';
      btn.style.borderColor = '#22c55e';
    } else if (i === selected && !isCorrect) {
      btn.style.background = 'rgba(239,68,68,.3)';
      btn.style.borderColor = '#ef4444';
    } else {
      btn.style.opacity = '0.4';
    }
  }

  const fb = document.getElementById('sp-quiz-feedback');
  if (fb && q) {
    fb.style.display = 'block';
    fb.style.background = isCorrect ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
    fb.style.color = 'rgba(255,255,255,.85)';
    fb.innerHTML = `<strong style="color:${isCorrect ? '#4ade80' : '#f87171'};">${isCorrect ? '✅ Correct!' : '❌ Not quite.'}</strong> ${_spEsc(q.explain || '')}`;
  }

  // Auto-advance after delay
  setTimeout(() => {
    qst.current++;
    qst.answered = false;
    _spRenderQuiz();
  }, 3500);
};

// Challenge timer
window._spChallengeInterval = null;

window._spStartChallengeTimer = (seconds) => {
  if (window._spChallengeInterval) clearInterval(window._spChallengeInterval);
  let remaining = seconds;
  const timerEl = document.getElementById('sp-challenge-timer');
  const debriefEl = document.getElementById('sp-challenge-debrief');
  if (debriefEl) debriefEl.style.display = 'none';
  window._spChallengeInterval = setInterval(() => {
    remaining--;
    if (timerEl) {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
      if (remaining <= 10) timerEl.style.color = '#ef4444';
    }
    if (remaining <= 0) {
      clearInterval(window._spChallengeInterval);
      window._spChallengeInterval = null;
      if (timerEl) timerEl.textContent = "Time's up!";
      if (debriefEl) debriefEl.style.display = 'block';
    }
  }, 1000);
};

window._spStopChallengeTimer = () => {
  if (window._spChallengeInterval) {
    clearInterval(window._spChallengeInterval);
    window._spChallengeInterval = null;
  }
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
    window.saveState?.();
  }
};

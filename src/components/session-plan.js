// src/components/session-plan.js
// ─────────────────────────────────────────────
// Session Plan Component — Contact (90 min) and Tutorial (45 min)
// Includes: live Pomodoro timer, process writing stages,
// activity cards, facilitator notes, exit tickets
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';

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
  el.innerHTML = _buildPlan(cfg);
}

function _buildPlan(cfg) {
  const isContact = cfg.type === 'contact';
  const color     = isContact ? 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' : 'linear-gradient(135deg,#1a3a2a,#15803d)';
  const typeLabel = isContact ? '90-Minute Contact Session' : '45-Minute Tutorial Session';

  return `
    <div class="sp-wrapper">

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
            <div class="sp-section">
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
        <div class="sp-tools-panel">
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
        ${b.facilitatorScript ? `<div class="sp-script"><span class="sp-script-label">Script:</span> <em>"${b.facilitatorScript}"</em></div>` : ''}
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
                    placeholder="Paste student writing here for AI analysis…"></textarea>
                  <button class="sp-pw-ai-btn"
                    onclick="_getPWFeedback('${sessionId}',${i},'${encodeURIComponent(s.aiPrompt)}')">
                    Get feedback
                  </button>
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
    <div class="sp-tool-card">
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
  body.style.display = open ? 'none' : 'block';
  head?.classList.toggle('pw-open', !open);
};

window._getPWFeedback = async (sid, i, encodedPrompt) => {
  const prompt    = decodeURIComponent(encodedPrompt);
  const ta        = document.getElementById(`pw-ta-${sid}-${i}`);
  const fbEl      = document.getElementById(`pw-fb-${sid}-${i}`);
  const text      = ta?.value?.trim() ?? '';
  if (!text || text.length < 20) { if (ta) ta.style.borderColor = '#ef4444'; return; }
  if (fbEl) fbEl.innerHTML = '<span class="sp-pw-loading">Analysing…</span>';

  const fullPrompt = `${prompt}\n\nStudent writing:\n"${text}"\n\nGive 3–4 sentences of honest, specific feedback. Quote the student's words where relevant. Be direct. No sycophantic openers.`;

  try {
    const ans = await _aiChat(fullPrompt, { maxTokens: 300 });
    if (fbEl) fbEl.innerHTML = `<div class="sp-pw-fb-text">💬 ${ans}</div>`;
  } catch (err) {
    if (fbEl) fbEl.innerHTML = `<div class="sp-pw-fb-text">AI unavailable: ${err.message}</div>`;
  }
};

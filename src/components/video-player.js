// src/components/video-player.js
// ─────────────────────────────────────────────
// Interactive Video Player with knowledge-bounded AI tutor.
//
// Key architecture decision: cfg and meta are NEVER inlined
// into onclick attributes (causes breakage with apostrophes,
// quotes, and large JSON). They are stored in a global registry
// and looked up by containerId.
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';
import { scoreSubmissionForAI, getStudentBaselineProfile } from '../ai-detection.js';

// ── Global registries ─────────────────────────
window._ytQueue     = window._ytQueue     || [];
window._players     = window._players     || {};
window._ytReady     = window._ytReady     || false;
window._ivpRegistry = window._ivpRegistry || {}; // {cid: {cfg, meta, key}}
window._ivpHistory  = window._ivpHistory  || {}; // {cid: [{role,content}]}

const IVP_REFL_STORAGE_PREFIX = 'acadlit-ivp-refl-v1';
const IVP_SCREEN_OVERLAYS_ENABLED = false;

function _ivpReflectionStorageKey(cid, xid) {
  return `${IVP_REFL_STORAGE_PREFIX}:${cid}:${xid}`;
}

function _ivpSaveReflectionState(cid, xid, state) {
  try {
    localStorage.setItem(_ivpReflectionStorageKey(cid, xid), JSON.stringify(state));
  } catch {}
}

function _ivpLoadReflectionState(cid, xid) {
  try {
    const raw = localStorage.getItem(_ivpReflectionStorageKey(cid, xid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _ivpSetReflectionSavedIndicator(cid, xid, dateObj = null) {
  const el = document.getElementById(`ivp-refl-save-${cid}-${xid}`);
  if (!el) return;
  if (!dateObj) dateObj = new Date();
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  el.textContent = `Last saved at ${h}:${m}`;
  el.style.color = 'var(--green)';
}

window.onYouTubeIframeAPIReady = () => {
  window._ytReady = true;
  window._ytQueue.forEach(fn => fn());
  window._ytQueue = [];
};
if (window.YT && window.YT.Player) window._ytReady = true;

// ── Global helpers — look up from registry ────
window.resumeVideo = (cid) => {
  document.getElementById(`ovl-${cid}`)?.classList.remove('show');
  window._players[cid]?.playVideo();
};

window.seekChapter = (cid, idx) => {
  const reg = window._ivpRegistry[cid];
  if (!reg) return;
  window._players[cid]?.seekTo(reg.cfg.chapters[idx]?.t ?? 0, true);
};

window.toggleIVPChat = (cid) => {
  const chat = document.getElementById(`chat-${cid}`);
  const btn  = document.getElementById(`btn-chat-${cid}`);
  if (!chat) return;
  const vis = chat.style.display !== 'none';
  chat.style.display = vis ? 'none' : 'flex';
  btn?.classList.toggle('on', !vis);
  if (!vis) document.getElementById(`in-${cid}`)?.focus();
};

window.sendIVPChat = async (cid) => {
  const reg  = window._ivpRegistry[cid];
  const inp  = document.getElementById(`in-${cid}`);
  const msgs = document.getElementById(`msgs-${cid}`);
  if (!reg || !inp || !msgs) return;

  const txt = inp.value.trim();
  if (!txt) return;

  _appendMsg(msgs, 'user', txt);
  inp.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  const tmpId = `tmp-${Date.now()}`;
  _appendMsg(msgs, 'ai thinking', '…', tmpId);
  msgs.scrollTop = msgs.scrollHeight;

  if (!window._ivpHistory[cid]) window._ivpHistory[cid] = [];
  window._ivpHistory[cid].push({ role: 'user', content: txt });

  const kb = _buildKnowledgeBase(reg.cfg, reg.meta);

  const prompt = `You are a focused video tutor for: "${reg.meta.title}".

YOUR ONLY SOURCE OF KNOWLEDGE is the knowledge base below. Do not use outside information.

═══ VIDEO KNOWLEDGE BASE ═══
${kb}
═══ END KNOWLEDGE BASE ═══

RULES:
1. If the question can be answered from the knowledge base, answer clearly in 2–4 sentences at a first-year university level.
2. If the question is NOT in the knowledge base, respond ONLY: "That question goes beyond this video. You could ask me about: [list 2–3 relevant topics from the knowledge base]."
3. Never invent information not in the knowledge base.
4. Keep responses under 100 words.

Student question: "${txt}"`;

  try {
    const answer = await _aiChat(prompt, { maxTokens: 256 });

    const el = document.getElementById(tmpId);
    if (el) { el.className = 'ivp-msg ai'; el.innerText = answer; }
    window._ivpHistory[cid].push({ role: 'assistant', content: answer });

  } catch (err) {
    const el = document.getElementById(tmpId);
    if (el) {
      el.className = 'ivp-msg ai';
      el.innerText = `AI tutor unavailable: ${err.message}`;
    }
  }
  msgs.scrollTop = msgs.scrollHeight;
};

// ── Reflection AI handler ─────────────────────
window._ivpSubmitReflection = async (cid, xid, encodedQ) => {
  const question = decodeURIComponent(encodedQ);
  const ta     = document.getElementById(`ivp-refl-${cid}-${xid}`);
  const fbEl   = document.getElementById(`ivp-refl-fb-${cid}-${xid}`);
  const btn    = document.getElementById(`ivp-refl-btn-${cid}-${xid}`);
  const text   = ta?.value?.trim() ?? '';

  if (ta) {
    const now = new Date();
    _ivpSaveReflectionState(cid, xid, { text: ta.value, feedback: null, submitted: false, savedAt: now.getTime() });
    _ivpSetReflectionSavedIndicator(cid, xid, now);
  }

  if (text.length < 20) {
    if (ta) ta.style.borderColor = '#ef4444';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Thinking…'; }

  const reg = window._ivpRegistry[cid];
  const prompt = `You are a video tutor. Student watching: "${reg?.meta?.title || 'educational video'}".

They were asked: "${question}"
Their response: "${text}"

Give honest feedback in 2–3 sentences. If shallow or vague, say so directly and ask one specific follow-up question. If genuine and specific, acknowledge it and add one insight connecting to the video's main idea. No sycophantic openers. Under 80 words.`;

  try {
    const answer = await _aiChat(prompt, { maxTokens: 200 });

    // Score reflection for AI detection
    const reg = window._ivpRegistry[cid];
    const unitId = reg?.cfg?.unitId;
    const baseline = unitId ? getStudentBaselineProfile(unitId) : null;
    const aiScore = scoreSubmissionForAI(text, baseline);

    if (fbEl) {
      fbEl.style.display = 'block';
      const aiWarn = aiScore && aiScore.isRiskFlag ? `
        <div style="background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:12px;margin:12px 0 12px 0;">
          <div style="display:flex;gap:12px;align-items:flex-start;font-size:13px;">
            <div style="font-size:20px;flex-shrink:0;">⚠️</div>
            <div style="flex:1;">
              <div style="font-weight:700;color:#991b1b;margin-bottom:4px;">Integrity Alert</div>
              <p style="color:#7f1d1d;margin:0 0 4px 0;font-size:12px;">${aiScore.recommendation}</p>
              <div style="font-size:11px;color:#7f1d1d;">
                <strong>Why:</strong> ${(aiScore.reasons || []).slice(0, 2).join(' ')}
              </div>
            </div>
          </div>
        </div>
      ` : '';
      fbEl.innerHTML = `${aiWarn}<div class="ivp-fb-text">💬 ${answer}</div>
        <div style="margin-top:14px;text-align:right;">
          <button class="ivp-go" onclick="resumeVideo('${cid}')">Continue watching →</button>
        </div>`;
    }
    if (btn) btn.style.display = 'none';
    if (ta)  ta.readOnly = true;
    const now = new Date();
    _ivpSaveReflectionState(cid, xid, { text, feedback: answer, submitted: true, aiDetection: aiScore, savedAt: now.getTime() });
    if (window.STATE && unitId) {
      if (!window.STATE.progress[unitId]) window.STATE.progress[unitId] = {};
      if (!window.STATE.progress[unitId].videoAiDetections) window.STATE.progress[unitId].videoAiDetections = {};
      window.STATE.progress[unitId].videoAiDetections[xid] = aiScore;
      if (window.saveState) window.saveState();
    }
    _ivpSetReflectionSavedIndicator(cid, xid, now);
  } catch (err) {
    const errText = `AI unavailable: ${err.message}`;
    if (fbEl) {
      fbEl.style.display = 'block';
      fbEl.innerHTML = `<div class="ivp-fb-text">${errText}</div>
        <div style="margin-top:10px;text-align:right;"><button class="ivp-go" onclick="resumeVideo('${cid}')">Continue →</button></div>`;
    }
    const now = new Date();
    _ivpSaveReflectionState(cid, xid, { text, feedback: errText, submitted: false, savedAt: now.getTime() });
    _ivpSetReflectionSavedIndicator(cid, xid, now);
  }
};

window._ivpClearReflection = (cid, xid) => {
  if (!confirm('Clear your saved reflection and feedback for this pause point?')) return;
  try { localStorage.removeItem(_ivpReflectionStorageKey(cid, xid)); } catch {}

  const ta = document.getElementById(`ivp-refl-${cid}-${xid}`);
  const fbEl = document.getElementById(`ivp-refl-fb-${cid}-${xid}`);
  const btn = document.getElementById(`ivp-refl-btn-${cid}-${xid}`);

  if (ta) {
    ta.value = '';
    ta.readOnly = false;
    ta.style.borderColor = '';
  }
  if (fbEl) {
    fbEl.style.display = 'none';
    fbEl.innerHTML = '';
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Get AI feedback';
    btn.style.display = '';
  }
  const el = document.getElementById(`ivp-refl-save-${cid}-${xid}`);
  if (el) { el.textContent = 'Cleared'; el.style.color = 'var(--muted)'; }
};

// ── MCQ answer check ──────────────────────────
window._ivpCheckMCQ = (cid, chosen, correct, encodedFb) => {
  const fb   = decodeURIComponent(encodedFb);
  const opts = document.querySelectorAll(`#ovl-${cid} .ivp-opt`);
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)      btn.classList.add('correct');
    else if (i === chosen)  btn.classList.add('wrong');
  });
  const fbEl = document.getElementById(`ivp-fb-${cid}`);
  if (fbEl) {
    fbEl.style.display = 'block';
    fbEl.innerHTML = `
      <div class="ivp-fb-text">${chosen === correct ? '✅' : '❌'} ${fb}</div>
      <div style="margin-top:14px;text-align:right;">
        <button class="ivp-go" onclick="resumeVideo('${cid}')">Continue watching →</button>
      </div>`;
  }
};

// ── Helpers ───────────────────────────────────
function _appendMsg(container, cls, text, id = '') {
  const div = document.createElement('div');
  div.className = `ivp-msg ${cls}`;
  if (id) div.id = id;
  div.innerText = text;
  container.appendChild(div);
}

function _buildKnowledgeBase(cfg, meta) {
  const lines = [`VIDEO: ${meta.title}`, `TOPIC: ${cfg.ctx}`];
  if (cfg.knowledge?.length) {
    lines.push('', 'KEY FACTS FROM THIS VIDEO:');
    cfg.knowledge.forEach((k, i) => lines.push(`${i+1}. ${k}`));
  }
  if (cfg.keyTerms?.length) {
    lines.push('', 'KEY TERMS:');
    cfg.keyTerms.forEach(t => lines.push(`- ${t.term}: ${t.def}`));
  }
  if (cfg.scope?.length) {
    lines.push('', 'TOPICS I CAN ANSWER (stay within these):');
    cfg.scope.forEach(s => lines.push(`- ${s}`));
  }
  if (cfg.outOfScope?.length) {
    lines.push('', 'TOPICS OUTSIDE THIS VIDEO (redirect if asked):');
    cfg.outOfScope.forEach(s => lines.push(`- ${s}`));
  }
  return lines.join('\n');
}

// ── InteractiveVideoPlayer class ──────────────
export class InteractiveVideoPlayer {
  constructor(containerId, videoKey, videoMeta, videoConfig) {
    this.cid  = containerId;
    this.key  = videoKey;
    this.meta = videoMeta;
    this.cfg  = videoConfig;
    this.done = new Set();
    this.t    = 0;
    this.player = null;
    this._usingFallback = false;
    this._ytInitFallbackTimer = null;

    // Register — no inline JSON needed
    window._ivpRegistry[this.cid] = { cfg: this.cfg, meta: this.meta, key: this.key };

    this._render();
    this._boot();
  }

  _boot() {
    if (window._ytReady) {
      this._init();
    } else {
      window._ytQueue.push(() => this._init());
      if (!document.getElementById('yt-api-script')) {
        const s   = document.createElement('script');
        s.id      = 'yt-api-script';
        s.src     = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }

      this._ytInitFallbackTimer = setTimeout(() => {
        if (!window._ytReady) this._renderFallbackPlayer();
      }, 7000);
    }
  }

  _render() {
    const el = document.getElementById(this.cid);
    if (!el) return;

    const markers = IVP_SCREEN_OVERLAYS_ENABLED
      ? this.cfg.ix.map(x =>
          `<div class="ivp-marker" style="left:0%" data-t="${x.t}"></div>`
        ).join('')
      : '';

    const chapters = this.cfg.chapters.map((c, i) =>
      `<span class="ivp-ch-l" onclick="seekChapter('${this.cid}',${i})">${c.n}</span>`
    ).join('');

    const topicPills = this.cfg.scope?.map(s =>
      `<span class="ivp-topic-pill">${s}</span>`
    ).join('') || '';

    el.innerHTML = `
      <div class="ivp">
        <div class="ivp-head">
          <span class="ivp-label">Watch</span>
          <span class="ivp-vid-title">${this.meta.title}</span>
          <button class="ivp-ibtn" id="btn-chat-${this.cid}"
            onclick="toggleIVPChat('${this.cid}')">🤖 Ask about this video</button>
        </div>

        <div class="ivp-body">
          <div class="ivp-vcol">
            <div class="ivp-wrap">
              <div id="yt-frame-${this.cid}"></div>
              <div class="ivp-overlay" id="ovl-${this.cid}"></div>
            </div>
            <div class="ivp-chbar">
              <div class="ivp-track" id="track-${this.cid}">
                <div class="ivp-fill" id="fill-${this.cid}"></div>
                ${markers}
              </div>
              <div class="ivp-ch-labels">${chapters}</div>
            </div>
          </div>

          <div class="ivp-chat" id="chat-${this.cid}" style="display:none;">
            <div class="ivp-chat-hd">
              <div>
                <div style="font-weight:700;font-size:14px;">Video Tutor</div>
                <div style="font-size:11px;opacity:.6;">Answers questions about this video only</div>
              </div>
            </div>
            ${topicPills ? `<div class="ivp-topics">
              <div class="ivp-topics-label">I can help with:</div>
              <div class="ivp-topics-pills">${topicPills}</div>
            </div>` : ''}
            <div class="ivp-chat-msgs" id="msgs-${this.cid}">
              <div class="ivp-msg ai">Ask me anything about this video.</div>
            </div>
            <div class="ivp-chat-in">
              <input type="text" id="in-${this.cid}" placeholder="Ask about this video…"
                onkeydown="if(event.key==='Enter'){event.preventDefault();sendIVPChat('${this.cid}');}">
              <button onclick="sendIVPChat('${this.cid}')">Ask</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  _init() {
    const frameEl = document.getElementById(`yt-frame-${this.cid}`);
    if (!frameEl) return;

    if (!window.YT || !window.YT.Player) {
      this._renderFallbackPlayer();
      return;
    }

    if (this._ytInitFallbackTimer) {
      clearTimeout(this._ytInitFallbackTimer);
      this._ytInitFallbackTimer = null;
    }

    let ready = false;
    this._ytInitFallbackTimer = setTimeout(() => {
      if (!ready) this._renderFallbackPlayer();
    }, 8000);

    this.player = new YT.Player(`yt-frame-${this.cid}`, {
      videoId:    this.meta.id,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
        controls: 1,
        fs: 1
      },
      events: {
        onReady: () => {
          ready = true;
          if (this._ytInitFallbackTimer) {
            clearTimeout(this._ytInitFallbackTimer);
            this._ytInitFallbackTimer = null;
          }
          window._players[this.cid] = this.player;
          setInterval(() => this._tick(), 1000);
          setTimeout(() => {
            const dur = this.player.getDuration();
            if (dur > 0) {
              document.querySelectorAll(`#track-${this.cid} .ivp-marker`).forEach((m, i) => {
                if (this.cfg.ix[i]) m.style.left = (this.cfg.ix[i].t / dur * 100) + '%';
              });
            }
          }, 2000);
        },
        onError: () => this._renderFallbackPlayer()
      }
    });
  }

  _renderFallbackPlayer() {
    if (this._usingFallback) return;

    const frameEl = document.getElementById(`yt-frame-${this.cid}`);
    if (!frameEl || !this.meta?.id) return;

    this._usingFallback = true;
    frameEl.innerHTML = `
      <iframe
        src="https://www.youtube-nocookie.com/embed/${this.meta.id}?rel=0&playsinline=1"
        title="${this.meta.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>
      <div class="ivp-fallback-note">
        If video does not load,
        <button class="ivp-open-btn" onclick="window.open('https://www.youtube.com/watch?v=${this.meta.id}', '_blank')">Open on YouTube</button>
      </div>`;
  }

  _tick() {
    if (!this.player?.getCurrentTime) return;
    this.t     = Math.floor(this.player.getCurrentTime());
    const dur  = this.player.getDuration();
    const fill = document.getElementById(`fill-${this.cid}`);
    if (fill && dur > 0) fill.style.width = (this.t / dur * 100) + '%';

    if (!IVP_SCREEN_OVERLAYS_ENABLED) return;

    this.cfg.ix.forEach(x => {
      if (this.t === x.t && !this.done.has(x.id)) {
        this.done.add(x.id);
        this.player.pauseVideo();
        this._showOverlay(x);
      }
    });
  }

  _showOverlay(x) {
    const ovl = document.getElementById(`ovl-${this.cid}`);
    if (!ovl) return;

    if (x.type === 'mcq') {
      // Encode feedback to avoid any quote issues in onclick
      const encodedFb = encodeURIComponent(x.fb || '');
      ovl.innerHTML = `
        <div class="ivp-card">
          <div class="ivp-card-type">Pause &amp; Think</div>
          <p class="ivp-card-q">${x.q}</p>
          <div class="ivp-opts">
            ${x.opts.map((o, i) => `
              <button class="ivp-opt"
                onclick="_ivpCheckMCQ('${this.cid}',${i},${x.ok},'${encodedFb}')">
                <span class="ivp-opt-letter">${String.fromCharCode(65+i)}</span>
                <span class="ivp-opt-text">${o}</span>
              </button>`).join('')}
          </div>
          <div id="ivp-fb-${this.cid}" class="ivp-mcq-fb" style="display:none;"></div>
        </div>`;

    } else {
      // Reflection — encode question to avoid quote issues in onclick
      const encodedQ = encodeURIComponent(x.q || '');
      const reflState = _ivpLoadReflectionState(this.cid, x.id);
      const savedText = reflState?.text || '';
      const savedFeedback = reflState?.feedback || '';
      const submitted = !!reflState?.submitted;
      const aiDetection = reflState?.aiDetection;
      const aiWarnHtml = aiDetection && aiDetection.isRiskFlag ? `
        <div style="background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:12px;margin:12px 0 12px 0;">
          <div style="display:flex;gap:12px;align-items:flex-start;font-size:13px;">
            <div style="font-size:20px;flex-shrink:0;">⚠️</div>
            <div style="flex:1;">
              <div style="font-weight:700;color:#991b1b;margin-bottom:4px;">Integrity Alert</div>
              <p style="color:#7f1d1d;margin:0 0 4px 0;font-size:12px;">${aiDetection.recommendation}</p>
              <div style="font-size:11px;color:#7f1d1d;">
                <strong>Why:</strong> ${(aiDetection.reasons || []).slice(0, 2).join(' ')}
              </div>
            </div>
          </div>
        </div>
      ` : '';
      ovl.innerHTML = `
        <div class="ivp-card">
          <div class="ivp-card-type">Pause &amp; Reflect</div>
          <p class="ivp-card-q">${x.q}</p>
          <textarea id="ivp-refl-${this.cid}-${x.id}" class="ivp-refl-ta"
            rows="3" placeholder="${x.ph || 'Write your reflection here…'}" ${submitted ? 'readonly' : ''}>${savedText}</textarea>
          <div id="ivp-refl-save-${this.cid}-${x.id}" style="font-size:12px;color:var(--green);margin-top:6px;">Saved locally</div>
          <div class="ivp-refl-footer">
            <button class="ivp-refl-btn" id="ivp-refl-btn-${this.cid}-${x.id}" ${submitted ? 'style="display:none;"' : ''}
              onclick="_ivpSubmitReflection('${this.cid}','${x.id}','${encodedQ}')">
              Get AI feedback
            </button>
            <button class="ivp-go-plain" onclick="_ivpClearReflection('${this.cid}','${x.id}')">Clear</button>
            <button class="ivp-go-plain" onclick="resumeVideo('${this.cid}')">Skip →</button>
          </div>
          <div id="ivp-refl-fb-${this.cid}-${x.id}" class="ivp-mcq-fb" style="display:${savedFeedback ? 'block' : 'none'};">${savedFeedback ? `${aiWarnHtml}<div class="ivp-fb-text">💬 ${savedFeedback}</div><div style="margin-top:14px;text-align:right;"><button class="ivp-go" onclick="resumeVideo('${this.cid}')">Continue watching →</button></div>` : ''}</div>
        </div>`;

      const ta = document.getElementById(`ivp-refl-${this.cid}-${x.id}`);
      if (ta && !submitted) {
        ta.addEventListener('input', () => {
          const now = new Date();
          _ivpSaveReflectionState(this.cid, x.id, {
            text: ta.value,
            feedback: savedFeedback,
            submitted: false,
            savedAt: now.getTime()
          });
          _ivpSetReflectionSavedIndicator(this.cid, x.id, now);
        });
      }
    }

    ovl.classList.add('show');
  }
}

// src/components/jeeves/jeeves-button.js
// ─────────────────────────────────────────────
// Floating push-to-talk mic button. Mounts at the bottom-right of the
// page for lecturers/moderators who have opted in.
//
// Hotkey: Ctrl+Shift+J toggles listening.
// Tap/click: press-and-hold to speak, release to send.
// ─────────────────────────────────────────────

import { listen, detectBackend } from './voice-input.js';
import { speak, stop as stopSpeaking, primeVoice } from './voice-output.js';
import { runTurn } from './agent.js';
import { createRedactor } from './redactor.js';
import {
  startConversation,
  endConversation,
  isArmed as isConvoArmed,
  isSupported as isConvoSupported,
  getState as getConvoState,
} from './conversation.js';
import { isDeepThinkRequest, runDeepThink } from './deep-think.js';
import { getUserPermissions } from './guard-rails.js';

const BUTTON_ID = 'jeeves-fab';
const STATUS_ID = 'jeeves-status';

let _mounted = false;
let _listening = false;
let _history = [];
let _redactor = null;

/**
 * Mount the floating button. Safe to call more than once.
 * @param {{role:string, uid:string}} ctx
 * @param {{roster?:Array}} [opts]
 */
export function mountJeevesButton(ctx, opts = {}) {
  if (_mounted || typeof document === 'undefined') return;
  _mounted = true;

  _redactor = createRedactor(opts.roster || _inferRoster());
  primeVoice(); // warm up voice selection so the first reply isn't delayed

  const style = document.createElement('style');
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed; right: 20px; bottom: 20px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg,#0d9488,#0891b2);
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,.35);
      font-family: Inter, system-ui, sans-serif; font-size: 22px;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    #${BUTTON_ID}:hover { transform: scale(1.05); }
    #${BUTTON_ID}.listening {
      background: linear-gradient(135deg,#dc2626,#f97316);
      animation: jeeves-pulse 1.2s ease-in-out infinite;
    }
    #${BUTTON_ID}.armed {
      background: linear-gradient(135deg,#7c3aed,#4f46e5);
      box-shadow: 0 6px 20px rgba(124,58,237,.5);
    }
    #${BUTTON_ID}.armed::after {
      content: ''; position: absolute; top: 4px; right: 4px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #c4b5fd; box-shadow: 0 0 8px #c4b5fd;
    }
    #${BUTTON_ID}.capturing { background: linear-gradient(135deg,#16a34a,#0d9488); }
    #${BUTTON_ID}.thinking  { background: linear-gradient(135deg,#f59e0b,#d97706); }
    #${BUTTON_ID}.speaking  { background: linear-gradient(135deg,#2563eb,#0891b2); }
    @keyframes jeeves-pulse {
      0%,100% { box-shadow: 0 6px 20px rgba(220,38,38,.4); }
      50%     { box-shadow: 0 6px 32px rgba(220,38,38,.9); }
    }
    #${STATUS_ID} {
      position: fixed; right: 88px; bottom: 28px; z-index: 9999;
      background: rgba(15,23,42,.92); color: #e2e8f0;
      padding: 8px 14px; border-radius: 10px;
      font-family: Inter, system-ui, sans-serif; font-size: 13px;
      max-width: 320px; pointer-events: none;
      opacity: 0; transform: translateX(8px);
      transition: opacity .2s ease, transform .2s ease;
    }
    #${STATUS_ID}.visible { opacity: 1; transform: translateX(0); }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Jeeves voice assistant');
  btn.title = 'Hold to talk to Jeeves (Ctrl+Shift+J)';
  btn.textContent = '🎙';
  document.body.appendChild(btn);

  const status = document.createElement('div');
  status.id = STATUS_ID;
  document.body.appendChild(status);

  // Feature-detect
  if (detectBackend() === 'none') {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.title = 'Voice input not supported on this device';
  }

  btn.addEventListener('click', () => toggleListening(ctx));
  btn.addEventListener('dblclick', (e) => {
    e.preventDefault();
    toggleWakeWord(ctx);
  });
  btn.title = 'Click: push-to-talk · Double-click: arm "hello Jeeves" · Ctrl+Shift+J: talk';

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      toggleListening(ctx);
    }
  });
}

function toggleWakeWord(ctx) {
  const btn = document.getElementById(BUTTON_ID);
  const status = document.getElementById(STATUS_ID);
  if (!isConvoSupported()) {
    _setStatus(status, 'Conversation mode not supported in this browser.', 3000);
    return;
  }
  if (isConvoArmed()) {
    endConversation('manual');
    return;
  }
  const ok = startConversation({
    onWake: () => {
      _setStatus(status, 'Yes?', 1500);
    },
    onStateChange: (s) => {
      if (!btn) return;
      btn.classList.remove('thinking', 'capturing', 'speaking');
      if (s === 'capturing') { btn.classList.add('capturing'); _setStatus(status, 'Listening…'); }
      else if (s === 'thinking') { btn.classList.add('thinking'); _setStatus(status, 'Thinking…'); }
      else if (s === 'speaking') { btn.classList.add('speaking'); }
      else if (s === 'idle') { _setStatus(status, 'Say "hello Jeeves" to wake me.', 2500); }
    },
    onSleep: (reason) => {
      btn?.classList.remove('armed', 'thinking', 'capturing', 'speaking');
      _setStatus(status, reason === 'goodbye' ? 'Goodbye.' : 'Conversation ended.', 2000);
      if (reason !== 'manual') speak("Goodbye for now.");
    },
    onError: (err) => console.warn('[jeeves:convo]', err),
    onTurn: async (transcript) => {
      try {
        // Check for deep-think request
        const perms = getUserPermissions(ctx);
        if (perms.deepThink && isDeepThinkRequest(transcript)) {
          const result = await runDeepThink(transcript, ctx);
          return result.reply;
        }

        const { reply, history } = await runTurn({
          transcript,
          ctx,
          redactor: _redactor,
          history: _history,
        });
        _history = history.slice(-20);
        _setStatus(status, reply, 8000);
        return reply;
      } catch (err) {
        return `Something went wrong: ${err.message}`;
      }
    },
  });
  if (ok) {
    btn?.classList.add('armed');
    _setStatus(status, 'Listening for "hello Jeeves"…', 3000);
    speak("I'm listening. Just say hello Jeeves whenever you need me.");
  }
}

const LS_KEY = 'jeeves:enabled';

/** Is the user opted in? Persisted in localStorage so it survives reloads. */
export function isJeevesEnabled() {
  try {
    if (localStorage.getItem(LS_KEY) === '1') return true;
    if (localStorage.getItem(LS_KEY) === '0') return false;
    // No stored preference yet → default ON for lecturers/moderators.
    return true;
  } catch {
    return true;
  }
}

export function _persistJeevesEnabled(flag) {
  try { localStorage.setItem(LS_KEY, flag ? '1' : '0'); } catch { /* noop */ }
}

/** Best-effort roster from STATE. Used for PII redaction. */
function _inferRoster() {
  const s = (typeof window !== 'undefined' ? window.STATE : null) || {};
  const sources = [s.roster, s.classList, s.students, s.users];
  for (const src of sources) {
    if (Array.isArray(src) && src.length) return src;
    if (src && typeof src === 'object') return Object.values(src);
  }
  return [];
}

async function toggleListening(ctx, { fromWake = false } = {}) {
  const btn = document.getElementById(BUTTON_ID);
  const status = document.getElementById(STATUS_ID);
  if (!btn || _listening) return;

  // Push-to-talk can't coexist with conversation mode (only one mic
  // session at a time on Chrome). If convo is armed, end it first.
  if (isConvoArmed()) endConversation('manual');

  _listening = true;
  btn.classList.add('listening');
  btn.textContent = '■';
  _setStatus(status, 'Listening…');

  let transcript = '';
  try {
    transcript = await listen({ onPartial: (t) => _setStatus(status, `“${t}”`) });
  } catch (err) {
    _setStatus(status, `Mic error: ${err.message}`, 3000);
    _listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎙';
    return;
  }

  btn.textContent = '…';
  
  // Check if this is a deep-think request
  const perms = getUserPermissions(ctx);
  if (perms.deepThink && isDeepThinkRequest(transcript)) {
    _setStatus(status, 'Deep thinking…');
    const result = await runDeepThink(transcript, ctx);
    _setStatus(status, result.reply, 8000);
    speak(result.reply);
    _listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎙';
    return;
  }
  
  _setStatus(status, 'Thinking…');

  if (!transcript) {
    _setStatus(status, "I didn't catch that.", 2500);
    _listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎙';
    return;
  }

  try {
    const { reply, history } = await runTurn({
      transcript,
      ctx,
      redactor: _redactor,
      history: _history,
      onEvent: (ev) => {
        if (ev.type === 'tool_calls') _setStatus(status, `Running ${ev.data.map(c => c.name).join(', ')}…`);
      },
    });
    _history = history.slice(-20); // keep the tail, bound memory
    _setStatus(status, reply, 6000);
    speak(reply);
  } catch (err) {
    const msg = `Something went wrong: ${err.message}`;
    _setStatus(status, msg, 4000);
    speak("Sorry, something went wrong.");
  } finally {
    _listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎙';
  }
}

function _setStatus(el, text, hideAfter = 0) {
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  if (hideAfter) {
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('visible'), hideAfter);
  }
}

/** Unmount — used if the user signs out or disables Jeeves. */
export function unmountJeevesButton() {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(STATUS_ID)?.remove();
  _mounted = false;
  _history = [];
  stopSpeaking();
}

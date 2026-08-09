// src/components/jeeves/wake-word.js
// ─────────────────────────────────────────────
// Background "hello jeeves" / "goodbye jeeves" detector for the web.
//
// Uses Web Speech API in continuous mode. When the phrase is heard in
// the interim transcript stream, a callback fires. Auto-restarts if the
// browser ends the session (Chrome caps a single recognition at ~60s).
//
// Limits:
// - Web only. On Android the Capacitor plugin only exposes one-shot
//   recognition; wake-word mode there would need a native hot-word
//   engine (Porcupine/Picovoice), which is a separate skill pack.
// - Requires mic permission up front and keeps the mic open while armed.
// ─────────────────────────────────────────────

const HELLO_PATTERNS = [
  /\bhe(?:l|ll|y)o,?\s+jeeves\b/i,
  /\bhi,?\s+jeeves\b/i,
  /\bhey,?\s+jeeves\b/i,
  /\bokay,?\s+jeeves\b/i,
  /\bjeeves\b/i, // fallback — bare "jeeves" also triggers
];
const GOODBYE_PATTERNS = [
  /\bgood\s*bye,?\s+jeeves\b/i,
  /\bbye,?\s+jeeves\b/i,
  /\bthat'?s\s+all,?\s+jeeves\b/i,
  /\bstop\s+listening\b/i,
];

let _rec = null;
let _armed = false;
let _suspended = false;
let _handlers = { onWake: null, onSleep: null, onError: null };

export function isArmed() { return _armed; }
export function isSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Start background wake-word listening.
 * @param {{onWake?:()=>void, onSleep?:()=>void, onError?:(e:any)=>void}} handlers
 */
export function armWakeWord(handlers = {}) {
  if (_armed) return true;
  if (!isSupported()) return false;

  _handlers = { ..._handlers, ...handlers };
  _armed = true;
  _startSession();
  return true;
}

export function disarmWakeWord() {
  _armed = false;
  _stopSession();
}

/**
 * Temporarily pause wake-word listening (e.g. while the agent is itself
 * speaking or running a foreground turn) without forgetting the armed state.
 */
export function suspendWakeWord() {
  if (!_armed || _suspended) return;
  _suspended = true;
  _stopSession();
}
export function resumeWakeWord() {
  if (!_armed || !_suspended) return;
  _suspended = false;
  _startSession();
}

function _startSession() {
  if (!_armed || _suspended) return;
  try {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      // Walk all fresh results and scan the combined transcript for
      // wake / sleep phrases. Interim results arrive fast so the user
      // feels an immediate response.
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += e.results[i][0].transcript + ' ';
      }
      chunk = chunk.trim();
      if (!chunk) return;

      if (GOODBYE_PATTERNS.some(p => p.test(chunk))) {
        try { _handlers.onSleep?.(); } catch { /* noop */ }
        disarmWakeWord();
        return;
      }
      if (HELLO_PATTERNS.some(p => p.test(chunk))) {
        try { _handlers.onWake?.(); } catch { /* noop */ }
        // onWake is expected to suspend us while it runs the foreground
        // turn, then resume. If it forgets we'll just keep listening.
      }
    };

    rec.onerror = (e) => {
      try { _handlers.onError?.(e); } catch { /* noop */ }
      // "no-speech" and "aborted" are benign; just restart on the next tick.
    };

    rec.onend = () => {
      // Chrome caps continuous sessions. Respawn if still armed.
      _rec = null;
      if (_armed && !_suspended) setTimeout(_startSession, 200);
    };

    rec.start();
    _rec = rec;
  } catch (err) {
    try { _handlers.onError?.(err); } catch { /* noop */ }
    _rec = null;
  }
}

function _stopSession() {
  if (_rec) {
    try { _rec.onend = null; _rec.stop(); } catch { /* noop */ }
    _rec = null;
  }
}

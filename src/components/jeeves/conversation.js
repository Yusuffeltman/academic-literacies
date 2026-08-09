// src/components/jeeves/conversation.js
// ─────────────────────────────────────────────
// Continuous conversation mode for Jeeves.
//
// One long-lived Web Speech recognition session drives a small state
// machine:
//
//   idle        ← armed, waiting for the wake phrase
//   capturing   ← user is speaking; we accumulate their turn
//   thinking    ← agent is running
//   speaking    ← TTS playing; listening for barge-in
//
// Features:
// - Wake phrase ("hello jeeves", etc.) moves idle → capturing.
// - Natural turn endpointing: ~1.4s of silence finalises the user turn.
// - Once the agent has replied, we stay in capturing — the lecturer can
//   keep talking without re-saying the wake word.
// - Barge-in: speaking while Jeeves is talking cancels TTS instantly.
// - Idle timeout: after ~18s of no speech post-reply, we drop back to idle
//   so the lecturer doesn't have to say "goodbye" explicitly.
// - Goodbye phrase anywhere ends the conversation and disarms.
//
// Web only — Android's Capacitor speech plugin is one-shot, so on
// Android the button falls back to push-to-talk.
// ─────────────────────────────────────────────

import { speak, stop as stopSpeaking } from './voice-output.js';

const HELLO_RE = /\b(?:hello|hi|hey|okay)[ ,]*jeeves\b/i;
const BARE_WAKE_RE = /\bjeeves\b/i; // fallback
const GOODBYE_RE = /\b(?:good\s*bye|bye|that'?s all|stop listening)[ ,]*(?:jeeves)?\b/i;

const TURN_END_SILENCE_MS = 1400;
const POST_REPLY_IDLE_MS = 18000;
const BARGE_IN_MIN_WORDS = 2;
const BARGE_IN_MIN_FINAL_CHARS = 10;
const BARGE_IN_COMMAND_RE = /\b(?:stop|wait|hold on|pause)\b/i;
const BARGE_IN_WAKE_RE = /^(?:hello|hi|hey|okay)?[ ,]*jeeves\b/i;

const STATE = Object.freeze({ IDLE: 'idle', CAPTURE: 'capturing', THINK: 'thinking', SPEAK: 'speaking' });

let _rec = null;
let _armed = false;
let _state = STATE.IDLE;
let _captureBuffer = '';
let _lastFinalLen = 0;
let _silenceTimer = null;
let _idleTimer = null;
let _handlers = {};
let _speakStartedAt = 0;
let _lastSpokenReply = '';

export function isArmed() { return _armed; }
export function getState() { return _state; }
export function isSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Start a conversation session.
 *
 * @param {{
 *   onTurn: (transcript:string) => Promise<string>,
 *   onStateChange?: (state:string) => void,
 *   onWake?: () => void,
 *   onSleep?: (reason:string) => void,
 *   onError?: (err:any) => void,
 * }} handlers
 */
export function startConversation(handlers) {
  if (_armed) return true;
  if (!isSupported()) return false;
  _handlers = handlers || {};
  _armed = true;
  _setState(STATE.IDLE);
  _spawnRecognition();
  return true;
}

export function endConversation(reason = 'manual') {
  _armed = false;
  _clearTimers();
  try { stopSpeaking(); } catch { /* noop */ }
  if (_rec) {
    try { _rec.onend = null; _rec.onresult = null; _rec.stop(); } catch { /* noop */ }
    _rec = null;
  }
  _captureBuffer = '';
  _lastFinalLen = 0;
  _speakStartedAt = 0;
  _lastSpokenReply = '';
  _setState(STATE.IDLE);
  try { _handlers.onSleep?.(reason); } catch { /* noop */ }
}

function _setState(next) {
  if (_state === next) return;
  _state = next;
  try { _handlers.onStateChange?.(next); } catch { /* noop */ }
}

function _clearTimers() {
  if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
  if (_idleTimer)    { clearTimeout(_idleTimer);    _idleTimer    = null; }
}

function _countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function _normalizeSpeech(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function _looksLikeSpokenEcho(text) {
  const heard = _normalizeSpeech(text);
  const spoken = _normalizeSpeech(_lastSpokenReply);
  if (!heard || !spoken || heard.length < 8) return false;
  return spoken.includes(heard) || heard.includes(spoken.slice(0, Math.min(spoken.length, 24)));
}

function _isBargeIn(text, { allowShortCommand = false } = {}) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;

  if (allowShortCommand && BARGE_IN_COMMAND_RE.test(normalized)) {
    return true;
  }

  const wordCount = _countWords(normalized);
  return wordCount >= BARGE_IN_MIN_WORDS && normalized.length >= BARGE_IN_MIN_FINAL_CHARS;
}

function _isExplicitBargeIn(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;
  if (BARGE_IN_COMMAND_RE.test(normalized)) return true;
  if (BARGE_IN_WAKE_RE.test(normalized) && _isBargeIn(normalized)) return true;
  return false;
}

function _armIdleTimeout() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    if (_armed && _state === STATE.CAPTURE && !_captureBuffer.trim()) {
      _setState(STATE.IDLE);
      // Don't speak here — we're mid-session and it would feel nagging.
    }
  }, POST_REPLY_IDLE_MS);
}

function _armSilenceTimer() {
  if (_silenceTimer) clearTimeout(_silenceTimer);
  _silenceTimer = setTimeout(() => _finaliseTurn(), TURN_END_SILENCE_MS);
}

function _spawnRecognition() {
  if (!_armed) return;
  try {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = _onResult;
    rec.onerror = (e) => {
      // no-speech / aborted are benign; let onend restart us.
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        try { _handlers.onError?.(e); } catch { /* noop */ }
      }
    };
    rec.onend = () => {
      _rec = null;
      if (_armed) setTimeout(_spawnRecognition, 150);
    };

    rec.start();
    _rec = rec;
  } catch (err) {
    try { _handlers.onError?.(err); } catch { /* noop */ }
  }
}

function _onResult(e) {
  if (!_armed) return;

  let interim = '';
  let fresh = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    const txt = r[0]?.transcript || '';
    if (r.isFinal) fresh += txt + ' ';
    else interim += txt + ' ';
  }
  interim = interim.trim();
  fresh = fresh.trim();
  const combined = `${fresh} ${interim}`.trim();
  if (!combined) return;

  // Goodbye wins over everything.
  if (GOODBYE_RE.test(combined)) {
    endConversation('goodbye');
    return;
  }

  switch (_state) {
    case STATE.IDLE: {
      if (HELLO_RE.test(combined) || BARE_WAKE_RE.test(combined)) {
        // Strip the wake phrase from the start so the first turn doesn't
        // include "hello jeeves".
        const cleaned = combined
          .replace(HELLO_RE, '')
          .replace(/^\s*jeeves[ ,]*/i, '')
          .trim();
        _captureBuffer = cleaned;
        _lastFinalLen = fresh ? fresh.length : 0;
        _setState(STATE.CAPTURE);
        try { _handlers.onWake?.(); } catch { /* noop */ }
        _armSilenceTimer();
      }
      break;
    }

    case STATE.CAPTURE: {
      if (fresh) {
        _captureBuffer = `${_captureBuffer} ${fresh}`.trim();
      }
      // Any activity → reset the endpoint timer.
      _armSilenceTimer();
      break;
    }

    case STATE.SPEAK: {
      if (_looksLikeSpokenEcho(combined)) {
        break;
      }

      // Only explicit, final speech may interrupt playback. Interim text is
      // too noisy here and often captures Jeeves' own TTS through speakers.
      if (fresh && _isExplicitBargeIn(fresh)) {
        try { stopSpeaking(); } catch { /* noop */ }
        const cleaned = fresh.replace(BARGE_IN_WAKE_RE, '').trim();
        _captureBuffer = cleaned;
        _speakStartedAt = 0;
        _lastSpokenReply = '';
        _setState(STATE.CAPTURE);
        _armSilenceTimer();
      }
      break;
    }

    case STATE.THINK:
      // Ignore input while agent is running.
      break;
  }
}

async function _finaliseTurn() {
  if (!_armed) return;
  if (_state !== STATE.CAPTURE) return;
  const transcript = (_captureBuffer || '').trim();
  if (!transcript) {
    _armIdleTimeout();
    return;
  }

  _captureBuffer = '';
  _setState(STATE.THINK);

  let reply = '';
  try {
    reply = await _handlers.onTurn?.(transcript) || '';
  } catch (err) {
    reply = "Sorry, I hit an error. Try that again?";
    try { _handlers.onError?.(err); } catch { /* noop */ }
  }

  if (!_armed) return;

  if (reply) {
    _setState(STATE.SPEAK);
    _speakStartedAt = Date.now();
    _lastSpokenReply = reply;
    try { await speak(reply); } catch { /* noop */ }
  }

  if (!_armed) return;

  // Loop: drop back to capturing so the lecturer can keep talking.
  _speakStartedAt = 0;
  _lastSpokenReply = '';
  _setState(STATE.CAPTURE);
  _armIdleTimeout();
}

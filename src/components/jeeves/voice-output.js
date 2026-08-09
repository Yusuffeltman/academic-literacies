// src/components/jeeves/voice-output.js
// ─────────────────────────────────────────────
// VoiceOutputAdapter — thin wrapper over the browser's SpeechSynthesis
// API. Android's WebView exposes the same API, so we don't need a
// native path here. (challenge-arena.js already uses this same API for
// narrator announcements.)
// ─────────────────────────────────────────────

let _preferredVoice = null;
let _voicesReadyPromise = null;

// Names of known "natural" / neural voices across platforms, ranked. The
// first one present wins. These are the ones that actually sound warm —
// default browser voices are robotic.
const VOICE_PREFERENCES = [
  /Google UK English Male/i,
  /Google UK English Female/i,
  /Microsoft Ryan Online.*Natural/i,
  /Microsoft Libby Online.*Natural/i,
  /Microsoft Sonia Online.*Natural/i,
  /Microsoft Aria Online.*Natural/i,
  /Microsoft Guy Online.*Natural/i,
  /Daniel.*en-GB/i,
  /Karen.*en-AU/i,
  /Serena/i,
  /Samantha/i,
];

/** Some browsers populate the voice list asynchronously — wait for it. */
function _voicesReady() {
  if (_voicesReadyPromise) return _voicesReadyPromise;
  _voicesReadyPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length) return resolve(existing);
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices() || []);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Safety fallback
    setTimeout(() => resolve(window.speechSynthesis.getVoices() || []), 1500);
  });
  return _voicesReadyPromise;
}

async function _pickVoice() {
  if (_preferredVoice) return _preferredVoice;
  const voices = await _voicesReady();
  if (!voices.length) return null;

  for (const pref of VOICE_PREFERENCES) {
    const hit = voices.find(v => pref.test(v.name));
    if (hit) { _preferredVoice = hit; return hit; }
  }
  // Regional English fallbacks.
  _preferredVoice =
    voices.find(v => /en-GB/i.test(v.lang) && /female/i.test(v.name)) ||
    voices.find(v => /en-GB/i.test(v.lang)) ||
    voices.find(v => /en-ZA/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    voices[0] || null;
  return _preferredVoice;
}

/** Let callers pre-warm voice selection at boot so the first reply isn't delayed. */
export async function primeVoice() { try { await _pickVoice(); } catch { /* noop */ } }

/** Let the user cycle through installed English voices manually if they want. */
export async function listVoices() {
  const voices = await _voicesReady();
  return voices.filter(v => /^en/i.test(v.lang)).map(v => ({ name: v.name, lang: v.lang }));
}
export function setVoiceByName(name) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const hit = voices.find(v => v.name === name);
  if (hit) { _preferredVoice = hit; return true; }
  return false;
}
if (typeof window !== 'undefined') {
  window.jeevesListVoices = listVoices;
  window.jeevesSetVoice = setVoiceByName;
}

/**
 * Speak a line of text. Interrupts anything already being spoken.
 * Resolves when the utterance finishes (or immediately if TTS is unavailable).
 * @param {string} text
 * @param {{lang?:string, rate?:number, pitch?:number}} [opts]
 */
export async function speak(text, { lang = 'en-GB', rate = 1.05, pitch = 1.05 } = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  const voice = await _pickVoice();
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice?.lang || lang;
      u.rate = rate;
      u.pitch = pitch;
      if (voice) u.voice = voice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

/** Stop any in-flight speech. */
export function stop() {
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

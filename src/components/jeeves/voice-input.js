// src/components/jeeves/voice-input.js
// ─────────────────────────────────────────────
// VoiceInputAdapter — a single `listen()` API that picks the right STT
// backend at runtime.
//
//   web      → Web Speech API (window.SpeechRecognition /
//              webkitSpeechRecognition)
//   android  → @capacitor-community/speech-recognition (selected when
//              window.__ACADEMIC_APP_SURFACE.voice?.nativeSTT === true)
//
// Push-to-talk only for v1 — wake-word is a deferred skill pack.
// ─────────────────────────────────────────────

/**
 * Feature-detect the best available backend.
 * @returns {'native'|'web'|'none'}
 */
export function detectBackend() {
  const surface = (typeof window !== 'undefined' ? window.__ACADEMIC_APP_SURFACE : null) || {};
  if (surface.voice?.nativeSTT) return 'native';
  if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) return 'web';
  return 'none';
}

/**
 * Listen for a single utterance and return the transcript.
 * Rejects if the user cancels or if no backend is available.
 *
 * @param {{lang?:string, onPartial?:(text:string)=>void}} [opts]
 * @returns {Promise<string>}
 */
export async function listen(opts = {}) {
  const backend = detectBackend();
  if (backend === 'native') return _listenNative(opts);
  if (backend === 'web') return _listenWeb(opts);
  throw new Error('No speech recognition backend available on this device.');
}

function _listenWeb({ lang = 'en-ZA', onPartial } = {}) {
  return new Promise((resolve, reject) => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = !!onPartial;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = '';
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else if (onPartial) onPartial(r[0].transcript);
      }
    };
    rec.onerror = (e) => reject(new Error(e.error || 'Speech recognition error'));
    rec.onend = () => resolve(finalText.trim());

    try { rec.start(); } catch (err) { reject(err); }
  });
}

async function _listenNative({ lang = 'en-ZA' } = {}) {
  // Lazy-load the Capacitor plugin so the web bundle doesn't pull it in.
  let plugin;
  try {
    plugin = (await import('@capacitor-community/speech-recognition')).SpeechRecognition;
  } catch (e) {
    throw new Error('Native speech plugin not installed — run `npx cap sync android`.');
  }

  const { available } = await plugin.available();
  if (!available) throw new Error('Native speech recognition unavailable on this device.');

  const perm = await plugin.checkPermissions();
  if (perm.speechRecognition !== 'granted') {
    const req = await plugin.requestPermissions();
    if (req.speechRecognition !== 'granted') throw new Error('Microphone permission denied.');
  }

  // One-shot dictation. The plugin supports streaming partials too but we
  // keep v1 simple — lecturer pushes the button, speaks, releases.
  const result = await plugin.start({
    language: lang,
    maxResults: 1,
    prompt: 'Speak to Jeeves',
    partialResults: false,
    popup: false,
  });
  const matches = result?.matches || [];
  return (matches[0] || '').trim();
}

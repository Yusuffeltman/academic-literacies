// src/main.js
import './styles/main.css';
import { initAuth, showAuthScreen } from './auth.js';
import { loadState } from './state.js';
import { initApp } from './app.js';
import { bootJeeves } from './components/jeeves/index.js';
import { initSyncEngine } from './sync-engine.js';

const STATE_LOAD_TIMEOUT_MS = 10000;

// Global safety net — if anything uncaught crashes the app after sign-in,
// show a recovery screen instead of leaving a blank page.
let _appBooted = false;
window.addEventListener('error', (event) => {
  if (_appBooted) return; // only guard the boot phase
  console.error('Uncaught error during app boot:', event.error);
  _showBootRecovery(event.error?.message || 'An unexpected error occurred.');
});
window.addEventListener('unhandledrejection', (event) => {
  if (_appBooted) return;
  console.error('Unhandled rejection during app boot:', event.reason);
  _showBootRecovery(event.reason?.message || 'An unexpected error occurred.');
});

function _showBootRecovery(detail) {
  const app = document.getElementById('app');
  if (app && app.style.display !== 'none') {
    app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;padding:24px;">
      <div style="text-align:center;max-width:400px;">
        <p style="color:#f87171;font-size:15px;font-family:Inter,sans-serif;margin:0 0 12px;">Something went wrong loading the app.</p>
        <p style="color:rgba(255,255,255,.4);font-size:12px;font-family:monospace;margin:0 0 20px;word-break:break-word;">${detail}</p>
        <button onclick="location.reload()" style="background:#0d9488;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;">Refresh and try again</button>
      </div>
    </div>`;
  }
}

initAuth(async (user) => {
  try {
    await Promise.race([
      loadState(user),
      new Promise((_, reject) => setTimeout(() => reject(new Error('State load timed out')), STATE_LOAD_TIMEOUT_MS)),
    ]);
  } catch (err) {
    console.error('State load failed or timed out; continuing with defaults:', err);
  }

  try {
    initApp(user);
    initSyncEngine(user);
    _appBooted = true; // boot complete — stop intercepting errors
    // Jeeves (lecturer voice assistant) — no-op unless role + consent match.
    try {
      const nameMatch = (user?.displayName || '').match(/\[(student|tutor|lecturer|moderator)\]/i);
      const role = nameMatch ? nameMatch[1].toLowerCase() : 'student';
      bootJeeves({ role, uid: user?.uid });
    } catch (e) { console.warn('[jeeves] boot skipped', e); }
  } catch (err) {
    console.error('App init failed after sign-in:', err);
    const errEl = document.getElementById('login-err');
    if (errEl) errEl.textContent = 'Signed in, but failed to load app data. Please refresh and try again.';
    showAuthScreen();
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
  }
});

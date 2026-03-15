// src/main.js
import './styles/main.css';
import { initAuth } from './auth.js';
import { loadState } from './state.js';
import { initApp } from './app.js';

initAuth(async (user) => {
  try {
    await loadState(user);
  } catch (err) {
    console.error('State load failed; continuing with defaults:', err);
  }

  try {
    initApp(user);
  } catch (err) {
    console.error('App init failed after sign-in:', err);
    const errEl = document.getElementById('login-err');
    if (errEl) errEl.textContent = 'Signed in, but failed to load app data. Please refresh and try again.';
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.style.display = 'block';
      authScreen.style.opacity = '1';
    }
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
  }
});

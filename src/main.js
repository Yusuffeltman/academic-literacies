// src/main.js
import './styles/main.css';
import { initAuth } from './auth.js';
import { loadState } from './state.js';
import { initApp } from './app.js';

initAuth(async (user) => {
  await loadState(user);
  initApp(user);
});

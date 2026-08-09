// src/components/jeeves/index.js
// ─────────────────────────────────────────────
// Public entry point for the Jeeves voice assistant.
// Imported from src/main.js after the app has booted.
// ─────────────────────────────────────────────

import { mountJeevesButton, isJeevesEnabled, unmountJeevesButton, _persistJeevesEnabled } from './jeeves-button.js';

// Side-effect imports: each skill module registers itself on import.
import './skills/navigate.js';
import './skills/submissions.js';
import './skills/feedback.js';
import './skills/chat.js';
import './skills/analytics.js';
import './skills/scheduling.js';
import './skills/student-summary.js';
import './skills/announcements.js';
import './skills/readback.js';
import './skills/help.js';
import './skills/database.js';
import './skills/propose-code-change.js';
import './skills/calendar.js';
import './skills/email.js';
import './skills/outlook.js';

// Initialize OAuth integrations
import { initGoogleOAuth } from './integrations/oauth-connector.js';
import { initMicrosoftOAuth } from './integrations/microsoft-oauth.js';

/**
 * Boot Jeeves for the currently signed-in user. Safe to call once the
 * app has resolved the user's role. No-op for roles other than lecturer
 * or moderator, or if consent has not been given.
 *
 * @param {{role:string, uid:string}} ctx
 */
export function bootJeeves(ctx) {
  if (!ctx || (ctx.role !== 'lecturer' && ctx.role !== 'moderator')) return;
  if (!isJeevesEnabled()) return;
  
  // Initialize OAuth integrations in background
  initGoogleOAuth().catch(e => console.warn('[jeeves] Google OAuth init failed', e));
  initMicrosoftOAuth().catch(e => console.warn('[jeeves] Microsoft OAuth init failed', e));
  
  mountJeevesButton(ctx);
}

/** Toggle consent flag and mount/unmount accordingly. */
export function setJeevesEnabled(enabled, ctx) {
  _persistJeevesEnabled(!!enabled);
  if (enabled) bootJeeves(ctx);
  else unmountJeevesButton();
}

// Expose on window for ad-hoc debugging / console use.
if (typeof window !== 'undefined') {
  window.bootJeeves = bootJeeves;
  window.setJeevesEnabled = setJeevesEnabled;
}

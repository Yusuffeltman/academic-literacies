// src/components/jeeves/skills/navigate.js
import { registerSkill } from '../registry.js';

// Map friendly names the LLM might use to anchor hashes / helpers the app
// already understands. The app router is hash-based; falling back to
// location.hash keeps us decoupled from the internal router module.
const VIEW_ALIASES = {
  dashboard: '#dashboard',
  lecturer_dashboard: '#dashboard',
  submissions: '#submissions',
  submission_reviewer: '#submissions',
  reviewer: '#submissions',
  analytics: '#analytics',
  reports: '#analytics',
  chat: '#chat',
  messages: '#chat',
  scheduler: '#scheduler',
  session_planner: '#session-plan',
  session_plan: '#session-plan',
  students: '#students',
  deep_dive: '#students',
  settings: '#settings',
};

registerSkill({
  name: 'navigate_to',
  description: 'Navigate the lecturer UI to a named view (dashboard, submissions, analytics, chat, scheduler, session_plan, students, settings).',
  scope: 'app',
  roles: ['lecturer', 'moderator'],
  parameters: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        description: 'Target view. One of: dashboard, submissions, analytics, chat, scheduler, session_plan, students, settings.',
      },
    },
    required: ['view'],
  },
  handler: async ({ view }) => {
    const key = String(view || '').toLowerCase().replace(/[^a-z_]/g, '_');
    const target = VIEW_ALIASES[key];
    if (!target) return { ok: false, error: `Unknown view '${view}'.` };

    // Prefer a custom navigation helper if the app exposes one.
    if (typeof window.navigateTo === 'function') {
      try { window.navigateTo(target.replace(/^#/, '')); return { ok: true, via: 'navigateTo', view: target }; }
      catch { /* fall through */ }
    }
    window.location.hash = target;
    return { ok: true, via: 'hash', view: target };
  },
});

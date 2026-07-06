// src/components/jeeves/skills/readback.js
import { registerSkill } from '../registry.js';

registerSkill({
  name: 'read_back',
  description: 'Read the visible text of a named region on screen aloud. Use when the lecturer asks "what does the screen say".',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector or "main" for the main content area.' },
    },
  },
  handler: async ({ selector = 'main' }) => {
    const el = document.querySelector(selector) || document.querySelector('main') || document.body;
    const text = (el?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800);
    return { text };
  },
});

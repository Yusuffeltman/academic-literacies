// src/components/jeeves/skills/announcements.js
import { registerSkill } from '../registry.js';
import { _aiChat } from '../../../ai.js';

registerSkill({
  name: 'draft_announcement',
  description: 'Draft an announcement for a given audience and topic. Returns the draft text — does NOT send it.',
  scope: 'app',
  roles: ['lecturer', 'moderator'],
  parameters: {
    type: 'object',
    properties: {
      audience: { type: 'string', description: 'e.g. all students, tutors, class 2B' },
      topic: { type: 'string' },
      tone: { type: 'string', description: 'warm | formal | urgent (default: warm)' },
    },
    required: ['audience', 'topic'],
  },
  handler: async ({ audience, topic, tone = 'warm' }) => {
    const draft = await _aiChat(
      `Draft a ${tone} announcement to ${audience} about: ${topic}. Keep it under 120 words. Do not include a subject line.`,
      { maxTokens: 300 }
    );
    return { draft };
  },
});

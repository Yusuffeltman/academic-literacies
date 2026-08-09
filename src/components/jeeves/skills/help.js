// src/components/jeeves/skills/help.js
import { registerSkill, getAvailableSkills } from '../registry.js';

registerSkill({
  name: 'help',
  description: 'List the things Jeeves can currently do for this user.',
  scope: 'app',
  parameters: { type: 'object', properties: {} },
  handler: async (_args, ctx) => {
    const skills = getAvailableSkills(ctx).map(s => ({ name: s.name, description: s.description }));
    return { count: skills.length, skills };
  },
});

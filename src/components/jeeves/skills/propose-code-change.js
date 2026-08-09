// src/components/jeeves/skills/propose-code-change.js
// ─────────────────────────────────────────────
// Self-improvement skill. Gated behind VITE_JEEVES_CODE_SKILLS=1 and
// restricted to moderators. Never touches the running app — it asks a
// Cloud Function (jeevesProposeCodeChange) to open a draft PR that the
// lecturer reviews by hand.
// ─────────────────────────────────────────────
import { registerSkill } from '../registry.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

const ENABLED = String(import.meta.env.VITE_JEEVES_CODE_SKILLS || '') === '1';

if (ENABLED) {
  registerSkill({
    name: 'propose_code_change',
    description: 'Ask Jeeves to draft a code change against the academic-literacies repo and open a draft PR for review. Never modifies the running app.',
    scope: 'app',
    roles: ['moderator'],
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What you want changed, in plain language.' },
        branchHint: { type: 'string', description: 'Optional branch name hint.' },
      },
      required: ['description'],
    },
    handler: async ({ description, branchHint }, ctx) => {
      const fn = httpsCallable(getFunctions(), 'jeevesProposeCodeChange');
      const { data } = await fn({
        description,
        branchHint: branchHint || null,
        requestedBy: ctx?.uid || null,
      });
      return data || { ok: true };
    },
  });
}

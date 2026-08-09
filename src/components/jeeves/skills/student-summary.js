// src/components/jeeves/skills/student-summary.js
import { registerSkill } from '../registry.js';
import { _aiChat } from '../../../ai.js';
import { getDatabase, ref, get, child } from 'firebase/database';

registerSkill({
  name: 'summarize_student',
  description: 'Read a student\'s profile + adaptive state and return a short narrative summary for the lecturer.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      studentUid: { type: 'string' },
    },
    required: ['studentUid'],
  },
  handler: async ({ studentUid }) => {
    const db = getDatabase();
    const snap = await get(child(ref(db), `users/${studentUid}`));
    if (!snap.exists()) return { ok: false, error: 'Student not found.' };

    const data = snap.val() || {};
    const lean = {
      name: data.profile?.displayName || data.profile?.name || '(unknown)',
      activeUnit: data.state?.activeUnit ?? null,
      skillStatus: data.state?.adaptive?.skill_status || null,
      frustrationIndex: data.state?.adaptive?.frustration_index ?? null,
      needsRemediation: data.state?.adaptive?.needs_remediation || [],
      highPerformer: !!data.state?.adaptive?.high_performer,
    };

    const summary = await _aiChat(
      `Summarise this student for their lecturer in 2 short sentences. Be factual, warm, not condescending.\n\n${JSON.stringify(lean)}`,
      { maxTokens: 160 }
    );
    return { profile: lean, summary };
  },
});

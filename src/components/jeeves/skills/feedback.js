// src/components/jeeves/skills/feedback.js
import { registerSkill } from '../registry.js';
import { getDatabase, ref, update, serverTimestamp } from 'firebase/database';

registerSkill({
  name: 'leave_feedback',
  description: 'Attach a text feedback comment to a specific submission.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      assessmentId: { type: 'string' },
      studentUid: { type: 'string' },
      submissionId: { type: 'string' },
      text: { type: 'string', description: 'The feedback message to save.' },
    },
    required: ['assessmentId', 'studentUid', 'submissionId', 'text'],
  },
  handler: async ({ assessmentId, studentUid, submissionId, text }, ctx) => {
    const clean = String(text || '').trim();
    if (!clean) return { ok: false, error: 'Feedback text is empty.' };
    const db = getDatabase();
    const path = `submissions/${assessmentId}/${studentUid}/${submissionId}/feedback`;
    await update(ref(db, path), {
      text: clean,
      authorUid: ctx?.uid || null,
      updatedAt: serverTimestamp(),
      source: 'jeeves',
    });
    return { ok: true, path };
  },
});

// src/components/jeeves/skills/submissions.js
import { registerSkill } from '../registry.js';
import { getDatabase, ref, get, child } from 'firebase/database';

registerSkill({
  name: 'query_submissions',
  description: 'List submissions for an assessment. Optionally filter by status (submitted, graded, flagged) or by studentUid.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      assessmentId: { type: 'string', description: 'ID of the assessment (e.g. assess01).' },
      status: { type: 'string', description: 'Optional status filter.' },
      studentUid: { type: 'string', description: 'Optional single-student filter.' },
      limit: { type: 'number', description: 'Max results to return (default 20).' },
    },
    required: ['assessmentId'],
  },
  handler: async ({ assessmentId, status, studentUid, limit = 20 }) => {
    const db = getDatabase();
    const snap = await get(child(ref(db), `submissions/${assessmentId}`));
    if (!snap.exists()) return { count: 0, items: [] };

    const items = [];
    snap.forEach((studentNode) => {
      const sUid = studentNode.key;
      if (studentUid && sUid !== studentUid) return;
      studentNode.forEach((subNode) => {
        const data = subNode.val() || {};
        if (status && data.status !== status) return;
        items.push({
          submissionId: subNode.key,
          studentUid: sUid,
          status: data.status || 'submitted',
          submittedAt: data.submittedAt || data.timestamp || null,
          grade: data.grade ?? null,
        });
      });
    });

    items.sort((a, b) => (b.submittedAt || 0) > (a.submittedAt || 0) ? 1 : -1);
    const limited = items.slice(0, Math.max(1, Math.min(100, limit)));
    return { count: items.length, returned: limited.length, items: limited };
  },
});

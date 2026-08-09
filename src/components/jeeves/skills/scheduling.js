// src/components/jeeves/skills/scheduling.js
import { registerSkill } from '../registry.js';
import { getDatabase, ref, push, set, serverTimestamp } from 'firebase/database';

registerSkill({
  name: 'schedule_session',
  description: 'Schedule a tutor/contact session at a future time.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      kind: { type: 'string', description: 'contact | tutorial | drop-in' },
      startIso: { type: 'string', description: 'ISO-8601 start datetime.' },
      durationMinutes: { type: 'number' },
      memberUids: { type: 'array', items: { type: 'string' } },
      title: { type: 'string' },
    },
    required: ['kind', 'startIso'],
  },
  handler: async ({ kind, startIso, durationMinutes = 60, memberUids = [], title }, ctx) => {
    const t = Date.parse(startIso);
    if (Number.isNaN(t)) return { ok: false, error: 'Invalid startIso.' };
    const db = getDatabase();
    const entryRef = push(ref(db, 'chat/scheduled'));
    await set(entryRef, {
      kind,
      title: title || `${kind} session`,
      startAt: new Date(t).toISOString(),
      durationMinutes,
      members: Object.fromEntries(memberUids.map(u => [u, true])),
      createdBy: ctx?.uid || null,
      createdAt: serverTimestamp(),
      source: 'jeeves',
    });
    return { ok: true, scheduleId: entryRef.key };
  },
});

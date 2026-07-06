// src/components/jeeves/skills/chat.js
import { registerSkill } from '../registry.js';
import { getDatabase, ref, push, serverTimestamp, set } from 'firebase/database';

registerSkill({
  name: 'dictate_chat_message',
  description: 'Send a text message to a chat room the lecturer already belongs to.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      roomId: { type: 'string' },
      text: { type: 'string' },
    },
    required: ['roomId', 'text'],
  },
  handler: async ({ roomId, text }, ctx) => {
    const clean = String(text || '').trim();
    if (!clean) return { ok: false, error: 'Empty message.' };
    const db = getDatabase();
    const msgRef = push(ref(db, `chat/messages/${roomId}`));
    await set(msgRef, {
      sender: ctx?.uid,
      text: clean,
      timestamp: serverTimestamp(),
      type: 'text',
      source: 'jeeves',
    });
    return { ok: true, messageId: msgRef.key };
  },
});

registerSkill({
  name: 'create_chat_room',
  description: 'Create a new chat room (group or direct) with the given members.',
  scope: 'app',
  roles: ['lecturer', 'moderator', 'tutor'],
  parameters: {
    type: 'object',
    properties: {
      kind: { type: 'string', description: 'group | direct' },
      name: { type: 'string', description: 'Display name for group rooms.' },
      memberUids: { type: 'array', items: { type: 'string' } },
    },
    required: ['kind', 'memberUids'],
  },
  handler: async ({ kind, name, memberUids }, ctx) => {
    if (!Array.isArray(memberUids) || !memberUids.length) {
      return { ok: false, error: 'memberUids is required.' };
    }
    const db = getDatabase();
    const roomRef = push(ref(db, 'chat/rooms'));
    const allMembers = { ...Object.fromEntries(memberUids.map(u => [u, true])) };
    if (ctx?.uid) allMembers[ctx.uid] = true;

    await set(roomRef, {
      type: kind === 'direct' ? 'direct' : 'group',
      name: name || null,
      createdBy: ctx?.uid || null,
      createdAt: serverTimestamp(),
      source: 'jeeves',
    });
    await set(ref(db, `chat/members/${roomRef.key}`), allMembers);
    return { ok: true, roomId: roomRef.key };
  },
});

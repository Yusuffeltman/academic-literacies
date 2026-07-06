// src/chat.js
// Core live-chat module — room CRUD, message send/receive, listener
// lifecycle, offline queue, and staff live-status toggle.
import { db } from './firebase.js';
import {
  ref, set, get, push, update, remove,
  onValue, onChildAdded, off,
  query, orderByKey, limitToLast,
  serverTimestamp,
} from 'firebase/database';
import { STATE, saveState } from './state.js';

// ── Listener lifecycle ──────────────────────────
const _listeners = new Map(); // key → { ref, unsubscribe }

function attachListener(key, dbRef, callback) {
  detachListener(key);
  const unsub = onValue(dbRef, callback);
  _listeners.set(key, { ref: dbRef, unsubscribe: unsub });
}

function attachChildListener(key, dbRef, callback) {
  detachListener(key);
  const unsub = onChildAdded(dbRef, callback);
  _listeners.set(key, { ref: dbRef, unsubscribe: unsub });
}

function detachListener(key) {
  const entry = _listeners.get(key);
  if (entry) {
    entry.unsubscribe();
    _listeners.delete(key);
  }
}

export function detachAllChatListeners() {
  for (const [key] of _listeners) {
    detachListener(key);
  }
}

// ── Helpers ─────────────────────────────────────
function _uid() { return STATE.user?.uid; }
function _role() {
  return STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student';
}
function _displayName() {
  return STATE.user?.displayName?.split(' [')[0] || STATE.user?.email || 'Unknown';
}
function _isStaff(role) {
  return role === 'tutor' || role === 'lecturer' || role === 'moderator';
}
function _nowIso() { return new Date().toISOString(); }

// ── Live-status (staff availability) ────────────

export async function setChatAvailability(available, message = '') {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return;

  const statusRef = ref(db, `chat/live-status/${uid}`);
  if (available) {
    await set(statusRef, {
      available: true,
      name: _displayName(),
      role,
      since: _nowIso(),
      message: message || '',
    });
  } else {
    await remove(statusRef);
  }
}

export async function clearLiveStatus() {
  const uid = _uid();
  if (!uid) return;
  try {
    await remove(ref(db, `chat/live-status/${uid}`));
  } catch (_) { /* best-effort on sign-out */ }
}

// ── Callbacks (set by UI layer) ─────────────────
let _onRoomListUpdate = null;
let _onLiveStatusUpdate = null;
let _onScheduledUpdate = null;
let _onNewMessage = null;
let _onTypingUpdate = null;

export function setChatCallbacks({
  onRoomListUpdate,
  onLiveStatusUpdate,
  onScheduledUpdate,
  onNewMessage,
  onTypingUpdate,
} = {}) {
  _onRoomListUpdate = onRoomListUpdate || null;
  _onLiveStatusUpdate = onLiveStatusUpdate || null;
  _onScheduledUpdate = onScheduledUpdate || null;
  _onNewMessage = onNewMessage || null;
  _onTypingUpdate = onTypingUpdate || null;
}

// ── Global listeners (attached on login) ────────

let _previousLiveStatus = {};

export function startChatListeners() {
  const uid = _uid();
  if (!uid) return;

  // 1. Room list
  attachListener('user-rooms', ref(db, `chat/user-rooms/${uid}`), (snap) => {
    const rooms = snap.val() || {};
    STATE.chat.cachedRooms = rooms;

    // Compute total unread
    let total = 0;
    for (const roomId of Object.keys(rooms)) {
      total += rooms[roomId].unreadCount || 0;
    }
    STATE.chat.unreadTotal = total;

    if (_onRoomListUpdate) _onRoomListUpdate(rooms);
  });

  // 2. Live status (all users can see who's live, but mainly for students)
  attachListener('live-status', ref(db, 'chat/live-status'), (snap) => {
    const statuses = snap.val() || {};

    // Detect newly-live staff for toast notifications
    const newlyLive = [];
    for (const [staffUid, status] of Object.entries(statuses)) {
      if (status.available && !_previousLiveStatus[staffUid]?.available) {
        newlyLive.push(status);
      }
    }
    _previousLiveStatus = statuses;

    if (_onLiveStatusUpdate) _onLiveStatusUpdate(statuses, newlyLive);
  });

  // 3. Scheduled sessions
  attachListener('scheduled', ref(db, 'chat/scheduled'), (snap) => {
    const scheduled = snap.val() || {};
    if (_onScheduledUpdate) _onScheduledUpdate(scheduled);
  });
}

export function stopChatListeners() {
  detachAllChatListeners();
  _previousLiveStatus = {};
}

// ── Thread listeners (per-room, attached/detached on open/close) ──

export function openThread(roomId, messageCount = 50) {
  if (!roomId) return;
  STATE.chat.activeRoomId = roomId;

  // Listen for new messages
  const msgQuery = query(
    ref(db, `chat/messages/${roomId}`),
    orderByKey(),
    limitToLast(messageCount),
  );
  attachListener(`messages:${roomId}`, msgQuery, (snap) => {
    const messages = [];
    snap.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    if (_onNewMessage) _onNewMessage(roomId, messages);
  });

  // Listen for typing indicators
  attachListener(`typing:${roomId}`, ref(db, `chat/typing/${roomId}`), (snap) => {
    const typing = snap.val() || {};
    // Filter out own typing and stale entries (>5s old)
    const now = Date.now();
    const active = {};
    for (const [uid, data] of Object.entries(typing)) {
      if (uid !== _uid() && (now - (data.timestamp || 0)) < 5000) {
        active[uid] = data;
      }
    }
    if (_onTypingUpdate) _onTypingUpdate(roomId, active);
  });

  // Mark as read
  _markRead(roomId);
}

export function closeThread() {
  const roomId = STATE.chat.activeRoomId;
  if (roomId) {
    detachListener(`messages:${roomId}`);
    detachListener(`typing:${roomId}`);
    // Clear own typing indicator
    const uid = _uid();
    if (uid) {
      remove(ref(db, `chat/typing/${roomId}/${uid}`)).catch(() => {});
    }
  }
  STATE.chat.activeRoomId = null;
}

// ── Mark read ───────────────────────────────────

async function _markRead(roomId) {
  const uid = _uid();
  if (!uid || !roomId) return;
  try {
    const updates = {};
    updates[`chat/members/${roomId}/${uid}/lastRead`] = _nowIso();
    updates[`chat/user-rooms/${uid}/${roomId}/unreadCount`] = 0;
    await update(ref(db), updates);
  } catch (err) {
    console.warn('Mark read failed:', err);
  }
}

// ── Room creation ───────────────────────────────

export async function createGroupRoom(name, memberUids, tutorialGroupId = null) {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return null;

  const roomRef = push(ref(db, 'chat/rooms'));
  const roomId = roomRef.key;
  const now = _nowIso();

  const roomData = {
    type: 'group',
    name,
    createdAt: now,
    createdBy: uid,
    lastMessage: null,
    tutorialGroupId: tutorialGroupId || null,
    tutorUid: role === 'tutor' ? uid : null,
  };

  const updates = {};
  updates[`chat/rooms/${roomId}`] = roomData;

  // Add creator as member
  const allMembers = new Set([uid, ...memberUids]);
  for (const memberUid of allMembers) {
    updates[`chat/members/${roomId}/${memberUid}`] = {
      role: memberUid === uid ? role : 'student',
      joinedAt: now,
      lastRead: now,
      muted: false,
    };
    updates[`chat/user-rooms/${memberUid}/${roomId}`] = {
      type: 'group',
      otherUid: null,
      name,
      unreadCount: 0,
      lastMessageAt: now,
    };
  }

  await update(ref(db), updates);

  // Post system message
  await _sendSystemMessage(roomId, `${_displayName()} created the group "${name}"`);
  return roomId;
}

export async function createCollaborationGroupRoom({
  name,
  collaborationGroupId,
  collaborationScopeId,
  memberUids = [],
} = {}) {
  const uid = _uid();
  if (!uid) return null;

  const roomRef = push(ref(db, 'chat/rooms'));
  const roomId = roomRef.key;
  const now = _nowIso();

  const roomData = {
    type: 'group',
    subtype: 'collaboration',
    name: name || 'Group Chat',
    createdAt: now,
    createdBy: uid,
    lastMessage: null,
    tutorialGroupId: null,
    tutorUid: null,
    collaborationGroupId: collaborationGroupId || null,
    collaborationScopeId: collaborationScopeId || null,
  };

  await set(ref(db, `chat/rooms/${roomId}`), roomData);
  await addMemberToRoom(roomId, uid, _role(), roomData);

  const otherMembers = new Set((Array.isArray(memberUids) ? memberUids : []).filter((memberUid) => memberUid && memberUid !== uid));
  for (const memberUid of otherMembers) {
    await addMemberToRoom(roomId, memberUid, 'student', roomData);
  }

  await _sendSystemMessage(roomId, `${_displayName()} opened the collaboration space "${roomData.name}"`);
  return roomId;
}

export async function createDirectRoom(studentUid, studentName) {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return null;

  // Check if a direct room already exists between these two
  const existingRooms = STATE.chat.cachedRooms || {};
  for (const [roomId, room] of Object.entries(existingRooms)) {
    if (room.type === 'direct' && room.otherUid === studentUid) {
      return roomId; // Already exists
    }
  }

  const roomRef = push(ref(db, 'chat/rooms'));
  const roomId = roomRef.key;
  const now = _nowIso();
  const staffName = _displayName();

  const updates = {};
  updates[`chat/rooms/${roomId}`] = {
    type: 'direct',
    name: null,
    createdAt: now,
    createdBy: uid,
    lastMessage: null,
    tutorialGroupId: null,
    tutorUid: null,
  };

  // Staff member
  updates[`chat/members/${roomId}/${uid}`] = {
    role, joinedAt: now, lastRead: now, muted: false,
  };
  updates[`chat/user-rooms/${uid}/${roomId}`] = {
    type: 'direct', otherUid: studentUid, name: studentName,
    unreadCount: 0, lastMessageAt: now,
  };

  // Student
  updates[`chat/members/${roomId}/${studentUid}`] = {
    role: 'student', joinedAt: now, lastRead: now, muted: false,
  };
  updates[`chat/user-rooms/${studentUid}/${roomId}`] = {
    type: 'direct', otherUid: uid, name: staffName,
    unreadCount: 0, lastMessageAt: now,
  };

  await update(ref(db), updates);
  return roomId;
}

// ── Sending messages ────────────────────────────

export async function sendMessage(roomId, text) {
  const uid = _uid();
  if (!uid || !roomId || !text.trim()) return;

  const role = _role();
  const senderName = _displayName();
  const now = _nowIso();

  const messageData = {
    sender: uid,
    senderName,
    senderRole: role,
    text: text.trim(),
    timestamp: now,
    type: 'text',
    deleted: false,
  };

  // Check connectivity — queue if offline
  if (!navigator.onLine) {
    _queueOfflineMessage(roomId, messageData);
    return messageData;
  }

  try {
    const msgRef = push(ref(db, `chat/messages/${roomId}`));
    await set(msgRef, messageData);
    await _updateRoomLastMessage(roomId, messageData);

    // Clear own typing
    remove(ref(db, `chat/typing/${roomId}/${uid}`)).catch(() => {});
    return { ...messageData, id: msgRef.key };
  } catch (err) {
    console.warn('Send message failed, queuing offline:', err);
    _queueOfflineMessage(roomId, messageData);
    return messageData;
  }
}

export async function sendAssetMessage(roomId, asset, caption = '') {
  const uid = _uid();
  if (!uid || !roomId || !asset) return null;

  const role = _role();
  const senderName = _displayName();
  const now = _nowIso();
  const safeCaption = String(caption || '').trim();
  const assetLabel = String(asset?.name || asset?.url || 'shared artefact').trim();

  const messageData = {
    sender: uid,
    senderName,
    senderRole: role,
    text: safeCaption || `Shared ${assetLabel}`,
    timestamp: now,
    type: 'asset',
    deleted: false,
    asset: {
      id: asset?.id || null,
      kind: asset?.kind || 'file',
      name: asset?.name || assetLabel,
      url: asset?.url || '',
      type: asset?.type || 'application/octet-stream',
      size: Number(asset?.size || 0) || 0,
      caption: safeCaption,
      embedUrl: asset?.embedUrl || '',
    },
  };

  const msgRef = push(ref(db, `chat/messages/${roomId}`));
  await set(msgRef, messageData);
  await _updateRoomLastMessage(roomId, messageData);
  return { ...messageData, id: msgRef.key };
}

async function _sendSystemMessage(roomId, text) {
  const uid = _uid();
  if (!uid || !roomId) return;

  const messageData = {
    sender: uid,
    senderName: 'System',
    senderRole: 'system',
    text,
    timestamp: _nowIso(),
    type: 'system',
    deleted: false,
  };

  const msgRef = push(ref(db, `chat/messages/${roomId}`));
  await set(msgRef, messageData);
}

async function _updateRoomLastMessage(roomId, messageData) {
  const previewText = messageData.type === 'asset'
    ? (messageData.text || `Shared ${messageData?.asset?.name || 'an artefact'}`)
    : messageData.text;
  const lastMessage = {
    text: previewText.length > 80 ? previewText.slice(0, 80) + '…' : previewText,
    sender: messageData.sender,
    senderName: messageData.senderName,
    timestamp: messageData.timestamp,
  };

  const updates = {};
  updates[`chat/rooms/${roomId}/lastMessage`] = lastMessage;

  // Update lastMessageAt for all members and increment unread for others
  try {
    const membersSnap = await get(ref(db, `chat/members/${roomId}`));
    if (membersSnap.exists()) {
      const members = membersSnap.val();
      for (const memberUid of Object.keys(members)) {
        updates[`chat/user-rooms/${memberUid}/${roomId}/lastMessageAt`] = messageData.timestamp;
        if (memberUid !== messageData.sender) {
          // Read current unread count and increment
          const userRoomSnap = await get(ref(db, `chat/user-rooms/${memberUid}/${roomId}/unreadCount`));
          const current = userRoomSnap.val() || 0;
          updates[`chat/user-rooms/${memberUid}/${roomId}/unreadCount`] = current + 1;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to update room members:', err);
  }

  await update(ref(db), updates);
}

// ── Typing indicators ───────────────────────────

let _typingTimeout = null;

export function sendTypingIndicator(roomId) {
  const uid = _uid();
  if (!uid || !roomId) return;

  // Debounce — only send every 2 seconds
  if (_typingTimeout) return;
  _typingTimeout = setTimeout(() => { _typingTimeout = null; }, 2000);

  set(ref(db, `chat/typing/${roomId}/${uid}`), {
    name: _displayName(),
    timestamp: Date.now(),
  }).catch(() => {});
}

export function clearTypingIndicator(roomId) {
  const uid = _uid();
  if (!uid || !roomId) return;
  remove(ref(db, `chat/typing/${roomId}/${uid}`)).catch(() => {});
}

// ── Offline queue ───────────────────────────────

function _queueOfflineMessage(roomId, messageData) {
  if (!STATE.chat.offlineQueue) STATE.chat.offlineQueue = [];
  STATE.chat.offlineQueue.push({
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomId,
    ...messageData,
    status: 'pending',
  });
  saveState().catch(console.error);
}

export async function flushOfflineQueue() {
  if (!STATE.chat.offlineQueue?.length || !navigator.onLine) return;

  const queue = [...STATE.chat.offlineQueue];
  STATE.chat.offlineQueue = [];

  for (const msg of queue) {
    try {
      const { id, roomId, status, ...messageData } = msg;
      const msgRef = push(ref(db, `chat/messages/${roomId}`));
      await set(msgRef, messageData);
      await _updateRoomLastMessage(roomId, messageData);
    } catch (err) {
      console.warn('Failed to flush message, re-queuing:', err);
      STATE.chat.offlineQueue.push({ ...msg, status: 'pending' });
    }
  }

  saveState().catch(console.error);
}

// Listen for reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineQueue().catch(console.error);
  });
}

// ── Scheduled sessions ──────────────────────────

export async function createScheduledSession({ title, description, startsAt, endsAt, targetAudience, targetRoomId }) {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return null;

  const schedRef = push(ref(db, 'chat/scheduled'));
  const data = {
    createdBy: uid,
    createdByName: _displayName(),
    createdByRole: role,
    title,
    description: description || '',
    startsAt,
    endsAt,
    targetRoomId: targetRoomId || null,
    targetAudience: targetAudience || 'all',
    cancelled: false,
    createdAt: _nowIso(),
  };

  await set(schedRef, data);
  return schedRef.key;
}

export async function cancelScheduledSession(scheduleId) {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return;
  await update(ref(db, `chat/scheduled/${scheduleId}`), { cancelled: true });
}

// ── Fetch room messages (one-time, for initial load) ──

export async function fetchMessages(roomId, count = 50) {
  const msgQuery = query(
    ref(db, `chat/messages/${roomId}`),
    orderByKey(),
    limitToLast(count),
  );
  const snap = await get(msgQuery);
  const messages = [];
  snap.forEach((child) => {
    messages.push({ id: child.key, ...child.val() });
  });
  return messages;
}

// ── Room utilities ──────────────────────────────

export async function getRoomMembers(roomId) {
  const snap = await get(ref(db, `chat/members/${roomId}`));
  return snap.val() || {};
}

export async function addMemberToRoom(roomId, memberUid, memberRole = 'student', roomSummary = null) {
  const now = _nowIso();
  let room = roomSummary;
  if (!room) {
    const roomSnap = await get(ref(db, `chat/rooms/${roomId}`));
    room = roomSnap.val();
  }
  if (!room) return;

  const updates = {};
  updates[`chat/members/${roomId}/${memberUid}`] = {
    role: memberRole, joinedAt: now, lastRead: now, muted: false,
  };
  updates[`chat/user-rooms/${memberUid}/${roomId}`] = {
    type: room.type || 'group',
    otherUid: room.type === 'direct' ? _uid() : null,
    name: room.name || _displayName(),
    unreadCount: 0,
    lastMessageAt: now,
  };

  await update(ref(db), updates);
}

export async function removeMemberFromRoom(roomId, memberUid) {
  if (!roomId || !memberUid) return;
  const updates = {};
  updates[`chat/members/${roomId}/${memberUid}`] = null;
  updates[`chat/user-rooms/${memberUid}/${roomId}`] = null;
  await update(ref(db), updates);
}

export function getCachedRooms() {
  return STATE.chat.cachedRooms || {};
}

export function getUnreadTotal() {
  return STATE.chat.unreadTotal || 0;
}

export function getActiveRoomId() {
  return STATE.chat.activeRoomId || null;
}

// ── Auto-create tutorial group rooms ────────────

/**
 * Ensures chat rooms exist for each tutorial group assigned to the current
 * tutor (or all groups for lecturers). Reads assignments from Firebase first,
 * then falls back to the local TUTOR_GROUP_ASSIGNMENTS config.
 * Idempotent — skips groups that already have a room.
 */
export async function ensureTutorialGroupRooms() {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return [];

  // Resolve groups for this staff member
  let groups = [];
  try {
    if (role === 'tutor') {
      const snap = await get(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`));
      if (snap.exists()) {
        const data = snap.val();
        groups = Object.values(data).filter(g => g && g.id);
      }
    } else {
      // Lecturer/moderator — get all groups from all tutors
      const snap = await get(ref(db, 'tutorial-groups/assignmentsByTutor'));
      if (snap.exists()) {
        const allTutors = snap.val();
        for (const tutorData of Object.values(allTutors)) {
          const tutorGroups = Object.values(tutorData).filter(g => g && g.id);
          groups.push(...tutorGroups);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch tutorial groups from Firebase:', err);
  }

  if (groups.length === 0) return [];

  // Check existing rooms to avoid duplicates
  const existingRooms = getCachedRooms();
  const existingGroupIds = new Set();
  for (const room of Object.values(existingRooms)) {
    if (room.tutorialGroupId) existingGroupIds.add(room.tutorialGroupId);
  }
  // Also scan all rooms in Firebase for this check
  try {
    const roomsSnap = await get(ref(db, 'chat/rooms'));
    if (roomsSnap.exists()) {
      for (const room of Object.values(roomsSnap.val())) {
        if (room.tutorialGroupId) existingGroupIds.add(room.tutorialGroupId);
      }
    }
  } catch { /* best-effort */ }

  const created = [];
  for (const group of groups) {
    if (existingGroupIds.has(group.id)) continue;

    const memberUids = Array.isArray(group.studentUids) ? group.studentUids : [];
    try {
      const roomId = await createGroupRoom(group.name || group.id, memberUids, group.id);
      if (roomId) created.push({ roomId, groupId: group.id, name: group.name });
    } catch (err) {
      console.warn(`Failed to create room for group ${group.id}:`, err);
    }
  }

  return created;
}

// ── Fetch student list for 1:1 initiation ───────

/**
 * Returns students the current staff member can initiate 1:1 chats with.
 * For tutors: students in their assigned groups.
 * For lecturers: all students from roster.
 */
export async function getAvailableStudents() {
  const uid = _uid();
  const role = _role();
  if (!uid || !_isStaff(role)) return [];

  const students = [];
  try {
    if (role === 'tutor') {
      const snap = await get(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`));
      if (snap.exists()) {
        for (const group of Object.values(snap.val())) {
          const uids = Array.isArray(group.studentUids) ? group.studentUids : [];
          for (const sUid of uids) {
            // Fetch student profile for display name
            try {
              const profSnap = await get(ref(db, `users/${sUid}/profile`));
              if (profSnap.exists()) {
                const p = profSnap.val();
                students.push({
                  uid: sUid,
                  name: p.displayName?.split(' [')[0] || p.name || p.email || sUid,
                  group: group.name || group.id,
                });
              } else {
                students.push({ uid: sUid, name: sUid, group: group.name || group.id });
              }
            } catch {
              students.push({ uid: sUid, name: sUid, group: group.name || group.id });
            }
          }
        }
      }
    } else {
      // Lecturer/moderator — read from roster
      const snap = await get(ref(db, 'rosters/classList'));
      if (snap.exists()) {
        for (const entry of Object.values(snap.val())) {
          if (entry.uid) {
            students.push({
              uid: entry.uid,
              name: entry.name || entry.email || entry.uid,
              group: entry.tutorialGroup || '',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch student list:', err);
  }

  // Deduplicate by uid
  const seen = new Set();
  return students.filter(s => {
    if (seen.has(s.uid)) return false;
    seen.add(s.uid);
    return true;
  });
}

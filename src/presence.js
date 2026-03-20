// src/presence.js
// Student presence heartbeat — writes to presence/live/{uid} so the
// lecturer dashboard can show a live feed of who is online.
import { db } from './firebase.js';
import { ref, set, onDisconnect, remove } from 'firebase/database';
import { STATE } from './state.js';

const HEARTBEAT_MS = 60_000; // every 60 seconds

let _heartbeatTimer = null;
let _presenceRef = null;

function _currentActivity() {
  // Try to detect what the student is currently doing
  const route = window.__ACADEMIC_APP_SURFACE?.route || '';
  if (route.includes('tutorial')) return 'tutorial';
  if (route.includes('notebook')) return 'notebook';
  if (route.includes('gallery')) return 'gallery';
  if (route.includes('course')) return 'course';
  if (route.includes('module')) return 'module';
  return 'dashboard';
}

function _qrVerifiedToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;
  const todayAttendance = STATE.attendance?.byDate?.[todayKey];
  const qrCheckins = todayAttendance?.qrCheckins;
  return Array.isArray(qrCheckins) && qrCheckins.length > 0;
}

function _buildPayload() {
  const user = STATE.user;
  return {
    online: true,
    lastSeen: new Date().toISOString(),
    name: user?.displayName?.split(' [')[0] || user?.email || 'Student',
    activity: _currentActivity(),
    sessionMode: 'class',
    qrVerifiedToday: _qrVerifiedToday(),
  };
}

async function _sendHeartbeat() {
  if (!_presenceRef) return;
  try {
    await set(_presenceRef, _buildPayload());
  } catch (err) {
    console.warn('Presence heartbeat failed:', err);
  }
}

export function startPresenceHeartbeat() {
  const uid = STATE.user?.uid;
  if (!uid || _heartbeatTimer) return;

  _presenceRef = ref(db, `presence/live/${uid}`);

  // Set up onDisconnect to mark offline when connection drops
  onDisconnect(_presenceRef).set({
    online: false,
    lastSeen: new Date().toISOString(),
    name: STATE.user?.displayName?.split(' [')[0] || STATE.user?.email || 'Student',
    activity: 'disconnected',
    sessionMode: 'class',
    qrVerifiedToday: _qrVerifiedToday(),
  }).catch((err) => console.warn('onDisconnect setup failed:', err));

  // Send first heartbeat immediately
  _sendHeartbeat();

  // Then repeat every 60 seconds
  _heartbeatTimer = setInterval(_sendHeartbeat, HEARTBEAT_MS);

  // Also send on visibility change (returning to tab)
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    _sendHeartbeat();
  }
}

export function stopPresenceHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
  document.removeEventListener('visibilitychange', _onVisibilityChange);

  // Mark offline
  if (_presenceRef) {
    set(_presenceRef, {
      online: false,
      lastSeen: new Date().toISOString(),
      name: STATE.user?.displayName?.split(' [')[0] || STATE.user?.email || 'Student',
      activity: 'signed-out',
      sessionMode: 'class',
      qrVerifiedToday: false,
    }).catch(() => {});
    _presenceRef = null;
  }

  // Clear chat live-status (staff only)
  const uid = STATE.user?.uid;
  if (uid) {
    remove(ref(db, `chat/live-status/${uid}`)).catch(() => {});
  }
}

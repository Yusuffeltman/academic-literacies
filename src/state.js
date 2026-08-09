// src/state.js
import { db } from './firebase.js';
import { ref, set, get } from 'firebase/database';
import {
  enqueueStateSync,
  loadLocalDraft,
  markLocalDraftError,
  markLocalDraftSynced,
  saveLocalDraft,
} from './draft-store.js';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false; // Force disabled for testing // keep in sync with auth.js
const LOCAL_STATE_KEY = 'acadlit-state';
const STATE_DRAFT_SURFACE = 'state';
const STATE_DRAFT_SCOPE = 'app-state';

// ── Adaptive defaults ─────────────────────────
const SKILLS = ['critical_reading', 'evidence_use', 'argument_structure', 'academic_tone',
  'source_evaluation', 'citation_practice', 'research_skills', 'ai_literacy'];

function defaultAdaptive() {
  const scores = {};
  const status = {};
  SKILLS.forEach(s => { scores[s] = []; status[s] = 'untested'; });
  return {
    skill_scores: scores,
    skill_status: status,
    needs_remediation: [],
    frustration_index: 0,
    frustration_triggers: [],
    study_topics: [],
    last_recommendation: null,
    recommendation_at: null,
    outcomes: [],
    high_performer: false,
  };
}

export const STATE = {
  user: null,
  activeUnit: 0,
  progress: {},
  tutorChats: {},
  tutorialNotebook: { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} },
  contactNotebook: { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} },
  erProgress: { extraMarks: 0, completedReadings: [] },
  attendance: { byDate: {} },
  deviceInfo: null,
  aiUsage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
  adaptive: defaultAdaptive(),
  escalations: [],
  assessments: {},
  chat: { offlineQueue: [], activeRoomId: null, unreadTotal: 0, cachedRooms: {} },
  experiment: { optOut: false, noticeAck: false },
};

function _captureStatePayload() {
  return {
    progress: STATE.progress,
    tutorChats: STATE.tutorChats,
    tutorialNotebook: STATE.tutorialNotebook,
    contactNotebook: STATE.contactNotebook,
    erProgress: STATE.erProgress,
    attendance: STATE.attendance,
    deviceInfo: STATE.deviceInfo,
    aiUsage: STATE.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
    adaptive: STATE.adaptive,
    escalations: STATE.escalations,
    assessments: STATE.assessments,
    chat: { offlineQueue: STATE.chat?.offlineQueue || [] },
    experiment: STATE.experiment || { optOut: false, noticeAck: false },
  };
}

function _isFileLike(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

function _isBlobLike(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function _sanitizeFileLike(value) {
  return {
    name: String(value?.name || ''),
    type: String(value?.type || 'application/octet-stream'),
    size: Number.isFinite(Number(value?.size)) ? Number(value.size) : 0,
    lastModified: Number.isFinite(Number(value?.lastModified)) ? Number(value.lastModified) : null,
  };
}

function _sanitizeStateForPersistence(value, path = '', dropped = []) {
  if (value == null) return value;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'number') {
    if (Number.isFinite(value)) return value;
    dropped.push(path || '<root>');
    return null;
  }
  if (valueType === 'bigint') return String(value);
  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') {
    dropped.push(path || '<root>');
    return undefined;
  }

  if (value instanceof Date) return value.toISOString();
  if (_isFileLike(value) || _isBlobLike(value)) return _sanitizeFileLike(value);
  if (value instanceof URL) return value.toString();

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const next = _sanitizeStateForPersistence(item, `${path}[${index}]`, dropped);
      return typeof next === 'undefined' ? null : next;
    });
  }

  if (value instanceof Map) {
    return _sanitizeStateForPersistence(Object.fromEntries(value.entries()), path, dropped);
  }
  if (value instanceof Set) {
    return _sanitizeStateForPersistence(Array.from(value.values()), path, dropped);
  }

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    const next = _sanitizeStateForPersistence(nested, nextPath, dropped);
    if (typeof next !== 'undefined') {
      output[key] = next;
    }
  }
  return output;
}

function _buildPersistablePayload() {
  const dropped = [];
  const payload = _sanitizeStateForPersistence(_captureStatePayload(), '', dropped);
  if (dropped.length) {
    console.warn('State payload sanitizer removed unsupported values before persistence:', dropped.slice(0, 20));
  }
  return payload;
}

function _localStateKey(user = null) {
  const activeUser = user || STATE.user;
  return activeUser?.uid ? `${LOCAL_STATE_KEY}:${activeUser.uid}` : LOCAL_STATE_KEY;
}

function _safeLocalEnvelope(envelope = {}) {
  return {
    payload: envelope?.payload || {},
    updatedAt: envelope?.updatedAt || new Date().toISOString(),
    revision: Number(envelope?.revision || 0) || 0,
    syncState: String(envelope?.syncState || 'local'),
    lastSyncAt: envelope?.lastSyncAt || null,
    lastError: String(envelope?.lastError || ''),
  };
}

function _writeLocalStateFallback(envelope, user = null) {
  try {
    localStorage.setItem(_localStateKey(user), JSON.stringify(_safeLocalEnvelope(envelope)));
  } catch (err) {
    console.warn('Local state backup failed:', err);
  }
}

function _readLocalStateFallback(user = null) {
  try {
    const scoped = localStorage.getItem(_localStateKey(user));
    if (scoped) {
      const parsed = JSON.parse(scoped);
      if (parsed && typeof parsed === 'object' && 'payload' in parsed) return _safeLocalEnvelope(parsed);
      return _safeLocalEnvelope({ payload: parsed || {} });
    }

    const activeUser = user || STATE.user;
    if (activeUser?.uid) {
      return null;
    }

    const saved = localStorage.getItem(LOCAL_STATE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && 'payload' in parsed) return _safeLocalEnvelope(parsed);
    return _safeLocalEnvelope({ payload: parsed || {} });
  } catch (err) {
    console.warn('Local state read failed:', err);
    return null;
  }
}

function _recordMeta(record = {}) {
  return {
    updatedAt: record?.updatedAt || record?.__meta?.updatedAt || null,
    revision: Number(record?.revision || record?.__meta?.revision || 0) || 0,
    syncState: String(record?.syncState || record?.__meta?.syncState || 'synced'),
    lastSyncAt: record?.lastSyncAt || record?.__meta?.lastSyncAt || null,
    lastError: record?.lastError || '',
  };
}

function _payloadFromRecord(record = null) {
  if (!record) return {};
  if (record && typeof record === 'object' && 'payload' in record) {
    return record.payload || {};
  }
  const raw = { ...(record || {}) };
  delete raw.__meta;
  delete raw.updatedAt;
  delete raw.revision;
  delete raw.syncState;
  delete raw.lastSyncAt;
  delete raw.lastError;
  return raw;
}

function _entryMeta(entry = {}) {
  return {
    updatedAt: entry?.updatedAt || null,
    revision: Number(entry?.revision || 0) || 0,
    syncState: String(entry?.syncState || 'synced'),
  };
}

function _pickNewerRecord(remoteRecord, localRecord, preferLocal = false) {
  if (!remoteRecord) return localRecord || null;
  if (!localRecord) return remoteRecord || null;
  const remoteMeta = _entryMeta(remoteRecord);
  const localMeta = _entryMeta(localRecord);
  if (preferLocal || localMeta.syncState !== 'synced') return { ...remoteRecord, ...localRecord };
  if (localMeta.revision > remoteMeta.revision) return { ...remoteRecord, ...localRecord };
  if (remoteMeta.revision > localMeta.revision) return { ...localRecord, ...remoteRecord };
  const remoteTs = _parseIso(remoteMeta.updatedAt);
  const localTs = _parseIso(localMeta.updatedAt);
  if (localTs > remoteTs) return { ...remoteRecord, ...localRecord };
  if (remoteTs > localTs) return { ...localRecord, ...remoteRecord };
  return { ...remoteRecord, ...localRecord };
}

function _applyState(data) {
  const payload = _payloadFromRecord(data);
  if (!payload) return;
  STATE.progress = payload.progress || {};
  STATE.tutorChats = payload.tutorChats || {};
  STATE.tutorialNotebook = payload.tutorialNotebook || { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} };
  STATE.tutorialNotebook.archivedUnits = STATE.tutorialNotebook.archivedUnits || {};
  STATE.tutorialNotebook.analytics = STATE.tutorialNotebook.analytics || {};
  STATE.contactNotebook = payload.contactNotebook || { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} };
  STATE.contactNotebook.archivedUnits = STATE.contactNotebook.archivedUnits || {};
  STATE.contactNotebook.analytics = STATE.contactNotebook.analytics || {};
  STATE.erProgress = payload.erProgress || { extraMarks: 0, completedReadings: [] };
  STATE.attendance = payload.attendance || { byDate: {} };
  STATE.deviceInfo = payload.deviceInfo || null;
  STATE.aiUsage = payload.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 };
  STATE.adaptive = _mergeAdaptive(payload.adaptive);
  STATE.escalations = payload.escalations || [];
  STATE.assessments = payload.assessments || {};
  STATE.experiment = { optOut: false, noticeAck: false, ...(payload.experiment || {}) };
  // Sync assessment state into the runtime cache used by assessment-task.js
  if (typeof window !== 'undefined') {
    window._atState = window._atState || {};
    for (const [id, val] of Object.entries(STATE.assessments)) {
      window._atState[id] = val;
    }
  }
  STATE.chat = {
    offlineQueue: data.chat?.offlineQueue || [],
    activeRoomId: null,
    unreadTotal: 0,
    cachedRooms: {},
  };
}

function _shouldUseFirebase(userOverride = null) {
  const toggle = String(VITE_FIREBASE ?? 'true').toLowerCase();
  const enabled = toggle !== 'false' && toggle !== '0';
  const configOk = Boolean(import.meta.env.VITE_FIREBASE_DATABASE_URL && import.meta.env.VITE_FIREBASE_API_KEY);
  const user = userOverride || STATE.user;
  return enabled && configOk && !!user;
}

function _parseIso(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : 0;
}

function _pickNewerEntry(remoteEntry, localEntry, preferLocal = false) {
  if (!remoteEntry) return localEntry || null;
  if (!localEntry) return remoteEntry || null;

  const remoteMeta = _entryMeta(remoteEntry);
  const localMeta = _entryMeta(localEntry);
  if (preferLocal || localMeta.syncState !== 'synced') return { ...remoteEntry, ...localEntry };
  if (localMeta.revision > remoteMeta.revision) return { ...remoteEntry, ...localEntry };
  if (remoteMeta.revision > localMeta.revision) return { ...localEntry, ...remoteEntry };
  const remoteTs = _parseIso(remoteMeta.updatedAt);
  const localTs = _parseIso(localMeta.updatedAt);

  if (localTs > remoteTs) return localEntry;
  if (remoteTs > localTs) return remoteEntry;

  const remoteAttachments = Array.isArray(remoteEntry.attachments) ? remoteEntry.attachments.length : 0;
  const localAttachments = Array.isArray(localEntry.attachments) ? localEntry.attachments.length : 0;
  return localAttachments >= remoteAttachments ? { ...remoteEntry, ...localEntry } : { ...localEntry, ...remoteEntry };
}

function _mergeNotebookState(remoteNotebook, localNotebook, preferLocal = false) {
  const remote = remoteNotebook || { entries: {} };
  const local = localNotebook || { entries: {} };
  const keys = new Set([
    ...Object.keys(remote.entries || {}),
    ...Object.keys(local.entries || {}),
  ]);
  const entries = {};

  keys.forEach((key) => {
    const picked = _pickNewerEntry(remote.entries?.[key], local.entries?.[key], preferLocal);
    if (picked) entries[key] = picked;
  });

  return {
    ...remote,
    ...local,
    entries,
    lastUnitId: preferLocal ? (local.lastUnitId || remote.lastUnitId || null) : (remote.lastUnitId || local.lastUnitId || null),
    lastSessionId: preferLocal ? (local.lastSessionId || remote.lastSessionId || null) : (remote.lastSessionId || local.lastSessionId || null),
  };
}

function _mergeAssessments(remoteAssessments = {}, localAssessments = {}, preferLocal = false) {
  const keys = new Set([
    ...Object.keys(remoteAssessments || {}),
    ...Object.keys(localAssessments || {}),
  ]);
  const merged = {};
  keys.forEach((key) => {
    const picked = _pickNewerRecord(remoteAssessments?.[key], localAssessments?.[key], preferLocal);
    if (picked) merged[key] = picked;
  });
  return merged;
}

function _preferLocalSnapshot(localRecord = null, remoteRecord = null) {
  if (!localRecord) return false;
  const localMeta = _recordMeta(localRecord);
  const remoteMeta = _recordMeta(remoteRecord);
  if (localMeta.syncState && localMeta.syncState !== 'synced') return true;
  if (localMeta.revision > remoteMeta.revision) return true;
  if (_parseIso(localMeta.updatedAt) > _parseIso(remoteMeta.updatedAt)) return true;
  return false;
}

function _mergeStatePayload(remoteData, localRecord) {
  const local = _payloadFromRecord(localRecord);
  const remote = _payloadFromRecord(remoteData);
  const preferLocal = _preferLocalSnapshot(localRecord, remoteData);
  return {
    ...(preferLocal ? remote : local),
    ...(preferLocal ? local : remote),
    progress: preferLocal ? (local.progress || remote.progress || {}) : (remote.progress || local.progress || {}),
    tutorChats: preferLocal ? (local.tutorChats || remote.tutorChats || {}) : (remote.tutorChats || local.tutorChats || {}),
    tutorialNotebook: _mergeNotebookState(remote.tutorialNotebook, local.tutorialNotebook, preferLocal),
    contactNotebook: _mergeNotebookState(remote.contactNotebook, local.contactNotebook, preferLocal),
    erProgress: preferLocal ? (local.erProgress || remote.erProgress || { extraMarks: 0, completedReadings: [] }) : (remote.erProgress || local.erProgress || { extraMarks: 0, completedReadings: [] }),
    attendance: preferLocal ? (local.attendance || remote.attendance || { byDate: {} }) : (remote.attendance || local.attendance || { byDate: {} }),
    deviceInfo: preferLocal ? (local.deviceInfo || remote.deviceInfo || null) : (remote.deviceInfo || local.deviceInfo || null),
    aiUsage: preferLocal ? (local.aiUsage || remote.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 }) : (remote.aiUsage || local.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 }),
    adaptive: _mergeAdaptive(preferLocal ? (local.adaptive || remote.adaptive) : (remote.adaptive || local.adaptive)),
    escalations: preferLocal ? (local.escalations || remote.escalations || []) : (remote.escalations || local.escalations || []),
    assessments: _mergeAssessments(remote.assessments || {}, local.assessments || {}, preferLocal),
    chat: {
      offlineQueue: preferLocal
        ? (local.chat?.offlineQueue || remote.chat?.offlineQueue || [])
        : (remote.chat?.offlineQueue || local.chat?.offlineQueue || []),
    },
  };
}

// ── Sync status tracking ──────────────────────
// Exposed so UI components can show sync health.
export const syncStatus = {
  lastLocalSaveAt: null,       // durable local snapshot timestamp
  lastCloudSaveAt: null,       // ISO timestamp of last successful Firebase write
  lastCloudFailAt: null,       // ISO timestamp of last failed Firebase write
  localRevision: 0,            // durable local revision counter
  consecutiveFailures: 0,      // resets on success
  dirty: false,                // true if local has changes not yet in Firebase
  syncing: false,              // true while queue/cloud sync is running
  lastLocalError: '',          // last local or sync error message
};

let _retrySaveTimer = null;
let _localPersistTimer = null;

async function _readLocalStateRecord(user = null) {
  const activeUser = user || STATE.user || null;
  const draftRecord = await loadLocalDraft({
    userId: activeUser?.uid || 'guest',
    surface: STATE_DRAFT_SURFACE,
    scopeId: STATE_DRAFT_SCOPE,
  }).catch(() => null);
  return draftRecord || _readLocalStateFallback(activeUser);
}

async function _persistLocalSnapshot(payload, { user = STATE.user, syncState = 'local', lastSyncAt = null, lastError = '', keepHistory = true } = {}) {
  const activeUser = user || STATE.user || null;
  const draftRecord = await saveLocalDraft({
    userId: activeUser?.uid || 'guest',
    surface: STATE_DRAFT_SURFACE,
    scopeId: STATE_DRAFT_SCOPE,
    payload,
    syncState,
    lastSyncAt,
    lastError,
    keepHistory,
  }).catch((err) => {
    console.warn('Draft store state snapshot failed:', err);
    return null;
  });
  const envelope = _safeLocalEnvelope({
    payload,
    updatedAt: draftRecord?.updatedAt || new Date().toISOString(),
    revision: draftRecord?.revision || (syncStatus.localRevision + 1),
    syncState,
    lastSyncAt,
    lastError,
  });
  _writeLocalStateFallback(envelope, activeUser);
  syncStatus.lastLocalSaveAt = envelope.updatedAt;
  syncStatus.localRevision = envelope.revision;
  syncStatus.lastLocalError = lastError ? String(lastError) : '';
  return envelope;
}

function _remoteStateEnvelope(payload, snapshot = null) {
  const meta = snapshot || {};
  return {
    ...payload,
    __meta: {
      updatedAt: meta.updatedAt || new Date().toISOString(),
      revision: Number(meta.revision || syncStatus.localRevision || 1) || 1,
      syncState: 'synced',
      lastSyncAt: new Date().toISOString(),
    },
  };
}

export async function saveState(options = {}) {
  const {
    localOnly = false,
    skipLocalWrite = false,
    skipQueue = false,
    suppressIndicator = false,
  } = options;
  const payload = _buildPersistablePayload();
  let localSnapshot = _readLocalStateFallback(STATE.user);

  if (!skipLocalWrite) {
    localSnapshot = await _persistLocalSnapshot(payload, {
      user: STATE.user,
      syncState: _shouldUseFirebase() ? 'local' : 'synced',
      keepHistory: !localOnly,
    });
    syncStatus.dirty = _shouldUseFirebase();
    if (!suppressIndicator) _updateSyncIndicator(_shouldUseFirebase() ? 'local' : 'synced');
  }

  if (DEV_MODE || !_shouldUseFirebase()) {
    syncStatus.dirty = false;
    syncStatus.lastCloudSaveAt = syncStatus.lastLocalSaveAt || new Date().toISOString();
    syncStatus.syncing = false;
    if (!suppressIndicator) _updateSyncIndicator('synced');
    return true;
  }

  if (localOnly) {
    if (!skipQueue) {
      await enqueueStateSync({ userId: STATE.user?.uid || 'guest', scopeId: STATE_DRAFT_SCOPE, surface: STATE_DRAFT_SURFACE }).catch(() => {});
    }
    return true;
  }

  syncStatus.dirty = true;
  syncStatus.syncing = true;

  // Try up to 3 attempts with exponential backoff
  const delays = [0, 800, 2000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      await set(ref(db, `users/${STATE.user.uid}/state`), _remoteStateEnvelope(payload, localSnapshot));
      syncStatus.lastCloudSaveAt = new Date().toISOString();
      syncStatus.consecutiveFailures = 0;
      syncStatus.dirty = false;
      syncStatus.syncing = false;
      await markLocalDraftSynced({
        userId: STATE.user?.uid || 'guest',
        surface: STATE_DRAFT_SURFACE,
        scopeId: STATE_DRAFT_SCOPE,
        lastSyncAt: syncStatus.lastCloudSaveAt,
      }).catch(() => {});
      if (!suppressIndicator) _updateSyncIndicator('synced');
      return true;
    } catch (err) {
      if (attempt < delays.length - 1) continue;
      console.error('Failed to save state to Firebase (kept local copy):', err);
      syncStatus.lastCloudFailAt = new Date().toISOString();
      syncStatus.consecutiveFailures++;
      syncStatus.syncing = false;
      syncStatus.lastLocalError = err?.message || String(err);
      await markLocalDraftError({
        userId: STATE.user?.uid || 'guest',
        surface: STATE_DRAFT_SURFACE,
        scopeId: STATE_DRAFT_SCOPE,
        error: syncStatus.lastLocalError,
      }).catch(() => {});
      if (!skipQueue) {
        await enqueueStateSync({ userId: STATE.user?.uid || 'guest', scopeId: STATE_DRAFT_SCOPE, surface: STATE_DRAFT_SURFACE }).catch(() => {});
      }
      _updateSyncIndicator('error');
      _scheduleRetry();
      return false;
    }
  }
  syncStatus.syncing = false;
  return false;
}

export function persistLocalStateSoon(reason = 'input') {
  if (_localPersistTimer) clearTimeout(_localPersistTimer);
  _localPersistTimer = setTimeout(() => {
    _localPersistTimer = null;
    saveState({ localOnly: true, suppressIndicator: false }).catch((err) => {
      console.warn(`Local state persist failed (${reason}):`, err);
    });
  }, 150);
}

export async function flushLocalStateSnapshot({ scheduleCloud = true } = {}) {
  return saveState({ localOnly: true, skipQueue: !scheduleCloud, suppressIndicator: true });
}

function _scheduleRetry() {
  if (_retrySaveTimer) return;
  // Exponential backoff: 10s, 20s, 40s, 80s, capped at 120s
  const delay = Math.min(120000, 10000 * Math.pow(2, Math.max(0, syncStatus.consecutiveFailures - 1)));
  _retrySaveTimer = setTimeout(async () => {
    _retrySaveTimer = null;
    if (!syncStatus.dirty || !_shouldUseFirebase()) return;
    try {
      const payload = _buildPersistablePayload();
      const localRecord = await _readLocalStateRecord(STATE.user);
      await set(ref(db, `users/${STATE.user.uid}/state`), _remoteStateEnvelope(payload, localRecord));
      syncStatus.lastCloudSaveAt = new Date().toISOString();
      syncStatus.consecutiveFailures = 0;
      syncStatus.dirty = false;
      syncStatus.syncing = false;
      await markLocalDraftSynced({
        userId: STATE.user?.uid || 'guest',
        surface: STATE_DRAFT_SURFACE,
        scopeId: STATE_DRAFT_SCOPE,
        lastSyncAt: syncStatus.lastCloudSaveAt,
      }).catch(() => {});
      _updateSyncIndicator('synced');
    } catch (err) {
      console.warn('Background retry save failed:', err);
      syncStatus.consecutiveFailures++;
      syncStatus.lastLocalError = err?.message || String(err);
      _scheduleRetry(); // keep retrying until it succeeds
    }
  }, delay);
}

// ── Unload guard ──────────────────────────────
// Warn students before they close the tab with unsaved work.
// Components can register flush callbacks for their own debounce timers.
const _flushCallbacks = [];
export function registerFlushCallback(fn) { _flushCallbacks.push(fn); }

function _runFlushCallbacks() {
  for (const fn of _flushCallbacks) { try { fn(); } catch { /* best-effort */ } }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    _runFlushCallbacks();
    if (syncStatus.dirty) {
      e.preventDefault();
      try {
        _writeLocalStateFallback({
          payload: _buildPersistablePayload(),
          updatedAt: new Date().toISOString(),
          revision: Math.max(1, syncStatus.localRevision + 1),
          syncState: 'local',
          lastSyncAt: syncStatus.lastCloudSaveAt,
          lastError: syncStatus.lastLocalError,
        }, STATE.user);
      } catch { /* best-effort */ }
    }
  });

  // Also try to flush on visibilitychange (mobile tab switch / lock screen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      _runFlushCallbacks();
      if (syncStatus.dirty || syncStatus.syncing) {
        try {
          _writeLocalStateFallback({
            payload: _buildPersistablePayload(),
            updatedAt: new Date().toISOString(),
            revision: Math.max(1, syncStatus.localRevision + 1),
            syncState: 'local',
            lastSyncAt: syncStatus.lastCloudSaveAt,
            lastError: syncStatus.lastLocalError,
          }, STATE.user);
        } catch { /* best-effort */ }
        _scheduleRetry();
      }
    }
  });
}

function _updateSyncIndicator(mode = 'synced') {
  let el = document.getElementById('sync-status-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-status-indicator';
    el.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12px;font-family:Inter,sans-serif;transition:opacity .4s ease;pointer-events:none;';
    document.body.appendChild(el);
  }
  if (mode === 'synced') {
    el.style.background = 'rgba(16,185,129,.15)';
    el.style.color = '#10b981';
    el.textContent = 'Synced';
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
    return;
  }
  if (mode === 'local') {
    el.style.background = 'rgba(59,130,246,.14)';
    el.style.color = '#1d4ed8';
    el.textContent = 'Saved locally';
    el.style.opacity = '1';
    setTimeout(() => {
      if (!syncStatus.dirty) el.style.opacity = '0';
    }, 2500);
    return;
  }
  {
    el.style.background = 'rgba(239,68,68,.15)';
    el.style.color = '#991b1b';
    el.style.pointerEvents = 'auto';
    el.textContent = syncStatus.consecutiveFailures >= 3
      ? 'Saved locally only — cloud sync is failing. Do not uninstall or clear browser storage.'
      : 'Saved locally — retrying cloud sync…';
    el.style.opacity = '1';
  }
}

export async function loadState(user = null) {
  const activeUser = user || STATE.user || null;
  if (activeUser && !STATE.user) STATE.user = activeUser;
  const localRecord = await _readLocalStateRecord(activeUser);
  const localPayload = _payloadFromRecord(localRecord);

  if (DEV_MODE || !_shouldUseFirebase(activeUser)) {
    _applyState(localPayload);
    syncStatus.lastLocalSaveAt = _recordMeta(localRecord).updatedAt || null;
    syncStatus.localRevision = _recordMeta(localRecord).revision || 0;
    syncStatus.dirty = false;
    return;
  }

  try {
    const snap = await get(ref(db, `users/${activeUser.uid}/state`));
    if (snap.exists()) {
      const data = snap.val();
      const merged = _mergeStatePayload(data, localRecord);
      _applyState(merged);
      const preferLocal = _preferLocalSnapshot(localRecord, data);
      const mergedMeta = preferLocal ? _recordMeta(localRecord) : _recordMeta(data);
      _writeLocalStateFallback({
        payload: merged,
        updatedAt: mergedMeta.updatedAt || new Date().toISOString(),
        revision: mergedMeta.revision || 0,
        syncState: preferLocal ? (_recordMeta(localRecord).syncState || 'local') : 'synced',
        lastSyncAt: preferLocal ? _recordMeta(localRecord).lastSyncAt : (data?.__meta?.lastSyncAt || _recordMeta(data).updatedAt || null),
        lastError: preferLocal ? _recordMeta(localRecord).lastError || '' : '',
      }, activeUser);
      syncStatus.lastLocalSaveAt = _recordMeta(localRecord).updatedAt || mergedMeta.updatedAt || null;
      syncStatus.localRevision = _recordMeta(localRecord).revision || mergedMeta.revision || 0;
      syncStatus.lastCloudSaveAt = data?.__meta?.lastSyncAt || _recordMeta(data).updatedAt || null;
      syncStatus.dirty = preferLocal || _recordMeta(localRecord).syncState === 'local' || _recordMeta(localRecord).syncState === 'error';
      return;
    }
  } catch (err) {
    console.warn('Firebase state load failed, falling back to local copy:', err);
  }

  _applyState(localPayload);
  syncStatus.lastLocalSaveAt = _recordMeta(localRecord).updatedAt || null;
  syncStatus.localRevision = _recordMeta(localRecord).revision || 0;
  syncStatus.dirty = _recordMeta(localRecord).syncState === 'local' || _recordMeta(localRecord).syncState === 'error';
}

export function attendanceDateKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function markPresent(sessionType = 'class') {
  const day = attendanceDateKey();
  if (!STATE.attendance || typeof STATE.attendance !== 'object') {
    STATE.attendance = { byDate: {} };
  }
  STATE.attendance.byDate = STATE.attendance.byDate || {};

  const nowIso = new Date().toISOString();
  const rec = STATE.attendance.byDate[day] || {
    present: false,
    firstSeen: null,
    lastSeen: null,
    totalSeconds: 0,
    classSeconds: 0,
    tutorialSeconds: 0,
    lastSessionType: 'class',
  };

  rec.present = true;
  rec.firstSeen = rec.firstSeen || nowIso;
  rec.lastSeen = nowIso;
  rec.lastSessionType = sessionType === 'tutorial' ? 'tutorial' : 'class';
  STATE.attendance.byDate[day] = rec;
}

export function addAttendanceTime(seconds, sessionType = 'class') {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!sec) return;

  const day = attendanceDateKey();
  if (!STATE.attendance || typeof STATE.attendance !== 'object') {
    STATE.attendance = { byDate: {} };
  }
  STATE.attendance.byDate = STATE.attendance.byDate || {};

  const nowIso = new Date().toISOString();
  const rec = STATE.attendance.byDate[day] || {
    present: false,
    firstSeen: null,
    lastSeen: null,
    totalSeconds: 0,
    classSeconds: 0,
    tutorialSeconds: 0,
    lastSessionType: 'class',
  };

  rec.present = true;
  rec.firstSeen = rec.firstSeen || nowIso;
  rec.lastSeen = nowIso;
  rec.totalSeconds = (rec.totalSeconds || 0) + sec;
  if (sessionType === 'tutorial') {
    rec.tutorialSeconds = (rec.tutorialSeconds || 0) + sec;
    rec.lastSessionType = 'tutorial';
  } else {
    rec.classSeconds = (rec.classSeconds || 0) + sec;
    rec.lastSessionType = 'class';
  }

  STATE.attendance.byDate[day] = rec;
}

// Safely merge saved adaptive data with defaults (handles missing keys for existing users)
function _mergeAdaptive(saved) {
  const def = defaultAdaptive();
  if (!saved) return def;
  return {
    ...def,
    ...saved,
    skill_scores: { ...def.skill_scores, ...(saved.skill_scores || {}) },
    skill_status: { ...def.skill_status, ...(saved.skill_status || {}) },
    outcomes: Array.isArray(saved.outcomes) ? saved.outcomes : [],
  };
}

// ── Adaptive helper functions ─────────────────

/**
 * Record a skill score from any AI tool.
 * @param {string} skillId   - one of the 8 SKILLS
 * @param {number} score     - raw score value
 * @param {number} maxScore  - scale max (e.g. 5 or 10)
 * @param {string} source    - 'writing_coach' | 'source_evaluator' | 'argument_mapper' | 'study_buddy' | 'micro_module'
 * @param {string|null} triggeredBy - micro-module id if this score followed a module, else null
 */
export function recordSkillScore(skillId, score, maxScore, source, triggeredBy = null) {
  if (!SKILLS.includes(skillId)) return;
  const normalised = Math.round((score / maxScore) * 5 * 10) / 10;
  const entry = {
    score: normalised,
    raw: score,
    max: maxScore,
    timestamp: new Date().toISOString(),
    source,
    triggered_by: triggeredBy,
  };
  if (!STATE.adaptive.skill_scores[skillId]) STATE.adaptive.skill_scores[skillId] = [];
  STATE.adaptive.skill_scores[skillId].push(entry);
  _updateSkillStatus(skillId);
  closeOutcomes(skillId, normalised);
  checkEscalationTriggers();
  saveState().catch(console.error);
}

function _updateSkillStatus(skillId) {
  const entries = STATE.adaptive.skill_scores[skillId] || [];
  if (entries.length < 2) { STATE.adaptive.skill_status[skillId] = 'untested'; return; }

  const recent = entries.slice(-3).map(e => e.score);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (avg < 2.5) STATE.adaptive.skill_status[skillId] = 'weak';
  else if (avg < 3.5) STATE.adaptive.skill_status[skillId] = 'developing';
  else STATE.adaptive.skill_status[skillId] = 'strong';

  // Remediation flag — 2 consecutive scores below 3
  const last2 = entries.slice(-2).map(e => e.score);
  if (last2.length === 2 && last2.every(s => s < 3)) {
    if (!STATE.adaptive.needs_remediation.includes(skillId)) {
      STATE.adaptive.needs_remediation.push(skillId);
    }
  } else {
    STATE.adaptive.needs_remediation = STATE.adaptive.needs_remediation.filter(s => s !== skillId);
  }

  // High performer — all tested skills averaging >= 4.5
  const testedSkills = SKILLS.filter(s => (STATE.adaptive.skill_scores[s] || []).length >= 2);
  if (testedSkills.length >= 3) {
    STATE.adaptive.high_performer = testedSkills.every(s => {
      const sc = STATE.adaptive.skill_scores[s].slice(-3).map(e => e.score);
      return sc.reduce((a, b) => a + b, 0) / sc.length >= 4.5;
    });
  }
}

/**
 * Returns the ZPD scaffold level for a skill.
 * 'scaffolded' → fill-in-the-blanks mode
 * 'guided'     → hints and questions
 * 'independent'→ standard feedback
 */
export function getScaffoldLevel(skillId) {
  const status = STATE.adaptive?.skill_status?.[skillId] || 'untested';
  if (status === 'weak') return 'scaffolded';
  if (status === 'developing') return 'guided';
  return 'independent';
}

const FRUSTRATION_KEYWORDS = /\b(confused|confusing|don'?t (get|understand)|don'?t know|stuck|lost|help me|what does|i can'?t|no idea|makes no sense|not sure|struggling)\b/i;
const TOPIC_MAP = {
  citation_practice: /\b(cit(e|ation)|reference|apa|in.?text|reference list|plagiar)\b/i,
  argument_structure: /\b(arg(ue|ument)|claim|premise|conclusion|reasoning|logic)\b/i,
  source_evaluation: /\b(source|credib|evaluat|reliab|peer.?review|journal)\b/i,
  ai_literacy: /\b(ai|artificial intelligence|chatgpt|gemini|llm|generated|hallucin)\b/i,
  research_skills: /\b(research|database|search|find(ing)? source|literature)\b/i,
  academic_tone: /\b(tone|formal|informal|colloqui|academic writing|third person)\b/i,
  evidence_use: /\b(evidence|support|proof|data|statistic|finding)\b/i,
  critical_reading: /\b(read(ing)?|comprehend|understand|annotate|active read)\b/i,
};

/**
 * Check a student message for frustration signals.
 * Increments frustration_index and flags an intervention if threshold crossed.
 */
export function logFrustration(text) {
  if (FRUSTRATION_KEYWORDS.test(text)) {
    STATE.adaptive.frustration_triggers.push(new Date().toISOString());
    // Count triggers in the last 15 minutes (one session window)
    const cutoff = Date.now() - 15 * 60 * 1000;
    const recentCount = STATE.adaptive.frustration_triggers
      .filter(t => new Date(t).getTime() > cutoff).length;
    STATE.adaptive.frustration_index = Math.min(5, Math.round(recentCount / 3 * 5) / 5 * 3);
    // Trim to last 50 entries
    if (STATE.adaptive.frustration_triggers.length > 50) {
      STATE.adaptive.frustration_triggers = STATE.adaptive.frustration_triggers.slice(-50);
    }
    saveState().catch(console.error);
    if (STATE.adaptive.frustration_index >= 3) checkEscalationTriggers();
  }
}

/**
 * Log a topic the student asked about in the Study Buddy.
 */
export function logStudyTopic(text) {
  for (const [topic, regex] of Object.entries(TOPIC_MAP)) {
    if (regex.test(text) && !STATE.adaptive.study_topics.includes(topic)) {
      STATE.adaptive.study_topics.push(topic);
      if (STATE.adaptive.study_topics.length > 50) STATE.adaptive.study_topics.shift();
      saveState().catch(console.error);
      break;
    }
  }
}

// ── Outcome Effectiveness Tracking ───────────

/**
 * Record a pending outcome when a micro-module recommendation is shown.
 * @param {string} moduleId      - micro-module id (e.g. 'evidence-booster')
 * @param {string} skillId       - associated skill
 * @param {number|null} scoreBefore - student's most recent score before the module
 */
export function recordOutcome(moduleId, skillId, scoreBefore) {
  if (!STATE.adaptive.outcomes) STATE.adaptive.outcomes = [];
  // Avoid duplicate pending outcomes for the same module + skill
  const existing = STATE.adaptive.outcomes.find(
    o => o.moduleId === moduleId && o.skill === skillId && o.status === 'pending'
  );
  if (existing) return;
  STATE.adaptive.outcomes.push({
    id: `out_${Date.now()}`,
    moduleId,
    skill: skillId,
    scoreBefore: scoreBefore ?? null,
    recommendedAt: new Date().toISOString(),
    scoreAfter: null,
    improvement: null,
    status: 'pending',
  });
  saveState().catch(console.error);
}

/**
 * Close all pending outcomes for a skill when a new score arrives.
 * Called automatically from recordSkillScore — caller handles the saveState.
 */
export function closeOutcomes(skillId, newScore) {
  if (!STATE.adaptive.outcomes?.length) return;
  STATE.adaptive.outcomes = STATE.adaptive.outcomes.map(o => {
    if (o.skill === skillId && o.status === 'pending') {
      const improvement = o.scoreBefore != null ? +(newScore - o.scoreBefore).toFixed(2) : null;
      return {
        ...o,
        scoreAfter: newScore,
        improvement,
        status: improvement == null ? 'unchanged'
          : improvement > 0 ? 'improved'
            : improvement < 0 ? 'declined'
              : 'unchanged',
        closedAt: new Date().toISOString(),
      };
    }
    return o;
  });
}

// ── Escalation System ─────────────────────────

/**
 * Create a new escalation record, deduplicated by trigger+skill.
 */
export function createEscalation(trigger, skill, severity, message) {
  if (!Array.isArray(STATE.escalations)) STATE.escalations = [];
  // Avoid duplicate active escalations of the same type for the same skill
  const existing = STATE.escalations.find(
    e => e.trigger === trigger && e.skill === (skill || null) && !e.resolved
  );
  if (existing) return;
  STATE.escalations.push({
    id: `esc_${Date.now()}`,
    trigger,
    skill: skill || null,
    severity,
    timestamp: new Date().toISOString(),
    resolved: false,
    message,
  });
  saveState().catch(console.error);
}

/**
 * Check all escalation triggers against current adaptive state.
 * Called after skill score updates and high-frustration events.
 */
export function checkEscalationTriggers() {
  const adaptive = STATE.adaptive;
  if (!adaptive) return;

  // Trigger 1: Persistent failure — 4 consecutive weak scores for a flagged skill
  SKILLS.forEach(skillId => {
    if (
      adaptive.skill_status[skillId] === 'weak' &&
      adaptive.needs_remediation.includes(skillId)
    ) {
      const entries = adaptive.skill_scores[skillId] || [];
      if (entries.length >= 4) {
        const last4 = entries.slice(-4).map(e => e.score);
        if (last4.every(s => s < 2.5)) {
          createEscalation(
            'persistent-failure',
            skillId,
            'high',
            `Persistent weak performance in ${skillId.replace(/_/g, ' ')} — 4 consecutive low scores.`
          );
        }
      }
    }
  });

  // Trigger 2: Declining performance — last score < first score by >0.5, ≥6 entries
  SKILLS.forEach(skillId => {
    const entries = adaptive.skill_scores[skillId] || [];
    if (entries.length >= 6) {
      const first = entries[0].score;
      const last = entries[entries.length - 1].score;
      if (last < first - 0.5) {
        createEscalation(
          'declining-performance',
          skillId,
          'high',
          `${skillId.replace(/_/g, ' ')} is declining — dropped from ${first} to ${last}.`
        );
      }
    }
  });

  // Trigger 3: Disengaged — no engagement for more than 10 days
  if (adaptive.recommendation_at) {
    const age = Date.now() - new Date(adaptive.recommendation_at).getTime();
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    if (age > tenDays) {
      createEscalation(
        'disengaged',
        null,
        'medium',
        'No platform engagement detected for over 10 days.'
      );
    }
  }

  // Trigger 4: Intervention ineffective — skill still in remediation after 3+ module attempts
  (adaptive.needs_remediation || []).forEach(skillId => {
    const moduleAttempts = (adaptive.skill_scores[skillId] || []).filter(e => e.triggered_by);
    if (moduleAttempts.length >= 3) {
      createEscalation(
        'intervention-ineffective',
        skillId,
        'medium',
        `3+ micro-module attempts for ${skillId.replace(/_/g, ' ')} with no resolution.`
      );
    }
  });
}

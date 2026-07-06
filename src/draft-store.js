const DB_NAME = 'acadlit-draft-store';
const DB_VERSION = 1;
const RECORDS_STORE = 'records';
const FILES_STORE = 'files';
const QUEUE_STORE = 'queue';
const HISTORY_STORE = 'history';
const MAX_HISTORY_ENTRIES = 5;
const FALLBACK_PREFIX = 'acadlit:draft:fallback:';

let _dbPromise = null;

function _supportsIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function _openDb() {
  if (!_supportsIndexedDb()) return Promise.resolve(null);
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const store = db.createObjectStore(RECORDS_STORE, { keyPath: 'key' });
        store.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('draftKey', 'draftKey', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open IndexedDB.'));
  }).catch((err) => {
    console.warn('Draft store falling back from IndexedDB:', err);
    return null;
  });
  return _dbPromise;
}

function _txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}

function _fallbackKey(key) {
  return `${FALLBACK_PREFIX}${key}`;
}

function _safeLocalGet(key) {
  try {
    const raw = localStorage.getItem(_fallbackKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _safeLocalSet(key, value) {
  try {
    localStorage.setItem(_fallbackKey(key), JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('LocalStorage fallback write failed:', err);
    return false;
  }
}

function _safeLocalRemove(key) {
  try {
    localStorage.removeItem(_fallbackKey(key));
  } catch {
    // Ignore fallback cleanup failures.
  }
}

function _nowIso() {
  return new Date().toISOString();
}

function _draftKey(userId = 'guest', surface = 'state', scopeId = 'default') {
  return `${String(userId || 'guest').trim() || 'guest'}::${String(surface || 'state').trim() || 'state'}::${String(scopeId || 'default').trim() || 'default'}`;
}

function _queueId(prefix = 'queue') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function _serializeFileLike(file) {
  return {
    name: String(file?.name || 'upload'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0) || 0,
    lastModified: Number(file?.lastModified || 0) || 0,
  };
}

function _cloneJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return null;
  }
}

async function _readRecordFromDb(key) {
  const db = await _openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDS_STORE, 'readonly');
    const request = tx.objectStore(RECORDS_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Failed to read draft record.'));
  }).catch(() => null);
}

async function _writeRecordToDb(record) {
  const db = await _openDb();
  if (!db) return false;
  const tx = db.transaction(RECORDS_STORE, 'readwrite');
  tx.objectStore(RECORDS_STORE).put(record);
  await _txDone(tx);
  return true;
}

async function _deleteRecordFromDb(key) {
  const db = await _openDb();
  if (!db) return false;
  const tx = db.transaction(RECORDS_STORE, 'readwrite');
  tx.objectStore(RECORDS_STORE).delete(key);
  await _txDone(tx);
  return true;
}

async function _writeHistoryEntry(draftKey, snapshot) {
  const db = await _openDb();
  if (!db) return;
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);
  const id = `${draftKey}::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`;
  store.put({
    id,
    draftKey,
    createdAt: _nowIso(),
    snapshot,
  });
  await _txDone(tx);

  const db2 = await _openDb();
  if (!db2) return;
  const cleanupTx = db2.transaction(HISTORY_STORE, 'readwrite');
  const cleanupStore = cleanupTx.objectStore(HISTORY_STORE);
  const index = cleanupStore.index('draftKey');
  const request = index.getAll(IDBKeyRange.only(draftKey));
  const entries = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Failed to read draft history.'));
  }).catch(() => []);
  entries
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''))
    .slice(MAX_HISTORY_ENTRIES)
    .forEach((entry) => cleanupStore.delete(entry.id));
  await _txDone(cleanupTx);
}

export function buildDraftKey({ userId = 'guest', surface = 'state', scopeId = 'default' } = {}) {
  return _draftKey(userId, surface, scopeId);
}

export async function loadLocalDraft({ userId = 'guest', surface = 'state', scopeId = 'default' } = {}) {
  const key = _draftKey(userId, surface, scopeId);
  const record = await _readRecordFromDb(key);
  if (record) return record;
  return _safeLocalGet(key);
}

export async function saveLocalDraft({
  userId = 'guest',
  surface = 'state',
  scopeId = 'default',
  payload = {},
  revision = null,
  syncState = 'local',
  lastSyncAt = null,
  lastError = '',
  pendingUploads = [],
  keepHistory = true,
} = {}) {
  const key = _draftKey(userId, surface, scopeId);
  const existing = await loadLocalDraft({ userId, surface, scopeId });
  const nextRevision = Number.isFinite(Number(revision))
    ? Number(revision)
    : Math.max(0, Number(existing?.revision || 0)) + 1;
  const record = {
    key,
    userId: String(userId || 'guest').trim() || 'guest',
    surface: String(surface || 'state').trim() || 'state',
    scopeId: String(scopeId || 'default').trim() || 'default',
    payload: _cloneJsonSafe(payload) ?? payload,
    updatedAt: _nowIso(),
    revision: nextRevision,
    syncState: String(syncState || 'local'),
    lastSyncAt: lastSyncAt || existing?.lastSyncAt || null,
    lastError: String(lastError || ''),
    pendingUploads: Array.isArray(pendingUploads) ? _cloneJsonSafe(pendingUploads) || [] : [],
  };

  const storedInDb = await _writeRecordToDb(record).catch(() => false);
  if (!storedInDb) {
    _safeLocalSet(key, record);
  } else {
    _safeLocalRemove(key);
  }
  if (keepHistory) {
    await _writeHistoryEntry(key, {
      payload: record.payload,
      updatedAt: record.updatedAt,
      revision: record.revision,
    }).catch(() => {});
  }
  return record;
}

export async function markLocalDraftSynced({ userId = 'guest', surface = 'state', scopeId = 'default', lastSyncAt = _nowIso(), clearError = true } = {}) {
  const record = await loadLocalDraft({ userId, surface, scopeId });
  if (!record) return null;
  return saveLocalDraft({
    userId,
    surface,
    scopeId,
    payload: record.payload,
    revision: record.revision,
    syncState: 'synced',
    lastSyncAt,
    lastError: clearError ? '' : record.lastError,
    pendingUploads: record.pendingUploads || [],
    keepHistory: false,
  });
}

export async function markLocalDraftError({ userId = 'guest', surface = 'state', scopeId = 'default', error = '' } = {}) {
  const record = await loadLocalDraft({ userId, surface, scopeId });
  if (!record) return null;
  return saveLocalDraft({
    userId,
    surface,
    scopeId,
    payload: record.payload,
    revision: record.revision,
    syncState: 'error',
    lastSyncAt: record.lastSyncAt || null,
    lastError: String(error || ''),
    pendingUploads: record.pendingUploads || [],
    keepHistory: false,
  });
}

export async function getDraftSyncStatus({ userId = 'guest', surface = 'state', scopeId = 'default' } = {}) {
  const record = await loadLocalDraft({ userId, surface, scopeId });
  if (!record) return null;
  return {
    revision: Number(record.revision || 0) || 0,
    syncState: String(record.syncState || 'local'),
    updatedAt: record.updatedAt || null,
    lastSyncAt: record.lastSyncAt || null,
    lastError: record.lastError || '',
    pendingUploads: Array.isArray(record.pendingUploads) ? record.pendingUploads : [],
  };
}

export async function deleteLocalDraft({ userId = 'guest', surface = 'state', scopeId = 'default' } = {}) {
  const key = _draftKey(userId, surface, scopeId);
  const deletedFromDb = await _deleteRecordFromDb(key).catch(() => false);
  _safeLocalRemove(key);
  return deletedFromDb;
}

export async function storeFileBlob({ userId = 'guest', fileId, file, meta = {} } = {}) {
  if (!fileId || !file) throw new Error('Missing queued file payload.');
  const db = await _openDb();
  if (!db) throw new Error('This browser cannot preserve uploads offline. Your text is still protected, but files require a supported browser storage layer.');
  const tx = db.transaction(FILES_STORE, 'readwrite');
  tx.objectStore(FILES_STORE).put({
    id: String(fileId),
    userId: String(userId || 'guest').trim() || 'guest',
    blob: file,
    meta: {
      ..._serializeFileLike(file),
      ..._cloneJsonSafe(meta),
    },
    createdAt: _nowIso(),
  });
  await _txDone(tx);
  return fileId;
}

export async function loadStoredFile(fileId) {
  const db = await _openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly');
    const request = tx.objectStore(FILES_STORE).get(String(fileId || ''));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not load queued file.'));
  }).catch(() => null);
}

export async function removeStoredFile(fileId) {
  const db = await _openDb();
  if (!db) return;
  const tx = db.transaction(FILES_STORE, 'readwrite');
  tx.objectStore(FILES_STORE).delete(String(fileId || ''));
  await _txDone(tx);
}

export async function enqueueStateSync({ userId = 'guest', scopeId = 'app-state', surface = 'state' } = {}) {
  const db = await _openDb();
  const item = {
    id: `state_${String(userId || 'guest')}`,
    userId: String(userId || 'guest').trim() || 'guest',
    type: 'state-sync',
    surface: String(surface || 'state').trim() || 'state',
    scopeId: String(scopeId || 'app-state').trim() || 'app-state',
    status: 'pending',
    attempts: 0,
    updatedAt: _nowIso(),
    createdAt: _nowIso(),
  };
  if (!db) {
    _safeLocalSet(item.id, item);
    return item;
  }
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).put(item);
  await _txDone(tx);
  return item;
}

export async function enqueueFileUpload({ userId = 'guest', type, surface = '', scopeId = '', payload = {}, fileId, file } = {}) {
  if (!type || !fileId || !file) throw new Error('Missing file upload queue data.');
  await storeFileBlob({ userId, fileId, file, meta: payload });
  const db = await _openDb();
  const item = {
    id: _queueId('file'),
    userId: String(userId || 'guest').trim() || 'guest',
    type: String(type),
    surface: String(surface || '').trim(),
    scopeId: String(scopeId || '').trim(),
    fileId: String(fileId),
    payload: _cloneJsonSafe(payload) || {},
    status: 'pending',
    attempts: 0,
    createdAt: _nowIso(),
    updatedAt: _nowIso(),
  };
  if (!db) throw new Error('This browser cannot preserve uploads offline. Your text is still protected, but files require IndexedDB support.');
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).put(item);
  await _txDone(tx);
  return item;
}

export async function listQueuedItems(userId = '') {
  const db = await _openDb();
  if (!db) {
    const stateFallback = _safeLocalGet(`state_${String(userId || 'guest')}`);
    return stateFallback ? [stateFallback] : [];
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const request = userId
      ? store.index('userId').getAll(String(userId || 'guest').trim() || 'guest')
      : store.getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || '')));
    request.onerror = () => reject(request.error || new Error('Could not read queued sync items.'));
  }).catch(() => []);
}

export async function updateQueuedItem(id, patch = {}) {
  const db = await _openDb();
  if (!db) {
    const current = _safeLocalGet(id);
    if (!current) return null;
    const next = { ...current, ..._cloneJsonSafe(patch), updatedAt: _nowIso() };
    _safeLocalSet(id, next);
    return next;
  }
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(QUEUE_STORE);
  const current = await new Promise((resolve, reject) => {
    const request = store.get(String(id || ''));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not load queue item.'));
  }).catch(() => null);
  if (!current) {
    await _txDone(tx).catch(() => {});
    return null;
  }
  const next = { ...current, ..._cloneJsonSafe(patch), updatedAt: _nowIso() };
  store.put(next);
  await _txDone(tx);
  return next;
}

export async function removeQueuedItem(id) {
  const db = await _openDb();
  if (!db) {
    _safeLocalRemove(id);
    return;
  }
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  tx.objectStore(QUEUE_STORE).delete(String(id || ''));
  await _txDone(tx);
}

export async function loadDraftHistory({ userId = 'guest', surface = 'state', scopeId = 'default' } = {}) {
  const db = await _openDb();
  if (!db) return [];
  const draftKey = _draftKey(userId, surface, scopeId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, 'readonly');
    const request = tx.objectStore(HISTORY_STORE).index('draftKey').getAll(draftKey);
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')));
    request.onerror = () => reject(request.error || new Error('Could not load draft history.'));
  }).catch(() => []);
}

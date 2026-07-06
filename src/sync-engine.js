import { db, storage } from './firebase.js';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { ref, set } from 'firebase/database';
import { STATE, saveState, syncStatus, persistLocalStateSoon, flushLocalStateSnapshot } from './state.js';
import {
  enqueueFileUpload,
  enqueueStateSync,
  listQueuedItems,
  loadLocalDraft,
  loadStoredFile,
  removeQueuedItem,
  removeStoredFile,
  saveLocalDraft,
  updateQueuedItem,
} from './draft-store.js';

const FLUSH_INTERVAL_MS = 30 * 1000;

let _engineBound = false;
let _engineTimer = null;
let _engineActiveUserId = '';
let _flushPromise = null;

function _uid(user = STATE.user) {
  return String(user?.uid || '').trim();
}

function _emitSyncEvent(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent('acadlit-sync-update', { detail }));
  } catch {
    // Ignore event dispatch failures.
  }
}

function _nowIso() {
  return new Date().toISOString();
}

function _asUploadFile(blobRecord = {}) {
  const blob = blobRecord?.blob;
  const meta = blobRecord?.meta || {};
  const name = String(meta?.name || 'upload');
  const type = String(meta?.type || blob?.type || 'application/octet-stream');
  const lastModified = Number(meta?.lastModified || Date.now()) || Date.now();
  if (typeof File !== 'undefined') {
    return new File([blob], name, { type, lastModified });
  }
  const fallback = blob instanceof Blob ? blob : new Blob([blob], { type });
  fallback.name = name;
  fallback.lastModified = lastModified;
  fallback.type = type;
  return fallback;
}

function _buildPendingNotebookAsset({ notebookType, sessionId, fileId, file }) {
  return {
    id: `pending-${fileId}`,
    localDraftId: fileId,
    sessionId,
    notebookType,
    name: String(file?.name || 'upload'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0) || 0,
    uploadedAt: _nowIso(),
    pendingUpload: true,
    syncState: 'local',
    url: '',
    storagePath: '',
  };
}

function _buildPendingSubmissionFile({ assessmentId, fileId, file, slot = null }) {
  return {
    id: `pending-${fileId}`,
    localDraftId: fileId,
    assessmentId,
    slot: slot || null,
    name: String(file?.name || 'upload'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0) || 0,
    uploadedAt: _nowIso(),
    pendingUpload: true,
    syncState: 'local',
    url: '',
    storagePath: '',
  };
}

function _updateNotebookAttachmentFromQueue(payload = {}, uploadedAsset = null) {
  const notebookState = payload?.notebookType === 'tutorial'
    ? STATE.tutorialNotebook
    : STATE.contactNotebook;
  const entry = notebookState?.entries?.[payload?.sessionId];
  if (!entry || !Array.isArray(entry.attachments)) return false;
  const idx = entry.attachments.findIndex((item) => String(item?.localDraftId || item?.id || '') === String(payload?.attachmentId || ''));
  if (idx === -1) return false;
  if (uploadedAsset) {
    entry.attachments[idx] = {
      ...entry.attachments[idx],
      ...uploadedAsset,
      id: uploadedAsset.id || entry.attachments[idx].id,
      localDraftId: payload.attachmentId,
      pendingUpload: false,
      syncState: 'synced',
    };
  } else {
    entry.attachments.splice(idx, 1);
  }
  entry.updatedAt = _nowIso();
  return true;
}

async function _syncSubmissionDraftMirror(assessmentId) {
  const uid = _uid();
  if (!uid || !assessmentId) return;
  const draftRecord = await loadLocalDraft({ userId: uid, surface: 'submission-draft', scopeId: assessmentId });
  const payload = draftRecord?.payload || { files: [], note: '' };
  try {
    await set(ref(db, `submission-drafts/${uid}/${assessmentId}`), {
      files: (Array.isArray(payload.files) ? payload.files : []).map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        storagePath: file.storagePath || '',
        url: file.url || '',
        uploadedAt: file.uploadedAt || _nowIso(),
        slot: file.slot || null,
        pendingUpload: Boolean(file.pendingUpload),
        localDraftId: file.localDraftId || null,
      })),
      note: String(payload.note || '').slice(0, 1000),
      savedAt: _nowIso(),
    });
    await saveLocalDraft({
      userId: uid,
      surface: 'submission-draft',
      scopeId: assessmentId,
      payload,
      revision: draftRecord?.revision || 1,
      syncState: 'synced',
      lastSyncAt: _nowIso(),
      pendingUploads: (payload.files || []).filter((file) => file?.pendingUpload).map((file) => file.localDraftId).filter(Boolean),
      keepHistory: false,
    });
  } catch (err) {
    console.warn('Submission draft mirror sync failed:', err);
  }
}

async function _uploadStoredFile(path, file, metadata = {}, onProgress = null) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef(storage, path), file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: metadata,
    });
    task.on(
      'state_changed',
      (snap) => {
        if (typeof onProgress === 'function') {
          const pct = Math.round((snap.bytesTransferred / Math.max(1, snap.totalBytes)) * 100);
          onProgress(pct);
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, storagePath: path });
      },
    );
  });
}

async function _processNotebookUpload(item) {
  const stored = await loadStoredFile(item.fileId);
  if (!stored?.blob) throw new Error('Queued notebook file is missing from local storage.');
  const file = _asUploadFile(stored);
  const uploaderUid = _uid();
  const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `gallery/assets/${uploaderUid}/${item.fileId}-${safeName}`;
  const uploaded = await _uploadStoredFile(storagePath, file, {
    uploaderUid,
    originalName: file.name || safeName,
    notebookType: item.payload?.notebookType || 'contact',
    sessionId: item.payload?.sessionId || '',
  });
  const applied = _updateNotebookAttachmentFromQueue(item.payload, {
    name: file.name || safeName,
    type: file.type || 'application/octet-stream',
    size: Number(file.size || 0) || 0,
    path: storagePath,
    storagePath,
    url: uploaded.url,
    uploadedAt: _nowIso(),
  });
  await removeStoredFile(item.fileId);
  await removeQueuedItem(item.id);
  if (applied) {
    persistLocalStateSoon('notebook-upload-sync');
    await saveState({ skipLocalWrite: false, skipQueue: true, suppressIndicator: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notebook-upload-complete', {
        detail: {
          notebookType: item.payload?.notebookType || 'contact',
          sessionId: item.payload?.sessionId || '',
          attachmentId: item.payload?.attachmentId || '',
        },
      }));
    }
  }
}

async function _processSubmissionFileUpload(item) {
  const stored = await loadStoredFile(item.fileId);
  if (!stored?.blob) throw new Error('Queued submission file is missing from local storage.');
  const file = _asUploadFile(stored);
  const uploaderUid = _uid();
  const assessmentId = String(item.payload?.assessmentId || '').trim();
  if (!assessmentId) throw new Error('Queued submission file is missing its assessment id.');
  const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `submissions/${assessmentId}/${uploaderUid}/${item.fileId}-${safeName}`;
  const uploaded = await _uploadStoredFile(storagePath, file, {
    uploaderUid,
    assessmentId,
    originalName: file.name || safeName,
  });

  const draftRecord = await loadLocalDraft({ userId: uploaderUid, surface: 'submission-draft', scopeId: assessmentId });
  const payload = draftRecord?.payload || { files: [], note: '' };
  payload.files = (Array.isArray(payload.files) ? payload.files : []).map((entry) => {
    if (String(entry?.localDraftId || '') !== String(item.payload?.draftFileId || '')) return entry;
    return {
      ...entry,
      name: file.name || safeName,
      type: file.type || 'application/octet-stream',
      size: Number(file.size || 0) || 0,
      storagePath,
      url: uploaded.url,
      uploadedAt: _nowIso(),
      pendingUpload: false,
      syncState: 'synced',
    };
  });
  await saveLocalDraft({
    userId: uploaderUid,
    surface: 'submission-draft',
    scopeId: assessmentId,
    payload,
    revision: draftRecord?.revision || 1,
    syncState: 'local',
    pendingUploads: payload.files.filter((entry) => entry?.pendingUpload).map((entry) => entry.localDraftId).filter(Boolean),
    keepHistory: false,
  });
  await _syncSubmissionDraftMirror(assessmentId);
  await removeStoredFile(item.fileId);
  await removeQueuedItem(item.id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('submission-draft-updated', { detail: { assessmentId } }));
  }
}

async function _processQueueItem(item) {
  if (!item) return;
  if (item.type === 'state-sync') {
    await saveState({ skipLocalWrite: true, skipQueue: true, suppressIndicator: true });
    await removeQueuedItem(item.id);
    return;
  }
  if (item.type === 'notebook-upload') {
    await _processNotebookUpload(item);
    return;
  }
  if (item.type === 'submission-file-upload') {
    await _processSubmissionFileUpload(item);
    return;
  }
  await removeQueuedItem(item.id);
}

export async function flushSyncQueue(reason = 'manual') {
  if (_flushPromise) return _flushPromise;
  _flushPromise = (async () => {
    const uid = _uid();
    if (!uid || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
    const queue = await listQueuedItems(uid);
    if (!queue.length) return true;
    _emitSyncEvent({ phase: 'start', reason, count: queue.length });
    for (const item of queue) {
      try {
        await updateQueuedItem(item.id, { status: 'syncing', attempts: Number(item.attempts || 0) + 1 });
        syncStatus.syncing = true;
        _emitSyncEvent({ phase: 'item', reason, item });
        await _processQueueItem(item);
      } catch (err) {
        console.warn('Queued sync item failed:', item?.type, err);
        await updateQueuedItem(item.id, {
          status: 'error',
          lastError: err?.message || String(err),
        }).catch(() => {});
        syncStatus.syncing = false;
        syncStatus.lastCloudFailAt = _nowIso();
        syncStatus.lastLocalError = err?.message || String(err);
        _emitSyncEvent({ phase: 'error', reason, item, error: err?.message || String(err) });
        return false;
      }
    }
    syncStatus.syncing = false;
    _emitSyncEvent({ phase: 'complete', reason });
    return true;
  })().finally(() => {
    _flushPromise = null;
  });
  return _flushPromise;
}

export function scheduleSyncFlush(reason = 'scheduled', delayMs = 300) {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    flushSyncQueue(reason).catch(console.error);
  }, Math.max(0, Number(delayMs) || 0));
}

export async function queueNotebookAttachment({ notebookType = 'contact', sessionId, file } = {}) {
  const uid = _uid();
  if (!uid || !sessionId || !file) throw new Error('Missing notebook upload context.');
  const fileId = `nb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await enqueueFileUpload({
    userId: uid,
    type: 'notebook-upload',
    surface: `${notebookType}-notebook`,
    scopeId: sessionId,
    fileId,
    file,
    payload: {
      notebookType,
      sessionId,
      attachmentId: fileId,
    },
  });
  const pending = _buildPendingNotebookAsset({ notebookType, sessionId, fileId, file });
  scheduleSyncFlush('queue-notebook-upload', 50);
  return pending;
}

export async function queueSubmissionDraftFile({ assessmentId, slot = null, file } = {}) {
  const uid = _uid();
  if (!uid || !assessmentId || !file) throw new Error('Missing submission upload context.');
  const fileId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await enqueueFileUpload({
    userId: uid,
    type: 'submission-file-upload',
    surface: 'submission-draft',
    scopeId: assessmentId,
    fileId,
    file,
    payload: {
      assessmentId,
      draftFileId: fileId,
      slot: slot || null,
    },
  });
  const pending = _buildPendingSubmissionFile({ assessmentId, fileId, file, slot });
  scheduleSyncFlush('queue-submission-upload', 50);
  return pending;
}

export async function mirrorSubmissionDraftToCloud(assessmentId) {
  if (!_uid() || !assessmentId) return;
  await _syncSubmissionDraftMirror(assessmentId);
}

export async function cancelSubmissionDraftFile({ assessmentId, draftFileId } = {}) {
  const uid = _uid();
  if (!uid || !assessmentId || !draftFileId) return;
  const queue = await listQueuedItems(uid);
  const match = queue.find((item) => item?.type === 'submission-file-upload'
    && String(item?.scopeId || '') === String(assessmentId)
    && String(item?.payload?.draftFileId || '') === String(draftFileId));
  if (!match) return;
  await removeQueuedItem(match.id).catch(() => {});
  if (match.fileId) {
    await removeStoredFile(match.fileId).catch(() => {});
  }
}

export async function clearQueuedSubmissionDraftFiles(assessmentId) {
  const uid = _uid();
  if (!uid || !assessmentId) return;
  const queue = await listQueuedItems(uid);
  const matches = queue.filter((item) => item?.type === 'submission-file-upload'
    && String(item?.scopeId || '') === String(assessmentId));
  await Promise.all(matches.map(async (item) => {
    await removeQueuedItem(item.id).catch(() => {});
    if (item.fileId) {
      await removeStoredFile(item.fileId).catch(() => {});
    }
  }));
}

export async function registerStateSyncIntent(scopeId = 'app-state') {
  const uid = _uid();
  if (!uid) return null;
  const item = await enqueueStateSync({ userId: uid, scopeId, surface: 'state' });
  scheduleSyncFlush('state-intent', 50);
  return item;
}

export function initSyncEngine(user = STATE.user) {
  const uid = _uid(user);
  if (!uid) return;
  _engineActiveUserId = uid;
  if (_engineBound) {
    scheduleSyncFlush('reinit');
    return;
  }
  _engineBound = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      flushLocalStateSnapshot({ scheduleCloud: true }).catch(console.error);
      flushSyncQueue('online').catch(console.error);
    });
    window.addEventListener('focus', () => {
      flushSyncQueue('focus').catch(console.error);
    });
    window.addEventListener('pageshow', () => {
      flushSyncQueue('pageshow').catch(console.error);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushLocalStateSnapshot({ scheduleCloud: true }).catch(console.error);
        return;
      }
      flushSyncQueue('visibility').catch(console.error);
    });
  }

  _engineTimer = setInterval(() => {
    if (_engineActiveUserId !== _uid()) return;
    flushSyncQueue('interval').catch(console.error);
  }, FLUSH_INTERVAL_MS);

  scheduleSyncFlush('boot', 100);
}

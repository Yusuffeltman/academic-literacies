import { db } from './firebase.js';
import { STATE } from './state.js';
import { get, onValue, push, ref, runTransaction, set, update } from 'firebase/database';
import { uploadGalleryAsset } from './gallery.js';
import {
  addMemberToRoom,
  createCollaborationGroupRoom,
  removeMemberFromRoom,
  sendAssetMessage,
} from './chat.js';

function _nowIso() {
  return new Date().toISOString();
}

function _nowMs() {
  return Date.now();
}

function _role() {
  return STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student';
}

function _isStaff(role = _role()) {
  return role === 'tutor' || role === 'lecturer' || role === 'moderator';
}

function _currentUser() {
  const user = STATE.user || {};
  const rawName = String(user?.displayName || '').split(' [')[0].trim();
  const rawEmail = String(user?.email || '').trim();
  return {
    uid: String(user?.uid || '').trim(),
    name: rawName || rawEmail || 'Student',
    email: rawEmail,
    role: _role(),
  };
}

function _scopePath(scopeId = '') {
  return `collaboration-groups/scopes/${String(scopeId || '').trim()}`;
}

function _scopeMetaPath(scopeId = '') {
  return `${_scopePath(scopeId)}/meta`;
}

function _scopeGroupsPath(scopeId = '') {
  return `${_scopePath(scopeId)}/groups`;
}

function _scopeArchivePath(scopeId = '', archiveId = '') {
  return `collaboration-groups/archive/scopes/${String(scopeId || '').trim()}/versions/${String(archiveId || '').trim()}`;
}

function _legacyAssessmentPath(assessmentId = '') {
  return `assessment-groups/${String(assessmentId || '').trim()}/groups`;
}

function _scopeConfig(scopeId, config = {}) {
  return {
    id: String(scopeId || '').trim(),
    type: String(config?.scopeType || config?.type || 'custom').trim() || 'custom',
    label: String(config?.scopeLabel || config?.label || config?.title || scopeId || 'Collaboration space').trim(),
    sizeLimit: Math.max(2, Number(config?.sizeLimit) || 5),
    allowSelfSelect: config?.allowSelfSelect !== false,
  };
}

function _resolveSizeLimit(source = {}, fallback = 5) {
  return Math.max(2, Number(fallback) || 0, Number(source?.sizeLimit) || 0);
}

function _defaultScopeMeta(scopeId, config = {}) {
  const resolved = _scopeConfig(scopeId, config);
  return {
    id: resolved.id,
    type: resolved.type,
    label: resolved.label,
    sizeLimit: resolved.sizeLimit,
    allowSelfSelect: resolved.allowSelfSelect,
    status: 'active',
    createdAt: _nowIso(),
    updatedAt: _nowIso(),
    archivedAt: null,
    archivedReason: null,
  };
}

function _pickNextLeaderUid(members = {}, preferredUid = '') {
  const entries = Object.entries(members || {});
  if (!entries.length) return '';
  if (preferredUid && members?.[preferredUid]) return preferredUid;
  return entries
    .sort(([, a], [, b]) => Number(a?.joinedAt || 0) - Number(b?.joinedAt || 0))[0]?.[0] || '';
}

function _snapshotToScope(scopeId, snapshot, fallbackConfig = {}) {
  const raw = snapshot?.exists() ? (snapshot.val() || {}) : {};
  const meta = raw?.meta && typeof raw.meta === 'object'
    ? raw.meta
    : _defaultScopeMeta(scopeId, fallbackConfig);
  const groups = raw?.groups && typeof raw.groups === 'object' ? raw.groups : {};
  return { meta, groups };
}

function _sortGroupsByCreatedAt(groups = {}) {
  return Object.entries(groups || {}).sort(([, a], [, b]) => {
    const aStamp = Number(a?.createdAt || 0);
    const bStamp = Number(b?.createdAt || 0);
    return aStamp - bStamp;
  });
}

export function normalizeCollaborationGroupName(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function resolveCollaborationScope(scopeId, config = {}) {
  return _scopeConfig(scopeId, config);
}

export function findUserCollaborationGroupEntry(groups = {}, uid = '') {
  const targetUid = String(uid || '').trim();
  if (!targetUid) return null;
  return Object.entries(groups || {}).find(([, group]) => Boolean(group?.members?.[targetUid])) || null;
}

function _isManagementLocked(group = {}) {
  return Boolean(group?.managementLocked);
}

export async function ensureCollaborationScope(scopeId, config = {}) {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) throw new Error('Missing collaboration scope.');

  const fallbackMeta = _defaultScopeMeta(safeScopeId, config);
  const metaRef = ref(db, _scopeMetaPath(safeScopeId));
  const result = await runTransaction(metaRef, (current) => {
    const next = current && typeof current === 'object'
      ? { ...fallbackMeta, ...current }
      : fallbackMeta;
    next.id = safeScopeId;
    next.type = String(next.type || fallbackMeta.type || 'custom').trim() || 'custom';
    next.label = String(next.label || fallbackMeta.label || safeScopeId).trim();
    next.sizeLimit = Math.max(2, Number(next.sizeLimit) || fallbackMeta.sizeLimit || 5);
    next.allowSelfSelect = next.allowSelfSelect !== false;
    next.updatedAt = _nowIso();
    return next;
  });
  return result.snapshot?.val() || fallbackMeta;
}

export async function ensureCollaborationScopeCapacity(scopeId, config = {}) {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) throw new Error('Missing collaboration scope.');

  const resolved = _scopeConfig(safeScopeId, config);
  const scope = await getCollaborationScope(safeScopeId, resolved);
  const targetSize = _resolveSizeLimit(scope?.meta || {}, resolved.sizeLimit || 5);
  const groups = scope?.groups || {};
  const updates = {};
  let changed = 0;

  if (_resolveSizeLimit(scope?.meta || {}, resolved.sizeLimit || 5) !== Number(scope?.meta?.sizeLimit || 0)) {
    updates[_scopeMetaPath(safeScopeId)] = {
      ...(scope.meta || _defaultScopeMeta(safeScopeId, resolved)),
      id: safeScopeId,
      sizeLimit: targetSize,
      updatedAt: _nowIso(),
    };
  }

  for (const [groupId, group] of Object.entries(groups)) {
    const nextSizeLimit = _resolveSizeLimit(group, targetSize);
    if (Number(group?.sizeLimit || 0) >= nextSizeLimit) continue;
    updates[`${_scopeGroupsPath(safeScopeId)}/${groupId}/sizeLimit`] = nextSizeLimit;
    updates[`${_scopeGroupsPath(safeScopeId)}/${groupId}/updatedAt`] = _nowIso();
    changed += 1;
  }

  if (!Object.keys(updates).length) {
    return { changed: 0, sizeLimit: targetSize };
  }

  await update(ref(db), updates);
  return { changed, sizeLimit: targetSize };
}

export async function getCollaborationScope(scopeId, config = {}) {
  const snap = await get(ref(db, _scopePath(scopeId)));
  return _snapshotToScope(scopeId, snap, config);
}

export function subscribeToCollaborationScope(scopeId, onUpdate, onError, config = {}) {
  if (!scopeId || typeof onUpdate !== 'function') return () => {};
  const scopeRef = ref(db, _scopePath(scopeId));
  return onValue(
    scopeRef,
    (snapshot) => onUpdate(_snapshotToScope(scopeId, snapshot, config)),
    (error) => {
      if (typeof onError === 'function') onError(error);
    }
  );
}

export function subscribeToCollaborationGroups(scopeId, onUpdate, onError, config = {}) {
  return subscribeToCollaborationScope(
    scopeId,
    (scope) => onUpdate(scope.groups || {}, scope.meta || _defaultScopeMeta(scopeId, config)),
    onError,
    config
  );
}

async function _ensureGroupRoom(scopeId, groupId, group) {
  const memberUids = Object.keys(group?.members || {});
  if (!memberUids.length) return null;
  const actorUid = _currentUser().uid;

  if (group?.chatRoomId) {
    const roomSummary = {
      type: 'group',
      subtype: 'collaboration',
      name: group?.name || 'Group Chat',
      collaborationGroupId: groupId,
      collaborationScopeId: scopeId,
    };
    const syncMemberUids = actorUid && actorUid === group?.leaderUid
      ? memberUids
      : memberUids.filter((memberUid) => memberUid === actorUid);
    for (const memberUid of syncMemberUids) {
      await addMemberToRoom(
        group.chatRoomId,
        memberUid,
        group?.members?.[memberUid]?.role || 'student',
        roomSummary
      );
    }
    return group.chatRoomId;
  }

  const roomId = await createCollaborationGroupRoom({
    name: group?.name || 'Group Chat',
    collaborationGroupId: groupId,
    collaborationScopeId: scopeId,
    memberUids,
  });

  if (!roomId) return null;

  await update(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}`), {
    chatRoomId: roomId,
    updatedAt: _nowIso(),
  });

  return roomId;
}

export async function ensureCollaborationGroupRoom(scopeId, groupId, group = null) {
  if (!scopeId || !groupId) return null;
  let nextGroup = group;
  if (!nextGroup) {
    const snap = await get(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}`));
    nextGroup = snap.exists() ? (snap.val() || null) : null;
  }
  if (!nextGroup) return null;
  return _ensureGroupRoom(scopeId, groupId, nextGroup);
}

export async function migrateLegacyAssessmentGroups(scopeId, legacyAssessmentId, config = {}) {
  const safeScopeId = String(scopeId || '').trim();
  const safeLegacyId = String(legacyAssessmentId || '').trim();
  if (!safeScopeId || !safeLegacyId) return { migrated: false, reason: 'missing-scope' };

  const meta = await ensureCollaborationScope(safeScopeId, config);
  if (String(meta?.status || 'active') === 'archived') {
    return { migrated: false, reason: 'scope-archived' };
  }

  const scopeSnap = await get(ref(db, _scopePath(safeScopeId)));
  const existingScope = _snapshotToScope(safeScopeId, scopeSnap, config);
  if (Object.keys(existingScope.groups || {}).length > 0) {
    return { migrated: false, reason: 'target-has-groups' };
  }
  if (existingScope.meta?.legacyMigration?.source === safeLegacyId) {
    return { migrated: false, reason: 'already-migrated' };
  }

  const legacySnap = await get(ref(db, _legacyAssessmentPath(safeLegacyId)));
  const legacyGroups = legacySnap.exists() ? (legacySnap.val() || {}) : {};
  if (!Object.keys(legacyGroups).length) {
    await update(ref(db, _scopeMetaPath(safeScopeId)), {
      legacyMigration: {
        source: safeLegacyId,
        migratedAt: _nowIso(),
        migratedBy: _currentUser().uid || null,
        count: 0,
      },
      updatedAt: _nowIso(),
    });
    return { migrated: false, reason: 'no-legacy-groups' };
  }

  const resolved = _scopeConfig(safeScopeId, config);
  const migratedGroups = {};
  for (const [groupId, group] of Object.entries(legacyGroups)) {
    if (!group || typeof group !== 'object') continue;
    const members = group?.members && typeof group.members === 'object' ? group.members : {};
    const leaderUid = members?.[group?.createdBy] ? String(group.createdBy || '') : _pickNextLeaderUid(members);
    const createdAtMs = Number(group?.createdAt || _nowMs()) || _nowMs();
    migratedGroups[groupId] = {
      id: groupId,
      name: normalizeCollaborationGroupName(group?.name || `Group ${groupId.slice(-4)}`),
      scopeId: safeScopeId,
      scopeType: resolved.type,
      scopeLabel: resolved.label,
      sizeLimit: Math.max(2, Number(group?.sizeLimit) || resolved.sizeLimit || 5),
      createdAt: createdAtMs,
      updatedAt: _nowIso(),
      createdBy: String(group?.createdBy || leaderUid || '').trim() || null,
      leaderUid: leaderUid || null,
      chatRoomId: null,
      members,
      artefacts: group?.artefacts && typeof group.artefacts === 'object' ? group.artefacts : {},
      migratedFromLegacy: true,
      legacyAssessmentId: safeLegacyId,
    };
  }

  const updates = {};
  updates[_scopeGroupsPath(safeScopeId)] = migratedGroups;
  updates[_scopeMetaPath(safeScopeId)] = {
    ...existingScope.meta,
    id: safeScopeId,
    type: resolved.type,
    label: resolved.label,
    sizeLimit: resolved.sizeLimit,
    allowSelfSelect: resolved.allowSelfSelect,
    status: existingScope.meta?.status || 'active',
    updatedAt: _nowIso(),
    legacyMigration: {
      source: safeLegacyId,
      migratedAt: _nowIso(),
      migratedBy: _currentUser().uid || null,
      count: Object.keys(migratedGroups).length,
    },
  };
  updates[`assessment-groups/${safeLegacyId}/meta`] = {
    migratedToScopeId: safeScopeId,
    migratedAt: _nowIso(),
    migratedBy: _currentUser().uid || null,
    count: Object.keys(migratedGroups).length,
  };
  await update(ref(db), updates);

  return { migrated: true, count: Object.keys(migratedGroups).length };
}

export async function archiveCollaborationScope(scopeId, options = {}) {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) throw new Error('Missing collaboration scope.');

  const actor = _currentUser();
  const scope = await getCollaborationScope(safeScopeId, options);
  const groups = scope.groups || {};
  const meta = scope.meta || _defaultScopeMeta(safeScopeId, options);
  if (String(meta.status || 'active') === 'archived') {
    return { archived: false, reason: 'already-archived' };
  }

  const archiveId = `${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const archiveRecord = {
    meta: {
      ...meta,
      status: 'archived',
      archivedAt: _nowIso(),
      archivedReason: String(options?.reason || 'Scope archived').trim(),
      archivedBy: actor.uid || null,
      archiveId,
    },
    groups,
  };

  const updates = {};
  updates[_scopeArchivePath(safeScopeId, archiveId)] = archiveRecord;
  updates[_scopePath(safeScopeId)] = {
    meta: {
      ...meta,
      status: 'archived',
      archivedAt: archiveRecord.meta.archivedAt,
      archivedReason: archiveRecord.meta.archivedReason,
      archivedBy: actor.uid || null,
      activeArchiveId: archiveId,
      updatedAt: _nowIso(),
    },
    groups: {},
  };
  await update(ref(db), updates);

  return { archived: true, archiveId, count: Object.keys(groups).length };
}

export async function startFreshCollaborationCycle(scopeId, options = {}) {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) throw new Error('Missing collaboration scope.');

  const actor = _currentUser();
  const scope = await getCollaborationScope(safeScopeId, options);
  const groups = scope.groups || {};
  const meta = scope.meta || _defaultScopeMeta(safeScopeId, options);
  const now = _nowIso();
  const nextCycle = Math.max(1, Number(meta?.cycle || 0) + 1);
  let archiveId = '';
  let archivedCount = 0;

  const updates = {};
  if (String(meta.status || 'active') !== 'archived' && Object.keys(groups).length) {
    archiveId = `${new Date().toISOString().replace(/[:.]/g, '-')}`;
    archivedCount = Object.keys(groups).length;
    updates[_scopeArchivePath(safeScopeId, archiveId)] = {
      meta: {
        ...meta,
        status: 'archived',
        archivedAt: now,
        archivedReason: String(options?.reason || 'Scope archived before opening a new cycle').trim(),
        archivedBy: actor.uid || null,
        archiveId,
      },
      groups,
    };
  }

  updates[_scopePath(safeScopeId)] = {
    meta: {
      ...meta,
      id: safeScopeId,
      status: 'active',
      activeArchiveId: null,
      archivedAt: null,
      archivedReason: null,
      archivedBy: null,
      updatedAt: now,
      reopenedAt: now,
      reopenedBy: actor.uid || null,
      cycle: nextCycle,
      cycleLabel: String(options?.cycleLabel || '').trim() || null,
    },
    groups: {},
  };

  await update(ref(db), updates);

  return {
    restarted: true,
    archiveId: archiveId || null,
    archivedCount,
    cycle: nextCycle,
  };
}

export async function createCollaborationGroup(scopeId, config = {}) {
  const user = _currentUser();
  const resolved = _scopeConfig(scopeId, config);
  const name = normalizeCollaborationGroupName(config?.name || '');

  if (!resolved.id) throw new Error('Missing group scope.');
  if (!user.uid) throw new Error('Sign in again before creating a group.');
  if (!name || name.length < 3) throw new Error('Enter a group name with at least 3 characters.');

  const meta = await ensureCollaborationScope(resolved.id, resolved);
  if (String(meta?.status || 'active') === 'archived') {
    throw new Error('This collaboration space has been archived.');
  }

  const groupsRef = ref(db, _scopeGroupsPath(resolved.id));
  const groupId = push(groupsRef).key;
  let blockedReason = '';

  const result = await runTransaction(groupsRef, (current) => {
    const groups = current && typeof current === 'object' ? current : {};
    if (findUserCollaborationGroupEntry(groups, user.uid)) {
      blockedReason = 'You are already in a group. Leave it before creating another.';
      return;
    }
    const duplicateName = Object.values(groups).some(
      (group) => normalizeCollaborationGroupName(group?.name || '').toLowerCase() === name.toLowerCase()
    );
    if (duplicateName) {
      blockedReason = 'That group name is already in use. Choose a different one.';
      return;
    }
    return {
      ...groups,
      [groupId]: {
        id: groupId,
        name,
        scopeId: resolved.id,
        scopeType: resolved.type,
        scopeLabel: resolved.label,
        sizeLimit: resolved.sizeLimit,
        createdAt: _nowMs(),
        updatedAt: _nowIso(),
        createdBy: user.uid,
        leaderUid: user.uid,
        managementLocked: false,
        managementLockedAt: null,
        managementLockedBy: null,
        chatRoomId: null,
        members: {
          [user.uid]: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            joinedAt: _nowMs(),
          },
        },
        artefacts: {},
      },
    };
  });

  if (!result.committed) {
    throw new Error(blockedReason || 'Could not create the group right now.');
  }

  await update(ref(db, _scopeMetaPath(resolved.id)), { updatedAt: _nowIso() });
  const group = result.snapshot?.child(groupId)?.val() || null;
  if (group) await _ensureGroupRoom(resolved.id, groupId, group);
  return { groupId, groupName: name };
}

export async function createManagedCollaborationGroup(scopeId, config = {}) {
  const actor = _currentUser();
  const resolved = _scopeConfig(scopeId, config);
  const name = normalizeCollaborationGroupName(config?.name || '');

  if (!resolved.id) throw new Error('Missing group scope.');
  if (!actor.uid) throw new Error('Sign in again before creating a group.');
  if (!_isStaff(actor.role)) throw new Error('Only staff can add groups from the dashboard.');
  if (!name || name.length < 3) throw new Error('Enter a group name with at least 3 characters.');

  const meta = await ensureCollaborationScope(resolved.id, resolved);
  if (String(meta?.status || 'active') === 'archived') {
    throw new Error('This collaboration space has been archived.');
  }

  const groupsRef = ref(db, _scopeGroupsPath(resolved.id));
  const groupId = push(groupsRef).key;
  let blockedReason = '';

  const result = await runTransaction(groupsRef, (current) => {
    const groups = current && typeof current === 'object' ? current : {};
    const duplicateName = Object.values(groups).some(
      (group) => normalizeCollaborationGroupName(group?.name || '').toLowerCase() === name.toLowerCase()
    );
    if (duplicateName) {
      blockedReason = 'That group name is already in use. Choose a different one.';
      return;
    }

    return {
      ...groups,
      [groupId]: {
        id: groupId,
        name,
        scopeId: resolved.id,
        scopeType: resolved.type,
        scopeLabel: resolved.label,
        sizeLimit: resolved.sizeLimit,
        createdAt: _nowMs(),
        updatedAt: _nowIso(),
        createdBy: actor.uid,
        leaderUid: '',
        managementLocked: false,
        managementLockedAt: null,
        managementLockedBy: null,
        chatRoomId: null,
        members: {},
        artefacts: {},
        seededByStaff: true,
      },
    };
  });

  if (!result.committed) {
    throw new Error(blockedReason || 'Could not add the group right now.');
  }

  await update(ref(db, _scopeMetaPath(resolved.id)), { updatedAt: _nowIso() });
  return { groupId, groupName: name };
}

export async function joinCollaborationGroup(scopeId, groupId, sizeLimit = 5, config = {}) {
  const user = _currentUser();
  const resolved = _scopeConfig(scopeId, { ...config, sizeLimit });
  if (!resolved.id || !groupId) throw new Error('Missing group details.');
  if (!user.uid) throw new Error('Sign in again before joining a group.');

  const meta = await ensureCollaborationScope(resolved.id, resolved);
  if (String(meta?.status || 'active') === 'archived') {
    throw new Error('This collaboration space has been archived.');
  }

  const groupsRef = ref(db, _scopeGroupsPath(resolved.id));
  let blockedReason = '';
  let nextGroup = null;
  let previousRoomId = '';

  const result = await runTransaction(groupsRef, (current) => {
    const groups = current && typeof current === 'object' ? current : {};
    const existingEntry = findUserCollaborationGroupEntry(groups, user.uid);
    if (existingEntry && existingEntry[0] !== groupId) {
      const [existingGroupId, existingGroup] = existingEntry;
      if (_isManagementLocked(existingGroup)) {
        blockedReason = 'Your current group is locked. Unlock it before leaving.';
        return;
      }
      const existingMembers = { ...(existingGroup?.members || {}) };
      previousRoomId = String(existingGroup?.chatRoomId || '');
      delete existingMembers[user.uid];

      if (!Object.keys(existingMembers).length) {
        delete groups[existingGroupId];
      } else {
        groups[existingGroupId] = {
          ...existingGroup,
          updatedAt: _nowIso(),
          leaderUid: existingGroup?.leaderUid === user.uid ? _pickNextLeaderUid(existingMembers) : String(existingGroup?.leaderUid || ''),
          members: existingMembers,
        };
      }
    }
    if (existingEntry && existingEntry[0] === groupId) {
      blockedReason = 'You are already in this group.';
      return;
    }

    const target = groups[groupId];
    if (!target) {
      blockedReason = 'That group no longer exists.';
      return;
    }
    if (_isManagementLocked(target)) {
      blockedReason = 'This group is locked. Ask the leader to unlock it before joining.';
      return;
    }

    const members = target.members && typeof target.members === 'object' ? target.members : {};
    const maxSize = _resolveSizeLimit(target, meta?.sizeLimit || resolved.sizeLimit || 5);
    if (Object.keys(members).length >= maxSize) {
      blockedReason = `This group already has ${maxSize} members.`;
      return;
    }

    nextGroup = {
      ...target,
      sizeLimit: maxSize,
      updatedAt: _nowIso(),
      leaderUid: String(target?.leaderUid || '').trim() || user.uid,
      managementLocked: Boolean(target?.managementLocked) || false,
      managementLockedAt: target?.managementLockedAt || null,
      managementLockedBy: target?.managementLockedBy || null,
      members: {
        ...members,
        [user.uid]: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          joinedAt: _nowMs(),
        },
      },
    };

    return {
      ...groups,
      [groupId]: nextGroup,
    };
  });

  if (!result.committed) {
    throw new Error(blockedReason || 'Could not join the group right now.');
  }

  await update(ref(db, _scopeMetaPath(resolved.id)), { updatedAt: _nowIso() });
  if (previousRoomId) await removeMemberFromRoom(previousRoomId, user.uid);
  const group = result.snapshot?.child(groupId)?.val() || nextGroup;
  if (group) await _ensureGroupRoom(resolved.id, groupId, group);
  return {
    groupId,
    groupName: normalizeCollaborationGroupName(group?.name || 'group'),
    movedFromAnotherGroup: Boolean(previousRoomId),
  };
}

export async function leaveCollaborationGroup(scopeId) {
  const user = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) throw new Error('Missing group scope.');
  if (!user.uid) throw new Error('Sign in again before changing groups.');
  await ensureCollaborationScope(safeScopeId, {});

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';
  let removedRoomId = '';

  const result = await runTransaction(groupsRef, (current) => {
    const groups = current && typeof current === 'object' ? current : {};
    const existingEntry = findUserCollaborationGroupEntry(groups, user.uid);
    if (!existingEntry) {
      blockedReason = 'You are not currently in a group.';
      return;
    }

    const [groupId, group] = existingEntry;
    if (_isManagementLocked(group)) {
      blockedReason = 'This group is locked. Unlock it before leaving.';
      return;
    }
    removedRoomId = String(group?.chatRoomId || '');
    const members = { ...(group?.members || {}) };
    delete members[user.uid];

    const nextGroups = { ...groups };
    if (!Object.keys(members).length) {
      delete nextGroups[groupId];
      return nextGroups;
    }

    const nextLeaderUid = group?.leaderUid === user.uid ? _pickNextLeaderUid(members) : String(group?.leaderUid || '');
    nextGroups[groupId] = {
      ...group,
      updatedAt: _nowIso(),
      leaderUid: nextLeaderUid,
      members,
    };
    return nextGroups;
  });

  if (!result.committed) {
    throw new Error(blockedReason || 'Could not leave the group right now.');
  }

  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  if (removedRoomId) await removeMemberFromRoom(removedRoomId, user.uid);
}

export async function removeCollaborationMember(scopeId, groupId, memberUid) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const targetUid = String(memberUid || '').trim();
  if (!safeScopeId || !groupId || !targetUid) throw new Error('Missing member details.');
  if (!actor.uid) throw new Error('Sign in again before editing group membership.');
  await ensureCollaborationScope(safeScopeId, {});

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';
  let removedRoomId = '';

  const result = await runTransaction(groupsRef, (current) => {
    const groups = current && typeof current === 'object' ? current : {};
    const group = groups[groupId];
    if (!group) {
      blockedReason = 'That group no longer exists.';
      return;
    }
    if (!group?.members?.[targetUid]) {
      blockedReason = 'That member is no longer in the group.';
      return;
    }
    if (_isManagementLocked(group) && !_isStaff(actor.role)) {
      blockedReason = 'This group is locked. Unlock it before changing membership.';
      return;
    }

    const actorIsLeader = String(group?.leaderUid || '') === actor.uid;
    if (!actorIsLeader && !_isStaff(actor.role)) {
      blockedReason = 'Only the group leader can edit membership.';
      return;
    }
    if (targetUid === group?.leaderUid) {
      blockedReason = 'Use leave group to change the leader.';
      return;
    }

    const members = { ...(group?.members || {}) };
    delete members[targetUid];
    removedRoomId = String(group?.chatRoomId || '');

    return {
      ...groups,
      [groupId]: {
        ...group,
        updatedAt: _nowIso(),
        members,
      },
    };
  });

  if (!result.committed) {
    throw new Error(blockedReason || 'Could not update group membership.');
  }

  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  if (removedRoomId) await removeMemberFromRoom(removedRoomId, targetUid);
}

export async function renameCollaborationGroup(scopeId, groupId, newName) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const safeGroupId = String(groupId || '').trim();
  const name = normalizeCollaborationGroupName(newName);
  if (!safeScopeId || !safeGroupId) throw new Error('Missing group details.');
  if (!actor.uid) throw new Error('Sign in again before renaming a group.');
  if (!name || name.length < 3) throw new Error('Enter a group name with at least 3 characters.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';

  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    if (current == null) return current;
    const groups = typeof current === 'object' ? current : {};
    const group = groups[safeGroupId];
    if (!group) { blockedReason = 'That group no longer exists.'; return; }
    if (_isManagementLocked(group) && !_isStaff(actor.role)) {
      blockedReason = 'This group is locked. Unlock it before renaming it.';
      return;
    }

    const actorIsLeader = String(group?.leaderUid || '') === actor.uid;
    if (!actorIsLeader && !_isStaff(actor.role)) {
      blockedReason = 'Only the group leader can rename the group.';
      return;
    }

    const duplicateName = Object.entries(groups).some(
      ([id, g]) => id !== safeGroupId && normalizeCollaborationGroupName(g?.name || '').toLowerCase() === name.toLowerCase()
    );
    if (duplicateName) { blockedReason = 'That group name is already in use.'; return; }

    return {
      ...groups,
      [safeGroupId]: { ...group, name, updatedAt: _nowIso() },
    };
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not rename the group right now.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  return { groupId: safeGroupId, groupName: name };
}

export async function transferCollaborationGroupLeader(scopeId, groupId, newLeaderUid) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const safeGroupId = String(groupId || '').trim();
  const targetUid = String(newLeaderUid || '').trim();
  if (!safeScopeId || !safeGroupId || !targetUid) throw new Error('Missing group details.');
  if (!actor.uid) throw new Error('Sign in again before changing the leader.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';

  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    if (current == null) return current;
    const groups = typeof current === 'object' ? current : {};
    const group = groups[safeGroupId];
    if (!group) { blockedReason = 'That group no longer exists.'; return; }
    if (_isManagementLocked(group) && !_isStaff(actor.role)) {
      blockedReason = 'This group is locked. Unlock it before changing the leader.';
      return;
    }

    const actorIsLeader = String(group?.leaderUid || '') === actor.uid;
    if (!actorIsLeader && !_isStaff(actor.role)) {
      blockedReason = 'Only the current leader can transfer leadership.';
      return;
    }
    if (!group?.members?.[targetUid]) {
      blockedReason = 'That person is not a member of this group.';
      return;
    }
    if (String(group?.leaderUid || '') === targetUid) {
      blockedReason = 'That person is already the leader.';
      return;
    }

    return {
      ...groups,
      [safeGroupId]: { ...group, leaderUid: targetUid, updatedAt: _nowIso() },
    };
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not change the leader right now.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  const newLeaderName = result.snapshot?.child(safeGroupId)?.child('members')?.child(targetUid)?.val()?.name || 'New leader';
  return { groupId: safeGroupId, newLeaderUid: targetUid, newLeaderName };
}

export async function setCollaborationGroupManagementLock(scopeId, groupId, locked = true) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const safeGroupId = String(groupId || '').trim();
  const nextLocked = Boolean(locked);
  if (!safeScopeId || !safeGroupId) throw new Error('Missing group details.');
  if (!actor.uid) throw new Error('Sign in again before updating the group lock.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';

  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    if (current == null) return current;
    const groups = typeof current === 'object' ? current : {};
    const group = groups[safeGroupId];
    if (!group) { blockedReason = 'That group no longer exists.'; return; }

    const actorIsLeader = String(group?.leaderUid || '') === actor.uid;
    if (!actorIsLeader && !_isStaff(actor.role)) {
      blockedReason = 'Only the group leader can change the lock state.';
      return;
    }
    if (Boolean(group?.managementLocked) === nextLocked) {
      return groups;
    }

    return {
      ...groups,
      [safeGroupId]: {
        ...group,
        managementLocked: nextLocked,
        managementLockedAt: nextLocked ? _nowIso() : null,
        managementLockedBy: nextLocked ? actor.uid : null,
        updatedAt: _nowIso(),
      },
    };
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not update the group lock right now.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  return { groupId: safeGroupId, locked: nextLocked };
}

export async function addMemberToCollaborationGroup(scopeId, groupId, member, sizeLimit = 5) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const safeGroupId = String(groupId || '').trim();
  const targetUid = String(member?.uid || '').trim();
  if (!safeScopeId || !safeGroupId || !targetUid) throw new Error('Missing details.');
  if (!actor.uid) throw new Error('Sign in again.');
  if (!_isStaff(actor.role)) throw new Error('Only staff can add students to groups.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';
  let previousRoomId = '';

  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    if (current == null) return current;
    const groups = typeof current === 'object' ? current : {};

    // Remove from any existing group first
    const existingEntry = findUserCollaborationGroupEntry(groups, targetUid);
    if (existingEntry) {
      const [existingId, existingGroup] = existingEntry;
      if (existingId === safeGroupId) { blockedReason = 'That student is already in this group.'; return; }
      previousRoomId = String(existingGroup?.chatRoomId || '');
      const existingMembers = { ...(existingGroup?.members || {}) };
      delete existingMembers[targetUid];
      if (!Object.keys(existingMembers).length) {
        delete groups[existingId];
      } else {
        groups[existingId] = {
          ...existingGroup,
          updatedAt: _nowIso(),
          leaderUid: existingGroup?.leaderUid === targetUid ? _pickNextLeaderUid(existingMembers) : existingGroup.leaderUid,
          members: existingMembers,
        };
      }
    }

    const target = groups[safeGroupId];
    if (!target) { blockedReason = 'That group no longer exists.'; return; }
    const maxSize = _resolveSizeLimit(target, sizeLimit);
    if (Object.keys(target?.members || {}).length >= maxSize) {
      blockedReason = `Group is full (${maxSize} members).`;
      return;
    }

    return {
      ...groups,
      [safeGroupId]: {
        ...target,
        updatedAt: _nowIso(),
        leaderUid: String(target?.leaderUid || '').trim() || targetUid,
        members: {
          ...(target.members || {}),
          [targetUid]: {
            uid: targetUid,
            name: String(member.name || member.displayName || '').trim() || 'Student',
            email: String(member.email || '').trim(),
            role: 'student',
            joinedAt: _nowMs(),
          },
        },
      },
    };
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not add the student.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  if (previousRoomId) await removeMemberFromRoom(previousRoomId, targetUid).catch(() => {});
  const group = result.snapshot?.child(safeGroupId)?.val();
  if (group?.chatRoomId) await addMemberToRoom(group.chatRoomId, targetUid).catch(() => {});
  return { groupId: safeGroupId, movedFromExisting: Boolean(previousRoomId) };
}

export async function deleteCollaborationGroup(scopeId, groupId) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const safeGroupId = String(groupId || '').trim();
  if (!safeScopeId || !safeGroupId) throw new Error('Missing group details.');
  if (!actor.uid) throw new Error('Sign in again.');
  if (!_isStaff(actor.role)) throw new Error('Only staff can delete groups.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';
  let removedRoomId = '';
  let removedMemberUids = [];

  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    if (current == null) return current;
    const groups = typeof current === 'object' ? current : {};
    const group = groups[safeGroupId];
    if (!group) { blockedReason = 'That group no longer exists.'; return; }
    removedRoomId = String(group?.chatRoomId || '');
    removedMemberUids = Object.keys(group?.members || {});
    const next = { ...groups };
    delete next[safeGroupId];
    return next;
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not delete the group.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  if (removedRoomId) {
    for (const uid of removedMemberUids) {
      await removeMemberFromRoom(removedRoomId, uid).catch(() => {});
    }
  }
}

export async function moveCollaborationMember(scopeId, fromGroupId, toGroupId, memberUid, sizeLimit = 5) {
  const actor = _currentUser();
  const safeScopeId = String(scopeId || '').trim();
  const targetUid = String(memberUid || '').trim();
  if (!safeScopeId || !fromGroupId || !toGroupId || !targetUid) throw new Error('Missing details.');
  if (!actor.uid) throw new Error('Sign in again.');
  if (!_isStaff(actor.role)) throw new Error('Only staff can move students between groups.');
  if (fromGroupId === toGroupId) throw new Error('Source and destination groups are the same.');

  const groupsRef = ref(db, _scopeGroupsPath(safeScopeId));
  let blockedReason = '';
  let removedRoomId = '';
  let addedRoomId = '';

  // Pre-fetch to warm the local cache so the transaction doesn't start with null
  await get(groupsRef);

  const result = await runTransaction(groupsRef, (current) => {
    // RTDB transactions may fire with null on the first pass — skip and let it retry with real data
    if (current == null) return current;

    const groups = typeof current === 'object' ? current : {};
    const from = groups[fromGroupId];
    const to = groups[toGroupId];
    if (!from) { blockedReason = 'Source group no longer exists.'; return; }
    if (!to) { blockedReason = 'Destination group no longer exists.'; return; }
    if (!from?.members?.[targetUid]) { blockedReason = 'That student is not in the source group.'; return; }
    const maxSize = _resolveSizeLimit(to, sizeLimit);
    if (Object.keys(to?.members || {}).length >= maxSize) {
      blockedReason = `Destination group is full (${maxSize} members).`;
      return;
    }

    const member = from.members[targetUid];
    const fromMembers = { ...(from.members || {}) };
    delete fromMembers[targetUid];
    removedRoomId = String(from?.chatRoomId || '');
    addedRoomId = String(to?.chatRoomId || '');

    const nextGroups = { ...groups };

    // Update source group (or delete if empty)
    if (!Object.keys(fromMembers).length) {
      delete nextGroups[fromGroupId];
    } else {
      const nextLeader = from.leaderUid === targetUid ? _pickNextLeaderUid(fromMembers) : from.leaderUid;
      nextGroups[fromGroupId] = { ...from, members: fromMembers, leaderUid: nextLeader, updatedAt: _nowIso() };
    }

    // Add to destination
    const toMembers = { ...(to.members || {}), [targetUid]: { ...member, joinedAt: _nowMs() } };
    nextGroups[toGroupId] = { ...to, members: toMembers, updatedAt: _nowIso() };

    return nextGroups;
  });

  if (!result.committed) throw new Error(blockedReason || 'Could not move the student.');
  await update(ref(db, _scopeMetaPath(safeScopeId)), { updatedAt: _nowIso() });
  if (removedRoomId) await removeMemberFromRoom(removedRoomId, targetUid).catch(() => {});
  if (addedRoomId) await addMemberToRoom(addedRoomId, targetUid).catch(() => {});
}

async function _assertMembership(scopeId, groupId, userUid) {
  const scope = await getCollaborationScope(scopeId);
  if (String(scope.meta?.status || 'active') === 'archived') {
    throw new Error('This collaboration space has been archived.');
  }
  const group = scope.groups?.[groupId] || null;
  if (!group?.members?.[userUid]) throw new Error('Join the group before sharing artefacts.');
  return group;
}

export async function uploadCollaborationArtefact(scopeId, groupId, file, opts = {}) {
  const user = _currentUser();
  if (!user.uid) throw new Error('Sign in again before sharing artefacts.');
  if (!file) throw new Error('Choose a file first.');

  const group = await _assertMembership(scopeId, groupId, user.uid);
  const asset = await uploadGalleryAsset(file, user.uid, opts);
  if (!asset) throw new Error('Upload failed. Check your connection or file size.');

  const artefactRef = push(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}/artefacts`));
  const artefact = {
    id: artefactRef.key,
    kind: 'file',
    caption: String(opts?.caption || '').trim(),
    ...asset,
    createdAt: _nowIso(),
    createdBy: user.uid,
    createdByName: user.name,
  };
  await set(artefactRef, artefact);
  await update(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}`), { updatedAt: _nowIso() });
  await update(ref(db, _scopeMetaPath(scopeId)), { updatedAt: _nowIso() });

  if (group?.chatRoomId) {
    await sendAssetMessage(group.chatRoomId, artefact, artefact.caption || `Shared ${artefact.name || 'a file'}`);
  }

  return artefact;
}

export async function addCollaborationLinkArtefact(scopeId, groupId, payload = {}) {
  const user = _currentUser();
  if (!user.uid) throw new Error('Sign in again before sharing artefacts.');
  const url = String(payload?.url || '').trim();
  const name = normalizeCollaborationGroupName(payload?.name || '');
  if (!url) throw new Error('Paste a link first.');

  const group = await _assertMembership(scopeId, groupId, user.uid);
  const artefactRef = push(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}/artefacts`));
  const artefact = {
    id: artefactRef.key,
    kind: 'link',
    name: name || 'Shared link',
    caption: String(payload?.caption || '').trim(),
    url,
    type: 'link',
    createdAt: _nowIso(),
    createdBy: user.uid,
    createdByName: user.name,
  };
  await set(artefactRef, artefact);
  await update(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}`), { updatedAt: _nowIso() });
  await update(ref(db, _scopeMetaPath(scopeId)), { updatedAt: _nowIso() });

  if (group?.chatRoomId) {
    await sendAssetMessage(group.chatRoomId, artefact, artefact.caption || `Shared ${artefact.name}`);
  }

  return artefact;
}

export async function saveCollaborationWorkspaceSection(scopeId, groupId, sectionId, text = '') {
  const user = _currentUser();
  const safeSectionId = String(sectionId || '').trim();
  if (!user.uid) throw new Error('Sign in again before saving the group workspace.');
  if (!safeSectionId) throw new Error('Missing workspace section.');

  await _assertMembership(scopeId, groupId, user.uid);
  const payload = {
    text: String(text || ''),
    updatedAt: _nowIso(),
    updatedBy: user.uid,
    updatedByName: user.name,
  };
  await update(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}/workspace/sections`), {
    [safeSectionId]: payload,
  });
  await update(ref(db, `${_scopeGroupsPath(scopeId)}/${groupId}`), { updatedAt: _nowIso() });
  await update(ref(db, _scopeMetaPath(scopeId)), { updatedAt: _nowIso() });
  return payload;
}

export async function getArchivedCollaborationScope(scopeId) {
  const snap = await get(ref(db, `collaboration-groups/archive/scopes/${String(scopeId || '').trim()}/versions`));
  return snap.exists() ? (snap.val() || {}) : {};
}

export function summarizeCollaborationGroups(groups = {}) {
  const entries = Object.values(groups || {});
  return {
    groupCount: entries.length,
    memberCount: entries.reduce((sum, group) => sum + Object.keys(group?.members || {}).length, 0),
    artefactCount: entries.reduce((sum, group) => sum + Object.keys(group?.artefacts || {}).length, 0),
  };
}

export function getOldestCollaborationGroup(groups = {}) {
  return _sortGroupsByCreatedAt(groups)[0] || null;
}

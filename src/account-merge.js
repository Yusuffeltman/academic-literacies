// src/account-merge.js
// Merge rules for consolidating two duplicate student accounts into one.
//
// Pure planning logic with no I/O, so the lecturer dashboard (Firebase SDK) and
// scripts/merge-student-accounts.mjs (Firebase CLI) share one set of rules.
// Callers pass an async `read(path)` and get back a multi-path patch object
// suitable for a single atomic update() — nulls delete, so the copies and the
// removals land together or not at all.

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const keys = (v) => (isObj(v) ? Object.keys(v) : []);

// Union two maps of records. Keeper wins ties; object values merge field by
// field so a unit visited on one account and completed on the other keeps both.
export function unionRecords(keeperMap, loserMap) {
  const out = { ...(isObj(keeperMap) ? keeperMap : {}) };
  for (const key of keys(loserMap)) {
    const mine = out[key];
    const theirs = loserMap[key];
    if (mine === undefined) out[key] = theirs;
    else if (isObj(mine) && isObj(theirs)) out[key] = mergeFlags(mine, theirs);
  }
  return out;
}

// Truthy-wins for booleans, max for numbers, latest for ISO strings.
export function mergeFlags(a, b) {
  const out = { ...a };
  for (const key of keys(b)) {
    const mine = out[key];
    const theirs = b[key];
    if (mine === undefined || mine === null) out[key] = theirs;
    else if (typeof mine === 'boolean' || typeof theirs === 'boolean') out[key] = Boolean(mine) || Boolean(theirs);
    else if (typeof mine === 'number' && typeof theirs === 'number') out[key] = Math.max(mine, theirs);
    else if (isObj(mine) && isObj(theirs)) out[key] = mergeFlags(mine, theirs);
    else if (typeof mine === 'string' && typeof theirs === 'string') out[key] = theirs > mine ? theirs : mine;
  }
  return out;
}

export function unionArrays(a, b) {
  const seen = new Set();
  const out = [];
  for (const item of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const sig = JSON.stringify(item);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(item);
  }
  return out;
}

function mergeNotebook(a, b) {
  if (!isObj(a) && !isObj(b)) return undefined;
  const keeper = isObj(a) ? a : {};
  const loser = isObj(b) ? b : {};
  return {
    ...keeper,
    entries: unionRecords(keeper.entries, loser.entries),
    archivedUnits: unionRecords(keeper.archivedUnits, loser.archivedUnits),
    analytics: { ...(loser.analytics || {}), ...(keeper.analytics || {}) },
    lastUnitId: keeper.lastUnitId ?? loser.lastUnitId ?? null,
    lastSessionId: keeper.lastSessionId ?? loser.lastSessionId ?? null,
  };
}

function sumUsage(a, b) {
  const out = {};
  for (const f of ['promptTokens', 'candidateTokens', 'totalTokens', 'requests']) {
    out[f] = Number(a?.[f] || 0) + Number(b?.[f] || 0);
  }
  return out;
}

// state.js swaps whole sub-objects rather than merging fields, and
// _preferLocalSnapshot keeps a device's cached copy when its revision is higher.
// Bumping past both accounts and stamping updatedAt to now makes the merged
// server copy win on the student's next sync.
export function mergeState(keeperState, loserState, { loserUid = '', nowIso = new Date().toISOString() } = {}) {
  const k = isObj(keeperState) ? keeperState : {};
  const l = isObj(loserState) ? loserState : {};
  const revision = Math.max(Number(k.__meta?.revision || 0), Number(l.__meta?.revision || 0)) + 1;

  const merged = {
    ...l,
    ...k,
    progress: unionRecords(k.progress, l.progress),
    tutorChats: unionRecords(k.tutorChats, l.tutorChats),
    assessments: unionRecords(k.assessments, l.assessments),
    attendance: { byDate: unionRecords(k.attendance?.byDate, l.attendance?.byDate) },
    erProgress: {
      ...(l.erProgress || {}),
      ...(k.erProgress || {}),
      extraMarks: Math.max(Number(k.erProgress?.extraMarks || 0), Number(l.erProgress?.extraMarks || 0)),
      completedReadings: unionArrays(k.erProgress?.completedReadings, l.erProgress?.completedReadings),
    },
    aiUsage: sumUsage(k.aiUsage, l.aiUsage),
    escalations: unionArrays(k.escalations, l.escalations),
    adaptive: k.adaptive || l.adaptive || null,
    deviceInfo: k.deviceInfo || l.deviceInfo || null,
    experiment: k.experiment || l.experiment || null,
    chat: { offlineQueue: [] },
    __meta: {
      ...(k.__meta || {}),
      revision,
      syncState: 'synced',
      updatedAt: nowIso,
      lastSyncAt: nowIso,
      mergedFromUid: loserUid || null,
      mergedAt: nowIso,
    },
  };

  const tutorial = mergeNotebook(k.tutorialNotebook, l.tutorialNotebook);
  if (tutorial) merged.tutorialNotebook = tutorial;
  const contact = mergeNotebook(k.contactNotebook, l.contactNotebook);
  if (contact) merged.contactNotebook = contact;

  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }
  return merged;
}

// Profile fields worth pulling across when the keeper is missing them.
const BACKFILL_FIELDS = [
  'personalEmail', 'firstName', 'lastName', 'surname', 'initials',
  'studentId', 'studentNumber', 'studentNo', 'tutorialGroup',
];

/**
 * Build the merge plan.
 *
 * @param {object}   options
 * @param {string}   options.keeperUid  account that survives
 * @param {string}   options.loserUid   account folded into the keeper
 * @param {function} options.read       async (path) => value | null
 * @param {function} [options.listKeys] async (path) => child names. Defaults to
 *   read, but callers with a cheap shallow listing should pass one: the only
 *   use is enumerating assessment ids, and reading those nodes in full pulls
 *   tens of megabytes of submissions and grading records for nothing.
 * @param {string}   [options.nowIso]
 * @returns {Promise<{patch: object, moves: object[], warnings: string[], mergeId: string, keeper: object, loser: object}>}
 */
export async function buildMergePlan({ keeperUid, loserUid, read, listKeys, nowIso = new Date().toISOString() }) {
  if (!keeperUid || !loserUid) throw new Error('Both keeperUid and loserUid are required.');
  if (keeperUid === loserUid) throw new Error('Cannot merge an account into itself.');

  const mergeId = `${loserUid}-${Date.now()}`;
  const patch = {};
  const reversePatch = {};
  const moves = [];
  const warnings = [];

  // Every write records what was there first, so the audit record carries an
  // exact inverse. Without this a revert would restore profiles but silently
  // leave moved submissions on the keeper.
  const setPatch = async (dbPath, value) => {
    if (!(dbPath in reversePatch)) {
      const before = await read(dbPath);
      reversePatch[dbPath] = before === undefined ? null : before;
    }
    patch[dbPath] = value;
  };
  const move = async (fromPath, toPath, value, label) => {
    await setPatch(toPath, value);
    await setPatch(fromPath, null);
    moves.push({ label, from: fromPath, to: toPath });
  };
  const drop = async (fromPath, label) => {
    await setPatch(fromPath, null);
    moves.push({ label, from: fromPath, to: '—' });
  };

  const keeperUser = (await read(`users/${keeperUid}`)) || {};
  const loserUser = (await read(`users/${loserUid}`)) || {};
  if (!keeperUser.profile) throw new Error(`Keeper ${keeperUid} has no profile.`);
  if (!loserUser.profile) throw new Error(`Loser ${loserUid} has no profile.`);

  // 1. Submissions, grading records and exceptions, per assessment.
  const list = typeof listKeys === 'function'
    ? async (path) => (await listKeys(path)) || []
    : async (path) => keys(await read(path));
  const assessmentIds = new Set([
    ...await list('submissions'),
    ...await list('grading-records'),
    ...await list('submission-exceptions'),
  ]);

  for (const aid of assessmentIds) {
    const subs = await read(`submissions/${aid}/${loserUid}`);
    const keeperSubs = keys(subs).length ? await read(`submissions/${aid}/${keeperUid}`) : null;
    for (const subId of keys(subs)) {
      // uid is stored inside the record as well as being the path key.
      await move(
        `submissions/${aid}/${loserUid}/${subId}`,
        `submissions/${aid}/${keeperUid}/${subId}`,
        { ...subs[subId], uid: keeperUid, mergedFromUid: loserUid, mergedAt: nowIso },
        `submission ${aid}`
      );
      if (keys(keeperSubs).length) {
        warnings.push(`Both accounts submitted ${aid}; the keeper ends up holding both versions. Confirm which one should be marked.`);
      }
    }

    const grading = await read(`grading-records/${aid}/${loserUid}`);
    for (const subId of keys(grading)) {
      const record = grading[subId];
      await move(
        `grading-records/${aid}/${loserUid}/${subId}`,
        `grading-records/${aid}/${keeperUid}/${subId}`,
        {
          ...record,
          studentUid: keeperUid,
          tutorialGroup: record.tutorialGroup || keeperUser.profile?.tutorialGroup || null,
          mergedFromUid: loserUid,
          mergedAt: nowIso,
        },
        `grading record ${aid} (${record.status || 'unknown'})`
      );
      if (String(record.status || '') === 'posted') {
        warnings.push(`The ${aid} grading record is already posted (feedback released). The mark moves with it, but re-check the student's feedback view afterwards.`);
      }
    }

    const exception = await read(`submission-exceptions/${aid}/${loserUid}`);
    if (exception) {
      await move(`submission-exceptions/${aid}/${loserUid}`, `submission-exceptions/${aid}/${keeperUid}`, exception, `submission exception ${aid}`);
    }
  }

  // 2. Per-uid submission collections. Both sides can hold an entry for the
  // same assessment, so these must be combined rather than moved on top of one
  // another — a blind move would drop the keeper's own latestId and version
  // count for that assessment.
  const loserIndex = await read(`submission-index/${loserUid}`);
  for (const aid of keys(loserIndex)) {
    const theirs = loserIndex[aid] || {};
    const mine = (await read(`submission-index/${keeperUid}/${aid}`)) || null;
    let value = theirs;
    let label = `submission index ${aid}`;
    if (mine) {
      // Keep whichever submission is genuinely latest, and count both sets.
      const newer = String(theirs.latestAt || '') > String(mine.latestAt || '') ? theirs : mine;
      value = {
        ...mine,
        ...newer,
        totalVersions: Number(mine.totalVersions || 0) + Number(theirs.totalVersions || 0),
      };
      label = `submission index ${aid} (combined, ${value.totalVersions} versions)`;
    }
    await move(`submission-index/${loserUid}/${aid}`, `submission-index/${keeperUid}/${aid}`, value, label);
  }

  const loserDrafts = await read(`submission-drafts/${loserUid}`);
  for (const aid of keys(loserDrafts)) {
    const mine = await read(`submission-drafts/${keeperUid}/${aid}`);
    if (mine) {
      // Two unsubmitted drafts for one assessment: keep the keeper's rather
      // than silently replacing it with older text.
      await drop(`submission-drafts/${loserUid}/${aid}`, `submission draft ${aid} (keeper's kept, duplicate dropped)`);
      continue;
    }
    await move(`submission-drafts/${loserUid}/${aid}`, `submission-drafts/${keeperUid}/${aid}`, loserDrafts[aid], `submission draft ${aid}`);
  }

  // 3. Attendance — uid sits one level below a day or session key.
  for (const [node, label] of [['attendance/checkins', 'attendance'], ['attendance/session-checkins', 'session check-in']]) {
    const buckets = (await read(node)) || {};
    for (const bucket of keys(buckets)) {
      const entry = buckets[bucket]?.[loserUid];
      if (entry === undefined) continue;
      if (buckets[bucket]?.[keeperUid] !== undefined) {
        await drop(`${node}/${bucket}/${loserUid}`, `${label} ${bucket} (already on keeper, duplicate dropped)`);
        continue;
      }
      await move(`${node}/${bucket}/${loserUid}`, `${node}/${bucket}/${keeperUid}`, entry, `${label} ${bucket}`);
    }
  }

  // 4. Chat rooms — membership is mirrored in two places.
  const userRooms = await read(`chat/user-rooms/${loserUid}`);
  for (const roomId of keys(userRooms)) {
    await move(`chat/user-rooms/${loserUid}/${roomId}`, `chat/user-rooms/${keeperUid}/${roomId}`, userRooms[roomId], `chat room ${roomId}`);
    const membership = await read(`chat/members/${roomId}/${loserUid}`);
    if (membership !== null && membership !== undefined) {
      await move(`chat/members/${roomId}/${loserUid}`, `chat/members/${roomId}/${keeperUid}`, membership, `chat membership ${roomId}`);
    }
  }

  // Presence and typing indicators are ephemeral — drop rather than move.
  for (const p of [`presence/live/${loserUid}`, `chat/live-status/${loserUid}`]) {
    const value = await read(p);
    if (value !== null && value !== undefined) drop(p, 'ephemeral presence (dropped)');
  }

  // 5. Collaboration groups — membership plus leader / creator references.
  const scopes = (await read('collaboration-groups/scopes')) || {};
  for (const scopeId of keys(scopes)) {
    const groups = scopes[scopeId]?.groups || {};
    for (const groupId of keys(groups)) {
      const group = groups[groupId];
      const base = `collaboration-groups/scopes/${scopeId}/groups/${groupId}`;
      const name = group?.name || groupId;
      if (group?.members && group.members[loserUid] !== undefined) {
        if (group.members[keeperUid] !== undefined) {
          await drop(`${base}/members/${loserUid}`, `group "${name}" (already a member, duplicate dropped)`);
        } else {
          // The member record embeds the uid and a display identity as well as
          // being keyed by uid, so rewrite all three. Name matches the
          // convention in collaboration-groups.js: displayName without its
          // " [role]" suffix.
          const member = group.members[loserUid] || {};
          await move(
            `${base}/members/${loserUid}`,
            `${base}/members/${keeperUid}`,
            {
              ...member,
              uid: keeperUid,
              name: String(keeperUser.profile?.displayName || '').split(' [')[0].trim() || member.name || 'Student',
              email: keeperUser.profile?.authEmail || member.email || '',
            },
            `group "${name}" membership`
          );
        }
      }
      if (group?.createdBy === loserUid) {
        await setPatch(`${base}/createdBy`, keeperUid);
        moves.push({ label: `group "${name}" createdBy`, from: `${base}/createdBy`, to: `${base}/createdBy` });
      }
      if (group?.leaderUid === loserUid) {
        await setPatch(`${base}/leaderUid`, keeperUid);
        moves.push({ label: `group "${name}" leaderUid`, from: `${base}/leaderUid`, to: `${base}/leaderUid` });
      }
    }
  }

  // 6. Lecturer-side analytics keyed by student uid.
  for (const [node, label] of [
    ['analytics/student-support-modes', 'support mode'],
    ['analytics/heutagogy-moderation', 'heutagogy moderation'],
  ]) {
    const entry = await read(`${node}/${loserUid}`);
    if (entry !== null && entry !== undefined) {
      await move(`${node}/${loserUid}`, `${node}/${keeperUid}`, entry, label);
    }
  }

  // 7. Learner state.
  await setPatch(`users/${keeperUid}/state`, mergeState(keeperUser.state, loserUser.state, { loserUid, nowIso }));
  moves.push({ label: 'learner state (merged)', from: `users/${loserUid}/state`, to: `users/${keeperUid}/state` });

  // 8. Profiles — backfill what the keeper lacks, then tombstone the loser.
  for (const field of BACKFILL_FIELDS) {
    const mine = String(keeperUser.profile?.[field] || '').trim();
    const theirs = String(loserUser.profile?.[field] || '').trim();
    if (!mine && theirs) {
      await setPatch(`users/${keeperUid}/profile/${field}`, theirs);
      moves.push({ label: `profile backfill ${field}="${theirs}"`, from: `users/${loserUid}/profile/${field}`, to: `users/${keeperUid}/profile/${field}` });
    }
  }
  await setPatch(`users/${keeperUid}/profile/updatedAt`, nowIso);
  await setPatch(`users/${keeperUid}/profile/mergedFromUids/${loserUid}`, nowIso);

  // Disabled rather than deleted, so a stray sign-in lands on a dead account
  // instead of silently bootstrapping a fresh one.
  await setPatch(`users/${loserUid}/state`, null);
  await setPatch(`users/${loserUid}/profile/disabled`, true);
  await setPatch(`users/${loserUid}/profile/role`, 'merged');
  await setPatch(`users/${loserUid}/profile/mergedIntoUid`, keeperUid);
  await setPatch(`users/${loserUid}/profile/mergedAt`, nowIso);
  await setPatch(`users/${loserUid}/profile/updatedAt`, nowIso);
  moves.push({ label: 'loser profile disabled + tombstoned', from: `users/${loserUid}/profile`, to: '—' });

  if (loserUser.profile?.authEmail && loserUser.profile.authEmail !== keeperUser.profile?.authEmail) {
    warnings.push(
      `The student has been signing in as ${loserUser.profile.authEmail}. After the merge only ${keeperUser.profile?.authEmail} reaches their work, because verifyOtp resolves the uid by email.`
    );
  }
  warnings.push('If the student has unsynced offline work on a device, state.js keeps the local copy regardless of revision. Ask them to sign out and back in.');
  warnings.push('Historical analytics/events stay under the old uid; they are append-only logs and are canonicalised by student number, not uid.');

  const dedupedWarnings = [...new Set(warnings)];

  // 9. Audit record carrying the exact inverse, so a revert restores every
  // touched path rather than only the two profiles. Written directly: it is the
  // record of the merge, so it is not itself part of what a revert undoes.
  //
  // The inverse is stored as a JSON string, not an object: its keys are
  // database paths, and only the top-level keys of a multi-path update are
  // treated as paths. Nested keys are literal child names, where "/" is
  // illegal and makes the whole write fail.
  patch[`account-merges/${mergeId}`] = {
    mergeId,
    keeperUid,
    loserUid,
    mergedAt: nowIso,
    movedPaths: moves.map((m) => m.from),
    warnings: dedupedWarnings,
    reversePatchJson: JSON.stringify(reversePatch),
  };

  return {
    mergeId,
    patch,
    reversePatch,
    moves,
    warnings: dedupedWarnings,
    keeper: { uid: keeperUid, profile: keeperUser.profile },
    loser: { uid: loserUid, profile: loserUser.profile },
  };
}

// Merge-rule tests for src/account-merge.js.
// Run with: node --test src/__tests__/account-merge.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMergePlan, mergeState, unionRecords } from '../account-merge.js';

const KEEPER = 'keeper-uid';
const LOSER = 'loser-uid';

// Minimal fixture shaped like the real database: the keeper holds a posted a1,
// the loser holds an unmarked a2 plus attendance, mirroring the case this tool
// was written for.
function makeDb() {
  return {
    users: {
      [KEEPER]: {
        profile: { uid: KEEPER, role: 'student', authEmail: 'keeper@x.com', studentNumber: '226155495', tutorialGroup: 'K' },
        state: { progress: { u1: { visited: true }, u2: { visited: true } }, aiUsage: { requests: 10, totalTokens: 100 }, __meta: { revision: 7 } },
      },
      [LOSER]: {
        profile: { uid: LOSER, role: 'student', authEmail: 'loser@x.com', personalEmail: 'personal@x.com' },
        state: { progress: { u2: { readingComplete: true }, u3: { visited: true } }, attendance: { byDate: { '2026-07-23': { present: true } } }, aiUsage: { requests: 5, totalTokens: 50 }, __meta: { revision: 1 } },
      },
    },
    submissions: {
      a1: { [KEEPER]: { s1: { uid: KEEPER, status: 'posted' } } },
      a2: { [LOSER]: { s2: { uid: LOSER, status: 'submitted' } } },
    },
    'grading-records': {
      a2: { [LOSER]: { s2: { studentUid: LOSER, status: 'ai_ready' } } },
    },
    'submission-index': { [LOSER]: { a2: { assessmentId: 'a2' } } },
    'attendance/checkins': { '2026-07-23': { [LOSER]: { t: 1 } } },
    'chat/user-rooms': { [LOSER]: { room1: true } },
    'chat/members': { room1: { [LOSER]: { joinedAt: 1 } } },
    'collaboration-groups/scopes': {
      'assessment-a2': { groups: { g1: { name: 'Group One', members: { [LOSER]: { joinedAt: 1 } }, leaderUid: LOSER } } },
    },
  };
}

// Resolve a slash path against the fixture, honouring the flattened keys above.
function makeRead(db) {
  return async (path) => {
    if (path in db) return db[path];
    const parts = path.split('/');
    for (let i = parts.length - 1; i > 0; i -= 1) {
      const head = parts.slice(0, i).join('/');
      if (head in db) {
        let node = db[head];
        for (const key of parts.slice(i)) {
          if (node === null || node === undefined) return null;
          node = node[key];
        }
        return node === undefined ? null : node;
      }
    }
    return null;
  };
}

// Apply a multi-path patch to a plain object, treating null as a delete.
function applyPatch(db, patch) {
  const out = JSON.parse(JSON.stringify(db));
  for (const [path, value] of Object.entries(patch)) {
    if (path.startsWith('account-merges/')) continue;
    let container = out;
    let parts = path.split('/');
    for (let i = parts.length - 1; i > 0; i -= 1) {
      const head = parts.slice(0, i).join('/');
      if (head in out) {
        container = out[head];
        parts = parts.slice(i);
        break;
      }
      if (i === 1) { container = out; }
    }
    let node = container;
    for (const key of parts.slice(0, -1)) {
      if (!node[key] || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    const last = parts[parts.length - 1];
    if (value === null) delete node[last];
    else node[last] = value;
  }
  return out;
}

test('progress from both accounts survives the merge', () => {
  const merged = mergeState(
    { progress: { u1: { visited: true }, u2: { visited: true } }, __meta: { revision: 7 } },
    { progress: { u2: { readingComplete: true }, u3: { visited: true } }, __meta: { revision: 1 } },
    { loserUid: LOSER }
  );
  assert.deepEqual(Object.keys(merged.progress).sort(), ['u1', 'u2', 'u3']);
  // u2 was visited on one account and completed on the other: keep both facts.
  assert.equal(merged.progress.u2.visited, true);
  assert.equal(merged.progress.u2.readingComplete, true);
});

test('revision is bumped past both accounts so the server copy wins on next sync', () => {
  const merged = mergeState({ __meta: { revision: 7 } }, { __meta: { revision: 12 } }, { loserUid: LOSER });
  assert.equal(merged.__meta.revision, 13);
  assert.equal(merged.__meta.syncState, 'synced');
});

test('unionRecords never drops a keeper value', () => {
  const out = unionRecords({ a: 1 }, { a: 99, b: 2 });
  assert.equal(out.a, 1);
  assert.equal(out.b, 2);
});

test('plan moves the loser work and rewrites embedded uids', async () => {
  const db = makeDb();
  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(db) });

  // Submission and grading record land on the keeper with uid fields rewritten.
  assert.equal(plan.patch[`submissions/a2/${KEEPER}/s2`].uid, KEEPER);
  assert.equal(plan.patch[`submissions/a2/${LOSER}/s2`], null);
  assert.equal(plan.patch[`grading-records/a2/${KEEPER}/s2`].studentUid, KEEPER);
  // tutorialGroup is backfilled from the keeper profile.
  assert.equal(plan.patch[`grading-records/a2/${KEEPER}/s2`].tutorialGroup, 'K');

  // Group leadership is remapped, not left dangling on a disabled account.
  assert.equal(plan.patch['collaboration-groups/scopes/assessment-a2/groups/g1/leaderUid'], KEEPER);

  // The member record embeds the uid too, so it must be rewritten, not just rekeyed.
  const movedMember = plan.patch[`collaboration-groups/scopes/assessment-a2/groups/g1/members/${KEEPER}`];
  assert.equal(movedMember.uid, KEEPER);
  assert.equal(movedMember.email, 'keeper@x.com');

  // The keeper's own posted a1 is never touched.
  assert.ok(!Object.keys(plan.patch).some((k) => k.startsWith(`submissions/a1/${KEEPER}`)));

  // Loser is disabled, not deleted.
  assert.equal(plan.patch[`users/${LOSER}/profile/disabled`], true);
  assert.equal(plan.patch[`users/${LOSER}/profile/mergedIntoUid`], KEEPER);

  // Missing profile fields are backfilled from the loser.
  assert.equal(plan.patch[`users/${KEEPER}/profile/personalEmail`], 'personal@x.com');
});

test('reverse patch restores every touched path, including moved submissions', async () => {
  const db = makeDb();
  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(db) });

  const afterMerge = applyPatch(db, plan.patch);
  const afterRevert = applyPatch(afterMerge, plan.reversePatch);

  // The moved submission is back on the loser and gone from the keeper.
  // RTDB prunes empty parents, so an empty object here means absent.
  assert.deepEqual(afterRevert.submissions.a2[LOSER].s2, db.submissions.a2[LOSER].s2);
  assert.deepEqual(afterRevert.submissions.a2[KEEPER] ?? {}, {});

  // Profiles and state are restored.
  assert.deepEqual(afterRevert.users[KEEPER].state, db.users[KEEPER].state);
  assert.equal(afterRevert.users[LOSER].profile.disabled, undefined);
  assert.equal(afterRevert.users[LOSER].profile.role, 'student');

  // Group leadership is handed back.
  assert.equal(afterRevert['collaboration-groups/scopes']['assessment-a2'].groups.g1.leaderUid, LOSER);
});

test('a colliding submission index is combined, not overwritten', async () => {
  const db = makeDb();
  // Both accounts submitted a1: the keeper already has an index entry.
  db.submissions.a1[LOSER] = { s9: { uid: LOSER, status: 'posted' } };
  db['submission-index'][KEEPER] = { a1: { assessmentId: 'a1', latestId: 's1', latestAt: '2026-04-01T00:00:00Z', totalVersions: 2 } };
  db['submission-index'][LOSER].a1 = { assessmentId: 'a1', latestId: 's9', latestAt: '2026-05-01T00:00:00Z', totalVersions: 1 };

  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(db) });
  const merged = plan.patch[`submission-index/${KEEPER}/a1`];

  // Neither side's history is lost.
  assert.equal(merged.totalVersions, 3);
  // The genuinely later submission is the one reported as latest.
  assert.equal(merged.latestId, 's9');
});

test('a colliding draft keeps the keeper copy', async () => {
  const db = makeDb();
  db['submission-drafts'] = { [KEEPER]: { a1: { text: 'keeper draft' } }, [LOSER]: { a1: { text: 'loser draft' } } };
  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(db) });
  assert.equal(plan.patch[`submission-drafts/${KEEPER}/a1`], undefined);
  assert.equal(plan.patch[`submission-drafts/${LOSER}/a1`], null);
});

test('patch values contain no keys that RTDB rejects', async () => {
  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(makeDb()) });

  // Only the top-level keys of a multi-path update are paths. Nested keys are
  // literal child names, and RTDB rejects the whole write if one contains
  // . # $ [ ] or / — which is what storing the inverse patch as an object did.
  const illegal = /[.#$[\]/]/;
  const walk = (node, trail) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${trail}[${i}]`));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      assert.ok(!illegal.test(key), `illegal RTDB key "${key}" at ${trail}`);
      walk(value, `${trail}/${key}`);
    }
  };
  for (const [path, value] of Object.entries(plan.patch)) walk(value, path);
});

test('the stored inverse round-trips back to the reverse patch', async () => {
  const plan = await buildMergePlan({ keeperUid: KEEPER, loserUid: LOSER, read: makeRead(makeDb()) });
  const audit = plan.patch[`account-merges/${plan.mergeId}`];
  assert.deepEqual(JSON.parse(audit.reversePatchJson), plan.reversePatch);
});

test('refuses to merge an account into itself', async () => {
  await assert.rejects(
    () => buildMergePlan({ keeperUid: KEEPER, loserUid: KEEPER, read: makeRead(makeDb()) }),
    /into itself/
  );
});

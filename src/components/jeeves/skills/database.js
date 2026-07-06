// src/components/jeeves/skills/database.js
// ─────────────────────────────────────────────
// Generic Firebase Realtime Database skills.
//
// These give Jeeves an "escape hatch" — instead of requiring a hand-
// written skill for every conceivable lecturer question, the agent can
// read/write any RTDB path. Safety comes from the Firebase rules, which
// already enforce lecturer/moderator permissions server-side: if the
// agent asks for something the signed-in user can't see, the DB
// rejects it and we report the failure back.
//
// Paired with `describe_data_model` below, which gives the LLM a
// cheat-sheet of known paths so it can navigate without guessing.
// ─────────────────────────────────────────────

import { registerSkill } from '../registry.js';
import { getDatabase, ref, get, update, query, limitToFirst, orderByKey } from 'firebase/database';

const STAFF = ['lecturer', 'moderator', 'tutor'];

function _truncate(value, max = 4000) {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    if (s.length <= max) return value;
    return { _truncated: true, _originalLength: s.length, preview: s.slice(0, max) };
  } catch {
    return { _truncated: true, error: 'unserializable' };
  }
}

registerSkill({
  name: 'firebase_read',
  description: 'Read a Realtime Database path. Returns the value at that path (or null). Respect the data model before guessing paths — call describe_data_model first if unsure. Large values are truncated.',
  scope: 'app',
  roles: STAFF,
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'RTDB path, e.g. collaboration-groups/scopes/assessment-assess01/groups' },
      maxBytes: { type: 'number', description: 'Optional truncation limit (default 4000).' },
    },
    required: ['path'],
  },
  handler: async ({ path, maxBytes = 4000 }) => {
    const clean = String(path || '').replace(/^\/+/, '');
    if (!clean) return { ok: false, error: 'path is required' };
    const db = getDatabase();
    const snap = await get(ref(db, clean));
    if (!snap.exists()) return { ok: true, path: clean, value: null };
    return { ok: true, path: clean, value: _truncate(snap.val(), maxBytes) };
  },
});

registerSkill({
  name: 'firebase_list_children',
  description: 'List the direct child keys at a Realtime Database path, with a shallow peek at each child. Use this to survey a collection before diving into a specific entry.',
  scope: 'app',
  roles: STAFF,
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      limit: { type: 'number', description: 'Max children to return (default 50, hard max 200).' },
    },
    required: ['path'],
  },
  handler: async ({ path, limit = 50 }) => {
    const clean = String(path || '').replace(/^\/+/, '');
    if (!clean) return { ok: false, error: 'path is required' };
    const capped = Math.max(1, Math.min(200, limit));
    const db = getDatabase();
    const snap = await get(query(ref(db, clean), orderByKey(), limitToFirst(capped)));
    if (!snap.exists()) return { ok: true, path: clean, count: 0, children: [] };

    const children = [];
    snap.forEach((child) => {
      const v = child.val();
      let preview;
      if (v == null || typeof v !== 'object') {
        preview = v;
      } else {
        // Summarise an object: a few top-level keys + a sample value.
        const keys = Object.keys(v).slice(0, 6);
        preview = Object.fromEntries(keys.map(k => [k, _truncate(v[k], 120)]));
      }
      children.push({ key: child.key, preview });
    });
    return { ok: true, path: clean, count: children.length, children };
  },
});

registerSkill({
  name: 'firebase_write',
  description: 'Update (merge) values at a Realtime Database path. Use for setting leaderUid, renaming groups, adding members, etc. Rejected by the server if the signed-in user lacks permission. Prefer dictate_chat_message / leave_feedback for their dedicated surfaces; use this for collaboration groups, assessment groups, and other lecturer-maintained data.',
  scope: 'app',
  roles: ['lecturer', 'moderator'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'RTDB path to update.' },
      value: { description: 'Object to merge at that path. Primitive values are written as-is via a set on the exact path.' },
    },
    required: ['path', 'value'],
  },
  handler: async ({ path, value }) => {
    const clean = String(path || '').replace(/^\/+/, '');
    if (!clean) return { ok: false, error: 'path is required' };
    const db = getDatabase();
    // If caller passed a plain object, use update (merge semantics).
    // If primitive/array, wrap as a set via update on the parent.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      await update(ref(db, clean), value);
    } else {
      // Emulate set(path, value) using update on the parent.
      const parts = clean.split('/');
      const leaf = parts.pop();
      const parent = parts.join('/') || '/';
      await update(ref(db, parent), { [leaf]: value });
    }
    return { ok: true, path: clean };
  },
});

// ── Data-model cheat sheet ─────────────────────
// Static. No DB round-trip. Lets the LLM figure out where to look
// before spending a firebase_read call.
const DATA_MODEL = {
  description: 'Academic Literacies Firebase Realtime Database — paths a lecturer/moderator can access.',
  collections: [
    {
      path: 'collaboration-groups/scopes/{scopeId}',
      notes: 'Collaborative work groups. scopeIds are NOT predictable — assessment 1 might be stored as "assessment-a1", "assessment-assess01", "assessment-1", or a custom string. ALWAYS list children of "collaboration-groups/scopes" first to discover the real IDs instead of guessing.',
      children: {
        meta: 'scope configuration (label, sizeLimit, type, allowSelfSelect, legacyAssessmentId)',
        'groups/{groupId}': 'group record: { id, name, members: {uid:true}, leaderUid, ... }',
      },
      tips: [
        'Prefer the dedicated skill find_assessment_groups({ assessmentHint }) — it already handles id variance and also falls back to the legacy assessment-groups path.',
        'To set a team leader: firebase_write path "collaboration-groups/scopes/{scopeId}/groups/{groupId}" with { leaderUid: "<uid>" }.',
      ],
    },
    {
      path: 'assessment-groups/{assessmentId}/groups/{groupId}',
      notes: 'Legacy assessment-specific grouping. Shape: { id, name, members }. No leaderUid here.',
    },
    {
      path: 'submissions/{assessmentId}/{studentUid}/{submissionId}',
      notes: 'Student submissions. Use query_submissions or leave_feedback for common flows.',
    },
    {
      path: 'users/{uid}',
      notes: 'User record. Subkeys: profile (displayName, role, email), state (adaptive, activeUnit).',
    },
    {
      path: 'rosters/classList',
      notes: 'Full class roster. Good place to look up student names or uids in bulk.',
    },
    {
      path: 'analytics/raw-events/{YYYY-MM-DD}/{eventId}',
      notes: 'Raw learning events. Use query_analytics for summaries.',
    },
    {
      path: 'chat/rooms/{roomId}',
      notes: 'Chat rooms the user belongs to. Members at chat/members/{roomId}.',
    },
    {
      path: 'chat/scheduled/{scheduleId}',
      notes: 'Scheduled sessions. Prefer schedule_session for creation.',
    },
    {
      path: 'tutorial-groups/assignmentsByTutor/{tutorUid}',
      notes: 'Which students a tutor owns.',
    },
  ],
};

// ── Assessment-aware helpers ───────────────────
// The convention for scopeIds is not predictable (assess01 uses
// "assessment-a1", assess02 might use "assessment-a2" or "assessment-assess02").
// These helpers probe the data instead of hard-coding a mapping.

/** Normalise "assessment 1" / "a1" / "assess01" → candidate scope ids. */
function _assessmentCandidates(hint) {
  const raw = String(hint || '').toLowerCase().trim();
  const numMatch = raw.match(/\d+/);
  const n = numMatch ? String(parseInt(numMatch[0], 10)) : null;
  const padded = n ? n.padStart(2, '0') : null;
  const out = new Set();
  if (n) {
    out.add(`assessment-a${n}`);
    out.add(`assessment-${n}`);
    out.add(`assessment-assess${padded}`);
    out.add(`assessment-assess${n}`);
    out.add(`a${n}`);
    out.add(`assess${padded}`);
    out.add(`assess${n}`);
  }
  out.add(raw);
  return [...out].filter(Boolean);
}

registerSkill({
  name: 'find_assessment_groups',
  description: 'Find student groups for an assessment, regardless of how the scope id was named. Probes collaboration-groups/scopes and the legacy assessment-groups path. Returns every matching scope with its groups, members, and leader.',
  scope: 'app',
  roles: STAFF,
  parameters: {
    type: 'object',
    properties: {
      assessmentHint: { type: 'string', description: 'Natural phrase like "assessment 1" or an id like "assess01".' },
    },
    required: ['assessmentHint'],
  },
  handler: async ({ assessmentHint }) => {
    const db = getDatabase();
    const candidates = _assessmentCandidates(assessmentHint);

    // 1. List every scope actually present, then match by id or legacyAssessmentId.
    const scopesSnap = await get(ref(db, 'collaboration-groups/scopes'));
    const matchedScopes = [];
    if (scopesSnap.exists()) {
      scopesSnap.forEach((scopeNode) => {
        const scopeId = scopeNode.key;
        const meta = scopeNode.child('meta').val() || {};
        const legacy = String(meta?.legacyAssessmentId || '').toLowerCase();
        const idMatch = candidates.some(c => scopeId.toLowerCase() === c || scopeId.toLowerCase().includes(c));
        const legacyMatch = legacy && candidates.some(c => legacy === c || legacy.includes(c));
        if (!idMatch && !legacyMatch) return;

        const groups = [];
        scopeNode.child('groups').forEach((g) => {
          const v = g.val() || {};
          groups.push({
            groupId: g.key,
            name: v.name || null,
            leaderUid: v.leaderUid || null,
            memberUids: Object.keys(v.members || {}),
            memberCount: Object.keys(v.members || {}).length,
          });
        });
        matchedScopes.push({
          scopeId,
          label: meta.label || null,
          sizeLimit: meta.sizeLimit || null,
          legacyAssessmentId: meta.legacyAssessmentId || null,
          groupCount: groups.length,
          groups,
        });
      });
    }

    // 2. Fall back to legacy assessment-groups.
    const legacyGroups = [];
    for (const cand of candidates) {
      if (!/^assess\d+$/i.test(cand) && !/^a\d+$/i.test(cand)) continue;
      const snap = await get(ref(db, `assessment-groups/${cand}/groups`));
      if (snap.exists()) {
        snap.forEach((g) => {
          const v = g.val() || {};
          legacyGroups.push({
            assessmentId: cand,
            groupId: g.key,
            name: v.name || null,
            memberUids: Object.keys(v.members || {}),
            memberCount: Object.keys(v.members || {}).length,
          });
        });
      }
    }

    return {
      assessmentHint,
      candidatesTried: candidates,
      collaborationScopes: matchedScopes,
      legacyGroups,
      totalGroups: matchedScopes.reduce((a, s) => a + s.groupCount, 0) + legacyGroups.length,
    };
  },
});

registerSkill({
  name: 'list_students',
  description: 'List the full class roster (uid, displayName, email, role). Use this before guessing at student identifiers.',
  scope: 'app',
  roles: STAFF,
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max results (default 200).' },
    },
  },
  handler: async ({ limit = 200 }) => {
    const db = getDatabase();
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return { count: 0, students: [] };
    const students = [];
    snap.forEach((u) => {
      const profile = u.child('profile').val() || {};
      if (profile.role && profile.role !== 'student') return;
      students.push({
        uid: u.key,
        name: profile.displayName || profile.name || null,
        email: profile.email || null,
      });
      return students.length >= limit;
    });
    return { count: students.length, students };
  },
});

registerSkill({
  name: 'find_user_by_name',
  description: 'Resolve a spoken student/tutor name to a uid. Returns all close matches so the lecturer can disambiguate if needed.',
  scope: 'app',
  roles: STAFF,
  parameters: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  handler: async ({ query }) => {
    const needle = String(query || '').toLowerCase().trim();
    if (!needle) return { matches: [] };
    const db = getDatabase();
    const snap = await get(ref(db, 'users'));
    const matches = [];
    snap.forEach((u) => {
      const p = u.child('profile').val() || {};
      const name = String(p.displayName || p.name || '').toLowerCase();
      const email = String(p.email || '').toLowerCase();
      if (name.includes(needle) || email.includes(needle)) {
        matches.push({
          uid: u.key,
          name: p.displayName || p.name || null,
          email: p.email || null,
          role: p.role || 'student',
        });
      }
    });
    return { matches: matches.slice(0, 10), totalMatched: matches.length };
  },
});

registerSkill({
  name: 'describe_data_model',
  description: 'Return a cheat-sheet of Firebase paths available to lecturers/moderators. Call this when you need to know where a piece of information lives before using firebase_read or firebase_write.',
  scope: 'app',
  roles: STAFF,
  parameters: { type: 'object', properties: {} },
  handler: async () => DATA_MODEL,
});

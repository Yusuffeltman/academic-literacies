// Consolidate two duplicate student accounts into one.
//
// Usage:
//   node scripts/merge-student-accounts.mjs --keeper <uid> --loser <uid> [--apply]
//   node scripts/merge-student-accounts.mjs --batch <pairs.json> [--apply]
//
// Batch input is [{ "keeper": "<uid>", "loser": "<uid>", "label": "..." }, ...].
// Every pair is planned and applied in one process so the expensive reads
// (attendance, collaboration groups) are fetched once rather than per pair.
//
// Dry run by default: writes a plan JSON and prints a summary, touching nothing.
// With --apply the whole merge goes up as one atomic multi-path PATCH, so it
// either lands completely or not at all. A snapshot of both accounts is written
// to /account-merges/<mergeId> in the same patch, which makes it reversible.
//
// Merge rules live in src/account-merge.js and are shared with the lecturer
// dashboard. This file is only I/O: reads and writes go through the already
// authenticated Firebase CLI, so no service-account key is needed.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildMergePlan } from '../src/account-merge.js';

const args = process.argv.slice(2);
function flag(name, fallback = '') {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : String(args[i + 1] || '');
}

const KEEPER = flag('keeper');
const LOSER = flag('loser');
const BATCH = flag('batch');
const PROJECT = flag('project', 'academic-literacy');
const DB_URL = flag('db', `https://${PROJECT}-default-rtdb.firebaseio.com`).replace(/\/$/, '');
const APPLY = args.includes('--apply');
const OUT = flag('out', `.merge-plan-${LOSER || 'batch'}.json`);

if (!BATCH && (!KEEPER || !LOSER || KEEPER === LOSER)) {
  console.error('Usage: node scripts/merge-student-accounts.mjs (--keeper <uid> --loser <uid> | --batch <pairs.json>) [--apply] [--project <id>] [--out <file>]');
  process.exit(1);
}

const pairs = BATCH
  ? JSON.parse(fs.readFileSync(path.resolve(BATCH), 'utf8'))
  : [{ keeper: KEEPER, loser: LOSER, label: `${LOSER} -> ${KEEPER}` }];

// Talks to the REST API rather than shelling out to `firebase database:get`.
// A batch needs hundreds of reads and a CLI process spawn costs seconds each,
// which put a 14-pair run over half an hour. Auth is the gcloud access token,
// the same credential the CLI uses.
let accessToken = '';
function refreshToken() {
  accessToken = execFileSync('gcloud', ['auth', 'print-access-token'], {
    encoding: 'utf8',
    shell: true,
  }).trim();
  if (!accessToken) throw new Error('Could not obtain an access token. Run: gcloud auth login');
  return accessToken;
}

async function rest(method, dbPath, { body, shallow = false, retry = true } = {}) {
  const params = new URLSearchParams({ access_token: accessToken });
  if (shallow) params.set('shallow', 'true');
  const res = await globalThis.fetch(`${DB_URL}/${dbPath}.json?${params}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (res.status === 401 && retry) {
    // Long batches can outlive the token.
    refreshToken();
    return rest(method, dbPath, { body, shallow, retry: false });
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} /${dbPath} failed (${res.status}): ${text.slice(0, 200)}`);
  if (!text || text === 'null') return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Could not parse response for /${dbPath}`);
  }
}

// Cached so repeated lookups of big nodes (attendance, collaboration groups)
// cost one CLI round trip across the whole batch rather than one per pair.
// Stale entries are safe here: each pair only ever reads and writes paths keyed
// by its own two uids, so one pair's writes never affect another's plan.
const readCache = new Map();
async function read(dbPath) {
  if (!readCache.has(dbPath)) readCache.set(dbPath, rest('GET', dbPath));
  return readCache.get(dbPath);
}

const listCache = new Map();
async function listKeys(dbPath) {
  if (!listCache.has(dbPath)) {
    listCache.set(dbPath, rest('GET', dbPath, { shallow: true }).then((v) => Object.keys(v || {})));
  }
  return listCache.get(dbPath);
}

// Paths a pair has written, so a later pair in the same batch never plans from
// a cached copy of something already changed.
function invalidate(paths) {
  for (const p of paths) {
    for (const cached of [...readCache.keys()]) {
      if (cached === p || p.startsWith(`${cached}/`) || cached.startsWith(`${p}/`)) readCache.delete(cached);
    }
  }
}

refreshToken();
console.error(`Reading accounts (${DB_URL})...`);

const results = [];
let failures = 0;

for (const [i, pair] of pairs.entries()) {
  const label = pair.label || `${pair.loser} -> ${pair.keeper}`;
  console.log(`\n[${i + 1}/${pairs.length}] ${label}`);
  try {
    const plan = await buildMergePlan({ keeperUid: pair.keeper, loserUid: pair.loser, read, listKeys });
    const kp = plan.keeper.profile || {};
    const lp = plan.loser.profile || {};
    console.log(`  keeper: ${kp.displayName || '?'} <${kp.authEmail || '?'}> #${kp.studentNumber || '—'}`);
    console.log(`  loser:  ${lp.displayName || '?'} <${lp.authEmail || '?'}> #${lp.studentNumber || '—'}`);
    for (const m of plan.moves) console.log(`    - ${m.label}`);
    for (const w of plan.warnings) console.log(`    ! ${w}`);

    if (APPLY) {
      // One atomic multi-path PATCH per pair: nulls delete, so the copies and
      // the removals land together or not at all.
      await rest('PATCH', '', { body: plan.patch });
      invalidate(Object.keys(plan.patch));
      console.log(`    => applied (${plan.mergeId})`);
    }

    results.push({
      label,
      keeper: pair.keeper,
      loser: pair.loser,
      mergeId: plan.mergeId,
      applied: APPLY,
      moves: plan.moves,
      warnings: plan.warnings,
      patch: plan.patch,
    });
  } catch (err) {
    failures += 1;
    console.log(`    !! FAILED: ${err?.message || err}`);
    results.push({ label, keeper: pair.keeper, loser: pair.loser, error: String(err?.message || err) });
  }
}

const outPath = path.resolve(OUT);
fs.writeFileSync(outPath, JSON.stringify({ project: PROJECT, applied: APPLY, results }, null, 2));

const ok = results.filter((r) => !r.error);
console.log(`\n${ok.length}/${pairs.length} pair(s) planned${APPLY ? ' and applied' : ''}${failures ? `, ${failures} failed` : ''}.`);
console.log(`Written to ${outPath}`);
if (!APPLY) console.log('\nDry run only. Re-run with --apply to perform the merges.');
process.exit(failures ? 1 : 0);

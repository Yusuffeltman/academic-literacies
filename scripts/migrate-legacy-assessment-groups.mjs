import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/migrate-legacy-assessment-groups.mjs <legacy-input.json> <scope-output.json> <legacy-meta-output.json> [existing-scope.json]');
}

const [, , inputPath, scopeOutputPath, legacyMetaOutputPath, existingScopeInputPath] = process.argv;
if (!inputPath || !scopeOutputPath || !legacyMetaOutputPath) {
  usage();
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inputPath), 'utf8').trim();
const legacyGroups = raw ? JSON.parse(raw) : {};
const existingScopeRaw = existingScopeInputPath
  ? fs.readFileSync(path.resolve(existingScopeInputPath), 'utf8').trim()
  : '';
const existingScope = existingScopeRaw ? JSON.parse(existingScopeRaw) : {};
const nowIso = new Date().toISOString();

function pickLeaderUid(group = {}) {
  const members = group?.members && typeof group.members === 'object' ? group.members : {};
  if (group?.createdBy && members[group.createdBy]) return String(group.createdBy);
  const sorted = Object.entries(members).sort(([, a], [, b]) => Number(a?.joinedAt || 0) - Number(b?.joinedAt || 0));
  return sorted[0]?.[0] || '';
}

const mergedGroups = {
  ...(existingScope?.groups && typeof existingScope.groups === 'object' ? existingScope.groups : {}),
};
let importedCount = 0;
let skippedExistingCount = 0;
for (const [groupId, group] of Object.entries(legacyGroups || {})) {
  if (!group || typeof group !== 'object') continue;
  if (mergedGroups[groupId]) {
    skippedExistingCount += 1;
    continue;
  }
  const members = group?.members && typeof group.members === 'object' ? group.members : {};
  mergedGroups[groupId] = {
    id: groupId,
    name: String(group?.name || `Group ${groupId.slice(-4)}`).trim(),
    scopeId: 'assessment-a1',
    scopeType: 'assessment',
    scopeLabel: 'Assessment 1 Collaboration Space',
    sizeLimit: Math.max(2, Object.keys(members).length || 5),
    createdAt: Number(group?.createdAt || Date.now()) || Date.now(),
    updatedAt: nowIso,
    createdBy: String(group?.createdBy || '').trim() || null,
    leaderUid: pickLeaderUid(group) || null,
    chatRoomId: null,
    members,
    artefacts: group?.artefacts && typeof group.artefacts === 'object' ? group.artefacts : {},
    migratedFromLegacy: true,
    legacyAssessmentId: 'a1',
  };
  importedCount += 1;
}

const scopePayload = {
  meta: {
    ...(existingScope?.meta && typeof existingScope.meta === 'object' ? existingScope.meta : {}),
    id: 'assessment-a1',
    type: 'assessment',
    label: existingScope?.meta?.label || 'Assessment 1 Collaboration Space',
    sizeLimit: 5,
    allowSelfSelect: true,
    status: existingScope?.meta?.status || 'active',
    createdAt: existingScope?.meta?.createdAt || nowIso,
    updatedAt: nowIso,
    archivedAt: existingScope?.meta?.archivedAt || null,
    archivedReason: existingScope?.meta?.archivedReason || null,
    legacyMigration: {
      source: 'a1',
      migratedAt: nowIso,
      migratedBy: 'firebase-cli-migration',
      importedCount,
      skippedExistingCount,
      totalLegacyCount: Object.keys(legacyGroups || {}).length,
    },
  },
  groups: mergedGroups,
};

const legacyMetaPayload = {
  migratedToScopeId: 'assessment-a1',
  migratedAt: nowIso,
  migratedBy: 'firebase-cli-migration',
  importedCount,
  skippedExistingCount,
  totalLegacyCount: Object.keys(legacyGroups || {}).length,
};

fs.writeFileSync(path.resolve(scopeOutputPath), JSON.stringify(scopePayload, null, 2));
fs.writeFileSync(path.resolve(legacyMetaOutputPath), JSON.stringify(legacyMetaPayload, null, 2));

console.log(JSON.stringify({
  importedGroups: importedCount,
  skippedExistingGroups: skippedExistingCount,
  finalGroupCount: Object.keys(mergedGroups).length,
  scopeOutput: path.resolve(scopeOutputPath),
  legacyMetaOutput: path.resolve(legacyMetaOutputPath),
}, null, 2));

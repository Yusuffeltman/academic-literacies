import fs from 'node:fs';
import { SEED_RESOURCES } from '../content/resources.js';

const csvPath = './docs/resource-stocktake-matrix.csv';
const raw = fs.readFileSync(csvPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
const header = lines[0].split(',');
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const phaseNumByLabel = {
  'Phase 1': 1,
  'Phase 2': 2,
  'Phase 3': 3,
  'Phase 4': 4,
  'Phase 5': 5,
};

const objectiveSkillMap = {
  'p1.read.critical_media': ['critical_reading', 'source_evaluation'],
  'p1.write.policy_brief': ['argument_structure', 'evidence_use', 'academic_tone'],
  'p2.source_eval.verify': ['source_evaluation', 'research_skills', 'citation_practice'],
  'p2.write.claim_verdict': ['evidence_use', 'argument_structure', 'citation_practice'],
  'p3.read.deep_academic': ['critical_reading', 'research_skills'],
  'p3.write.argument_synthesis': ['argument_structure', 'evidence_use', 'academic_tone'],
  'p4.ai.integrity': ['ai_literacy', 'source_evaluation', 'citation_practice'],
  'p4.write.ethics_synthesis': ['argument_structure', 'evidence_use', 'academic_tone', 'ai_literacy'],
  'p5.read.litreview': ['critical_reading', 'research_skills', 'citation_practice'],
  'p5.write.identity_reflection': ['academic_tone', 'argument_structure'],
};

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function hasPhase(resource, phaseNum) {
  const tags = safeArray(resource.phaseTags);
  return tags.includes(phaseNum);
}

function matchesAnySkill(resource, skills) {
  const tags = safeArray(resource.skillTags);
  for (const skill of tags) {
    if (skills.includes(skill)) return true;
  }
  return false;
}

const out = [lines[0]];
for (let i = 1; i < lines.length; i += 1) {
  const cols = lines[i].split(',');
  const phaseLabel = cols[idx.phase];
  const pathwayLevel = cols[idx.pathway_level];
  const objectiveId = cols[idx.objective_id];
  const minRequired = Number(cols[idx.min_required_count] || 0);

  const phaseNum = phaseNumByLabel[phaseLabel];
  const skills = objectiveSkillMap[objectiveId] || [];

  let currentCount = 0;
  if (pathwayLevel === 'core') {
    for (const resource of SEED_RESOURCES) {
      if (hasPhase(resource, phaseNum) && matchesAnySkill(resource, skills)) {
        currentCount += 1;
      }
    }
  }

  const gap = Math.max(0, minRequired - currentCount);
  cols[idx.current_count] = String(currentCount);
  cols[idx.gap] = String(gap);
  cols[idx.status] = currentCount > 0 ? 'in-progress' : 'not-started';

  if (pathwayLevel === 'core') {
    cols[idx.notes] = `computed from seed resources (phase ${phaseNum} + skill-match)`;
  } else {
    cols[idx.notes] = 'no pathway tags yet; treat as gap until differentiated resources are tagged';
  }

  out.push(cols.join(','));
}

fs.writeFileSync(csvPath, `${out.join('\n')}\n`);
console.log(`Updated ${csvPath} with ${out.length - 1} rows`);

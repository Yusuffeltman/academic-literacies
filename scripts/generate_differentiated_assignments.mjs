import fs from 'node:fs';
import { SEED_RESOURCES } from '../content/resources.js';

const outputPath = './docs/differentiated-resource-assignment.csv';

const objectiveConfig = [
  {
    objectiveId: 'p1.read.critical_media',
    phase: 1,
    objectiveDescription: 'Read and interpret digital/media claims critically',
    skillTags: ['critical_reading', 'source_evaluation'],
    softSkills: ['critical judgement', 'self-management'],
  },
  {
    objectiveId: 'p1.write.policy_brief',
    phase: 1,
    objectiveDescription: 'Write evidence-based policy recommendation',
    skillTags: ['argument_structure', 'evidence_use', 'academic_tone'],
    softSkills: ['communication', 'adaptability'],
  },
  {
    objectiveId: 'p2.source_eval.verify',
    phase: 2,
    objectiveDescription: 'Verify source quality using SIFT/lateral reading',
    skillTags: ['source_evaluation', 'research_skills', 'citation_practice'],
    softSkills: ['critical judgement', 'self-management'],
  },
  {
    objectiveId: 'p2.write.claim_verdict',
    phase: 2,
    objectiveDescription: 'Write claim verdict and methodological note',
    skillTags: ['evidence_use', 'argument_structure', 'citation_practice'],
    softSkills: ['communication', 'critical judgement'],
  },
  {
    objectiveId: 'p3.read.deep_academic',
    phase: 3,
    objectiveDescription: 'Deep strategic reading of scholarly texts',
    skillTags: ['critical_reading', 'research_skills'],
    softSkills: ['self-management', 'critical judgement'],
  },
  {
    objectiveId: 'p3.write.argument_synthesis',
    phase: 3,
    objectiveDescription: 'Integrate evidence into coherent argument and genre',
    skillTags: ['argument_structure', 'evidence_use', 'academic_tone'],
    softSkills: ['communication', 'collaboration'],
  },
  {
    objectiveId: 'p4.ai.integrity',
    phase: 4,
    objectiveDescription: 'Use AI tools with verification and integrity',
    skillTags: ['ai_literacy', 'source_evaluation', 'citation_practice'],
    softSkills: ['ethical judgement', 'self-management'],
  },
  {
    objectiveId: 'p4.write.ethics_synthesis',
    phase: 4,
    objectiveDescription: 'Write position/rebuttal/synthesis recommendation',
    skillTags: ['argument_structure', 'evidence_use', 'academic_tone', 'ai_literacy'],
    softSkills: ['communication', 'ethical judgement'],
  },
  {
    objectiveId: 'p5.read.litreview',
    phase: 5,
    objectiveDescription: 'Read and map literature for synthesis',
    skillTags: ['critical_reading', 'research_skills', 'citation_practice'],
    softSkills: ['self-management', 'adaptability'],
  },
  {
    objectiveId: 'p5.write.identity_reflection',
    phase: 5,
    objectiveDescription: 'Write reflective scholarly identity and lifelong plan',
    skillTags: ['academic_tone', 'argument_structure'],
    softSkills: ['communication', 'self-management'],
  },
];

const pathwayRules = {
  supported: {
    adaptation: 'Use guided worksheet, glossary support, and model paragraph before independent attempt.',
    evidenceOutput: '120-180 word structured response + checklist self-check',
    challengeLevel: 'high scaffold / moderate cognitive load',
  },
  core: {
    adaptation: 'Use standard prompt with one extension question and light structure prompts.',
    evidenceOutput: '180-280 word analytical response with one cited source',
    challengeLevel: 'moderate scaffold / standard cognitive load',
  },
  advanced: {
    adaptation: 'Add second source/chapter, counter-position requirement, and transfer application.',
    evidenceOutput: '280-400 word synthesis with counter-argument and two cited sources',
    challengeLevel: 'low scaffold / high cognitive load',
  },
};

function matchesObjective(resource, objective) {
  const phases = Array.isArray(resource.phaseTags) ? resource.phaseTags : [];
  const skills = Array.isArray(resource.skillTags) ? resource.skillTags : [];
  if (!phases.includes(objective.phase)) return false;
  return skills.some((tag) => objective.skillTags.includes(tag));
}

function matchesSkillsOnly(resource, objective) {
  const skills = Array.isArray(resource.skillTags) ? resource.skillTags : [];
  return skills.some((tag) => objective.skillTags.includes(tag));
}

function scoreResource(resource, objective) {
  const skills = Array.isArray(resource.skillTags) ? resource.skillTags : [];
  let score = 0;
  for (const tag of skills) {
    if (objective.skillTags.includes(tag)) score += 3;
  }
  if ((resource.type || '') === 'pdf') score += 1;
  if ((resource.source || '').toLowerCase() === 'university') score += 1;
  return score;
}

function csv(v) {
  const text = String(v ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

const header = [
  'objective_id',
  'objective_description',
  'pathway_level',
  'resource_id',
  'resource_title',
  'resource_type',
  'phase',
  'matched_skill_tags',
  'adaptation_instruction',
  'evidence_output',
  'implicit_soft_skills',
  'challenge_level',
  'implementation_priority',
].join(',');

const rows = [header];

for (const objective of objectiveConfig) {
  const strictCandidates = SEED_RESOURCES
    .filter((r) => matchesObjective(r, objective))
    .map((r) => ({ r, score: scoreResource(r, objective) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);

  const candidates = [...strictCandidates];
  if (candidates.length < 3) {
    const fallback = SEED_RESOURCES
      .filter((r) => matchesSkillsOnly(r, objective))
      .filter((r) => !candidates.some((c) => c.id === r.id))
      .map((r) => ({ r, score: scoreResource(r, objective) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);

    for (const resource of fallback) {
      candidates.push(resource);
      if (candidates.length >= 3) break;
    }
  }

  const topCandidates = candidates.slice(0, 3);

  for (const pathway of ['supported', 'core', 'advanced']) {
    const rules = pathwayRules[pathway];
    for (const resource of topCandidates) {
      const matchingSkills = (resource.skillTags || []).filter((s) => objective.skillTags.includes(s)).join('|');
      rows.push([
        csv(objective.objectiveId),
        csv(objective.objectiveDescription),
        csv(pathway),
        csv(resource.id),
        csv(resource.title),
        csv(resource.type),
        csv(objective.phase),
        csv(matchingSkills),
        csv(rules.adaptation),
        csv(rules.evidenceOutput),
        csv(objective.softSkills.join('|')),
        csv(rules.challengeLevel),
        csv(pathway === 'supported' || pathway === 'advanced' ? 'high' : 'medium'),
      ].join(','));
    }
  }
}

fs.writeFileSync(outputPath, `${rows.join('\n')}\n`);
console.log(`Wrote ${outputPath} with ${rows.length - 1} assignments`);

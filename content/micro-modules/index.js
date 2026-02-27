// content/micro-modules/index.js
// ── Micro-module registry ─────────────────────

import { MODULE as evidenceBooster }   from './evidence-booster.js';
import { MODULE as argumentBuilder }   from './argument-builder.js';
import { MODULE as toneWorkshop }      from './tone-workshop.js';
import { MODULE as sourceSkills }      from './source-skills.js';
import { MODULE as citationGuide }     from './citation-guide.js';
import { MODULE as readingStrategies } from './reading-strategies.js';

export const MICRO_MODULES = [
  evidenceBooster,
  argumentBuilder,
  toneWorkshop,
  sourceSkills,
  citationGuide,
  readingStrategies,
];

// Map for O(1) lookup by id
export const MICRO_MODULE_MAP = Object.fromEntries(
  MICRO_MODULES.map(m => [m.id, m])
);

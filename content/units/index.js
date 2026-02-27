// content/units/index.js
// All 20 real units — stubs fully replaced.

import { unit01 } from './unit01.js';
import { unit02 } from './unit02.js';
import { unit03 } from './unit03.js';
import { unit04 } from './unit04.js';
import { unit05 } from './unit05.js';
import { unit06 } from './unit06.js';
import { unit07 } from './unit07.js';
import { unit08 } from './unit08.js';
import { unit09 } from './unit09.js';
import { unit10 } from './unit10.js';
import { unit11 } from './unit11.js';
import { unit12 } from './unit12.js';
import { unit13 } from './unit13.js';
import { unit14 } from './unit14.js';
import { unit15 } from './unit15.js';
import { unit16 } from './unit16.js';
import { unit17 } from './unit17.js';
import { unit18 } from './unit18.js';
import { unit19 } from './unit19.js';
import { unit20 } from './unit20.js';

import {
  assess01, assess02, assess03,
  assess04, assess05, assess06,
} from '../assessments/index.js';

export const UNITS = [
  // Phase 1 — Understanding the Landscape
  unit01, unit02, unit03,
  assess01,

  // Phase 2 — Finding & Evaluating Knowledge
  unit04, unit05, unit06,
  assess02,

  unit07, unit08, unit09,
  assess03,

  // Phase 3 — Academic Communication
  unit10, unit11, unit12,
  assess04,

  unit13, unit14, unit15,
  assess05,

  // Phase 4 — AI as a Scholarly Tool
  unit16, unit17, unit18,
  assess06,

  // Phase 5 — The Future Scholar
  unit19, unit20,
];

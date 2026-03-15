import fs from 'node:fs';
import path from 'node:path';

const unitsDir = path.resolve('./content/units');

function formatCount(value) {
  return String(value).padStart(2, '0');
}

const unitFiles = [];
for (let i = 1; i <= 20; i += 1) {
  unitFiles.push(`unit${formatCount(i)}.js`);
}

const missingFiles = [];
const missingPathway = [];
const missingMilestone = [];

for (const fileName of unitFiles) {
  const filePath = path.join(unitsDir, fileName);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(fileName);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const hasPathway = /\bpathwayChallenge\s*\(/.test(content);
  const hasMilestone = /\bessayMilestone\s*\(/.test(content);

  if (!hasPathway) missingPathway.push(fileName);
  if (!hasMilestone) missingMilestone.push(fileName);
}

const failures = [];
if (missingFiles.length > 0) {
  failures.push(`Missing unit file(s): ${missingFiles.join(', ')}`);
}
if (missingPathway.length > 0) {
  failures.push(`Missing pathwayChallenge(...) in: ${missingPathway.join(', ')}`);
}
if (missingMilestone.length > 0) {
  failures.push(`Missing essayMilestone(...) in: ${missingMilestone.join(', ')}`);
}

if (failures.length > 0) {
  console.error('Unit structure compliance check failed.');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Unit structure compliance check passed for unit01.js through unit20.js.');

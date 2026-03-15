import fs from 'node:fs';

const auditPath = './docs/heutagogy-maturity-audit.csv';
const outputPath = './docs/phase-priority-actions.csv';

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function toCsvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function parseScore(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 3) return null;
  return n;
}

function priorityFromScore(score) {
  if (score === null) return 'high';
  if (score <= 1) return 'high';
  if (score <= 2) return 'medium';
  return 'maintain';
}

function actionForDimension(dimension, score) {
  const dim = String(dimension || '').toLowerCase();
  const weak = score === null || score <= 1;

  if (dim.includes('learner contract')) {
    return weak
      ? 'Make learner contract mandatory in ILP and review it weekly.'
      : 'Keep learner contract checks and collect stronger evidence samples.';
  }
  if (dim.includes('choice')) {
    return weak
      ? 'Add one bounded learner-choice task per 2-week cycle.'
      : 'Increase quality of learner rationale for chosen modes.';
  }
  if (dim.includes('self-determined evidence')) {
    return weak
      ? 'Require students to justify their evidence pathway in submissions.'
      : 'Maintain evidence-pathway choice and audit consistency.';
  }
  if (dim.includes('double-loop reflection')) {
    return weak
      ? 'Require 80-120 word double-loop reflection in every cycle.'
      : 'Improve reflection depth with strategy-change prompts.';
  }
  if (dim.includes('capability/transfer portfolio')) {
    return weak
      ? 'Add one transfer artifact per phase to capability portfolio.'
      : 'Track transfer artifact quality with common rubric descriptors.';
  }
  if (dim.includes('co-assessment')) {
    return weak
      ? 'Run fortnightly self-vs-tutor score calibration and document misalignment actions.'
      : 'Continue calibration and target recurring misalignment themes.';
  }
  if (dim.includes('pathway flexibility')) {
    return weak
      ? 'Ensure explicit opt-up pathway opportunities each cycle.'
      : 'Monitor uptake and remove barriers to opt-up access.';
  }
  if (dim.includes('ai as metacognitive coach')) {
    return weak
      ? 'Shift AI tasks toward planning, reflection, and revision prompts.'
      : 'Audit AI prompt quality and keep coach-not-answer framing.';
  }
  if (dim.includes('fairness safeguards')) {
    return weak
      ? 'Tighten moderation checks and verify common standards across pathways.'
      : 'Maintain monthly fairness audits and publish trend summaries.';
  }
  if (dim.includes('continuation readiness')) {
    return weak
      ? 'Add independent continuation plan milestone at end of each phase.'
      : 'Strengthen continuation plans with concrete post-module goals.';
  }

  return weak
    ? 'Add targeted intervention and review next cycle.'
    : 'Maintain current practice and monitor trend.';
}

const raw = fs.readFileSync(auditPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
  throw new Error('No audit rows found.');
}

const header = parseCsvLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
for (const col of ['phase', 'dimension', 'score_0_to_3']) {
  if (!(col in idx)) throw new Error(`Missing required column: ${col}`);
}

const rows = [];
for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  const phase = (cols[idx.phase] || '').trim();
  const dimension = (cols[idx.dimension] || '').trim();
  const score = parseScore(cols[idx.score_0_to_3]);
  const priority = priorityFromScore(score);
  const action = actionForDimension(dimension, score);
  rows.push({ phase, dimension, score, priority, action });
}

rows.sort((a, b) => {
  if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
  const rank = { high: 0, medium: 1, maintain: 2 };
  const ra = rank[a.priority] ?? 3;
  const rb = rank[b.priority] ?? 3;
  if (ra !== rb) return ra - rb;
  return a.dimension.localeCompare(b.dimension);
});

const out = [];
out.push('phase,dimension,score_0_to_3,priority,recommended_action');
for (const row of rows) {
  out.push([
    toCsvCell(row.phase),
    toCsvCell(row.dimension),
    toCsvCell(row.score === null ? '' : row.score),
    toCsvCell(row.priority),
    toCsvCell(row.action),
  ].join(','));
}

fs.writeFileSync(outputPath, `${out.join('\n')}\n`);
console.log(`Wrote ${outputPath} with ${rows.length} rows`);

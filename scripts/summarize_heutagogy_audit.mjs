import fs from 'node:fs';
import path from 'node:path';

const csvPath = './docs/heutagogy-maturity-audit.csv';
const reportPath = './docs/heutagogy-maturity-summary.md';

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

function classify(score) {
  if (score <= 9) return 'Predominantly teacher-directed';
  if (score <= 17) return 'Hybrid (andragogy-forward with limited heutagogy)';
  if (score <= 24) return 'Emerging heutagogical system';
  return 'Strong systemic heutagogy';
}

function safeNum(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const raw = fs.readFileSync(csvPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
  throw new Error('Audit CSV has no data rows.');
}

const header = parseCsvLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const requiredCols = ['phase', 'dimension', 'score_0_to_3'];
for (const col of requiredCols) {
  if (!(col in idx)) throw new Error(`Missing required column: ${col}`);
}

const byPhase = new Map();
let totalRows = 0;
let scoredRows = 0;

for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  const phase = (cols[idx.phase] || '').trim() || 'Unknown';
  const dimension = (cols[idx.dimension] || '').trim();
  const score = safeNum(cols[idx.score_0_to_3]);

  if (!byPhase.has(phase)) {
    byPhase.set(phase, {
      phase,
      rows: 0,
      scored: 0,
      scoreSum: 0,
      missingDimensions: [],
    });
  }

  const rec = byPhase.get(phase);
  rec.rows += 1;
  totalRows += 1;

  if (score !== null && score >= 0 && score <= 3) {
    rec.scored += 1;
    rec.scoreSum += score;
    scoredRows += 1;
  } else {
    rec.missingDimensions.push(dimension);
  }
}

const phaseRows = [...byPhase.values()].sort((a, b) => a.phase.localeCompare(b.phase));

const overallMax = phaseRows.reduce((acc, p) => acc + p.rows * 3, 0);
const overallScore = phaseRows.reduce((acc, p) => acc + p.scoreSum, 0);
const attainmentPct = overallMax ? ((overallScore / overallMax) * 100) : 0;
const scoringCompletionPct = totalRows ? ((scoredRows / totalRows) * 100) : 0;

const today = new Date().toISOString().slice(0, 10);

let report = '';
report += '# Heutagogy Maturity Summary\n\n';
report += `Generated: ${today}\n\n`;
report += `Source: ${csvPath}\n\n`;
report += '## Overall\n';
report += `- Rows scored: ${scoredRows} / ${totalRows}\n`;
report += `- Total score: ${overallScore} / ${overallMax}\n`;
report += `- Scoring completion: ${scoringCompletionPct.toFixed(1)}%\n`;
report += `- Maturity attainment: ${attainmentPct.toFixed(1)}%\n`;
report += `- Classification: ${classify(Math.round(overallMax ? (overallScore / (overallMax / 30)) : 0))}\n\n`;

report += '## Phase Scores\n';
report += '| Phase | Scored Rows | Score | Max | Percent | Classification |\n';
report += '|---|---:|---:|---:|---:|---|\n';

for (const p of phaseRows) {
  const max = p.rows * 3;
  const pct = max ? (p.scoreSum / max) * 100 : 0;
  const normalizedTo30 = max ? (p.scoreSum / max) * 30 : 0;
  report += `| ${p.phase} | ${p.scored}/${p.rows} | ${p.scoreSum.toFixed(1)} | ${max} | ${pct.toFixed(1)}% | ${classify(Math.round(normalizedTo30))} |\n`;
}

report += '\n## Missing Scores\n';
for (const p of phaseRows) {
  if (p.missingDimensions.length === 0) continue;
  report += `- ${p.phase}: ${p.missingDimensions.join('; ')}\n`;
}
if (!phaseRows.some((p) => p.missingDimensions.length)) {
  report += '- None\n';
}

report += '\n## Next Actions\n';
if (scoredRows < totalRows) {
  report += '- Complete missing score cells in the audit CSV.\n';
} else {
  report += '- Prioritize low-scoring dimensions for intervention design.\n';
}
report += '- Re-run this script after each moderation cycle.\n';
report += '- Use phase-level results to prioritize ILP and pilot interventions.\n';

fs.writeFileSync(reportPath, report);
console.log(`Wrote ${reportPath}`);

const rel = path.relative(process.cwd(), reportPath).replace(/\\/g, '/');
console.log(`Report ready: ${rel}`);

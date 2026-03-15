import fs from 'node:fs';

const inputPath = './docs/phase-priority-actions.csv';
const outputPath = './docs/top5-actions-this-cycle.md';

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

const raw = fs.readFileSync(inputPath, 'utf8').trim();
const lines = raw.split(/\r?\n/);
if (lines.length < 2) {
  throw new Error('No rows in phase-priority-actions.csv');
}

const header = parseCsvLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
for (const col of ['phase', 'dimension', 'priority', 'recommended_action']) {
  if (!(col in idx)) throw new Error(`Missing required column: ${col}`);
}

const rows = [];
for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  rows.push({
    phase: (cols[idx.phase] || '').trim(),
    dimension: (cols[idx.dimension] || '').trim(),
    priority: (cols[idx.priority] || '').trim().toLowerCase(),
    action: (cols[idx.recommended_action] || '').trim(),
  });
}

const rank = { high: 0, medium: 1, maintain: 2 };
const scoredRows = rows
  .filter((r) => r.phase && r.dimension && r.action)
  .map((r) => ({ ...r, rank: rank[r.priority] ?? 3 }))
  .sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
    return a.dimension.localeCompare(b.dimension);
  });

const byPhase = new Map();
for (const row of scoredRows) {
  if (!byPhase.has(row.phase)) byPhase.set(row.phase, []);
  byPhase.get(row.phase).push(row);
}

const selected = [];
const selectedKeys = new Set();

function rowKey(row) {
  return `${row.phase}::${row.dimension}`;
}

for (const phase of [...byPhase.keys()].sort((a, b) => a.localeCompare(b))) {
  const first = byPhase.get(phase)[0];
  if (!first) continue;
  const key = rowKey(first);
  if (!selectedKeys.has(key)) {
    selected.push(first);
    selectedKeys.add(key);
  }
  if (selected.length >= 5) break;
}

if (selected.length < 5) {
  for (const row of scoredRows) {
    const key = rowKey(row);
    if (selectedKeys.has(key)) continue;
    selected.push(row);
    selectedKeys.add(key);
    if (selected.length >= 5) break;
  }
}

const top = selected;
const generated = new Date().toISOString().slice(0, 10);

let text = '';
text += '# Top 5 Actions This Cycle\n\n';
text += `Generated: ${generated}\n\n`;
text += `Source: ${inputPath}\n\n`;

if (top.length === 0) {
  text += 'No actions available. Populate phase-priority-actions.csv first.\n';
} else {
  text += '## Priority Actions\n';
  top.forEach((r, i) => {
    text += `${i + 1}. **${r.phase}** — ${r.dimension} (${r.priority})\n`;
    text += `   - Action: ${r.action}\n`;
  });

  text += '\n## Execution Notes\n';
  text += '- Selection logic: one highest-priority action per phase first, then remaining slots by global priority.\n';
  text += '- Assign an owner and due date for each action in weekly planning.\n';
  text += '- Capture evidence of implementation in ILP and moderation records.\n';
  text += '- Re-run after each moderation cycle to refresh priorities.\n';
}

fs.writeFileSync(outputPath, text);
console.log(`Wrote ${outputPath}`);

// src/components/ai-tools.js
// ─────────────────────────────────────────────
// Academic Tools floating widget — 3-tab panel:
//   Writing Coach | Source Evaluator | Argument Mapper
// ─────────────────────────────────────────────

import { STATE, recordSkillScore, getScaffoldLevel } from '../state.js';

window._atState = { activeTool: 'writing', currentUnit: null };

let toolsIsOpen = false;

/**
 * Mounts the AI Tools widget to the body.
 */
export function initAITools() {
  if (document.getElementById('ai-tools-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'ai-tools-widget';
  widget.innerHTML = `
    <button id="ai-tools-toggle" class="ai-tools-toggle">
      <span>🛠</span>
      <span>Tools</span>
    </button>
    <div id="ai-tools-panel" class="ai-tools-panel hidden">
      <div class="panel-drag-handle" id="ai-tools-resize" title="Drag to resize">⠿</div>
      <div class="ai-tools-header" style="padding-left:36px;">
        <span class="ai-tools-title">Academic Tools</span>
        <button id="ai-tools-close" class="ai-tools-close">&times;</button>
      </div>
      <div class="ai-tools-tabs">
        <button class="ai-tools-tab active" data-tool="writing">✍ Writing Coach</button>
        <button class="ai-tools-tab" data-tool="source">🔍 Source Check</button>
        <button class="ai-tools-tab" data-tool="argument">🗺 Argument Map</button>
      </div>
      <div class="ai-tools-body">

        <section id="at-writing" class="at-tool-section">
          <p class="at-tool-desc">Paste your writing for structured feedback on argument clarity, evidence, tone, and structure.</p>
          <textarea id="at-writing-input" class="at-textarea" rows="5" placeholder="Paste your paragraph or essay excerpt here..."></textarea>
          <button class="at-run-btn" id="at-writing-btn">Get Feedback</button>
          <div id="at-writing-output" class="at-output hidden"></div>
        </section>

        <section id="at-source" class="at-tool-section hidden">
          <p class="at-tool-desc">Evaluate a source's credibility. Paste the URL, abstract, or an excerpt.</p>
          <div class="at-source-types">
            <button class="at-type-pill active" data-type="journal">Journal</button>
            <button class="at-type-pill" data-type="website">Website</button>
            <button class="at-type-pill" data-type="book">Book</button>
            <button class="at-type-pill" data-type="news">News</button>
            <button class="at-type-pill" data-type="social">Social Media</button>
          </div>
          <textarea id="at-source-input" class="at-textarea" rows="5" placeholder="Paste URL, abstract, or excerpt here..."></textarea>
          <button class="at-run-btn" id="at-source-btn">Evaluate Source</button>
          <div id="at-source-output" class="at-output hidden"></div>
        </section>

        <section id="at-argument" class="at-tool-section hidden">
          <p class="at-tool-desc">Map the argument structure of your paragraph or essay section.</p>
          <textarea id="at-argument-input" class="at-textarea" rows="5" placeholder="Paste your paragraph or essay section here..."></textarea>
          <button class="at-run-btn" id="at-argument-btn">Map Argument</button>
          <div id="at-argument-output" class="at-output hidden"></div>
        </section>

      </div>
    </div>
  `;
  document.body.appendChild(widget);

  document.getElementById('ai-tools-toggle').addEventListener('click', toggleTools);
  document.getElementById('ai-tools-close').addEventListener('click', toggleTools);

  document.querySelectorAll('.ai-tools-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tool));
  });

  document.querySelectorAll('.at-type-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.at-type-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  document.getElementById('at-writing-btn').addEventListener('click', () => runTool('writing'));
  document.getElementById('at-source-btn').addEventListener('click', () => runTool('source'));
  document.getElementById('at-argument-btn').addEventListener('click', () => runTool('argument'));

  initPanelResize('ai-tools-panel', 'ai-tools-resize', 320, 680, 320, 380);

  // Expose for recommendation card buttons
  window._openAIToolsTab = (tab) => {
    const panel = document.getElementById('ai-tools-panel');
    if (panel?.classList.contains('hidden')) toggleTools();
    switchTab(tab);
  };
}

function toggleTools() {
  toolsIsOpen = !toolsIsOpen;
  const panel = document.getElementById('ai-tools-panel');
  if (toolsIsOpen) {
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
}

function switchTab(tool) {
  window._atState.activeTool = tool;

  document.querySelectorAll('.ai-tools-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tool === tool);
  });

  document.querySelectorAll('.at-tool-section').forEach(s => {
    s.classList.add('hidden');
  });
  document.getElementById(`at-${tool}`).classList.remove('hidden');
}

/**
 * Updates context when navigating to a new unit.
 * Hides widget on assessments; auto-activates most relevant tab.
 */
export function updateAIToolsContext(unit) {
  const widget = document.getElementById('ai-tools-widget');
  if (!widget) return;

  if (!unit || unit.isAssessment) {
    widget.style.display = 'none';
    window._atState.currentUnit = null;
    return;
  }

  // Tools are student-facing only
  const role = window._viewAsStudent ? 'student' : (STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student');
  if (role === 'lecturer' || role === 'tutor') {
    widget.style.display = 'none';
    return;
  }

  widget.style.display = 'block';
  window._atState.currentUnit = { id: unit.id, title: unit.title, phase: unit.phase };

  // Auto-activate the most relevant tab based on unit number
  const unitNum = parseInt((unit.id || '').replace(/[^0-9]/g, ''), 10) || 0;
  let defaultTab = 'writing';
  if (unitNum >= 4 && unitNum <= 9) defaultTab = 'source';
  else if (unitNum >= 16 && unitNum <= 18) defaultTab = 'argument';

  switchTab(defaultTab);
}

// ── Tool Runner ───────────────────────────────

async function runTool(tool) {
  const inputEl = document.getElementById(`at-${tool}-input`);
  const input = inputEl?.value.trim();
  if (!input) {
    alert('Please enter some text first.');
    return;
  }

  const outputEl = document.getElementById(`at-${tool}-output`);
  outputEl.classList.remove('hidden');
  outputEl.innerHTML = '<p class="at-loading">Analysing...</p>';

  const unitTitle = window._atState.currentUnit?.title || 'Academic Literacies';
  let system, prompt;

  if (tool === 'writing') {
    const scaffoldLevel = getScaffoldLevel('evidence_use');
    if (scaffoldLevel === 'scaffolded') {
      system = `You are a writing coach for university students studying "${unitTitle}". This student is currently developing their evidence use skills and needs structured support.

Provide feedback in EXACTLY this format:

## Argument Clarity [X/5]
[Feedback here]

## Evidence [X/5]
[Feedback, then provide a FILL-IN-THE-BLANKS template: "According to [Author (Year)], [specific finding]. This shows that [explanation of how it supports the argument]."]

## Tone [X/5]
[Feedback here]

## Structure [X/5]
[Feedback here]

## Top 3 Suggestions
1. [Suggestion]
2. [Suggestion]
3. [Suggestion]

Be warm, specific, and use the scaffolded template to guide them toward correct evidence use.`;
    } else if (scaffoldLevel === 'guided') {
      system = `You are a writing coach for university students studying "${unitTitle}". Guide this student with questions to deepen their thinking.

Provide feedback in EXACTLY this format:

## Argument Clarity [X/5]
[Feedback, then end with one guiding question]

## Evidence [X/5]
[Feedback, then ask: "What specific source supports this claim, and how does it connect to your argument?"]

## Tone [X/5]
[Feedback here]

## Structure [X/5]
[Feedback here]

## Top 3 Suggestions
1. [Suggestion]
2. [Suggestion]
3. [Suggestion]

Use Socratic questioning to guide rather than just evaluate.`;
    } else {
      system = `You are a writing coach for university students studying "${unitTitle}". Provide structured feedback in EXACTLY this format:

## Argument Clarity [X/5]
[Feedback here]

## Evidence [X/5]
[Feedback here]

## Tone [X/5]
[Feedback here]

## Structure [X/5]
[Feedback here]

## Top 3 Suggestions
1. [Suggestion]
2. [Suggestion]
3. [Suggestion]

Be constructive, specific, and encouraging. Focus on academic writing skills.`;
    }
    prompt = `Please evaluate this student writing:\n\n${input}`;

  } else if (tool === 'source') {
    const sourceType = document.querySelector('.at-type-pill.active')?.dataset.type || 'unknown';
    system = `You are an academic source evaluator. Evaluate the provided source and respond in EXACTLY this format:

## Source Type
[Type of source]

## Credibility Rating [X/10]
[Brief justification]

## Strengths
- [Strength 1]
- [Strength 2]

## Red Flags
⚠ [Red flag if any, or "None identified"]

## Bias Assessment
[Brief bias analysis]

## Verdict
[1-2 sentence overall assessment — is this a good academic source?]

Be rigorous and educational.`;
    prompt = `Source type indicated by student: ${sourceType}\n\nSource content:\n${input}`;

  } else if (tool === 'argument') {
    system = `You are an argument analysis expert. Analyze the provided text and return ONLY valid JSON with no markdown fences, no extra text, just the raw JSON object:
{"main_claim":"string","claim_strength":1,"evidence":["string"],"evidence_quality":1,"counter_arguments":["string"],"logical_gaps":["string"],"reasoning_type":"string","overall_score":1,"one_improvement":"string"}
Replace the numeric placeholders with actual integers (1-5 for strengths/quality, 1-10 for overall_score).`;
    prompt = `Analyze the argument structure of this text:\n\n${input}`;
  }

  try {
    const raw = await window._aiChat(prompt, { system, maxTokens: 1200 });

    if (tool === 'writing') {
      outputEl.innerHTML = renderWritingFeedback(raw);
      _captureWritingScores(raw);
    } else if (tool === 'source') {
      outputEl.innerHTML = renderSourceEvaluation(raw);
      _captureSourceScore(raw);
    } else if (tool === 'argument') {
      try {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleaned);
        outputEl.innerHTML = renderArgumentMap(data);
        _captureArgumentScores(data);
      } catch {
        outputEl.innerHTML = `<div class="at-fallback"><pre>${escapeHtml(raw)}</pre></div>`;
      }
    }
  } catch (err) {
    outputEl.innerHTML = `<p class="at-error">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// ── Output Renderers ──────────────────────────

function renderWritingFeedback(raw) {
  const sections = ['Argument Clarity', 'Evidence', 'Tone', 'Structure'];
  let html = '<div class="at-writing-feedback">';

  sections.forEach(name => {
    const regex = new RegExp(`## ${name} \\[(\\d)\/5\\]([\\s\\S]*?)(?=## |$)`);
    const match = raw.match(regex);
    if (match) {
      const score = parseInt(match[1], 10);
      const text = match[2].trim();
      const dots = Array.from({ length: 5 }, (_, i) =>
        `<span class="at-dot ${i < score ? 'filled' : ''}"></span>`
      ).join('');
      html += `
        <div class="at-score-card">
          <div class="at-score-card-header">
            <span class="at-score-label">${name}</span>
            <span class="at-score-dots">${dots}</span>
          </div>
          <p class="at-score-text">${escapeHtml(text)}</p>
        </div>`;
    }
  });

  const suggestionsMatch = raw.match(/## Top 3 Suggestions([\s\S]*?)$/);
  if (suggestionsMatch) {
    const suggs = suggestionsMatch[1].trim().split('\n')
      .filter(l => /^\d\./.test(l.trim()))
      .map(l => l.replace(/^\d\.\s*/, '').trim());
    if (suggs.length) {
      html += '<div class="at-suggestions-section"><p class="at-suggestions-label">Top 3 Suggestions</p>';
      suggs.forEach((s, i) => {
        html += `<div class="at-suggestion-pill">${i + 1}. ${escapeHtml(s)}</div>`;
      });
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

function renderSourceEvaluation(raw) {
  const ratingMatch = raw.match(/## Credibility Rating \[(\d+)\/10\]/);
  const score = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

  let badgeColor = '#fbbf24';
  if (score !== null) {
    if (score >= 8) badgeColor = '#10b981';
    else if (score <= 4) badgeColor = '#ef4444';
  }

  const verdictMatch = raw.match(/## Verdict\n([\s\S]*?)$/);
  const verdict = verdictMatch ? verdictMatch[1].trim() : '';

  const formatted = raw
    .replace(/## (.+)/g, '<strong class="at-section-heading">$1</strong>')
    .replace(/⚠/g, '<span class="at-red-flag">⚠</span>')
    .replace(/\n/g, '<br>');

  let html = '<div class="at-source-eval">';

  if (score !== null) {
    html += `<div class="at-credibility-badge" style="background:${badgeColor}">${score}<span>/10</span></div>`;
  }

  html += `<div class="at-eval-body">${formatted}</div>`;

  if (verdict) {
    html += `<div class="at-verdict-banner" style="background:${badgeColor}22; border-left:4px solid ${badgeColor}">${escapeHtml(verdict)}</div>`;
  }

  html += '</div>';
  return html;
}

function renderArgumentMap(data) {
  const claimDots = Array.from({ length: 5 }, (_, i) =>
    `<span class="at-dot ${i < (data.claim_strength || 0) ? 'filled' : ''}"></span>`
  ).join('');

  const evidenceHtml = (data.evidence || []).map(e =>
    `<div class="at-map-item at-map-evidence">${escapeHtml(e)}</div>`
  ).join('') || '<div class="at-map-item">No evidence identified</div>';

  const gapsHtml = (data.logical_gaps || []).map(g =>
    `<div class="at-map-item at-map-gap">⚠ ${escapeHtml(g)}</div>`
  ).join('') || '<div class="at-map-item">No gaps identified</div>';

  const counterHtml = (data.counter_arguments || []).map(c =>
    `<div class="at-map-item at-map-counter">${escapeHtml(c)}</div>`
  ).join('');

  const score = data.overall_score || 0;
  const scoreColor = score >= 8 ? '#10b981' : score >= 5 ? '#fbbf24' : '#ef4444';

  return `
    <div class="at-argument-map">
      <div class="at-map-claim">
        <p class="at-map-label">Main Claim</p>
        <p class="at-map-claim-text">${escapeHtml(data.main_claim || '')}</p>
        <div class="at-score-dots">${claimDots}</div>
      </div>
      <div class="at-map-columns">
        <div class="at-map-col">
          <p class="at-map-col-label">Evidence</p>
          ${evidenceHtml}
        </div>
        <div class="at-map-col at-map-col-gaps">
          <p class="at-map-col-label">Logical Gaps</p>
          ${gapsHtml}
        </div>
      </div>
      ${counterHtml ? `<div class="at-map-counters"><p class="at-map-col-label">Counter-Arguments</p>${counterHtml}</div>` : ''}
      <div class="at-map-footer">
        <div class="at-map-score" style="background:${scoreColor}">${score}<span>/10</span></div>
        <p class="at-map-improvement">💡 ${escapeHtml(data.one_improvement || '')}</p>
      </div>
    </div>`;
}

// ── Score Capture ─────────────────────────────

function _captureWritingScores(raw) {
  const map = {
    'Argument Clarity': 'argument_structure',
    'Evidence':         'evidence_use',
    'Tone':             'academic_tone',
  };
  Object.entries(map).forEach(([label, skillId]) => {
    const match = raw.match(new RegExp(`## ${label} \\[(\\d)\/5\\]`));
    if (match) recordSkillScore(skillId, parseInt(match[1], 10), 5, 'writing_coach');
  });
}

function _captureSourceScore(raw) {
  const match = raw.match(/## Credibility Rating \[(\d+)\/10\]/);
  if (match) recordSkillScore('source_evaluation', parseInt(match[1], 10), 10, 'source_evaluator');
}

function _captureArgumentScores(data) {
  if (data.overall_score != null)    recordSkillScore('argument_structure', data.overall_score, 10, 'argument_mapper');
  if (data.evidence_quality != null) recordSkillScore('evidence_use', data.evidence_quality, 5, 'argument_mapper');
}

// ── Helpers ───────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Panel resize (top-left drag handle) ───────
function initPanelResize(panelId, handleId, minW, maxW, minH, defaultW) {
  const panel  = document.getElementById(panelId);
  const handle = document.getElementById(handleId);
  if (!panel || !handle) return;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = panel.offsetWidth;
    const startH = panel.offsetHeight;

    const onMove = (e) => {
      // dragging left → wider; dragging up → taller
      const w = Math.max(minW, Math.min(maxW, startW + (startX - e.clientX)));
      const h = Math.max(minH, Math.min(window.innerHeight * 0.85, startH + (startY - e.clientY)));
      panel.style.width  = w + 'px';
      panel.style.height = h + 'px';
      // Scale text proportionally with panel width
      const scale = Math.max(0.85, Math.min(2.2, w / defaultW));
      panel.style.setProperty('--pz', scale);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

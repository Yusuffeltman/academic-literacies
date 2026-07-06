// src/components/activities.js
// ─────────────────────────────────────────────
// Reusable HTML generators for MCQ quizzes and
// reflective writing exercises.
// Called from unit content files — return HTML strings.
// ─────────────────────────────────────────────
import { _aiChat } from '../ai.js';
import { STATE, persistLocalStateSoon, saveState } from '../state.js';

const _activitySaveTimers = new Map();

function _savedExerciseValue(id) {
  const unitId = _unitIdFromState();
  return STATE.progress?.[unitId]?.exercises?.[id] || '';
}

function _queueActivityDraftSave(scope = 'default') {
  const key = String(scope || 'default');
  const existing = _activitySaveTimers.get(key);
  if (existing) clearTimeout(existing);
  try {
    syncActivitiesToState();
    persistLocalStateSoon('activities');
  } catch (err) {
    console.error('Activity local draft save failed:', err);
  }
  _activitySaveTimers.set(key, setTimeout(async () => {
    try {
      syncActivitiesToState();
      await saveState();
    } catch (err) {
      console.error('Activity draft save failed:', err);
    } finally {
      _activitySaveTimers.delete(key);
    }
  }, 600));
}

// ── MCQ Quiz ─────────────────────────────────
// Returns an HTML string for a multiple-choice question.
// id      : unique string (e.g. 'q1')
// question: string
// options : string[]
// correct : index of correct option (0-based)
// feedback: string shown on correct answer
export function quiz(id, question, options, correct, feedback) {
  const optHtml = options
    .map((o, i) => `
      <div class="ivp-opt" onclick="checkQuiz('${id}', ${i}, ${correct}, \`${feedback.replace(/`/g, '\\`')}\`)">
        <span class="ivp-let">${String.fromCharCode(65 + i)}</span>
        ${o}
      </div>`)
    .join('');

  return `
    <div class="quiz-block" id="quiz-${id}">
      <div class="ex-lbl">Quick Check</div>
      <p class="ivp-card-q" style="font-size:17px;">${question}</p>
      <div id="opts-${id}">${optHtml}</div>
      <div id="fb-quiz-${id}" style="display:none;"></div>
    </div>`;
}

window.checkQuiz = (id, chosen, correct, feedback) => {
  const opts = document.getElementById(`opts-${id}`);
  const fb = document.getElementById(`fb-quiz-${id}`);
  if (!opts || fb.style.display !== 'none') return; // already answered

  [...opts.querySelectorAll('.ivp-opt')].forEach((el, i) => {
    el.style.pointerEvents = 'none';
    if (i === correct) el.style.background = '#dcfce7';
    if (i === chosen && chosen !== correct) el.style.background = '#fee2e2';
  });

  fb.style.display = 'block';
  fb.innerHTML = chosen === correct
    ? `<div style="color:#15803d;padding:12px;background:#dcfce7;border-radius:8px;margin-top:10px;">${feedback}</div>`
    : `<div style="color:#b91c1c;padding:12px;background:#fee2e2;border-radius:8px;margin-top:10px;">Not quite. ${feedback}</div>`;

  // Save quiz result to progress
  const unitId = `u${STATE.activeUnit + 1}`;
  if (!STATE.progress[unitId]) STATE.progress[unitId] = {};
  if (!STATE.progress[unitId].quizScores) STATE.progress[unitId].quizScores = {};
  STATE.progress[unitId].quizScores[id] = chosen === correct ? 1 : 0;
  saveState();
};

// ── Reflective Exercise ───────────────────────
// Returns HTML string for a text-input exercise with AI feedback.
// id      : unique string
// title   : heading
// placeholder: textarea hint
// prompt  : instruction shown to student
// context : passed to Gemini for informed feedback
export function exercise(id, title, placeholder, prompt, context) {
  const savedValue = _savedExerciseValue(id);
  return `
    <div class="ex-block">
      <label class="ex-lbl">${title}</label>
      <p style="font-size:14px;margin-bottom:12px;">${prompt}</p>
      <textarea
        id="ex-${id}"
        class="ex-ta"
        placeholder="${placeholder}"
        rows="5"
        oninput="queueActivityDraftSave('exercise-${id}')"
      >${_escapeHtml(savedValue)}</textarea>
      <button class="btn-feedback" onclick="getAIFeedback('ex-${id}', \`${context.replace(/`/g, '\\`')}\`)">
        ✨ Get Tutor Feedback
      </button>
      <div id="fb-ex-${id}" class="ai-feedback"></div>
    </div>`;
}

export function pathwayChallenge(id, config = {}) {
  const {
    title = 'Pathway Challenge',
    intro = 'Choose one pathway for this unit. You can move up as your confidence increases.',
    supportedTitle = 'Supported',
    supportedTasks = [],
    coreTitle = 'Core',
    coreTasks = [],
    advancedTitle = 'Advanced',
    advancedTasks = [],
  } = config;

  const renderTasks = (list = []) => {
    const safe = Array.isArray(list) ? list : [];
    if (!safe.length) return '<li>Complete the default unit activity.</li>';
    return safe
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .map((item) => `<li>${_escapeHtml(item)}</li>`)
      .join('');
  };

  return `
      <div class="concept-card" id="pathway-${id}">
        <div class="concept-card-label">${_escapeHtml(title)}</div>
        <p style="margin-bottom:12px;">${_escapeHtml(intro)}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;">
            <div style="font-weight:700;color:var(--navy);font-size:13px;margin-bottom:6px;">${_escapeHtml(supportedTitle)}</div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Minimum completion track</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--muted);line-height:1.6;">${renderTasks(supportedTasks)}</ul>
          </div>
          <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;">
            <div style="font-weight:700;color:var(--navy);font-size:13px;margin-bottom:6px;">${_escapeHtml(coreTitle)}</div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Expected proficiency track</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--muted);line-height:1.6;">${renderTasks(coreTasks)}</ul>
          </div>
          <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;">
            <div style="font-weight:700;color:var(--navy);font-size:13px;margin-bottom:6px;">${_escapeHtml(advancedTitle)}</div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Stretch and extension track</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:var(--muted);line-height:1.6;">${renderTasks(advancedTasks)}</ul>
          </div>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--muted);">Complete one track fully, then record your evidence and reflection in the learning cycle.</div>
      </div>`;
}

export function essayMilestone(id, config = {}) {
  const {
    title = 'Essay Progression Milestone',
    target = 'Build one step toward your full academic essay.',
    checklist = [],
  } = config;

  const checks = (Array.isArray(checklist) ? checklist : [])
    .map((item) => `<li>${_escapeHtml(item)}</li>`)
    .join('') || '<li>Complete this unit writing task in your own voice.</li>';

  return `
      <div class="ex-block" id="essay-ms-${id}">
        <label class="ex-lbl">${_escapeHtml(title)}</label>
        <p style="font-size:14px;margin-bottom:10px;">${_escapeHtml(target)}</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.7;">${checks}</ul>
        <div style="margin-top:10px;font-size:12px;color:var(--muted);">Use this milestone as the required evidence checkpoint for your next draft revision cycle.</div>
      </div>`;
}

export function portfolioEvidence(id, config = {}) {
  const {
    title = 'Capability Portfolio Transfer',
    target = 'Add one transfer artifact to prove you can apply this skill elsewhere.',
  } = config;

  const unitId = _unitIdFromState();
  const portfolio = STATE.progress?.[unitId]?.portfolio || {};
  const existing = portfolio[id] || {};

  const savedAtLabel = existing?.savedAt
    ? new Date(existing.savedAt).toLocaleString()
    : '';

  return `
      <div class="concept-card" id="portfolio-${id}">
        <div class="concept-card-label">${_escapeHtml(title)}</div>
        <p style="font-size:14px;margin-bottom:10px;">${_escapeHtml(target)}</p>
        
        <label class="ex-lbl" style="font-size:12px;">Artifact Link/Description</label>
        <textarea id="port-link-${id}" class="ex-ta" rows="2" placeholder="Paste a link to your evidence or describe the artifact..." oninput="queueActivityDraftSave('portfolio-${id}')">${_escapeHtml(existing.link || '')}</textarea>

        <label class="ex-lbl" style="font-size:12px;">Transfer Justification</label>
        <textarea id="port-just-${id}" class="ex-ta" rows="3" placeholder="How does this artifact show transfer of the academic literacy skill?" oninput="queueActivityDraftSave('portfolio-${id}')">${_escapeHtml(existing.justification || '')}</textarea>

        <button class="btn-feedback" onclick="savePortfolioEvidence('${id}')">📁 Save to Portfolio</button>

        <div id="port-status-${id}" class="ai-feedback show" style="margin-top:10px;display:${savedAtLabel ? 'block' : 'none'};">
          ${savedAtLabel ? `<div class="ai-feedback-body">Saved to portfolio: ${_escapeHtml(savedAtLabel)}</div>` : ''}
        </div>
      </div>`;
}

window.savePortfolioEvidence = async (id) => {
  const unitId = _unitIdFromState();
  const link = document.getElementById(`port-link-${id}`)?.value?.trim() || '';
  const justification = document.getElementById(`port-just-${id}`)?.value?.trim() || '';
  const statusEl = document.getElementById(`port-status-${id}`);

  if (!STATE.progress[unitId]) STATE.progress[unitId] = {};
  if (!STATE.progress[unitId].portfolio) STATE.progress[unitId].portfolio = {};

  STATE.progress[unitId].portfolio[id] = {
    link,
    justification,
    savedAt: new Date().toISOString()
  };

  await saveState();

  if (typeof window.trackLearningEvent === 'function') {
    window.trackLearningEvent('portfolio_artifact_added', {
      unitId,
      portfolioId: id,
      hasLink: Boolean(link),
      hasJustification: Boolean(justification),
    });
  }

  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<div class="ai-feedback-body">Saved to portfolio: ${new Date().toLocaleString()}</div>`;
  }
};

function _unitIdFromState() {
  return `u${STATE.activeUnit + 1}`;
}

function _ensureHeutagogyStore(unitId) {
  if (!STATE.progress[unitId]) STATE.progress[unitId] = {};
  if (!STATE.progress[unitId].heutagogyCycles) STATE.progress[unitId].heutagogyCycles = {};
  return STATE.progress[unitId].heutagogyCycles;
}

function _escapeAttr(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function _escapeHtml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function heutagogyCycle(id, config = {}) {
  const {
    title = 'Self-Directed Learning Cycle',
    prompt = 'Set your goal, choose your pathway, and capture evidence of your learning decisions.',
    context = 'Academic literacies self-directed learning cycle',
    pathwayOptions = ['Supported', 'Core', 'Advanced'],
    evidenceHint = 'Paste a sentence, source title, or short note that proves your progress this week.',
  } = config;

  const unitId = _unitIdFromState();
  const existing = STATE.progress?.[unitId]?.heutagogyCycles?.[id] || {};
  const savedAtLabel = existing?.savedAt
    ? new Date(existing.savedAt).toLocaleString()
    : '';

  const optionHtml = pathwayOptions
    .map((opt) => {
      const selected = existing.pathway === opt ? 'selected' : '';
      return `<option value="${_escapeAttr(opt)}" ${selected}>${_escapeHtml(opt)}</option>`;
    })
    .join('');

  return `
      <div class="ex-block" id="hc-${id}">
        <label class="ex-lbl">${_escapeHtml(title)}</label>
        <p style="font-size:14px;margin-bottom:12px;">${_escapeHtml(prompt)}</p>

        <label class="ex-lbl" style="font-size:12px;">Learning Contract Goal</label>
        <textarea id="hc-goal-${id}" class="ex-ta" rows="3" placeholder="Write your specific goal for this unit (what you will improve and by when)." oninput="queueActivityDraftSave('heutagogy-${id}')">${_escapeHtml(existing.goal || '')}</textarea>

        <label class="ex-lbl" style="font-size:12px;">Pathway Choice</label>
        <select id="hc-pathway-${id}" class="ex-ta" style="height:50px; padding:0 16px; margin-bottom:12px;" onchange="queueActivityDraftSave('heutagogy-${id}')">
          <option value="">Select your challenge level</option>
          ${optionHtml}
        </select>

        <label class="ex-lbl" style="font-size:12px;">Double-Loop Reflection</label>
        <textarea id="hc-reflect-${id}" class="ex-ta" rows="3" placeholder="What assumption did you revise while learning this unit? What changed in your thinking?" oninput="queueActivityDraftSave('heutagogy-${id}')">${_escapeHtml(existing.reflection || '')}</textarea>

        <label class="ex-lbl" style="font-size:12px;">Evidence Note</label>
        <textarea id="hc-evidence-${id}" class="ex-ta" rows="3" placeholder="${_escapeAttr(evidenceHint)}" oninput="queueActivityDraftSave('heutagogy-${id}')">${_escapeHtml(existing.evidence || '')}</textarea>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-feedback" onclick="saveHeutagogyCycle('${id}')">💾 Save Learning Cycle</button>
          <button class="btn-feedback" onclick="getHeutagogyCoachFeedback('${id}', \`${String(context).replace(/`/g, '\\`')}\`)">✨ Ask Metacognitive Coach</button>
        </div>

        <div id="hc-status-${id}" class="ai-feedback show" style="margin-top:10px;display:${savedAtLabel ? 'block' : 'none'};">
          ${savedAtLabel ? `<div class="ai-feedback-body">Saved: ${_escapeHtml(savedAtLabel)}</div>` : ''}
        </div>

        <div id="hc-coach-${id}" class="ai-feedback" style="margin-top:10px;"></div>
      </div>`;
}

window.saveHeutagogyCycle = async (id) => {
  const unitId = _unitIdFromState();
  const goal = document.getElementById(`hc-goal-${id}`)?.value?.trim() || '';
  const pathway = document.getElementById(`hc-pathway-${id}`)?.value?.trim() || '';
  const reflection = document.getElementById(`hc-reflect-${id}`)?.value?.trim() || '';
  const evidence = document.getElementById(`hc-evidence-${id}`)?.value?.trim() || '';
  const statusEl = document.getElementById(`hc-status-${id}`);

  if (reflection) {
    const wordCount = reflection.split(/\\s+/).filter(w => w.length > 0).length;
    if (wordCount < 80) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'ai-feedback show error';
        statusEl.innerHTML = `<div class="ai-feedback-body" style="color:#b91c1c;">Your reflection has ${wordCount} words. Phase 1 requires a minimum of 80 words for deep double-loop reflection.</div>`;
      }
      return;
    }
  }

  const store = _ensureHeutagogyStore(unitId);
  store[id] = {
    goal,
    pathway,
    reflection,
    evidence,
    savedAt: new Date().toISOString(),
  };

  await saveState();

  if (typeof window.trackLearningEvent === 'function') {
    window.trackLearningEvent('heutagogy_cycle_saved', {
      unitId,
      cycleId: id,
      pathway: pathway || null,
      hasGoal: Boolean(goal),
      hasReflection: Boolean(reflection),
      hasEvidence: Boolean(evidence),
    });
  }

  if (!statusEl) return;
  statusEl.style.display = 'block';
  statusEl.className = 'ai-feedback show';
  statusEl.innerHTML = `<div class="ai-feedback-body">Saved: ${new Date().toLocaleString()}</div>`;
};

window.getHeutagogyCoachFeedback = async (id, context) => {
  const goal = document.getElementById(`hc-goal-${id}`)?.value?.trim() || '';
  const pathway = document.getElementById(`hc-pathway-${id}`)?.value?.trim() || '';
  const reflection = document.getElementById(`hc-reflect-${id}`)?.value?.trim() || '';
  const evidence = document.getElementById(`hc-evidence-${id}`)?.value?.trim() || '';
  const fbEl = document.getElementById(`hc-coach-${id}`);
  if (!fbEl) return;

  if (!goal && !reflection && !evidence) {
    fbEl.className = 'ai-feedback show';
    fbEl.innerHTML = '<div class="ai-feedback-body">Write at least one field before requesting coach feedback.</div>';
    return;
  }

  fbEl.className = 'ai-feedback show';
  fbEl.innerHTML = `<div class="ai-loading"><div class="spinner"></div>Coaching your next step…</div>`;

  const coachPrompt = [
    'You are a metacognitive coach for first-year Academic Literacies students.',
    'Give concise, practical feedback in 3 sections: 1) What is strong, 2) What is missing, 3) One specific next action for planning, reflecting, or revising.',
    'Prioritise learner agency, evidence quality, and challenge level calibration (Supported/Core/Advanced).',
    `Context: ${context}`,
    `Student goal: ${goal || 'N/A'}`,
    `Pathway: ${pathway || 'Not selected'}`,
    `Reflection: ${reflection || 'N/A'}`,
    `Evidence note: ${evidence || 'N/A'}`,
  ].join('\n');

  try {
    const fbTxt = await _aiChat(coachPrompt, { maxTokens: 260 });
    fbEl.innerHTML = `
        <div class="ai-feedback-header">
          <div class="ai-feedback-icon">🧭</div>
          <div class="ai-feedback-title">Metacognitive Coach</div>
        </div>
        <div class="ai-feedback-body">${fbTxt.replace(/\n/g, '<br>')}</div>`;

    if (typeof window.trackLearningEvent === 'function') {
      window.trackLearningEvent('heutagogy_coach_requested', {
        unitId: _unitIdFromState(),
        cycleId: id,
        pathway: pathway || null,
      });
    }
  } catch (err) {
    fbEl.innerHTML = `<div style="padding:16px;color:red;">Coach unavailable: ${_escapeHtml(err.message)}</div>`;
  }
};

window.getAIFeedback = async (inputId, context) => {
  const text = document.getElementById(inputId)?.value ?? '';
  if (text.length < 20) { alert('Please write a bit more first.'); return; }

  const fbEl = document.getElementById(`fb-${inputId}`);
  fbEl.className = 'ai-feedback show';
  fbEl.innerHTML = `<div class="ai-loading"><div class="spinner"></div>Analysing your insight…</div>`;

  const sysPrompt = `You are an expert tutor in "Academic Literacies". Give feedback on a student's exercise. Be professional, academic, yet encouraging. Highlight strengths and suggest one area for deeper reflection. CONTEXT: ${context}`;

  try {
    const fullPrompt = `${sysPrompt}\n\nStudent writing: "${text}"`;
    const fbTxt = await _aiChat(fullPrompt, { maxTokens: 300 });
    fbEl.innerHTML = `
      <div class="ai-feedback-header">
        <div class="ai-feedback-icon">✨</div>
        <div class="ai-feedback-title">Tutor Insight</div>
      </div>
      <div class="ai-feedback-body">${fbTxt.replace(/\n/g, '<br>')}</div>`;
  } catch (err) {
    fbEl.innerHTML = `<div style="padding:20px;color:red">AI unavailable: ${err.message}</div>`;
  }
};

export function syncActivitiesToState() {
  const unitId = _unitIdFromState();
  if (!STATE.progress[unitId]) STATE.progress[unitId] = {};

  // 1. Sync reflective exercises
  document.querySelectorAll('.ex-ta[id^="ex-"]').forEach((ta) => {
    const id = ta.id.replace('ex-', '');
    if (!STATE.progress[unitId].exercises) STATE.progress[unitId].exercises = {};
    STATE.progress[unitId].exercises[id] = ta.value;
  });

  // 2. Sync portfolio evidence
  document.querySelectorAll('.ex-ta[id^="port-link-"]').forEach((ta) => {
    const id = ta.id.replace('port-link-', '');
    if (!STATE.progress[unitId].portfolio) STATE.progress[unitId].portfolio = {};
    if (!STATE.progress[unitId].portfolio[id]) STATE.progress[unitId].portfolio[id] = {};
    STATE.progress[unitId].portfolio[id].link = ta.value;
  });
  document.querySelectorAll('.ex-ta[id^="port-just-"]').forEach((ta) => {
    const id = ta.id.replace('port-just-', '');
    if (!STATE.progress[unitId].portfolio) STATE.progress[unitId].portfolio = {};
    if (!STATE.progress[unitId].portfolio[id]) STATE.progress[unitId].portfolio[id] = {};
    STATE.progress[unitId].portfolio[id].justification = ta.value;
  });

  // 3. Sync heutagogy cycles
  document.querySelectorAll('[id^="hc-"]').forEach((el) => {
    const idMatch = el.id.match(/^hc-(goal|pathway|reflect|evidence)-(.*)$/);
    if (!idMatch) return;
    const [_, field, cycleId] = idMatch;
    const store = _ensureHeutagogyStore(unitId);
    if (!store[cycleId]) store[cycleId] = { goal: '', pathway: '', reflection: '', evidence: '', savedAt: null };

    if (field === 'goal' || field === 'reflect' || field === 'evidence') {
      store[cycleId][field === 'reflect' ? 'reflection' : field] = el.value;
    } else if (field === 'pathway') {
      store[cycleId].pathway = el.value;
    }
  });
}

window.syncActivitiesToState = syncActivitiesToState;
window.queueActivityDraftSave = _queueActivityDraftSave;

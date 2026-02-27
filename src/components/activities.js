// src/components/activities.js
// ─────────────────────────────────────────────
// Reusable HTML generators for MCQ quizzes and
// reflective writing exercises.
// Called from unit content files — return HTML strings.
// ─────────────────────────────────────────────
import { _aiChat } from '../ai.js';
import { STATE, saveState } from '../state.js';

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
  const fb   = document.getElementById(`fb-quiz-${id}`);
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
  return `
    <div class="ex-block">
      <label class="ex-lbl">${title}</label>
      <p style="font-size:14px;margin-bottom:12px;">${prompt}</p>
      <textarea
        id="ex-${id}"
        class="ex-ta"
        placeholder="${placeholder}"
        rows="5"
      ></textarea>
      <button class="btn-feedback" onclick="getAIFeedback('ex-${id}', \`${context.replace(/`/g, '\\`')}\`)">
        ✨ Get Tutor Feedback
      </button>
      <div id="fb-ex-${id}" class="ai-feedback"></div>
    </div>`;
}

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

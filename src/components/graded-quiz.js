// src/components/graded-quiz.js
// ─────────────────────────────────────────────
// Student UI for the graded (summative) quizzes.
//   • Home: one card per quiz — best score, pass status, attempts remaining,
//     and buttons to start a counted attempt or an unlimited practice run.
//   • Runner: renders the sampled questions; on submit, writes the attempt.
//   • Gated feedback: during/after a COUNTED attempt, correct answers are NOT
//     shown until both attempts are used (remaining === 0). PRACTICE runs show
//     full feedback immediately (they never affect the mark).
//
// Pure logic lives in ../quiz-grading.js; persistence in ../quiz-attempts.js.
// ─────────────────────────────────────────────
import { GRADED_QUIZZES } from '../../content/quizzes/graded-quizzes.js';
import { normalizeQuiz } from '../quiz-grading.js';
import {
  loadMyQuizAttempts, startAttempt, submitCountedAttempt, submitPracticeAttempt, getMyQuizResult,
} from '../quiz-attempts.js';

let _container = null;
let _run = null; // { quiz, mode, itemIds, seed, startedAt }

function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _quizById(id) {
  return GRADED_QUIZZES.find((q) => q.quizId === id) || null;
}
function _passColor(passed) { return passed ? '#166534' : '#92400e'; }
function _passBg(passed) { return passed ? '#ecfdf5' : '#fffbeb'; }

// ── Home ─────────────────────────────────────
export async function renderGradedQuizzes(container) {
  if (!container) return;
  _container = container;
  _run = null;
  container.innerHTML = `<div style="max-width:820px;margin:0 auto;padding:20px 16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
      <div>
        <h2 style="margin:0;color:var(--navy);font-size:22px;">Quizzes</h2>
        <p style="margin:6px 0 0 0;color:var(--muted);font-size:13px;line-height:1.6;max-width:640px;">Each quiz gives you <strong>two attempts</strong> — your <strong>best score counts</strong>, and 60% is a pass. Practice as much as you like first; practice never affects your mark.</p>
      </div>
      <button class="btn-prev" style="display:inline-flex;" onclick="window.goToStudentDashboard?.()">← Dashboard</button>
    </div>
    <div id="graded-quiz-list" style="display:grid;gap:14px;">
      <div style="color:var(--muted);font-size:13px;padding:12px;">Loading your quizzes…</div>
    </div>
  </div>`;

  const list = container.querySelector('#graded-quiz-list');
  const cards = [];
  for (const raw of GRADED_QUIZZES) {
    const q = normalizeQuiz(raw);
    let result;
    try { result = await getMyQuizResult(q); }
    catch { result = { bestPct: null, passed: false, attemptsUsed: 0, remaining: q.maxAttempts }; }
    cards.push(_quizCard(raw, q, result));
  }
  if (list) list.innerHTML = cards.join('');
}

function _quizCard(raw, q, result) {
  const hasScore = result.bestPct != null;
  const badge = hasScore
    ? `<span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:${_passBg(result.passed)};color:${_passColor(result.passed)};border:1px solid ${result.passed ? '#bbf7d0' : '#fde68a'};">Best: ${result.bestPct}% · ${result.passed ? 'Pass' : 'Not yet'}</span>`
    : `<span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;">Not attempted</span>`;
  const canAttempt = result.remaining > 0;
  const startBtn = canAttempt
    ? `<button class="btn-next" style="display:inline-flex;" onclick="window._quizStart('${_esc(q.quizId)}','counted')">Start attempt (${result.remaining} of ${q.maxAttempts} left)</button>`
    : `<span style="font-size:12px;color:var(--muted);align-self:center;">Both attempts used</span>`;
  return `<div style="background:white;border:1px solid var(--border);border-radius:16px;padding:18px 20px;box-shadow:0 6px 18px rgba(15,23,42,.05);">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
      <div>
        <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">${_esc(raw.title || q.quizId)}</h3>
        <div style="font-size:12px;color:var(--muted);">${q.itemsPerAttempt} questions · best of ${q.maxAttempts} · 60% to pass · ${Math.round((q.weight || 0) * 100)}% of final mark</div>
      </div>
      ${badge}
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
      ${startBtn}
      <button class="btn-prev" style="display:inline-flex;" onclick="window._quizStart('${_esc(q.quizId)}','practice')">Practice (unlimited)</button>
    </div>
  </div>`;
}

// ── Runner ───────────────────────────────────
window._quizStart = function (quizId, mode = 'counted') {
  const raw = _quizById(quizId);
  if (!raw || !_container) return;
  const q = normalizeQuiz(raw);
  const run = startAttempt(q); // { quizId, seed, itemIds, startedAt }
  _run = { raw, quiz: q, mode, ...run };
  _renderRunner();
};

function _renderRunner() {
  if (!_run || !_container) return;
  const { raw, quiz, mode, itemIds } = _run;
  const byId = new Map(quiz.itemBank.map((it) => [it.id, it]));
  const items = itemIds.map((id) => byId.get(id)).filter(Boolean);
  const isPractice = mode === 'practice';
  const questionsHtml = items.map((it, qi) => `
    <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:10px;">${qi + 1}. ${_esc(it.stem)}</div>
      <div style="display:grid;gap:8px;">
        ${it.options.map((opt, oi) => `
          <label style="display:flex;align-items:flex-start;gap:9px;padding:9px 11px;border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:#1e293b;">
            <input type="radio" name="gqopt-${_esc(it.id)}" value="${oi}" style="margin-top:2px;" />
            <span>${_esc(opt)}</span>
          </label>`).join('')}
      </div>
    </div>`).join('');
  _container.innerHTML = `<div style="max-width:820px;margin:0 auto;padding:20px 16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
      <h2 style="margin:0;color:var(--navy);font-size:20px;">${_esc(raw.title || quiz.quizId)}</h2>
      <span style="font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:${isPractice ? '#eff6ff' : '#fef3c7'};color:${isPractice ? '#1e40af' : '#92400e'};border:1px solid ${isPractice ? '#bfdbfe' : '#fde68a'};">${isPractice ? 'Practice (not counted)' : 'Counted attempt'}</span>
    </div>
    <p style="margin:0 0 16px 0;color:var(--muted);font-size:12px;">${isPractice ? 'This run is for practice — you’ll see full feedback and it does not affect your mark.' : 'Answer all questions, then submit. Correct answers are shown after your final attempt.'}</p>
    <div id="graded-quiz-questions">${questionsHtml}</div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;">
      <button class="btn-next" style="display:inline-flex;" onclick="window._quizSubmit()">Submit ${isPractice ? 'practice run' : 'attempt'}</button>
      <button class="btn-prev" style="display:inline-flex;" onclick="window.renderGradedQuizzesHome()">Cancel</button>
      <span id="graded-quiz-status" style="font-size:12px;color:var(--muted);"></span>
    </div>
  </div>`;
}

function _collectAnswers() {
  const answers = {};
  for (const id of _run.itemIds) {
    const checked = _container.querySelector(`input[name="gqopt-${CSS.escape(id)}"]:checked`);
    if (checked) answers[id] = Number(checked.value);
  }
  return answers;
}

window._quizSubmit = async function () {
  if (!_run) return;
  const answers = _collectAnswers();
  const answeredCount = Object.keys(answers).length;
  const statusEl = _container.querySelector('#graded-quiz-status');
  if (answeredCount < _run.itemIds.length) {
    const missing = _run.itemIds.length - answeredCount;
    if (!window.confirm(`${missing} question${missing === 1 ? '' : 's'} not answered — they will be marked wrong. Submit anyway?`)) return;
  }
  if (statusEl) statusEl.textContent = 'Saving…';
  const payload = { itemIds: _run.itemIds, answers, seed: _run.seed, startedAt: _run.startedAt };
  const res = _run.mode === 'practice'
    ? await submitPracticeAttempt(_run.quiz, payload)
    : await submitCountedAttempt(_run.quiz, payload);
  if (!res.ok) { if (statusEl) { statusEl.textContent = res.error || 'Could not save.'; statusEl.style.color = '#991b1b'; } return; }
  const result = res.result || await getMyQuizResult(_run.quiz).catch(() => null);
  _renderResults({ answers, scorePct: res.scorePct, result });
};

function _renderResults({ answers, scorePct, result }) {
  const { raw, quiz, mode, itemIds } = _run;
  const isPractice = mode === 'practice';
  const remaining = result ? result.remaining : null;
  // Gated feedback: reveal correct answers on practice, or once counted attempts are exhausted.
  const reveal = isPractice || (remaining === 0);
  const byId = new Map(quiz.itemBank.map((it) => [it.id, it]));

  const bestLine = (!isPractice && result && result.bestPct != null)
    ? `<div style="font-size:13px;color:var(--muted);margin-top:4px;">Best of your attempts: <strong style="color:${_passColor(result.passed)};">${result.bestPct}%</strong> · ${result.passed ? 'Pass' : 'Not yet a pass'}${remaining > 0 ? ` · ${remaining} attempt${remaining === 1 ? '' : 's'} left` : ' · both attempts used'}</div>`
    : '';

  const review = reveal ? itemIds.map((id, qi) => {
    const it = byId.get(id); if (!it) return '';
    const chosen = answers[id];
    const correct = it.correctIndex;
    const ok = Number(chosen) === Number(correct);
    return `<div style="background:white;border:1px solid ${ok ? '#bbf7d0' : '#fecaca'};border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="font-weight:700;color:var(--navy);font-size:13px;margin-bottom:8px;">${qi + 1}. ${_esc(it.stem)}</div>
      <div style="font-size:13px;color:${ok ? '#166534' : '#991b1b'};font-weight:700;">${ok ? '✓ Correct' : '✗ Not correct'}</div>
      ${!ok && chosen != null ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">Your answer: ${_esc(it.options[chosen] ?? '—')}</div>` : ''}
      <div style="font-size:12px;color:#166534;margin-top:2px;">Correct: ${_esc(it.options[correct])}</div>
      ${it.feedback ? `<div style="font-size:12px;color:#334155;margin-top:6px;line-height:1.5;">${_esc(it.feedback)}</div>` : ''}
    </div>`;
  }).join('') : `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;font-size:13px;color:#1e40af;">Your score is recorded. To keep the quiz fair, correct answers are revealed after your final attempt${remaining > 0 ? ` — you have ${remaining} attempt${remaining === 1 ? '' : 's'} left` : ''}. Use <strong>Practice</strong> to see full worked feedback any time.</div>`;

  const nextBtns = [];
  if (!isPractice && remaining > 0) nextBtns.push(`<button class="btn-next" style="display:inline-flex;" onclick="window._quizStart('${_esc(quiz.quizId)}','counted')">Use your next attempt</button>`);
  nextBtns.push(`<button class="btn-prev" style="display:inline-flex;" onclick="window._quizStart('${_esc(quiz.quizId)}','practice')">Practice again</button>`);
  nextBtns.push(`<button class="btn-prev" style="display:inline-flex;" onclick="window.renderGradedQuizzesHome()">Back to quizzes</button>`);

  _container.innerHTML = `<div style="max-width:820px;margin:0 auto;padding:20px 16px;">
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 6px 18px rgba(15,23,42,.05);margin-bottom:16px;">
      <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">${isPractice ? 'Practice result' : 'Attempt submitted'}</div>
      <div style="font-size:34px;font-weight:900;color:var(--navy);margin-top:4px;">${scorePct}%</div>
      ${bestLine}
    </div>
    <div style="margin-bottom:14px;">${review}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">${nextBtns.join('')}</div>
  </div>`;
}

// Convenience globals used by the runner buttons.
window.renderGradedQuizzesHome = function () { if (_container) renderGradedQuizzes(_container); };

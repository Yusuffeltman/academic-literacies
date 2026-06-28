// src/lesson-measurement.js
// ─────────────────────────────────────────────
// Lesson Presentation A/B — outcome measurement.
//
// Session-scoped capture of the experiment outcomes and a single
// `lesson_completed` event (per unit per session) carrying: arm,
// time-on-task, comprehension score, perceived effort (Paas), the
// reading-task writing level, and reading completion. Flows through the
// existing trackLearningEvent → xAPI pipeline.
//
// See docs/lesson-presentation-redesign-spec.md
// ─────────────────────────────────────────────

import { resolveArmForUser, isTestUnit } from './lesson-experiment.js';

const _openedAt = {};   // unitId -> epoch ms
const _data = {};       // unitId -> { comprehensionScore, comprehensionMax, effort }
const _logged = {};     // unitId -> true once lesson_completed has fired this session

// Pure: count correct answers. selected/correct are arrays of option indices.
export function scoreAnswers(selected, correct) {
  if (!Array.isArray(selected) || !Array.isArray(correct)) return { score: 0, max: 0 };
  const max = correct.length;
  let score = 0;
  for (let i = 0; i < max; i++) {
    if (Number(selected[i]) === Number(correct[i])) score++;
  }
  return { score, max };
}

// Pure: classify a student's prior knowledge into a band from skill_status.
// 'higher' if their tested skills average at/above "developing→strong"; else
// 'lower'; 'unknown' if nothing is tested yet. Proxy moderator for the
// expertise-reversal check (does segmentation help lower-knowledge students?).
export function priorKnowledgeBand(skillStatus) {
  const score = { weak: 0, developing: 1, strong: 2 };
  const vals = Object.values(skillStatus || {})
    .map((s) => score[s])
    .filter((v) => v != null);
  if (!vals.length) return 'unknown';
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return mean >= 1 ? 'higher' : 'lower';
}

// Dedupe lesson_completed events to the latest completion per student per unit.
function _dedupeLatest(events) {
  const latest = new Map();
  for (const e of (events || [])) {
    if (!e || e.eventType !== 'lesson_completed') continue;
    const m = e.meta || {};
    if (!m.unitId || !m.presentationArm) continue;
    const student = e.canonicalStudentKey || e.uid || 'unknown';
    const key = `${student}|${m.unitId}`;
    const prev = latest.get(key);
    if (!prev || String(e.trustedAt || '') > String(prev.trustedAt || '')) latest.set(key, e);
  }
  return [...latest.values()];
}

// Average the deduped events into groups defined by keyFn(meta).
function _summarise(events, keyFn) {
  const groups = {};
  for (const e of events) {
    const m = e.meta || {};
    const gkey = keyFn(m);
    const g = groups[gkey] || (groups[gkey] = {
      unitId: m.unitId, arm: m.presentationArm, band: m.priorKnowledge || 'unknown',
      n: 0, comp: [], effort: [], writing: [], complete: 0, time: [],
    });
    g.n++;
    if (Number(m.comprehensionMax) > 0 && m.comprehensionScore != null) g.comp.push((Number(m.comprehensionScore) / Number(m.comprehensionMax)) * 100);
    if (m.effort != null) g.effort.push(Number(m.effort));
    if (m.writingLevel != null) g.writing.push(Number(m.writingLevel));
    if (m.readingComplete) g.complete++;
    if (m.timeOnTaskMs != null) g.time.push(Number(m.timeOnTaskMs));
  }
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const round = (v, d) => (v == null ? null : Number(v.toFixed(d)));
  const summary = {};
  for (const [k, g] of Object.entries(groups)) {
    const t = mean(g.time);
    summary[k] = {
      unitId: g.unitId, arm: g.arm, band: g.band, n: g.n,
      comprehensionPct: round(mean(g.comp), 0),
      effort: round(mean(g.effort), 1),
      writingLevel: round(mean(g.writing), 1),
      completionPct: round(g.n ? (g.complete / g.n) * 100 : null, 0),
      timeMin: round(t != null ? t / 60000 : null, 1),
    };
  }
  return summary;
}

// By unit × arm (the primary comparison).
export function aggregateExperimentEvents(events) {
  return _summarise(_dedupeLatest(events), (m) => `${m.unitId}|${m.presentationArm}`);
}

// By unit × arm × prior-knowledge band (the spec's key moderator check).
export function aggregateExperimentBySubgroup(events) {
  return _summarise(_dedupeLatest(events), (m) => `${m.unitId}|${m.presentationArm}|${m.priorKnowledge || 'unknown'}`);
}

export function markLessonOpened(unitId) {
  if (!isTestUnit(unitId)) return;
  _openedAt[unitId] = Date.now();
  _logged[unitId] = false;
  if (!_data[unitId]) _data[unitId] = {};
}

export function recordComprehension(unitId, score, max) {
  if (!_data[unitId]) _data[unitId] = {};
  _data[unitId].comprehensionScore = score;
  _data[unitId].comprehensionMax = max;
}

export function recordEffort(unitId, rating) {
  if (!_data[unitId]) _data[unitId] = {};
  _data[unitId].effort = rating;
}

// Emit lesson_completed (once per unit per session). `user` is STATE.user.
export function completeLesson(unitId, { user = null } = {}) {
  if (!isTestUnit(unitId) || _logged[unitId]) return;
  const openedAt = _openedAt[unitId];
  const timeOnTaskMs = openedAt ? Date.now() - openedAt : null;
  const arm = resolveArmForUser(user, unitId);
  const d = _data[unitId] || {};

  let writingLevel = null;
  let readingComplete = false;
  let priorKnowledge = 'unknown';
  try {
    writingLevel = window?._rtState?.[`rt-${unitId}`]?.feedback?.level ?? null;
    readingComplete = !!window?.STATE?.progress?.[unitId]?.readingComplete;
    priorKnowledge = priorKnowledgeBand(window?.STATE?.adaptive?.skill_status);
  } catch { /* ignore */ }

  _logged[unitId] = true;
  window.trackLearningEvent?.('lesson_completed', {
    unitId,
    presentationArm: arm,
    timeOnTaskMs,
    comprehensionScore: d.comprehensionScore ?? null,
    comprehensionMax: d.comprehensionMax ?? null,
    effort: d.effort ?? null,
    writingLevel,
    readingComplete,
    priorKnowledge,
    source: 'lesson-experiment',
  });
}

// src/state.js
import { db } from './firebase.js';
import { ref, set, get } from 'firebase/database';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false; // Force disabled for testing // keep in sync with auth.js

// ── Adaptive defaults ─────────────────────────
const SKILLS = ['critical_reading','evidence_use','argument_structure','academic_tone',
                'source_evaluation','citation_practice','research_skills','ai_literacy'];

function defaultAdaptive() {
  const scores  = {};
  const status  = {};
  SKILLS.forEach(s => { scores[s] = []; status[s] = 'untested'; });
  return {
    skill_scores:        scores,
    skill_status:        status,
    needs_remediation:   [],
    frustration_index:   0,
    frustration_triggers:[],
    study_topics:        [],
    last_recommendation: null,
    recommendation_at:   null,
    high_performer:      false,
  };
}

export const STATE = {
  user:       null,
  activeUnit: 0,
  progress:   {},
  tutorChats: {},
  erProgress: { extraMarks: 0, completedReadings: [] },
  deviceInfo: null,
  aiUsage:    { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
  adaptive:   defaultAdaptive(),
};

export async function saveState() {
  if (DEV_MODE || !STATE.user) {
    // In dev mode, persist to localStorage so progress survives refresh
    localStorage.setItem('acadlit-state', JSON.stringify({
      progress:   STATE.progress,
      tutorChats: STATE.tutorChats,
      erProgress: STATE.erProgress,
      deviceInfo: STATE.deviceInfo,
      aiUsage:    STATE.aiUsage,
      adaptive:   STATE.adaptive,
    }));
    return;
  }
  await set(ref(db, `users/${STATE.user.uid}/state`), {
    progress:   STATE.progress,
    tutorChats: STATE.tutorChats,
    erProgress: STATE.erProgress,
    deviceInfo: STATE.deviceInfo,
    aiUsage:    STATE.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
    adaptive:   STATE.adaptive,
  });
}

export async function loadState() {
  if (DEV_MODE) {
    const saved = localStorage.getItem('acadlit-state');
    if (saved) {
      const data = JSON.parse(saved);
      STATE.progress   = data.progress   || {};
      STATE.tutorChats = data.tutorChats || {};
      STATE.erProgress = data.erProgress || { extraMarks: 0, completedReadings: [] };
      STATE.deviceInfo = data.deviceInfo || null;
      STATE.aiUsage    = data.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 };
      STATE.adaptive   = _mergeAdaptive(data.adaptive);
    }
    return;
  }
  if (!STATE.user) return;
  const snap = await get(ref(db, `users/${STATE.user.uid}/state`));
  if (snap.exists()) {
    const data = snap.val();
    STATE.progress   = data.progress   || {};
    STATE.tutorChats = data.tutorChats || {};
    STATE.erProgress = data.erProgress || { extraMarks: 0, completedReadings: [] };
    STATE.deviceInfo = data.deviceInfo || null;
    STATE.aiUsage    = data.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 };
    STATE.adaptive   = _mergeAdaptive(data.adaptive);
  }
}

// Safely merge saved adaptive data with defaults (handles missing keys for existing users)
function _mergeAdaptive(saved) {
  const def = defaultAdaptive();
  if (!saved) return def;
  return {
    ...def,
    ...saved,
    skill_scores:  { ...def.skill_scores,  ...(saved.skill_scores  || {}) },
    skill_status:  { ...def.skill_status,  ...(saved.skill_status  || {}) },
  };
}

// ── Adaptive helper functions ─────────────────

/**
 * Record a skill score from any AI tool.
 * @param {string} skillId   - one of the 8 SKILLS
 * @param {number} score     - raw score value
 * @param {number} maxScore  - scale max (e.g. 5 or 10)
 * @param {string} source    - 'writing_coach' | 'source_evaluator' | 'argument_mapper' | 'study_buddy' | 'micro_module'
 * @param {string|null} triggeredBy - micro-module id if this score followed a module, else null
 */
export function recordSkillScore(skillId, score, maxScore, source, triggeredBy = null) {
  if (!SKILLS.includes(skillId)) return;
  const normalised = Math.round((score / maxScore) * 5 * 10) / 10;
  const entry = {
    score:        normalised,
    raw:          score,
    max:          maxScore,
    timestamp:    new Date().toISOString(),
    source,
    triggered_by: triggeredBy,
  };
  if (!STATE.adaptive.skill_scores[skillId]) STATE.adaptive.skill_scores[skillId] = [];
  STATE.adaptive.skill_scores[skillId].push(entry);
  _updateSkillStatus(skillId);
  saveState().catch(console.error);
}

function _updateSkillStatus(skillId) {
  const entries = STATE.adaptive.skill_scores[skillId] || [];
  if (entries.length < 2) { STATE.adaptive.skill_status[skillId] = 'untested'; return; }

  const recent = entries.slice(-3).map(e => e.score);
  const avg    = recent.reduce((a, b) => a + b, 0) / recent.length;

  if      (avg < 2.5)  STATE.adaptive.skill_status[skillId] = 'weak';
  else if (avg < 3.5)  STATE.adaptive.skill_status[skillId] = 'developing';
  else                 STATE.adaptive.skill_status[skillId] = 'strong';

  // Remediation flag — 2 consecutive scores below 3
  const last2 = entries.slice(-2).map(e => e.score);
  if (last2.length === 2 && last2.every(s => s < 3)) {
    if (!STATE.adaptive.needs_remediation.includes(skillId)) {
      STATE.adaptive.needs_remediation.push(skillId);
    }
  } else {
    STATE.adaptive.needs_remediation = STATE.adaptive.needs_remediation.filter(s => s !== skillId);
  }

  // High performer — all tested skills averaging >= 4.5
  const testedSkills = SKILLS.filter(s => (STATE.adaptive.skill_scores[s] || []).length >= 2);
  if (testedSkills.length >= 3) {
    STATE.adaptive.high_performer = testedSkills.every(s => {
      const sc = STATE.adaptive.skill_scores[s].slice(-3).map(e => e.score);
      return sc.reduce((a, b) => a + b, 0) / sc.length >= 4.5;
    });
  }
}

/**
 * Returns the ZPD scaffold level for a skill.
 * 'scaffolded' → fill-in-the-blanks mode
 * 'guided'     → hints and questions
 * 'independent'→ standard feedback
 */
export function getScaffoldLevel(skillId) {
  const status = STATE.adaptive?.skill_status?.[skillId] || 'untested';
  if (status === 'weak')       return 'scaffolded';
  if (status === 'developing') return 'guided';
  return 'independent';
}

const FRUSTRATION_KEYWORDS = /\b(confused|confusing|don'?t (get|understand)|don'?t know|stuck|lost|help me|what does|i can'?t|no idea|makes no sense|not sure|struggling)\b/i;
const TOPIC_MAP = {
  citation_practice:   /\b(cit(e|ation)|reference|apa|in.?text|reference list|plagiar)\b/i,
  argument_structure:  /\b(arg(ue|ument)|claim|premise|conclusion|reasoning|logic)\b/i,
  source_evaluation:   /\b(source|credib|evaluat|reliab|peer.?review|journal)\b/i,
  ai_literacy:         /\b(ai|artificial intelligence|chatgpt|gemini|llm|generated|hallucin)\b/i,
  research_skills:     /\b(research|database|search|find(ing)? source|literature)\b/i,
  academic_tone:       /\b(tone|formal|informal|colloqui|academic writing|third person)\b/i,
  evidence_use:        /\b(evidence|support|proof|data|statistic|finding)\b/i,
  critical_reading:    /\b(read(ing)?|comprehend|understand|annotate|active read)\b/i,
};

/**
 * Check a student message for frustration signals.
 * Increments frustration_index and flags an intervention if threshold crossed.
 */
export function logFrustration(text) {
  if (FRUSTRATION_KEYWORDS.test(text)) {
    STATE.adaptive.frustration_triggers.push(new Date().toISOString());
    // Count triggers in the last 15 minutes (one session window)
    const cutoff = Date.now() - 15 * 60 * 1000;
    const recentCount = STATE.adaptive.frustration_triggers
      .filter(t => new Date(t).getTime() > cutoff).length;
    STATE.adaptive.frustration_index = Math.min(5, Math.round(recentCount / 3 * 5) / 5 * 3);
    // Trim to last 50 entries
    if (STATE.adaptive.frustration_triggers.length > 50) {
      STATE.adaptive.frustration_triggers = STATE.adaptive.frustration_triggers.slice(-50);
    }
    saveState().catch(console.error);
  }
}

/**
 * Log a topic the student asked about in the Study Buddy.
 */
export function logStudyTopic(text) {
  for (const [topic, regex] of Object.entries(TOPIC_MAP)) {
    if (regex.test(text) && !STATE.adaptive.study_topics.includes(topic)) {
      STATE.adaptive.study_topics.push(topic);
      if (STATE.adaptive.study_topics.length > 50) STATE.adaptive.study_topics.shift();
      saveState().catch(console.error);
      break;
    }
  }
}

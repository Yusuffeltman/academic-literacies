// src/state.js
import { db } from './firebase.js';
import { ref, set, get } from 'firebase/database';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false; // Force disabled for testing // keep in sync with auth.js
const LOCAL_STATE_KEY = 'acadlit-state';

// ── Adaptive defaults ─────────────────────────
const SKILLS = ['critical_reading', 'evidence_use', 'argument_structure', 'academic_tone',
  'source_evaluation', 'citation_practice', 'research_skills', 'ai_literacy'];

function defaultAdaptive() {
  const scores = {};
  const status = {};
  SKILLS.forEach(s => { scores[s] = []; status[s] = 'untested'; });
  return {
    skill_scores: scores,
    skill_status: status,
    needs_remediation: [],
    frustration_index: 0,
    frustration_triggers: [],
    study_topics: [],
    last_recommendation: null,
    recommendation_at: null,
    outcomes: [],
    high_performer: false,
  };
}

export const STATE = {
  user: null,
  activeUnit: 0,
  progress: {},
  tutorChats: {},
  tutorialNotebook: { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} },
  contactNotebook: { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} },
  erProgress: { extraMarks: 0, completedReadings: [] },
  attendance: { byDate: {} },
  deviceInfo: null,
  aiUsage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
  adaptive: defaultAdaptive(),
  escalations: [],
  chat: { offlineQueue: [], activeRoomId: null, unreadTotal: 0, cachedRooms: {} },
};

function _captureStatePayload() {
  return {
    progress: STATE.progress,
    tutorChats: STATE.tutorChats,
    tutorialNotebook: STATE.tutorialNotebook,
    contactNotebook: STATE.contactNotebook,
    erProgress: STATE.erProgress,
    attendance: STATE.attendance,
    deviceInfo: STATE.deviceInfo,
    aiUsage: STATE.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
    adaptive: STATE.adaptive,
    escalations: STATE.escalations,
    chat: { offlineQueue: STATE.chat?.offlineQueue || [] },
  };
}

function _localStateKey(user = null) {
  const activeUser = user || STATE.user;
  return activeUser?.uid ? `${LOCAL_STATE_KEY}:${activeUser.uid}` : LOCAL_STATE_KEY;
}

function _writeLocalState(payload, user = null) {
  try {
    localStorage.setItem(_localStateKey(user), JSON.stringify(payload));
  } catch (err) {
    console.warn('Local state backup failed:', err);
  }
}

function _readLocalState(user = null) {
  try {
    const scoped = localStorage.getItem(_localStateKey(user));
    if (scoped) return JSON.parse(scoped);

    const saved = localStorage.getItem(LOCAL_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.warn('Local state read failed:', err);
    return null;
  }
}

function _applyState(data) {
  if (!data) return;
  STATE.progress = data.progress || {};
  STATE.tutorChats = data.tutorChats || {};
  STATE.tutorialNotebook = data.tutorialNotebook || { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} };
  STATE.tutorialNotebook.archivedUnits = STATE.tutorialNotebook.archivedUnits || {};
  STATE.tutorialNotebook.analytics = STATE.tutorialNotebook.analytics || {};
  STATE.contactNotebook = data.contactNotebook || { entries: {}, lastUnitId: null, lastSessionId: null, archivedUnits: {}, analytics: {} };
  STATE.contactNotebook.archivedUnits = STATE.contactNotebook.archivedUnits || {};
  STATE.contactNotebook.analytics = STATE.contactNotebook.analytics || {};
  STATE.erProgress = data.erProgress || { extraMarks: 0, completedReadings: [] };
  STATE.attendance = data.attendance || { byDate: {} };
  STATE.deviceInfo = data.deviceInfo || null;
  STATE.aiUsage = data.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 };
  STATE.adaptive = _mergeAdaptive(data.adaptive);
  STATE.escalations = data.escalations || [];
  STATE.chat = {
    offlineQueue: data.chat?.offlineQueue || [],
    activeRoomId: null,
    unreadTotal: 0,
    cachedRooms: {},
  };
}

function _shouldUseFirebase(userOverride = null) {
  const toggle = String(VITE_FIREBASE ?? 'true').toLowerCase();
  const enabled = toggle !== 'false' && toggle !== '0';
  const configOk = Boolean(import.meta.env.VITE_FIREBASE_DATABASE_URL && import.meta.env.VITE_FIREBASE_API_KEY);
  const user = userOverride || STATE.user;
  return enabled && configOk && !!user;
}

function _parseIso(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : 0;
}

function _pickNewerEntry(remoteEntry, localEntry) {
  if (!remoteEntry) return localEntry || null;
  if (!localEntry) return remoteEntry || null;

  const remoteTs = _parseIso(remoteEntry.updatedAt);
  const localTs = _parseIso(localEntry.updatedAt);

  if (localTs > remoteTs) return localEntry;
  if (remoteTs > localTs) return remoteEntry;

  const remoteAttachments = Array.isArray(remoteEntry.attachments) ? remoteEntry.attachments.length : 0;
  const localAttachments = Array.isArray(localEntry.attachments) ? localEntry.attachments.length : 0;
  return localAttachments >= remoteAttachments ? { ...remoteEntry, ...localEntry } : { ...localEntry, ...remoteEntry };
}

function _mergeNotebookState(remoteNotebook, localNotebook) {
  const remote = remoteNotebook || { entries: {} };
  const local = localNotebook || { entries: {} };
  const keys = new Set([
    ...Object.keys(remote.entries || {}),
    ...Object.keys(local.entries || {}),
  ]);
  const entries = {};

  keys.forEach((key) => {
    const picked = _pickNewerEntry(remote.entries?.[key], local.entries?.[key]);
    if (picked) entries[key] = picked;
  });

  return {
    ...remote,
    ...local,
    entries,
    lastUnitId: local.lastUnitId || remote.lastUnitId || null,
    lastSessionId: local.lastSessionId || remote.lastSessionId || null,
  };
}

function _mergeStatePayload(remoteData, localData) {
  const remote = remoteData || {};
  const local = localData || {};
  return {
    ...remote,
    ...local,
    progress: local.progress || remote.progress || {},
    tutorChats: local.tutorChats || remote.tutorChats || {},
    tutorialNotebook: _mergeNotebookState(remote.tutorialNotebook, local.tutorialNotebook),
    contactNotebook: _mergeNotebookState(remote.contactNotebook, local.contactNotebook),
    erProgress: local.erProgress || remote.erProgress || { extraMarks: 0, completedReadings: [] },
    attendance: local.attendance || remote.attendance || { byDate: {} },
    deviceInfo: local.deviceInfo || remote.deviceInfo || null,
    aiUsage: local.aiUsage || remote.aiUsage || { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 },
    adaptive: _mergeAdaptive(local.adaptive || remote.adaptive),
    escalations: local.escalations || remote.escalations || [],
    chat: { offlineQueue: local.chat?.offlineQueue || remote.chat?.offlineQueue || [] },
  };
}

export async function saveState() {
  const payload = _captureStatePayload();
  _writeLocalState(payload);

  if (DEV_MODE || !_shouldUseFirebase()) return true;

  try {
    await set(ref(db, `users/${STATE.user.uid}/state`), payload);
    return true;
  } catch (err) {
    console.error('❌ Failed to save state to Firebase, kept local copy:', err);
    return false;
  }
}

export async function loadState(user = null) {
  const activeUser = user || STATE.user || null;
  if (activeUser && !STATE.user) STATE.user = activeUser;
  const localData = _readLocalState(activeUser);

  if (DEV_MODE || !_shouldUseFirebase(activeUser)) {
    _applyState(localData);
    return;
  }

  try {
    const snap = await get(ref(db, `users/${activeUser.uid}/state`));
    if (snap.exists()) {
      const data = snap.val();
      const merged = _mergeStatePayload(data, localData);
      _applyState(merged);
      _writeLocalState(_captureStatePayload(), activeUser);

      const remoteJson = JSON.stringify(data || {});
      const mergedJson = JSON.stringify(merged || {});
      if (remoteJson !== mergedJson) {
        await set(ref(db, `users/${activeUser.uid}/state`), merged);
      }
      return;
    }
  } catch (err) {
    console.warn('Firebase state load failed, falling back to local copy:', err);
  }

  _applyState(localData);
}

export function attendanceDateKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function markPresent(sessionType = 'class') {
  const day = attendanceDateKey();
  if (!STATE.attendance || typeof STATE.attendance !== 'object') {
    STATE.attendance = { byDate: {} };
  }
  STATE.attendance.byDate = STATE.attendance.byDate || {};

  const nowIso = new Date().toISOString();
  const rec = STATE.attendance.byDate[day] || {
    present: false,
    firstSeen: null,
    lastSeen: null,
    totalSeconds: 0,
    classSeconds: 0,
    tutorialSeconds: 0,
    lastSessionType: 'class',
  };

  rec.present = true;
  rec.firstSeen = rec.firstSeen || nowIso;
  rec.lastSeen = nowIso;
  rec.lastSessionType = sessionType === 'tutorial' ? 'tutorial' : 'class';
  STATE.attendance.byDate[day] = rec;
}

export function addAttendanceTime(seconds, sessionType = 'class') {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!sec) return;

  const day = attendanceDateKey();
  if (!STATE.attendance || typeof STATE.attendance !== 'object') {
    STATE.attendance = { byDate: {} };
  }
  STATE.attendance.byDate = STATE.attendance.byDate || {};

  const nowIso = new Date().toISOString();
  const rec = STATE.attendance.byDate[day] || {
    present: false,
    firstSeen: null,
    lastSeen: null,
    totalSeconds: 0,
    classSeconds: 0,
    tutorialSeconds: 0,
    lastSessionType: 'class',
  };

  rec.present = true;
  rec.firstSeen = rec.firstSeen || nowIso;
  rec.lastSeen = nowIso;
  rec.totalSeconds = (rec.totalSeconds || 0) + sec;
  if (sessionType === 'tutorial') {
    rec.tutorialSeconds = (rec.tutorialSeconds || 0) + sec;
    rec.lastSessionType = 'tutorial';
  } else {
    rec.classSeconds = (rec.classSeconds || 0) + sec;
    rec.lastSessionType = 'class';
  }

  STATE.attendance.byDate[day] = rec;
}

// Safely merge saved adaptive data with defaults (handles missing keys for existing users)
function _mergeAdaptive(saved) {
  const def = defaultAdaptive();
  if (!saved) return def;
  return {
    ...def,
    ...saved,
    skill_scores: { ...def.skill_scores, ...(saved.skill_scores || {}) },
    skill_status: { ...def.skill_status, ...(saved.skill_status || {}) },
    outcomes: Array.isArray(saved.outcomes) ? saved.outcomes : [],
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
    score: normalised,
    raw: score,
    max: maxScore,
    timestamp: new Date().toISOString(),
    source,
    triggered_by: triggeredBy,
  };
  if (!STATE.adaptive.skill_scores[skillId]) STATE.adaptive.skill_scores[skillId] = [];
  STATE.adaptive.skill_scores[skillId].push(entry);
  _updateSkillStatus(skillId);
  closeOutcomes(skillId, normalised);
  checkEscalationTriggers();
  saveState().catch(console.error);
}

function _updateSkillStatus(skillId) {
  const entries = STATE.adaptive.skill_scores[skillId] || [];
  if (entries.length < 2) { STATE.adaptive.skill_status[skillId] = 'untested'; return; }

  const recent = entries.slice(-3).map(e => e.score);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (avg < 2.5) STATE.adaptive.skill_status[skillId] = 'weak';
  else if (avg < 3.5) STATE.adaptive.skill_status[skillId] = 'developing';
  else STATE.adaptive.skill_status[skillId] = 'strong';

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
  if (status === 'weak') return 'scaffolded';
  if (status === 'developing') return 'guided';
  return 'independent';
}

const FRUSTRATION_KEYWORDS = /\b(confused|confusing|don'?t (get|understand)|don'?t know|stuck|lost|help me|what does|i can'?t|no idea|makes no sense|not sure|struggling)\b/i;
const TOPIC_MAP = {
  citation_practice: /\b(cit(e|ation)|reference|apa|in.?text|reference list|plagiar)\b/i,
  argument_structure: /\b(arg(ue|ument)|claim|premise|conclusion|reasoning|logic)\b/i,
  source_evaluation: /\b(source|credib|evaluat|reliab|peer.?review|journal)\b/i,
  ai_literacy: /\b(ai|artificial intelligence|chatgpt|gemini|llm|generated|hallucin)\b/i,
  research_skills: /\b(research|database|search|find(ing)? source|literature)\b/i,
  academic_tone: /\b(tone|formal|informal|colloqui|academic writing|third person)\b/i,
  evidence_use: /\b(evidence|support|proof|data|statistic|finding)\b/i,
  critical_reading: /\b(read(ing)?|comprehend|understand|annotate|active read)\b/i,
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
    if (STATE.adaptive.frustration_index >= 3) checkEscalationTriggers();
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

// ── Outcome Effectiveness Tracking ───────────

/**
 * Record a pending outcome when a micro-module recommendation is shown.
 * @param {string} moduleId      - micro-module id (e.g. 'evidence-booster')
 * @param {string} skillId       - associated skill
 * @param {number|null} scoreBefore - student's most recent score before the module
 */
export function recordOutcome(moduleId, skillId, scoreBefore) {
  if (!STATE.adaptive.outcomes) STATE.adaptive.outcomes = [];
  // Avoid duplicate pending outcomes for the same module + skill
  const existing = STATE.adaptive.outcomes.find(
    o => o.moduleId === moduleId && o.skill === skillId && o.status === 'pending'
  );
  if (existing) return;
  STATE.adaptive.outcomes.push({
    id: `out_${Date.now()}`,
    moduleId,
    skill: skillId,
    scoreBefore: scoreBefore ?? null,
    recommendedAt: new Date().toISOString(),
    scoreAfter: null,
    improvement: null,
    status: 'pending',
  });
  saveState().catch(console.error);
}

/**
 * Close all pending outcomes for a skill when a new score arrives.
 * Called automatically from recordSkillScore — caller handles the saveState.
 */
export function closeOutcomes(skillId, newScore) {
  if (!STATE.adaptive.outcomes?.length) return;
  STATE.adaptive.outcomes = STATE.adaptive.outcomes.map(o => {
    if (o.skill === skillId && o.status === 'pending') {
      const improvement = o.scoreBefore != null ? +(newScore - o.scoreBefore).toFixed(2) : null;
      return {
        ...o,
        scoreAfter: newScore,
        improvement,
        status: improvement == null ? 'unchanged'
          : improvement > 0 ? 'improved'
            : improvement < 0 ? 'declined'
              : 'unchanged',
        closedAt: new Date().toISOString(),
      };
    }
    return o;
  });
}

// ── Escalation System ─────────────────────────

/**
 * Create a new escalation record, deduplicated by trigger+skill.
 */
export function createEscalation(trigger, skill, severity, message) {
  if (!Array.isArray(STATE.escalations)) STATE.escalations = [];
  // Avoid duplicate active escalations of the same type for the same skill
  const existing = STATE.escalations.find(
    e => e.trigger === trigger && e.skill === (skill || null) && !e.resolved
  );
  if (existing) return;
  STATE.escalations.push({
    id: `esc_${Date.now()}`,
    trigger,
    skill: skill || null,
    severity,
    timestamp: new Date().toISOString(),
    resolved: false,
    message,
  });
  saveState().catch(console.error);
}

/**
 * Check all escalation triggers against current adaptive state.
 * Called after skill score updates and high-frustration events.
 */
export function checkEscalationTriggers() {
  const adaptive = STATE.adaptive;
  if (!adaptive) return;

  // Trigger 1: Persistent failure — 4 consecutive weak scores for a flagged skill
  SKILLS.forEach(skillId => {
    if (
      adaptive.skill_status[skillId] === 'weak' &&
      adaptive.needs_remediation.includes(skillId)
    ) {
      const entries = adaptive.skill_scores[skillId] || [];
      if (entries.length >= 4) {
        const last4 = entries.slice(-4).map(e => e.score);
        if (last4.every(s => s < 2.5)) {
          createEscalation(
            'persistent-failure',
            skillId,
            'high',
            `Persistent weak performance in ${skillId.replace(/_/g, ' ')} — 4 consecutive low scores.`
          );
        }
      }
    }
  });

  // Trigger 2: Declining performance — last score < first score by >0.5, ≥6 entries
  SKILLS.forEach(skillId => {
    const entries = adaptive.skill_scores[skillId] || [];
    if (entries.length >= 6) {
      const first = entries[0].score;
      const last = entries[entries.length - 1].score;
      if (last < first - 0.5) {
        createEscalation(
          'declining-performance',
          skillId,
          'high',
          `${skillId.replace(/_/g, ' ')} is declining — dropped from ${first} to ${last}.`
        );
      }
    }
  });

  // Trigger 3: Disengaged — no engagement for more than 10 days
  if (adaptive.recommendation_at) {
    const age = Date.now() - new Date(adaptive.recommendation_at).getTime();
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    if (age > tenDays) {
      createEscalation(
        'disengaged',
        null,
        'medium',
        'No platform engagement detected for over 10 days.'
      );
    }
  }

  // Trigger 4: Intervention ineffective — skill still in remediation after 3+ module attempts
  (adaptive.needs_remediation || []).forEach(skillId => {
    const moduleAttempts = (adaptive.skill_scores[skillId] || []).filter(e => e.triggered_by);
    if (moduleAttempts.length >= 3) {
      createEscalation(
        'intervention-ineffective',
        skillId,
        'medium',
        `3+ micro-module attempts for ${skillId.replace(/_/g, ' ')} with no resolution.`
      );
    }
  });
}

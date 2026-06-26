import { get, ref, set } from 'firebase/database';
import { db } from './firebase.js';
import { findRosterEntry, normalizeStudentUsername } from './profile.js';

const ANALYTICS_TIMEZONE = 'Africa/Johannesburg';
const ANALYTICS_ALLOWED_FUTURE_SKEW_MS = 5 * 60 * 1000;

export const METRIC_COVERAGE = {
  dailyActiveLearners: 'official',
  hourlyTraffic: 'official',
  attendanceToday: 'official',
  resetLinkSignIns: 'official',
  successfulUploads: 'official',
  notebookSaves: 'official',
  learningActions: 'partial',
  gallerySubmissions: 'official',
  feedPosts: 'official',
  surveySubmits: 'official',
};

export const LEARNING_ACTION_EVENT_TYPES = [
  'unit_open',
  'assessment_open',
  'unit_first_visit',
  'resource_library_open',
  'er_open',
  'gallery_open',
  'gallery_showroom_open',
  'gallery_submission',
  'feed_post',
  'survey_submit',
  'portfolio_artifact_added',
  'heutagogy_cycle_saved',
  'heutagogy_coach_requested',
  'lesson_arm_assigned',
  'lesson_completed',
];

export const METRIC_DEFINITIONS = {
  dailyActiveLearners: {
    id: 'dailyActiveLearners',
    label: 'Daily Active Learners',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count distinct canonicalStudentKey with at least one validated learning event in the day',
    eventTypes: ['learning_event'],
  },
  hourlyTraffic: {
    id: 'hourlyTraffic',
    label: 'Hourly Traffic',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count validated student events grouped by local hour',
    eventTypes: ['learning_event', 'attendance_checkin', 'upload_success', 'notebook_save', 'reset_link_signin'],
  },
  attendanceToday: {
    id: 'attendanceToday',
    label: 'Attendance Today',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count distinct canonicalStudentKey with a validated attendance event in the day',
    eventTypes: ['attendance_checkin'],
  },
  resetLinkSignIns: {
    id: 'resetLinkSignIns',
    label: 'Reset-Link Sign-ins',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count distinct canonicalStudentKey with a validated reset-link sign-in event in the day',
    eventTypes: ['reset_link_signin'],
  },
  successfulUploads: {
    id: 'successfulUploads',
    label: 'Successful Uploads',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count validated upload success events only',
    eventTypes: ['upload_success'],
  },
  notebookSaves: {
    id: 'notebookSaves',
    label: 'Notebook Saves',
    metricClass: 'official',
    audience: 'student',
    source: 'analytics/raw-events/{dateKey}',
    formula: 'count validated notebook save events after dedupe',
    eventTypes: ['notebook_save'],
  },
};

function _cleanText(value = '') {
  return String(value || '').trim();
}

function _cleanLower(value = '') {
  return _cleanText(value).toLowerCase();
}

function _firstNonEmpty(...values) {
  for (const value of values) {
    const cleaned = _cleanText(value);
    if (cleaned) return cleaned;
  }
  return '';
}

function _rosterStudentId(row = {}) {
  return _firstNonEmpty(row.studentId, row.studentNumber, row.studentNo);
}

function _formatInTimeZone(dateValue = new Date(), timeZone = ANALYTICS_TIMEZONE) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(safeDate).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hourKey: parts.hour || '00',
  };
}

function _sanitizeKeySegment(value = '') {
  return _cleanText(value).replace(/[.#$\[\]@/:\\\s]+/g, '_');
}

function _canonicalStudentKey(studentNumber = '', ujEmail = '') {
  const id = _cleanText(studentNumber);
  const email = normalizeStudentUsername(ujEmail);
  if (!id || !email) return '';
  return `${id}::${email}`;
}

function _buildEventId(prefix = 'event', parts = []) {
  return [prefix, ...parts.map((part) => _sanitizeKeySegment(part)).filter(Boolean)]
    .filter(Boolean)
    .join('__');
}

export function analyticsDateKey(dateValue = new Date(), timeZone = ANALYTICS_TIMEZONE) {
  return _formatInTimeZone(dateValue, timeZone).dateKey;
}

export function analyticsHourKey(dateValue = new Date(), timeZone = ANALYTICS_TIMEZONE) {
  return _formatInTimeZone(dateValue, timeZone).hourKey;
}

export async function loadActiveRosterRows() {
  try {
    const snap = await get(ref(db, 'rosters/classList'));
    if (!snap.exists()) return [];
    return Object.values(snap.val() || {});
  } catch {
    return [];
  }
}

export function resolveCanonicalStudent(user = {}, profile = {}, rosterRows = []) {
  const role = _cleanLower(profile?.role || '');
  if (role && role !== 'student') {
    return { eligible: false, reason: 'non-student-role' };
  }

  const studentId = _firstNonEmpty(profile?.studentId, profile?.studentNumber, profile?.studentNo);
  const authEmail = _firstNonEmpty(profile?.authEmail, profile?.username, user?.email);
  const rosterEntry = findRosterEntry(rosterRows, {
    authEmail,
    username: profile?.username || authEmail,
    email: profile?.email,
    personalEmail: profile?.personalEmail || profile?.email,
    studentId,
  });

  if (!rosterEntry) {
    return {
      eligible: false,
      reason: 'not-on-active-roster',
      studentNumber: _cleanText(studentId),
      ujEmail: normalizeStudentUsername(authEmail),
    };
  }

  const rosterStudentNumber = _rosterStudentId(rosterEntry);
  const rosterEmail = normalizeStudentUsername(_firstNonEmpty(rosterEntry.username, rosterEntry.email, authEmail));
  const canonicalStudentKey = _canonicalStudentKey(rosterStudentNumber, rosterEmail);
  if (!rosterStudentNumber || !rosterEmail || !canonicalStudentKey) {
    return {
      eligible: false,
      reason: 'invalid-roster-identity',
      rosterEntry,
    };
  }

  return {
    eligible: true,
    reason: '',
    rosterEntry,
    canonicalStudentKey,
    studentNumber: rosterStudentNumber,
    ujEmail: rosterEmail,
    rosterEmail,
  };
}

export async function validateAnalyticsEvent(metricId, payload = {}) {
  const definition = METRIC_DEFINITIONS[metricId];
  if (!definition) {
    return {
      valid: false,
      reason: 'unknown-metric-definition',
      metricId,
    };
  }

  const role = _cleanLower(payload.role || payload.profile?.role || '');
  const writtenAt = new Date().toISOString();
  const writtenMs = Date.now();
  const declaredAt = payload.timestamp ? new Date(payload.timestamp).getTime() : writtenMs;
  const eventMs = Number.isNaN(declaredAt) ? writtenMs : declaredAt;
  if (eventMs > writtenMs + ANALYTICS_ALLOWED_FUTURE_SKEW_MS) {
    return {
      valid: false,
      reason: 'future-timestamp',
      metricId,
    };
  }
  const trustedMs = Math.min(eventMs, writtenMs);

  let canonical = null;
  let rosterRows = Array.isArray(payload.rosterRows) ? payload.rosterRows : [];
  if (definition.audience === 'student') {
    if (role && role !== 'student') {
      return {
        valid: false,
        reason: 'role-not-eligible',
        metricId,
        role,
      };
    }
    if (!rosterRows.length) rosterRows = await loadActiveRosterRows();
    canonical = resolveCanonicalStudent(payload.user || {}, payload.profile || {}, rosterRows);
    if (!canonical.eligible) {
      return {
        valid: false,
        reason: canonical.reason || 'canonical-student-resolution-failed',
        metricId,
        canonical,
      };
    }
  }

  const trustedAt = new Date(trustedMs).toISOString();
  const dateKey = analyticsDateKey(trustedAt);
  const hourKey = analyticsHourKey(trustedAt);
  const eventType = _cleanText(payload.eventType || definition.eventTypes?.[0] || metricId);
  const uid = _cleanText(payload.user?.uid || payload.uid || payload.profile?.uid);
  const eventId = _cleanText(payload.eventId || _buildEventId(metricId, [
    uid || 'unknown',
    canonical?.studentNumber || '',
    dateKey,
    eventType,
  ]));

  return {
    valid: true,
    metricId,
    definition,
    event: {
      eventId,
      metricId,
      metricLabel: definition.label,
      metricClass: definition.metricClass,
      audience: definition.audience,
      eventType,
      uid,
      role: role || 'student',
      canonicalStudentKey: canonical?.canonicalStudentKey || '',
      studentNumber: canonical?.studentNumber || '',
      ujEmail: canonical?.ujEmail || '',
      trustedAt,
      writtenAt,
      dateKey,
      hourKey,
      source: _cleanText(payload.source || 'platform'),
      meta: payload.meta || {},
    },
  };
}

export async function writeAnalyticsEvent(metricId, payload = {}) {
  const validation = await validateAnalyticsEvent(metricId, payload);
  const writtenAt = new Date().toISOString();
  if (!validation.valid) {
    const quarantineDateKey = analyticsDateKey(writtenAt);
    const quarantineId = _buildEventId('quarantine', [
      metricId,
      payload.user?.uid || payload.uid || 'unknown',
      quarantineDateKey,
      validation.reason || 'invalid',
    ]);
    await set(ref(db, `analytics/quarantine-events/${quarantineDateKey}/${quarantineId}`), {
      metricId,
      reason: validation.reason || 'invalid-event',
      uid: _cleanText(payload.user?.uid || payload.uid),
      role: _cleanLower(payload.role || payload.profile?.role || ''),
      attemptedAt: payload.timestamp || writtenAt,
      writtenAt,
      source: _cleanText(payload.source || 'platform'),
      meta: payload.meta || {},
    }).catch(() => { });
    return validation;
  }

  const event = validation.event;
  await set(ref(db, `analytics/raw-events/${event.dateKey}/${event.eventId}`), event);
  return validation;
}

export async function writeResetLinkSignInEvent(payload = {}) {
  const validated = await writeAnalyticsEvent('resetLinkSignIns', {
    ...payload,
    eventType: 'reset_link_signin',
    source: payload.source || 'auth-reset-link',
    meta: {
      ...(payload.meta || {}),
      name: _cleanText(payload.profile?.displayName || payload.existingProfile?.displayName || payload.user?.displayName || payload.user?.email || 'Student'),
      email: _cleanText(payload.profile?.authEmail || payload.profile?.username || payload.user?.email || ''),
      studentNumber: _cleanText(payload.profile?.studentNumber || payload.profile?.studentId || payload.profile?.studentNo || payload.existingProfile?.studentNumber || payload.existingProfile?.studentId || payload.existingProfile?.studentNo || ''),
    },
  });
  if (!validated.valid) return validated;

  const event = validated.event;
  await set(ref(db, `analytics/roster-reset-signins/${event.dateKey}/${event.uid}`), {
    uid: event.uid,
    name: _cleanText(payload.profile?.displayName || payload.existingProfile?.displayName || payload.user?.displayName || payload.user?.email || 'Student'),
    email: event.ujEmail || _cleanText(payload.profile?.authEmail || payload.profile?.username || payload.user?.email),
    studentNumber: event.studentNumber || _cleanText(payload.profile?.studentNumber || payload.profile?.studentId || payload.profile?.studentNo),
    signedInAt: event.trustedAt,
    metricId: event.metricId,
    canonicalStudentKey: event.canonicalStudentKey,
    source: event.source,
  }).catch(() => { });

  return validated;
}

export async function writeAttendanceCheckinEvent(payload = {}) {
  const sessionType = _cleanText(payload.sessionType || 'class').toLowerCase() === 'tutorial' ? 'tutorial' : 'class';
  const tokenKey = _sanitizeKeySegment(payload.token || sessionType || 'checkin');
  const eventId = _buildEventId('attendance', [
    payload.user?.uid || payload.uid || 'unknown',
    analyticsDateKey(payload.timestamp || new Date()),
    sessionType,
    tokenKey,
  ]);
  return writeAnalyticsEvent('attendanceToday', {
    ...payload,
    eventId,
    eventType: 'attendance_checkin',
    source: payload.source || 'attendance-qr',
    meta: {
      ...(payload.meta || {}),
      sessionType,
      token: _cleanText(payload.token || ''),
    },
  });
}

export async function writeUploadSuccessEvent(payload = {}) {
  const asset = payload.asset || {};
  const eventId = _buildEventId('upload', [
    payload.user?.uid || payload.uid || 'unknown',
    _sanitizeKeySegment(asset.path || asset.url || asset.name || payload.scope || 'upload'),
    _sanitizeKeySegment(asset.uploadedAt || payload.timestamp || new Date().toISOString()),
  ]);
  return writeAnalyticsEvent('successfulUploads', {
    ...payload,
    eventId,
    eventType: 'upload_success',
    timestamp: asset.uploadedAt || payload.timestamp,
    source: payload.source || 'upload',
    meta: {
      ...(payload.meta || {}),
      scope: _cleanText(payload.scope || ''),
      unitId: _cleanText(payload.unitId || ''),
      sessionId: _cleanText(payload.sessionId || ''),
      assetName: _cleanText(asset.name || ''),
      assetPath: _cleanText(asset.path || ''),
      assetType: _cleanText(asset.type || ''),
      assetSize: Number(asset.size || 0) || 0,
    },
  });
}

export async function writeNotebookSaveEvent(payload = {}) {
  const entry = payload.entry || {};
  const notebookType = _cleanText(payload.notebookType || 'notebook');
  const updatedAt = _cleanText(entry.updatedAt || payload.timestamp || new Date().toISOString());
  const eventId = _buildEventId('notebook', [
    payload.user?.uid || payload.uid || 'unknown',
    notebookType,
    payload.sessionId || '',
    payload.unitId || '',
    updatedAt,
  ]);
  return writeAnalyticsEvent('notebookSaves', {
    ...payload,
    eventId,
    eventType: 'notebook_save',
    timestamp: updatedAt,
    source: payload.source || `${notebookType}-autosave`,
    meta: {
      ...(payload.meta || {}),
      notebookType,
      sessionId: _cleanText(payload.sessionId || ''),
      unitId: _cleanText(payload.unitId || ''),
      wordCount: Number(payload.wordCount || 0) || 0,
      attachmentCount: Array.isArray(entry.attachments) ? entry.attachments.length : Number(payload.attachmentCount || 0) || 0,
    },
  });
}

export async function writeLearningEvent(eventType, payload = {}) {
  const safeEventType = _cleanText(eventType || 'learning_event') || 'learning_event';
  const unitId = _cleanText(payload.unitId || payload.meta?.unitId || '');
  const timestamp = _cleanText(payload.timestamp || new Date().toISOString());
  const eventId = _buildEventId('learning', [
    payload.user?.uid || payload.uid || 'unknown',
    safeEventType,
    unitId,
    _sanitizeKeySegment(timestamp),
  ]);
  return writeAnalyticsEvent('dailyActiveLearners', {
    ...payload,
    eventId,
    eventType: safeEventType,
    timestamp,
    source: payload.source || 'learning-event',
    meta: {
      ...(payload.meta || {}),
      unitId,
    },
  });
}

export async function rebuildDerivedMetricsForDate(dateKey = analyticsDateKey()) {
  const safeDateKey = _cleanText(dateKey) || analyticsDateKey();
  const rawSnap = await get(ref(db, `analytics/raw-events/${safeDateKey}`));
  const rawEvents = rawSnap.exists() ? Object.values(rawSnap.val() || {}) : [];

  const hourlyByHour = Object.fromEntries(
    Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, '0'), { pings: 0, activities: {} }])
  );
  const dailyActiveLearners = new Set();
  const attendanceToday = new Set();
  const resetLinkSignIns = new Set();
  const resetLinkSignInRows = [];
  const eventTypeCounts = {};
  let successfulUploads = 0;
  let notebookSaves = 0;
  let learningActions = 0;
  let feedPosts = 0;
  let gallerySubmissions = 0;
  let surveySubmits = 0;

  rawEvents.forEach((event) => {
    if (!event || String(event.dateKey || '') !== safeDateKey) return;
    const canonicalStudentKey = _cleanText(event.canonicalStudentKey);
    const hourKey = String(event.hourKey || '').padStart(2, '0');
    const eventType = _cleanText(event.eventType || event.metricId || 'unknown') || 'unknown';
    if (hourlyByHour[hourKey]) {
      hourlyByHour[hourKey].pings += 1;
      hourlyByHour[hourKey].activities[eventType] = (hourlyByHour[hourKey].activities[eventType] || 0) + 1;
    }
    eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
    if (event.metricId === 'dailyActiveLearners' && canonicalStudentKey) {
      dailyActiveLearners.add(canonicalStudentKey);
    }
    if (eventType === 'attendance_checkin' && canonicalStudentKey) {
      attendanceToday.add(canonicalStudentKey);
    }
    if (eventType === 'reset_link_signin' && canonicalStudentKey) {
      resetLinkSignIns.add(canonicalStudentKey);
      resetLinkSignInRows.push({
        uid: _cleanText(event.uid),
        name: _cleanText(event.meta?.name || event.ujEmail || event.uid || 'Student'),
        email: _cleanText(event.meta?.email || event.ujEmail),
        studentNumber: _cleanText(event.meta?.studentNumber || event.studentNumber),
        signedInAt: _cleanText(event.trustedAt),
        canonicalStudentKey,
        source: _cleanText(event.source || 'analytics/raw-events'),
      });
    }
    if (eventType === 'upload_success') {
      successfulUploads += 1;
    }
    if (eventType === 'notebook_save') {
      notebookSaves += 1;
    }
    if (LEARNING_ACTION_EVENT_TYPES.includes(eventType)) {
      learningActions += 1;
    }
    if (eventType === 'feed_post') {
      feedPosts += 1;
    }
    if (eventType === 'gallery_submission') {
      gallerySubmissions += 1;
    }
    if (eventType === 'survey_submit') {
      surveySubmits += 1;
    }
  });

  resetLinkSignInRows.sort((a, b) => String(b?.signedInAt || '').localeCompare(String(a?.signedInAt || '')));

  const daily = {
    dateKey: safeDateKey,
    source: 'analytics/raw-events',
    generatedAt: new Date().toISOString(),
    rawEventCount: rawEvents.length,
    dailyActiveLearners: dailyActiveLearners.size,
    attendanceToday: attendanceToday.size,
    resetLinkSignIns: resetLinkSignIns.size,
    successfulUploads,
    notebookSaves,
    learningActions,
    feedPosts,
    gallerySubmissions,
    surveySubmits,
    eventTypeCounts,
    resetLinkSignInRows,
    coverage: METRIC_COVERAGE,
  };

  await set(ref(db, `analytics/derived/daily/${safeDateKey}`), daily).catch(() => { });
  await set(ref(db, `analytics/derived/hourly/${safeDateKey}`), hourlyByHour).catch(() => { });

  return {
    daily,
    hourly: hourlyByHour,
  };
}

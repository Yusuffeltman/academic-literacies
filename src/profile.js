import { updateProfile } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { db } from './firebase.js';

export const STUDENT_PROFILE_FIELD_LABELS = {
  initials: 'Initials',
  surname: 'Surname',
  username: 'Username (UJ email)',
  email: 'Personal email',
  studentId: 'Student ID',
};

const STUDENT_USERNAME_RE = /^[^\s@]+@student\.uj(?:\.ac)?\.za$/i;
const DEFAULT_STUDENT_DOMAIN = 'student.uj.za';

function cleanText(value = '') {
  return String(value || '').trim();
}

function cleanLower(value = '') {
  return cleanText(value).toLowerCase();
}

function normalizeIdentityEmail(value = '') {
  return cleanLower(value).replace(/\s+/g, '');
}

function stripRole(displayName = '') {
  return cleanText(displayName).replace(/\s*\[[^\]]+\]\s*$/, '').trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return '';
}

function rosterStudentId(row = {}) {
  return firstNonEmpty(row.studentId, row.studentNumber, row.studentNo);
}

function deriveInitials(name = '') {
  const parts = cleanText(name)
    .split(/[\s-]+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function deriveSurname(name = '') {
  const parts = cleanText(name).split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function normalizeStudentUsername(value = '') {
  const normalized = cleanLower(value).replace(/\s+/g, '');
  if (!normalized) return '';
  if (!normalized.includes('@')) return `${normalized}@${DEFAULT_STUDENT_DOMAIN}`;
  return normalized;
}

export function isValidStudentUsername(value = '') {
  return STUDENT_USERNAME_RE.test(normalizeStudentUsername(value));
}

export function findRosterEntry(rows = [], identifiers = {}) {
  const username = normalizeStudentUsername(identifiers.username || identifiers.authEmail);
  const personalEmail = cleanLower(identifiers.personalEmail || identifiers.email);
  const studentId = cleanText(identifiers.studentId);
  if (!Array.isArray(rows) || (!username && !personalEmail && !studentId)) return null;

  return rows.find((row) => {
    const rowUsername = normalizeStudentUsername(row?.username);
    const rowEmail = cleanLower(row?.email);
    const rowStudentId = cleanText(rosterStudentId(row));
    return (
      (username && (rowUsername === username || rowEmail === username)) ||
      (personalEmail && rowEmail === personalEmail) ||
      (studentId && rowStudentId === studentId)
    );
  }) || null;
}

export function buildStudentProfileDraft(user, existingProfile = {}, rosterEntry = {}, overrides = {}) {
  const role = 'student';
  const rosterStudentEmail = normalizeStudentUsername(firstNonEmpty(rosterEntry.username, rosterStudentId(rosterEntry)));
  const authEmail = normalizeIdentityEmail(firstNonEmpty(overrides.authEmail, user?.email, existingProfile.authEmail, existingProfile.loginEmail));
  const username = normalizeStudentUsername(firstNonEmpty(overrides.username, existingProfile.username, rosterStudentEmail, rosterStudentId(rosterEntry)));
  const personalEmail = cleanLower(firstNonEmpty(
    overrides.personalEmail,
    overrides.email,
    existingProfile.personalEmail,
    existingProfile.email !== authEmail ? existingProfile.email : '',
    rosterEntry.email,
    authEmail !== username ? authEmail : ''
  ));
  const firstName = firstNonEmpty(overrides.firstName, existingProfile.firstName, rosterEntry.firstName);
  const surname = firstNonEmpty(
    overrides.surname,
    existingProfile.surname,
    existingProfile.lastName,
    rosterEntry.lastName,
    deriveSurname(overrides.name || existingProfile.name || rosterEntry.name || stripRole(existingProfile.displayName))
  );
  const initials = firstNonEmpty(
    cleanText(overrides.initials).toUpperCase(),
    cleanText(existingProfile.initials).toUpperCase(),
    deriveInitials(overrides.name || firstName || rosterEntry.name || stripRole(existingProfile.displayName))
  );
  const lastName = firstNonEmpty(overrides.lastName, existingProfile.lastName, rosterEntry.lastName, surname);
  const studentId = cleanText(firstNonEmpty(overrides.studentId, existingProfile.studentId, existingProfile.studentNumber, existingProfile.studentNo, rosterStudentId(rosterEntry)));
  const tutorialGroup = cleanText(firstNonEmpty(overrides.tutorialGroup, existingProfile.tutorialGroup, rosterEntry.tutorialGroup)).toUpperCase();
  const name = firstNonEmpty(
    overrides.name,
    existingProfile.name,
    rosterEntry.name,
    [firstName, lastName].filter(Boolean).join(' '),
    [initials, surname].filter(Boolean).join(' '),
    stripRole(existingProfile.displayName),
    authEmail
  );
  const displayBase = firstNonEmpty([initials, surname].filter(Boolean).join(' '), name, authEmail);

  return {
    ...(existingProfile || {}),
    uid: user?.uid || existingProfile.uid || null,
    role,
    username,
    authEmail,
    loginEmail: authEmail,
    email: personalEmail,
    personalEmail,
    studentId,
    studentNumber: studentId,
    studentNo: studentId,
    tutorialGroup,
    initials,
    surname,
    firstName,
    lastName,
    name,
    displayName: `${displayBase} [${role}]`,
    disabled: Boolean(existingProfile?.disabled),
  };
}

export function getIncompleteStudentFields(profile = {}) {
  const missing = [];
  if (!cleanText(profile.initials)) missing.push('initials');
  if (!cleanText(profile.surname)) missing.push('surname');
  if (!isValidStudentUsername(profile.username)) missing.push('username');
  const personalEmail = cleanLower(profile.personalEmail || profile.email);
  const username = normalizeStudentUsername(profile.username || profile.authEmail);
  if (!personalEmail || personalEmail === username) missing.push('email');
  if (!cleanText(profile.studentId || profile.studentNumber || profile.studentNo)) missing.push('studentId');
  return missing;
}

export async function loadStudentProfileContext(user) {
  const profileSnap = await get(ref(db, `users/${user.uid}/profile`));
  const existingProfile = profileSnap.exists() ? (profileSnap.val() || {}) : {};
  const existingMissingFields = getIncompleteStudentFields(existingProfile);
  const needsRosterLookup = !existingProfile?.uid
    || existingMissingFields.length > 0
    || Boolean(existingProfile?.needsProfileReview);

  let rosterRows = [];
  if (needsRosterLookup) {
    try {
      const rosterSnap = await get(ref(db, 'rosters/classList'));
      rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
    } catch (err) {
      console.warn('Roster lookup failed during student profile load; continuing with existing profile only:', err);
    }
  }
  const rosterEntry = findRosterEntry(rosterRows, {
    authEmail: user?.email,
    username: existingProfile?.username,
    email: existingProfile?.email || user?.email,
    personalEmail: existingProfile?.personalEmail || existingProfile?.email || user?.email,
    studentId: existingProfile?.studentId || existingProfile?.studentNumber || existingProfile?.studentNo,
  });
  const profile = buildStudentProfileDraft(user, existingProfile, rosterEntry || {});
  const missingFields = getIncompleteStudentFields(profile);
  const needsReview = Boolean(existingProfile?.needsProfileReview);
  return {
    profile,
    existingProfile,
    rosterEntry,
    missingFields,
    needsReview,
    needsCompletion: missingFields.length > 0 || needsReview,
    onRecord: {
      initials: firstNonEmpty(existingProfile.initials, deriveInitials(rosterEntry?.firstName || rosterEntry?.name || '')),
      surname: firstNonEmpty(existingProfile.surname, existingProfile.lastName, rosterEntry?.lastName),
      username: firstNonEmpty(existingProfile.username, rosterEntry?.username, user?.email),
      email: firstNonEmpty(existingProfile.personalEmail, existingProfile.email, rosterEntry?.email),
      studentId: firstNonEmpty(existingProfile.studentId, existingProfile.studentNumber, existingProfile.studentNo, rosterStudentId(rosterEntry)),
      tutorialGroup: firstNonEmpty(existingProfile.tutorialGroup, rosterEntry?.tutorialGroup).toUpperCase(),
      fullName: firstNonEmpty(existingProfile.name, stripRole(existingProfile.displayName), rosterEntry?.name),
    },
  };
}

export async function syncStudentProfileFromContext(user, context) {
  if (!context?.profile) return context;
  const existingJson = JSON.stringify(context.existingProfile || {});
  const draftJson = JSON.stringify(context.profile || {});
  if (existingJson === draftJson) return context;

  const payload = {
    ...context.profile,
    createdAt: context.existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: context.existingProfile?.source || 'student-roster-sync',
  };
  await set(ref(db, `users/${user.uid}/profile`), payload);
  return {
    ...context,
    existingProfile: payload,
    profile: payload,
    missingFields: getIncompleteStudentFields(payload),
    needsReview: Boolean(payload?.needsProfileReview),
    needsCompletion: getIncompleteStudentFields(payload).length > 0 || Boolean(payload?.needsProfileReview),
  };
}

export async function saveStudentProfile(user, values = {}, context = {}) {
  const baseProfile = context?.existingProfile || context?.profile || {};
  const rosterEntry = context?.rosterEntry || {};
  const draft = buildStudentProfileDraft(user, baseProfile, rosterEntry, values);
  const missingFields = getIncompleteStudentFields(draft);
  if (missingFields.length) {
    const err = new Error('Please complete all required profile fields.');
    err.missingFields = missingFields;
    throw err;
  }

  const payload = {
    ...draft,
    source: baseProfile?.source || 'student-profile-registration',
    createdAt: baseProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    needsProfileReview: false,
    profileConfirmedAt: new Date().toISOString(),
  };

  await set(ref(db, `users/${user.uid}/profile`), payload);
  await updateProfile(user, { displayName: payload.displayName });
  return payload;
}

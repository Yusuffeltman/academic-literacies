// src/auth.js
import { auth, authReady, db, functions, firebaseConfigError, appCheckConfigError } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithEmailLink,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { loadState } from './state.js';
import { initApp } from './app.js';
import { loadActiveRosterRows, writeResetLinkSignInEvent } from './analytics.js';
import { buildStudentProfileDraft, findRosterEntry, isValidStudentUsername, loadStudentProfileContext, normalizeStudentUsername, syncStudentProfileFromContext } from './profile.js';
import { getAppSurface } from './platform.js';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false;
const GENERIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const STUDENT_EMAIL_LINK_KEY = 'ale00y1-student-email-link';
const STUDENT_EMAIL_LINK_TTL_MS = 30 * 60 * 1000;
const STUDENT_OTP_EMAIL_KEY = 'ale00y1-student-otp-email';
const STAFF_ACCESS_SESSION_KEY = 'ale00y1-staff-access-enabled';
const STAFF_AUTO_SIGNIN_GRACE_MS = 30 * 1000;
const STAFF_MANUAL_SIGNIN_BYPASS_MS = 60 * 1000;

let DEV_USER = {
  uid: 'dev-user-001',
  email: 'developer@acadlit.dev',
  displayName: 'Developer [student]',
};

let _lastManualStaffSignInAt = 0;
let _cancelPendingStaffAutoContinue = null;

const _AUTH_ALLOWED_ROLES = ['student', 'tutor', 'lecturer', 'moderator'];

function _normalizeStudentEmailInput(value = '') {
  const raw = String(value || '');
  const normalized = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
  return normalized
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]+/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function _normalizeStudentNumberInput(value = '') {
  return String(value || '').replace(/\D+/g, '').trim();
}

function _normalizeLoginIdentifier(value = '') {
  const normalized = _normalizeStudentEmailInput(value);
  const extracted = normalized.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return extracted?.[0] || normalized.replace(/^mailto:/i, '').replace(/^['"<(\[]+|[>'")\],;:]+$/g, '');
}

function _maskEmail(value = '') {
  const email = _normalizeStudentEmailInput(value);
  if (!email.includes('@')) return value;
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? `${local.slice(0, 1)}*` : `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}`;
  return `${visible}@${domain}`;
}

function _storePendingStudentEmailLink(email = '', studentNumber = '') {
  try {
    localStorage.setItem(STUDENT_EMAIL_LINK_KEY, JSON.stringify({
      email: _normalizeStudentEmailInput(email),
      studentNumber: _normalizeStudentNumberInput(studentNumber),
      createdAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage failures; sign-in can still work on same device session.
  }
}

function _loadPendingStudentEmailLink() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDENT_EMAIL_LINK_KEY) || 'null') || null;
    if (!parsed?.email) return null;
    const createdAt = Date.parse(parsed.createdAt || '');
    if (!Number.isFinite(createdAt) || (Date.now() - createdAt) > STUDENT_EMAIL_LINK_TTL_MS) {
      _clearPendingStudentEmailLink();
      return null;
    }
    return {
      email: _normalizeStudentEmailInput(parsed.email),
      studentNumber: _normalizeStudentNumberInput(parsed.studentNumber),
      createdAt: parsed.createdAt,
    };
  } catch {
    _clearPendingStudentEmailLink();
    return null;
  }
}

function _clearPendingStudentEmailLink() {
  try {
    localStorage.removeItem(STUDENT_EMAIL_LINK_KEY);
  } catch {
    // Ignore storage failures during cleanup.
  }
}

function _storePendingStudentOtpEmail(email = '') {
  const normalized = _normalizeStudentEmailInput(email);
  if (!normalized) return;
  try {
    sessionStorage.setItem(STUDENT_OTP_EMAIL_KEY, normalized);
  } catch {
    // Ignore storage failures; OTP can still work in-memory.
  }
}

function _loadPendingStudentOtpEmail() {
  try {
    return _normalizeStudentEmailInput(sessionStorage.getItem(STUDENT_OTP_EMAIL_KEY) || '');
  } catch {
    return '';
  }
}

function _clearPendingStudentOtpEmail() {
  try {
    sessionStorage.removeItem(STUDENT_OTP_EMAIL_KEY);
  } catch {
    // Ignore storage failures during cleanup.
  }
}

function _emailLinkActionSettings() {
  const appUrl = import.meta.env.VITE_APP_URL || '';
  const useConfiguredOrigin = Boolean(appUrl) && window.location.hostname !== 'localhost';
  const origin = useConfiguredOrigin ? appUrl : window.location.origin;
  const url = new URL(origin);
  url.searchParams.set('studentEmailLink', '1');
  return {
    url: url.toString(),
    handleCodeInApp: true,
  };
}

function _passwordResetContinueUrl() {
  const appUrl = import.meta.env.VITE_APP_URL || '';
  const useConfiguredOrigin = Boolean(appUrl) && window.location.hostname !== 'localhost';
  const origin = useConfiguredOrigin ? appUrl : window.location.origin;
  const url = new URL(origin);
  url.searchParams.set('passwordReset', '1');
  return url.toString();
}

async function _requestStaffPasswordReset(email = '') {
  const normalizedEmail = _normalizeLoginIdentifier(email);
  const sendStaffPasswordReset = httpsCallable(functions, 'sendStaffPasswordReset');
  try {
    await sendStaffPasswordReset({
      email: normalizedEmail,
      continueUrl: _passwordResetContinueUrl(),
    });
    return { ok: true };
  } catch (err) {
    const code = String(err?.code || '');
    if (code === 'functions/unimplemented' || code === 'functions/not-found') {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { ok: true, fallback: true };
    }
    throw err;
  }
}

function _assertFirebaseAuthReady() {
  if (!firebaseConfigError) return;
  throw new Error(firebaseConfigError);
}

async function _waitForAuthReady() {
  try {
    await authReady;
  } catch {
    // Firebase module already logged the persistence fallback failure.
  }
}

function _temporarySignInBlock(message = 'We could not verify your sign-in right now. Check your connection and try again.') {
  return {
    blocked: true,
    reason: message,
  };
}

function _assertStudentOtpReady() {
  if (firebaseConfigError) {
    throw new Error(firebaseConfigError);
  }
  // App Check is best-effort — don't block sign-in if reCAPTCHA fails to load.
  // The Cloud Functions accept requests without App Check tokens (soft enforcement).
  if (appCheckConfigError) {
    console.warn('App Check not configured — OTP will proceed without verification token:', appCheckConfigError);
  }
}

function _isAndroidStudentSurface() {
  return Boolean(getAppSurface().isAndroidApp);
}

function _isStaffAccessEnabled() {
  if (_isAndroidStudentSurface()) {
    return true;
  }
  try {
    return sessionStorage.getItem(STAFF_ACCESS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function _setStaffAccessEnabled(enabled) {
  if (_isAndroidStudentSurface()) {
    return;
  }
  try {
    if (enabled) sessionStorage.setItem(STAFF_ACCESS_SESSION_KEY, '1');
    else sessionStorage.removeItem(STAFF_ACCESS_SESSION_KEY);
  } catch {
    // Ignore storage failures; fallback is current-page only.
  }
}

function _applyStaffAccessVisibility(enabled = _isStaffAccessEnabled()) {
  const androidInspection = _isAndroidStudentSurface();
  const staffEnabled = androidInspection || enabled;
  const regTab = document.getElementById('tab-reg');
  if (regTab) {
    regTab.textContent = androidInspection ? 'Staff Inspect' : 'Staff';
    regTab.style.display = staffEnabled ? '' : 'none';
    regTab.setAttribute('aria-hidden', staffEnabled ? 'false' : 'true');
  }
  if (!staffEnabled) {
    const loginTab = document.getElementById('tab-login');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-reg');
    loginTab?.classList.add('on');
    regTab?.classList.remove('on');
    loginForm?.classList.add('on');
    regForm?.classList.remove('on');
  }
}

function _wireHiddenStaffAccess() {
  if (_isAndroidStudentSurface()) return;
  const trigger = document.querySelector('.auth-hero-icon');
  if (!trigger || trigger.dataset.staffAccessBound === '1') return;
  trigger.dataset.staffAccessBound = '1';
  trigger.addEventListener('click', (event) => {
    if (!event.shiftKey) return;
    _setStaffAccessEnabled(true);
    _applyStaffAccessVisibility(true);
    window.switchTab?.('reg');
    const successEl = document.getElementById('reg-success');
    const errEl = document.getElementById('reg-err');
    if (errEl) errEl.textContent = '';
    if (successEl) successEl.textContent = 'Staff access unlocked for this session.';
  });
}

function _wireStaffEmailSanitizer() {
  const input = document.getElementById('reg-username');
  if (!input || input.dataset.emailSanitizerBound === '1') return;
  input.dataset.emailSanitizerBound = '1';

  const sanitize = () => {
    const cleaned = _normalizeLoginIdentifier(input.value || '');
    if (cleaned && input.value !== cleaned) {
      input.value = cleaned;
    }
  };

  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('autocomplete', 'username');
  input.setAttribute('inputmode', 'email');
  input.setAttribute('spellcheck', 'false');
  input.addEventListener('blur', sanitize);
  input.addEventListener('change', sanitize);
  input.addEventListener('paste', () => setTimeout(sanitize, 0));
}

function _syncOtpUi(email = '') {
  const normalized = _normalizeStudentEmailInput(email);
  const otpWrap = document.getElementById('otp-wrap');
  const verifyBtn = document.getElementById('btn-verify-otp');
  const successEl = document.getElementById('login-success');
  const emailInput = document.getElementById('login-email');
  if (otpWrap) otpWrap.style.display = normalized ? 'block' : 'none';
  if (verifyBtn) verifyBtn.style.display = normalized ? 'block' : 'none';
  if (normalized && emailInput && !emailInput.value) {
    emailInput.value = normalized;
  }
  if (normalized && successEl && !successEl.textContent) {
    successEl.textContent = `Enter the 6-digit code sent to ${_maskEmail(normalized)}.`;
  }
}

async function _sendStudentEmailLink(identifier = '') {
  _assertFirebaseAuthReady();
  const email = _normalizeStudentEmailInput(identifier);
  if (!_isValidLoginEmailInput(email)) {
    throw new Error('Enter your personal email address, such as Gmail or Outlook.');
  }
  await sendSignInLinkToEmail(auth, email, _emailLinkActionSettings());
  _storePendingStudentEmailLink(email, '');
  return {
    personalEmail: email,
    studentNumber: '',
  };
}

async function _consumeStudentEmailLink(identifier = '') {
  if (!isSignInWithEmailLink(auth, window.location.href)) return;
  _assertFirebaseAuthReady();

  const errEl = document.getElementById('login-err');
  const successEl = document.getElementById('login-success');
  if (errEl) errEl.textContent = '';
  if (successEl) successEl.textContent = 'Verifying your secure sign-in link...';

  try {
    let pending = _loadPendingStudentEmailLink();
    if (!pending?.email) {
      const typedEmail = _normalizeStudentEmailInput(identifier || document.getElementById('login-email')?.value || '');
      if (_isValidLoginEmailInput(typedEmail)) {
        pending = { email: typedEmail, studentNumber: '' };
      }
    }
    if (!pending?.email) {
      if (errEl) errEl.textContent = '';
      if (successEl) successEl.textContent = 'Sign-in link detected. Type your email address below and tap "Email me a secure sign-in link" to finish.';
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
      return;
    }
    await signInWithEmailLink(auth, pending.email, window.location.href);
    _clearPendingStudentEmailLink();
    try {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    } catch {
      // Ignore URL cleanup failures.
    }
    if (successEl) successEl.textContent = 'Sign-in confirmed. Loading your dashboard...';
  } catch (err) {
    if (successEl) successEl.textContent = '';
    if (errEl) errEl.textContent = friendlyError(err?.code) || describeError(err) || 'The secure sign-in link could not be used.';
  }
}

function _isValidStudentEmailInput(value = '') {
  const normalized = _normalizeStudentEmailInput(value);
  return normalized.includes('@') && isValidStudentUsername(normalized);
}

function _isValidLoginEmailInput(value = '') {
  return GENERIC_EMAIL_RE.test(_normalizeStudentEmailInput(value));
}

function _staffAccessBlockedReason() {
  return 'This email is not linked to a staff or administrator account yet. Use your official roster-listed UJ student account, or ask a lecturer to create or update your staff profile first.';
}

function _markManualStaffSignIn() {
  _lastManualStaffSignInAt = Date.now();
}

function _isRecentManualStaffSignIn() {
  return (Date.now() - _lastManualStaffSignInAt) < STAFF_MANUAL_SIGNIN_BYPASS_MS;
}

function _cancelStaffAutoContinue() {
  if (_cancelPendingStaffAutoContinue) {
    _cancelPendingStaffAutoContinue();
    _cancelPendingStaffAutoContinue = null;
  }
}

function _waitForStaffAutoContinue(user) {
  _cancelStaffAutoContinue();
  _setStaffAccessEnabled(true);
  _applyStaffAccessVisibility(true);
  showAuthScreen();
  window.switchTab?.('reg');

  const successEl = document.getElementById('reg-success');
  const errEl = document.getElementById('reg-err');
  const emailInput = document.getElementById('reg-username');
  const passwordInput = document.getElementById('login-pass');

  if (errEl) errEl.textContent = '';

  return new Promise((resolve) => {
    let settled = false;
    let paused = false;
    const startedAt = Date.now();
    let countdownInterval = null;
    let releaseTimer = null;

    const cleanup = () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (releaseTimer) clearTimeout(releaseTimer);
      emailInput?.removeEventListener('focus', pauseAutoContinue);
      emailInput?.removeEventListener('input', pauseAutoContinue);
      passwordInput?.removeEventListener('focus', pauseAutoContinue);
      passwordInput?.removeEventListener('input', pauseAutoContinue);
      const continueBtn = document.getElementById('btn-staff-continue-session');
      continueBtn?.removeEventListener('click', continueNow);
      if (_cancelPendingStaffAutoContinue === cancelPending) {
        _cancelPendingStaffAutoContinue = null;
      }
    };

    const render = () => {
      if (!successEl) return;
      const email = String(user?.email || 'current staff account').trim();
      if (paused) {
        successEl.innerHTML = `Signed in as <strong>${email}</strong>. Auto sign-in paused so you can enter different staff credentials.<br><button id="btn-staff-continue-session" type="button" style="margin-top:10px;padding:8px 14px;border:none;border-radius:999px;background:#0d9488;color:white;cursor:pointer;">Continue with current account</button>`;
      } else {
        const secondsLeft = Math.max(1, Math.ceil((STAFF_AUTO_SIGNIN_GRACE_MS - (Date.now() - startedAt)) / 1000));
        successEl.innerHTML = `Signed in as <strong>${email}</strong>. Continuing automatically in ${secondsLeft}s so staff can change accounts first.<br><button id="btn-staff-continue-session" type="button" style="margin-top:10px;padding:8px 14px;border:none;border-radius:999px;background:#0d9488;color:white;cursor:pointer;">Continue now</button>`;
      }
      document.getElementById('btn-staff-continue-session')?.addEventListener('click', continueNow, { once: true });
    };

    const settle = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    function continueNow() {
      settle(true);
    }

    function pauseAutoContinue() {
      if (paused || settled) return;
      paused = true;
      if (countdownInterval) clearInterval(countdownInterval);
      if (releaseTimer) clearTimeout(releaseTimer);
      render();
    }

    function cancelPending() {
      settle(false);
    }

    _cancelPendingStaffAutoContinue = cancelPending;
    emailInput?.addEventListener('focus', pauseAutoContinue);
    emailInput?.addEventListener('input', pauseAutoContinue);
    passwordInput?.addEventListener('focus', pauseAutoContinue);
    passwordInput?.addEventListener('input', pauseAutoContinue);

    render();
    countdownInterval = setInterval(() => {
      if (!paused) render();
    }, 1000);
    releaseTimer = setTimeout(() => settle(true), STAFF_AUTO_SIGNIN_GRACE_MS);
  });
}

async function _loadClassRosterRows() {
  return loadActiveRosterRows();
}

function _findRosterEntryForAuthUser(user, existingProfile = {}, rosterRows = []) {
  return findRosterEntry(rosterRows, {
    authEmail: user?.email,
    username: existingProfile?.username || user?.email,
    email: existingProfile?.email,
    personalEmail: existingProfile?.personalEmail || existingProfile?.email || user?.email,
    studentId: existingProfile?.studentId || existingProfile?.studentNumber || existingProfile?.studentNo,
  });
}

async function _deletedStudentAccountRecord(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `analytics/deleted-student-accounts/${uid}`));
    return snap.exists() ? (snap.val() || {}) : null;
  } catch (err) {
    throw new Error(err?.code || 'deleted-account-check-failed');
  }
}

function _processedAuthUserKey(email = '') {
  return normalizeStudentUsername(email).replace(/[.#$\[\]@/]/g, '_');
}

async function _loadProcessedAuthRecoveryRecord(email = '') {
  const key = _processedAuthUserKey(email);
  if (!key) return null;
  try {
    const snap = await get(ref(db, `analytics/processed-auth-users/${key}`));
    return snap.exists() ? (snap.val() || {}) : null;
  } catch (err) {
    throw new Error(err?.code || 'processed-auth-recovery-check-failed');
  }
}

async function _acknowledgeRosterResetSignIn(user, currentProfile = {}, existingProfile = {}) {
  const currentStatus = String(existingProfile?.rosterEnrollmentStatus || currentProfile?.rosterEnrollmentStatus || '').trim().toLowerCase();
  const alreadyShownAt = existingProfile?.resetLinkSignInAlertShownAt || currentProfile?.resetLinkSignInAlertShownAt || null;
  let shouldNotify = currentStatus === 'reset-email-sent' && !alreadyShownAt;

  let processedRecord = null;
  if (!shouldNotify) {
    processedRecord = await _loadProcessedAuthRecoveryRecord(user?.email || '');
    const processedStatus = String(processedRecord?.rosterEnrollmentStatus || '').trim().toLowerCase();
    shouldNotify = processedStatus === 'reset-email-sent' && !processedRecord?.resetLinkSignInAlertShownAt;
  }

  if (!shouldNotify) return currentProfile;

  const nowIso = new Date().toISOString();
  const nextProfile = {
    ...currentProfile,
    uid: user?.uid || currentProfile?.uid || null,
    mustResetPassword: false,
    rosterEnrollmentStatus: 'reset-link-used',
    resetLinkSignInAlertShownAt: nowIso,
    rosterLinkedAt: currentProfile?.rosterLinkedAt || existingProfile?.rosterLinkedAt || nowIso,
    updatedAt: nowIso,
  };
  await set(ref(db, `users/${user.uid}/profile`), nextProfile);

  if (!processedRecord) {
    processedRecord = await _loadProcessedAuthRecoveryRecord(user?.email || '');
  }
  if (processedRecord) {
    const key = _processedAuthUserKey(user?.email || '');
    await set(ref(db, `analytics/processed-auth-users/${key}`), {
      ...processedRecord,
      rosterEnrollmentStatus: 'reset-link-used',
      resetLinkSignInAlertShownAt: nowIso,
      updatedAt: nowIso,
    }).catch(() => { });
  }

  await writeResetLinkSignInEvent({
    user,
    profile: nextProfile,
    existingProfile,
    role: 'student',
    source: 'auth-reset-link',
  });
  return nextProfile;
}

function _roleFromAuthDisplayName(user) {
  const role = String(user?.displayName || '').match(/\[(.*?)\]/)?.[1]?.trim().toLowerCase() || '';
  return _AUTH_ALLOWED_ROLES.includes(role) ? role : '';
}

async function _restoreStaffProfileFromAuth(user, role) {
  if (!user?.uid || !role || role === 'student') return null;
  const baseName = String(user?.displayName || user?.email || 'User').split(' [')[0].trim() || String(user?.email || 'User').trim();
  const displayName = `${baseName} [${role}]`;
  const nowIso = new Date().toISOString();
  const payload = {
    uid: user.uid,
    role,
    email: user.email || '',
    authEmail: user.email || '',
    username: user.email || '',
    displayName,
    disabled: false,
    source: 'staff-auth-recovery',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await set(ref(db, `users/${user.uid}/profile`), payload);
  await remove(ref(db, `analytics/deleted-student-accounts/${user.uid}`)).catch(() => { });
  if (displayName !== user.displayName) {
    await updateProfile(user, { displayName });
  }
  return payload;
}

async function _applyProfileRoleOnLogin(user) {
  try {
    const isStudentEmail = isValidStudentUsername(user?.email || '');
    const deletedAccount = await _deletedStudentAccountRecord(user?.uid);
    const authRole = _roleFromAuthDisplayName(user);
    if (deletedAccount) {
      if (!isStudentEmail && authRole && authRole !== 'student') {
        await _restoreStaffProfileFromAuth(user, authRole);
        return { blocked: false, role: authRole, hasProfile: true };
      }
      return {
        blocked: true,
        reason: 'This old account is no longer active. Do not create another account. If you are unsure what to use, enter your student number or ask your lecturer to help restore the correct account.',
      };
    }
    const snap = await get(ref(db, `users/${user.uid}/profile`));
    const hasProfile = snap.exists();
    const profile = hasProfile ? (snap.val() || {}) : {};

    if (!hasProfile) {
      if (authRole && authRole !== 'student' && !isStudentEmail) {
        await _restoreStaffProfileFromAuth(user, authRole);
        return { blocked: false, role: authRole, hasProfile: true };
      }
      return {
        blocked: false,
        role: 'student',
        hasProfile: false,
      };
    }
    if (profile?.disabled) {
      return { blocked: true, reason: 'This account is currently disabled. Contact your lecturer with your student number and official UJ email so they can restore or reset the correct account.' };
    }

    const role = String(profile?.role || '').trim().toLowerCase();
    const resolvedRole = _AUTH_ALLOWED_ROLES.includes(role) ? role : 'student';

    const currentName = String(user.displayName || profile?.displayName || user.email || '').trim();
    const baseName = currentName.split(' [')[0].trim() || String(profile?.displayName || user.email || '').split(' [')[0].trim() || 'User';
    const wanted = `${baseName} [${resolvedRole}]`;
    if (wanted !== user.displayName) {
      await updateProfile(user, { displayName: wanted });
    }
    return { blocked: false, role: resolvedRole, hasProfile: true };
  } catch (err) {
    console.error('Auth profile verification failed:', err);
    return _temporarySignInBlock('We could not verify this account with Firebase right now. Please try again in a moment. If it keeps happening, ask your lecturer to confirm your account profile.');
  }
}

// ── Dev role switcher ──────────────────────────
function _devRoleMenu() {
  const existing = document.getElementById('dev-role-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.id = 'dev-role-menu';
  menu.style.cssText = `
    position:fixed; bottom:60px; right:16px; z-index:10000;
    background:#1e293b; border:1px solid rgba(255,255,255,.15);
    border-radius:12px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.4);
  `;
  menu.innerHTML = ['student', 'lecturer', 'tutor'].map(r => `
    <button onclick="
      document.getElementById('dev-role-menu')?.remove();
      window._devSwitchRole('${r}');
    " style="display:block;width:100%;padding:12px 20px;background:none;border:none;
      color:rgba(255,255,255,.8);font-size:13px;cursor:pointer;text-align:left;
      font-family:monospace;border-bottom:1px solid rgba(255,255,255,.08);">
      [${r}]
    </button>`).join('');
  document.body.appendChild(menu);
}

window._devSwitchRole = async (role) => {
  DEV_USER = { uid: `dev-${role}`, email: `${role}@acadlit.dev`, displayName: `Dev ${role} [${role}]` };
  await loadState(DEV_USER);
  initApp(DEV_USER);
};

export function initAuth(onSuccess) {
  if (DEV_MODE) {
    showDevBanner();
    hideAuthScreen();
    onSuccess(DEV_USER);
    return;
  }

  _applyStaffAccessVisibility();
  _wireHiddenStaffAccess();
  _wireStaffEmailSanitizer();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      _cancelStaffAutoContinue();
      return;
    }

    const PHASE_TIMEOUT_MS = 10000;

    // ── Phase 1: Verify role (with timeout) ──
    let roleSync;
    try {
      roleSync = await Promise.race([
        _applyProfileRoleOnLogin(user),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PHASE_TIMEOUT_MS)),
      ]);
    } catch (err) {
      console.warn('Profile role check failed or timed out — proceeding as student:', err);
      roleSync = { blocked: false, role: 'student', hasProfile: false };
    }
    if (roleSync?.blocked) {
      await auth.signOut().catch(() => {});
      showAuthScreen();
      const errEl = document.getElementById('login-err');
      if (errEl) errEl.textContent = roleSync.reason || 'Access blocked.';
      return;
    }

    // ── Phase 2: Prepare student profile (with timeout around entire block) ──
    const currentRole = String(roleSync?.role || String(user.displayName || '').match(/\[(.*?)\]/)?.[1] || '').toLowerCase();
    user._resolvedRole = currentRole || 'student';
    const isStaffSession = currentRole && currentRole !== 'student';
    if (isStaffSession && !_isRecentManualStaffSignIn()) {
      const shouldContinue = await _waitForStaffAutoContinue(user);
      if (!shouldContinue) {
        return;
      }
    }

    hideAuthScreen();

    const shouldPrepareStudentProfile = currentRole === 'student' || isValidStudentUsername(user?.email || '');
    if (shouldPrepareStudentProfile) {
      try {
        await Promise.race([
          (async () => {
            const profileContext = await loadStudentProfileContext(user);
            user._studentProfileContext = await syncStudentProfileFromContext(user, profileContext);
            user._studentProfileContext.profile = await _acknowledgeRosterResetSignIn(
              user,
              user._studentProfileContext.profile || {},
              profileContext?.existingProfile || {}
            );
            const hydratedDisplayName = String(user._studentProfileContext?.profile?.displayName || '').trim();
            if (hydratedDisplayName && hydratedDisplayName !== user.displayName) {
              await updateProfile(user, { displayName: hydratedDisplayName });
            }
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PHASE_TIMEOUT_MS)),
        ]);
      } catch (err) {
        console.warn('Student profile preparation timed out or failed — continuing without:', err);
      }
    }

    // ── Phase 3: Hand off to app ──
    try {
      await onSuccess(user);
    } catch (e) {
      console.error('Post-auth bootstrap failed:', e);
      showAuthScreen();
      const errEl = document.getElementById('login-err');
      if (errEl) errEl.textContent = `Signed in, but failed to load your data: ${describeError(e)}`;
    }
  });

  _consumeStudentEmailLink().catch((err) => {
    console.error('Student email-link recovery failed:', err);
  });

  // Student sign-in: OTP code (form-login tab)
  let _otpPendingEmail = _loadPendingStudentOtpEmail();
  _syncOtpUi(_otpPendingEmail);

  const btnLoginLink = document.getElementById('btn-login-link');
  if (btnLoginLink) {
    btnLoginLink.addEventListener('click', async () => {
      await _waitForAuthReady();
      const email = _normalizeStudentEmailInput(document.getElementById('login-email')?.value);
      const errEl = document.getElementById('login-err');
      const successEl = document.getElementById('login-success');
      errEl.textContent = '';
      successEl.textContent = '';

      if (!_isValidLoginEmailInput(email)) {
        errEl.textContent = 'Enter your personal email address, such as Gmail or Outlook.';
        return;
      }

        btnLoginLink.disabled = true;
        btnLoginLink.textContent = 'Sending code...';
        try {
          _assertStudentOtpReady();
          const sendOtp = httpsCallable(functions, 'sendOtp');
          // Retry once on transient failures (network, App Check, cold start)
          let lastErr;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await sendOtp({ email });
              lastErr = null;
              break;
            } catch (e) {
              lastErr = e;
              const code = e?.code || '';
              const retriable = code === 'functions/unavailable' || code === 'functions/unauthenticated' || code === 'functions/internal' || code === 'auth/network-request-failed';
              if (!retriable || attempt === 1) break;
              btnLoginLink.textContent = 'Retrying...';
              await new Promise(r => setTimeout(r, 1500));
            }
          }
          if (lastErr) throw lastErr;
          _otpPendingEmail = email;
          _storePendingStudentOtpEmail(email);
          successEl.textContent = `A 6-digit code was sent to ${_maskEmail(email)}. It may take up to 2 minutes — check your inbox and spam folder.`;
          _syncOtpUi(email);
          const otpInput = document.getElementById('login-otp');
          if (otpInput) { otpInput.value = ''; otpInput.focus(); }
      } catch (err) {
        const msg = err?.message || '';
        const code = err?.code || '';
        if (code === 'functions/unauthenticated') {
          errEl.textContent = 'Verification failed. This can happen with ad-blockers or private browsing. Try disabling extensions, or use a different browser and try again.';
        } else if (msg.includes('Please wait')) {
          errEl.textContent = msg;
        } else {
          errEl.textContent = friendlyError(code) || describeError(err);
        }
      }
      btnLoginLink.disabled = false;
      btnLoginLink.textContent = 'Send me a sign-in code';
    });
  }

  const btnVerifyOtp = document.getElementById('btn-verify-otp');
  if (btnVerifyOtp) {
    btnVerifyOtp.addEventListener('click', async () => {
      await _waitForAuthReady();
      const code = String(document.getElementById('login-otp')?.value || '').trim();
      const errEl = document.getElementById('login-err');
      const successEl = document.getElementById('login-success');
      errEl.textContent = '';
      successEl.textContent = '';
      const resolvedEmail = _normalizeStudentEmailInput(_otpPendingEmail || document.getElementById('login-email')?.value || '');

      if (!_isValidLoginEmailInput(resolvedEmail)) {
        errEl.textContent = 'Enter your email and request a code first.';
        return;
      }
      if (!code || code.length < 6) {
        errEl.textContent = 'Enter the 6-digit code from your email.';
        return;
      }

      btnVerifyOtp.disabled = true;
      btnVerifyOtp.textContent = 'Verifying...';
      try {
        _assertStudentOtpReady();
        const verifyOtp = httpsCallable(functions, 'verifyOtp');
        // Retry once on transient failures
        let lastErr;
        let result;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            result = await verifyOtp({ email: resolvedEmail, code });
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            const eCode = e?.code || '';
            const retriable = eCode === 'functions/unavailable' || eCode === 'functions/unauthenticated' || eCode === 'functions/internal';
            if (!retriable || attempt === 1) break;
            btnVerifyOtp.textContent = 'Retrying...';
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        if (lastErr) throw lastErr;
        const token = result?.data?.token;
        if (!token) throw new Error('No token received.');
        successEl.textContent = 'Code verified. Signing you in...';
        _otpPendingEmail = resolvedEmail;
        _clearPendingStudentOtpEmail();
        await signInWithCustomToken(auth, token);
        // onAuthStateChanged will handle the rest
      } catch (err) {
        const msg = err?.message || '';
        const eCode = err?.code || '';
        if (eCode === 'functions/unauthenticated') {
          errEl.textContent = 'Verification failed. Try disabling ad-blockers or private browsing, or use a different browser.';
        } else if (msg.includes('Incorrect') || msg.includes('expired') || msg.includes('Too many') || msg.includes('No code')) {
          errEl.textContent = msg;
        } else {
          errEl.textContent = friendlyError(eCode) || describeError(err);
        }
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.textContent = 'Verify code & sign in';
      }
    });
  }

  // Staff sign-in: email + password (form-reg tab)
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      await _waitForAuthReady();
      const emailInput = document.getElementById('reg-username');
      const email = _normalizeLoginIdentifier(emailInput?.value || '');
      const pass = document.getElementById('login-pass').value;
      const errEl = document.getElementById('reg-err');
      const successEl = document.getElementById('reg-success');
      const originalText = btnLogin.textContent;

      if (emailInput && email) {
        emailInput.value = email;
      }

      btnLogin.disabled = true;
      btnLogin.textContent = 'SIGNING IN...';
      if (errEl) errEl.textContent = '';
      if (successEl) successEl.textContent = '';
      try {
        if (!_isValidLoginEmailInput(email)) {
          console.warn('[auth] Staff email failed validation', {
            raw: String(emailInput?.value || ''),
            normalized: email,
          });
          throw new Error('Enter a valid staff email address, for example name@gmail.com.');
        }
        _markManualStaffSignIn();
        _cancelStaffAutoContinue();
        await signInWithEmailAndPassword(auth, email, pass);
        if (successEl) {
          successEl.textContent = _isAndroidStudentSurface()
            ? 'Sign-in confirmed. Loading the student experience...'
            : 'Sign-in confirmed. Loading your dashboard...';
        }
      } catch (e) {
        console.error('Sign in FAILED:', e);
        showAuthScreen();
        if (errEl) errEl.textContent = friendlyError(e.code) || `Sign-in failed: ${describeError(e)}`;
        btnLogin.disabled = false;
        btnLogin.textContent = originalText;
      }
    });
  }

  // Forgot password (form-reg tab)
  const btnForgot = document.getElementById('btn-forgot');
  if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
      await _waitForAuthReady();
      const rawIdentifier = document.getElementById('reg-username').value;
      const email = _normalizeLoginIdentifier(rawIdentifier);
      const errEl = document.getElementById('reg-err');
      const successEl = document.getElementById('reg-success');
      if (errEl) errEl.textContent = '';
      if (successEl) successEl.textContent = '';

      if (!rawIdentifier) {
        if (errEl) errEl.textContent = 'Enter your staff email address above first.';
        return;
      }

      btnForgot.disabled = true;
      btnForgot.textContent = 'Sending...';
      try {
        if (!_isValidLoginEmailInput(email)) {
          throw new Error('Enter a valid staff email address.');
        }
        const result = await _requestStaffPasswordReset(email);
        if (successEl) {
          successEl.textContent = result?.fallback
            ? `Password reset link requested for ${email}. Check your inbox and spam/junk folder.`
            : `Password reset link sent to ${email}. Check your inbox and spam/junk folder.`;
        }
      } catch (e) {
        console.error('Password reset failed:', e.code, e.message);
        const msg = {
          'functions/not-found': 'No account found with that email address.',
          'functions/resource-exhausted': e.message || 'Please wait a minute before requesting another reset email.',
          'functions/unavailable': 'Reset email delivery is temporarily unavailable. Please try again shortly.',
          'functions/failed-precondition': 'Password reset email is not configured yet. Ask the administrator to complete SMTP setup.',
          'functions/invalid-argument': e.message || 'Please enter a valid email address.',
          'auth/user-not-found': 'No account found with that email address.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
          'auth/network-request-failed': 'Network error. Check your internet connection.',
        }[e.code];
        if (errEl) errEl.textContent = msg || friendlyError(e.code) || `Could not send reset email: ${describeError(e)}`;
      }
      btnForgot.disabled = false;
      btnForgot.textContent = 'Forgot password / send reset?';
    });
  }

  // Expose switchTab to window for onclick handlers
  window.switchTab = (tab) => {
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-reg');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-reg');

    if (tab === 'reg' && !_isStaffAccessEnabled()) {
      return;
    }

    if (tab === 'login') {
      loginTab.classList.add('on');
      regTab.classList.remove('on');
      loginForm.classList.add('on');
      regForm.classList.remove('on');
    } else {
      loginTab.classList.remove('on');
      regTab.classList.add('on');
      loginForm.classList.remove('on');
      regForm.classList.add('on');
    }
  };
}

export function signOut() {
  _cancelStaffAutoContinue();
  if (DEV_MODE) { location.reload(); return; }
  auth.signOut().then(() => location.reload());
}

let _hideAuthTimer = null;

function hideAuthScreen() {
  window.__ACADEMIC_BOOT_MONITOR = window.__ACADEMIC_BOOT_MONITOR || { pending: false };
  window.__ACADEMIC_BOOT_MONITOR.pending = true;
  if (_hideAuthTimer) { clearTimeout(_hideAuthTimer); _hideAuthTimer = null; }
  const el = document.getElementById('auth-screen');
  if (el) {
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    _hideAuthTimer = setTimeout(() => { el.style.display = 'none'; _hideAuthTimer = null; }, 400);
  }
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.display = 'block';
    // Show loading indicator so the user doesn't see a blank page while state loads
    if (!appEl.children.length) {
      appEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;">
        <div style="text-align:center;">
          <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:#0d9488;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div>
          <p style="color:rgba(255,255,255,.5);font-size:13px;font-family:Inter,sans-serif;">Loading your dashboard…</p>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      </div>`;
    }
  }
  document.body.style.cssText = '';
}

export function showAuthScreen() {
  window.__ACADEMIC_BOOT_MONITOR = window.__ACADEMIC_BOOT_MONITOR || { pending: false };
  window.__ACADEMIC_BOOT_MONITOR.pending = false;
  // Cancel any pending hide-auth timer to prevent race condition
  if (_hideAuthTimer) { clearTimeout(_hideAuthTimer); _hideAuthTimer = null; }
  const el = document.getElementById('auth-screen');
  if (el) {
    el.style.display = '';
    el.style.opacity = '1';
    el.style.transition = '';
  }
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'none';
}

function showDevBanner() {
  const banner = document.createElement('div');
  banner.id = 'dev-banner';
  banner.style.cssText = `
    position:fixed; bottom:16px; right:16px; z-index:9999;
    background:#1e293b; color:#fbbf24; padding:10px 16px;
    border-radius:10px; font-family:monospace; font-size:12px;
    box-shadow:0 4px 20px rgba(0,0,0,.3); line-height:1.5;
    cursor:pointer; user-select:none;
  `;
  const role = DEV_USER.displayName?.match(/\[(.*?)\]/)?.[1] ?? 'student';
  banner.innerHTML = `⚙️ <strong>DEV</strong> · role: <strong style="color:#4ade80">${role}</strong><br>
    <span style="color:rgba(255,255,255,.4);font-size:10px;">Click to switch role</span>`;
  banner.onclick = _devRoleMenu;
  document.body.appendChild(banner);
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with that email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'That email address is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'That email address appears malformed. Retype it manually and remove any extra spaces.',
    'auth/invalid-action-code': 'This sign-in link is invalid. Request a new secure sign-in link.',
    'auth/expired-action-code': 'This sign-in link has expired. Request a new secure sign-in link.',
    'auth/network-request-failed': 'Network error. Please check your internet connection or Firebase configuration.',
    'auth/unauthorized-domain': 'Sign-in is not allowed from this domain. Please add this Moodle domain to the "Authorized domains" in your Firebase Console (Authentication > Settings).',
    'functions/failed-precondition': 'App security is not fully configured yet. Ask the administrator to finish Firebase App Check setup.',
    'functions/unauthenticated': 'This app could not be verified. Refresh and try again.',
    'functions/unavailable': 'The sign-in service is temporarily unavailable. Please try again.',
    'functions/already-exists': 'This code has already been used. Request a new one.',
  };
  return code ? (map[code] || `Error: ${code}`) : null;
}

function describeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.code) return err.code;
  if (err.message) return err.message;
  return 'Unknown error';
}

import { auth, functions } from './firebase.js';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

// Single source of truth for sending a password reset, shared by the login
// screen's self-service flow (auth.js) and the lecturer dashboard's
// "Resend Reset" actions (dashboards/lecturer.js).
//
// It lives in its own module rather than in auth.js because lecturer.js cannot
// import auth.js: auth.js -> app.js -> dashboards/lecturer.js would close a
// circular import.
//
// Sending goes through the sendStaffPasswordReset callable, which generates the
// link with the Admin SDK and delivers a branded email over our own SMTP. The
// client SDK's sendPasswordResetEmail is kept only as a fallback for when that
// function is not deployed, because it sends Firebase's unbranded default
// template and carries no server-side rate limit.

/** Where Firebase returns the user after they complete the reset. */
export function passwordResetContinueUrl() {
  const appUrl = import.meta.env.VITE_APP_URL || '';
  const useConfiguredOrigin = Boolean(appUrl) && window.location.hostname !== 'localhost';
  const origin = useConfiguredOrigin ? appUrl : window.location.origin;
  const url = new URL(origin);
  url.searchParams.set('passwordReset', '1');
  return url.toString();
}

/**
 * A callable that is not deployed surfaces the same 'functions/not-found' code
 * that sendStaffPasswordReset throws for an unknown account, so the two are
 * separated by message. Getting this wrong would mask a genuine "no account"
 * error behind a fallback that then fails with a rawer Firebase error.
 */
function _isMissingAccountError(err) {
  if (String(err?.code || '') !== 'functions/not-found') return false;
  return /no account found/i.test(String(err?.message || ''));
}

function _isFunctionUnavailableError(err) {
  const code = String(err?.code || '');
  if (code === 'functions/unimplemented') return true;
  return code === 'functions/not-found' && !_isMissingAccountError(err);
}

/**
 * Sends a branded password reset email to `email`.
 *
 * Resolves to { ok: true } on success, or { ok: true, fallback: true } when the
 * callable was unavailable and Firebase's default template was sent instead.
 * Rejects with the underlying error otherwise — notably
 * 'functions/resource-exhausted' when the same address was sent a reset within
 * the last minute, whose message already names the wait in seconds.
 */
export async function requestPasswordResetEmail(email = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('An email address is required to send a reset link.');
  }

  const sendStaffPasswordReset = httpsCallable(functions, 'sendStaffPasswordReset');
  try {
    await sendStaffPasswordReset({
      email: normalizedEmail,
      continueUrl: passwordResetContinueUrl(),
    });
    return { ok: true };
  } catch (err) {
    if (_isFunctionUnavailableError(err)) {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { ok: true, fallback: true };
    }
    throw err;
  }
}

// src/auth.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { db } from './firebase.js';
import { ref, get, set, remove } from 'firebase/database';
import { loadState } from './state.js';
import { initApp } from './app.js';
import { buildStudentProfileDraft, findRosterEntry, isValidStudentUsername, loadStudentProfileContext, normalizeStudentUsername, syncStudentProfileFromContext } from './profile.js';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false;

let DEV_USER = {
  uid: 'dev-user-001',
  email: 'developer@acadlit.dev',
  displayName: 'Developer [student]',
};

const _AUTH_ALLOWED_ROLES = ['student', 'tutor', 'lecturer', 'moderator'];

async function _loadClassRosterRows() {
  try {
    const snap = await get(ref(db, 'rosters/classList'));
    if (!snap.exists()) return [];
    const raw = snap.val() || {};
    return Object.values(raw);
  } catch {
    return [];
  }
}

function _findRosterEntryForAuthUser(user, existingProfile = {}, rosterRows = []) {
  return findRosterEntry(rosterRows, {
    authEmail: user?.email,
    username: existingProfile?.username || user?.email,
    email: existingProfile?.email,
    personalEmail: existingProfile?.personalEmail || existingProfile?.email,
    studentId: existingProfile?.studentId || existingProfile?.studentNumber || existingProfile?.studentNo,
  });
}

async function _deletedStudentAccountRecord(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `analytics/deleted-student-accounts/${uid}`));
    return snap.exists() ? (snap.val() || {}) : null;
  } catch {
    return null;
  }
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
    const deletedAccount = await _deletedStudentAccountRecord(user?.uid);
    const authRole = _roleFromAuthDisplayName(user);
    if (deletedAccount) {
      if (!isValidStudentUsername(user?.email || '') && authRole && authRole !== 'student') {
        await _restoreStaffProfileFromAuth(user, authRole);
        return { blocked: false, role: authRole, hasProfile: true };
      }
      return {
        blocked: true,
        reason: 'This student account has been removed from the platform. Sign in with your official roster-listed UJ student account or contact your lecturer.',
      };
    }
    const snap = await get(ref(db, `users/${user.uid}/profile`));
    const hasProfile = snap.exists();
    const profile = hasProfile ? (snap.val() || {}) : {};
    const rosterRows = await _loadClassRosterRows();
    const rosterEntry = _findRosterEntryForAuthUser(user, profile, rosterRows);
    const shouldCheckRoster = Boolean(
      rosterEntry
      || isValidStudentUsername(user?.email || '')
      || String(profile?.role || '').trim().toLowerCase() === 'student'
    );
    if (shouldCheckRoster && !rosterEntry) {
      return {
        blocked: true,
        reason: 'This account is not on the current class roster. Use your official roster-listed UJ student account or ask your lecturer to update the roster.',
      };
    }

    if (!hasProfile) {
      if (authRole && authRole !== 'student' && !isValidStudentUsername(user?.email || '')) {
        await _restoreStaffProfileFromAuth(user, authRole);
        return { blocked: false, role: authRole, hasProfile: true };
      }
      return {
        blocked: false,
        role: isValidStudentUsername(user?.email || '') ? 'student' : '',
        hasProfile: false,
      };
    }
    if (profile?.disabled) {
      return { blocked: true, reason: 'Your account has been disabled. Contact your lecturer or administrator.' };
    }

    const role = String(profile?.role || '').trim().toLowerCase();
    if (!_AUTH_ALLOWED_ROLES.includes(role)) {
      return {
        blocked: false,
        role: isValidStudentUsername(user?.email || '') ? 'student' : '',
        hasProfile: true,
      };
    }

    const currentName = String(user.displayName || profile?.displayName || user.email || '').trim();
    const baseName = currentName.split(' [')[0].trim() || String(profile?.displayName || user.email || '').split(' [')[0].trim() || 'User';
    const wanted = `${baseName} [${role}]`;
    if (wanted !== user.displayName) {
      await updateProfile(user, { displayName: wanted });
    }
    return { blocked: false, role, hasProfile: true };
  } catch {
    return { blocked: false, role: isValidStudentUsername(user?.email || '') ? 'student' : '', hasProfile: false };
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

  console.log('Firebase Auth initialized, setting up state listener...');
  console.log('App is in IFrame:', window.self !== window.top);
  onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user logged in');
    if (user) {
      const roleSync = await _applyProfileRoleOnLogin(user);
      if (roleSync?.blocked) {
        await auth.signOut();
        showAuthScreen();
        const errEl = document.getElementById('login-err');
        if (errEl) errEl.textContent = roleSync.reason || 'Access blocked.';
        return;
      }
      const currentRole = String(roleSync?.role || String(user.displayName || '').match(/\[(.*?)\]/)?.[1] || '').toLowerCase();
      const shouldPrepareStudentProfile = currentRole === 'student' || isValidStudentUsername(user?.email || '');
      if (shouldPrepareStudentProfile) {
        try {
          const profileContext = await loadStudentProfileContext(user);
          user._studentProfileContext = await syncStudentProfileFromContext(user, profileContext);
          const hydratedDisplayName = String(user._studentProfileContext?.profile?.displayName || '').trim();
          if (hydratedDisplayName && hydratedDisplayName !== user.displayName) {
            await updateProfile(user, { displayName: hydratedDisplayName });
          }
        } catch (err) {
          console.warn('Student profile context could not be prepared:', err);
        }
      }
      hideAuthScreen();
      Promise.resolve(onSuccess(user)).catch((e) => {
        console.error('Post-auth bootstrap failed:', e);
        showAuthScreen();
        const errEl = document.getElementById('login-err');
        if (errEl) errEl.textContent = `Signed in, but failed to load your data: ${describeError(e)}`;
      });
    }
  });

  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = normalizeStudentUsername(document.getElementById('login-email').value.trim());
      const pass = document.getElementById('login-pass').value;
      const originalText = btnLogin.textContent;

      btnLogin.disabled = true;
      btnLogin.textContent = 'SIGNING IN...';
      document.getElementById('login-err').textContent = '';
      console.log('Sign-in button clicked. Email:', email);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        console.log('Sign in SUCCESS:', cred.user.uid);
        hideAuthScreen();
        await Promise.resolve(onSuccess(cred.user));
      } catch (e) {
        console.error('Sign in FAILED:', e);
        showAuthScreen();
        document.getElementById('login-err').textContent = friendlyError(e.code) || `Sign-in failed: ${describeError(e)}`;
        btnLogin.disabled = false;
        btnLogin.textContent = originalText;
      }
    });
  }

  const btnForgot = document.getElementById('btn-forgot');
  if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
      const email = normalizeStudentUsername(document.getElementById('login-email').value.trim());
      const errEl = document.getElementById('login-err');
      const successEl = document.getElementById('login-success');
      errEl.textContent = '';
      successEl.textContent = '';

      if (!email) {
        errEl.textContent = 'Enter your student number or full UJ email above, then click "Forgot password?".';
        return;
      }

      if (!isValidStudentUsername(email)) {
        errEl.textContent = 'Use your student number or full UJ email, for example 222000000 or 222000000@student.uj.za.';
        return;
      }
      const rosterRows = await _loadClassRosterRows();
      if (!findRosterEntry(rosterRows, { authEmail: email, username: email })) {
        errEl.textContent = 'This UJ student account is not on the current class roster. Ask your lecturer to update the roster first.';
        return;
      }

      btnForgot.disabled = true;
      btnForgot.textContent = 'Sending...';
      try {
        await sendPasswordResetEmail(auth, email);
        console.log('Password reset email sent to:', email);
        successEl.textContent = `Password reset link sent to ${email}. If you entered only your student number, this is your UJ email address. Check your inbox and spam/junk folder.`;
      } catch (e) {
        console.error('Password reset failed:', e.code, e.message);
        const msg = {
          'auth/user-not-found': 'No account found with that username.',
          'auth/invalid-email': 'Please enter a valid UJ username.',
          'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
          'auth/network-request-failed': 'Network error. Check your internet connection.',
        }[e.code];
        errEl.textContent = msg || friendlyError(e.code) || `Could not send reset email: ${describeError(e)}`;
      }
      btnForgot.disabled = false;
      btnForgot.textContent = 'Forgot password?';
    });
  }

  const btnReg = document.getElementById('btn-reg');
  if (btnReg) {
    btnReg.addEventListener('click', async () => {
      const username = normalizeStudentUsername(document.getElementById('reg-username').value.trim());
      const pass = document.getElementById('reg-pass').value;
      const role = document.querySelector('.role-opt.active')?.dataset?.role ?? 'student';
      document.getElementById('reg-err').textContent = '';
      console.log('Attempting registration for:', username, 'Role:', role);
      try {
        if (role !== 'student') {
          throw new Error('Staff accounts are created by lecturer management only. Register as student.');
        }
        if (!isValidStudentUsername(username)) {
          throw new Error('Use your UJ student username, for example studentnumber@student.uj.za.');
        }

        const rosterRows = await _loadClassRosterRows();
        const rosterEntry = findRosterEntry(rosterRows, { username, authEmail: username });
        if (!rosterEntry) {
          throw new Error('This UJ student account is not on the current class roster. Contact your lecturer to upload or update the roster.');
        }

        const cred = await createUserWithEmailAndPassword(auth, username, pass);
        console.log('Registration successful, updating profile...');
        const draft = buildStudentProfileDraft(cred.user, {}, rosterEntry, { username, authEmail: username });
        await updateProfile(cred.user, { displayName: draft.displayName });
        await set(ref(db, `users/${cred.user.uid}/profile`), {
          ...draft,
          source: 'student-self-register-roster-validated',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        cred.user._studentProfileContext = await loadStudentProfileContext(cred.user);
        hideAuthScreen();
        await Promise.resolve(onSuccess(cred.user));
      } catch (e) {
        console.error('Registration error:', e);
        showAuthScreen();
        document.getElementById('reg-err').textContent = friendlyError(e.code) || `Registration failed: ${describeError(e)}`;
      }
    });
  }

  // Expose switchTab to window for onclick handlers
  window.switchTab = (tab) => {
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-reg');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-reg');

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
  if (DEV_MODE) { location.reload(); return; }
  auth.signOut().then(() => location.reload());
}

function hideAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (el) {
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(() => (el.style.display = 'none'), 400);
  }
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'block';
  document.body.style.cssText = 'display:block;background:#f8fafc;height:100vh;overflow:hidden;padding:0;';
}

function showAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (el) {
    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.transition = '';
  }
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'none';
  document.body.style.cssText = 'display:flex;background:var(--navy, #0f172a);height:100vh;align-items:center;justify-content:center;padding:20px;';
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
    'auth/user-not-found': 'No account found with that username.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid username or password.',
    'auth/email-already-in-use': 'That username is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid UJ username.',
    'auth/network-request-failed': 'Network error. Please check your internet connection or Firebase configuration.',
    'auth/unauthorized-domain': 'Sign-in is not allowed from this domain. Please add this Moodle domain to the "Authorized domains" in your Firebase Console (Authentication > Settings).',
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

// src/auth.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const VITE_FIREBASE = import.meta.env.VITE_USE_FIREBASE;
const DEV_MODE = false;

let DEV_USER = {
  uid:         'dev-user-001',
  email:       'developer@acadlit.dev',
  displayName: 'Developer [student]',
};

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
  menu.innerHTML = ['student','lecturer','tutor'].map(r => `
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
  DEV_USER = { uid:`dev-${role}`, email:`${role}@acadlit.dev`, displayName:`Dev ${role} [${role}]` };
  const { loadState } = await import('./state.js');
  const { initApp }   = await import('./app.js');
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

  onAuthStateChanged(auth, (user) => {
    if (user) { hideAuthScreen(); onSuccess(user); }
  });

  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      document.getElementById('login-err').textContent = '';
      console.log('Attempting sign in for:', email);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        console.log('Sign in successful:', cred.user.uid);
        hideAuthScreen();
        onSuccess(cred.user);
      } catch (e) {
        console.error('Sign in error:', e);
        document.getElementById('login-err').textContent = friendlyError(e.code);
      }
    });
  }

  const btnReg = document.getElementById('btn-reg');
  if (btnReg) {
    btnReg.addEventListener('click', async () => {
      const name  = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pass  = document.getElementById('reg-pass').value;
      const role  = document.querySelector('.role-opt.active')?.dataset?.role ?? 'student';
      document.getElementById('reg-err').textContent = '';
      console.log('Attempting registration for:', email, 'Role:', role);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        console.log('Registration successful, updating profile...');
        await updateProfile(cred.user, { displayName: `${name} [${role}]` });
        hideAuthScreen();
        onSuccess(cred.user);
      } catch (e) {
        console.error('Registration error:', e);
        document.getElementById('reg-err').textContent = friendlyError(e.code);
      }
    });
  }
}

export function signOut() {
  if (DEV_MODE) { location.reload(); return; }
  import('./firebase.js').then(({ auth }) => auth.signOut().then(() => location.reload()));
}

function hideAuthScreen() {
  const el = document.getElementById('auth-screen');
  if(el) {
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(() => (el.style.display = 'none'), 400);
  }
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'block';
  document.body.style.cssText = 'display:block;background:#f8fafc;height:100vh;overflow:hidden;padding:0;';
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
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Please check your internet connection or Firebase configuration.',
  };
  return map[code] || `Error: ${code}`;
}

// src/app.js
import { STATE, saveState } from './state.js';
import { signOut } from './auth.js';
import { UNITS } from '../content/units/index.js';
import { VIDEOS, VIDEO_CONFIG } from '../content/videos.js';
import { InteractiveVideoPlayer } from './components/video-player.js';
import { initAllReadingTasks } from './components/reading-task.js';
import { initAllVisualTasks } from './components/visual-task.js';
import { initAllAssessmentTasks } from './components/assessment-task.js';
import { initAITutor, updateAITutorContext } from './components/ai-tutor.js';
import { initAITools, updateAIToolsContext } from './components/ai-tools.js';
import { renderLecturerDashboard } from './dashboards/lecturer.js';
import { renderTutorDashboard } from './dashboards/tutor.js';
import { renderStudentDashboard } from './dashboards/student.js';
import { renderMicroModule } from './components/micro-module.js';
import { renderResourceLibrary } from './components/resource-library.js';
import { renderContactNotebook } from './components/contact-notebook.js';
import { renderTutorialNotebook } from './components/tutorial-notebook.js';
import { renderGalleryWalk } from './components/gallery-walk.js';
import { renderSessionPlan } from './components/session-plan.js';
import { renderGovernanceFramework } from './components/governance-framework.js';
import { ER_TIERS } from '../content/readings.js';
import { _aiChat } from './ai.js';
import { SESSIONS } from '../content/sessions/sessions.js';
import { saveStudentProfile, STUDENT_PROFILE_FIELD_LABELS, getIncompleteStudentFields } from './profile.js';
import { showToast } from './components/toaster.js';
import { syncActivitiesToState } from './components/activities.js';

// AI utility exposed globally for legacy inline handlers
window._aiChat = _aiChat;

// Expose STATE + saveState globally for reading-task progress tracking
window.STATE = STATE;
window.saveState = saveState;

export function initApp(user) {
  STATE.user = user;
  const role = user.displayName?.match(/\[(.*?)\]/)?.[1] ?? 'student';
  const requestedStudentView = _consumeRequestedStudentView();

  if (!STATE.deviceInfo) {
    const ua = navigator.userAgent;
    let type = 'Desktop';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) type = 'Mobile';
    else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) type = 'Tablet';
    STATE.deviceInfo = { type, userAgent: ua, screenWidth: window.innerWidth };
    saveState();
  }

  // Initialize auto-save every 2 minutes
  if (!window._autoSaveTimer) {
    window._autoSaveTimer = setInterval(() => {
      window.autoSave?.();
    }, 2 * 60 * 1000);
  }

  if (role === 'lecturer') {
    renderDashboardShell(user, role);
    const container = document.getElementById('dash-mount');
    renderLecturerDashboard(container);
    return;
  }

  if (role === 'tutor') {
    renderDashboardShell(user, role);
    const container = document.getElementById('dash-mount');
    renderTutorDashboard(container);
    return;
  }

  // Default: student view
  _wireStudentView();
  if (user?._studentProfileContext?.needsCompletion) {
    renderStudentProfileRegistration(user._studentProfileContext);
    return;
  }
  if (requestedStudentView === 'governance-rewards') {
    window.goToGovernanceFramework();
    return;
  }
  renderStudentDashboard();
}

function _wireStudentView() {
  window.appSignOut = signOut;
  window.renderStudentDashboard = renderStudentDashboard;
  window.goToMicroModule = renderMicroModule;
  window.goToCourse = () => {
    renderShell();
    initAITutor();
    initAITools();
    navigateTo(0);
  };
  window.goToContactNotebook = () => {
    renderShell();
    initAITutor();
    initAITools();
    navigateTo('contact-notebook');
  };
  window.goToTutorialSection = () => {
    renderShell();
    initAITutor();
    initAITools();
    const tutorials = Object.values(SESSIONS).filter((s) => s?.type === 'tutorial');
    const activeUnitIdx = Number.isInteger(STATE.activeUnit) ? STATE.activeUnit : 0;
    const activeUnitId = `u${(activeUnitIdx || 0) + 1}`;
    const session = tutorials.find((s) => s.unit === activeUnitId) || tutorials[0];
    const area = document.getElementById('content-area');
    if (session && area) {
      renderTutorialNotebook({ sessionId: session.id, unitId: session.unit });
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById('nav-tutorial')?.classList.add('active');
      document.getElementById('tb-badge').textContent = 'Tutorial';
      document.getElementById('tb-title').textContent = session.title || 'Tutorial Notebook';
      document.getElementById('btn-prev').style.display = 'none';
      document.getElementById('btn-next').style.display = 'none';
    }
  };
  window.goToGallery = () => {
    renderShell();
    initAITutor();
    initAITools();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tb-badge').textContent = 'Gallery';
    document.getElementById('tb-title').textContent = 'Gallery Walk';
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
    renderGalleryWalk();
  };
  window.goToGalleryPost = (postId) => {
    window._galleryFocusPostId = postId;
    window.goToGallery();
  };
  window.goToGovernanceFramework = () => {
    renderShell();
    initAITutor();
    initAITools();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tb-badge').textContent = 'Governance';
    document.getElementById('tb-title').textContent = 'Differentiated Rewards Framework';
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
    renderGovernanceFramework();
  };

  window.autoSave = async () => {
    // 1. Sync from various components
    if (typeof syncActivitiesToState === 'function') {
      syncActivitiesToState();
    }

    // 2. Persist
    try {
      const synced = await saveState();
      showToast(synced ? 'Progress auto-saved' : 'Saved locally (check connection)', synced ? 'success' : 'info');
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };
}

export function switchToStudentView() {
  window._viewAsStudent = true;
  _wireStudentView();
  renderStudentDashboard();
}
window.switchToStudentView = switchToStudentView;

function _consumeRequestedStudentView() {
  const url = new URL(window.location.href);
  const legacyFrameworkPath = '/governance/differentiated-rewards-framework.jsx';
  const legacyFrameworkPathAlt = '/governance/differentiated-rewards-framework';
  let view = url.searchParams.get('view') || '';

  if (!view && url.hash === '#governance-rewards') {
    view = 'governance-rewards';
  }
  if (!view && (url.pathname.endsWith(legacyFrameworkPath) || url.pathname.endsWith(legacyFrameworkPathAlt))) {
    view = 'governance-rewards';
  }

  if (!view) return '';

  url.searchParams.delete('view');
  if (url.hash === '#governance-rewards') url.hash = '';
  if (url.pathname.endsWith(legacyFrameworkPath)) {
    url.pathname = url.pathname.slice(0, -legacyFrameworkPath.length) || '/';
  } else if (url.pathname.endsWith(legacyFrameworkPathAlt)) {
    url.pathname = url.pathname.slice(0, -legacyFrameworkPathAlt.length) || '/';
  }
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl || '/');
  return view;
}

function renderStudentProfileRegistration(context = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  document.body.style.cssText = 'display:block;background:linear-gradient(135deg,#f5efe6 0%,#edf6ff 42%,#f4f9f3 100%);min-height:100vh;overflow:auto;padding:0;';
  const profile = context.profile || {};
  const onRecord = context.onRecord || {};
  const missingFields = new Set(context.missingFields || []);
  const fieldStyle = (field) => missingFields.has(field)
    ? 'border:1px solid #dc2626;background:#fff1f2;box-shadow:0 0 0 3px rgba(220,38,38,.08);'
    : 'border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.9);box-shadow:0 10px 24px rgba(15,23,42,.04);';
  const recordValue = (field, fallback = 'Not on record') => _escHtml(onRecord[field] || fallback);

  app.style.display = 'block';
  app.innerHTML = `
    <div style="min-height:100vh;padding:34px 18px;background:
      radial-gradient(circle at top right, rgba(255,183,3,.14), transparent 24%),
      radial-gradient(circle at bottom left, rgba(33,158,188,.12), transparent 26%);">
      <div style="max-width:1180px;margin:0 auto;">
        <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:18px;align-items:stretch;">
          <div style="background:linear-gradient(145deg,#10213a 0%,#15385b 48%,#1f5f7a 100%);color:white;border-radius:30px;padding:34px 34px 30px 34px;box-shadow:0 24px 48px rgba(15,23,42,.2);position:relative;overflow:hidden;">
            <div style="position:absolute;inset:auto -40px -40px auto;width:220px;height:220px;border-radius:999px;background:radial-gradient(circle,rgba(255,183,3,.2),rgba(255,183,3,0));"></div>
            <div style="position:relative;z-index:1;">
              <div style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;color:#ffb703;margin-bottom:14px;">PROFILE CHECK-IN</div>
              <h1 style="font-family:'Playfair Display',serif;font-size:42px;line-height:1.05;margin:0 0 14px 0;">One last step before you continue.</h1>
              <p style="margin:0;color:rgba(255,255,255,.8);font-size:16px;line-height:1.8;max-width:520px;">We matched your account to the official class roster. Review what we have, confirm the essentials, and then carry on with your course. Your existing work stays attached to this account.</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:26px;">
                <div style="padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);">
                  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8ecae6;font-family:'DM Mono',monospace;margin-bottom:8px;">What changes</div>
                  <div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,.86);">Only your profile details are being confirmed.</div>
                </div>
                <div style="padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);">
                  <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ffb703;font-family:'DM Mono',monospace;margin-bottom:8px;">What stays</div>
                  <div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,.86);">Your progress, notebooks, attendance, and activity history.</div>
                </div>
              </div>
            </div>
          </div>
          <div style="display:grid;gap:18px;">
            <section style="background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border:1px solid rgba(15,23,42,.08);border-radius:28px;padding:28px;box-shadow:0 16px 36px rgba(15,23,42,.08);">
              <h2 style="font-size:15px;color:#10213a;margin:0 0 16px 0;letter-spacing:.06em;text-transform:uppercase;font-family:'DM Mono',monospace;">What We Have On Record</h2>
              <div style="display:grid;gap:10px;">
                ${[
      ['fullName', 'Full name'],
      ['initials', 'Initials'],
      ['surname', 'Surname'],
      ['username', 'Username (UJ email)'],
      ['email', 'Personal email'],
      ['studentId', 'Student ID'],
      ['tutorialGroup', 'Tutorial group'],
    ].map(([field, label]) => `
                  <div style="padding:14px 16px;border-radius:16px;background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#5b6b84;margin-bottom:5px;font-family:'DM Mono',monospace;">${label}</div>
                    <div style="font-size:15px;color:#10213a;font-weight:700;">${recordValue(field)}</div>
                  </div>
                `).join('')}
              </div>
            </section>
            <section style="background:rgba(255,255,255,.94);border:1px solid rgba(15,23,42,.08);border-radius:28px;padding:28px;box-shadow:0 18px 38px rgba(15,23,42,.08);">
              <h2 style="font-size:28px;color:#10213a;margin:0 0 8px 0;font-family:'Playfair Display',serif;">Confirm your profile</h2>
              <p style="font-size:14px;color:#5b6b84;line-height:1.7;margin:0 0 18px 0;">Incomplete fields are highlighted in red. Once saved, you go straight into the course.</p>
              <div style="margin:0 0 18px 0;padding:14px 16px;border:1px solid #fde68a;border-radius:16px;background:linear-gradient(180deg,#fffaf0,#fffbeb);color:#92400e;font-size:12px;line-height:1.7;box-shadow:0 8px 18px rgba(251,191,36,.08);">
                Use the password already linked to your account. Completing this profile does not change your password. If you are creating an account for the first time, choose a strong password you can keep safe.
              </div>
              <div style="display:grid;gap:14px;">
                ${_profileInput('student-profile-initials', STUDENT_PROFILE_FIELD_LABELS.initials, profile.initials || '', 'e.g. TM', fieldStyle('initials'))}
                ${_profileInput('student-profile-surname', STUDENT_PROFILE_FIELD_LABELS.surname, profile.surname || profile.lastName || '', 'Your surname', fieldStyle('surname'))}
                ${_profileInput('student-profile-username', STUDENT_PROFILE_FIELD_LABELS.username, profile.username || profile.authEmail || STATE.user?.email || '', 'studentnumber@student.uj.za', fieldStyle('username'), 'email')}
                ${_profileInput('student-profile-email', STUDENT_PROFILE_FIELD_LABELS.email, profile.personalEmail || profile.email || '', 'you@example.com', fieldStyle('email'), 'email')}
                ${_profileInput('student-profile-student-id', STUDENT_PROFILE_FIELD_LABELS.studentId, profile.studentId || profile.studentNumber || '', 'Student number', fieldStyle('studentId'))}
              </div>
              <p id="student-profile-error" style="color:#dc2626;font-size:13px;min-height:18px;margin:16px 0 0 0;font-weight:700;"></p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
                <button id="student-profile-save" class="auth-submit" style="max-width:260px;box-shadow:0 16px 28px rgba(251,133,0,.2);">Save And Continue</button>
                <button class="btn-signout" onclick="appSignOut()" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 18px;border-radius:16px;border:1px solid rgba(15,23,42,.12);background:white;color:#10213a;font-weight:700;">Sign Out</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('student-profile-save')?.addEventListener('click', async () => {
    const values = {
      initials: String(document.getElementById('student-profile-initials')?.value || '').trim().toUpperCase(),
      surname: String(document.getElementById('student-profile-surname')?.value || '').trim(),
      username: String(document.getElementById('student-profile-username')?.value || '').trim().toLowerCase(),
      email: String(document.getElementById('student-profile-email')?.value || '').trim().toLowerCase(),
      personalEmail: String(document.getElementById('student-profile-email')?.value || '').trim().toLowerCase(),
      studentId: String(document.getElementById('student-profile-student-id')?.value || '').trim(),
    };
    const saveBtn = document.getElementById('student-profile-save');
    const errEl = document.getElementById('student-profile-error');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    if (errEl) errEl.textContent = '';

    try {
      const saved = await saveStudentProfile(STATE.user, values, context);
      STATE.user.displayName = saved.displayName;
      STATE.user._studentProfileContext = {
        ...context,
        existingProfile: saved,
        profile: saved,
        missingFields: [],
        needsCompletion: false,
      };
      renderStudentDashboard();
    } catch (err) {
      const missing = err?.missingFields || getIncompleteStudentFields(values);
      const inputMap = {
        initials: 'student-profile-initials',
        surname: 'student-profile-surname',
        username: 'student-profile-username',
        email: 'student-profile-email',
        studentId: 'student-profile-student-id',
      };
      Object.entries(inputMap).forEach(([field, id]) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.style.borderColor = missing.includes(field) ? '#dc2626' : 'rgba(0,0,0,.08)';
        input.style.background = missing.includes(field) ? '#fef2f2' : 'white';
      });
      if (errEl) errEl.textContent = err?.message || 'Please complete all required fields.';
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save And Continue';
    }
  });
}

function _profileInput(id, label, value, placeholder, style, type = 'text') {
  return `
    <label style="display:block;">
      <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#5b6b84;font-weight:700;margin-bottom:7px;font-family:'DM Mono',monospace;">${label}</span>
      <input id="${id}" type="${type}" value="${_escHtml(value)}" placeholder="${_escHtml(placeholder)}" style="width:100%;padding:14px 15px;border-radius:16px;font-size:15px;font-family:'Inter',sans-serif;color:#10213a;outline:none;transition:all .2s ease;${style}" />
    </label>
  `;
}

function _escHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function switchToTutorView() {
  window._viewAsStudent = false;
  const user = STATE.user;
  renderDashboardShell(user, 'tutor');
  const container = document.getElementById('dash-mount');
  renderTutorDashboard(container);
}
window.switchToTutorView = switchToTutorView;

export function switchToLecturerView() {
  window._viewAsStudent = false;
  const user = STATE.user;
  renderDashboardShell(user, 'lecturer');
  const container = document.getElementById('dash-mount');
  renderLecturerDashboard(container);
}
window.switchToLecturerView = switchToLecturerView;

// ── Dashboard shell (lecturer + tutor) ────────
function renderDashboardShell(user, role) {
  const name = user.displayName?.split(' [')[0] ?? user.email;
  const actualRole = user.displayName?.match(/\[(.*?)\]/)?.[1]?.toLowerCase() ?? 'student';
  const label = role === 'lecturer' ? '🏫 Lecturer Dashboard' : '👥 Tutor Dashboard';
  const isLecturerViewingAsTutor = role === 'tutor' && actualRole === 'lecturer';

  document.getElementById('app').innerHTML = `
    <div class="dash-app-shell">
      <div class="dash-topbar">
        <div class="dash-topbar-left">
          <div class="dash-topbar-logo">ACADLIT · AI</div>
          <div class="dash-topbar-title">${label}</div>
        </div>
        <div class="dash-topbar-right">
          ${isLecturerViewingAsTutor ? '<button onclick="switchToLecturerView()" style="margin-right: 8px; background: var(--navy); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">← Lecturer Dashboard</button>' : ''}
          ${role === 'lecturer' ? '<button class="dash-tutor-btn" onclick="switchToTutorView()" style="margin-right: 8px; background: var(--green); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">👥 Tutor View</button>' : ''}
          <button class="dash-student-btn" onclick="switchToStudentView()" style="margin-right: 16px; background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">👩‍🎓 Student View</button>
          <div class="dash-user-pill">
            <div class="dash-user-avatar">${name[0].toUpperCase()}</div>
            <div class="dash-user-name">${name}</div>
          </div>
          <button class="dash-signout-btn" onclick="appSignOut()">Sign Out</button>
        </div>
      </div>
      <div id="dash-mount" class="dash-mount"></div>
    </div>`;

  window.appSignOut = signOut;
}

// ── Shell ─────────────────────────────────────
function renderShell() {
  // Restore body overflow lock for the course shell layout
  document.body.style.overflowY = 'hidden';
  document.body.style.height = '100vh';

  const user = STATE.user;
  const name = user.displayName?.split(' [')[0] ?? user.email;
  const role = user.displayName?.match(/\[(.*?)\]/)?.[1] ?? 'student';

  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">ACADLIT · AI</div>
          <div class="sidebar-title">Academic Literacies</div>
          <div class="sidebar-sub">in the Age of AI</div>
        </div>

        <div class="prog-container">
          <div class="prog-label">
            <span>Course Progress</span>
            <span id="prog-pct">0%</span>
          </div>
          <div class="prog-bar-bg">
            <div class="prog-bar-fill" id="prog-fill"></div>
          </div>
        </div>

        <nav class="nav-list">
          <div class="nav-item nav-item--dashboard" id="nav-dashboard" onclick="window.renderStudentDashboard()">
            <div class="nav-num">🏠</div>
            <div class="nav-info">
              <div class="nav-badge">Home</div>
              <div class="nav-lbl">My Dashboard</div>
            </div>
          </div>
          <div class="nav-divider"></div>

          ${UNITS.map((u, i) => {
    const isAssessment = u.isAssessment === true;
    const visited = STATE.progress[u.id]?.visited;
    const complete = STATE.progress[u.id]?.readingComplete;

    // Unit Locking Logic
    let isLocked = false;
    let lockedReason = '';
    if (i > 0) {
      const prevUnit = UNITS[i - 1];
      const prevComplete = STATE.progress[prevUnit.id]?.readingComplete || STATE.progress[prevUnit.id]?.assessmentSubmitted;

      if (!prevComplete) {
        // Not a high achiever bypassing, so enforce sequential lock
        const isHighAchiever = (STATE.erProgress?.extraMarks || 0) >= 15;
        if (!isHighAchiever) {
          isLocked = true;
          lockedReason = `Complete ${prevUnit.badge} first.`;
        }
      }
    }

    if (isAssessment) {
      return `
                <div class="nav-item nav-assessment ${i === 0 ? 'active' : ''} ${isLocked ? 'locked' : ''}" id="nav-${i}" ${isLocked ? `onclick="alert('🔒 Locked: ${lockedReason}')"` : `onclick="navigateTo(${i})"`}>
                  <div class="nav-num assessment-num">${isLocked ? '🔒' : '📋'}</div>
                  <div class="nav-info">
                    <div class="nav-badge assessment-badge">${u.badge}</div>
                    <div class="nav-lbl">${u.title}</div>
                  </div>
                  ${STATE.progress[u.id]?.assessmentSubmitted ? '<div class="nav-tick">✓</div>' : ''}
                </div>`;
    }
    return `
              <div class="nav-item ${i === 0 ? 'active' : ''} ${isLocked ? 'locked' : ''}" id="nav-${i}" ${isLocked ? `onclick="alert('🔒 Locked: ${lockedReason}')"` : `onclick="navigateTo(${i})"`}>
                <div class="nav-num ${visited ? 'visited' : ''}">${isLocked ? '🔒' : (i + 1)}</div>
                <div class="nav-info">
                  <div class="nav-badge">${u.badge}</div>
                  <div class="nav-lbl">${u.title}</div>
                </div>
                ${complete ? '<div class="nav-tick">✓</div>' : ''}
              </div>`;
  }).join('')}

          <div class="nav-item" id="nav-er" onclick="navigateTo('er')">
            <div class="nav-num">📖</div>
            <div class="nav-info">
              <div class="nav-badge">Bonus</div>
              <div class="nav-lbl">Extensive Reading</div>
            </div>
          </div>

          <div class="nav-item" id="nav-resources" onclick="navigateTo('resources')">
            <div class="nav-num">📚</div>
            <div class="nav-info">
              <div class="nav-badge">Library</div>
              <div class="nav-lbl">Resource Library</div>
            </div>
          </div>

          <div class="nav-item" id="nav-contact-notebook" onclick="navigateTo('contact-notebook')">
            <div class="nav-num">🗒️</div>
            <div class="nav-info">
              <div class="nav-badge">Notebook</div>
              <div class="nav-lbl">Contact Sessions</div>
            </div>
          </div>
          <div class="nav-item" id="nav-tutorial" onclick="window.goToTutorialSection()">
            <div class="nav-num">📝</div>
            <div class="nav-info">
              <div class="nav-badge">Tutorial</div>
              <div class="nav-lbl">Tutorial Notebook</div>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-pill">
            <div class="user-avatar">${name[0].toUpperCase()}</div>
            <div class="user-info">
              <div class="user-name">${name}</div>
              <div class="user-role">${role}</div>
            </div>
          </div>
          <button class="btn-signout" onclick="appSignOut()">Sign Out</button>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <button class="btn-menu" id="btn-menu" onclick="toggleSidebar()" title="Toggle Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <button class="btn-focus" id="btn-focus" onclick="toggleFocus()" title="Toggle Focus Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"></path></svg>
          </button>
          <span class="unit-badge" id="tb-badge">Unit 1</span>
          <span class="unit-title-bar" id="tb-title">Loading…</span>
          <div class="topbar-controls">
            <div class="font-size-ctrl" title="Adjust text size">
              <button class="btn-font-sm" onclick="adjustFontSize(-1)" title="Smaller text">A</button>
              <button class="btn-font-lg" onclick="adjustFontSize(1)" title="Larger text">A</button>
            </div>
            <button class="btn-prev" id="btn-prev" onclick="prevUnit()" style="display:none;">← Prev</button>
            <button class="btn-next" id="btn-next" onclick="nextUnit()">Next →</button>
          </div>
        </div>
        <div class="content-window" id="content-window">
          <div class="content-area" id="content-area"></div>
          <button id="btn-back-to-top" class="btn-back-to-top" onclick="document.getElementById('content-window').scrollTo({top: 0, behavior: 'smooth'})" title="Back to Top">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
      </main>
    </div>`;

  window.navigateTo = navigateTo;
  window.nextUnit = () => navigateTo(Math.min(STATE.activeUnit + 1, UNITS.length - 1));
  window.prevUnit = () => navigateTo(Math.max(STATE.activeUnit - 1, 0));
  window.appSignOut = signOut;
  window.toggleFocus = () => {
    document.querySelector('.shell').classList.toggle('focus-mode');
    const isFocus = document.querySelector('.shell').classList.contains('focus-mode');
    const icon = isFocus ? '<path d="M4 14h6v6M20 10h-6V4M4 10h6V4M20 14h-6v6"></path>' : '<path d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"></path>';
    document.querySelector('.btn-focus svg').innerHTML = icon;
  };

  window.toggleSidebar = () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  };

  // Font size control — zoom steps for the entire shell
  const ZOOM_STEPS = [0.85, 1, 1.1, 1.2, 1.35];
  let _zoomIdx = window._zoomIdx ?? 1;
  const _applyZoom = () => {
    const shell = document.querySelector('.shell');
    if (shell) shell.style.zoom = ZOOM_STEPS[_zoomIdx];
  };
  _applyZoom();
  window.adjustFontSize = (dir) => {
    _zoomIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, _zoomIdx + dir));
    window._zoomIdx = _zoomIdx;
    _applyZoom();
  };

  document.getElementById('content-window').addEventListener('scroll', (e) => {
    const btn = document.getElementById('btn-back-to-top');
    if (e.target.scrollTop > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
}

// ── Navigation ────────────────────────────────
export function navigateTo(index) {
  // Close mobile sidebar if open
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  const isER = index === 'er';
  const isResources = index === 'resources';
  const isContactNotebook = index === 'contact-notebook';

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (isER) document.getElementById('nav-er')?.classList.add('active');
  else if (isResources) document.getElementById('nav-resources')?.classList.add('active');
  else if (isContactNotebook) document.getElementById('nav-contact-notebook')?.classList.add('active');
  else document.getElementById(`nav-${index}`)?.classList.add('active');

  if (isER) {
    renderER();
    document.getElementById('tb-badge').textContent = 'Bonus';
    document.getElementById('tb-title').textContent = 'Extensive Reading';
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
    updateAITutorContext(null);
    updateAIToolsContext(null);
    return;
  }

  if (isResources) {
    renderResourceLibrary();
    document.getElementById('tb-badge').textContent = 'Library';
    document.getElementById('tb-title').textContent = 'Resource Library';
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
    updateAITutorContext(null);
    updateAIToolsContext(null);
    return;
  }

  if (isContactNotebook) {
    renderContactNotebook();
    document.getElementById('tb-badge').textContent = 'Notebook';
    document.getElementById('tb-title').textContent = 'Contact Session Notebook';
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'none';
    updateAITutorContext(null);
    updateAIToolsContext(null);
    return;
  }

  STATE.activeUnit = index;
  const unit = UNITS[index];

  // Inject HTML with animation
  const area = document.getElementById('content-area');
  area.classList.remove('anim-slide-up');
  void area.offsetWidth;
  area.innerHTML = unit.html();
  area.classList.add('anim-slide-up');

  // Scroll to top
  document.getElementById('content-window').scrollTop = 0;

  // Topbar
  document.getElementById('btn-prev').style.display = index === 0 ? 'none' : '';
  document.getElementById('btn-next').style.display = index === UNITS.length - 1 ? 'none' : '';

  // Boot video players
  document.querySelectorAll('.ivp-container[data-video-key]').forEach(el => {
    const key = el.dataset.videoKey;
    if (VIDEOS[key] && VIDEO_CONFIG[key]) {
      new InteractiveVideoPlayer(el.id, key, VIDEOS[key], VIDEO_CONFIG[key]);
    }
  });

  // Boot interactive components
  initAllReadingTasks();
  initAllVisualTasks();
  initAllAssessmentTasks();

  // Topbar — show unit number only for actual units, not assessments
  const badgeText = unit.isAssessment ? unit.badge : unit.badge;
  document.getElementById('tb-badge').textContent = badgeText;
  document.getElementById('tb-title').textContent = unit.title;

  // Update AI Tutor + AI Tools context
  updateAITutorContext(unit);
  updateAIToolsContext(unit);

  // Progress tracking
  if (!STATE.progress[unit.id]) STATE.progress[unit.id] = {};
  STATE.progress[unit.id].visited = true;
  updateProgressBar();
  saveState();
}

// ── Progress Bar ──────────────────────────────
function updateProgressBar() {
  const completed = Object.values(STATE.progress).filter(p => p.readingComplete).length;
  const visited = Object.values(STATE.progress).filter(p => p.visited).length;
  const pct = Math.round((visited / UNITS.length) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-pct').textContent = pct + '%';

  // Refresh nav ticks
  UNITS.forEach((u, i) => {
    const tick = document.querySelector(`#nav-${i} .nav-tick`);
    if (STATE.progress[u.id]?.readingComplete) {
      if (!tick) {
        document.querySelector(`#nav-${i}`)?.insertAdjacentHTML('beforeend', '<div class="nav-tick">✓</div>');
      }
    }
  });
}

// ── Extensive Reading ─────────────────────────
function renderER() {
  const area = document.getElementById('content-area');
  if (!area) return;
  if (!STATE.erProgress) STATE.erProgress = { extraMarks: 0, completedReadings: [] };
  const { extraMarks, completedReadings } = STATE.erProgress;

  area.innerHTML = `
    <h1>Extensive Reading Programme</h1>
    <p class="lead">Build your scholarly reading stamina through three progressive tiers. Each tier awards +5 Extra Marks upon successful completion of the comprehension quiz.</p>

    <div class="er-score-pill">
      <span>Extra Marks Earned</span>
      <strong>${extraMarks}</strong>
    </div>

    ${ER_TIERS.map((tier, i) => {
    const done = completedReadings.find(r => r.tier === tier.tier);
    return `
        <div class="er-tier ${done ? 'done' : ''}">
          <div class="er-tier-head">
            <div>
              <span class="er-tier-badge tier-tip" data-tooltip="${tier.description}">Tier ${tier.tier}</span>
              <span class="er-tier-label">${tier.label}</span>
            </div>
            ${done ? `<span class="er-done-badge">✅ Completed — Score: ${done.score}/10</span>` : ''}
          </div>
          <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">${tier.description}</p>
          <div class="er-articles">
            ${tier.articles.map(a => `
              <a class="er-article" href="${a.url}" target="_blank" rel="noopener">
                <div class="er-article-title">${a.title}</div>
                <div class="er-article-meta">${a.source} · ${a.readingTime}</div>
                <div class="er-article-summary">${a.summary}</div>
              </a>`).join('')}
          </div>
          ${!done ? `
            <div class="er-quiz">
              <label class="ex-lbl">Comprehension Response</label>
              <p style="font-size:14px;margin-bottom:10px;">${tier.quizPrompt}</p>
              <textarea id="er-ta-${i}" class="ex-ta" rows="6" placeholder="Write your response here…"></textarea>
              <button class="auth-submit" style="margin-top:12px;" onclick="submitERQuiz(${i})">
                Submit for AI Marking (+5 marks)
              </button>
            </div>` : ''}
        </div>`;
  }).join('')}
  `;

  window.submitERQuiz = (i) => submitERQuiz(i);
}

async function submitERQuiz(tierIdx) {
  if (!STATE.erProgress) STATE.erProgress = { extraMarks: 0, completedReadings: [] };
  const tier = ER_TIERS[tierIdx];
  const text = document.getElementById(`er-ta-${tierIdx}`)?.value ?? '';
  if (text.length < 80) { alert('Please write a fuller response before submitting.'); return; }

  const prompt = `You are marking a university student's comprehension response. 
Tier: ${tier.label}. Prompt: "${tier.quizPrompt}". Student: "${text}".
Respond ONLY with valid JSON: {"score":<0-10>,"feedback":"<2-3 sentences>","pass":<true if score>=6>}`;

  try {
    const raw = await _aiChat(prompt, { maxTokens: 200 });
    let result;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (e) {
      alert('AI returned invalid JSON. Please try again or contact support.');
      return;
    }
    if (result && result.pass) {
      STATE.erProgress.extraMarks += 5;
      STATE.erProgress.completedReadings.push({ tier: tier.tier, timestamp: new Date().toISOString(), score: result.score });
      await saveState();
      alert(`✅ Passed! Score: ${result.score}/10.\n\n${result.feedback}\n\n+5 Extra Marks awarded!`);
    } else {
      alert(`Not quite. Score: ${result.score}/10.\n\n${result.feedback}\n\nPlease revise and resubmit.`);
    }
    renderER();
  } catch {
    STATE.erProgress.extraMarks += 5;
    STATE.erProgress.completedReadings.push({ tier: tier.tier, timestamp: new Date().toISOString(), score: 7 });
    await saveState();
    alert('Submitted! Extra marks granted.');
    renderER();
  }
}

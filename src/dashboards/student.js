window.verifyAttendanceQr = async function () {
  const tokenInput = document.getElementById('attendance-qr-token');
  const statusEl = document.getElementById('attendance-qr-scan-status');
  if (!tokenInput) return;
  const token = _extractAttendanceToken(tokenInput.value);
  if (!token) {
    if (statusEl) statusEl.textContent = 'Please enter a code.';
    return;
  }
  tokenInput.value = token;
  if (statusEl) statusEl.textContent = 'Verifying code…';
  try {
    const result = await window.verifyAttendanceQrPayload?.(token, false);
    if (result?.ok) {
      if (statusEl) statusEl.textContent = `✅ Attendance confirmed for ${result.sessionType}.`;
      await _recordAttendanceAnalytics(result, result.token || token);
      // Save attendance to Firebase
      try {
        if (!window.saveState) {
          const mod = await import('../state.js');
          window.saveState = mod.saveState;
        }
        await window.saveState();
      } catch (err) {
        console.error('Attendance save failed:', err);
      }
    } else {
      if (statusEl) statusEl.textContent = result?.message || 'Invalid or expired code. Please try again.';
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error verifying code.';
    console.error('Attendance code verification failed:', err);
  }
};

window.verifyAttendanceQrPayload = async function (token, isQr) {
  const normalizedToken = _extractAttendanceToken(token);
  if (!normalizedToken) return { ok: false, message: 'No token provided.' };

  try {
    const [classSnap, tutorialSnap] = await Promise.all([
      get(ref(db, 'attendance/live/class')),
      get(ref(db, 'attendance/live/tutorial'))
    ]);

    let match = null;
    let sessionType = null;

    if (classSnap.exists()) {
      const data = classSnap.val();
      if (data.active && String(data.token || '').toUpperCase() === normalizedToken) {
        match = data;
        sessionType = 'class';
      }
    }

    if (!match && tutorialSnap.exists()) {
      const data = tutorialSnap.val();
      if (data.active && String(data.token || '').toUpperCase() === normalizedToken) {
        match = data;
        sessionType = 'tutorial';
      }
    }

    if (match) {
      // Check for expiration
      const expiresAt = match.expiresAt ? new Date(match.expiresAt).getTime() : 0;
      if (expiresAt && Date.now() > expiresAt) {
        return { ok: false, message: 'Code has expired.' };
      }

      // Mark as present
      markPresent(sessionType);
      return { ok: true, sessionType, token: normalizedToken, message: 'Attendance confirmed.' };
    }

    return { ok: false, token: normalizedToken, message: 'Invalid or expired code. Please try scanning the latest QR code.' };
  } catch (err) {
    console.error('Error in verifyAttendanceQrPayload:', err);
    return { ok: false, message: 'Verification error.' };
  }
};

// src/dashboards/student.js
import { STATE, recordOutcome, markPresent } from '../state.js';
import { db } from '../firebase.js';
import { ref, get } from 'firebase/database';
import { UNITS } from '../../content/units/index.js';
import { DASHBOARD_CONTENT } from '../../content/dashboard.js';
import { getCoordinatorRecommendation } from '../ai.js';
import { getPinnedGalleryPosts } from '../gallery.js';
import { writeAttendanceCheckinEvent } from '../analytics.js';
import { getAppSurface, setAppSurfaceRoute } from '../platform.js';

function _studentAnalyticsProfile() {
  return STATE.user?._studentProfileContext?.profile || {
    uid: STATE.user?.uid || '',
    role: 'student',
    authEmail: STATE.user?.email || '',
    username: STATE.user?.email || '',
    displayName: STATE.user?.displayName || '',
  };
}

function _attendanceDateLabel(dateKey = '') {
  const normalized = String(dateKey || '').trim();
  if (!normalized) return 'Unknown date';
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function _attendanceHistoryRows(attendanceByDate = {}) {
  return Object.entries(attendanceByDate || {})
    .map(([dateKey, record]) => {
      const qrCheckins = Array.isArray(record?.qrCheckins) ? record.qrCheckins : [];
      const classCheckins = qrCheckins.filter((c) => c?.sessionType === 'class');
      const tutorialCheckins = qrCheckins.filter((c) => c?.sessionType === 'tutorial');
      const latestCheckin = qrCheckins.length ? qrCheckins[qrCheckins.length - 1]?.at || null : null;
      return {
        dateKey,
        label: _attendanceDateLabel(dateKey),
        present: Boolean(record?.present),
        totalMinutes: Math.max(0, Math.round((record?.totalSeconds || 0) / 60)),
        classMinutes: Math.max(0, Math.round((record?.classSeconds || 0) / 60)),
        tutorialMinutes: Math.max(0, Math.round((record?.tutorialSeconds || 0) / 60)),
        qrCount: qrCheckins.length,
        classCheckedIn: classCheckins.length > 0,
        tutorialCheckedIn: tutorialCheckins.length > 0,
        latestCheckin,
        latestClassCheckin: classCheckins.length ? classCheckins[classCheckins.length - 1]?.at || null : null,
        latestTutorialCheckin: tutorialCheckins.length ? tutorialCheckins[tutorialCheckins.length - 1]?.at || null : null,
      };
    })
    .sort((a, b) => String(b.dateKey || '').localeCompare(String(a.dateKey || '')));
}

async function _recordAttendanceAnalytics(result, token) {
  try {
    await writeAttendanceCheckinEvent({
      user: STATE.user || {},
      profile: _studentAnalyticsProfile(),
      sessionType: result?.sessionType || 'class',
      token: token || '',
      source: 'student-attendance-qr',
    });
  } catch (err) {
    console.error('Attendance analytics write failed:', err);
  }
}

function _extractAttendanceToken(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw, window.location.origin);
    const urlToken = String(url.searchParams.get('attend') || '').trim();
    if (urlToken) return urlToken.toUpperCase();
  } catch {
    // Not a URL payload; fall back to direct token parsing below.
  }

  const queryMatch = raw.match(/[?&]attend=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    } catch {
      return String(queryMatch[1]).trim().toUpperCase();
    }
  }

  return raw.toUpperCase();
}

async function _consumeAttendanceQrLink() {
  const params = new URLSearchParams(window.location.search);
  const attendParam = String(params.get('attend') || '').trim();
  if (!attendParam) return;

  const token = _extractAttendanceToken(attendParam);
  if (!token) return;

  const statusEl = document.getElementById('attendance-qr-scan-status');
  const tokenInput = document.getElementById('attendance-qr-token');
  if (tokenInput) tokenInput.value = token;

  const handledKey = `${token}:${params.get('session') || ''}`;
  if (window._lastHandledAttendanceQr === handledKey || window._consumingAttendanceQrLink) return;

  window._consumingAttendanceQrLink = true;
  if (statusEl) statusEl.textContent = 'Verifying attendance link…';

  try {
    const result = await window.verifyAttendanceQrPayload?.(token, true);
    if (result?.ok) {
      if (statusEl) statusEl.textContent = `✅ Attendance confirmed for ${result.sessionType}.`;
      await _recordAttendanceAnalytics(result, result.token || token);
      if (!window.saveState) {
        const mod = await import('../state.js');
        window.saveState = mod.saveState;
      }
      await window.saveState();
      window._lastHandledAttendanceQr = handledKey;
    } else if (statusEl) {
      statusEl.textContent = result?.message || 'Invalid or expired attendance link.';
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error verifying attendance link.';
    console.error('Attendance link verification failed:', err);
  } finally {
    window._consumingAttendanceQrLink = false;
    params.delete('attend');
    params.delete('session');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }
}

// ── Skill display config ──────────────────────
const SKILL_LABELS = {
  critical_reading: 'Critical Reading',
  evidence_use: 'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone: 'Academic Tone',
  source_evaluation: 'Source Evaluation',
  citation_practice: 'Citation & Integrity',
  research_skills: 'Research Skills',
  ai_literacy: 'AI Literacy',
};

const SKILL_ICONS = {
  critical_reading: '📖',
  evidence_use: '🔬',
  argument_structure: '🗺',
  academic_tone: '✍',
  source_evaluation: '🔍',
  citation_practice: '📎',
  research_skills: '🔭',
  ai_literacy: '🤖',
};

const STATUS_CONFIG = {
  untested: { label: 'Not yet assessed', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'transparent' },
  weak: { label: 'Needs work', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  developing: { label: 'Developing', color: '#f59e0b', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  strong: { label: 'Strong', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
};

const REC_TYPE_CONFIG = {
  remediate: { icon: '⚠', borderColor: '#f59e0b', bg: 'rgba(251,191,36,0.08)', btnBg: '#f59e0b', btnColor: '#0f172a' },
  continue: { icon: '▶', borderColor: '#6366f1', bg: 'rgba(99,102,241,0.06)', btnBg: '#6366f1', btnColor: '#fff' },
  extend: { icon: '✦', borderColor: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', btnBg: '#8b5cf6', btnColor: '#fff' },
  intervene: { icon: '🔔', borderColor: '#ef4444', bg: 'rgba(239,68,68,0.06)', btnBg: '#ef4444', btnColor: '#fff' },
  celebrate: { icon: '🏆', borderColor: '#fbbf24', bg: 'rgba(251,191,36,0.1)', btnBg: '#fbbf24', btnColor: '#0f172a' },
};

// Set of known micro-module ids — these open the full micro-module page
const MICRO_MODULE_IDS = new Set([
  'evidence-booster', 'argument-builder', 'tone-workshop',
  'source-skills', 'citation-guide', 'reading-strategies',
]);

const MODULE_LABELS = {
  'evidence-booster': 'Evidence Booster',
  'argument-builder': 'Argument Builder',
  'tone-workshop': 'Tone Workshop',
  'source-skills': 'Source Skills',
  'citation-guide': 'Citation Guide',
  'reading-strategies': 'Reading Strategies',
};

// ── Main render ───────────────────────────────
export function renderStudentDashboard() {
  const user = STATE.user;
  const name = user.displayName?.split(' [')[0] ?? user.email;
  const firstName = name.split(' ')[0];
  const adaptive = STATE.adaptive;
  const showReturnToDashboard = Boolean(window._viewAsStudent);

  const visitedCount = Object.values(STATE.progress).filter(p => p.visited).length;
  const progressPct = Math.round((visitedCount / UNITS.length) * 100);
  const today = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
  const attendanceToday = STATE.attendance?.byDate?.[today] || null;
  const attendanceHistory = _attendanceHistoryRows(STATE.attendance?.byDate || {});
  const priorAttendanceHistory = attendanceHistory.slice(0, 10);
  const qrCheckins = attendanceToday?.qrCheckins || [];
  const classCheckins = qrCheckins.filter((c) => c?.sessionType === 'class');
  const tutorialCheckins = qrCheckins.filter((c) => c?.sessionType === 'tutorial');
  const qrVerifiedToday = Boolean(qrCheckins.length);
  const presentToday = Boolean(attendanceToday?.present);
  const totalMinutes = Math.max(0, Math.round((attendanceToday?.totalSeconds || 0) / 60));
  const classMinutes = Math.max(0, Math.round((attendanceToday?.classSeconds || 0) / 60));
  const tutorialMinutes = Math.max(0, Math.round((attendanceToday?.tutorialSeconds || 0) / 60));
  const classCheckedIn = classCheckins.length > 0;
  const tutorialCheckedIn = tutorialCheckins.length > 0;
  const tutorialBtnStyle = 'display:inline-flex;';
  const tutorialBtnClass = tutorialCheckedIn ? 'btn-prev tutorial-active-btn' : 'btn-prev';
  const latestClassCheckin = classCheckedIn ? classCheckins[classCheckins.length - 1]?.at : null;
  const latestTutorialCheckin = tutorialCheckedIn ? tutorialCheckins[tutorialCheckins.length - 1]?.at : null;
  const notebookEntries = Object.values(STATE.tutorialNotebook?.entries || {});
  const latestNotebook = notebookEntries
    .filter((entry) => entry && typeof entry === 'object' && entry.updatedAt && (entry.unitId || entry.attachments || entry.response || entry.notes || entry.searchLog))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
  const latestNotebookTime = latestNotebook?.updatedAt
    ? new Date(latestNotebook.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const latestNotebookDate = latestNotebook?.updatedAt
    ? new Date(latestNotebook.updatedAt).toLocaleDateString()
    : '—';
  const tutorialNotebookAnalytics = STATE.tutorialNotebook?.analytics || STATE.progress?.tutorialNotebookAnalytics || {};
  const contactNotebookEntries = Object.values(STATE.contactNotebook?.entries || {});
  const latestContactNotebook = contactNotebookEntries
    .filter((entry) => entry && typeof entry === 'object' && entry.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
  const contactNotebookAnalytics = STATE.contactNotebook?.analytics || STATE.progress?.contactNotebookAnalytics || {};
  const latestContactNotebookTime = latestContactNotebook?.updatedAt
    ? new Date(latestContactNotebook.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
  const latestContactNotebookDate = latestContactNotebook?.updatedAt
    ? new Date(latestContactNotebook.updatedAt).toLocaleDateString()
    : '—';
  const fmtCheckin = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const studentVm = {
    showReturnToDashboard,
    user,
    name,
    firstName,
    progressPct,
    visitedCount,
    attendanceToday,
    totalMinutes,
    classMinutes,
    tutorialMinutes,
    classCheckedIn,
    tutorialCheckedIn,
    qrVerifiedToday,
    presentToday,
    latestClassCheckin,
    latestTutorialCheckin,
    latestNotebook,
    latestNotebookTime,
    latestNotebookDate,
    tutorialNotebookAnalytics,
    latestContactNotebook,
    latestContactNotebookTime,
    latestContactNotebookDate,
    contactNotebookAnalytics,
    adaptive,
    classCheckins,
    tutorialCheckins,
    attendanceHistory,
    priorAttendanceHistory,
    fmtCheckin,
    tutorialBtnClass,
    tutorialBtnStyle,
    profile: user?._studentProfileContext?.profile || {},
    deviceInfo: STATE.deviceInfo || {},
  };

  if (getAppSurface().isAndroidApp) {
    _renderAndroidStudentDashboard(studentVm);
    _loadRecommendation();
    _loadCohortContext();
    _loadFeaturedGalleryStrip();
    _initAnnouncementRotator();
    _initAttendanceQrScanner();
    _consumeAttendanceQrLink().catch((err) => {
      console.error('Attendance QR link handling failed:', err);
    });
    return;
  }

  setAppSurfaceRoute('student-dashboard');

  document.body.style.overflowY = 'auto';
  document.body.style.overflow = 'auto';
  document.body.style.overflowX = 'hidden';
  document.body.style.height = 'auto';
  document.body.style.display = 'block';
  document.body.style.alignItems = 'initial';
  document.body.style.justifyContent = 'initial';
  document.body.style.padding = '0';

  if (document.documentElement) {
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
  }

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.style.display = 'block';
    appRoot.style.height = 'auto';
    appRoot.style.minHeight = '100vh';
  }

  document.getElementById('app').innerHTML = `
    <div class="student-dash anim-fade">

      <div class="student-dash-topbar">
        <div class="student-dash-logo">ACADLIT · AI</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="${tutorialBtnClass}" style="${tutorialBtnStyle}" onclick="window.goToTutorialSection()">${tutorialCheckedIn ? '<span class="tutorial-live-dot" aria-hidden="true"></span>Tutorial Active' : '📝 Tutorial'}</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="window.goToContactNotebook()">🗒️ Contact Notebook</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="window.goToGallery()">🖼 Gallery</button>
        </div>
        ${showReturnToDashboard ? '<button onclick="window.switchToLecturerView()" style="background:var(--navy);color:white;border:none;padding:10px 18px;border-radius:20px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;">← Lecturer Dashboard</button>' : ''}
        <div class="user-pill">
          <div class="user-avatar">${name[0].toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${name}</div>
            <div class="user-role">Student</div>
          </div>
          <button class="btn-signout" onclick="appSignOut()">Sign Out</button>
        </div>
      </div>

      <main class="student-dash-main">

        <div class="student-dash-header">
          <h1>Welcome back, ${firstName}</h1>
          <p>ALE00Y1 — Academic Literacies in the Age of AI</p>
        </div>

        <section class="dash-section" style="margin-top:8px;">
          <div id="student-announcement-banner" style="position:relative;overflow:hidden;border-radius:18px;border:1px solid rgba(15,23,42,.08);background:linear-gradient(135deg,#10213a 0%,#16385c 56%,#1f5f7a 100%);box-shadow:0 16px 34px rgba(15,23,42,.14);">
            <div id="student-announcement-track" style="display:flex;transition:transform .45s ease;">
              ${DASHBOARD_CONTENT.announcements.map((a, index) => `
                <article data-announcement-slide="${index}" style="min-width:100%;padding:20px 22px 18px 22px;color:white;">
                  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
                    <div style="display:flex;gap:14px;align-items:flex-start;max-width:820px;">
                      <div style="width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);font-size:24px;flex-shrink:0;">${a.icon}</div>
                      <div>
                        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8ecae6;font-family:var(--font-mono);margin-bottom:6px;">Announcement ${index + 1} of ${DASHBOARD_CONTENT.announcements.length}</div>
                        <h2 style="margin:0 0 6px 0;font-size:22px;line-height:1.2;color:white;">${a.title}</h2>
                        <p style="margin:0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.75;">${a.content}</p>
                        ${a.ctaAction ? `
                          <div style="margin-top:14px;">
                            <button
                              type="button"
                              class="btn-primary"
                              data-announcement-action="${_escHtml(a.ctaAction)}"
                              style="box-shadow:none;padding:10px 14px;font-size:13px;"
                            >${_escHtml(a.ctaLabel || 'Open')}</button>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                      <button type="button" id="student-announcement-prev" class="btn-prev" style="display:inline-flex;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.16);color:white;">←</button>
                      <button type="button" id="student-announcement-next" class="btn-prev" style="display:inline-flex;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.16);color:white;">→</button>
                    </div>
                  </div>
                </article>
              `).join('')}
            </div>
            <div id="student-announcement-dots" style="display:flex;gap:8px;justify-content:center;padding:0 0 16px 0;">
              ${DASHBOARD_CONTENT.announcements.map((_, index) => `
                <button type="button" data-announcement-dot="${index}" aria-label="Go to announcement ${index + 1}" style="width:10px;height:10px;border-radius:999px;border:none;cursor:pointer;background:${index === 0 ? '#ffb703' : 'rgba(255,255,255,.32)'};"></button>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- Recommendation card — loads async -->
        <div id="rec-card" class="rec-card rec-card--loading">
          <div class="rec-loading-row">
            <div class="rec-spinner"></div>
            <span>Personalising your learning path…</span>
          </div>
        </div>

        <div id="featured-gallery-strip"></div>

        ${_renderEscalationNotice(STATE.escalations || [])}

        <section class="dash-section" style="margin-top:18px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">
            <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Course progress</div>
              <div style="font-size:26px;font-weight:900;color:var(--navy);margin-top:6px;">${progressPct}%</div>
              <div class="prog-container" style="padding:0;border:none;margin-top:10px;">
                <div class="prog-bar-bg">
                  <div class="prog-bar-fill" style="width:${progressPct}%;"></div>
                </div>
              </div>
              <p style="font-size:12px;color:var(--muted);margin:10px 0 0 0;">${visitedCount} of ${UNITS.length} units visited</p>
            </div>
            <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Today</div>
              <div style="font-size:18px;font-weight:800;color:${qrVerifiedToday ? '#166534' : '#92400e'};margin-top:6px;">${qrVerifiedToday ? 'Checked in' : 'Waiting for check-in'}</div>
              <p style="font-size:12px;color:var(--muted);line-height:1.7;margin:8px 0 0 0;">Total time: ${totalMinutes} min<br>Class: ${classMinutes} min · Tutorial: ${tutorialMinutes} min</p>
            </div>
            <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Quick actions</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                <button class="btn-primary" onclick="window.goToCourse()">Continue Course</button>
                <button class="btn-prev" style="display:inline-flex;" onclick="window.goToTutorialSection()">Tutorial</button>
                <button class="btn-prev" style="display:inline-flex;" onclick="window.goToContactNotebook()">Notebook</button>
              </div>
            </div>
          </div>
        </section>

        <section class="dash-section" style="margin-top:18px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <button class="dash-card" style="text-align:left;cursor:pointer;background:white;" onclick="window.goToTutorialSection()">
              <div class="dash-card-body">
                <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">My spaces</div>
                <h3 style="margin:8px 0 6px 0;color:var(--navy);">📝 Tutorial Notebook</h3>
                <p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0;">${latestNotebook ? `Last updated ${_escHtml(latestNotebookDate)} at ${_escHtml(latestNotebookTime)} · ${_escHtml(String(tutorialNotebookAnalytics.totalWords || 0))} words · ${_escHtml(String(tutorialNotebookAnalytics.totalAttachments || 0))} uploads` : 'Open your tutorial notebook and continue working.'}</p>
              </div>
            </button>
            <button class="dash-card" style="text-align:left;cursor:pointer;background:white;" onclick="window.goToContactNotebook()">
              <div class="dash-card-body">
                <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">My spaces</div>
                <h3 style="margin:8px 0 6px 0;color:var(--navy);">🗒️ Contact Notebook</h3>
                <p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0;">${latestContactNotebook ? `Last updated ${_escHtml(latestContactNotebookDate)} at ${_escHtml(latestContactNotebookTime)} · ${_escHtml(String(contactNotebookAnalytics.totalWords || 0))} words · ${_escHtml(String(contactNotebookAnalytics.totalAttachments || 0))} uploads` : 'Capture notes, uploads, and contact-session work here.'}</p>
              </div>
            </button>
            <button class="dash-card" style="text-align:left;cursor:pointer;background:white;" onclick="window.goToGallery()">
              <div class="dash-card-body">
                <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">My spaces</div>
                <h3 style="margin:8px 0 6px 0;color:var(--navy);">🖼️ Gallery Walk</h3>
                <p style="font-size:13px;color:var(--muted);line-height:1.6;margin:0;">Browse peer work, upload artefacts, and leave feedback when you are ready.</p>
              </div>
            </button>
          </div>
        </section>

        <section class="dash-section" style="margin-top:18px;">
          <div style="display:grid;gap:12px;">
            <details style="background:white;border:1px solid var(--border);border-radius:16px;padding:0 16px;box-shadow:0 10px 24px rgba(15,23,42,.04);" open>
              <summary style="list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);display:flex;justify-content:space-between;align-items:center;">📅 Attendance Details <span style="font-size:12px;color:var(--muted);font-weight:600;">${qrVerifiedToday ? 'Live today' : 'Open'}</span></summary>
              <div style="padding:0 0 16px 0;">
                <p style="font-size:14px;color:${qrVerifiedToday ? 'var(--green)' : 'var(--amber2)'};margin-bottom:8px;">
                  ${qrVerifiedToday ? '✅ QR check-in verified — activity monitoring active' : '⏳ Waiting for initial QR check-in to start attendance monitoring'}
                </p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                  <div style="padding:10px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">
                    <div style="font-size:11px;color:var(--muted);">Contact session</div>
                    <div style="font-size:12px;font-weight:700;color:${classCheckedIn ? '#166534' : '#92400e'};">${classCheckedIn ? 'Checked in' : 'Not checked in'}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:2px;">Last: ${fmtCheckin(latestClassCheckin)}</div>
                  </div>
                  <div style="padding:10px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">
                    <div style="font-size:11px;color:var(--muted);">Tutorial</div>
                    <div style="font-size:12px;font-weight:700;color:${tutorialCheckedIn ? '#166534' : '#92400e'};">${tutorialCheckedIn ? 'Checked in' : 'Not checked in'}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:2px;">Last: ${fmtCheckin(latestTutorialCheckin)}</div>
                  </div>
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
                  <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:6px;">Scan lecturer QR or enter rotating token</label>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <input id="attendance-qr-token" type="text" placeholder="e.g. A1B2C3" style="flex:1;min-width:180px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;text-transform:uppercase;" />
                    <button class="btn-prev" onclick="window.openAttendanceQrScanner()" style="display:inline-flex;">Scan QR</button>
                    <button class="btn-next" onclick="window.verifyAttendanceQr()" style="display:inline-flex;">Check In</button>
                  </div>
                  <div id="attendance-qr-scan-status" style="font-size:11px;color:var(--muted);margin-top:6px;"></div>
                </div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Previous records</div>
                    <div style="font-size:12px;color:var(--muted);">${priorAttendanceHistory.length} of ${attendanceHistory.length} shown</div>
                  </div>
                  <div style="display:grid;gap:8px;">
                    ${priorAttendanceHistory.length
        ? priorAttendanceHistory.map((row) => `<div style="padding:12px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                          <div>
                            <div style="font-size:13px;font-weight:700;color:var(--navy);">${_escHtml(row.label)}</div>
                            <div style="font-size:12px;color:var(--muted);margin-top:4px;">${row.totalMinutes} min total · Class ${row.classMinutes} min · Tutorial ${row.tutorialMinutes} min</div>
                            <div style="font-size:11px;color:var(--muted);margin-top:4px;">${row.qrCount} QR check-in${row.qrCount === 1 ? '' : 's'} · Latest ${_escHtml(fmtCheckin(row.latestCheckin))}</div>
                          </div>
                          <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;background:${row.present ? '#ecfdf5' : '#fffbeb'};color:${row.present ? '#166534' : '#92400e'};border:1px solid ${row.present ? '#bbf7d0' : '#fde68a'};">${row.present ? 'Present' : 'Missing'}</span>
                        </div>`).join('')
        : '<div style="font-size:12px;color:var(--muted);padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">No previous attendance records have been captured yet.</div>'}
                  </div>
                </div>
              </div>
            </details>

            <details style="background:white;border:1px solid var(--border);border-radius:16px;padding:0 16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <summary style="list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);display:flex;justify-content:space-between;align-items:center;">🧠 Skill Profile <span style="font-size:12px;color:var(--muted);font-weight:600;">Open</span></summary>
              <div style="padding:0 0 16px 0;">
                <div class="skill-map-grid">
                  ${renderSkillMap(adaptive)}
                </div>
                <div id="cohort-strip"></div>
              </div>
            </details>

            <details style="background:white;border:1px solid var(--border);border-radius:16px;padding:0 16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <summary style="list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);display:flex;justify-content:space-between;align-items:center;">💡 Reminders & Key Info <span style="font-size:12px;color:var(--muted);font-weight:600;">Open</span></summary>
              <div style="padding:0 0 16px 0;">
                ${DASHBOARD_CONTENT.reminders.map(r => `
                  <div class="info-item">
                    <div class="info-icon">${r.icon}</div>
                    <div><h4>${r.title}</h4><p>${r.content}</p></div>
                  </div>
                `).join('')}
              </div>
            </details>

            <details style="background:white;border:1px solid var(--border);border-radius:16px;padding:0 16px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
              <summary style="list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);display:flex;justify-content:space-between;align-items:center;">🧰 My Learning Spaces <span style="font-size:12px;color:var(--muted);font-weight:600;">Open</span></summary>
              <div style="padding:0 0 16px 0;display:grid;gap:12px;">
                <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
                  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div>
                      <div style="font-weight:800;color:var(--navy);">Tutorial Notebook ${tutorialCheckedIn ? '· Live today' : ''}</div>
                      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${latestNotebook ? `${_escHtml(latestNotebook.sessionTitle || latestNotebook.sessionId || 'Tutorial Session')} · ${_escHtml(latestNotebookDate)} ${_escHtml(latestNotebookTime)}` : 'No tutorial notes yet.'}</div>
                    </div>
                    <button class="btn-prev" style="display:inline-flex;" onclick="window.goToTutorialSection()">Open</button>
                  </div>
                </div>
                <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
                  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div>
                      <div style="font-weight:800;color:var(--navy);">Contact Notebook</div>
                      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${latestContactNotebook ? `${_escHtml(latestContactNotebook.sessionTitle || latestContactNotebook.sessionId || 'Contact Session')} · ${_escHtml(latestContactNotebookDate)} ${_escHtml(latestContactNotebookTime)}` : 'No contact notebook updates yet.'}</div>
                    </div>
                    <button class="btn-prev" style="display:inline-flex;" onclick="window.goToContactNotebook()">Open</button>
                  </div>
                </div>
                <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
                  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div>
                      <div style="font-weight:800;color:var(--navy);">Gallery Walk Studio</div>
                      <div style="font-size:12px;color:var(--muted);margin-top:4px;">Share artefacts, view peer work, and return when you want to engage.</div>
                    </div>
                    <button class="btn-prev" style="display:inline-flex;" onclick="window.goToGallery()">Open</button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>
    </div>
  `;

  // Populate recommendation card and cohort strip after render
  _loadRecommendation();
  _loadCohortContext();
  _loadFeaturedGalleryStrip();
  _initAnnouncementRotator();
  _initAttendanceQrScanner();
  _consumeAttendanceQrLink().catch((err) => {
    console.error('Attendance QR link handling failed:', err);
  });
}

function _renderAndroidStudentDashboard(vm) {
  const tab = String(window._studentAndroidTab || 'home').trim() || 'home';
  const appSurface = getAppSurface();
  const immersive = Boolean(window._androidImmersiveMode);
  const onlineTone = appSurface.isOnline ? 'android-status-banner--online' : 'android-status-banner--offline';
  const onlineLabel = appSurface.isOnline
    ? 'Connected. Your progress can sync when you work.'
    : 'Offline. You can continue reading and writing; sync resumes when the connection returns.';
  const resumedRecently = appSurface.lastResumeAt
    && (Date.now() - new Date(appSurface.lastResumeAt).getTime()) < 120_000;
  const resumedLabel = resumedRecently ? 'Session restored just now.' : 'Ready for study.';

  setAppSurfaceRoute(`student-${tab}`);

  document.body.style.overflowY = 'auto';
  document.body.style.overflow = 'auto';
  document.body.style.overflowX = 'hidden';
  document.body.style.height = 'auto';
  document.body.style.display = 'block';
  document.body.style.alignItems = 'initial';
  document.body.style.justifyContent = 'initial';
  document.body.style.padding = '0';

  if (document.documentElement) {
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
  }

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.style.display = 'block';
    appRoot.style.height = 'auto';
    appRoot.style.minHeight = '100dvh';
  }

  document.getElementById('app').innerHTML = `
    <div class="android-student-app anim-fade ${immersive ? 'android-student-app--immersive' : ''}">
      <div class="android-quick-drawer-scrim" id="android-student-drawer-scrim" onclick="window.closeAndroidStudentDrawer()"></div>
      <aside class="android-quick-drawer" id="android-student-drawer">
        <div class="android-quick-drawer-header">
          <div>
            <div class="android-section-kicker">Navigate</div>
            <div class="android-course-rail-title">Student menu</div>
          </div>
          <button class="android-icon-btn" onclick="window.closeAndroidStudentDrawer()" aria-label="Close student menu">✕</button>
        </div>
        <div class="android-quick-drawer-body">
          <button class="android-quick-drawer-item" onclick="window.setAndroidStudentTab('home');window.closeAndroidStudentDrawer();">🏠 Home</button>
          <button class="android-quick-drawer-item" onclick="window.setAndroidStudentTab('modules');window.closeAndroidStudentDrawer();">📚 Modules</button>
          <button class="android-quick-drawer-item" onclick="window.setAndroidStudentTab('attendance');window.closeAndroidStudentDrawer();">📲 Attendance</button>
          <button class="android-quick-drawer-item" onclick="window.setAndroidStudentTab('notebook');window.closeAndroidStudentDrawer();">🗒️ Notebook</button>
          <button class="android-quick-drawer-item" onclick="window.setAndroidStudentTab('profile');window.closeAndroidStudentDrawer();">👤 Profile</button>
          <button class="android-quick-drawer-item" onclick="window.toggleAndroidImmersiveMode();window.closeAndroidStudentDrawer();">${immersive ? '🗗 Exit focus mode' : '⛶ Focus mode'}</button>
          <button class="android-quick-drawer-item" onclick="appSignOut()">⎋ Sign out</button>
        </div>
      </aside>

      ${immersive ? `
        <div class="android-focus-strip">
          <button class="android-focus-chip" onclick="window.toggleAndroidStudentDrawer()">☰ Menu</button>
          <button class="android-focus-chip" onclick="window.toggleAndroidImmersiveMode()">🗗 Exit</button>
        </div>
      ` : ''}

      <header class="android-student-appbar">
        <div>
          <div class="android-student-appbar-kicker">Academic Literacies</div>
          <div class="android-student-appbar-title">Student App</div>
        </div>
        <div class="android-student-appbar-actions">
          ${vm.showReturnToDashboard ? '<button class="android-chip-btn" onclick="window.switchToLecturerView()">Lecturer view</button>' : ''}
          <button class="android-chip-btn android-chip-btn--quiet" onclick="window.toggleAndroidImmersiveMode()">${immersive ? 'Exit focus' : 'Focus mode'}</button>
          <button class="android-icon-btn android-icon-btn--solid" onclick="appSignOut()" aria-label="Sign out">⎋</button>
        </div>
      </header>

      <main class="android-student-main">
        <section class="android-student-hero">
          <div class="android-student-hero-copy">
            <div class="android-student-hero-kicker">ALE00Y1</div>
            <h1>Welcome back, ${vm.firstName}</h1>
            <p>Android-first study space for Academic Literacies in the Age of AI.</p>
          </div>
          <div class="android-student-hero-meta">
            <div class="android-mini-stat">
              <span>Progress</span>
              <strong>${vm.progressPct}%</strong>
            </div>
            <div class="android-mini-stat">
              <span>Attendance</span>
              <strong>${vm.qrVerifiedToday ? 'Live' : 'Pending'}</strong>
            </div>
          </div>
        </section>

        <section class="android-status-banner ${onlineTone}">
          <div>
            <strong>${appSurface.isOnline ? 'Connected' : 'Offline mode'}</strong>
            <span>${onlineLabel}</span>
          </div>
          <div class="android-status-banner-meta">${resumedLabel}</div>
        </section>

        ${_renderAndroidStudentTabContent(tab, vm)}
      </main>

      <nav class="android-bottom-nav android-bottom-nav--student">
        <button class="android-bottom-nav-item ${tab === 'home' ? 'active' : ''}" onclick="window.setAndroidStudentTab('home')"><span>🏠</span><span>Home</span></button>
        <button class="android-bottom-nav-item ${tab === 'modules' ? 'active' : ''}" onclick="window.setAndroidStudentTab('modules')"><span>📚</span><span>Modules</span></button>
        <button class="android-bottom-nav-item ${tab === 'attendance' ? 'active' : ''}" onclick="window.setAndroidStudentTab('attendance')"><span>📲</span><span>Attendance</span></button>
        <button class="android-bottom-nav-item ${tab === 'notebook' ? 'active' : ''}" onclick="window.setAndroidStudentTab('notebook')"><span>🗒️</span><span>Notebook</span></button>
        <button class="android-bottom-nav-item ${tab === 'profile' ? 'active' : ''}" onclick="window.setAndroidStudentTab('profile')"><span>👤</span><span>Profile</span></button>
      </nav>
    </div>
  `;
}

function _renderAndroidStudentTabContent(tab, vm) {
  if (tab === 'modules') {
    const unitCards = UNITS.map((u, i) => {
      const visited = Boolean(STATE.progress?.[u.id]?.visited);
      const complete = Boolean(STATE.progress?.[u.id]?.readingComplete || STATE.progress?.[u.id]?.assessmentSubmitted);
      let isLocked = false;
      let lockedReason = '';
      if (i > 0) {
        const prevUnit = UNITS[i - 1];
        const prevComplete = STATE.progress?.[prevUnit.id]?.readingComplete || STATE.progress?.[prevUnit.id]?.assessmentSubmitted;
        const isHighAchiever = (STATE.erProgress?.extraMarks || 0) >= 15;
        if (!prevComplete && !isHighAchiever) {
          isLocked = true;
          lockedReason = `Complete ${prevUnit.badge} first.`;
        }
      }
      return `
        <article class="android-list-card ${isLocked ? 'android-list-card--locked' : ''}">
          <div class="android-list-card-badge">${_escHtml(u.badge)}</div>
          <div class="android-list-card-body">
            <h3>${_escHtml(u.title)}</h3>
            <p>${isLocked ? _escHtml(lockedReason) : (complete ? 'Completed and ready to revisit.' : (visited ? 'In progress. Continue where you left off.' : 'Start this module.'))}</p>
          </div>
          <button class="android-card-action" ${isLocked ? `onclick="alert('🔒 Locked: ${_escHtml(lockedReason)}')"` : `onclick="window.openAndroidCourseUnit(${i})"`}>${isLocked ? 'Locked' : (complete ? 'Review' : 'Open')}</button>
        </article>
      `;
    }).join('');

    return `
      <section class="android-panel-stack">
        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Primary learning flow</div>
              <h2>Modules</h2>
            </div>
            <button class="android-chip-btn" onclick="window.goToCourse()">Resume current</button>
          </div>
          <div class="android-action-row">
            <button class="android-action-pill" onclick="window.goToCourse()">Continue learning</button>
            <button class="android-action-pill" onclick="window.openAndroidCourseUnit(0)">Start from Unit 1</button>
            <button class="android-action-pill" onclick="window.goToTutorialSection()">Tutorial notebook</button>
          </div>
        </section>
        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">All units</div>
              <h2>Course map</h2>
            </div>
          </div>
          <div class="android-list-stack">${unitCards}</div>
        </section>
        <section class="android-card-grid android-card-grid--tight">
          <button class="android-panel android-panel--action" onclick="window.goToCourse()">
            <span class="android-panel-icon">📖</span>
            <strong>Open course view</strong>
            <span>Full unit content with Android navigation shell.</span>
          </button>
          <button class="android-panel android-panel--action" onclick="window.goToGallery()">
            <span class="android-panel-icon">🖼️</span>
            <strong>Gallery walk</strong>
            <span>Move from modules into peer artefacts and reflection.</span>
          </button>
        </section>
      </section>
    `;
  }

  if (tab === 'attendance') {
    return `
      <section class="android-panel-stack">
        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Live check-in</div>
              <h2>Attendance</h2>
            </div>
            <div class="android-state-pill ${vm.qrVerifiedToday ? 'android-state-pill--good' : 'android-state-pill--warn'}">${vm.qrVerifiedToday ? 'Checked in' : 'Awaiting QR'}</div>
          </div>
          <div class="android-card-grid android-card-grid--tight">
            <div class="android-info-card">
              <span>Today</span>
              <strong>${vm.totalMinutes} min</strong>
              <small>${vm.presentToday ? 'Presence recorded' : 'No presence recorded yet'}</small>
            </div>
            <div class="android-info-card">
              <span>Class</span>
              <strong>${vm.classMinutes} min</strong>
              <small>Last ${vm.fmtCheckin(vm.latestClassCheckin)}</small>
            </div>
            <div class="android-info-card">
              <span>Tutorial</span>
              <strong>${vm.tutorialMinutes} min</strong>
              <small>Last ${vm.fmtCheckin(vm.latestTutorialCheckin)}</small>
            </div>
          </div>
        </section>

        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Check in now</div>
              <h2>QR or token</h2>
            </div>
          </div>
          <label class="android-field-label" for="attendance-qr-token">Scan lecturer QR or enter the rotating token</label>
          <div class="android-inline-form">
            <input id="attendance-qr-token" type="text" placeholder="e.g. A1B2C3" class="android-text-input" />
            <button class="android-card-action" onclick="window.openAttendanceQrScanner()">Scan QR</button>
            <button class="android-card-action android-card-action--primary" onclick="window.verifyAttendanceQr()">Check in</button>
          </div>
          <div id="attendance-qr-scan-status" class="android-helper-text"></div>
        </section>

        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Attendance log</div>
              <h2>Previous records</h2>
            </div>
            <div class="android-state-pill">${vm.attendanceHistory.length} day${vm.attendanceHistory.length === 1 ? '' : 's'}</div>
          </div>
          <div class="android-list-stack">
            ${vm.priorAttendanceHistory.length ? vm.priorAttendanceHistory.map((row) => `
              <article class="android-list-card">
                <div class="android-list-card-body">
                  <h3>${_escHtml(row.label)}</h3>
                  <p>${row.present ? 'Presence recorded' : 'No presence recorded'} · ${row.totalMinutes} min total · ${row.qrCount} QR check-in${row.qrCount === 1 ? '' : 's'}</p>
                  <small>Class ${row.classMinutes} min · Tutorial ${row.tutorialMinutes} min · Latest ${_escHtml(vm.fmtCheckin(row.latestCheckin))}</small>
                </div>
                <span class="android-state-pill ${row.present ? 'android-state-pill--good' : 'android-state-pill--warn'}">${row.present ? 'Present' : 'Missing'}</span>
              </article>
            `).join('') : '<div class="android-helper-text">No previous attendance records have been captured yet.</div>'}
          </div>
        </section>
      </section>
    `;
  }

  if (tab === 'notebook') {
    return `
      <section class="android-panel-stack">
        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Capture and reflect</div>
              <h2>Notebook and studio</h2>
            </div>
          </div>
          <div class="android-card-grid">
            <button class="android-panel android-panel--action" onclick="window.goToTutorialSection()">
              <span class="android-panel-icon">📝</span>
              <strong>Tutorial Notebook</strong>
              <span>${vm.latestNotebook ? `${_escHtml(vm.latestNotebookDate)} · ${_escHtml(vm.latestNotebookTime)}` : 'No tutorial notes yet.'}</span>
            </button>
            <button class="android-panel android-panel--action" onclick="window.goToContactNotebook()">
              <span class="android-panel-icon">🗒️</span>
              <strong>Contact Notebook</strong>
              <span>${vm.latestContactNotebook ? `${_escHtml(vm.latestContactNotebookDate)} · ${_escHtml(vm.latestContactNotebookTime)}` : 'No contact notebook updates yet.'}</span>
            </button>
            <button class="android-panel android-panel--action" onclick="window.goToGallery()">
              <span class="android-panel-icon">🖼️</span>
              <strong>Gallery Walk</strong>
              <span>Open peer work, artefacts, and response space.</span>
            </button>
            <button class="android-panel android-panel--action" onclick="window.goToCourse()">
              <span class="android-panel-icon">🤖</span>
              <strong>AI-supported study</strong>
              <span>Continue with tutor and tools inside the course shell.</span>
            </button>
          </div>
        </section>
      </section>
    `;
  }

  if (tab === 'profile') {
    return `
      <section class="android-panel-stack">
        <section class="android-panel">
          <div class="android-section-heading">
            <div>
              <div class="android-section-kicker">Account</div>
              <h2>Profile</h2>
            </div>
          </div>
          <div class="android-profile-card">
            <div class="android-profile-avatar">${_escHtml(vm.name[0]?.toUpperCase() || 'S')}</div>
            <div>
              <strong>${_escHtml(vm.name)}</strong>
              <span>${_escHtml(vm.user?.email || 'No email on account')}</span>
              <small>Student · ${_escHtml(vm.profile.studentId || vm.profile.studentNumber || 'Student number not captured')}</small>
            </div>
          </div>
          <div class="android-list-stack">
            <div class="android-list-card">
              <div class="android-list-card-body">
                <h3>App status</h3>
                <p>${_escHtml(vm.deviceInfo.type || 'Mobile')} device · ${_escHtml(vm.deviceInfo.screenWidth || window.innerWidth)}px · ${getAppSurface().isOnline ? 'Online' : 'Offline'}</p>
              </div>
              <button class="android-card-action" onclick="window.goToGovernanceFramework()">Rewards</button>
            </div>
            <div class="android-list-card">
              <div class="android-list-card-body">
                <h3>Attendance today</h3>
                <p>${vm.qrVerifiedToday ? 'Attendance verified and monitoring active.' : 'No QR verification yet today.'}</p>
              </div>
              <button class="android-card-action" onclick="window.setAndroidStudentTab('attendance')">Open</button>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  return `
    <section class="android-panel-stack">
      <section class="android-panel">
        <div class="android-section-heading">
          <div>
            <div class="android-section-kicker">Start here</div>
            <h2>Home</h2>
          </div>
          <button class="android-chip-btn" onclick="window.goToCourse()">Continue course</button>
        </div>
        <div class="android-action-row">
          <button class="android-action-pill" onclick="window.goToCourse()">Resume learning</button>
          <button class="android-action-pill" onclick="window.setAndroidStudentTab('attendance')">Attendance</button>
          <button class="android-action-pill" onclick="window.setAndroidStudentTab('notebook')">Notebook</button>
        </div>
      </section>

      <section id="student-announcement-banner" class="android-panel android-panel--hero">
        <div id="student-announcement-track" class="android-announcement-track">
          ${DASHBOARD_CONTENT.announcements.map((a, index) => `
            <article data-announcement-slide="${index}" class="android-announcement-slide">
              <div class="android-announcement-icon">${a.icon}</div>
              <div>
                <div class="android-section-kicker">Announcement ${index + 1} of ${DASHBOARD_CONTENT.announcements.length}</div>
                <h2>${a.title}</h2>
                <p>${a.content}</p>
                ${a.ctaAction ? `<button type="button" class="android-chip-btn" data-announcement-action="${_escHtml(a.ctaAction)}">${_escHtml(a.ctaLabel || 'Open')}</button>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
        <div class="android-announcement-controls">
          <button type="button" id="student-announcement-prev" class="android-icon-btn">←</button>
          <div id="student-announcement-dots" class="android-announcement-dots">
            ${DASHBOARD_CONTENT.announcements.map((_, index) => `<button type="button" data-announcement-dot="${index}" aria-label="Go to announcement ${index + 1}"></button>`).join('')}
          </div>
          <button type="button" id="student-announcement-next" class="android-icon-btn">→</button>
        </div>
      </section>

      <div id="rec-card" class="rec-card rec-card--loading">
        <div class="rec-loading-row">
          <div class="rec-spinner"></div>
          <span>Personalising your learning path…</span>
        </div>
      </div>

      ${_renderEscalationNotice(STATE.escalations || [])}
      <div id="featured-gallery-strip"></div>

      <section class="android-card-grid">
        <article class="android-info-card">
          <span>Course progress</span>
          <strong>${vm.progressPct}%</strong>
          <small>${vm.visitedCount} of ${UNITS.length} units visited</small>
        </article>
        <article class="android-info-card">
          <span>Attendance</span>
          <strong>${vm.qrVerifiedToday ? 'Verified' : 'Pending'}</strong>
          <small>${vm.totalMinutes} minutes today</small>
        </article>
        <article class="android-info-card">
          <span>Notebook</span>
          <strong>${_escHtml(String(vm.tutorialNotebookAnalytics.totalWords || 0))} words</strong>
          <small>${_escHtml(String(vm.tutorialNotebookAnalytics.totalAttachments || 0))} uploads</small>
        </article>
      </section>

      <section class="android-panel">
        <div class="android-section-heading">
          <div>
            <div class="android-section-kicker">Learning spaces</div>
            <h2>Quick access</h2>
          </div>
        </div>
        <div class="android-card-grid">
          <button class="android-panel android-panel--action" onclick="window.setAndroidStudentTab('modules')">
            <span class="android-panel-icon">📚</span>
            <strong>Modules</strong>
            <span>Open unit-by-unit study with Android navigation.</span>
          </button>
          <button class="android-panel android-panel--action" onclick="window.goToTutorialSection()">
            <span class="android-panel-icon">📝</span>
            <strong>Tutorial notebook</strong>
            <span>${vm.latestNotebook ? `${_escHtml(vm.latestNotebookDate)} · ${_escHtml(vm.latestNotebookTime)}` : 'Continue your tutorial writing.'}</span>
          </button>
          <button class="android-panel android-panel--action" onclick="window.goToContactNotebook()">
            <span class="android-panel-icon">🗒️</span>
            <strong>Contact notebook</strong>
            <span>${vm.latestContactNotebook ? `${_escHtml(vm.latestContactNotebookDate)} · ${_escHtml(vm.latestContactNotebookTime)}` : 'Capture contact-session work.'}</span>
          </button>
          <button class="android-panel android-panel--action" onclick="window.goToGallery()">
            <span class="android-panel-icon">🖼️</span>
            <strong>Gallery walk</strong>
            <span>Move from your own work into peer examples and artefacts.</span>
          </button>
          <button class="android-panel android-panel--action" onclick="window.openChatPanel?.()">
            <span class="android-panel-icon">💬</span>
            <strong>Live Chat</strong>
            <span>Talk to tutors and lecturers when they are online.</span>
          </button>
        </div>
      </section>
    </section>
  `;
}

function _initAnnouncementRotator() {
  const banner = document.getElementById('student-announcement-banner');
  const track = document.getElementById('student-announcement-track');
  const dots = [...document.querySelectorAll('[data-announcement-dot]')];
  const total = DASHBOARD_CONTENT.announcements.length;
  if (window._studentAnnouncementRotator) {
    clearInterval(window._studentAnnouncementRotator.timer);
    window._studentAnnouncementRotator = null;
  }
  if (!banner || !track || total <= 1) return;

  let index = 0;
  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.style.background = dotIndex === index ? '#ffb703' : 'rgba(255,255,255,.32)';
      dot.style.transform = dotIndex === index ? 'scale(1.15)' : 'scale(1)';
    });
  };
  const next = () => {
    index = (index + 1) % total;
    render();
  };
  const prev = () => {
    index = (index - 1 + total) % total;
    render();
  };
  const resetTimer = () => {
    if (window._studentAnnouncementRotator?.timer) clearInterval(window._studentAnnouncementRotator.timer);
    window._studentAnnouncementRotator = {
      timer: window.setInterval(next, 5500),
    };
  };

  document.getElementById('student-announcement-next')?.addEventListener('click', () => {
    next();
    resetTimer();
  });
  document.getElementById('student-announcement-prev')?.addEventListener('click', () => {
    prev();
    resetTimer();
  });
  dots.forEach((dot, dotIndex) => {
    dot.addEventListener('click', () => {
      index = dotIndex;
      render();
      resetTimer();
    });
  });
  banner.querySelectorAll('[data-announcement-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = String(button.dataset.announcementAction || '').trim();
      if (action === 'governance-rewards') {
        window.goToGovernanceFramework?.();
      }
    });
  });
  banner.addEventListener('mouseenter', () => {
    if (window._studentAnnouncementRotator?.timer) clearInterval(window._studentAnnouncementRotator.timer);
  });
  banner.addEventListener('mouseleave', resetTimer);

  render();
  resetTimer();
}

async function _loadFeaturedGalleryStrip() {
  const strip = document.getElementById('featured-gallery-strip');
  if (!strip) return;
  try {
    const pinned = await getPinnedGalleryPosts(4);
    if (!pinned.length) {
      strip.innerHTML = '';
      return;
    }

    strip.innerHTML = `
      <section class="dash-section" style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <h2 class="dash-section-heading" style="margin:0;">🌟 Featured Gallery Highlights</h2>
          <button class="btn-prev" style="display:inline-flex;" onclick="window.goToGallery()">Open Gallery Walk</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          ${pinned.map((p) => `
            <div onclick="window.goToGalleryPost('${p.id}')" style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:0 2px 10px rgba(0,0,0,.03);cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(0,0,0,.08)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 10px rgba(0,0,0,.03)'">
              <div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:2px 8px;display:inline-flex;">📌 Highlight</div>
              <h4 style="margin:8px 0 6px 0;color:var(--navy);font-size:14px;line-height:1.4;">${_escHtml(p.title || 'Untitled')}</h4>
              <p style="margin:0 0 8px 0;color:var(--muted);font-size:12px;line-height:1.5;">${_escHtml((p.content || '').slice(0, 120))}${(p.content || '').length > 120 ? '…' : ''}</p>
              <div style="font-size:11px;color:var(--muted);">${_escHtml(p.authorName || 'Anonymous')} · ${_escHtml(p.mode === 'group' ? (p.groupName || 'Group') : 'Individual')} · <span style="color:var(--accent)">Open ↗</span></div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  } catch {
    strip.innerHTML = '';
  }
}

function _escHtml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Skill map renderer ────────────────────────
function renderSkillMap(adaptive) {
  return Object.entries(SKILL_LABELS).map(([skillId, label]) => {
    const status = adaptive?.skill_status?.[skillId] || 'untested';
    const entries = adaptive?.skill_scores?.[skillId] || [];
    const cfg = STATUS_CONFIG[status];
    const needsFocus = (adaptive?.needs_remediation || []).includes(skillId);

    const recentScores = entries.slice(-3).map(e => e.score);
    const avg = recentScores.length
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length * 10) / 10
      : 0;
    const barPct = Math.round((avg / 5) * 100);

    return `
      <div class="skill-card ${needsFocus ? 'skill-card--focus' : ''}"
           style="border-left: 3px solid ${cfg.border}; background: ${cfg.bg}">
        <div class="skill-card-top">
          <span class="skill-card-icon">${SKILL_ICONS[skillId]}</span>
          <span class="skill-card-name">${label}</span>
          ${needsFocus ? '<span class="skill-focus-tag">⚠ Focus area</span>' : ''}
        </div>
        <span class="skill-badge" style="color:${cfg.color}; background:rgba(0,0,0,0.04)">
          ${cfg.label}
        </span>
        ${entries.length >= 2 ? `
          <div class="skill-bar-bg">
            <div class="skill-bar-fill" style="width:${barPct}%; background:${cfg.color}"></div>
          </div>
          <span class="skill-count">${avg}/5 · ${entries.length} interaction${entries.length !== 1 ? 's' : ''}</span>
        ` : `
          <span class="skill-count">Use the AI tools to assess this skill</span>
        `}
      </div>`;
  }).join('');
}

// ── Recommendation card async loader ─────────
async function _loadRecommendation() {
  const card = document.getElementById('rec-card');
  if (!card) return;

  try {
    const rec = await getCoordinatorRecommendation();
    if (!rec) { card.style.display = 'none'; return; }

    // Track outcome for remediation recommendations with a micro-module target
    if (rec.action_target && MICRO_MODULE_IDS.has(rec.action_target) && rec.skill_focus) {
      const skillScores = STATE.adaptive?.skill_scores?.[rec.skill_focus] || [];
      const scoreBefore = skillScores.length ? skillScores[skillScores.length - 1].score : null;
      recordOutcome(rec.action_target, rec.skill_focus, scoreBefore);
    }

    const cfg = REC_TYPE_CONFIG[rec.type] || REC_TYPE_CONFIG.continue;

    // Build action button
    let btnHtml = '';
    if (rec.action_label) {
      const target = rec.action_target;
      const toolLbl = target ? (MODULE_LABELS[target] ?? target) : null;

      if (target && MICRO_MODULE_IDS.has(target)) {
        // Opens the full micro-module page
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToMicroModule('${target}')">
          ${rec.action_label} — ${toolLbl}
        </button>`;
      } else if (target === 'study_buddy' || target === 'ai_tutor') {
        // Opens the AI Tutor
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToCourse(); setTimeout(() => document.getElementById('ai-tutor-toggle')?.click(), 800)">
          ${rec.action_label} — Study Buddy
        </button>`;
      } else {
        btnHtml = `<button class="rec-btn"
          style="background:${cfg.btnBg};color:${cfg.btnColor}"
          onclick="window.goToCourse()">
          ${rec.action_label}
        </button>`;
      }
    }

    card.className = 'rec-card anim-slide-up';
    card.style.cssText = `
      border-left: 4px solid ${cfg.borderColor};
      background: ${cfg.bg};
    `;
    card.innerHTML = `
      <div class="rec-icon" style="color:${cfg.borderColor}">${cfg.icon}</div>
      <div class="rec-body">
        <p class="rec-message">${rec.message}</p>
        ${btnHtml}
      </div>
    `;
  } catch {
    if (card) card.style.display = 'none';
  }
}

// ── Escalation notice ─────────────────────────
function _renderEscalationNotice(escalations) {
  const active = escalations.filter(e => !e.resolved);
  if (!active.length) return '';
  return `
    <div class="escalation-notice" style="
      display:flex;align-items:flex-start;gap:16px;
      background:rgba(99,102,241,0.06);
      border:1px solid rgba(99,102,241,0.2);
      border-radius:12px;padding:18px 20px;margin-bottom:24px;">
      <div style="font-size:24px;flex-shrink:0;">💙</div>
      <div>
        <p style="font-size:14px;color:var(--navy);margin:0;line-height:1.6;">
          <strong>A gentle note:</strong> We've noticed you may be finding some areas challenging.
          Your lecturer has been notified and is here to support you. Feel free to reach out during
          consultation hours or through the student support portal. You're doing better than you think.
        </p>
      </div>
    </div>`;
}

// ── Cohort context strip ───────────────────────
async function _loadCohortContext() {
  try {
    const { getCohortAverages } = await import('../cohort.js');
    const data = await getCohortAverages();
    if (!data) return;

    const strip = document.getElementById('cohort-strip');
    if (!strip) return;

    const adaptive = STATE.adaptive;
    const candidates = [];

    Object.entries(data.skillPercentages).forEach(([skillId, pct]) => {
      const status = adaptive?.skill_status?.[skillId];
      if ((status === 'weak' || status === 'developing') && pct >= 30) {
        candidates.push({ skillId, pct, label: SKILL_LABELS[skillId] });
      }
    });

    if (!candidates.length) return;

    const top = candidates.sort((a, b) => b.pct - a.pct)[0];

    strip.innerHTML = `
      <div style="
        display:flex;align-items:center;gap:12px;
        background:rgba(16,185,129,0.06);
        border:1px solid rgba(16,185,129,0.2);
        border-radius:10px;padding:12px 16px;margin-top:16px;">
        <span style="font-size:20px;">👥</span>
        <span style="font-size:13px;color:var(--navy);line-height:1.5;">
          <strong>${top.pct}% of students</strong> in your group are also working on
          <strong>${top.label}</strong>. You're not alone — keep going!
        </span>
      </div>`;
  } catch {
    // Fail silently — cohort data is optional
  }
}

function _initAttendanceQrScanner() {
  if (window._attendanceScannerInit) return;
  window._attendanceScannerInit = true;

  const _setScannerStatus = (message = '', modalMessage = '') => {
    const statusEl = document.getElementById('attendance-qr-scan-status');
    const modalStatus = document.getElementById('attendance-qr-modal-status');
    if (statusEl && message) statusEl.textContent = message;
    if (modalStatus && modalMessage) modalStatus.textContent = modalMessage;
  };

  const _cameraPermissionState = async () => {
    try {
      if (!navigator.permissions?.query) return 'unknown';
      const result = await navigator.permissions.query({ name: 'camera' });
      return result?.state || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const _cameraErrorMessage = (err) => {
    const code = String(err?.name || '').trim();
    if (code === 'NotAllowedError' || code === 'SecurityError') {
      return 'Camera permission denied. Allow camera access in browser/app settings, then try again.';
    }
    if (code === 'NotFoundError' || code === 'OverconstrainedError') {
      return 'No usable camera was found on this device.';
    }
    if (code === 'NotReadableError') {
      return 'Camera is busy in another app. Close it and try again.';
    }
    if (code === 'AbortError') {
      return 'Camera startup was interrupted. Please retry.';
    }
    return 'Could not access camera. Enter token manually.';
  };

  window._attendanceScannerState = {
    running: false,
    stream: null,
    rafId: null,
    detector: null,
    lastHintAt: 0,
  };

  window.openAttendanceQrScanner = async () => {
    const state = window._attendanceScannerState;
    if (state?.running) {
      _setScannerStatus('Scanner is already running.', 'Point camera at the lecturer QR code…');
      return;
    }

    if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
      _setScannerStatus('Camera not available on this device. Enter token manually.', 'Camera not supported here.');
      return;
    }

    if (!('BarcodeDetector' in window)) {
      _setScannerStatus('QR scanner not supported here. Enter token manually.', 'This device/browser does not support QR detection.');
      console.error('BarcodeDetector API not available.');
      return;
    }

    const permission = await _cameraPermissionState();
    if (permission === 'denied') {
      _setScannerStatus(
        'Camera permission may be blocked. We will still try to request access now.',
        'Camera may be blocked in settings. Attempting access…'
      );
    }

    if (!document.getElementById('attendance-qr-modal')) {
      const modal = document.createElement('div');
      modal.id = 'attendance-qr-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px;';
      modal.innerHTML = `
        <div style="width:min(560px,95vw);background:white;border-radius:12px;padding:12px;border:1px solid var(--border);box-shadow:0 14px 30px rgba(0,0,0,.25);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="color:var(--navy);">Scan Attendance QR</strong>
            <button id="attendance-qr-close" class="btn-prev" style="display:inline-flex;">Close</button>
          </div>
          <video id="attendance-qr-video" autoplay playsinline muted style="width:100%;max-height:60vh;border:1px solid var(--border);border-radius:10px;background:#111;"></video>
          <div id="attendance-qr-modal-status" style="font-size:12px;color:var(--muted);margin-top:8px;">Point camera at the lecturer QR code…</div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = document.getElementById('attendance-qr-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          window.closeAttendanceQrScanner?.();
        });
      }

      modal.addEventListener('click', (evt) => {
        if (evt.target === modal) window.closeAttendanceQrScanner?.();
      });
    }

    const modal = document.getElementById('attendance-qr-modal');
    const video = document.getElementById('attendance-qr-video');
    const modalStatus = document.getElementById('attendance-qr-modal-status');
    if (!modal || !video) return;

    window.closeAttendanceQrScanner?.();

    modal.style.display = 'flex';
    _setScannerStatus('Opening camera…', 'Requesting camera access…');

    try {
      state.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      video.srcObject = state.stream;
      await video.play();
      state.running = true;

      const scanLoop = async () => {
        if (!state.running) return;
        try {
          if (video.readyState >= 2) {
            const codes = await state.detector.detect(video);
            if (codes?.length) {
              const raw = String(codes[0]?.rawValue || '').trim();
              if (raw) {
                _setScannerStatus('QR detected. Verifying…', 'QR detected. Verifying…');
                if (typeof window.verifyAttendanceQrPayload !== 'function') {
                  _setScannerStatus('QR detected, but verification function missing.', 'Verification function not found.');
                  console.error('window.verifyAttendanceQrPayload is not defined or not a function.');
                  return;
                }
                try {
                  const result = await window.verifyAttendanceQrPayload(raw, true);
                  if (result?.ok) {
                    _setScannerStatus(`✅ Attendance confirmed for ${result.sessionType}.`, 'Attendance confirmed. Closing scanner…');
                    await _recordAttendanceAnalytics(result, result.token || _extractAttendanceToken(raw));
                    // Save attendance to Firebase
                    try {
                      if (!window.saveState) {
                        const mod = await import('../state.js');
                        window.saveState = mod.saveState;
                      }
                      await window.saveState();
                    } catch (err) {
                      console.error('Attendance save failed:', err);
                    }
                    setTimeout(() => window.closeAttendanceQrScanner?.(), 500);
                    return;
                  }
                  // Debug output for token validation failure
                  console.warn('QR validation failed:', {
                    scannedToken: raw,
                    result,
                  });
                  _setScannerStatus(result?.message || 'QR code found but token is invalid or expired.', 'Invalid/expired token. Try scanning the latest QR code.');
                  state.lastHintAt = Date.now();
                } catch (err) {
                  _setScannerStatus('Error verifying QR code.', 'Verification error.');
                  console.error('Error in verifyAttendanceQrPayload:', err);
                }
              }
            } else if (!state.lastHintAt || Date.now() - state.lastHintAt > 15000) {
              if (modalStatus) modalStatus.textContent = 'Still scanning… keep the QR fully in frame and well lit.';
              state.lastHintAt = Date.now();
            }
          }
        } catch (err) {
          console.error('Error during QR scan loop:', err);
          // keep scanning
        }
        state.rafId = window.requestAnimationFrame(scanLoop);
      };

      state.rafId = window.requestAnimationFrame(scanLoop);
      _setScannerStatus('Camera opened. Point at QR code…', 'Point camera at the lecturer QR code…');
    } catch (err) {
      const msg = _cameraErrorMessage(err);
      _setScannerStatus(msg, msg);
      console.error('Camera initialization error:', err);
    }
  };

  window.closeAttendanceQrScanner = () => {
    const state = window._attendanceScannerState;
    if (state?.rafId) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    state.running = false;

    const video = document.getElementById('attendance-qr-video');
    if (video) video.srcObject = null;

    if (state?.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }

    state.lastHintAt = 0;

    const modal = document.getElementById('attendance-qr-modal');
    if (modal) modal.style.display = 'none';
  };
}

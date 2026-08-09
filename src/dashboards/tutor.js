// src/dashboards/tutor.js
// ─────────────────────────────────────────────
// Tutor Dashboard — Tutorial Session Plans (45 min)
// Visible to users with role [tutor]
// Mirrors lecturer.js but surfaces tutorial sessions only.
// ─────────────────────────────────────────────
import { SESSIONS, SESSION_META } from '../../content/sessions/sessions.js';
import { renderSessionPlan } from '../components/session-plan.js';
import { STATE } from '../state.js';
import { db } from '../firebase.js';
import { ref, get, set, remove } from 'firebase/database';
import { TUTOR_GROUP_ASSIGNMENTS } from '../../content/tutorial-groups/assignments.js';
import * as assessments from '../../content/assessments/index.js';
import { generateQrDataUrl } from '../qr.js';
import { renderGoLiveToggle } from '../components/chat-panel.js';
import { renderSubmissionReviewer } from '../components/submission-reviewer.js';
import { autoCloseDashboardSidebar, initDashboardFocusChrome } from './dashboard-focus.js';

function _esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _displayName(raw = '') {
  return String(raw || '').split(' [')[0].trim();
}

function _jsArg(value) {
  return JSON.stringify(value ?? '');
}

function _maskEmail(email = '') {
  const value = String(email || '').trim().toLowerCase();
  const [local, domain] = value.split('@');
  if (!local || !domain) return 'hidden';
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function _currentRole() {
  if (_isTutorPreviewMode()) return 'tutor';
  return String(STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student').toLowerCase();
}

function _previewTutorUser() {
  if (window._dashboardRolePreview !== 'tutor') return null;
  const preview = window._dashboardTutorPreview;
  if (!preview || typeof preview !== 'object') return null;
  if (!preview.uid && !preview.email && !preview.displayName) return null;
  return preview;
}

function _isTutorPreviewMode() {
  return Boolean(_previewTutorUser());
}

function _activeTutorUser() {
  return _previewTutorUser() || STATE.user || {};
}

function _safeGroupId(value = '') {
  return String(value || '').trim().toUpperCase();
}

function _getAssessmentList() {
  const source = window._atConfigs && typeof window._atConfigs === 'object'
    ? Object.values(window._atConfigs)
    : Object.values(assessments);
  return source
    .filter((cfg) => cfg && typeof cfg === 'object' && cfg.id)
    .map((cfg) => ({
      id: String(cfg.id || '').trim(),
      badge: cfg.badge || cfg.id,
      icon: cfg.icon || '📋',
      title: cfg.title || cfg.badge || cfg.id,
    }))
    .filter((cfg) => cfg.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function _loadTutorGradingAllocations() {
  const tutorUid = String(_activeTutorUser()?.uid || '').trim();
  if (!tutorUid) return [];
  try {
    const snap = await get(ref(db, 'grading-assignments'));
    const raw = snap.exists() ? (snap.val() || {}) : {};
    const metaById = Object.fromEntries(_getAssessmentList().map((cfg) => [cfg.id, cfg]));
    return Object.entries(raw || {})
      .map(([assessmentId, payload]) => {
        const safeAssessmentId = String(assessmentId || '').trim();
        if (!safeAssessmentId) return null;
        const groupAssignments = Object.entries(payload?.groupAssignments || {})
          .filter(([, entry]) => String(entry?.markerUid || '').trim() === tutorUid)
          .map(([groupId]) => _safeGroupId(groupId))
          .filter(Boolean);
        const overrideCount = Object.values(payload?.submissionOverrides || {})
          .filter((entry) => String(entry?.markerUid || '').trim() === tutorUid)
          .length;
        if (!groupAssignments.length && !overrideCount) return null;
        const meta = metaById[safeAssessmentId] || {};
        return {
          id: safeAssessmentId,
          badge: meta.badge || safeAssessmentId.toUpperCase(),
          icon: meta.icon || '📋',
          title: meta.title || meta.badge || safeAssessmentId.toUpperCase(),
          groups: Array.from(new Set(groupAssignments)).sort(),
          overrideCount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

let _tutorQrAttendanceState = null;
let _tutorGroupRowsCache = [];
let _tutorSelectedGroupFilter = 'all';
let _tutorSelectedDateKey = '';

function _attendanceToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function _publishTutorTutorialToken(state) {
  const now = Date.now();
  const token = _attendanceToken();
  const expiresAt = now + 60_000;
  const activeTutor = _activeTutorUser();
  state.token = token;
  state.expiresAt = expiresAt;

  await set(ref(db, 'attendance/live/tutorial'), {
    active: true,
    sessionType: 'tutorial',
    token,
    sessionId: state.sessionId,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    issuedByUid: activeTutor?.uid || null,
    issuedByRole: 'tutor',
  });

  const appUrl = `${window.location.origin}${window.location.pathname}?session=tutorial&attend=${token}`;
  const qrSrc = generateQrDataUrl(appUrl, 260);

  const img = document.getElementById('tutor-att-qr-img');
  const code = document.getElementById('tutor-att-qr-code');
  const link = document.getElementById('tutor-att-qr-link');
  if (img) img.src = qrSrc;
  if (code) code.textContent = token;
  if (link) {
    link.textContent = appUrl;
    link.href = appUrl;
  }
}

async function _stopTutorQrAttendance(state, closeOverlay = false) {
  if (!state) return;
  clearInterval(state.rotateInterval);
  clearInterval(state.countdownInterval);
  try {
    await remove(ref(db, 'attendance/live/tutorial'));
  } catch {
    // silent
  }
  if (closeOverlay) {
    document.getElementById('tutor-att-qr-overlay')?.remove();
  }
  _tutorQrAttendanceState = null;
}

export function renderTutorDashboard(container) {
  const previewTutor = _previewTutorUser();
  container.innerHTML = `
    <div class="dash-wrapper">
      ${_buildSidebar()}
      <div class="dash-sidebar-scrim" onclick="window._closeDashSidebar?.()"></div>
      ${_buildMobileDashboardBar()}
      <div class="dash-content" id="dash-content">
        ${previewTutor ? `<div style="margin:0 0 16px 0;padding:14px 16px;border:1px solid #a7f3d0;border-radius:14px;background:#ecfdf5;color:#065f46;font-size:13px;line-height:1.6;"><strong>Preview Mode:</strong> You are viewing the tutor dashboard as <strong>${_esc(previewTutor.displayName || previewTutor.email || previewTutor.uid || 'Tutor')}</strong>. Interactive tutor actions are read-only in this preview.</div>` : ''}
        ${_buildWelcome()}
      </div>
    </div>`;

  document.querySelectorAll('.dash-nav-item[data-session]').forEach(el => {
    el.addEventListener('click', () => {
      const sid = el.dataset.session;
      _loadSession(sid);
      document.querySelectorAll('.dash-nav-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      autoCloseDashboardSidebar();
    });
  });

  window._dashLoadSession = _loadSession;
  window._openTutorGroupInsights = _openTutorGroupInsights;
  window._openTutorSubmissionReviewer = async function (preferredAssessmentId = '') {
    const content = document.getElementById('dash-content');
    if (!content) return;
    content.innerHTML = '<div id="submission-reviewer-mount" style="height:100%;overflow-y:auto;"></div>';
    await renderSubmissionReviewer(document.getElementById('submission-reviewer-mount'));
    const preferredId = String(preferredAssessmentId || '').trim();
    if (preferredId && typeof window._loadStaffSubmissions === 'function') {
      await window._loadStaffSubmissions(preferredId);
      autoCloseDashboardSidebar();
      return;
    }
    const gradingAllocations = await _loadTutorGradingAllocations();
    const firstAssigned = gradingAllocations[0]?.id || '';
    if (firstAssigned && typeof window._loadStaffSubmissions === 'function') {
      await window._loadStaffSubmissions(firstAssigned);
    }
    document.querySelectorAll('.dash-nav-item').forEach((e) => e.classList.remove('active'));
    autoCloseDashboardSidebar();
  };
  window._openTutorAllocatedAssessment = function (assessmentId) {
    window._openTutorSubmissionReviewer(String(assessmentId || ''));
  };
  _renderTutorGroupSummary();
  if (_isTutorPreviewMode()) {
    const mount = document.getElementById('tutor-go-live-mount');
    if (mount) mount.innerHTML = '<div style="font-size:11px;color:#065f46;padding:8px 10px;border:1px solid #a7f3d0;border-radius:10px;background:#ecfdf5;">Tutor preview mode: live controls disabled.</div>';
  } else {
    renderGoLiveToggle('tutor-go-live-mount');
  }
  initDashboardFocusChrome();
}

function _buildMobileDashboardBar() {
  return `
    <div class="dash-mobile-bar">
      <button class="dash-mobile-menu-btn" onclick="window._toggleDashSidebar?.()">Menu</button>
      <button class="dash-focus-toggle" onclick="window._toggleDashFocusMode?.()">
        <span data-dash-focus-label>Focus view</span>
      </button>
    </div>`;
}

function _buildSidebarActions() {
  return `
    <div class="dash-sidebar-actions">
      <button class="dash-sidebar-focus-btn" onclick="window._toggleDashFocusMode?.()">
        <span data-dash-focus-label>Focus view</span>
      </button>
      <button class="dash-sidebar-close-btn" onclick="window._closeDashSidebar?.()" aria-label="Close sidebar">Close</button>
    </div>`;
}

function _buildSidebar() {
  const meta = SESSION_META.tutorial;

  const phases = [
    { label: 'Phase 1 — Units 1–3', items: meta.slice(0, 3) },
    { label: 'Phase 2a — Units 4–6', items: meta.slice(3, 6) },
    { label: 'Phase 2b — Units 7–9', items: meta.slice(6, 9) },
    { label: 'Phase 3a — Units 10–12', items: meta.slice(9, 12) },
    { label: 'Phase 3b — Units 13–15', items: meta.slice(12, 15) },
    { label: 'Phase 4 — Units 16–18', items: meta.slice(15, 18) },
    { label: 'Phase 5 — Units 19–20', items: meta.slice(18, 20) },
  ];

  return `
    <aside class="dash-sidebar">
      <div class="dash-sidebar-header">
        <div class="dash-role-badge tutor-badge">👥 Tutor</div>
        <div class="dash-sidebar-title">Tutorial Sessions</div>
        <div class="dash-sidebar-sub">45 minutes · Targeted support</div>
        ${_buildSidebarActions()}
      </div>

      <div class="dash-session-type-bar">
        <span class="dst-active">Tutorial (45 min)</span>
      </div>

      ${phases.map(ph => `
        <div class="dash-phase-group">
          <div class="dash-phase-label">${ph.label}</div>
          ${ph.items.map(m => `
            <div class="dash-nav-item" data-session="${m.id}">
              <div class="dash-nav-id tutorial-id">${m.id.toUpperCase()}</div>
              <div class="dash-nav-label">${m.label.replace(/^T\d+ — /, '')}</div>
            </div>`).join('')}
        </div>`).join('')}

      <div class="dash-sidebar-footer">
        <div id="tutor-go-live-mount"></div>
        <div class="dash-quick-tools">
          <div class="dash-qt-label">Quick Tools</div>
          <button class="dash-qt-btn" onclick="_fullPomodoro()">🍅 Group Timer</button>
          <button class="dash-qt-btn" onclick="_randomiser()">🎲 Cold Call</button>
          <button class="dash-qt-btn" onclick="_printSession()">🖨️ Print Plan</button>
          <button class="dash-qt-btn" onclick="_diagnosticBuilder()">📊 Diagnostic</button>
          <button class="dash-qt-btn" onclick="_openTutorTutorialQrTool()">📲 Tutorial QR Check-in</button>
          <button class="dash-qt-btn" onclick="_openTutorGroupInsights()">👥 My Student Data</button>
          <button class="dash-qt-btn" onclick="window._openTutorSubmissionReviewer()" style="background:#059669;color:white;border-color:#059669;">📤 My Grading Queue</button>
        </div>
      </div>
    </aside>`;
}

function _todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _activeAttendanceDateKey() {
  const raw = String(_tutorSelectedDateKey || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return _todayKey();
}

function _resolveTutorAssignmentLocal() {
  const activeTutor = _activeTutorUser();
  const email = String(activeTutor?.email || '').toLowerCase();
  const displayName = String(activeTutor?.displayName || activeTutor?.name || '').split(' [')[0].trim().toLowerCase();
  return TUTOR_GROUP_ASSIGNMENTS.find((row) => {
    const cfgEmail = String(row?.tutor?.email || '').toLowerCase();
    const cfgName = String(row?.tutor?.displayName || '').trim().toLowerCase();
    return (cfgEmail && cfgEmail === email) || (cfgName && cfgName === displayName);
  }) || null;
}

async function _resolveTutorAssignment() {
  const tutorUid = _activeTutorUser()?.uid;
  if (tutorUid) {
    try {
      const snap = await get(ref(db, `tutorial-groups/assignmentsByTutor/${tutorUid}`));
      if (snap.exists()) return snap.val();
    } catch {
      // fallback to local mapping
    }
  }
  return _resolveTutorAssignmentLocal();
}

function _groupStudentCount(group) {
  const byEmail = Array.isArray(group?.students) ? group.students.length : 0;
  const byUid = Array.isArray(group?.studentUids) ? group.studentUids.length : 0;
  return byUid + byEmail;
}

function _summariseHeutagogy(progressObj = {}) {
  const units = Object.entries(progressObj || {})
    .filter(([k, v]) => /^u\d+$/i.test(String(k)) && v && typeof v === 'object')
    .map(([, v]) => v);

  const cycles = units.flatMap((unitProgress) => {
    const map = unitProgress?.heutagogyCycles || {};
    return Object.values(map).filter((row) => row && typeof row === 'object');
  });

  const total = cycles.length;
  const withEvidence = cycles.filter((row) => String(row?.evidence || '').trim().length >= 10).length;
  const withReflection = cycles.filter((row) => String(row?.reflection || '').trim().length >= 10).length;
  const savedRows = cycles
    .filter((row) => row?.savedAt)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  const lastPathway = String(savedRows[0]?.pathway || '').trim();

  return {
    total,
    withEvidence,
    withReflection,
    missingEvidence: Math.max(0, total - withEvidence),
    lastPathway,
  };
}

async function _renderTutorGroupSummary() {
  const content = document.getElementById('dash-content');
  if (!content) return;
  const [assignment, gradingAllocations] = await Promise.all([
    _resolveTutorAssignment(),
    _loadTutorGradingAllocations(),
  ]);
  const groups = assignment?.groups || [];
  const studentCount = groups.reduce((sum, g) => sum + _groupStudentCount(g), 0);

  const host = document.createElement('div');
  host.style.cssText = 'margin-top:16px;background:white;border:1px solid var(--border);border-radius:12px;padding:12px;';
  host.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;background:#f8fafc;">
        ${assignment
          ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
               <div>
                 <div style="font-size:12px;color:var(--muted);">Assigned tutorial groups</div>
                 <div style="font-size:14px;color:var(--navy);font-weight:700;">${groups.length} group${groups.length === 1 ? '' : 's'} · ${studentCount} student${studentCount === 1 ? '' : 's'}</div>
               </div>
               <button class="btn-prev" style="display:inline-flex;" onclick="_openTutorGroupInsights()">Open My Student Data</button>
             </div>`
          : `<div style="font-size:13px;color:var(--muted);line-height:1.6;">No tutor-group allocation found yet. Add your mappings in <strong>content/tutorial-groups/assignments.js</strong> and reload this dashboard.</div>`}
      </div>
      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;background:#f0fdf4;">
        <div style="font-size:12px;color:#166534;">My grading queue</div>
        <div style="font-size:14px;color:var(--navy);font-weight:700;margin-top:2px;">Open the assigned marking queue without lecturer setup or allocation controls.</div>
        ${gradingAllocations.length
          ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
               ${gradingAllocations.map((item) => `<button class="btn-prev" style="display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;padding:10px 12px;border-color:#bbf7d0;background:white;" onclick="window._openTutorAllocatedAssessment(${_jsArg(item.id)})">
                 <span style="font-weight:700;color:var(--navy);">${_esc(item.icon)} ${_esc(item.badge)}</span>
                 <span style="font-size:12px;color:#166534;">Open queue</span>
               </button>`).join('')}
             </div>`
          : '<div style="font-size:13px;color:var(--muted);line-height:1.6;margin-top:8px;">No submission queue is assigned to this tutor yet.</div>'}
      </div>
    </div>`;

  content.appendChild(host);
}

async function _openTutorGroupInsights() {
  const content = document.getElementById('dash-content');
  if (!content) return;
  const role = _currentRole();
  if (role !== 'tutor' && role !== 'lecturer') {
    content.innerHTML = `
      <div style="padding:28px;background:white;border:1px solid var(--border);border-radius:12px;">
        <h2 style="margin:0 0 8px 0;color:var(--navy);font-family:var(--font-sans);">🔒 Access restricted</h2>
        <p style="margin:0;color:var(--muted);line-height:1.6;">Student-level tutor-group analytics are available to tutor/lecturer roles only.</p>
      </div>`;
    return;
  }

  const assignment = await _resolveTutorAssignment();
  if (!assignment) {
    content.innerHTML = `
      <div style="padding:28px;background:white;border:1px solid var(--border);border-radius:12px;">
        <h2 style="margin:0 0 8px 0;color:var(--navy);font-family:var(--font-sans);">👥 My Student Data</h2>
        <p style="margin:0;color:var(--muted);line-height:1.6;">No allocation found for your tutor account. Add your groups and student emails in <strong>content/tutorial-groups/assignments.js</strong>.</p>
      </div>`;
    return;
  }

  content.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading assigned student data...</div>';

  const emailToGroup = {};
  const uidToGroup = {};
  (assignment.groups || []).forEach((g) => {
    (g.students || []).forEach((email) => {
      emailToGroup[String(email || '').toLowerCase()] = { id: g.id, name: g.name || g.id || 'Group' };
    });
    (g.studentUids || []).forEach((uid) => {
      uidToGroup[String(uid || '')] = { id: g.id, name: g.name || g.id || 'Group' };
    });
  });

  const wantedEmails = new Set(Object.keys(emailToGroup));
  const wantedUids = Object.keys(uidToGroup);
  const usesUidLookup = wantedUids.length > 0;
  const usesEmailLookup = !usesUidLookup && wantedEmails.size > 0;
  const selectedDateKey = _activeAttendanceDateKey();

  const [trafficSnap, gallerySnap] = await Promise.all([
    get(ref(db, `analytics/events-summary/${selectedDateKey}`)),
    get(ref(db, 'gallery/posts')),
  ]);
  const galleryPostsRaw = gallerySnap.exists() ? Object.values(gallerySnap.val() || {}) : [];
  const tutorialSessionPostsByUid = new Map();
  galleryPostsRaw.forEach((p) => {
    if (!p || p.removed) return;
    const authorUid = String(p.authorUid || '').trim();
    if (!authorUid) return;
    const isTutorialSessionPost = String(p?.instanceMeta?.type || '') === 'tutorial' || String(p?.category || '') === 'Tutorial Notebook';
    if (!isTutorialSessionPost) return;
    const createdAt = String(p.createdAt || '');
    const stats = tutorialSessionPostsByUid.get(authorUid) || { total: 0, today: 0 };
    stats.total += 1;
    if (createdAt.startsWith(selectedDateKey)) stats.today += 1;
    tutorialSessionPostsByUid.set(authorUid, stats);
  });
  const rows = [];

  if (usesUidLookup) {
    const userSnaps = await Promise.all(wantedUids.map((uid) => get(ref(db, `users/${uid}`))));
    userSnaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const uid = wantedUids[idx];
      const user = snap.val();
      const email = String(user?.profile?.email || '').toLowerCase();
      const groupName = uidToGroup[uid]?.name || 'Unmapped';
      const s = user?.state || {};
      const progressObj = s.progress || {};
      const visited = Object.values(progressObj).filter((p) => p?.visited).length;
      const progressPct = Math.round((visited / 20) * 100);
      const heutagogy = _summariseHeutagogy(progressObj);
      const weakSkills = Object.values(s.adaptive?.skill_status || {}).filter((v) => v === 'weak').length;
      const frust = Number(s.adaptive?.frustration_index || 0);
      const attendanceToday = s.attendance?.byDate?.[selectedDateKey] || null;
      const qrCheckins = attendanceToday?.qrCheckins || [];
      const tutorialCheckins = qrCheckins.filter((c) => c?.sessionType === 'tutorial');
      const latestTutorialAt = tutorialCheckins.length ? tutorialCheckins[tutorialCheckins.length - 1]?.at : null;
      const sessionContrib = tutorialSessionPostsByUid.get(uid) || { total: 0, today: 0 };

      let calibrationMatches = 0;
      Object.values(progressObj).forEach(u => {
        if (u.quizScores && u.tutorScores) {
          Object.keys(u.quizScores).forEach(qk => {
            if (u.tutorScores[qk] !== undefined && u.tutorScores[qk] === u.quizScores[qk]) {
              calibrationMatches++;
            }
          });
        }
      });

      let riskScore = 0;
      if (frust >= 3) riskScore += 2;
      else if (frust >= 2) riskScore += 1;
      if (weakSkills >= 2) riskScore += 2;
      else if (weakSkills >= 1) riskScore += 1;
      if (progressPct < 20) riskScore += 2;
      else if (progressPct < 45) riskScore += 1;
      if (tutorialCheckins.length > 0 && sessionContrib.today === 0) riskScore += 1;
      if (sessionContrib.total >= 3) riskScore = Math.max(0, riskScore - 1);
      const risk = riskScore >= 4 ? 'High' : (riskScore >= 2 ? 'Medium' : 'Low');
      rows.push({
        uid,
        name: _displayName(user?.profile?.displayName || email || uid),
        email,
        maskedEmail: _maskEmail(email),
        group: groupName,
        progressPct,
        heutagogyTotal: heutagogy.total,
        heutagogyEvidence: heutagogy.withEvidence,
        heutagogyReflection: heutagogy.withReflection,
        heutagogyMissingEvidence: heutagogy.missingEvidence,
        heutagogyLastPathway: heutagogy.lastPathway,
        weakSkills,
        frust,
        risk,
        riskScore,
        checkedIn: qrCheckins.length > 0,
        tutorialCheckedIn: tutorialCheckins.length > 0,
        latestTutorialAt,
        tutorialSessionContribTotal: sessionContrib.total,
        tutorialSessionContribToday: sessionContrib.today,
        calibrationMatches,
      });
    });
  } else {
    content.innerHTML = `
      <div style="padding:28px;background:white;border:1px solid var(--border);border-radius:12px;">
        <h2 style="margin:0 0 8px 0;color:var(--navy);font-family:var(--font-sans);">🔒 Privacy Protection Enabled</h2>
        <p style="margin:0;color:var(--muted);line-height:1.6;">
          This tutor view now requires <strong>student UID allocations</strong> to prevent broad student-directory reads.
          Please ask the lecturer to re-save Tutor Group assignments so <code>studentUids</code> are populated.
        </p>
      </div>`;
    return;
  }

  const existingEmails = new Set(rows.map((r) => String(r.email || '').toLowerCase()).filter(Boolean));
  (assignment.groups || []).forEach((g) => {
    const groupName = g?.name || g?.id || 'Group';
    (g?.students || []).forEach((entryRaw) => {
      const entry = String(entryRaw || '').trim();
      if (!entry) return;
      const maybeEmail = /@/.test(entry) ? entry.toLowerCase() : '';
      if (maybeEmail && existingEmails.has(maybeEmail)) return;
      const displayName = maybeEmail
        ? _displayName(maybeEmail.split('@')[0].replace(/[._-]+/g, ' '))
        : entry;
      rows.push({
        uid: '',
        name: _displayName(displayName),
        email: maybeEmail,
        maskedEmail: maybeEmail ? _maskEmail(maybeEmail) : 'Manual roster entry',
        group: groupName,
        progressPct: 0,
        heutagogyTotal: 0,
        heutagogyEvidence: 0,
        heutagogyReflection: 0,
        heutagogyMissingEvidence: 0,
        heutagogyLastPathway: '',
        weakSkills: 0,
        frust: 0,
        risk: 'Medium',
        riskScore: 2,
        checkedIn: false,
        tutorialCheckedIn: false,
        latestTutorialAt: null,
        tutorialSessionContribTotal: 0,
        tutorialSessionContribToday: 0,
      });
    });
  });

  rows.sort((a, b) => {
    const order = { High: 3, Medium: 2, Low: 1 };
    if (order[b.risk] !== order[a.risk]) return order[b.risk] - order[a.risk];
    return a.progressPct - b.progressPct;
  });
  _tutorGroupRowsCache = rows.slice();

  const groupNames = Array.from(new Set(rows.map((r) => r.group).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  if (_tutorSelectedGroupFilter !== 'all' && !groupNames.includes(_tutorSelectedGroupFilter)) {
    _tutorSelectedGroupFilter = 'all';
  }
  const filteredRows = _tutorSelectedGroupFilter === 'all'
    ? rows
    : rows.filter((r) => r.group === _tutorSelectedGroupFilter);

  const groupStats = (assignment.groups || []).map((g) => {
    const gRows = rows.filter((r) => r.group === (g.name || g.id));
    const avgProgress = gRows.length ? Math.round(gRows.reduce((sum, r) => sum + r.progressPct, 0) / gRows.length) : 0;
    const highRisk = gRows.filter((r) => r.risk === 'High').length;
    const totalSessionContrib = gRows.reduce((sum, r) => sum + Number(r.tutorialSessionContribTotal || 0), 0);
    return {
      name: g.name || g.id,
      total: gRows.length,
      avgProgress,
      highRisk,
      totalSessionContrib,
    };
  });

  const activeLearners = Object.keys(trafficSnap.exists() ? (trafficSnap.val()?.activeStudents || {}) : {}).length;
  const tutorialCheckedInCount = rows.filter((r) => r.tutorialCheckedIn).length;
  const tutorialMissingCount = Math.max(0, rows.length - tutorialCheckedInCount);
  const contractsInView = filteredRows.reduce((sum, r) => sum + Number(r.heutagogyTotal || 0), 0);
  const evidenceInView = filteredRows.reduce((sum, r) => sum + Number(r.heutagogyEvidence || 0), 0);

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
      <h1 style="margin:0;color:var(--navy);font-family:var(--font-heading);">👥 My Tutorial Groups</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input id="tutor-attendance-date" type="date" value="${selectedDateKey}" onchange="_setTutorAttendanceDate(this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;" />
        <button class="btn-prev" style="display:inline-flex;" onclick="_setTutorAttendanceDate('${_todayKey()}')">Today</button>
        <select id="tutor-group-filter" onchange="_setTutorGroupFilter(this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;">
          <option value="all" ${_tutorSelectedGroupFilter === 'all' ? 'selected' : ''}>All groups</option>
          ${groupNames.map((name) => `<option value="${_esc(name)}" ${_tutorSelectedGroupFilter === name ? 'selected' : ''}>${_esc(name)}</option>`).join('')}
        </select>
        <button class="btn-prev" style="display:inline-flex;" onclick="_exportTutorAttendanceCsv()">⬇ Export Tutorial Attendance CSV</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_openTutorGroupInsights()">↻ Refresh</button>
      </div>
    </div>

    <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
      Privacy mode: student emails are masked in this view.
      Date: <strong style="color:var(--navy);">${selectedDateKey}</strong>.
      ${usesUidLookup ? ' Using UID-based roster matching (recommended).' : (usesEmailLookup ? ' Using email-based roster matching (fallback). For stronger security, switch to studentUids in assignments.' : '')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Assigned groups</div><div style="font-size:26px;font-weight:800;color:var(--navy);">${assignment.groups.length}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Students (view)</div><div style="font-size:26px;font-weight:800;color:var(--navy);">${filteredRows.length}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Tutorial checked in</div><div style="font-size:26px;font-weight:800;color:#166534;">${filteredRows.filter(r => r.tutorialCheckedIn).length}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Tutorial missing</div><div style="font-size:26px;font-weight:800;color:#991b1b;">${filteredRows.filter(r => !r.tutorialCheckedIn).length}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">High risk (view)</div><div style="font-size:26px;font-weight:800;color:#ef4444;">${filteredRows.filter(r => r.risk === 'High').length}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Learning contracts (view)</div><div style="font-size:26px;font-weight:800;color:#4338ca;">${contractsInView}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Contracts with evidence</div><div style="font-size:26px;font-weight:800;color:#166534;">${evidenceInView}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Session contributions (today)</div><div style="font-size:26px;font-weight:800;color:#0f766e;">${filteredRows.reduce((sum, r) => sum + Number(r.tutorialSessionContribToday || 0), 0)}</div></div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Active learners (date)</div><div style="font-size:26px;font-weight:800;color:var(--accent);">${activeLearners}</div></div>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <h3 style="margin:0;color:var(--navy);">📲 Tutorial Attendance (${selectedDateKey})</h3>
        <button class="btn-prev" style="display:inline-flex;" onclick="_openTutorTutorialQrTool()">Open Tutorial QR Check-in</button>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.6;">
        Tutors can run rotating tutorial QR tokens directly from this dashboard. Students who verify are marked in tutorial attendance status below.
      </div>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">
      <h3 style="margin:0 0 10px 0;color:var(--navy);">Group snapshot</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
        ${groupStats.map((g) => `<div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;">
          <div style="font-size:13px;font-weight:700;color:var(--navy);">${_esc(g.name)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;">Students: <strong style="color:var(--navy);">${g.total}</strong> · Avg progress: <strong style="color:var(--navy);">${g.avgProgress}%</strong> · High risk: <strong style="color:${g.highRisk ? '#ef4444' : '#10b981'};">${g.highRisk}</strong> · Session posts: <strong style="color:var(--navy);">${g.totalSessionContrib}</strong></div>
        </div>`).join('')}
      </div>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Student</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Group</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Progress</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Risk</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Contracts</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Evidence</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Weak Skills</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Session Posts</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Tutorial QR</th>
            <th style="text-align:left;padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;">Last Tutorial Check-in</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRows.length ? filteredRows.map((r) => `<tr>
            <td style="padding:10px 12px;border-top:1px solid var(--border);color:var(--navy);font-size:13px;">${_esc(r.name)}<div style="font-size:11px;color:var(--muted);">${_esc(r.maskedEmail)}</div></td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:13px;color:var(--navy);">${_esc(r.group)}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:13px;color:var(--navy);">${r.progressPct}%</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;">
              <span style="padding:2px 8px;border-radius:999px;background:${r.risk === 'High' ? '#fee2e2' : r.risk === 'Medium' ? '#fef3c7' : '#ecfdf5'};color:${r.risk === 'High' ? '#991b1b' : r.risk === 'Medium' ? '#92400e' : '#166534'};font-weight:700;">${r.risk}</span>
            </td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--navy);">${Number(r.heutagogyTotal || 0)}<div style="font-size:11px;color:var(--muted);">${r.heutagogyLastPathway ? _esc(r.heutagogyLastPathway) : 'No pathway yet'}</div></td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:${Number(r.heutagogyMissingEvidence || 0) ? '#92400e' : '#166534'};">${Number(r.heutagogyEvidence || 0)} / ${Number(r.heutagogyTotal || 0)}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:13px;color:${r.weakSkills ? '#ef4444' : 'var(--muted)'};">${r.weakSkills || '—'}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--navy);">${Number(r.tutorialSessionContribToday || 0)} today · ${Number(r.tutorialSessionContribTotal || 0)} total</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:13px;color:${r.tutorialCheckedIn ? '#166534' : '#92400e'};">${r.tutorialCheckedIn ? 'Checked in' : 'Not yet'}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">${r.latestTutorialAt ? _esc(new Date(r.latestTutorialAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '—'}</td>
          </tr>`).join('') : `<tr><td colspan="10" style="padding:14px;color:var(--muted);">No students in this group filter yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

window._setTutorGroupFilter = (groupName) => {
  _tutorSelectedGroupFilter = groupName || 'all';
  _openTutorGroupInsights();
};

window._setTutorAttendanceDate = (dateKey) => {
  const safe = String(dateKey || '').trim();
  _tutorSelectedDateKey = /^\d{4}-\d{2}-\d{2}$/.test(safe) ? safe : _todayKey();
  _openTutorGroupInsights();
};

window._openTutorTutorialQrTool = async () => {
  if (_isTutorPreviewMode()) {
    alert('Tutor dashboard preview is read-only. Return to lecturer view or sign in as the tutor to start tutorial QR check-in.');
    return;
  }
  if (_tutorQrAttendanceState) {
    await _stopTutorQrAttendance(_tutorQrAttendanceState, true);
  }

  const state = {
    sessionType: 'tutorial',
    sessionId: `tutor_att_${Date.now()}`,
    token: null,
    expiresAt: 0,
    rotateInterval: null,
    countdownInterval: null,
  };
  _tutorQrAttendanceState = state;

  const overlay = document.createElement('div');
  overlay.id = 'tutor-att-qr-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:560px;width:100%;padding:24px;border:1px solid var(--border);box-shadow:0 20px 50px rgba(0,0,0,.25);">
      <h2 style="margin:0 0 6px 0;color:var(--navy);font-family:'DM Sans',sans-serif;">Tutorial QR Check-in</h2>
      <p style="margin:0 0 16px 0;color:var(--muted);font-size:13px;line-height:1.5;">Ask students to scan this QR code (or enter token). Token rotates every 60 seconds.</p>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
        <div style="width:260px;height:260px;border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;">
          <img id="tutor-att-qr-img" alt="Tutorial Attendance QR" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="flex:1;min-width:220px;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Current token</div>
          <div id="tutor-att-qr-code" style="font-family:var(--font-mono);font-size:30px;font-weight:800;color:var(--navy);letter-spacing:2px;margin-bottom:10px;">------</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Rotates in</div>
          <div id="tutor-att-qr-timer" style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:12px;">60s</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Student link</div>
          <a id="tutor-att-qr-link" href="#" target="_blank" rel="noopener" style="font-size:11px;word-break:break-all;color:var(--accent);display:block;"></a>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
        <button id="tutor-att-qr-stop" style="padding:8px 12px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;cursor:pointer;">Stop Session</button>
        <button id="tutor-att-qr-close" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--navy);cursor:pointer;">Close</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  await _publishTutorTutorialToken(state);

  state.rotateInterval = setInterval(() => {
    _publishTutorTutorialToken(state).catch(console.error);
  }, 60_000);

  state.countdownInterval = setInterval(() => {
    const leftMs = Math.max(0, state.expiresAt - Date.now());
    const left = Math.ceil(leftMs / 1000);
    const timer = document.getElementById('tutor-att-qr-timer');
    if (timer) timer.textContent = `${left}s`;
  }, 250);

  document.getElementById('tutor-att-qr-stop')?.addEventListener('click', async () => {
    await _stopTutorQrAttendance(state, true);
  });
  document.getElementById('tutor-att-qr-close')?.addEventListener('click', async () => {
    await _stopTutorQrAttendance(state, true);
  });
};

window._exportTutorAttendanceCsv = () => {
  const allRows = Array.isArray(_tutorGroupRowsCache) ? _tutorGroupRowsCache : [];
  const rows = _tutorSelectedGroupFilter === 'all'
    ? allRows
    : allRows.filter((r) => r.group === _tutorSelectedGroupFilter);
  if (!rows.length) {
    alert('No attendance data to export yet. Open My Student Data first.');
    return;
  }

  const header = [
    'name',
    'maskedEmail',
    'group',
    'progressPct',
    'risk',
    'heutagogyTotal',
    'heutagogyEvidence',
    'heutagogyLastPathway',
    'weakSkills',
    'tutorialSessionContribToday',
    'tutorialSessionContribTotal',
    'tutorialCheckedIn',
    'lastTutorialCheckin',
    'calibrationMatches'
  ];

  const csvRows = rows.map((r) => [
    r.name || '',
    r.maskedEmail || '',
    r.group || '',
    Number(r.progressPct || 0),
    r.risk || '',
    Number(r.heutagogyTotal || 0),
    Number(r.heutagogyEvidence || 0),
    Number(r.heutagogyMissingEvidence || 0),
    r.heutagogyLastPathway || '',
    Number(r.weakSkills || 0),
    Number(r.tutorialSessionContribToday || 0),
    Number(r.tutorialSessionContribTotal || 0),
    r.tutorialCheckedIn ? 'yes' : 'no',
    r.latestTutorialAt || '',
    r.calibrationMatches || 0,
  ]);

  const csv = [header, ...csvRows]
    .map((arr) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = _tutorSelectedGroupFilter === 'all'
    ? 'all-groups'
    : _tutorSelectedGroupFilter.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  a.download = `tutorial-attendance-${suffix}-${_activeAttendanceDateKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

function _loadSession(sid) {
  const session = SESSIONS[sid];
  if (!session) return;
  const content = document.getElementById('dash-content');
  if (!content) return;
  content.innerHTML = `<div id="sp-mount-${sid}"></div>`;
  renderSessionPlan(session, `sp-mount-${sid}`);
  content.scrollTop = 0;
  autoCloseDashboardSidebar();
}

function _buildWelcome() {
  return `
    <div class="dash-welcome">
      <div class="dash-welcome-icon">👥</div>
      <h1 class="dash-welcome-title">Tutorial Session Planner</h1>
      <p class="dash-welcome-sub">
        Select a session from the left to view the full 45-minute tutorial plan.
        Every session assumes students have done their module pre-work — your role is to deepen, diagnose, and build.
      </p>
      <div class="dash-welcome-cards">
        <div class="dash-wc">
          <div class="dash-wc-icon">🔬</div>
          <div class="dash-wc-title">Diagnostic First</div>
          <p>Every tutorial opens with a quick diagnostic check — where are students actually stuck? Spend your 45 minutes where they need it most.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🔧</div>
          <div class="dash-wc-title">Artefact Workshops</div>
          <p>Most sessions include a live artefact workshop — students work on a real assignment component with immediate feedback loops.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">✍️</div>
          <div class="dash-wc-title">Process Writing</div>
          <p>Tutorials often focus on one stage of the process writing cycle: pre-writing, structural drafting, or targeted revision. Never all stages at once.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🍅</div>
          <div class="dash-wc-title">Timed Micro-Writes</div>
          <p>Short Pomodoro blocks (10–15 min) give students a defined window to produce. The constraint drives focus better than open-ended time.</p>
        </div>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:14px;margin-top:24px;">← Select a tutorial from the sidebar to begin</p>
    </div>`;
}

// ── Quick tools ───────────────────────────────
window._diagnosticBuilder = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pom-fullscreen';
  overlay.innerHTML = `
    <div class="pom-fs-inner" style="max-width:500px;text-align:left;">
      <div class="pom-fs-title" style="margin-bottom:16px;">📊 Quick Diagnostic</div>
      <p style="font-size:14px;opacity:.8;margin-bottom:16px;">Ask students to rate themselves 1–5 on three things:</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        <div class="diag-item">1. I understand this week's key concept</div>
        <div class="diag-item">2. I can apply it to my own writing</div>
        <div class="diag-item">3. I know exactly where I'm stuck</div>
      </div>
      <p style="font-size:13px;opacity:.7;">Collect by hands or a quick whiteboard tally. Anyone scoring 1–2 on item 3 is your priority group today.</p>
      <button onclick="this.closest('.pom-fullscreen').remove()" 
        style="margin-top:20px;background:var(--amber);color:var(--navy);border:none;border-radius:30px;padding:10px 24px;font-weight:700;cursor:pointer;font-size:14px;">
        Close
      </button>
    </div>`;
  document.body.appendChild(overlay);
};

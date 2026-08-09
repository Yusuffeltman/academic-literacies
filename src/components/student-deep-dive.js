// src/components/student-deep-dive.js
// ─────────────────────────────────────────────
// Comprehensive Student Profile Deep Dive
// Loads and renders all data about a single student:
// device info, attendance timeline, session durations,
// access patterns, gallery/collaboration, chat, submissions,
// notebook analytics.
// ─────────────────────────────────────────────
import { db } from '../firebase.js';
import { ref, get } from 'firebase/database';
import { UNITS } from '../../content/units/index.js';
import * as assessments from '../../content/assessments/index.js';

function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _fmtMinutes(sec) {
  const m = Math.max(0, Math.round((sec || 0) / 60));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function _dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _extractBrowser(ua = '') {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  if (/Opera|OPR\//i.test(ua)) return 'Opera';
  return 'Other';
}

function _extractOS(ua = '') {
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS|Macintosh/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  if (/CrOS/i.test(ua)) return 'Chrome OS';
  return 'Unknown';
}

function _getAssessmentList() {
  const list = [];
  for (const [key, cfg] of Object.entries(assessments)) {
    if (cfg && typeof cfg === 'object' && cfg.id) {
      list.push({ id: cfg.id, badge: cfg.badge || key, title: cfg.title || key, icon: cfg.icon || '📋' });
    }
  }
  return list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

// ── Main render function ─────────────────────
// student: the _cachedStudents[i] object from lecturer.js
// Returns HTML string to inject after existing profile sections.
export async function renderStudentDeepDive(student) {
  if (!student?.uid) return '';

  const uid = student.uid;

  // Load data in parallel
  const [presenceSnap, gallerySnap, submissionIndexSnap, chatRoomsSnap] = await Promise.all([
    get(ref(db, `presence/live/${uid}`)).catch(() => ({ exists: () => false })),
    get(ref(db, 'gallery/posts')).catch(() => ({ exists: () => false })),
    get(ref(db, `submission-index/${uid}`)).catch(() => ({ exists: () => false })),
    get(ref(db, `chat/user-rooms/${uid}`)).catch(() => ({ exists: () => false })),
  ]);

  // Also try loading collaboration group memberships
  const collabSnap = await get(ref(db, 'collaboration-groups/scopes')).catch(() => ({ exists: () => false }));

  const sections = [
    _renderDeviceAndAccess(student, presenceSnap),
    _renderAttendanceTimeline(student),
    _renderSessionDurationAnalysis(student),
    _renderUnitAccessPatterns(student),
    _renderNotebookActivity(student),
    _renderGalleryContributions(uid, gallerySnap),
    _renderCollaborationContributions(uid, collabSnap),
    _renderAssessmentSubmissions(uid, submissionIndexSnap),
    _renderChatActivity(uid, chatRoomsSnap),
    _renderProductivityScore(student, gallerySnap, submissionIndexSnap),
  ];

  return `
    <div style="margin-top:28px;border-top:3px solid var(--accent);padding-top:28px;">
      <h2 style="font-size:20px;color:var(--navy);margin:0 0 6px 0;font-family:var(--font-sans);">Comprehensive Activity Profile</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 20px 0;">Full breakdown of this student's access, engagement, contributions, and productivity across all platform areas.</p>
      ${sections.join('')}
    </div>
  `;
}

// ── 1. Device & Access Info ──────────────────
function _renderDeviceAndAccess(student, presenceSnap) {
  const di = student.state?.deviceInfo || student.progressObj?.__deviceInfo || null;
  const presence = presenceSnap.exists() ? presenceSnap.val() : null;
  const nowMs = Date.now();
  const lastSeenMs = presence?.lastSeen ? new Date(presence.lastSeen).getTime() : 0;
  const isOnline = presence?.online && lastSeenMs && (nowMs - lastSeenMs) <= 120_000;
  const lastActivity = presence?.activity || '—';

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">💻 Device & Access Information</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
        <div style="padding:10px 12px;border-radius:10px;background:${isOnline ? '#ecfdf5' : '#f8fafc'};border:1px solid ${isOnline ? '#bbf7d0' : 'var(--border)'};">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Status</div>
          <div style="font-size:16px;font-weight:900;color:${isOnline ? '#166534' : '#64748b'};margin-top:2px;">${isOnline ? 'Online Now' : 'Offline'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">Last seen: ${_fmtDate(presence?.lastSeen)}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Current Activity</div>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:2px;text-transform:capitalize;">${_esc(String(lastActivity).replace(/_/g, ' '))}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Device Type</div>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:2px;">${di ? `${di.type === 'Mobile' ? '📱' : di.type === 'Tablet' ? '📟' : '💻'} ${di.type}` : 'Not recorded'}</div>
          ${di?.screenWidth ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">Screen: ${di.screenWidth}px wide</div>` : ''}
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Browser / OS</div>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:2px;">${di?.userAgent ? `${_extractBrowser(di.userAgent)} on ${_extractOS(di.userAgent)}` : 'Not recorded'}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">QR Verified Today</div>
          <div style="font-size:14px;font-weight:800;color:${presence?.qrVerifiedToday ? '#166534' : '#92400e'};margin-top:2px;">${presence?.qrVerifiedToday ? 'Yes' : 'No'}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Tutorial Group</div>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:2px;">${_esc(student.tutorialGroup || 'Unassigned')}</div>
        </div>
      </div>
    </div>`;
}

// ── 2. Attendance Timeline (last 14 days) ────
function _renderAttendanceTimeline(student) {
  const byDate = student.attendanceData?.byDate || student.state?.attendance?.byDate || {};
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dk = _dateKey(d);
    const day = byDate[dk] || null;
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    last14.push({
      dateKey: dk,
      day: dayName,
      present: Boolean(day?.present),
      totalMin: Math.max(0, Math.round((day?.totalSeconds || 0) / 60)),
      classMin: Math.max(0, Math.round((day?.classSeconds || 0) / 60)),
      tutorialMin: Math.max(0, Math.round((day?.tutorialSeconds || 0) / 60)),
      qrCount: Array.isArray(day?.qrCheckins) ? day.qrCheckins.length : 0,
    });
  }

  const presentDays = last14.filter((d) => d.present).length;
  const totalMinutes = last14.reduce((s, d) => s + d.totalMin, 0);
  const maxMin = Math.max(1, ...last14.map((d) => d.totalMin));

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">📅 Attendance Timeline (Last 14 Days)</h3>
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="padding:8px 14px;border-radius:8px;background:#ecfdf5;border:1px solid #bbf7d0;font-size:12px;">
          Present: <strong style="color:#166534;">${presentDays}/14 days</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;font-size:12px;">
          Total time: <strong style="color:#0369a1;">${_fmtMinutes(totalMinutes * 60)}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#fefce8;border:1px solid #fde68a;font-size:12px;">
          Avg/day: <strong style="color:#92400e;">${presentDays ? Math.round(totalMinutes / presentDays) : 0} min</strong> (on present days)
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;align-items:end;height:80px;margin-bottom:4px;">
        ${last14.map((d) => {
    const h = d.totalMin > 0 ? Math.max(8, Math.round((d.totalMin / maxMin) * 100)) : 4;
    const bg = d.present ? (d.qrCount > 0 ? '#059669' : '#60a5fa') : '#e2e8f0';
    return `<div title="${d.dateKey} (${d.day}) — ${d.totalMin} min total, ${d.classMin} min class, ${d.tutorialMin} min tutorial, ${d.qrCount} QR check-ins" style="height:${h}%;background:${bg};border-radius:4px 4px 0 0;min-width:0;"></div>`;
  }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;">
        ${last14.map((d) => `<div style="text-align:center;font-size:8px;color:var(--muted);">${d.dateKey.slice(8)}</div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--muted);">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#059669;margin-right:4px;vertical-align:middle;"></span>QR verified</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#60a5fa;margin-right:4px;vertical-align:middle;"></span>Present (no QR)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#e2e8f0;margin-right:4px;vertical-align:middle;"></span>Absent</span>
      </div>
    </div>`;
}

// ── 3. Session Duration Analysis ─────────────
function _renderSessionDurationAnalysis(student) {
  const byDate = student.attendanceData?.byDate || student.state?.attendance?.byDate || {};
  const entries = Object.entries(byDate).filter(([, v]) => v && (v.totalSeconds > 0));
  if (!entries.length) {
    return `<div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;">
      <h3 style="margin:0 0 8px 0;color:var(--navy);font-size:15px;">⏱️ Session Duration Analysis</h3>
      <p style="font-size:12px;color:var(--muted);">No session duration data recorded yet.</p>
    </div>`;
  }

  const durations = entries.map(([dk, v]) => ({
    dateKey: dk,
    total: Math.round((v.totalSeconds || 0) / 60),
    class: Math.round((v.classSeconds || 0) / 60),
    tutorial: Math.round((v.tutorialSeconds || 0) / 60),
  }));

  const totalAll = durations.reduce((s, d) => s + d.total, 0);
  const totalClass = durations.reduce((s, d) => s + d.class, 0);
  const totalTutorial = durations.reduce((s, d) => s + d.tutorial, 0);
  const avgSession = Math.round(totalAll / durations.length);
  const longestSession = Math.max(...durations.map((d) => d.total));
  const shortestSession = Math.min(...durations.map((d) => d.total));

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">⏱️ Session Duration Analysis</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
        <div style="padding:10px 12px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;">
          <div style="font-size:11px;color:#0369a1;text-transform:uppercase;">Total Time</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${_fmtMinutes(totalAll * 60)}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;">
          <div style="font-size:11px;color:#166534;text-transform:uppercase;">Class Time</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${_fmtMinutes(totalClass * 60)}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#fdf4ff;border:1px solid #e9d5ff;">
          <div style="font-size:11px;color:#7c3aed;text-transform:uppercase;">Tutorial Time</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${_fmtMinutes(totalTutorial * 60)}</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#fefce8;border:1px solid #fde68a;">
          <div style="font-size:11px;color:#92400e;text-transform:uppercase;">Avg Session</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${avgSession} min</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Longest</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${longestSession} min</div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Sessions</div>
          <div style="font-size:18px;font-weight:900;color:var(--navy);">${durations.length}</div>
        </div>
      </div>
    </div>`;
}

// ── 4. Unit Access Patterns ──────────────────
function _renderUnitAccessPatterns(student) {
  const progress = student.progressObj || {};
  const unitRows = UNITS.map((u) => {
    const p = progress[u.id] || {};
    const visited = Boolean(p.visited);
    const readingComplete = Boolean(p.readingComplete);
    const annotationCount = Array.isArray(p.annotations) ? p.annotations.length : 0;
    const readingTasks = p.readingTaskState ? Object.keys(p.readingTaskState).length : 0;
    const heutagogy = p.heutagogyCycles ? Object.keys(p.heutagogyCycles).length : 0;
    const hasSurvey = Boolean(p.readingSurvey);
    const difficulty = p.readingSurvey?.difficulty;
    return { id: u.id, badge: u.badge, title: u.title, visited, readingComplete, annotationCount, readingTasks, heutagogy, hasSurvey, difficulty };
  });

  const visitedCount = unitRows.filter((u) => u.visited).length;
  const completedCount = unitRows.filter((u) => u.readingComplete).length;

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:15px;">📚 Unit Access & Engagement</h3>
      <p style="margin:0 0 12px 0;font-size:12px;color:var(--muted);">${visitedCount} of ${UNITS.length} units visited · ${completedCount} readings completed</p>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">
              <th style="text-align:left;padding:6px;">Unit</th>
              <th style="text-align:center;padding:6px;">Visited</th>
              <th style="text-align:center;padding:6px;">Reading</th>
              <th style="text-align:center;padding:6px;">Notes</th>
              <th style="text-align:center;padding:6px;">Tasks</th>
              <th style="text-align:center;padding:6px;">Heutagogy</th>
              <th style="text-align:center;padding:6px;">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            ${unitRows.map((u) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px;font-weight:700;color:var(--navy);">${_esc(u.badge)}</td>
                <td style="padding:6px;text-align:center;">${u.visited ? '✅' : '—'}</td>
                <td style="padding:6px;text-align:center;">${u.readingComplete ? '✅' : u.visited ? '🔄' : '—'}</td>
                <td style="padding:6px;text-align:center;font-weight:${u.annotationCount ? '700' : '400'};color:${u.annotationCount ? 'var(--navy)' : 'var(--muted)'};">${u.annotationCount || '—'}</td>
                <td style="padding:6px;text-align:center;">${u.readingTasks || '—'}</td>
                <td style="padding:6px;text-align:center;">${u.heutagogy || '—'}</td>
                <td style="padding:6px;text-align:center;color:${u.difficulty >= 4 ? '#991b1b' : u.difficulty >= 3 ? '#92400e' : 'var(--muted)'};">${u.difficulty != null ? `${u.difficulty}/5` : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── 5. Notebook Activity ─────────────────────
function _renderNotebookActivity(student) {
  const state = student.state || {};
  const tutorialEntries = Object.values(state.tutorialNotebook?.entries || {}).filter(_notebookEntryHasActivity);
  const contactEntries = Object.values(state.contactNotebook?.entries || {}).filter(_notebookEntryHasActivity);
  const tutorialAnalytics = state.tutorialNotebook?.analytics || {};
  const contactAnalytics = state.contactNotebook?.analytics || {};

  const tutorialWords = Number(tutorialAnalytics.totalWords || 0);
  const tutorialAttachments = Number(tutorialAnalytics.totalAttachments || 0);
  const contactWords = Number(contactAnalytics.totalWords || 0);
  const contactAttachments = Number(contactAnalytics.totalAttachments || 0);

  const latestTutorial = _sortNotebookEntries(tutorialEntries)[0];
  const latestContact = _sortNotebookEntries(contactEntries)[0];

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">📝 Notebook Activity</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div style="padding:14px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
          <div style="font-size:13px;font-weight:800;color:#166534;margin-bottom:8px;">Tutorial Notebook</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--navy);">
            <div>Entries: <strong>${tutorialEntries.length}</strong></div>
            <div>Words: <strong>${tutorialWords.toLocaleString()}</strong></div>
            <div>Uploads: <strong>${tutorialAttachments}</strong></div>
            <div>Latest: <strong style="font-size:11px;">${latestTutorial ? _fmtDate(_notebookUpdatedAt(latestTutorial)) : '—'}</strong></div>
          </div>
        </div>
        <div style="padding:14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
          <div style="font-size:13px;font-weight:800;color:#1d4ed8;margin-bottom:8px;">Contact Notebook</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--navy);">
            <div>Entries: <strong>${contactEntries.length}</strong></div>
            <div>Words: <strong>${contactWords.toLocaleString()}</strong></div>
            <div>Uploads: <strong>${contactAttachments}</strong></div>
            <div>Latest: <strong style="font-size:11px;">${latestContact ? _fmtDate(_notebookUpdatedAt(latestContact)) : '—'}</strong></div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:14px;">
        ${_renderNotebookEntryList('Tutorial Notebook Entries', tutorialEntries, '#166534', '#f0fdf4', '#bbf7d0')}
        ${_renderNotebookEntryList('Contact Notebook Entries', contactEntries, '#1d4ed8', '#eff6ff', '#bfdbfe')}
      </div>
    </div>`;
}

function _notebookUpdatedAt(entry = {}) {
  return entry.updatedAt || entry.createdAt || entry.aiFeedbackAt || '';
}

function _notebookText(entry = {}) {
  return `${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`.trim();
}

function _notebookWordCount(entry = {}) {
  return _notebookText(entry).split(/\s+/).filter(Boolean).length;
}

function _notebookEntryHasActivity(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return Boolean(
    _notebookText(entry)
    || String(entry.aiFeedback || '').trim()
    || (Array.isArray(entry.attachments) && entry.attachments.length)
  );
}

function _notebookDateMs(entry = {}) {
  const ts = Date.parse(_notebookUpdatedAt(entry));
  return Number.isFinite(ts) ? ts : 0;
}

function _sortNotebookEntries(entries = []) {
  return [...entries].sort((a, b) => _notebookDateMs(b) - _notebookDateMs(a));
}

function _renderNotebookEntryList(title, entries, accent, bg, border) {
  const sorted = _sortNotebookEntries(entries);
  if (!sorted.length) {
    return `
      <div style="padding:14px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);">
        <div style="font-size:13px;font-weight:800;color:var(--navy);">${_esc(title)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px;">No notebook entries with saved work yet.</div>
      </div>
    `;
  }

  return `
    <details style="border:1px solid ${border};border-radius:12px;background:${bg};overflow:hidden;">
      <summary style="cursor:pointer;list-style:none;padding:12px 14px;font-size:13px;font-weight:900;color:${accent};display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <span>${_esc(title)}</span>
        <span style="font-size:11px;color:var(--muted);font-weight:800;">${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'}</span>
      </summary>
      <div style="display:grid;gap:10px;padding:0 12px 12px 12px;max-height:520px;overflow:auto;">
        ${sorted.map((entry, idx) => _renderNotebookEntry(entry, idx, accent)).join('')}
      </div>
    </details>
  `;
}

function _renderNotebookEntry(entry = {}, idx = 0, accent = 'var(--navy)') {
  const title = entry.sessionTitle || entry.title || entry.sessionId || `Entry ${idx + 1}`;
  const unit = entry.unitId ? String(entry.unitId).toUpperCase() : '';
  const words = _notebookWordCount(entry);
  const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
  const updated = _notebookUpdatedAt(entry);

  return `
    <details style="background:white;border:1px solid var(--border);border-radius:10px;overflow:hidden;">
      <summary style="cursor:pointer;padding:10px 12px;list-style:none;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:900;color:var(--navy);">${_esc(title)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${unit ? `${_esc(unit)} · ` : ''}${_fmtDate(updated)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            <span style="font-size:10px;font-weight:800;color:${accent};background:${accent}14;border:1px solid ${accent}33;border-radius:999px;padding:3px 8px;">${words} words</span>
            <span style="font-size:10px;font-weight:800;color:var(--navy);background:#f8fafc;border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;">${attachments.length} upload${attachments.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </summary>
      <div style="border-top:1px solid #f1f5f9;padding:10px 12px;display:grid;gap:10px;">
        ${_renderNotebookTextBlock('Student Response', entry.response)}
        ${_renderNotebookTextBlock('Notes & Evidence', entry.notes)}
        ${_renderNotebookTextBlock('Search Log & Sources', entry.searchLog)}
        ${_renderNotebookTextBlock('AI Writing Feedback', entry.aiFeedback)}
        ${_renderNotebookAttachments(attachments)}
      </div>
    </details>
  `;
}

function _renderNotebookTextBlock(label, text = '') {
  const value = String(text || '').trim();
  if (!value) return '';
  return `
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:900;margin-bottom:4px;">${_esc(label)}</div>
      <div style="font-size:12px;color:#334155;line-height:1.65;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;max-height:220px;overflow:auto;">${_esc(value)}</div>
    </div>
  `;
}

function _renderNotebookAttachments(attachments = []) {
  if (!attachments.length) return '';
  return `
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:900;margin-bottom:4px;">Attachments</div>
      <div style="display:grid;gap:6px;">
        ${attachments.map((asset) => {
    const url = _safeNotebookUrl(asset?.url || '');
    const name = asset?.name || asset?.provider || 'Attachment';
    const meta = [asset?.type, asset?.size ? _fmtBytes(asset.size) : ''].filter(Boolean).join(' · ');
    return `
          <a href="${_esc(url)}" target="_blank" rel="noopener" style="display:flex;justify-content:space-between;gap:10px;align-items:center;text-decoration:none;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:var(--navy);font-size:12px;">
            <span style="font-weight:800;overflow-wrap:anywhere;">${_esc(name)}</span>
            <span style="font-size:10px;color:var(--muted);white-space:nowrap;">${_esc(meta || 'Open')}</span>
          </a>
        `;
  }).join('')}
      </div>
    </div>
  `;
}

function _safeNotebookUrl(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return '#';
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://example.invalid/';
    const url = new URL(text, base);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch { /* ignore malformed attachment URL */ }
  return '#';
}

function _fmtBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ── 6. Gallery Contributions ─────────────────
function _renderGalleryContributions(uid, gallerySnap) {
  const posts = gallerySnap.exists()
    ? Object.values(gallerySnap.val() || {}).filter((p) => p && !p.removed && p.authorUid === uid)
    : [];
  posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const totalReactions = posts.reduce((s, p) => {
    const r = p.reactions || {};
    return s + Object.values(r).reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  const totalComments = posts.reduce((s, p) => Object.keys(p.comments || {}).length + s, 0);
  const assessedCount = posts.filter((p) => p.staffAssessment).length;

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">🖼️ Gallery Contributions</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <div style="padding:8px 14px;border-radius:8px;background:#fdf4ff;border:1px solid #e9d5ff;font-size:12px;">
          Posts: <strong style="color:#7c3aed;">${posts.length}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;font-size:12px;">
          Reactions received: <strong style="color:#c2410c;">${totalReactions}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;font-size:12px;">
          Comments received: <strong style="color:#0369a1;">${totalComments}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#ecfdf5;border:1px solid #bbf7d0;font-size:12px;">
          Staff assessed: <strong style="color:#166534;">${assessedCount}</strong>
        </div>
      </div>
      ${posts.length ? `
        <div style="display:grid;gap:8px;max-height:240px;overflow-y:auto;">
          ${posts.slice(0, 8).map((p) => `
            <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;">
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--navy);">${_esc(p.title || 'Untitled')}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(p.category || 'general')} · ${_fmtDate(p.createdAt)}${p.pinned ? ' · Pinned' : ''}</div>
                </div>
                ${p.staffAssessment ? '<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;">Assessed</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${posts.length > 8 ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Showing 8 of ${posts.length} posts.</div>` : ''}
      ` : '<div style="font-size:12px;color:var(--muted);">No gallery posts submitted yet.</div>'}
    </div>`;
}

// ── 7. Collaboration Group Contributions ─────
function _renderCollaborationContributions(uid, collabSnap) {
  if (!collabSnap.exists()) {
    return `<div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;">
      <h3 style="margin:0 0 8px 0;color:var(--navy);font-size:15px;">👥 Collaboration Groups</h3>
      <p style="font-size:12px;color:var(--muted);">No collaboration data available.</p>
    </div>`;
  }

  const scopes = collabSnap.val() || {};
  const memberships = [];

  for (const [scopeId, scope] of Object.entries(scopes)) {
    const groups = scope?.groups || {};
    for (const [groupId, group] of Object.entries(groups)) {
      if (group?.members?.[uid]) {
        const memberData = group.members[uid];
        const artefacts = group.artefacts ? Object.values(group.artefacts).filter((a) => a?.uploadedByUid === uid || a?.createdBy === uid) : [];
        memberships.push({
          scopeId,
          scopeLabel: scope?.meta?.label || scopeId,
          groupName: group.name || groupId,
          joinedAt: memberData.joinedAt,
          memberCount: Object.keys(group.members || {}).length,
          artefactCount: artefacts.length,
          totalGroupArtefacts: group.artefacts ? Object.keys(group.artefacts).length : 0,
        });
      }
    }
  }

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">👥 Collaboration Groups</h3>
      ${memberships.length ? `
        <div style="display:grid;gap:10px;">
          ${memberships.map((m) => `
            <div style="padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:#f8fafc;">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
                <div>
                  <div style="font-size:13px;font-weight:800;color:var(--navy);">${_esc(m.groupName)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(m.scopeLabel)} · ${m.memberCount} members · Joined ${_fmtDate(m.joinedAt)}</div>
                </div>
                <div style="display:flex;gap:8px;">
                  <span style="font-size:11px;padding:4px 10px;border-radius:8px;background:#fdf4ff;border:1px solid #e9d5ff;color:#7c3aed;font-weight:700;">My uploads: ${m.artefactCount}</span>
                  <span style="font-size:11px;padding:4px 10px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-weight:700;">Group total: ${m.totalGroupArtefacts}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="font-size:12px;color:var(--muted);">Not a member of any collaboration groups yet.</div>'}
    </div>`;
}

// ── 8. Assessment Submissions ────────────────
function _renderAssessmentSubmissions(uid, submissionIndexSnap) {
  const assessmentList = _getAssessmentList();
  const index = submissionIndexSnap.exists() ? submissionIndexSnap.val() : {};

  const totalSubmitted = Object.keys(index).length;
  const totalAssessments = assessmentList.length;

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">📤 Assessment File Submissions</h3>
      <div style="margin-bottom:12px;font-size:12px;color:var(--muted);">${totalSubmitted} of ${totalAssessments} assessments submitted.</div>
      <div style="display:grid;gap:8px;">
        ${assessmentList.map((a) => {
    const sub = index[a.id];
    const hasSubmission = Boolean(sub?.latestAt);
    return `
            <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;gap:10px;">
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="font-size:18px;">${a.icon}</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:var(--navy);">${_esc(a.badge)}</div>
                  <div style="font-size:11px;color:var(--muted);">${_esc(a.title)}</div>
                </div>
              </div>
              <div style="text-align:right;">
                ${hasSubmission
      ? `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;">v${sub.totalVersions || 1}</span>
                         <div style="font-size:10px;color:var(--muted);margin-top:2px;">${_fmtDate(sub.latestAt)}</div>`
      : `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;">Not submitted</span>`}
              </div>
            </div>`;
  }).join('')}
      </div>
    </div>`;
}

// ── 9. Chat Activity ─────────────────────────
function _renderChatActivity(uid, chatRoomsSnap) {
  const rooms = chatRoomsSnap.exists() ? chatRoomsSnap.val() : {};
  const roomCount = Object.keys(rooms).length;
  const totalUnread = Object.values(rooms).reduce((s, r) => s + (Number(r?.unreadCount) || 0), 0);
  const latestMessage = Object.values(rooms)
    .map((r) => r?.lastMessageAt)
    .filter(Boolean)
    .sort()
    .pop();

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 6px 18px rgba(15,23,42,.04);">
      <h3 style="margin:0 0 12px 0;color:var(--navy);font-size:15px;">💬 Chat Activity</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="padding:8px 14px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;font-size:12px;">
          Chat rooms: <strong style="color:#0369a1;">${roomCount}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#fefce8;border:1px solid #fde68a;font-size:12px;">
          Unread: <strong style="color:#92400e;">${totalUnread}</strong>
        </div>
        <div style="padding:8px 14px;border-radius:8px;background:#f8fafc;border:1px solid var(--border);font-size:12px;">
          Last message: <strong style="color:var(--navy);">${_fmtDate(latestMessage)}</strong>
        </div>
      </div>
    </div>`;
}

// ── 10. Productivity Score ───────────────────
function _renderProductivityScore(student, gallerySnap, submissionIndexSnap) {
  const progress = student.progressObj || {};
  const visitedCount = Object.values(progress).filter((p) => p?.visited).length;
  const readingCount = Object.values(progress).filter((p) => p?.readingComplete).length;
  const totalAnnotations = student.totalAnnotations || 0;
  const heutagogy = student.heutagogy || { total: 0, approved: 0 };
  const readingTasks = student.readingTaskSubmissionCount || 0;
  const galleryPosts = gallerySnap.exists()
    ? Object.values(gallerySnap.val() || {}).filter((p) => p && !p.removed && p.authorUid === student.uid).length
    : 0;
  const submissions = submissionIndexSnap.exists() ? Object.keys(submissionIndexSnap.val() || {}).length : 0;

  // Simple productivity composite: weight key actions
  const score = Math.min(100, Math.round(
    (visitedCount / Math.max(1, UNITS.length)) * 15 +
    (readingCount / Math.max(1, UNITS.length)) * 20 +
    Math.min(totalAnnotations, 20) * 0.75 +
    Math.min(readingTasks, 10) * 2 +
    Math.min(heutagogy.total, 5) * 3 +
    Math.min(galleryPosts, 5) * 2 +
    Math.min(submissions, 6) * 2.5
  ));

  const scoreColor = score >= 70 ? '#166534' : score >= 40 ? '#92400e' : '#991b1b';
  const scoreBg = score >= 70 ? '#ecfdf5' : score >= 40 ? '#fffbeb' : '#fee2e2';
  const scoreLabel = score >= 70 ? 'High' : score >= 40 ? 'Moderate' : 'Low';

  const erMarks = student.erMarks || 0;
  const erReadings = student.state?.erProgress?.completedReadings?.length || 0;

  return `
    <div style="background:linear-gradient(135deg,#10213a,#1e3a5f);border-radius:14px;padding:24px;margin-bottom:18px;color:white;box-shadow:0 8px 24px rgba(15,23,42,.15);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 4px 0;color:white;font-size:15px;">Productivity Composite</h3>
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,.65);">Weighted score across visits, reading, writing, collaboration, and submissions.</p>
        </div>
        <div style="text-align:center;">
          <div style="font-size:36px;font-weight:900;color:white;">${score}<span style="font-size:16px;opacity:.6;">/100</span></div>
          <div style="padding:4px 12px;border-radius:8px;background:${scoreBg};color:${scoreColor};font-size:11px;font-weight:700;margin-top:4px;">${scoreLabel} Productivity</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:16px;">
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Units visited</div>
          <div style="font-size:16px;font-weight:900;">${visitedCount}/${UNITS.length}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Readings done</div>
          <div style="font-size:16px;font-weight:900;">${readingCount}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Annotations</div>
          <div style="font-size:16px;font-weight:900;">${totalAnnotations}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Reading tasks</div>
          <div style="font-size:16px;font-weight:900;">${readingTasks}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Heutagogy</div>
          <div style="font-size:16px;font-weight:900;">${heutagogy.total} (${heutagogy.approved} approved)</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Gallery posts</div>
          <div style="font-size:16px;font-weight:900;">${galleryPosts}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Submissions</div>
          <div style="font-size:16px;font-weight:900;">${submissions}/6</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;">
          <div style="font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;">Extra reading</div>
          <div style="font-size:16px;font-weight:900;">${erReadings} (+${erMarks} marks)</div>
        </div>
      </div>
    </div>`;
}

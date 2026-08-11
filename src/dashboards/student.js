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
      if (statusEl) statusEl.textContent = `✅ Attendance confirmed for ${result.sessionLabel || _attendanceSessionLabel(result.sessionType)}.`;
      await _finalizeAttendanceCheckin(result, result.token || token, 'student-attendance-manual');
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
      return {
        ok: true,
        sessionType,
        sessionLabel: _attendanceSessionLabel(sessionType),
        sessionId: String(match.sessionId || ''),
        token: normalizedToken,
        message: 'Attendance confirmed.',
      };
    }

    return { ok: false, token: normalizedToken, message: 'Invalid or expired code. Please try scanning the latest QR code.' };
  } catch (err) {
    console.error('Error in verifyAttendanceQrPayload:', err);
    return { ok: false, message: 'Verification error.' };
  }
};

// src/dashboards/student.js
import { STATE, recordOutcome, markPresent } from '../state.js';
import { getReviewQueue, describeDue, SKILL_MODULE_MAP } from '../spaced-review.js';
import { db, functions } from '../firebase.js';
import { ref, get, onValue, set } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { UNITS } from '../../content/units/index.js';
import { DASHBOARD_CONTENT } from '../../content/dashboard.js';
import { getCoordinatorRecommendation } from '../ai.js';
import { getPinnedGalleryPosts } from '../gallery.js';
import { writeAttendanceCheckinEvent } from '../analytics.js';
import { getAppSurface, setAppSurfaceRoute } from '../platform.js';
import { renderChallengeArena } from '../components/challenge-arena.js';
import { isOpenByDefault } from '../unit-access.js';

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

function _attendanceDateKeyValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _attendanceSessionLabel(sessionType = 'class') {
  return sessionType === 'tutorial' ? 'tutorial session' : 'contact session';
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

function _attendanceRecordForDate(dateKey) {
  STATE.attendance = STATE.attendance && typeof STATE.attendance === 'object'
    ? STATE.attendance
    : { byDate: {} };
  STATE.attendance.byDate = STATE.attendance.byDate || {};

  const record = STATE.attendance.byDate[dateKey] || {
    present: false,
    firstSeen: null,
    lastSeen: null,
    totalSeconds: 0,
    classSeconds: 0,
    tutorialSeconds: 0,
    lastSessionType: 'class',
    qrCheckins: [],
  };
  record.qrCheckins = Array.isArray(record.qrCheckins) ? record.qrCheckins : [];
  return record;
}

async function _finalizeAttendanceCheckin(result, token, source = 'student-attendance-qr') {
  const sessionType = result?.sessionType === 'tutorial' ? 'tutorial' : 'class';
  const sessionLabel = result?.sessionLabel || _attendanceSessionLabel(sessionType);
  const normalizedToken = _extractAttendanceToken(result?.token || token);
  const nowIso = new Date().toISOString();
  const dateKey = _attendanceDateKeyValue(nowIso);
  const record = _attendanceRecordForDate(dateKey);
  const duplicateIndex = record.qrCheckins.findIndex((row) =>
    String(row?.sessionId || '') === String(result?.sessionId || '')
    && String(row?.sessionType || '') === sessionType
    && String(row?.token || '') === normalizedToken
  );
  const checkin = {
    at: nowIso,
    token: normalizedToken,
    sessionType,
    sessionLabel,
    sessionId: String(result?.sessionId || ''),
    source,
  };

  record.present = true;
  record.firstSeen = record.firstSeen || nowIso;
  record.lastSeen = nowIso;
  record.lastSessionType = sessionType;
  if (duplicateIndex >= 0) {
    record.qrCheckins[duplicateIndex] = {
      ...record.qrCheckins[duplicateIndex],
      ...checkin,
    };
  } else {
    record.qrCheckins.push(checkin);
  }
  STATE.attendance.byDate[dateKey] = record;

  try {
    await writeAttendanceCheckinEvent({
      user: STATE.user || {},
      profile: _studentAnalyticsProfile(),
      sessionType,
      token: normalizedToken,
      source,
    });
  } catch (err) {
    console.error('Attendance analytics write failed:', err);
  }

  const uid = STATE.user?.uid || '';
  if (uid && duplicateIndex < 0) {
    const stamp = `${Date.now()}`;
    const remotePayload = {
      ...checkin,
      uid,
      dateKey,
    };
    try {
      await Promise.all([
        set(ref(db, `attendance/checkins/${dateKey}/${uid}/${stamp}`), remotePayload),
        result?.sessionId
          ? set(ref(db, `attendance/session-checkins/${result.sessionId}/${uid}`), remotePayload)
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Attendance remote check-in write failed:', err);
    }
  }

  try {
    if (!window.saveState) {
      const mod = await import('../state.js');
      window.saveState = mod.saveState;
    }
    await window.saveState();
  } catch (err) {
    console.error('Attendance save failed:', err);
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
      if (statusEl) statusEl.textContent = `✅ Attendance confirmed for ${result.sessionLabel || _attendanceSessionLabel(result.sessionType)}.`;
      await _finalizeAttendanceCheckin(result, result.token || token, 'student-attendance-link');
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

const REFERENCING_POLL_ID = 'referencing-management-session-2026-05-16';
const REFERENCING_POLL_CLOSE_AT = '2026-05-15T23:00:00+02:00';
const REFERENCING_POLL_CLOSE_LABEL = '23:00 tonight (Friday, 15 May 2026)';
const REFERENCING_POLL_SESSION_DATE_LABEL = 'Saturday, 16 May 2026';
const REFERENCING_POLL_MIN_VOTES = 300;
const REFERENCING_POLL_OPTIONS = [
  { id: 'slot_1300_1400', label: '13:00-14:00' },
  { id: 'slot_1400_1600', label: '14:00-16:00' },
  { id: 'slot_1830_1930', label: '18:30-19:30' },
];

let _referencingPollCallable = null;
let _referencingPollUnsub = null;
let _referencingPollLastSummary = null;

function _resolveStudentIdentity(user = STATE.user) {
  const rawName = String(user?.displayName || '').split(' [')[0].trim();
  const rawEmail = String(user?.email || '').trim();
  const name = rawName || rawEmail || 'Student';
  const firstName = name.split(/\s+/).find(Boolean) || 'Student';
  const avatar = name.charAt(0).toUpperCase() || 'S';
  return { name, firstName, avatar };
}

function _requireAppRoot() {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    throw new Error('App mount not found.');
  }
  return appRoot;
}

function _runOptionalStudentStartupTask(label, task) {
  try {
    const result = task();
    if (result && typeof result.catch === 'function') {
      result.catch((err) => {
        console.error(`${label} failed:`, err);
      });
    }
  } catch (err) {
    console.error(`${label} failed:`, err);
  }
}

function _isReferencingPollClosed() {
  const closeTime = new Date(REFERENCING_POLL_CLOSE_AT).getTime();
  return Number.isFinite(closeTime) && Date.now() >= closeTime;
}

function _normalisePollStudentNumber(value = '') {
  return String(value || '').replace(/\D/g, '').trim();
}

function _renderReferencingPollControls() {
  const disabled = _isReferencingPollClosed() ? 'disabled' : '';
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:14px;">
      ${REFERENCING_POLL_OPTIONS.map((option, index) => `
        <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid rgba(15,23,42,.12);border-radius:12px;background:white;cursor:${disabled ? 'not-allowed' : 'pointer'};">
          <input data-referencing-poll-input type="radio" name="referencing-poll-timeslot" value="${_escHtml(option.id)}" ${index === 0 ? 'checked' : ''} ${disabled} />
          <span style="font-size:14px;font-weight:800;color:var(--navy);">${_escHtml(option.label)}</span>
        </label>
      `).join('')}
    </div>
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:14px;">
      <label style="flex:1;min-width:220px;">
        <span style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;">Student number</span>
        <input
          id="referencing-poll-student-number"
          data-referencing-poll-input
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder="Enter your student number"
          ${disabled}
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:14px;background:white;"
        />
      </label>
      <button
        type="button"
        id="referencing-poll-submit"
        data-referencing-poll-input
        class="btn-primary"
        onclick="window.submitReferencingPollVote()"
        ${disabled}
        style="padding:11px 16px;min-height:42px;"
      >Submit vote</button>
    </div>
    <div id="referencing-poll-status" style="min-height:18px;font-size:12px;color:var(--muted);margin-top:8px;"></div>
  `;
}

function _renderReferencingPollCard({ android = false } = {}) {
  const closed = _isReferencingPollClosed();
  const statusLabel = closed ? 'Poll closed' : 'Poll open';
  const wrapperClass = android ? 'android-panel' : '';
  const wrapperStyle = android
    ? ''
    : 'background:#f8fafc;border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.05);';
  const inner = `
    <div id="referencing-poll-card" class="${wrapperClass}" style="${wrapperStyle}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div style="max-width:760px;">
          <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:999px;background:${closed ? '#fee2e2' : '#ecfdf5'};color:${closed ? '#991b1b' : '#047857'};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${statusLabel}</div>
          <h2 style="margin:10px 0 8px 0;color:var(--navy);font-size:22px;line-height:1.25;">Referencing management applications session</h2>
          <p style="margin:0;color:var(--muted);font-size:14px;line-height:1.65;">
            A practical session on using referencing management applications is planned for ${REFERENCING_POLL_SESSION_DATE_LABEL}. Vote for the time that works best for you. The poll closes at ${REFERENCING_POLL_CLOSE_LABEL}; the timeslot with the most votes will determine when the session is held.
          </p>
          <p style="margin:8px 0 0 0;color:#92400e;font-size:13px;line-height:1.6;">
            If fewer than ${REFERENCING_POLL_MIN_VOTES} students vote, the session will not take place tomorrow and will instead move to class time next week.
          </p>
        </div>
        <div style="min-width:170px;padding:12px;border:1px solid rgba(15,23,42,.1);border-radius:12px;background:white;">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Turnout needed</div>
          <div style="font-size:26px;font-weight:900;color:var(--navy);line-height:1;margin-top:6px;">${REFERENCING_POLL_MIN_VOTES}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">minimum votes</div>
        </div>
      </div>
      ${_renderReferencingPollControls()}
      <div id="referencing-poll-results" style="margin-top:14px;"></div>
    </div>
  `;

  if (android) return inner;
  return `<section class="dash-section" style="margin-top:18px;">${inner}</section>`;
}

function _setReferencingPollStatus(message, tone = 'muted') {
  const statusEl = document.getElementById('referencing-poll-status');
  if (!statusEl) return;
  const colors = {
    muted: 'var(--muted)',
    good: '#047857',
    warn: '#92400e',
    error: '#b91c1c',
  };
  statusEl.style.color = colors[tone] || colors.muted;
  statusEl.textContent = message;
}

function _setReferencingPollBusy(isBusy) {
  const submit = document.getElementById('referencing-poll-submit');
  if (!submit) return;
  submit.disabled = Boolean(isBusy) || _isReferencingPollClosed();
  submit.textContent = isBusy ? 'Submitting...' : 'Submit vote';
}

function _refreshReferencingPollClosedState() {
  const closed = _isReferencingPollClosed();
  document.querySelectorAll('[data-referencing-poll-input]').forEach((el) => {
    el.disabled = closed;
  });
  if (closed) {
    _setReferencingPollStatus(`This poll closed at ${REFERENCING_POLL_CLOSE_LABEL}.`, 'warn');
  }
}

function _renderReferencingPollLoadingState() {
  const resultsEl = document.getElementById('referencing-poll-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:white;">Loading poll totals...</div>';
}

function _renderReferencingPollSummary(summary = {}, options = {}) {
  const resultsEl = document.getElementById('referencing-poll-results');
  if (!resultsEl) return;
  const remember = options.remember !== false;
  const rawCounts = summary?.counts || {};
  const counts = Object.fromEntries(
    REFERENCING_POLL_OPTIONS.map((option) => [option.id, Math.max(0, Number(rawCounts[option.id] || 0))])
  );
  const computedTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const total = Number.isFinite(Number(summary?.totalVotes)) ? Number(summary.totalVotes) : computedTotal;
  if (remember) {
    _referencingPollLastSummary = {
      ...summary,
      counts,
      totalVotes: total,
    };
  }
  const maxCount = Math.max(1, ...Object.values(counts));
  const leading = REFERENCING_POLL_OPTIONS
    .map((option) => ({ ...option, count: counts[option.id] || 0 }))
    .sort((a, b) => b.count - a.count)[0];
  const remaining = Math.max(REFERENCING_POLL_MIN_VOTES - total, 0);
  const thresholdPct = Math.min(100, Math.round((total / REFERENCING_POLL_MIN_VOTES) * 100));
  const thresholdMessage = remaining
    ? `${remaining} more vote${remaining === 1 ? '' : 's'} needed for the session to go ahead tomorrow.`
    : 'The minimum turnout has been reached; the leading timeslot will determine the session time.';

  resultsEl.innerHTML = `
    <div style="padding:12px;border:1px solid rgba(15,23,42,.1);border-radius:12px;background:white;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Live poll status</div>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:3px;">${total} vote${total === 1 ? '' : 's'} received${leading?.count ? ` · Leading: ${_escHtml(leading.label)}` : ''}</div>
        </div>
        <div style="font-size:12px;color:${remaining ? '#92400e' : '#047857'};font-weight:700;">${_escHtml(thresholdMessage)}</div>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:12px;">
        <div style="height:100%;width:${thresholdPct}%;background:${remaining ? '#f59e0b' : '#10b981'};"></div>
      </div>
      <div style="display:grid;gap:8px;">
        ${REFERENCING_POLL_OPTIONS.map((option) => {
          const count = counts[option.id] || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const barPct = count ? Math.max(8, Math.round((count / maxCount) * 100)) : 0;
          return `
            <div style="display:grid;gap:5px;">
              <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--navy);font-weight:700;">
                <span>${_escHtml(option.label)}</span>
                <span>${count} vote${count === 1 ? '' : 's'}${total ? ` · ${pct}%` : ''}</span>
              </div>
              <div style="height:7px;background:#eef2f7;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${barPct}%;background:#0d9488;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  _refreshReferencingPollClosedState();
}

function _watchReferencingPollSummary() {
  if (_referencingPollUnsub) {
    _referencingPollUnsub();
    _referencingPollUnsub = null;
  }
  if (!document.getElementById('referencing-poll-card')) return;
  if (_referencingPollLastSummary) {
    _renderReferencingPollSummary(_referencingPollLastSummary, { remember: false });
  } else {
    _renderReferencingPollLoadingState();
  }
  _referencingPollUnsub = onValue(
    ref(db, `temporaryPolls/${REFERENCING_POLL_ID}/summary`),
    (snap) => {
      if (snap.exists()) {
        _renderReferencingPollSummary(snap.val() || {});
      } else {
        _renderReferencingPollSummary({}, { remember: false });
      }
    },
    () => {
      if (_referencingPollLastSummary) {
        _renderReferencingPollSummary(_referencingPollLastSummary, { remember: false });
        _setReferencingPollStatus('Showing the last loaded poll totals. Live totals could not refresh.', 'warn');
      } else {
        const resultsEl = document.getElementById('referencing-poll-results');
        if (resultsEl) {
          resultsEl.innerHTML = '<div style="font-size:12px;color:#92400e;padding:10px 12px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;">Poll totals could not be loaded in this view. Ask the lecturer to confirm that database rules have been deployed.</div>';
        }
      }
    }
  );
}

function _initReferencingPoll() {
  const card = document.getElementById('referencing-poll-card');
  if (!card) {
    if (_referencingPollUnsub) {
      _referencingPollUnsub();
      _referencingPollUnsub = null;
    }
    return;
  }

  window.submitReferencingPollVote = async () => {
    if (_isReferencingPollClosed()) {
      _refreshReferencingPollClosedState();
      return;
    }

    const studentNumberInput = document.getElementById('referencing-poll-student-number');
    const studentNumber = _normalisePollStudentNumber(studentNumberInput?.value || '');
    const selected = document.querySelector('input[name="referencing-poll-timeslot"]:checked');
    const option = String(selected?.value || '').trim();

    if (studentNumberInput) studentNumberInput.value = studentNumber;
    if (!/^\d{6,12}$/.test(studentNumber)) {
      _setReferencingPollStatus('Enter a valid student number before voting.', 'error');
      studentNumberInput?.focus();
      return;
    }
    if (!REFERENCING_POLL_OPTIONS.some((row) => row.id === option)) {
      _setReferencingPollStatus('Select a timeslot before voting.', 'error');
      return;
    }

    _setReferencingPollBusy(true);
    _setReferencingPollStatus('Submitting your vote...', 'muted');
    try {
      if (!_referencingPollCallable) {
        _referencingPollCallable = httpsCallable(functions, 'castTemporaryPollVote');
      }
      const result = await _referencingPollCallable({
        pollId: REFERENCING_POLL_ID,
        studentNumber,
        option,
      });
      _renderReferencingPollSummary(result?.data?.summary || {});
      _setReferencingPollStatus('Your vote has been recorded. Only one vote is allowed per student number.', 'good');
    } catch (err) {
      const code = String(err?.code || '').toLowerCase();
      if (code.includes('already-exists')) {
        _setReferencingPollStatus('A vote for this student number has already been recorded.', 'warn');
      } else if (code.includes('failed-precondition')) {
        _refreshReferencingPollClosedState();
      } else if (code.includes('unauthenticated')) {
        _setReferencingPollStatus('Please sign in before voting.', 'error');
      } else {
        _setReferencingPollStatus('Could not submit the vote right now. Please try again.', 'error');
        console.error('Referencing poll vote failed:', err);
      }
    } finally {
      _setReferencingPollBusy(false);
    }
  };

  _watchReferencingPollSummary();
  _refreshReferencingPollClosedState();
  if (window._referencingPollCloseTimer) clearTimeout(window._referencingPollCloseTimer);
  const delay = new Date(REFERENCING_POLL_CLOSE_AT).getTime() - Date.now();
  if (delay > 0 && delay < 2147483647) {
    window._referencingPollCloseTimer = window.setTimeout(_refreshReferencingPollClosedState, delay + 1000);
  }
}

// ── Main render ───────────────────────────────
export function renderStudentDashboard() {
  const user = STATE.user;
  const { name, firstName, avatar } = _resolveStudentIdentity(user);
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
    _runOptionalStudentStartupTask('Student recommendation load', () => _loadRecommendation());
    _runOptionalStudentStartupTask('Student cohort context load', () => _loadCohortContext());
    _runOptionalStudentStartupTask('Student featured gallery load', () => _loadFeaturedGalleryStrip());
    _runOptionalStudentStartupTask('Student tutor-group announcement load', () => _loadTutorGroupAnnouncement(studentVm.profile));
    _runOptionalStudentStartupTask('Student live session watch', () => _watchLiveSessions());
    _runOptionalStudentStartupTask('Student announcement rotator init', () => _initAnnouncementRotator());
    _runOptionalStudentStartupTask('Student referencing poll init', () => _initReferencingPoll());
    _runOptionalStudentStartupTask('Student attendance scanner init', () => _initAttendanceQrScanner());
    _runOptionalStudentStartupTask('Student attendance QR link handling', () => _consumeAttendanceQrLink());
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

  const appRoot = _requireAppRoot();
  appRoot.style.display = 'block';
  appRoot.style.height = 'auto';
  appRoot.style.minHeight = '100vh';

  appRoot.innerHTML = `
    <div class="student-dash anim-fade">

      <div class="student-dash-topbar">
        <div class="student-dash-logo">ACADLIT · AI</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="${tutorialBtnClass}" style="${tutorialBtnStyle}" onclick="window.goToTutorialSection()">${tutorialCheckedIn ? '<span class="tutorial-live-dot" aria-hidden="true"></span>Tutorial Active' : '📝 Tutorial'}</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="window.goToContactNotebook()">🗒️ Contact Notebook</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="window.goToGallery()">🖼 Gallery</button>
          <button class="btn-prev" style="display:inline-flex;background:#059669;border-color:#059669;color:white;" onclick="window.goToSubmissions()">📤 Submissions</button>
        </div>
        ${showReturnToDashboard ? '<button onclick="window.switchToLecturerView()" style="background:var(--navy);color:white;border:none;padding:10px 18px;border-radius:20px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;">← Lecturer Dashboard</button>' : ''}
        <div class="user-pill">
          <div class="user-avatar">${avatar}</div>
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

        ${_renderReferencingPollCard()}

        <!-- Live session card — shows when a Teams session is active -->
        <div id="live-session-card" style="display:none;"></div>

        <!-- Recommendation card — loads async -->
        <div id="rec-card" class="rec-card rec-card--loading">
          <div class="rec-loading-row">
            <div class="rec-spinner"></div>
            <span>Personalising your learning path…</span>
          </div>
        </div>

        ${_renderDailySharpener(adaptive)}

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
            <button class="dash-card" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);border:none;" onclick="window.goToSubmissions()">
              <div class="dash-card-body">
                <div style="font-size:12px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">Assessments</div>
                <h3 style="margin:8px 0 6px 0;color:white;">📤 Submit Assessment Tasks</h3>
                <p style="font-size:13px;color:rgba(255,255,255,.85);line-height:1.6;margin:0;">Upload your assessment files safely. All submissions are versioned and backed up.</p>
              </div>
            </button>
            <button class="dash-card" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);border:none;" onclick="window.goToChallengeArena()">
              <div class="dash-card-body">
                <div style="font-size:12px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;">Advanced</div>
                <h3 style="margin:8px 0 6px 0;color:white;">🏟️ Challenge Arena</h3>
                <p style="font-size:13px;color:rgba(255,255,255,.85);line-height:1.6;margin:0;">Skill-mapped games with XP scoring. Push yourself beyond the curriculum.</p>
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
                <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);">
                  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div>
                      <div style="font-weight:800;color:#065f46;">Submit Assessment Tasks</div>
                      <div style="font-size:12px;color:#047857;margin-top:4px;">Upload assessment files (PDF, DOCX, etc). All submissions are versioned and safely backed up.</div>
                    </div>
                    <button class="btn-prev" style="display:inline-flex;background:#059669;border-color:#059669;color:white;" onclick="window.goToSubmissions()">Upload</button>
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
  _runOptionalStudentStartupTask('Student recommendation load', () => _loadRecommendation());
  _runOptionalStudentStartupTask('Student cohort context load', () => _loadCohortContext());
  _runOptionalStudentStartupTask('Student featured gallery load', () => _loadFeaturedGalleryStrip());
  _runOptionalStudentStartupTask('Student tutor-group announcement load', () => _loadTutorGroupAnnouncement(studentVm.profile));
  _runOptionalStudentStartupTask('Student live session watch', () => _watchLiveSessions());
  _runOptionalStudentStartupTask('Student announcement rotator init', () => _initAnnouncementRotator());
  _runOptionalStudentStartupTask('Student referencing poll init', () => _initReferencingPoll());
  _runOptionalStudentStartupTask('Student attendance scanner init', () => _initAttendanceQrScanner());
  _runOptionalStudentStartupTask('Student attendance QR link handling', () => _consumeAttendanceQrLink());
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

  const appRoot = _requireAppRoot();
  appRoot.style.display = 'block';
  appRoot.style.height = 'auto';
  appRoot.style.minHeight = '100dvh';

  appRoot.innerHTML = `
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
      if (i > 0 && !isOpenByDefault(UNITS, i)) {
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
          <button class="android-panel android-panel--action" onclick="window.goToSubmissions()" style="background:linear-gradient(135deg,#059669,#34d399);color:white;">
            <span class="android-panel-icon">📤</span>
            <strong>Submit assessments</strong>
            <span>Upload assessment files safely. All submissions versioned and backed up.</span>
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

      ${_renderReferencingPollCard({ android: true })}

      <div id="live-session-card" style="display:none;"></div>

      <div id="rec-card" class="rec-card rec-card--loading">
        <div class="rec-loading-row">
          <div class="rec-spinner"></div>
          <span>Personalising your learning path…</span>
        </div>
      </div>

      ${_renderDailySharpener(STATE.adaptive)}

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
          <button class="android-panel android-panel--action" style="background:linear-gradient(135deg,#6366f1,#a855f7);color:white;" onclick="window.goToChallengeArena()">
            <span class="android-panel-icon">🏟️</span>
            <strong style="color:white;">Challenge Arena</strong>
            <span style="color:rgba(255,255,255,.85);">Skill-mapped games with XP. Push beyond the curriculum.</span>
          </button>
        </div>
      </section>
    </section>
  `;
}

const _TUTORIAL_TIMETABLE = {
  K: { day: 'Thursday', start: '11:20 AM', end: '12:10 PM', venue: 'D LES 309' },
  L: { day: 'Thursday', start: '11:20 AM', end: '12:10 PM', venue: 'D LES 411' },
  M: { day: 'Monday',   start: '2:40 PM',  end: '3:30 PM',  venue: 'D1 LAB K12' },
  N: { day: 'Monday',   start: '2:40 PM',  end: '3:30 PM',  venue: 'D LES 407' },
  O: { day: 'Tuesday',  start: '8:00 AM',  end: '8:50 AM',  venue: 'D1 LAB 405' },
  P: { day: 'Tuesday',  start: '8:00 AM',  end: '8:50 AM',  venue: 'D1 LAB 416' },
  Q: { day: 'Tuesday',  start: '8:00 AM',  end: '8:50 AM',  venue: 'D1 LAB 410' },
  R: { day: 'Tuesday',  start: '12:10 PM', end: '1:00 PM',  venue: 'D LES 306' },
  S: { day: 'Tuesday',  start: '1:00 PM',  end: '1:50 PM',  venue: 'C LES 301' },
  T: { day: 'Tuesday',  start: '1:00 PM',  end: '1:50 PM',  venue: 'C LES 302' },
  U: { day: 'Thursday', start: '1:50 PM',  end: '2:40 PM',  venue: 'C LES 305' },
  V: { day: 'Thursday', start: '1:50 PM',  end: '2:40 PM',  venue: 'D LES 312' },
  W: { day: 'Thursday', start: '12:10 PM', end: '1:00 PM',  venue: 'C LES 301' },
  X: { day: 'Thursday', start: '12:10 PM', end: '1:00 PM',  venue: 'C LES 302' },
  Y: { day: 'Monday',   start: '10:30 AM', end: '11:20 AM', venue: 'D LES 403' },
};

const _CLASS_TIMETABLE = [
  { day: 'Tuesday', start: '1:50 PM', end: '3:30 PM', venue: 'D LAB BASEMENT K01' },
  { day: 'Friday',  start: '1:50 PM', end: '3:30 PM', venue: 'E LES 100' },
];

async function _loadTutorGroupAnnouncement(profile = {}) {
  let groupLetter = String(profile?.tutorialGroup || '').trim().toUpperCase();
  console.log('[TutorGroupAnnouncement] profile.tutorialGroup =', profile?.tutorialGroup, '→ groupLetter =', groupLetter);

  // If profile doesn't have tutorialGroup, try to find it from the roster
  if (!groupLetter || !/^[K-Z]$/.test(groupLetter)) {
    try {
      const studentEmail = String(profile?.email || profile?.authEmail || profile?.username || STATE.user?.email || '').trim().toLowerCase();
      console.log('[TutorGroupAnnouncement] Roster fallback lookup for email:', studentEmail);
      if (studentEmail) {
        const rosterSnap = await get(ref(db, 'rosters/classList'));
        if (rosterSnap.exists()) {
          const rows = Object.values(rosterSnap.val() || {});
          console.log('[TutorGroupAnnouncement] Roster has', rows.length, 'rows');
          for (const row of rows) {
            const rosterEmail = String(row?.email || row?.username || '').trim().toLowerCase();
            if (rosterEmail === studentEmail) {
              const g = String(row?.tutorialGroup || row?.group || '').trim().toUpperCase();
              console.log('[TutorGroupAnnouncement] Found roster match! group =', g);
              if (/^[K-Z]$/.test(g)) {
                groupLetter = g;
                break;
              }
            }
          }
          if (!groupLetter) {
            console.log('[TutorGroupAnnouncement] No roster match found for', studentEmail);
          }
        } else {
          console.log('[TutorGroupAnnouncement] rosters/classList is empty');
        }
      }
    } catch (err) {
      console.warn('Could not look up tutorial group from roster:', err);
    }
  }

  const hasGroup = groupLetter && /^[K-Z]$/.test(groupLetter);
  console.log('[TutorGroupAnnouncement] hasGroup =', hasGroup, ', groupLetter =', groupLetter);

  // Look up timetable info (always available even without tutor assignment)
  const slot = hasGroup ? (_TUTORIAL_TIMETABLE[groupLetter] || null) : null;

  let tutorName = '';
  if (hasGroup) {
    try {
      const snap = await get(ref(db, `tutorial-groups/groupToTutor/${groupLetter}`));
      if (snap.exists()) {
        tutorName = String(snap.val()?.tutorName || '').trim();
      }
    } catch (err) {
      console.warn('Could not load tutor group info:', err);
    }
  }

  const track = document.getElementById('student-announcement-track');
  const dotsContainer = document.getElementById('student-announcement-dots');
  if (!track) return;

  // Build timetable details
  const tutorialLine = slot
    ? `<strong>${_escHtml(slot.day)}</strong> &middot; ${_escHtml(slot.start)} – ${_escHtml(slot.end)} &middot; <strong>${_escHtml(slot.venue)}</strong>`
    : '';
  const classLines = _CLASS_TIMETABLE.map((c) =>
    `${_escHtml(c.day)} ${_escHtml(c.start)} – ${_escHtml(c.end)} &middot; ${_escHtml(c.venue)}`
  ).join('<br>');

  const slideCount = track.querySelectorAll('[data-announcement-slide]').length;
  const slide = document.createElement('article');
  slide.setAttribute('data-announcement-slide', String(slideCount));
  slide.style.cssText = 'min-width:100%;padding:24px 22px 20px 22px;color:white;';
  slide.innerHTML = `
    <div style="display:flex;gap:14px;align-items:flex-start;max-width:900px;">
      <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:rgba(255,183,3,.18);font-size:26px;flex-shrink:0;">📌</div>
      <div style="flex:1;">
        <div style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#ffb703;font-family:var(--font-mono);margin-bottom:8px;">Your Tutorial &amp; Class Schedule</div>
        <h2 style="margin:0 0 10px 0;font-size:24px;line-height:1.2;color:white;">${hasGroup ? `Group ${_escHtml(groupLetter)}${tutorName ? ` — ${_escHtml(tutorName)}` : ''}` : 'Your Class Schedule'}</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8ecae6;margin-bottom:6px;">Tutorial Session</div>
            ${slot ? `
              <div style="font-size:15px;font-weight:800;color:white;margin-bottom:4px;">${_escHtml(slot.day)}</div>
              <div style="font-size:14px;color:rgba(255,255,255,.85);">${_escHtml(slot.start)} – ${_escHtml(slot.end)}</div>
              <div style="font-size:14px;font-weight:700;color:#ffb703;margin-top:4px;">📍 ${_escHtml(slot.venue)}</div>
              ${tutorName ? `<div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:6px;">Tutor: <strong style="color:white;">${_escHtml(tutorName)}</strong></div>` : ''}
            ` : '<div style="font-size:13px;color:rgba(255,255,255,.6);">No tutorial slot assigned yet.</div>'}
          </div>

          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8ecae6;margin-bottom:6px;">Contact Sessions</div>
            ${_CLASS_TIMETABLE.map((c) => `
              <div style="margin-bottom:8px;">
                <div style="font-size:15px;font-weight:800;color:white;">${_escHtml(c.day)}</div>
                <div style="font-size:14px;color:rgba(255,255,255,.85);">${_escHtml(c.start)} – ${_escHtml(c.end)}</div>
                <div style="font-size:14px;font-weight:700;color:#ffb703;margin-top:2px;">📍 ${_escHtml(c.venue)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Prepend the slide (show it first)
  track.prepend(slide);

  // Re-number all slides
  track.querySelectorAll('[data-announcement-slide]').forEach((el, i) => {
    el.setAttribute('data-announcement-slide', String(i));
  });

  // Rebuild dots
  if (dotsContainer) {
    const newTotal = track.querySelectorAll('[data-announcement-slide]').length;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < newTotal; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('data-announcement-dot', String(i));
      dot.setAttribute('aria-label', `Go to announcement ${i + 1}`);
      dot.style.cssText = `width:10px;height:10px;border-radius:999px;border:none;cursor:pointer;background:${i === 0 ? '#ffb703' : 'rgba(255,255,255,.32)'};`;
      dotsContainer.appendChild(dot);
    }
  }

  // Restart the rotator so it picks up the new slide count and lingers longer
  if (window._studentAnnouncementRotator?.timer) {
    clearInterval(window._studentAnnouncementRotator.timer);
  }
  // Reset to slide 0 (the tutor group slide)
  track.style.transform = 'translateX(0%)';
  const allDots = [...document.querySelectorAll('[data-announcement-dot]')];
  allDots.forEach((dot, i) => {
    dot.style.background = i === 0 ? '#ffb703' : 'rgba(255,255,255,.32)';
  });
  // Slower rotation: 12 seconds per slide so students can read the schedule
  let idx = 0;
  const totalSlides = () => track.querySelectorAll('[data-announcement-slide]').length;
  window._studentAnnouncementRotator = {
    timer: setInterval(() => {
      idx = (idx + 1) % totalSlides();
      track.style.transform = `translateX(-${idx * 100}%)`;
      [...document.querySelectorAll('[data-announcement-dot]')].forEach((dot, i) => {
        dot.style.background = i === idx ? '#ffb703' : 'rgba(255,255,255,.32)';
        dot.style.transform = i === idx ? 'scale(1.15)' : 'scale(1)';
      });
    }, 12000),
  };
}

// ── Live Session (Teams) ────────────────────────
let _liveSessionUnsub = null;

function _watchLiveSessions() {
  // Clean up previous listener
  if (_liveSessionUnsub) {
    _liveSessionUnsub();
    _liveSessionUnsub = null;
  }

  const sessionsRef = ref(db, 'sessions/live');
  _liveSessionUnsub = onValue(sessionsRef, (snap) => {
    const card = document.getElementById('live-session-card');
    if (!card) return;

    const data = snap.val() || {};
    const classSession = data.class;
    const tutorialSession = data.tutorial;
    const classActive = classSession?.active === true && classSession?.teamsLink;
    const tutorialActive = tutorialSession?.active === true && tutorialSession?.teamsLink;

    if (!classActive && !tutorialActive) {
      card.style.display = 'none';
      card.innerHTML = '';
      return;
    }

    const renderBtn = (label, icon, link) => `
      <a href="${_escHtml(link)}" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:14px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:white;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 8px 20px rgba(79,70,229,.3);transition:transform .15s ease,box-shadow .15s ease;"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 28px rgba(79,70,229,.4)'"
         onmouseout="this.style.transform='';this.style.boxShadow='0 8px 20px rgba(79,70,229,.3)'">
        <span style="font-size:28px;">${icon}</span>
        <span>Join ${_escHtml(label)} on Teams</span>
        <span style="margin-left:auto;font-size:18px;">→</span>
      </a>`;

    card.style.display = 'block';
    card.innerHTML = `
      <div style="background:linear-gradient(135deg,#eef2ff 0%,#faf5ff 100%);border:2px solid #c7d2fe;border-radius:18px;padding:20px;margin-top:8px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.5);"></div>
          <div style="font-size:13px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:.1em;">Live Session Available</div>
        </div>
        <div style="display:grid;gap:10px;">
          ${classActive ? renderBtn('Contact Class', '🏫', classSession.teamsLink) : ''}
          ${tutorialActive ? renderBtn('Tutorial', '👥', tutorialSession.teamsLink) : ''}
        </div>
      </div>`;
  }, (err) => {
    console.warn('Live sessions listener error:', err);
  });
}

function _initAnnouncementRotator() {
  const banner = document.getElementById('student-announcement-banner');
  const track = document.getElementById('student-announcement-track');
  const getTotal = () => track ? track.querySelectorAll('[data-announcement-slide]').length : 0;
  const getDots = () => [...document.querySelectorAll('[data-announcement-dot]')];
  const total = getTotal();
  if (window._studentAnnouncementRotator) {
    clearInterval(window._studentAnnouncementRotator.timer);
    window._studentAnnouncementRotator = null;
  }
  if (!banner || !track || total <= 1) return;

  let index = 0;
  const render = () => {
    const currentTotal = getTotal();
    if (index >= currentTotal) index = 0;
    track.style.transform = `translateX(-${index * 100}%)`;
    getDots().forEach((dot, dotIndex) => {
      dot.style.background = dotIndex === index ? '#ffb703' : 'rgba(255,255,255,.32)';
      dot.style.transform = dotIndex === index ? 'scale(1.15)' : 'scale(1)';
    });
  };
  const next = () => {
    index = (index + 1) % getTotal();
    render();
  };
  const prev = () => {
    const t = getTotal();
    index = (index - 1 + t) % t;
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
  const dots = getDots();
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
      } else if (action.startsWith('assessment-')) {
        const targetId = action.slice('assessment-'.length);
        const targetIndex = UNITS.findIndex((u) => u?.id === targetId);
        if (targetIndex >= 0) {
          window.goToCourse?.();
          setTimeout(() => window.navigateTo?.(targetIndex), 200);
        }
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
// ── Daily Sharpener (spaced repetition) ───────
// Resurfaces the skill most due for review and launches its micro-module.
function _renderDailySharpener(adaptive) {
  // Hide entirely for brand-new users with no scored module-backed skills —
  // don't nag before there's anything to review.
  const anyScored = Object.keys(SKILL_MODULE_MAP)
    .some((s) => (adaptive?.skill_scores?.[s] || []).length > 0);
  if (!anyScored) return '';

  const queue = getReviewQueue(adaptive);
  const next = queue[0] || null;

  if (!next) {
    return `
      <div class="sharpener-card sharpener-card--clear">
        <div class="sharpener-head">
          <span class="sharpener-emoji">✅</span>
          <div class="sharpener-headtext">
            <h3 class="sharpener-title">All sharp</h3>
            <p class="sharpener-sub">Nothing due for review today. Come back tomorrow.</p>
          </div>
        </div>
      </div>`;
  }

  const label = SKILL_LABELS[next.skillId] || next.skillId;
  const icon = SKILL_ICONS[next.skillId] || '🎯';
  const cfg = STATUS_CONFIG[next.status] || STATUS_CONFIG.developing;
  const more = queue.length - 1;
  const moreNote = more > 0
    ? `<p class="sharpener-more">+${more} more skill${more === 1 ? '' : 's'} due for review</p>`
    : '';

  return `
    <div class="sharpener-card" style="border-left:4px solid ${cfg.color};">
      <div class="sharpener-head">
        <span class="sharpener-emoji">🎯</span>
        <div class="sharpener-headtext">
          <h3 class="sharpener-title">Daily Sharpener</h3>
          <p class="sharpener-sub">
            <span class="sharpener-skill">${icon} ${label}</span> — ${describeDue(next)}
            <span class="sharpener-hint">A quick refresh keeps it sharp.</span>
          </p>
        </div>
      </div>
      <button type="button" class="sharpener-btn" style="background:${cfg.color};"
        onclick="window._startDailySharpener('${next.skillId}','${next.moduleId}')">
        Start 5-min refresh →
      </button>
      ${moreNote}
    </div>`;
}

// Launch handler — records a pending outcome (reusing the existing
// effectiveness loop), then opens the micro-module.
window._startDailySharpener = function (skillId, moduleId) {
  try {
    const scores = STATE.adaptive?.skill_scores?.[skillId] || [];
    const scoreBefore = scores.length ? scores[scores.length - 1].score : null;
    recordOutcome(moduleId, skillId, scoreBefore);
  } catch (err) {
    console.error('Daily Sharpener outcome tracking failed:', err);
  }
  window.goToMicroModule?.(moduleId);
};

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

    // Prefer the native detector only when QR support is actually available.
    let _jsQR = null;
    let _useNativeDetector = false;
    if ('BarcodeDetector' in window) {
      try {
        const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === 'function'
          ? await window.BarcodeDetector.getSupportedFormats()
          : [];
        _useNativeDetector = !Array.isArray(supportedFormats) || supportedFormats.includes('qr_code');
      } catch {
        _useNativeDetector = true;
      }
    }
    try {
      const mod = await import('jsqr');
      _jsQR = mod.default || mod;
    } catch (e) {
      if (!_useNativeDetector) {
        console.error('Could not load jsQR fallback:', e);
        _setScannerStatus('QR scanner not available. Enter token manually.', 'QR library failed to load.');
        return;
      }
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
          <canvas id="attendance-qr-canvas" style="display:none;"></canvas>
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
    const canvas = document.getElementById('attendance-qr-canvas');
    const modalStatus = document.getElementById('attendance-qr-modal-status');
    if (!modal || !video) return;

    window.closeAttendanceQrScanner?.();

    modal.style.display = 'flex';
    _setScannerStatus('Opening camera…', 'Requesting camera access…');

    try {
      state.useNativeDetector = _useNativeDetector;
      if (state.useNativeDetector) {
        state.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      }

      // Try rear camera first, fall back to any camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      state.stream = stream;

      video.srcObject = state.stream;
      await video.play();
      state.running = true;

      const _processQrResult = async (raw) => {
        _setScannerStatus('QR detected. Verifying…', 'QR detected. Verifying…');
        if (typeof window.verifyAttendanceQrPayload !== 'function') {
          _setScannerStatus('QR detected, but verification function missing.', 'Verification function not found.');
          return;
        }
        try {
          const result = await window.verifyAttendanceQrPayload(raw, true);
          if (result?.ok) {
            _setScannerStatus(`✅ Attendance confirmed for ${result.sessionLabel || _attendanceSessionLabel(result.sessionType)}.`, 'Attendance confirmed. Closing scanner…');
            await _finalizeAttendanceCheckin(result, result.token || _extractAttendanceToken(raw), 'student-attendance-qr');
            setTimeout(() => window.closeAttendanceQrScanner?.(), 500);
            return;
          }
          console.warn('QR validation failed:', { scannedToken: raw, result });
          _setScannerStatus(result?.message || 'QR code found but token is invalid or expired.', 'Invalid/expired token. Try scanning the latest QR code.');
          state.lastHintAt = Date.now();
        } catch (err) {
          _setScannerStatus('Error verifying QR code.', 'Verification error.');
          console.error('Error in verifyAttendanceQrPayload:', err);
        }
      };

      const scanLoop = async () => {
        if (!state.running) return;
        try {
          if (video.readyState >= 2) {
            let raw = null;

            if (state.useNativeDetector && state.detector) {
              try {
                const codes = await state.detector.detect(video);
                if (codes?.length) raw = String(codes[0]?.rawValue || '').trim();
              } catch (err) {
                console.warn('Native QR detector failed, switching to compatibility mode:', err);
                state.useNativeDetector = false;
                state.detector = null;
                _setScannerStatus(
                  'Switching scanner to compatibility mode…',
                  'Native scan mode unavailable. Trying compatibility mode…'
                );
              }
            }

            if (!raw && _jsQR && canvas) {
              // Use jsQR fallback — draw video frame to canvas and scan
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = _jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
              if (code?.data) raw = String(code.data).trim();
            }

            if (raw) {
              await _processQrResult(raw);
              if (!state.running) return;
            } else if (!state.lastHintAt || Date.now() - state.lastHintAt > 15000) {
              if (modalStatus) modalStatus.textContent = 'Still scanning… keep the QR fully in frame and well lit.';
              state.lastHintAt = Date.now();
            }
          }
        } catch (err) {
          console.error('Error during QR scan loop:', err);
        }
        // Throttle jsQR to ~10fps to reduce CPU, native detector handles its own rate
        const delay = state.useNativeDetector ? 0 : 100;
        if (delay) {
          state.rafId = setTimeout(() => { state.rafId = window.requestAnimationFrame(scanLoop); }, delay);
        } else {
          state.rafId = window.requestAnimationFrame(scanLoop);
        }
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
      clearTimeout(state.rafId);
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

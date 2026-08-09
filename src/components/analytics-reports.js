// src/components/analytics-reports.js
// ─────────────────────────────────────────────
// Advanced Analytics Reports — Weekly/Monthly trends,
// traffic-by-hour heatmap, device breakdown, session durations
// ─────────────────────────────────────────────
import { db } from '../firebase.js';
import { ref, get } from 'firebase/database';
import { rebuildDerivedMetricsForDate, analyticsDateKey } from '../analytics.js';
import { renderLessonExperimentReport } from './lesson-experiment-report.js';

function _esc(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Date helpers (Africa/Johannesburg) ───────
function _dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function _dayLabel(key) {
  const d = _dateFromKey(key);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function _shortDate(key) {
  return key.slice(5); // MM-DD
}

function _dateRange(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(_dateKey(d));
  }
  return keys;
}

function _pctDelta(current, previous) {
  if (!previous) return current > 0 ? { text: 'New', color: '#166534' } : { text: '—', color: 'var(--muted)' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `+${pct}%`, color: '#166534' };
  if (pct < 0) return { text: `${pct}%`, color: '#991b1b' };
  return { text: '0%', color: 'var(--muted)' };
}

// ── Data loading ─────────────────────────────
async function _loadDerivedForDates(dateKeys) {
  const results = {};
  const batches = [];
  for (const key of dateKeys) {
    batches.push(
      get(ref(db, `analytics/derived/daily/${key}`)).then((snap) => {
        results[key] = snap.exists() ? snap.val() : null;
      }).catch(() => { results[key] = null; })
    );
  }
  await Promise.all(batches);
  return results;
}

async function _loadHourlyForDates(dateKeys) {
  const results = {};
  const batches = [];
  for (const key of dateKeys) {
    batches.push(
      get(ref(db, `analytics/derived/hourly/${key}`)).then((snap) => {
        results[key] = snap.exists() ? snap.val() : null;
      }).catch(() => { results[key] = null; })
    );
  }
  await Promise.all(batches);
  return results;
}

async function _loadAllStudentData() {
  try {
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return [];
    const raw = snap.val();
    return Object.entries(raw).map(([uid, data]) => ({
      uid,
      profile: data?.profile || {},
      state: data?.state || {},
    })).filter((u) => String(u.profile?.role || '').toLowerCase() === 'student');
  } catch {
    return [];
  }
}

// ── Main render ──────────────────────────────
let _reportPeriod = 'week'; // 'week' | 'month'

export async function renderAnalyticsReports(container) {
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div>
          <h2 style="margin:0;color:var(--navy);font-size:22px;">Analytics Reports</h2>
          <p style="margin:6px 0 0 0;color:var(--muted);font-size:13px;">Traffic patterns, device usage, session durations, and engagement trends.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="report-period-week" class="btn-prev" style="display:inline-flex;${_reportPeriod === 'week' ? 'background:var(--navy);color:white;border-color:var(--navy);' : ''}" onclick="window._switchReportPeriod('week')">This Week (7 days)</button>
          <button id="report-period-month" class="btn-prev" style="display:inline-flex;${_reportPeriod === 'month' ? 'background:var(--navy);color:white;border-color:var(--navy);' : ''}" onclick="window._switchReportPeriod('month')">This Month (30 days)</button>
        </div>
      </div>
      <div id="analytics-reports-content">
        <div style="text-align:center;padding:40px;color:var(--muted);">
          <div class="rec-spinner" style="width:24px;height:24px;margin:0 auto 12px auto;"></div>
          Loading report data...
        </div>
      </div>
      <div id="lesson-experiment-report-mount"></div>
    </div>`;

  await _loadAndRender();
  const expMount = document.getElementById('lesson-experiment-report-mount');
  if (expMount) {
    const days = _reportPeriod === 'month' ? 30 : 7;
    renderLessonExperimentReport(expMount, { days }).catch((err) => console.error('Lesson experiment report error:', err));
  }
}

window._switchReportPeriod = async function (period) {
  _reportPeriod = period;
  document.getElementById('report-period-week')?.setAttribute('style', `display:inline-flex;${period === 'week' ? 'background:var(--navy);color:white;border-color:var(--navy);' : ''}`);
  document.getElementById('report-period-month')?.setAttribute('style', `display:inline-flex;${period === 'month' ? 'background:var(--navy);color:white;border-color:var(--navy);' : ''}`);
  const content = document.getElementById('analytics-reports-content');
  if (content) {
    content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);"><div class="rec-spinner" style="width:24px;height:24px;margin:0 auto 12px auto;"></div>Loading ${period} report...</div>`;
  }
  await _loadAndRender();
};

async function _loadAndRender() {
  const content = document.getElementById('analytics-reports-content');
  if (!content) return;

  const days = _reportPeriod === 'month' ? 30 : 7;
  const dateKeys = _dateRange(days);
  const todayKey = _dateKey(new Date());

  // Rebuild today's metrics fresh
  const todayDerived = await rebuildDerivedMetricsForDate(todayKey).catch(() => null);

  const [dailyByDate, hourlyByDate, students] = await Promise.all([
    _loadDerivedForDates(dateKeys),
    _loadHourlyForDates(dateKeys),
    _loadAllStudentData(),
  ]);

  // Merge today's fresh data
  if (todayDerived?.daily) dailyByDate[todayKey] = todayDerived.daily;
  if (todayDerived?.hourly) hourlyByDate[todayKey] = todayDerived.hourly;

  const html = [
    _renderTrafficHeatmap(dateKeys, hourlyByDate),
    _renderDailyTrafficChart(dateKeys, dailyByDate),
    _renderDeviceBreakdown(students),
    _renderSessionDurations(students, dateKeys),
    _renderEngagementSummary(dateKeys, dailyByDate),
    _renderPeakHoursAnalysis(dateKeys, hourlyByDate),
    _renderWeekdayPatterns(dateKeys, hourlyByDate, dailyByDate),
  ].join('');

  content.innerHTML = html;
}

// ── 1. Traffic Heatmap (hour × day) ─────────
function _renderTrafficHeatmap(dateKeys, hourlyByDate) {
  // Build heatmap data: rows = hours (0–23), cols = dates
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
  let maxPings = 1;
  const grid = {};

  for (const dk of dateKeys) {
    const hourly = hourlyByDate[dk] || {};
    for (const hk of hours) {
      const pings = Number(hourly[hk]?.pings || 0);
      grid[`${dk}-${hk}`] = pings;
      if (pings > maxPings) maxPings = pings;
    }
  }

  // For weekly view show all days, for monthly show every 3rd label
  const labelEvery = dateKeys.length > 10 ? 3 : 1;

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Traffic Heatmap — Activity by Hour</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">Darker cells = more activity. Rows are hours (00–23), columns are dates.</p>
      <div style="overflow-x:auto;">
        <div style="display:grid;grid-template-columns:40px repeat(${dateKeys.length}, minmax(${dateKeys.length > 14 ? '18px' : '28px'},1fr));gap:2px;font-size:10px;">
          <div></div>
          ${dateKeys.map((dk, i) => `<div style="text-align:center;color:var(--muted);font-weight:600;${i % labelEvery !== 0 ? 'visibility:hidden;' : ''}" title="${dk}">${dateKeys.length > 14 ? dk.slice(8) : _shortDate(dk)}</div>`).join('')}
          ${hours.filter((_, i) => i % 2 === 0).map((hk) => {
    const h = Number(hk);
    return `<div style="color:var(--muted);font-weight:600;text-align:right;padding-right:4px;line-height:${dateKeys.length > 14 ? '14px' : '18px'};">${hk}</div>` +
      dateKeys.map((dk) => {
        const pings = grid[`${dk}-${hk}`] || 0;
        const intensity = pings > 0 ? Math.max(0.08, pings / maxPings) : 0;
        const bg = pings > 0 ? `rgba(37,99,235,${intensity.toFixed(2)})` : '#f1f5f9';
        return `<div title="${dk} ${hk}:00 — ${pings} events" style="height:${dateKeys.length > 14 ? '14px' : '18px'};background:${bg};border-radius:3px;"></div>`;
      }).join('');
  }).join('')}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <span style="font-size:11px;color:var(--muted);">Low</span>
        ${[0.1, 0.25, 0.45, 0.65, 0.85, 1.0].map((o) => `<div style="width:16px;height:12px;border-radius:3px;background:rgba(37,99,235,${o});"></div>`).join('')}
        <span style="font-size:11px;color:var(--muted);">High</span>
      </div>
    </div>`;
}

// ── 2. Daily traffic chart ───────────────────
function _renderDailyTrafficChart(dateKeys, dailyByDate) {
  const rows = dateKeys.map((dk) => {
    const d = dailyByDate[dk] || {};
    return {
      dateKey: dk,
      label: dateKeys.length > 14 ? dk.slice(8) : _shortDate(dk),
      day: _dayLabel(dk),
      events: Number(d.rawEventCount || 0),
      learners: Number(d.dailyActiveLearners || 0),
      actions: Number(d.learningActions || 0),
      attendance: Number(d.attendanceToday || 0),
      uploads: Number(d.successfulUploads || 0),
      notebooks: Number(d.notebookSaves || 0),
    };
  });

  const maxEvents = Math.max(1, ...rows.map((r) => r.events));
  const maxLearners = Math.max(1, ...rows.map((r) => r.learners));
  const totalEvents = rows.reduce((s, r) => s + r.events, 0);
  const totalLearners = rows.reduce((s, r) => s + r.learners, 0);
  const totalActions = rows.reduce((s, r) => s + r.actions, 0);
  const totalAttendance = rows.reduce((s, r) => s + r.attendance, 0);
  const totalUploads = rows.reduce((s, r) => s + r.uploads, 0);
  const totalNotebooks = rows.reduce((s, r) => s + r.notebooks, 0);
  const avgEvents = Math.round(totalEvents / rows.length);
  const avgLearners = Math.round(totalLearners / rows.length);

  // Week-over-week comparison
  const half = Math.floor(rows.length / 2);
  const firstHalf = rows.slice(0, half);
  const secondHalf = rows.slice(half);
  const firstHalfEvents = firstHalf.reduce((s, r) => s + r.events, 0);
  const secondHalfEvents = secondHalf.reduce((s, r) => s + r.events, 0);
  const trendDelta = _pctDelta(secondHalfEvents, firstHalfEvents);

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <h3 style="margin:0;color:var(--navy);font-size:16px;">Daily Traffic Overview</h3>
        <div style="font-size:12px;color:var(--muted);">Period trend: <strong style="color:${trendDelta.color};">${trendDelta.text}</strong> (2nd half vs 1st half)</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">
        <div style="padding:10px 14px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;">
          <div style="font-size:11px;color:#0369a1;text-transform:uppercase;letter-spacing:.06em;">Total Events</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalEvents.toLocaleString()}</div>
          <div style="font-size:11px;color:var(--muted);">avg ${avgEvents}/day</div>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;">
          <div style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:.06em;">Active Learners</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalLearners.toLocaleString()}</div>
          <div style="font-size:11px;color:var(--muted);">avg ${avgLearners}/day</div>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:#fefce8;border:1px solid #fde68a;">
          <div style="font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:.06em;">Attendance</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalAttendance.toLocaleString()}</div>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:#fdf4ff;border:1px solid #e9d5ff;">
          <div style="font-size:11px;color:#7c3aed;text-transform:uppercase;letter-spacing:.06em;">Uploads</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalUploads.toLocaleString()}</div>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;">
          <div style="font-size:11px;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;">Notebook Saves</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalNotebooks.toLocaleString()}</div>
        </div>
        <div style="padding:10px 14px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Learning Actions</div>
          <div style="font-size:20px;font-weight:900;color:var(--navy);">${totalActions.toLocaleString()}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">Events per day</div>
      <div style="display:grid;grid-template-columns:repeat(${rows.length}, 1fr);gap:${rows.length > 14 ? '2' : '4'}px;align-items:end;height:100px;margin-bottom:4px;">
        ${rows.map((r) => {
    const h = Math.max(4, Math.round((r.events / maxEvents) * 100));
    return `<div title="${r.dateKey} (${r.day}) — ${r.events} events, ${r.learners} learners" style="height:${h}%;background:var(--accent);border-radius:4px 4px 0 0;min-width:0;"></div>`;
  }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(${rows.length}, 1fr);gap:${rows.length > 14 ? '2' : '4'}px;">
        ${rows.map((r, i) => `<div style="text-align:center;font-size:${rows.length > 14 ? '8' : '10'}px;color:var(--muted);${rows.length > 14 && i % 3 !== 0 ? 'visibility:hidden;' : ''}">${r.label}</div>`).join('')}
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--navy);margin:14px 0 8px 0;">Active learners per day</div>
      <div style="display:grid;grid-template-columns:repeat(${rows.length}, 1fr);gap:${rows.length > 14 ? '2' : '4'}px;align-items:end;height:70px;margin-bottom:4px;">
        ${rows.map((r) => {
    const h = Math.max(4, Math.round((r.learners / maxLearners) * 100));
    return `<div title="${r.dateKey} — ${r.learners} learners" style="height:${h}%;background:#059669;border-radius:4px 4px 0 0;min-width:0;"></div>`;
  }).join('')}
      </div>
    </div>`;
}

// ── 3. Device breakdown ──────────────────────
function _renderDeviceBreakdown(students) {
  const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
  const screenWidths = [];
  const userAgentSamples = { Desktop: [], Mobile: [], Tablet: [] };

  students.forEach((s) => {
    const di = s.state?.deviceInfo;
    if (!di) { deviceCounts.Unknown++; return; }
    const type = di.type || 'Unknown';
    deviceCounts[type] = (deviceCounts[type] || 0) + 1;
    if (di.screenWidth) screenWidths.push({ type, width: Number(di.screenWidth) });
    if (di.userAgent && userAgentSamples[type]?.length < 3) {
      userAgentSamples[type].push(_extractBrowser(di.userAgent));
    }
  });

  const total = students.length || 1;
  const types = ['Desktop', 'Mobile', 'Tablet', 'Unknown'].filter((t) => deviceCounts[t] > 0);
  const colors = { Desktop: '#2563eb', Mobile: '#059669', Tablet: '#d97706', Unknown: '#94a3b8' };

  // Average screen widths
  const avgWidthByType = {};
  for (const type of ['Desktop', 'Mobile', 'Tablet']) {
    const widths = screenWidths.filter((w) => w.type === type).map((w) => w.width);
    avgWidthByType[type] = widths.length ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : null;
  }

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Device Breakdown</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">Based on device info captured at sign-in. ${students.length} students total.</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
        ${types.map((type) => {
    const count = deviceCounts[type];
    const pct = Math.round((count / total) * 100);
    return `
            <div style="padding:14px;border-radius:12px;background:#f8fafc;border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:14px;font-weight:800;color:${colors[type] || 'var(--navy)'};">${type === 'Desktop' ? '💻' : type === 'Mobile' ? '📱' : type === 'Tablet' ? '📟' : '❓'} ${type}</div>
                <div style="font-size:20px;font-weight:900;color:var(--navy);">${count}</div>
              </div>
              <div style="height:6px;background:#e2e8f0;border-radius:99px;margin-top:8px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${colors[type]};border-radius:99px;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--muted);">
                <span>${pct}% of students</span>
                ${avgWidthByType[type] ? `<span>avg ${avgWidthByType[type]}px wide</span>` : ''}
              </div>
              ${userAgentSamples[type]?.length ? `<div style="font-size:10px;color:var(--muted);margin-top:6px;">Browsers: ${userAgentSamples[type].join(', ')}</div>` : ''}
            </div>`;
  }).join('')}
      </div>
    </div>`;
}

function _extractBrowser(ua = '') {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  if (/Opera|OPR\//i.test(ua)) return 'Opera';
  return 'Other';
}

// ── 4. Session durations ─────────────────────
function _renderSessionDurations(students, dateKeys) {
  const durations = [];
  const durationsByDate = {};
  const durationsByType = { class: [], tutorial: [] };

  students.forEach((s) => {
    const byDate = s.state?.attendance?.byDate || {};
    for (const dk of dateKeys) {
      const day = byDate[dk];
      if (!day) continue;
      const totalMin = Math.max(0, Math.round((day.totalSeconds || 0) / 60));
      const classMin = Math.max(0, Math.round((day.classSeconds || 0) / 60));
      const tutorialMin = Math.max(0, Math.round((day.tutorialSeconds || 0) / 60));
      if (totalMin > 0) {
        durations.push(totalMin);
        if (!durationsByDate[dk]) durationsByDate[dk] = [];
        durationsByDate[dk].push(totalMin);
      }
      if (classMin > 0) durationsByType.class.push(classMin);
      if (tutorialMin > 0) durationsByType.tutorial.push(tutorialMin);
    }
  });

  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const medianDuration = durations.length ? _median(durations) : 0;
  const maxDuration = durations.length ? Math.max(...durations) : 0;
  const avgClass = durationsByType.class.length ? Math.round(durationsByType.class.reduce((a, b) => a + b, 0) / durationsByType.class.length) : 0;
  const avgTutorial = durationsByType.tutorial.length ? Math.round(durationsByType.tutorial.reduce((a, b) => a + b, 0) / durationsByType.tutorial.length) : 0;

  // Duration distribution buckets
  const buckets = [
    { label: '< 15 min', min: 0, max: 15, count: 0 },
    { label: '15–30 min', min: 15, max: 30, count: 0 },
    { label: '30–60 min', min: 30, max: 60, count: 0 },
    { label: '60–90 min', min: 60, max: 90, count: 0 },
    { label: '90–120 min', min: 90, max: 120, count: 0 },
    { label: '120+ min', min: 120, max: 9999, count: 0 },
  ];
  durations.forEach((d) => {
    const b = buckets.find((b) => d >= b.min && d < b.max);
    if (b) b.count++;
  });
  const bucketMax = Math.max(1, ...buckets.map((b) => b.count));

  // Daily avg duration chart
  const dailyAvg = dateKeys.map((dk) => {
    const arr = durationsByDate[dk] || [];
    return { dateKey: dk, avg: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0, sessions: arr.length };
  });
  const maxDailyAvg = Math.max(1, ...dailyAvg.map((d) => d.avg));

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Session Durations</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">${durations.length} session records across ${dateKeys.length} days.</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;">
        <div style="padding:12px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;">
          <div style="font-size:11px;color:#0369a1;text-transform:uppercase;">Avg duration</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy);">${avgDuration} min</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;">
          <div style="font-size:11px;color:#166534;text-transform:uppercase;">Median</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy);">${medianDuration} min</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:#fefce8;border:1px solid #fde68a;">
          <div style="font-size:11px;color:#92400e;text-transform:uppercase;">Avg class time</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy);">${avgClass} min</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:#fdf4ff;border:1px solid #e9d5ff;">
          <div style="font-size:11px;color:#7c3aed;text-transform:uppercase;">Avg tutorial time</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy);">${avgTutorial} min</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Longest session</div>
          <div style="font-size:22px;font-weight:900;color:var(--navy);">${maxDuration} min</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:14px;">
          <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:10px;">Duration distribution</div>
          ${buckets.map((b) => {
    const w = Math.max(4, Math.round((b.count / bucketMax) * 100));
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:11px;color:var(--muted);width:72px;text-align:right;">${b.label}</span>
              <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;">
                <div style="width:${w}%;height:100%;background:#2563eb;border-radius:4px;"></div>
              </div>
              <span style="font-size:11px;color:var(--navy);width:28px;text-align:right;font-weight:700;">${b.count}</span>
            </div>`;
  }).join('')}
        </div>
        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:14px;">
          <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:10px;">Avg session time per day</div>
          <div style="display:grid;grid-template-columns:repeat(${dailyAvg.length}, 1fr);gap:${dailyAvg.length > 14 ? '2' : '3'}px;align-items:end;height:70px;margin-bottom:4px;">
            ${dailyAvg.map((d) => {
    const h = Math.max(4, Math.round((d.avg / maxDailyAvg) * 100));
    return `<div title="${d.dateKey} — avg ${d.avg} min, ${d.sessions} sessions" style="height:${h}%;background:#7c3aed;border-radius:3px 3px 0 0;min-width:0;"></div>`;
  }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(${dailyAvg.length}, 1fr);gap:${dailyAvg.length > 14 ? '2' : '3'}px;">
            ${dailyAvg.map((d, i) => `<div style="text-align:center;font-size:${dailyAvg.length > 14 ? '7' : '9'}px;color:var(--muted);${dailyAvg.length > 14 && i % 3 !== 0 ? 'visibility:hidden;' : ''}">${d.dateKey.slice(8)}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function _median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// ── 5. Engagement summary table ──────────────
function _renderEngagementSummary(dateKeys, dailyByDate) {
  const rows = dateKeys.map((dk) => {
    const d = dailyByDate[dk] || {};
    return {
      dateKey: dk,
      day: _dayLabel(dk),
      learners: Number(d.dailyActiveLearners || 0),
      attendance: Number(d.attendanceToday || 0),
      actions: Number(d.learningActions || 0),
      uploads: Number(d.successfulUploads || 0),
      notebooks: Number(d.notebookSaves || 0),
      gallery: Number(d.gallerySubmissions || 0),
      events: Number(d.rawEventCount || 0),
    };
  });

  // Show latest 14 in the table (all if <= 14)
  const tableRows = rows.length > 14 ? rows.slice(-14) : rows;

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Daily Engagement Summary</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">Day-by-day breakdown of key metrics.${rows.length > 14 ? ` Showing latest 14 of ${rows.length} days.` : ''}</p>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:var(--muted);">
              <th style="text-align:left;padding:8px 6px;">Date</th>
              <th style="text-align:left;padding:8px 6px;">Day</th>
              <th style="text-align:right;padding:8px 6px;">Events</th>
              <th style="text-align:right;padding:8px 6px;">Learners</th>
              <th style="text-align:right;padding:8px 6px;">Attendance</th>
              <th style="text-align:right;padding:8px 6px;">Actions</th>
              <th style="text-align:right;padding:8px 6px;">Uploads</th>
              <th style="text-align:right;padding:8px 6px;">Notebooks</th>
              <th style="text-align:right;padding:8px 6px;">Gallery</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.map((r) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 6px;font-weight:700;color:var(--navy);">${_shortDate(r.dateKey)}</td>
                <td style="padding:8px 6px;color:var(--muted);">${r.day}</td>
                <td style="padding:8px 6px;text-align:right;">${r.events}</td>
                <td style="padding:8px 6px;text-align:right;font-weight:700;color:${r.learners ? 'var(--navy)' : 'var(--muted)'};">${r.learners}</td>
                <td style="padding:8px 6px;text-align:right;color:${r.attendance ? '#166534' : 'var(--muted)'};">${r.attendance}</td>
                <td style="padding:8px 6px;text-align:right;">${r.actions}</td>
                <td style="padding:8px 6px;text-align:right;">${r.uploads}</td>
                <td style="padding:8px 6px;text-align:right;">${r.notebooks}</td>
                <td style="padding:8px 6px;text-align:right;">${r.gallery}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── 6. Peak hours analysis ───────────────────
function _renderPeakHoursAnalysis(dateKeys, hourlyByDate) {
  // Aggregate pings across all dates per hour
  const hourTotals = Array.from({ length: 24 }, () => 0);
  const hourDays = Array.from({ length: 24 }, () => 0);

  for (const dk of dateKeys) {
    const hourly = hourlyByDate[dk] || {};
    for (let h = 0; h < 24; h++) {
      const hk = String(h).padStart(2, '0');
      const pings = Number(hourly[hk]?.pings || 0);
      hourTotals[h] += pings;
      if (pings > 0) hourDays[h]++;
    }
  }

  const hourAvg = hourTotals.map((t, h) => ({ hour: h, total: t, avg: hourDays[h] ? Math.round(t / hourDays[h]) : 0, activeDays: hourDays[h] }));
  const maxTotal = Math.max(1, ...hourTotals);
  const peakHour = hourAvg.reduce((best, h) => (h.total > best.total ? h : best), { hour: 0, total: 0 });
  const quietestActive = hourAvg.filter((h) => h.total > 0).reduce((best, h) => (h.total < best.total ? h : best), { hour: 0, total: Infinity });

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Peak Hours Analysis</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">Aggregated traffic across ${dateKeys.length} days to identify recurring peak and quiet periods.</p>

      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="padding:8px 14px;border-radius:8px;background:#ecfdf5;border:1px solid #bbf7d0;font-size:12px;">
          Peak: <strong style="color:#166534;">${String(peakHour.hour).padStart(2, '0')}:00</strong> (${peakHour.total} total events)
        </div>
        ${quietestActive.total < Infinity ? `<div style="padding:8px 14px;border-radius:8px;background:#fefce8;border:1px solid #fde68a;font-size:12px;">
          Quietest: <strong style="color:#92400e;">${String(quietestActive.hour).padStart(2, '0')}:00</strong> (${quietestActive.total} total events)
        </div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(24,1fr);gap:3px;align-items:end;height:90px;margin-bottom:4px;">
        ${hourAvg.map((h) => {
    const height = Math.max(4, Math.round((h.total / maxTotal) * 100));
    const isPeak = h.hour === peakHour.hour;
    return `<div title="${String(h.hour).padStart(2, '0')}:00 — ${h.total} total, avg ${h.avg}/day, ${h.activeDays} active days" style="height:${height}%;background:${isPeak ? '#059669' : 'var(--accent)'};border-radius:3px 3px 0 0;min-width:0;"></div>`;
  }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(24,1fr);gap:3px;">
        ${hourAvg.map((h) => `<div style="text-align:center;font-size:8px;color:var(--muted);">${h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}</div>`).join('')}
      </div>
    </div>`;
}

// ── 7. Weekday patterns ──────────────────────
function _renderWeekdayPatterns(dateKeys, hourlyByDate, dailyByDate) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay = Array.from({ length: 7 }, () => ({ events: 0, learners: 0, attendance: 0, days: 0 }));

  for (const dk of dateKeys) {
    const d = _dateFromKey(dk);
    const dow = d.getDay();
    const daily = dailyByDate[dk] || {};
    byDay[dow].events += Number(daily.rawEventCount || 0);
    byDay[dow].learners += Number(daily.dailyActiveLearners || 0);
    byDay[dow].attendance += Number(daily.attendanceToday || 0);
    byDay[dow].days++;
  }

  const dayStats = byDay.map((d, i) => ({
    name: dayNames[i],
    short: dayNames[i].slice(0, 3),
    avgEvents: d.days ? Math.round(d.events / d.days) : 0,
    avgLearners: d.days ? Math.round(d.learners / d.days) : 0,
    avgAttendance: d.days ? Math.round(d.attendance / d.days) : 0,
    totalEvents: d.events,
    sampleDays: d.days,
  }));
  const maxAvgEvents = Math.max(1, ...dayStats.map((d) => d.avgEvents));
  const busiestDay = dayStats.reduce((best, d) => (d.avgEvents > best.avgEvents ? d : best), { avgEvents: 0 });

  return `
    <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
      <h3 style="margin:0 0 4px 0;color:var(--navy);font-size:16px;">Weekday Patterns</h3>
      <p style="margin:0 0 14px 0;font-size:12px;color:var(--muted);">Average activity by day of week. Busiest day: <strong style="color:var(--navy);">${busiestDay.name}</strong>.</p>

      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
        ${dayStats.map((d) => {
    const h = Math.max(8, Math.round((d.avgEvents / maxAvgEvents) * 100));
    const isBusiest = d.name === busiestDay.name;
    return `
            <div style="text-align:center;">
              <div style="height:80px;display:flex;align-items:end;justify-content:center;">
                <div style="width:60%;height:${h}%;background:${isBusiest ? '#059669' : 'var(--accent)'};border-radius:6px 6px 0 0;"></div>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--navy);margin-top:6px;">${d.short}</div>
              <div style="font-size:11px;color:var(--muted);">${d.avgEvents} events</div>
              <div style="font-size:10px;color:var(--muted);">${d.avgLearners} learners</div>
              <div style="font-size:10px;color:var(--muted);">${d.sampleDays} days</div>
            </div>`;
  }).join('')}
      </div>
    </div>`;
}

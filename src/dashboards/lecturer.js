import {
  buildStudentProfileDraft,
  findRosterEntry,
  getIncompleteStudentFields,
  isValidStudentUsername,
  normalizeStudentUsername,
  STUDENT_PROFILE_FIELD_LABELS,
} from '../profile.js';
import { renderSubmissionReviewer } from '../components/submission-reviewer.js';
import {
  postFinalisedSubmissionFeedback,
  returnSubmissionToTutor,
  saveModerationDecision,
} from '../submissions.js';
import { renderAnalyticsReports } from '../components/analytics-reports.js';
import { renderStudentDeepDive } from '../components/student-deep-dive.js';

// Add Compare Students button to roster manager UI
window._addCompareStudentsButton = function () {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  if (!document.getElementById('compare-students-btn')) {
    const btn = document.createElement('button');
    btn.id = 'compare-students-btn';
    btn.className = 'btn-prev';
    btn.style = 'margin:12px 0 0 0;display:inline-flex;background:var(--amber2);color:#222;border-color:var(--amber2);';
    btn.textContent = 'Compare Active vs Roster';
    btn.onclick = () => window._openCompareStudentsModal?.();
    mount.appendChild(btn);
  }
};

window._openCompareStudentsModal = function () {
  const {
    anomaliesActive,
    anomaliesRoster,
    invalidActive,
    invalidRoster,
    warnings,
    stats,
    breakdownActive,
    breakdownRoster,
    duplicates,
    placeholderActiveNoWork,
    placeholderActiveWithWork,
  } = window.compareStudentLists();

  const esc = (v) => (typeof _esc === 'function' ? _esc(v) : String(v || ''));
  const renderActiveLine = (s) => `${esc(s?.name || 'Unknown')} (${esc(s?.email || '—')}, ${esc(s?.studentNumber || '—')})`;
  const renderRosterLine = (r) => {
    const name = String([r?.firstName, r?.lastName].filter(Boolean).join(' ') || r?.name || 'Unknown').trim();
    const id = r?.studentId || r?.studentNumber || r?.studentNo || '—';
    return `${esc(name)} (${esc(r?.email || '—')}, ${esc(id)})`;
  };
  const renderKeyValue = (label, value) => `<div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:var(--muted);">${esc(label)}</span><span style="font-weight:900;color:var(--navy);">${esc(value)}</span></div>`;
  const renderList = (rows, renderFn) => {
    if (!rows.length) return '<div style="font-size:12px;color:var(--muted);margin:6px 0 14px 0;">None 🎉</div>';
    return `<ul style="margin:8px 0 14px 20px;">${rows.map((row) => `<li>${renderFn(row)}</li>`).join('')}</ul>`;
  };
  const renderDupes = (dupes = [], renderFn, cap = 12) => {
    if (!Array.isArray(dupes) || !dupes.length) return '<div style="font-size:12px;color:var(--muted);margin:6px 0 0 0;">None detected.</div>';
    const shown = dupes.slice(0, cap);
    const more = dupes.length - shown.length;
    const items = shown.map((d) => {
      const key = String(d?.key || 'unknown');
      const count = Number(d?.count || 0);
      const rows = Array.isArray(d?.rows) ? d.rows : [];
      const sample = rows.slice(0, 5).map(renderFn).map((s) => `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${s}</div>`).join('');
      return `<li style="margin-bottom:10px;"><div style="font-weight:900;color:var(--navy);">${esc(key || 'unknown')} <span style="font-weight:800;color:var(--muted);">(${count})</span></div>${sample}</li>`;
    }).join('');
    return `<ul style="margin:8px 0 0 20px;">${items}</ul>${more > 0 ? `<div style="font-size:11px;color:var(--muted);margin-top:8px;">Showing ${shown.length}/${dupes.length}. Open console for full details.</div>` : ''}`;
  };
  const renderPlaceholderRows = (rows = [], { allowDelete = false } = {}) => {
    if (!rows.length) return '<div style="font-size:12px;color:var(--muted);margin:6px 0 14px 0;">None.</div>';
    return `<div style="display:grid;gap:8px;margin:8px 0 14px 0;">${rows.map((row) => `
      <div style="padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:white;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div style="font-weight:800;color:var(--navy);">${esc(row?.name || row?.uid || 'Unknown')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px;">UID: ${esc(row?.uid || '—')} · email: ${esc(row?.email || '—')} · student number: ${esc(row?.studentNumber || '—')}</div>
          <div style="font-size:12px;color:${Number(row?.workScore || 0) > 0 ? '#9a3412' : '#166534'};margin-top:4px;">Work score: ${Number(row?.workScore || 0)}</div>
        </div>
        ${allowDelete ? `<button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;background:#991b1b;border-color:#991b1b;color:white;" onclick="_hardDeletePlaceholderAccount('${esc(row?.uid || '')}')">Hard Delete</button>` : ''}
      </div>
    `).join('')}</div>`;
  };

  let html = `<h2 style="margin:0 0 10px 0;">Student List Comparison</h2>`;
  html += `<div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;">Matches on student number (digits only) when present, otherwise falls back to email. Blank/invalid IDs are ignored.</div>`;
  if (Array.isArray(warnings) && warnings.length) {
    html += `<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.45;margin-bottom:12px;">`;
    html += `<div style="font-weight:800;margin-bottom:6px;">Warnings</div>`;
    html += `<ul style="margin:0 0 0 18px;">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
    html += `</div>`;
  }
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:12px;">`;
  html += `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;">Active Students</div><div style="font-size:14px;font-weight:900;color:var(--navy);">${Number(stats?.activeCount || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">With ID: ${Number(stats?.activeWithId || 0)} · With email: ${Number(stats?.activeWithEmail || 0)}</div></div>`;
  html += `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;">Roster Rows</div><div style="font-size:14px;font-weight:900;color:var(--navy);">${Number(stats?.rosterCount || 0)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">With ID: ${Number(stats?.rosterWithId || 0)} · With email: ${Number(stats?.rosterWithEmail || 0)}</div></div>`;
  html += `</div>`;
  html += `<div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:12px;">`;
  html += `<div style="font-weight:900;color:var(--navy);margin-bottom:6px;">Discrepancy Breakdown</div>`;
  html += `<div style="font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:8px;">If Active is higher than Roster, it is usually caused by students engaging under accounts not on the official roster, or duplicate accounts sharing the same ID/email.</div>`;
  html += renderKeyValue('Active accounts', Number(stats?.activeCount || 0));
  html += renderKeyValue('Active unique (ID/email/uid)', Number(stats?.activeUniqueCount || 0));
  html += renderKeyValue('Duplicate active accounts', Number(stats?.activeDuplicateAccounts || 0));
  html += renderKeyValue('Roster rows', Number(stats?.rosterCount || 0));
  html += renderKeyValue('Roster unique (ID/email)', Number(stats?.rosterUniqueCount || 0));
  html += renderKeyValue('Duplicate roster rows', Number(stats?.rosterDuplicateRows || 0));
  html += renderKeyValue('Active − Roster', Number(stats?.deltaActiveMinusRoster || 0));
  html += `<div style="font-size:11px;color:var(--muted);margin-top:6px;">Duplicate breakdown (approx): Active extra via ID ${Number(stats?.activeDuplicateIdExtra || 0)}, via email ${Number(stats?.activeDuplicateEmailExtra || 0)}.</div>`;
  html += `<div style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;">`;
  html += `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;">`;
  html += `<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Active Matching</div>`;
  html += renderKeyValue('Matched by ID', Number(stats?.activeMatchedById || 0));
  html += renderKeyValue('Matched by Email', Number(stats?.activeMatchedByEmail || 0));
  html += renderKeyValue('Unmatched (has ID)', Number(stats?.activeUnmatchedWithId || 0));
  html += renderKeyValue('Unmatched (email only)', Number(stats?.activeUnmatchedEmailOnly || 0));
  html += renderKeyValue('Missing ID + Email', Number(stats?.activeMissingBoth || 0));
  html += `</div>`;
  html += `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;">`;
  html += `<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Roster Matching</div>`;
  html += renderKeyValue('Matched by ID', Number(stats?.rosterMatchedById || 0));
  html += renderKeyValue('Matched by Email', Number(stats?.rosterMatchedByEmail || 0));
  html += renderKeyValue('Unmatched (has ID)', Number(stats?.rosterUnmatchedWithId || 0));
  html += renderKeyValue('Unmatched (email only)', Number(stats?.rosterUnmatchedEmailOnly || 0));
  html += renderKeyValue('Missing ID + Email', Number(stats?.rosterMissingBoth || 0));
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;

  html += `<details style="margin:0 0 12px 0;"><summary style="cursor:pointer;font-weight:900;color:var(--navy);">Potential duplicates (often inflate counts)</summary>`;
  html += `<div style="margin-top:10px;display:grid;grid-template-columns:1fr;gap:12px;">`;
  html += `<div><div style="font-weight:900;color:var(--navy);">Active duplicate student numbers</div>${renderDupes(duplicates?.active?.ids || [], renderActiveLine)}</div>`;
  html += `<div><div style="font-weight:900;color:var(--navy);">Active duplicate emails</div>${renderDupes(duplicates?.active?.emails || [], renderActiveLine)}</div>`;
  html += `<div><div style="font-weight:900;color:var(--navy);">Roster duplicate student numbers</div>${renderDupes(duplicates?.roster?.ids || [], renderRosterLine)}</div>`;
  html += `<div><div style="font-weight:900;color:var(--navy);">Roster duplicate emails</div>${renderDupes(duplicates?.roster?.emails || [], renderRosterLine)}</div>`;
  html += `</div>`;
  html += `</details>`;

  html += `<details style="margin:0 0 12px 0;"><summary style="cursor:pointer;font-weight:900;color:var(--navy);">Active mismatch details</summary>`;
  html += `<div style="margin-top:10px;">`;
  html += `<div style="font-weight:900;color:var(--navy);">Unmatched Active (has ID) (${(breakdownActive?.unmatchedWithId || []).length})</div>`;
  html += renderList(breakdownActive?.unmatchedWithId || [], renderActiveLine);
  html += `<div style="font-weight:900;color:var(--navy);">Unmatched Active (email only) (${(breakdownActive?.unmatchedEmailOnly || []).length})</div>`;
  html += renderList(breakdownActive?.unmatchedEmailOnly || [], renderActiveLine);
  html += `<div style="font-weight:900;color:var(--navy);">Active missing ID + email (${(breakdownActive?.missingBoth || []).length})</div>`;
  html += renderList(breakdownActive?.missingBoth || [], renderActiveLine);
  html += `</div>`;
  html += `</details>`;

  html += `<details style="margin:0 0 12px 0;"><summary style="cursor:pointer;font-weight:900;color:var(--navy);">Roster mismatch details</summary>`;
  html += `<div style="margin-top:10px;">`;
  html += `<div style="font-weight:900;color:var(--navy);">Unmatched Roster (has ID) (${(breakdownRoster?.unmatchedWithId || []).length})</div>`;
  html += renderList(breakdownRoster?.unmatchedWithId || [], renderRosterLine);
  html += `<div style="font-weight:900;color:var(--navy);">Unmatched Roster (email only) (${(breakdownRoster?.unmatchedEmailOnly || []).length})</div>`;
  html += renderList(breakdownRoster?.unmatchedEmailOnly || [], renderRosterLine);
  html += `<div style="font-weight:900;color:var(--navy);">Roster missing ID + email (${(breakdownRoster?.missingBoth || []).length})</div>`;
  html += renderList(breakdownRoster?.missingBoth || [], renderRosterLine);
  html += `</div>`;
  html += `</details>`;

  html += `<h3 style="margin:14px 0 8px 0;">Active but not in roster (${anomaliesActive.length})</h3>`;
  html += `<div style="font-size:12px;color:#9a3412;line-height:1.6;margin-bottom:8px;">Under the roster-only membership policy, these student accounts are cleanup candidates unless they are reconciled to an active roster row.</div>`;
  html += renderList(anomaliesActive, renderActiveLine);
  html += `<details style="margin:12px 0 0 0;"><summary style="cursor:pointer;font-weight:900;color:#991b1b;">Placeholder Student_* accounts not in roster (${placeholderActiveNoWork.length + placeholderActiveWithWork.length})</summary>`;
  html += `<div style="margin-top:10px;">`;
  html += `<div style="margin-bottom:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">`;
  html += `<div style="font-size:12px;color:#166534;font-weight:800;">No work: ${placeholderActiveNoWork.length}</div>`;
  html += `<div style="font-size:12px;color:#9a3412;font-weight:800;">Has work: ${placeholderActiveWithWork.length}</div>`;
  html += `${placeholderActiveNoWork.length ? `<button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;background:#991b1b;border-color:#991b1b;color:white;" onclick="_hardDeletePlaceholderNoWorkAccounts()">Hard Delete No-Work Placeholders (${placeholderActiveNoWork.length})</button>` : ''}`;
  html += `</div>`;
  html += `<div style="font-weight:900;color:#166534;">Placeholder accounts with no work</div>`;
  html += renderPlaceholderRows(placeholderActiveNoWork, { allowDelete: true });
  html += `<div style="font-weight:900;color:#9a3412;">Placeholder accounts with work - review before delete</div>`;
  html += renderPlaceholderRows(placeholderActiveWithWork, { allowDelete: false });
  html += `</div>`;
  html += `</details>`;
  html += `<h3 style="margin:14px 0 8px 0;">Roster but not active (${anomaliesRoster.length})</h3>`;
  html += renderList(anomaliesRoster, renderRosterLine);
  html += `<details style="margin-top:12px;"><summary style="cursor:pointer;font-weight:800;">Missing IDs (${invalidActive.length + invalidRoster.length})</summary>`;
  html += `<div style="margin-top:10px;"><div style="font-weight:800;">Active missing ID + email (${invalidActive.length})</div>${renderList(invalidActive, renderActiveLine)}</div>`;
  html += `<div style="margin-top:10px;"><div style="font-weight:800;">Roster missing ID + email (${invalidRoster.length})</div>${renderList(invalidRoster, renderRosterLine)}</div>`;
  html += `</details>`;
  const modal = document.createElement('div');
  modal.id = 'compare-students-modal';
  modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style='background:white;padding:24px;border-radius:12px;max-width:720px;max-height:80vh;overflow:auto;'>${html}<button class='btn-prev' style='margin-top:16px;' onclick='document.getElementById(\"compare-students-modal\")?.remove()'>Close</button></div>`;
  document.body.appendChild(modal);
};
window.compareStudentLists = function () {
  const activeStudents = Array.isArray(_cachedStudents) ? _cachedStudents : [];
  const rosterRows = Array.isArray(_tgmClassRosterCache) ? _tgmClassRosterCache : [];

  const warnings = [];
  if (!activeStudents.length) warnings.push('No active students loaded. Open Cohort Overview/Analytics first, then retry.');
  if (!rosterRows.length) warnings.push('No roster loaded. Open Class Roster and click Load Current (or Save Roster), then retry.');

  const normId = (v) => {
    const digits = String(v || '').replace(/\D+/g, '').trim();
    if (!digits) return '';
    const stripped = digits.replace(/^0+/, '');
    return stripped || '';
  };

  const normEmailKey = (v) => {
    const email = _normEmail(v || '');
    return email ? `email:${email}` : '';
  };

  const normIdKey = (v) => {
    const id = normId(v);
    return id ? `id:${id}` : '';
  };

  const activeKeys = (s) => {
    const keys = [];
    const idKey = normIdKey(s?.studentNumber || s?.studentId || s?.studentNo);
    if (idKey) keys.push(idKey);
    const emailKey = normEmailKey(s?.email);
    if (emailKey) keys.push(emailKey);
    return keys;
  };

  const rosterKeys = (r) => {
    const keys = [];
    const idKey = normIdKey(r?.studentId || r?.studentNumber || r?.studentNo);
    if (idKey) keys.push(idKey);
    const emailKey = normEmailKey(r?.email);
    if (emailKey) keys.push(emailKey);
    return keys;
  };

  const _collectDuplicates = (rows, keyFn) => {
    const byKey = new Map();
    rows.forEach((row) => {
      const key = keyFn(row);
      if (!key) return;
      const list = byKey.get(key) || [];
      list.push(row);
      byKey.set(key, list);
    });
    const dupes = [];
    byKey.forEach((list, key) => {
      if (list.length >= 2) dupes.push({ key, count: list.length, rows: list });
    });
    dupes.sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
    return dupes;
  };
  const _isPlaceholderStudentRow = (row = {}) => {
    const name = String(row?.name || '').trim();
    const email = String(row?.email || '').trim();
    const authEmail = String(row?.authEmail || row?.username || '').trim();
    const studentNumber = String(row?.studentNumber || row?.studentId || row?.studentNo || '').trim();
    return /^Student_/i.test(name) && !studentNumber && (!email || email === 'N/A') && !authEmail;
  };
  const _compareRowWorkScore = (row = {}) => {
    if (Number.isFinite(Number(row?.workScore))) return Number(row.workScore);
    let score = 0;
    score += Number(row?.pct || 0) > 0 ? 2 : 0;
    score += Number(row?.completedCount || 0) * 3;
    score += Number(row?.totalAnnotations || 0) > 0 ? 2 : 0;
    score += Number(row?.tutorialSessionContribTotal || 0);
    score += Number(row?.tutorialCheckinsToday || 0);
    score += Array.isArray(row?.escalations) ? row.escalations.length : 0;
    score += Array.isArray(row?.outcomes) ? row.outcomes.length : 0;
    return score;
  };

  const invalidActive = [];
  const invalidRoster = [];

  const activeKeySet = new Set();
  let activeWithId = 0;
  let activeWithEmail = 0;
  activeStudents.forEach((s) => {
    const keys = activeKeys(s);
    if (!keys.length) invalidActive.push(s);
    keys.forEach((k) => activeKeySet.add(k));
    if (normId(s?.studentNumber || s?.studentId || s?.studentNo)) activeWithId += 1;
    if (_normEmail(s?.email || '')) activeWithEmail += 1;
  });

  const rosterKeySet = new Set();
  let rosterWithId = 0;
  let rosterWithEmail = 0;
  const activeRosterRows = rosterRows.filter((r) => r?.active !== false);
  activeRosterRows.forEach((r) => {
    const keys = rosterKeys(r);
    if (!keys.length) invalidRoster.push(r);
    keys.forEach((k) => rosterKeySet.add(k));
    if (normId(r?.studentId || r?.studentNumber || r?.studentNo)) rosterWithId += 1;
    if (_normEmail(r?.email || '')) rosterWithEmail += 1;
  });

  // Helpful discrepancy explanation: duplicates often inflate "active" counts.
  const activeDupIds = _collectDuplicates(activeStudents, (s) => normId(s?.studentNumber || s?.studentId || s?.studentNo));
  const activeDupEmails = _collectDuplicates(activeStudents, (s) => _normEmail(s?.email || ''));
  const rosterDupIds = _collectDuplicates(activeRosterRows, (r) => normId(r?.studentId || r?.studentNumber || r?.studentNo));
  const rosterDupEmails = _collectDuplicates(activeRosterRows, (r) => _normEmail(r?.email || ''));

  const _dupeExtraCount = (dupes = []) => {
    if (!Array.isArray(dupes) || !dupes.length) return 0;
    return dupes.reduce((sum, d) => sum + Math.max(0, Number(d?.count || 0) - 1), 0);
  };

  const _uniqueKeyForActive = (s) => {
    const id = normId(s?.studentNumber || s?.studentId || s?.studentNo);
    if (id) return `id:${id}`;
    const email = _normEmail(s?.email || '');
    if (email) return `email:${email}`;
    const uid = String(s?.uid || '').trim();
    return uid ? `uid:${uid}` : '';
  };

  const _uniqueKeyForRoster = (r) => {
    const id = normId(r?.studentId || r?.studentNumber || r?.studentNo);
    if (id) return `id:${id}`;
    const email = _normEmail(r?.email || '');
    if (email) return `email:${email}`;
    return '';
  };

  const activeUniqueSet = new Set(activeStudents.map(_uniqueKeyForActive).filter(Boolean));
  const rosterUniqueSet = new Set(activeRosterRows.map(_uniqueKeyForRoster).filter(Boolean));

  const _matchTypeForActive = (s) => {
    const keys = activeKeys(s);
    if (!keys.length) return { matched: false, mode: 'missing' };
    const idKey = keys.find((k) => String(k).startsWith('id:')) || '';
    const emailKey = keys.find((k) => String(k).startsWith('email:')) || '';
    if (idKey && rosterKeySet.has(idKey)) return { matched: true, mode: 'id' };
    if (emailKey && rosterKeySet.has(emailKey)) return { matched: true, mode: 'email' };
    return { matched: false, mode: idKey ? 'unmatched_id' : 'unmatched_email' };
  };

  const _matchTypeForRoster = (r) => {
    const keys = rosterKeys(r);
    if (!keys.length) return { matched: false, mode: 'missing' };
    const idKey = keys.find((k) => String(k).startsWith('id:')) || '';
    const emailKey = keys.find((k) => String(k).startsWith('email:')) || '';
    if (idKey && activeKeySet.has(idKey)) return { matched: true, mode: 'id' };
    if (emailKey && activeKeySet.has(emailKey)) return { matched: true, mode: 'email' };
    return { matched: false, mode: idKey ? 'unmatched_id' : 'unmatched_email' };
  };

  const breakdownActive = {
    matchedById: [],
    matchedByEmail: [],
    unmatchedWithId: [],
    unmatchedEmailOnly: [],
    missingBoth: [],
  };

  activeStudents.forEach((s) => {
    const mt = _matchTypeForActive(s);
    if (mt.matched && mt.mode === 'id') breakdownActive.matchedById.push(s);
    else if (mt.matched && mt.mode === 'email') breakdownActive.matchedByEmail.push(s);
    else if (!mt.matched && mt.mode === 'unmatched_id') breakdownActive.unmatchedWithId.push(s);
    else if (!mt.matched && mt.mode === 'unmatched_email') breakdownActive.unmatchedEmailOnly.push(s);
    else breakdownActive.missingBoth.push(s);
  });

  const anomaliesActive = breakdownActive.unmatchedWithId.concat(breakdownActive.unmatchedEmailOnly);
  const placeholderActiveRows = anomaliesActive.filter((row) => _isPlaceholderStudentRow(row));
  const placeholderActiveNoWork = placeholderActiveRows.filter((row) => _compareRowWorkScore(row) <= 0);
  const placeholderActiveWithWork = placeholderActiveRows.filter((row) => _compareRowWorkScore(row) > 0);

  const anomaliesRoster = rosterRows
    .filter((r) => r?.active !== false)
    .filter((r) => {
      const mt = _matchTypeForRoster(r);
      return !mt.matched && mt.mode !== 'missing';
    });

  const breakdownRoster = {
    matchedById: [],
    matchedByEmail: [],
    unmatchedWithId: [],
    unmatchedEmailOnly: [],
    missingBoth: [],
  };

  activeRosterRows.forEach((r) => {
    const mt = _matchTypeForRoster(r);
    if (mt.matched && mt.mode === 'id') breakdownRoster.matchedById.push(r);
    else if (mt.matched && mt.mode === 'email') breakdownRoster.matchedByEmail.push(r);
    else if (!mt.matched && mt.mode === 'unmatched_id') breakdownRoster.unmatchedWithId.push(r);
    else if (!mt.matched && mt.mode === 'unmatched_email') breakdownRoster.unmatchedEmailOnly.push(r);
    else breakdownRoster.missingBoth.push(r);
  });

  const stats = {
    activeCount: activeStudents.length,
    rosterCount: activeRosterRows.length,
    activeUniqueCount: activeUniqueSet.size,
    rosterUniqueCount: rosterUniqueSet.size,
    activeDuplicateAccounts: Math.max(0, activeStudents.length - activeUniqueSet.size),
    rosterDuplicateRows: Math.max(0, activeRosterRows.length - rosterUniqueSet.size),
    activeDuplicateIdExtra: _dupeExtraCount(activeDupIds),
    activeDuplicateEmailExtra: _dupeExtraCount(activeDupEmails),
    rosterDuplicateIdExtra: _dupeExtraCount(rosterDupIds),
    rosterDuplicateEmailExtra: _dupeExtraCount(rosterDupEmails),
    activeWithId,
    activeWithEmail,
    rosterWithId,
    rosterWithEmail,
    deltaActiveMinusRoster: activeStudents.length - activeRosterRows.length,
    activeMatchedById: breakdownActive.matchedById.length,
    activeMatchedByEmail: breakdownActive.matchedByEmail.length,
    activeUnmatchedWithId: breakdownActive.unmatchedWithId.length,
    activeUnmatchedEmailOnly: breakdownActive.unmatchedEmailOnly.length,
    activeMissingBoth: breakdownActive.missingBoth.length,
    rosterMatchedById: breakdownRoster.matchedById.length,
    rosterMatchedByEmail: breakdownRoster.matchedByEmail.length,
    rosterUnmatchedWithId: breakdownRoster.unmatchedWithId.length,
    rosterUnmatchedEmailOnly: breakdownRoster.unmatchedEmailOnly.length,
    rosterMissingBoth: breakdownRoster.missingBoth.length,
  };

  return {
    anomaliesActive,
    anomaliesRoster,
    invalidActive,
    invalidRoster,
    warnings,
    stats,
    breakdownActive,
    breakdownRoster,
    placeholderActiveNoWork,
    placeholderActiveWithWork,
    duplicates: {
      active: { ids: activeDupIds, emails: activeDupEmails },
      roster: { ids: rosterDupIds, emails: rosterDupEmails },
    },
  };
};
// src/dashboards/lecturer.js
// ─────────────────────────────────────────────
// Lecturer Dashboard — Contact Session Plans (90 min)
// Visible only to users with role [lecturer]
// ─────────────────────────────────────────────
import { SESSIONS, SESSION_META } from '../../content/sessions/sessions.js';
import { UNITS } from '../../content/units/index.js';
import * as assessmentConfigs from '../../content/assessments/index.js';
import { renderSessionPlan } from '../components/session-plan.js';
import { auth, db, functions } from '../firebase.js';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ref, get, set, update, remove } from 'firebase/database';
import { SEED_RESOURCES } from '../../content/resources.js';
import { addResource, vettResource, removeResource } from '../resources.js';
import { TUTOR_GROUP_ASSIGNMENTS } from '../../content/tutorial-groups/assignments.js';
import { STATE, saveState } from '../state.js';
import { uploadGalleryAsset } from '../gallery.js';
import { rebuildDerivedMetricsForDate } from '../analytics.js';
import { generateQrDataUrl } from '../qr.js';
import { downloadXlsx } from '../xlsx.js';
import { renderGoLiveToggle } from '../components/chat-panel.js';
import { autoCloseDashboardSidebar, initDashboardFocusChrome } from './dashboard-focus.js';
import {
  addMemberToCollaborationGroup,
  archiveCollaborationScope,
  createManagedCollaborationGroup,
  deleteCollaborationGroup,
  getArchivedCollaborationScope,
  getCollaborationScope,
  moveCollaborationMember,
  normalizeCollaborationGroupName,
  removeCollaborationMember,
  renameCollaborationGroup,
  startFreshCollaborationCycle,
  transferCollaborationGroupLeader,
} from '../collaboration-groups.js';

const _LECTURER_COLLAB_SCOPE_CATALOG = [
  {
    id: 'assessment-a1',
    label: 'Assessment 1 Collaboration Space',
    description: 'Media Intelligence Brief group formation, artefacts, and collaboration chat.',
    compact: true,
    compactLabel: 'Assessment 1 groups',
  },
  {
    id: 'assessment-a2',
    label: 'Assessment 2 Collaboration Space',
    description: 'Research Archaeology Report group formation, artefacts, and collaboration chat.',
  },
];

function _summarizeCollaborationScopeGroups(groups = {}) {
  const entries = Object.values(groups || {});
  return {
    groups: entries.length,
    members: entries.reduce((sum, group) => sum + Object.keys(group?.members || {}).length, 0),
    artefacts: entries.reduce((sum, group) => sum + Object.keys(group?.artefacts || {}).length, 0),
  };
}

const PROMOTION_WHATSAPP_WEBHOOK_URL = String(import.meta.env.VITE_WHATSAPP_PROMOTION_WEBHOOK_URL || '').trim();

let _activeSession = 'c1';
let _analyticsAutoRefreshEnabled = false;
let _analyticsAutoRefreshTimer = null;
window._lecturerExpandedCollabScopes = window._lecturerExpandedCollabScopes || {};
const _ROSTER_RESET_ALERT_DISMISS_PREFIX = 'lecturer-roster-reset-alert-dismissed:';

function _normEmail(v = '') {
  return String(v || '').trim().toLowerCase();
}

function _rosterResetAlertDismissKey(dateKey = '') {
  return `${_ROSTER_RESET_ALERT_DISMISS_PREFIX}${String(dateKey || '').trim()}`;
}

function _getRosterResetAlertDismissedCount(dateKey = '') {
  if (!dateKey) return 0;
  try {
    const raw = window.localStorage.getItem(_rosterResetAlertDismissKey(dateKey));
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

window._dismissRosterResetAlert = function (dateKey, count) {
  if (!dateKey) return;
  try {
    window.localStorage.setItem(_rosterResetAlertDismissKey(dateKey), String(Math.max(0, Number(count || 0))));
  } catch {
    // ignore storage failures
  }
  document.getElementById('lecturer-roster-reset-alert')?.remove();
};

function _eventTimestampMs(eventRow = {}) {
  const candidates = [eventRow?.at, eventRow?.createdAt, eventRow?.timestamp, eventRow?.occurredAt];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return NaN;
}

function _isReasonableTrafficTimestamp(tsMs, nowMs = Date.now()) {
  if (!Number.isFinite(tsMs)) return false;
  return tsMs <= (nowMs + 5 * 60 * 1000);
}

function _normName(v = '') {
  return String(v || '').split(' [')[0].trim().toLowerCase();
}

function _profileMergeFieldLabel(field = '') {
  return STUDENT_PROFILE_FIELD_LABELS[field] || ({
    tutorialGroup: 'Tutorial group',
    firstName: 'First name',
    lastName: 'Last name',
    name: 'Full name',
    displayName: 'Display name',
  }[field] || field);
}

function _syncReviewIdentity(row = {}) {
  const profile = row?.mergedProfile || row?.existingProfile || {};
  const roster = row?.rosterEntry || {};
  return {
    displayName: String(profile.displayName || row?.existingProfile?.displayName || row?.uid || '').trim(),
    username: String(profile.username || profile.authEmail || row?.existingProfile?.username || row?.existingProfile?.authEmail || row?.existingProfile?.email || '').trim(),
    personalEmail: String(profile.personalEmail || profile.email || row?.existingProfile?.personalEmail || row?.existingProfile?.email || '').trim(),
    authEmail: String(profile.authEmail || profile.username || row?.existingProfile?.authEmail || row?.existingProfile?.username || '').trim(),
    studentId: String(profile.studentId || profile.studentNumber || row?.existingProfile?.studentId || row?.existingProfile?.studentNumber || '').trim(),
    tutorialGroup: String(profile.tutorialGroup || row?.existingProfile?.tutorialGroup || roster?.tutorialGroup || '').trim().toUpperCase(),
    rosterName: String(roster?.name || [roster?.firstName, roster?.lastName].filter(Boolean).join(' ') || '').trim(),
    rosterEmail: String(roster?.email || '').trim(),
    rosterUsername: String(roster?.username || '').trim(),
    rosterStudentId: String(roster?.studentId || roster?.studentNumber || roster?.studentNo || '').trim(),
  };
}

function _studentWorkScore(state = {}) {
  const progress = state?.progress || {};
  const visited = Object.values(progress).filter((p) => p?.visited).length;
  const completed = Object.values(progress).filter((p) => p?.readingComplete || p?.assessmentSubmitted).length;
  const tutorialNotes = Object.keys(state?.tutorialNotebook?.entries || {}).length;
  const contactNotes = Object.keys(state?.contactNotebook?.entries || {}).length;
  const attendanceDays = Object.keys(state?.attendance?.byDate || {}).length;
  const tutorChats = Object.keys(state?.tutorChats || {}).length;
  return (visited * 2) + (completed * 3) + (tutorialNotes * 2) + (contactNotes * 2) + attendanceDays + tutorChats;
}

function _hasMeaningfulStudentState(state = {}) {
  return _studentWorkScore(state) > 0;
}

function _profileArchiveReason(group = {}, candidate = {}) {
  const key = String(group?.keyLabel || group?.key || 'duplicate profile');
  return `Archived duplicate student account matched on ${key}. Existing work-preserving account retained.`;
}

function _rowAuthIdentity(row = {}) {
  return String(
    row?.mergedProfile?.authEmail
    || row?.mergedProfile?.username
    || row?.existingProfile?.authEmail
    || row?.existingProfile?.username
    || row?.existingProfile?.email
    || ''
  ).trim();
}

function _isNonUjDuplicateCandidate(row = {}) {
  const identity = _rowAuthIdentity(row);
  return !identity || !isValidStudentUsername(identity);
}

async function _hardDeleteUserAccountRecord(uid, audit = {}) {
  if (!uid) throw new Error('Missing UID for account delete.');
  const deleteUserAccount = httpsCallable(functions, 'deleteUserAccountRecord');
  await deleteUserAccount({
    uid,
    audit: _cleanFirebaseValue({
      deletedByName: STATE.user?.displayName || STATE.user?.email || null,
      ...audit,
    }),
  });
}

function _cleanFirebaseValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => _cleanFirebaseValue(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, _cleanFirebaseValue(val)])
        .filter(([, val]) => val !== undefined)
    );
  }
  return value === undefined ? undefined : value;
}

function _generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let generated = '';
  for (let i = 0; i < 12; i += 1) {
    generated += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return generated;
}

function _rosterStudentIdValue(row = {}) {
  return String(row?.studentId || row?.studentNumber || row?.studentNo || '').trim();
}

function _rosterDisplayName(row = {}) {
  return String(row?.name || [row?.firstName, row?.lastName].filter(Boolean).join(' ') || '').trim();
}

function _canonicalRosterAuthEmail(row = {}) {
  const rawUsername = String(row?.username || '').trim();
  if (rawUsername) return normalizeStudentUsername(rawUsername);

  const rawEmail = _normEmail(row?.email || '');
  if (/^[^\s@]+@student\.uj(?:\.ac)?\.za$/i.test(rawEmail)) {
    return normalizeStudentUsername(rawEmail);
  }

  const studentId = _rosterStudentIdValue(row);
  if (studentId) return normalizeStudentUsername(studentId);
  return '';
}

function _buildRosterEnrollmentReport(users = {}, rosterRows = []) {
  const report = {
    generatedAt: new Date().toISOString(),
    totalRosterRows: 0,
    readyRows: [],
    existingMatches: [],
    newAccounts: [],
    invalidRows: [],
    conflicts: [],
  };

  const studentProfiles = Object.entries(users || {})
    .filter(([, user]) => _roleFromProfile(user) === 'student')
    .map(([uid, user]) => {
      const existingProfile = user?.profile || {};
      return {
        uid,
        user,
        existingProfile,
        studentId: String(existingProfile?.studentId || existingProfile?.studentNumber || existingProfile?.studentNo || '').trim(),
        authEmail: _normEmail(existingProfile?.authEmail || existingProfile?.username || existingProfile?.email || ''),
        personalEmail: _normEmail(existingProfile?.personalEmail || (existingProfile?.email !== existingProfile?.authEmail ? existingProfile?.email : '')),
      };
    });

  const byStudentId = new Map();
  const byAuthEmail = new Map();
  const byPersonalEmail = new Map();
  const pushMatch = (map, key, row) => {
    if (!key) return;
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  };

  studentProfiles.forEach((row) => {
    pushMatch(byStudentId, row.studentId, row);
    pushMatch(byAuthEmail, row.authEmail, row);
    pushMatch(byPersonalEmail, row.personalEmail, row);
  });

  const claimedUids = new Set();
  const claimedEmails = new Set();
  const activeRosterRows = Array.isArray(rosterRows) ? rosterRows.filter((row) => row?.active !== false) : [];
  report.totalRosterRows = activeRosterRows.length;

  activeRosterRows.forEach((row, index) => {
    const rowNo = index + 1;
    const authEmail = _canonicalRosterAuthEmail(row);
    const personalEmail = _normEmail(row?.email || '');
    const studentId = _rosterStudentIdValue(row);
    const displayName = _rosterDisplayName(row) || authEmail || `Roster row ${rowNo}`;

    if (!authEmail) {
      report.invalidRows.push({ row, rowNo, reason: 'Missing UJ username and student number. Add a username or student ID.' });
      return;
    }
    if (!isValidStudentUsername(authEmail)) {
        report.invalidRows.push({ row, rowNo, authEmail, reason: `Invalid UJ username "${authEmail}". Use a student number or @student.uj.ac.za email.` });
      return;
    }
    if (claimedEmails.has(authEmail)) {
      report.invalidRows.push({ row, rowNo, authEmail, reason: `Duplicate roster target "${authEmail}". Resolve duplicate roster usernames before rollout.` });
      return;
    }

    const matched = new Map();
    const addCandidates = (rows = []) => rows.forEach((candidate) => matched.set(candidate.uid, candidate));
    addCandidates(byStudentId.get(studentId) || []);
    addCandidates(byAuthEmail.get(authEmail) || []);
    addCandidates(byPersonalEmail.get(personalEmail) || []);
    const candidates = [...matched.values()];

    if (candidates.length > 1) {
      report.conflicts.push({
        row,
        rowNo,
        authEmail,
        studentId,
        displayName,
        candidates,
        reason: 'Roster row matches multiple student accounts. Review manually before rollout.',
      });
      return;
    }

    const existing = candidates[0] || null;
    if (existing?.existingProfile?.disabled) {
      report.invalidRows.push({
        row,
        rowNo,
        authEmail,
        existing,
        reason: 'Matched a disabled student account. Restore or review that profile before rollout.',
      });
      return;
    }
    if (existing && claimedUids.has(existing.uid)) {
      report.conflicts.push({
        row,
        rowNo,
        authEmail,
        studentId,
        displayName,
        candidates: [existing],
        reason: 'Another roster row already targets this student account. Review duplicate roster identities first.',
      });
      return;
    }

    const mergedProfile = buildStudentProfileDraft(
      { uid: existing?.uid || null, email: authEmail },
      existing?.existingProfile || {},
      row,
      {
        authEmail,
        username: authEmail,
        email: personalEmail,
        personalEmail,
        studentId,
      }
    );

    const item = {
      row,
      rowNo,
      authEmail,
      personalEmail,
      studentId,
      displayName,
      existing,
      uid: existing?.uid || null,
      mergedProfile,
      missingFields: getIncompleteStudentFields(mergedProfile),
    };

    report.readyRows.push(item);
    if (existing) {
      report.existingMatches.push(item);
      claimedUids.add(existing.uid);
    } else {
      report.newAccounts.push(item);
    }
    claimedEmails.add(authEmail);
  });

  return report;
}

function _setRosterSyncBusy(message = 'Processing roster update...') {
  const modal = document.getElementById('roster-profile-sync-modal');
  if (!modal) return;

  let overlay = document.getElementById('roster-profile-sync-busy');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'roster-profile-sync-busy';
    overlay.style.cssText = `
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(248,250,252,0.82); backdrop-filter:blur(2px); z-index:5;
      border-radius:18px;
    `;
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 28px;background:white;border:1px solid var(--border);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.12);min-width:260px;">
        <div style="width:34px;height:34px;border:4px solid #cbd5e1;border-top-color:#1d4ed8;border-radius:50%;animation: rosterSyncSpin 0.9s linear infinite;"></div>
        <div id="roster-profile-sync-busy-text" style="font-size:13px;font-weight:700;color:var(--navy);text-align:center;line-height:1.5;"></div>
      </div>
    `;
    if (!document.getElementById('roster-sync-busy-style')) {
      const style = document.createElement('style');
      style.id = 'roster-sync-busy-style';
      style.textContent = '@keyframes rosterSyncSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    const panel = modal.firstElementChild;
    if (panel) {
      panel.style.position = 'relative';
      panel.appendChild(overlay);
    }
  }

  const text = document.getElementById('roster-profile-sync-busy-text');
  if (text) text.textContent = String(message || 'Processing roster update...');
  overlay.style.display = 'flex';
}

function _clearRosterSyncBusy() {
  const overlay = document.getElementById('roster-profile-sync-busy');
  if (overlay) overlay.style.display = 'none';
}

function _setRosterProfileSyncStatus(message, type = 'success') {
  _rosterProfileSyncLastStatus = {
    message: String(message || ''),
    type: String(type || 'success').toLowerCase() === 'warn' ? 'warn' : 'success',
    at: new Date().toISOString(),
  };
}

function _buildRosterProfileSyncReport(users = {}, rosterRows = []) {
  const report = {
    generatedAt: new Date().toISOString(),
    rosterCount: Array.isArray(rosterRows) ? rosterRows.length : 0,
    studentCount: 0,
    syncedAwaitingConfirmation: [],
    matchedHigh: [],
    matchedMedium: [],
    unmatched: [],
    duplicateGroups: [],
    safeArchiveCandidates: [],
    invalidNonUjDuplicateCandidates: [],
    reviewDuplicates: [],
  };

  const studentRows = Object.entries(users || {})
    .filter(([, user]) => _roleFromProfile(user) === 'student')
    .map(([uid, user]) => {
      const existingProfile = user?.profile || {};
      const authEmail = _normEmail(existingProfile?.authEmail || existingProfile?.username || existingProfile?.email || '');
      const personalEmail = _normEmail(existingProfile?.personalEmail || (existingProfile?.email !== authEmail ? existingProfile?.email : ''));
      const studentId = String(existingProfile?.studentId || existingProfile?.studentNumber || existingProfile?.studentNo || '').trim();
      const rosterEntry = findRosterEntry(rosterRows, {
        authEmail,
        username: existingProfile?.username || authEmail,
        email: personalEmail,
        personalEmail,
        studentId,
      });

      let confidence = 'none';
      let matchedBy = '';
      if (rosterEntry) {
        const rosterId = String(rosterEntry?.studentId || rosterEntry?.studentNumber || rosterEntry?.studentNo || '').trim();
        const rosterUsername = _normEmail(rosterEntry?.username || '');
        const rosterPersonalEmail = _normEmail(rosterEntry?.email || '');
        if (studentId && rosterId && studentId === rosterId) {
          confidence = 'high';
          matchedBy = 'student ID';
        } else if (authEmail && (rosterUsername === authEmail || rosterPersonalEmail === authEmail)) {
          confidence = 'high';
          matchedBy = 'username';
        } else if (existingProfile?.username && rosterUsername && _normEmail(existingProfile.username) === rosterUsername) {
          confidence = 'high';
          matchedBy = 'username';
        } else if (personalEmail && rosterPersonalEmail && personalEmail === rosterPersonalEmail) {
          confidence = 'medium';
          matchedBy = 'personal email';
        }
      }

      const mergedProfile = rosterEntry
        ? buildStudentProfileDraft({ uid, email: authEmail || existingProfile?.email || '' }, existingProfile, rosterEntry, {
          authEmail: authEmail || existingProfile?.email || '',
          username: existingProfile?.username || authEmail || rosterEntry?.username || '',
        })
        : buildStudentProfileDraft({ uid, email: authEmail || existingProfile?.email || '' }, existingProfile, {}, {
          authEmail: authEmail || existingProfile?.email || '',
          username: existingProfile?.username || authEmail || '',
        });

      const trackedFields = [
        'initials', 'surname', 'username', 'email', 'personalEmail', 'authEmail',
        'studentId', 'studentNumber', 'tutorialGroup', 'firstName', 'lastName', 'name', 'displayName',
      ];
      const changedFields = trackedFields.filter((field) => {
        const before = String(existingProfile?.[field] || '').trim();
        const after = String(mergedProfile?.[field] || '').trim();
        return before !== after;
      });
      const missingFields = getIncompleteStudentFields(mergedProfile);
      const workScore = _studentWorkScore(user?.state || {});
      const alreadySynced = Boolean(existingProfile?.needsProfileReview && existingProfile?.rosterLinkedAt);
      return {
        uid,
        user,
        existingProfile,
        rosterEntry,
        confidence,
        matchedBy,
        mergedProfile,
        changedFields,
        missingFields,
        workScore,
        hasWork: _hasMeaningfulStudentState(user?.state || {}),
        alreadySynced,
      };
    });

  report.studentCount = studentRows.length;
  studentRows.forEach((row) => {
    if (row.alreadySynced) report.syncedAwaitingConfirmation.push(row);
    else if (row.confidence === 'high') report.matchedHigh.push(row);
    else if (row.confidence === 'medium') report.matchedMedium.push(row);
    else report.unmatched.push(row);
  });

  const dupesByKey = new Map();
  studentRows.forEach((row) => {
    const studentId = String(row?.mergedProfile?.studentId || row?.existingProfile?.studentId || row?.existingProfile?.studentNumber || '').trim();
    const username = _normEmail(row?.mergedProfile?.username || row?.mergedProfile?.authEmail || row?.existingProfile?.username || row?.existingProfile?.email || '');
    const key = studentId ? `id:${studentId}` : (username ? `username:${username}` : '');
    if (!key) return;
    const list = dupesByKey.get(key) || [];
    list.push(row);
    dupesByKey.set(key, list);
  });

  dupesByKey.forEach((rows, key) => {
    if (rows.length < 2) return;
    const ranked = [...rows].sort((a, b) => {
      if (b.workScore !== a.workScore) return b.workScore - a.workScore;
      if (Boolean(a.existingProfile?.disabled) !== Boolean(b.existingProfile?.disabled)) return a.existingProfile?.disabled ? 1 : -1;
      const aUpdated = new Date(a.existingProfile?.updatedAt || a.existingProfile?.createdAt || 0).getTime();
      const bUpdated = new Date(b.existingProfile?.updatedAt || b.existingProfile?.createdAt || 0).getTime();
      return bUpdated - aUpdated;
    });
    const keeper = ranked[0];
    const candidates = ranked.slice(1).filter((row) => !row.alreadySynced).map((row) => ({
      ...row,
      safeArchive: !row.hasWork,
    }));
    if (!candidates.length) return;
    const group = {
      key,
      keyLabel: key.startsWith('id:') ? `student ID ${key.slice(3)}` : `username ${key.slice(9)}`,
      keeper,
      candidates,
    };
    report.duplicateGroups.push(group);
    candidates.forEach((candidate) => {
      if (_isNonUjDuplicateCandidate(candidate)) {
        report.invalidNonUjDuplicateCandidates.push({ ...candidate, keeper, group });
      }
      if (candidate.safeArchive) report.safeArchiveCandidates.push({ ...candidate, keeper, group });
      else report.reviewDuplicates.push({ ...candidate, keeper, group });
    });
  });

  report.duplicateGroups.sort((a, b) => b.candidates.length - a.candidates.length);
  return report;
}

async function _sendPromotionWhatsAppWebhook(eventType, payload = {}) {
  if (!PROMOTION_WHATSAPP_WEBHOOK_URL) return;
  try {
    await fetch(PROMOTION_WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        source: 'academic-literacies',
        at: new Date().toISOString(),
        ...payload,
      }),
    });
  } catch {
    // ignore webhook failures
  }
}

function _stopAnalyticsAutoRefresh() {
  if (_analyticsAutoRefreshTimer) {
    clearInterval(_analyticsAutoRefreshTimer);
    _analyticsAutoRefreshTimer = null;
  }
}

function _startAnalyticsAutoRefresh() {
  _stopAnalyticsAutoRefresh();
  _analyticsAutoRefreshTimer = setInterval(() => {
    const mount = document.getElementById('analytics-mount');
    if (!mount || !_analyticsAutoRefreshEnabled) {
      _stopAnalyticsAutoRefresh();
      return;
    }
    _loadAnalytics();
  }, 20000);
}

function _lockDiagnosticsForStudent(student) {
  const progressObj = student?.progressObj || {};
  const unlockOverrides = progressObj.__unlockOverrides || {};
  const unlockOverridesMeta = progressObj.__unlockOverridesMeta || {};
  const surveyDone = Boolean(progressObj?.__surveys?.unit3Experience?.completed);
  const highAchiever = Number(student?.erMarks || 0) >= 15;

  return UNITS.map((unit, index) => {
    const unitProgress = progressObj[unit.id] || {};
    const visited = Boolean(unitProgress.visited);
    const readingComplete = Boolean(unitProgress.readingComplete);
    const assessmentSubmitted = Boolean(unitProgress.assessmentSubmitted);
    const override = Boolean(unlockOverrides?.[unit.id]);
    const overrideMeta = unlockOverridesMeta?.[unit.id] || null;

    if (index <= 0) {
      return {
        unitId: unit.id,
        unitBadge: unit.badge,
        unitTitle: unit.title,
        locked: false,
        override,
        overrideMeta,
        reason: 'First unit is always open.',
        requirements: [],
        visited,
        readingComplete,
        assessmentSubmitted,
      };
    }

    const requirements = [];
    const targetIsA1 = unit.id === 'a1';
    if (targetIsA1 && !surveyDone) {
      requirements.push({
        label: 'Unit 3 Student Experience Survey submitted',
        done: false,
      });
    }

    const prev = UNITS[index - 1];
    const prevProgress = progressObj[prev.id] || {};
    const prevDone = Boolean(prevProgress.readingComplete || prevProgress.assessmentSubmitted);
    if (!prevDone && !highAchiever) {
      requirements.push({
        label: `Previous unit complete (${prev.badge})`,
        done: false,
      });
    }

    const locked = requirements.some((r) => !r.done) && !override;
    const reason = override
      ? 'Unlocked by lecturer override.'
      : (locked
        ? (targetIsA1 && !surveyDone
          ? 'Assessment 1 is locked until Unit 3 survey is submitted.'
          : `Complete ${prev.badge} first.`)
        : 'Unlock requirements met.');

    return {
      unitId: unit.id,
      unitBadge: unit.badge,
      unitTitle: unit.title,
      locked,
      override,
      overrideMeta,
      reason,
      requirements,
      visited,
      readingComplete,
      assessmentSubmitted,
    };
  });
}

function _extractHeutagogyCycles(progressObj = {}) {
  const moderationMap = progressObj?.__heutagogyModeration || {};
  const rows = [];

  Object.entries(progressObj || {}).forEach(([unitId, unitProgress]) => {
    if (!/^u\d+$/i.test(String(unitId))) return;
    if (!unitProgress || typeof unitProgress !== 'object') return;
    const cycleMap = unitProgress.heutagogyCycles || {};
    Object.entries(cycleMap).forEach(([cycleId, cycle]) => {
      if (!cycle || typeof cycle !== 'object') return;
      const moderation = moderationMap?.[unitId]?.[cycleId] || null;
      rows.push({
        unitId,
        cycleId,
        goal: String(cycle.goal || '').trim(),
        pathway: String(cycle.pathway || '').trim(),
        reflection: String(cycle.reflection || '').trim(),
        evidence: String(cycle.evidence || '').trim(),
        savedAt: String(cycle.savedAt || '').trim(),
        moderation,
      });
    });
  });

  rows.sort((a, b) => {
    const atA = new Date(a.savedAt || 0).getTime();
    const atB = new Date(b.savedAt || 0).getTime();
    return atB - atA;
  });

  return rows;
}

function _heutagogySummary(progressObj = {}) {
  const rows = _extractHeutagogyCycles(progressObj);
  const total = rows.length;
  const evidenceCount = rows.filter((r) => r.evidence.length >= 10).length;
  const reflectionCount = rows.filter((r) => r.reflection.length >= 10).length;
  const approved = rows.filter((r) => String(r?.moderation?.status || '') === 'approved').length;
  const revise = rows.filter((r) => String(r?.moderation?.status || '') === 'revise').length;
  const pending = Math.max(0, total - approved - revise);
  return { total, evidenceCount, reflectionCount, approved, revise, pending };
}

window._toggleAnalyticsAutoRefresh = () => {
  _analyticsAutoRefreshEnabled = !_analyticsAutoRefreshEnabled;
  if (_analyticsAutoRefreshEnabled) _startAnalyticsAutoRefresh();
  else _stopAnalyticsAutoRefresh();

  const btn = document.getElementById('analytics-auto-refresh-btn');
  if (btn) {
    btn.textContent = _analyticsAutoRefreshEnabled ? '🟢 Auto-refresh ON (20s)' : '⚪ Auto-refresh OFF';
  }
};

export function renderLecturerDashboard(container) {
  container.innerHTML = `
    <div class="dash-wrapper">
      ${_buildSidebar('contact')}
      <div class="dash-sidebar-scrim" onclick="window._closeDashSidebar?.()"></div>
      ${_buildMobileDashboardBar()}
      <div class="dash-content" id="dash-content">
        <div id="analytics-mount"></div>
        ${_buildWelcome('lecturer')}
      </div>
    </div>`;

  // Legacy compare button is intentionally not injected here.
  // Keep the compare flow inside the Class Roster screen only.
  document.getElementById('compare-students-btn')?.remove();

  // Wire sidebar clicks
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
  renderGoLiveToggle('lecturer-go-live-mount');
  initDashboardFocusChrome();
  _loadWelcomeStats();
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

function _buildSidebar(type) {
  const isContact = type === 'contact';
  const meta = SESSION_META[type];

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
        <div class="dash-role-badge lecturer-badge">🏫 Lecturer</div>
        <div class="dash-sidebar-title">Session Planner</div>
        <div class="dash-sidebar-sub">${isContact ? '90-min contact · Flipped' : '45-min tutorial · Targeted'}</div>
        ${_buildSidebarActions()}
      </div>

      <div class="dash-session-type-bar">
        <button class="dst-btn ${isContact ? 'dst-active' : ''}"
          onclick="_switchSessionType('contact')">🏫 Contact (90m)</button>
        <button class="dst-btn ${type === 'tutorial' ? 'dst-active' : ''}"
          onclick="_switchSessionType('tutorial')">👥 Tutorial (45m)</button>
        <button class="dst-btn"
          onclick="_switchSessionType('analytics')">📊 Analytics</button>
      </div>

      ${phases.map(ph => `
        <div class="dash-phase-group">
          <div class="dash-phase-label">${ph.label}</div>
          ${ph.items.map(m => `
            <div class="dash-nav-item" data-session="${m.id}">
              <div class="dash-nav-id ${isContact ? '' : 'tutorial-id'}">${m.id.toUpperCase()}</div>
              <div class="dash-nav-label">${m.label.replace(/^[CT]\d+ — /, '')}</div>
            </div>`).join('')}
        </div>`).join('')}

      <div class="dash-sidebar-footer">
        <div id="lecturer-go-live-mount"></div>
        <div class="dash-quick-tools">
          <div class="dash-qt-label">Quick Tools</div>
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('class')">📲 Contact QR Check-in</button>
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('tutorial')">📲 Tutorial QR Check-in</button>
          <button class="dash-qt-btn" onclick="_fullPomodoro()">🍅 Class Pomodoro</button>
          <button class="dash-qt-btn" onclick="_randomiser()">🎲 Random Selector</button>
          <button class="dash-qt-btn" onclick="_printSession()">🖨️ Print Plan</button>
          <button class="dash-qt-btn" onclick="_syncTutorGroupAssignments()">🔐 Sync Tutor Groups</button>
          <button class="dash-qt-btn" onclick="window._openSubmissionReviewer()" style="background:#059669;color:white;border-color:#059669;">📤 Student Submissions</button>
          <button class="dash-qt-btn" onclick="window._openSubmissionReviewer('moderation')" style="background:#991b1b;color:white;border-color:#991b1b;">🧭 Moderation Queue</button>
        </div>
      </div>
    </aside>`;
}

function _navItems(items) {
  return items.map(m => `
    <div class="dash-nav-item" data-session="${m.id}">
      <div class="dash-nav-id">${m.id.toUpperCase()}</div>
      <div class="dash-nav-label">${m.label.replace(/^[CT]\d+ — /, '')}</div>
    </div>`).join('');
}

let _currentType = 'contact';

function _switchSessionType(type) {
  _currentType = type;
  // Re-render the whole dashboard with the new type
  const wrapper = document.querySelector('.dash-wrapper');
  if (!wrapper) return;

  if (type === 'analytics') {
    wrapper.querySelector('aside').outerHTML = _buildAnalyticsSidebar();
    wrapper.querySelector('.dash-content').innerHTML = '<div id="analytics-mount" style="height:100%;overflow-y:auto;"><div style="padding:40px;color:var(--muted);text-align:center;margin-top:40px;">⏳ Loading cohort data...</div></div>';
    initDashboardFocusChrome();
    autoCloseDashboardSidebar();
    _loadAnalytics();
    if (_analyticsAutoRefreshEnabled) _startAnalyticsAutoRefresh();
    return;
  }

  _stopAnalyticsAutoRefresh();

  wrapper.querySelector('aside').outerHTML = _buildSidebar(type);
  wrapper.querySelector('.dash-content').innerHTML = _buildWelcome('lecturer');
  // Re-wire the new sidebar
  document.querySelectorAll('.dash-nav-item[data-session]').forEach(el => {
    el.addEventListener('click', () => {
      const sid = el.dataset.session;
      _loadSession(sid);
      document.querySelectorAll('.dash-nav-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      autoCloseDashboardSidebar();
    });
  });
  initDashboardFocusChrome();
  autoCloseDashboardSidebar();
}
window._switchSessionType = _switchSessionType;

window._openSubmissionReviewer = function (initialFilter = 'all', withReturnContext = false) {
  const content = document.getElementById('dash-content');
  if (!content) return;
  const backBar = withReturnContext
    ? `<div id="gradebook-back-bar" style="flex-shrink:0;padding:8px 16px;background:white;border-bottom:2px solid var(--border);display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(15,23,42,.06);">
        <button class="btn-prev" style="display:inline-flex;font-size:12px;padding:5px 14px;" onclick="window._returnToGradebook()">← Back to Gradebook</button>
        <span style="font-size:12px;color:var(--muted);">Viewing submission — click Back to return to your place in the gradebook.</span>
       </div>`
    : '';
  content.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;">${backBar}<div id="submission-reviewer-mount" style="flex:1;overflow-y:auto;"></div></div>`;
  const mount = document.getElementById('submission-reviewer-mount');
  renderSubmissionReviewer(mount);
  window._setStaffQueueFilter?.(initialFilter);
  document.querySelectorAll('.dash-nav-item').forEach((e) => e.classList.remove('active'));
  autoCloseDashboardSidebar();
};

window._openAnalyticsReports = function () {
  const content = document.getElementById('dash-content');
  if (!content) return;
  content.innerHTML = '<div id="analytics-reports-mount" style="height:100%;overflow-y:auto;"></div>';
  const mount = document.getElementById('analytics-reports-mount');
  renderAnalyticsReports(mount);
  document.querySelectorAll('.dash-nav-item').forEach((e) => e.classList.remove('active'));
  autoCloseDashboardSidebar();
};

function _loadSession(sid) {
  _activeSession = sid;
  const session = SESSIONS[sid];
  if (!session) return;

  const content = document.getElementById('dash-content');
  if (!content) return;

  content.innerHTML = `<div id="sp-mount-${sid}"></div>`;
  renderSessionPlan(session, `sp-mount-${sid}`);

  // Scroll to top
  content.scrollTop = 0;
}

function _buildWelcome() {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const todayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Week calendar data
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  // Session schedule
  const schedule = {
    Monday:    [{ time: '10:30–11:20', type: 'tutorial', groups: 'Y' }, { time: '2:40–3:30', type: 'tutorial', groups: 'M, N' }],
    Tuesday:   [{ time: '8:00–8:50', type: 'tutorial', groups: 'O, P, Q' }, { time: '12:10–1:00', type: 'tutorial', groups: 'R' }, { time: '1:00–1:50', type: 'tutorial', groups: 'S, T' }, { time: '1:50–3:30', type: 'contact', groups: 'All', venue: 'D LAB BASEMENT K01' }],
    Thursday:  [{ time: '11:20–12:10', type: 'tutorial', groups: 'K, L' }, { time: '12:10–1:00', type: 'tutorial', groups: 'W, X' }, { time: '1:50–2:40', type: 'tutorial', groups: 'U, V' }],
    Friday:    [{ time: '1:50–3:30', type: 'contact', groups: 'All', venue: 'E LES 100' }],
  };
  const todaySessions = schedule[todayName] || [];

  return `
    <div class="dash-welcome" style="max-width:1100px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:24px;">
        <div>
          <h1 class="dash-welcome-title" style="margin:0 0 4px 0;">${todayName}</h1>
          <p style="margin:0;color:var(--muted);font-size:15px;">${dateStr}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('class')" style="font-size:12px;">📲 Class QR</button>
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('tutorial')" style="font-size:12px;">📲 Tutorial QR</button>
          <button class="dash-qt-btn" onclick="_fullPomodoro()" style="font-size:12px;">🍅 Pomodoro</button>
        </div>
      </div>

      <!-- Week calendar strip -->
      <div style="display:flex;gap:4px;margin-bottom:24px;overflow-x:auto;">
        ${weekDays.map(d => {
          const isToday = d.toDateString() === now.toDateString();
          const dayLabel = dayNames[d.getDay()].slice(0, 3);
          const dateNum = d.getDate();
          const hasSessions = !!schedule[dayNames[d.getDay()]];
          return `<div style="flex:1;min-width:80px;padding:12px 8px;border-radius:12px;text-align:center;border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'};background:${isToday ? 'var(--accent)' : 'white'};color:${isToday ? 'white' : 'var(--navy)'};">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;${isToday ? 'color:rgba(255,255,255,.8)' : 'color:var(--muted)'}">${dayLabel}</div>
            <div style="font-size:22px;font-weight:800;margin:4px 0;">${dateNum}</div>
            ${hasSessions ? `<div style="width:6px;height:6px;border-radius:50%;background:${isToday ? 'white' : 'var(--accent)'};margin:0 auto;"></div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- Today's sessions + live status -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;">Today's Sessions</div>
          ${todaySessions.length === 0
            ? '<div style="font-size:13px;color:var(--muted);">No sessions scheduled today.</div>'
            : todaySessions.map(s => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:${s.type === 'contact' ? '#eff6ff' : '#f0fdf4'};margin-bottom:6px;">
                <span style="font-size:18px;">${s.type === 'contact' ? '🏫' : '👥'}</span>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:700;color:var(--navy);">${s.type === 'contact' ? 'Contact Session' : 'Tutorial'} · Group${s.groups.includes(',') || s.groups === 'All' ? 's' : ''} ${_esc(s.groups)}</div>
                  <div style="font-size:12px;color:var(--muted);">${_esc(s.time)}${s.venue ? ` · ${_esc(s.venue)}` : ''}</div>
                </div>
              </div>`).join('')}
        </div>

        <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;">Live Sessions</div>
          <div id="welcome-live-status" style="font-size:13px;color:var(--muted);">Checking...</div>
        </div>
      </div>

      <!-- Quick stats — loaded async -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
        <div id="welcome-stat-students" style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Enrolled</div>
          <div style="font-size:28px;font-weight:900;color:var(--navy);margin-top:4px;">—</div>
        </div>
        <div id="welcome-stat-attendance" style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Checked In Today</div>
          <div style="font-size:28px;font-weight:900;color:var(--navy);margin-top:4px;">—</div>
        </div>
        <div id="welcome-stat-tutors" style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Active Tutors</div>
          <div style="font-size:28px;font-weight:900;color:var(--navy);margin-top:4px;">—</div>
        </div>
        <div id="welcome-stat-atrisk" style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">At-Risk</div>
          <div style="font-size:28px;font-weight:900;color:#b91c1c;margin-top:4px;">—</div>
        </div>
      </div>

      <!-- Full week schedule -->
      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(15,23,42,.04);">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:14px;">Week Schedule</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
          ${Object.entries(schedule).map(([day, sessions]) => `
            <div style="border:1px solid var(--border);border-radius:12px;padding:14px;${day === todayName ? 'background:#f0f9ff;border-color:var(--accent);' : ''}">
              <div style="font-size:12px;font-weight:800;color:${day === todayName ? 'var(--accent)' : 'var(--navy)'};margin-bottom:8px;">${day}${day === todayName ? ' (today)' : ''}</div>
              ${sessions.map(s => `
                <div style="font-size:12px;color:var(--muted);line-height:1.6;">
                  <span style="font-weight:600;color:var(--navy);">${_esc(s.time)}</span>
                  ${s.type === 'contact' ? '🏫' : '👥'} ${_esc(s.groups)}
                </div>`).join('')}
            </div>`).join('')}
        </div>
      </div>

      <p style="text-align:center;color:var(--muted);font-size:13px;margin-top:20px;">← Select a session from the sidebar to open the session planner</p>
    </div>`;
}

async function _loadWelcomeStats() {
  try {
    const [usersSnap, sessionsSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'sessions/live')),
    ]);

    const users = usersSnap.val() || {};
    let studentCount = 0;
    let tutorCount = 0;
    let atRiskCount = 0;
    for (const [, u] of Object.entries(users)) {
      const role = String(u?.profile?.role || '').toLowerCase();
      if (role === 'student') {
        studentCount++;
        const esc = u?.state?.adaptive?.escalations;
        if (esc && Object.keys(esc).length > 0) atRiskCount++;
      }
      if (role === 'tutor' && !u?.profile?.disabled) tutorCount++;
    }

    const el1 = document.getElementById('welcome-stat-students');
    if (el1) el1.querySelector('div:last-child').textContent = String(studentCount);
    const el3 = document.getElementById('welcome-stat-tutors');
    if (el3) el3.querySelector('div:last-child').textContent = String(tutorCount);
    const el4 = document.getElementById('welcome-stat-atrisk');
    if (el4) el4.querySelector('div:last-child').textContent = String(atRiskCount);

    // Today's attendance
    const today = new Date().toISOString().slice(0, 10);
    const attSnap = await get(ref(db, `attendance/checkins/${today}`));
    const checkins = attSnap.val() || {};
    const checkedInCount = Object.keys(checkins).length;
    const el2 = document.getElementById('welcome-stat-attendance');
    if (el2) el2.querySelector('div:last-child').textContent = String(checkedInCount);

    // Live session status
    const liveData = sessionsSnap.val() || {};
    const classLive = liveData.class?.active === true;
    const tutLive = liveData.tutorial?.active === true;
    const statusEl = document.getElementById('welcome-live-status');
    if (statusEl) {
      if (!classLive && !tutLive) {
        statusEl.innerHTML = '<div style="color:var(--muted);">No sessions are live. Go to <strong>Analytics → Live Sessions</strong> to start one.</div>';
      } else {
        statusEl.innerHTML = `
          ${classLive ? '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);"></div><span style="font-weight:700;color:#166534;">Contact Class is LIVE</span></div>' : ''}
          ${tutLive ? '<div style="display:flex;align-items:center;gap:8px;"><div style="width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);"></div><span style="font-weight:700;color:#166534;">Tutorial is LIVE</span></div>' : ''}`;
      }
    }
  } catch (err) {
    console.warn('Welcome stats load failed:', err);
  }
}

// ── Quick tools ───────────────────────────────
window._fullPomodoro = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pom-fullscreen';
  overlay.id = 'pom-fs';
  overlay.innerHTML = `
    <div class="pom-fs-inner">
      <div class="pom-fs-title">Class Pomodoro</div>
      <div class="pom-fs-time" id="pfs-time">25:00</div>
      <div class="pom-fs-mode" id="pfs-mode">Work block</div>
      <div class="pom-fs-controls">
        <button onclick="_pfsControl('start')">▶ Start</button>
        <button onclick="_pfsControl('pause')">⏸ Pause</button>
        <button onclick="_pfsControl('reset')">↺ Reset</button>
        <button onclick="document.getElementById('pom-fs').remove()">✕ Close</button>
      </div>
      <div class="pom-fs-presets">
        ${[25, 20, 15, 10, 5].map(m => `<button onclick="_pfsSet(${m})">${m}m</button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let secs = 25 * 60, total = 25 * 60, running = false, interval = null;

  window._pfsControl = (a) => {
    if (a === 'start' && !running) {
      running = true;
      interval = setInterval(() => {
        secs--;
        if (secs < 0) { clearInterval(interval); running = false; secs = 0; }
        const m = Math.floor(secs / 60), s = secs % 60;
        const el = document.getElementById('pfs-time');
        if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }, 1000);
    } else if (a === 'pause') { clearInterval(interval); running = false; }
    else if (a === 'reset') {
      clearInterval(interval); running = false; secs = total;
      const el = document.getElementById('pfs-time');
      const m = Math.floor(secs / 60);
      if (el) el.textContent = `${String(m).padStart(2, '0')}:00`;
    }
  };
  window._pfsSet = (m) => {
    clearInterval(interval); running = false; secs = total = m * 60;
    const el = document.getElementById('pfs-time');
    if (el) el.textContent = `${String(m).padStart(2, '0')}:00`;
  };
};

window._randomiser = () => {
  const names = prompt('Paste student names (one per line):');
  if (!names) return;
  const list = names.split('\n').map(n => n.trim()).filter(Boolean);
  if (!list.length) return;
  const picked = list[Math.floor(Math.random() * list.length)];
  _showLecturerToast(`🎲 Selected: ${picked}`, 'success', 2800);
};

window._printSession = () => window.print();

function _buildUserLookup(users = {}) {
  const uidByEmail = {};
  const uidByName = {};
  for (const [uid, user] of Object.entries(users || {})) {
    const email = _normEmail(user?.profile?.email);
    const name = _normName(user?.profile?.displayName);
    if (email) uidByEmail[email] = uid;
    if (name) uidByName[name] = uid;
  }
  return { uidByEmail, uidByName };
}

function _toTutorGroupPayload(rows, users, source = 'dashboard/tutor-group-manager') {
  const payload = {};
  const unresolvedTutors = [];
  const unresolvedStudents = [];
  const { uidByEmail, uidByName } = _buildUserLookup(users || {});

  for (const row of rows || []) {
    const tutorEmail = _normEmail(row?.tutor?.email);
    const tutorName = _normName(row?.tutor?.displayName);
    const tutorUid = String(row?.tutor?.uid || '').trim() || uidByEmail[tutorEmail] || uidByName[tutorName] || null;
    if (!tutorUid) {
      unresolvedTutors.push(row?.tutor?.email || row?.tutor?.displayName || 'Unknown tutor');
      continue;
    }

    const groups = (row?.groups || []).map((g, i) => {
      const groupId = g?.id || g?.name || `group-${i + 1}`;
      const groupName = g?.name || g?.id || `Group ${i + 1}`;
      const studentUidSet = new Set((g?.studentUids || []).map((uid) => String(uid || '').trim()).filter(Boolean));
      const unresolvedStudentEntries = [];
      (g?.students || []).forEach((entryRaw) => {
        const entry = String(entryRaw || '').trim();
        if (!entry) return;
        const resolvedUid = uidByEmail[_normEmail(entry)];
        if (resolvedUid) studentUidSet.add(resolvedUid);
        else {
          unresolvedStudentEntries.push(entry);
          unresolvedStudents.push(`${entry} (${groupId})`);
        }
      });
      return {
        id: groupId,
        name: groupName,
        studentUids: Array.from(studentUidSet),
        students: unresolvedStudentEntries,
      };
    });

    payload[tutorUid] = {
      tutor: {
        uid: tutorUid,
        email: row?.tutor?.email || null,
        displayName: row?.tutor?.displayName || null,
      },
      groups,
      source,
      updatedAt: new Date().toISOString(),
    };
  }

  return { payload, unresolvedTutors, unresolvedStudents };
}

function _rowsFromTutorGroupPayload(payload = {}) {
  return Object.values(payload || {}).map((entry) => ({
    tutor: {
      uid: entry?.tutor?.uid || '',
      email: entry?.tutor?.email || '',
      displayName: entry?.tutor?.displayName || '',
    },
    groups: (entry?.groups || []).map((g, idx) => ({
      id: g?.id || `group-${idx + 1}`,
      name: g?.name || g?.id || `Group ${idx + 1}`,
      studentUids: Array.isArray(g?.studentUids) ? g.studentUids : [],
      students: Array.isArray(g?.students) ? g.students : [],
    })),
  }));
}

function _summariseTutorRows(rows = []) {
  const groups = rows.reduce((sum, row) => sum + (row?.groups || []).length, 0);
  const students = rows.reduce((sum, row) => sum + (row?.groups || []).reduce((gSum, g) => {
    const uidCount = Array.isArray(g?.studentUids) ? g.studentUids.length : 0;
    const emailCount = Array.isArray(g?.students) ? g.students.length : 0;
    return gSum + uidCount + emailCount;
  }, 0), 0);
  return {
    tutors: rows.length,
    groups,
    students,
  };
}

let _tgmUsersCache = null;
let _tgmClassRosterCache = [];
let _tgmDeleteHistory = [];
const _TGM_MAX_UNDO = 5;
const _TGM_GROUP_LETTERS = Array.from({ length: 16 }, (_, i) => String.fromCharCode(75 + i)); // K..Z
const _TGM_OTHER_TUTOR_VALUE = '__other_tutor__';
const _TGM_TUTOR_NAME_OPTIONS = [
  'Olusegun Olowoyo',
  'Nandipha Swartbooi',
  'Lauren Barnard',
  'Miriel Mpange',
  'Maurice Mchunu',
  'Shella Onyeama',
  'Sofia Gildo',
  'Ayanda Mthethwa',
  'Bright Makheda',
  'Khadisephure Masweneng',
  'KhulisaMavuso',
  'Kwanele Zulu',
];

function _tgmStudentLookup(users = {}) {
  const byNumber = {};
  const byName = {};
  const byEmail = {};

  Object.entries(users || {}).forEach(([uid, user]) => {
    if (_roleFromProfile(user) !== 'student') return;
    const profile = user?.profile || {};
    const studentNumber = String(
      profile?.studentNumber
      || profile?.studentNo
      || profile?.studentId
      || profile?.number
      || ''
    ).trim();
    const nameKey = _normName(profile?.displayName || '');
    const emailKey = _normEmail(profile?.email || '');
    if (studentNumber) byNumber[studentNumber] = uid;
    if (nameKey) byName[nameKey] = uid;
    if (emailKey) byEmail[emailKey] = uid;
  });

  const rosterRows = Array.isArray(_tgmClassRosterCache) ? _tgmClassRosterCache : [];
  rosterRows.forEach((row) => {
    const number = String(row?.studentNumber || row?.studentNo || row?.studentId || '').trim();
    const email = _normEmail(row?.email || '');
    const name = _normName(row?.name || row?.displayName || '');
    const manualEntry = [row?.name || row?.displayName || 'Unknown student', number, row?.email || '']
      .filter(Boolean)
      .join(' | ');
    if (number && !byNumber[number]) byNumber[number] = `manual:${manualEntry}`;
    if (email && !byEmail[email]) byEmail[email] = `manual:${manualEntry}`;
    if (name && !byName[name]) byName[name] = `manual:${manualEntry}`;
  });

  return { byNumber, byName, byEmail };
}

function _tgmParseBatchLine(raw = '') {
  const line = String(raw || '').trim();
  if (!line) return null;
  const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const studentNumMatch = line.match(/\b\d{5,14}\b/);

  let name = line;
  if (emailMatch) name = name.replace(emailMatch[0], ' ');
  if (studentNumMatch) name = name.replace(studentNumMatch[0], ' ');
  name = name.replace(/[;,|\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    raw: line,
    email: emailMatch ? emailMatch[0].toLowerCase() : '',
    studentNumber: studentNumMatch ? studentNumMatch[0] : '',
    name,
  };
}

function _tgmPopulateBatchControls() {
  const tutorSelect = document.getElementById('tgm-batch-tutor');
  const groupSelect = document.getElementById('tgm-batch-group');
  if (!tutorSelect || !groupSelect) return;

  tutorSelect.innerHTML = [
    `<option value="${_TGM_OTHER_TUTOR_VALUE}">Unassigned / Other tutor</option>`,
    ..._TGM_TUTOR_NAME_OPTIONS.map((name) => `<option value="${_esc(name)}">${_esc(name)}</option>`),
  ].join('');

  groupSelect.innerHTML = _TGM_GROUP_LETTERS
    .map((letter) => `<option value="${letter}">${letter}</option>`)
    .join('');

  window._tgmOnTutorSelect();
}

window._tgmOnTutorSelect = () => {
  const select = document.getElementById('tgm-batch-tutor');
  const customWrap = document.getElementById('tgm-batch-custom-wrap');
  const customInput = document.getElementById('tgm-batch-custom-tutor');
  if (!select || !customWrap || !customInput) return;
  const isOther = String(select.value || '') === _TGM_OTHER_TUTOR_VALUE;
  customWrap.style.display = isOther ? 'block' : 'none';
  if (!isOther) customInput.value = '';
};

function _tgmSelectedTutorName() {
  const select = document.getElementById('tgm-batch-tutor');
  const customInput = document.getElementById('tgm-batch-custom-tutor');
  const selected = String(select?.value || '').trim();
  if (!selected) return '';
  if (selected === _TGM_OTHER_TUTOR_VALUE) {
    return String(customInput?.value || '').trim();
  }
  return selected;
}

window._tgmBatchAddStudents = () => {
  const tutorName = _tgmSelectedTutorName();
  const groupLetter = String(document.getElementById('tgm-batch-group')?.value || 'K').trim().toUpperCase();
  const raw = String(document.getElementById('tgm-batch-students')?.value || '');
  if (!tutorName) {
    _showLecturerToast('Select a tutor first, or enter a custom tutor name.', 'warn', 2600);
    return;
  }
  if (!/^[K-Z]$/.test(groupLetter)) {
    _showLecturerToast('Select a group letter from K to Z.', 'warn', 2600);
    return;
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    _showLecturerToast('Paste at least one student row.', 'warn', 2400);
    return;
  }

  const lookup = _tgmStudentLookup(_tgmUsersCache || {});
  const parsed = lines.map(_tgmParseBatchLine).filter(Boolean);

  const resolvedUids = [];
  const unresolved = [];
  parsed.forEach((row) => {
    const byEmail = row.email ? lookup.byEmail[_normEmail(row.email)] : null;
    const byNumber = row.studentNumber ? lookup.byNumber[row.studentNumber] : null;
    const byName = row.name ? lookup.byName[_normName(row.name)] : null;
    const uid = byEmail || byNumber || byName || null;
    if (uid && String(uid).startsWith('manual:')) unresolved.push(String(uid).slice(7));
    else if (uid) resolvedUids.push(uid);
    else unresolved.push(row.raw);
  });

  if (!resolvedUids.length && !unresolved.length) {
    _showLecturerToast('Add at least one valid student entry in the pasted list.', 'warn', 3000);
    return;
  }

  const users = _umUsersCache && Object.keys(_umUsersCache).length ? _umUsersCache : (_tgmUsersCache || {});
  const { uidByName } = _buildUserLookup(users);
  const resolvedTutorUid = uidByName[_normName(tutorName)] || '';
  const tutorUser = resolvedTutorUid ? (users?.[resolvedTutorUid] || {}) : {};
  const tutorDisplayName = tutorName;
  const tutorEmail = String(tutorUser?.profile?.email || '').trim();

  const rows = _tgmParseEditorRows(false) || [];
  let tutorRow = rows.find((r) => (
    (resolvedTutorUid && String(r?.tutor?.uid || '') === resolvedTutorUid)
    || _normName(r?.tutor?.displayName || '') === _normName(tutorDisplayName)
  ));
  if (!tutorRow) {
    tutorRow = {
      tutor: {
        uid: resolvedTutorUid,
        email: tutorEmail,
        displayName: tutorDisplayName || tutorEmail,
      },
      groups: [],
    };
    rows.push(tutorRow);
  } else {
    tutorRow.tutor = tutorRow.tutor || {};
    tutorRow.tutor.displayName = tutorDisplayName;
    if (resolvedTutorUid) tutorRow.tutor.uid = resolvedTutorUid;
    if (tutorEmail) tutorRow.tutor.email = tutorEmail;
  }

  const groupId = `TG${groupLetter}`;
  const groupName = `Tutorial Group ${groupLetter}`;
  let group = (tutorRow.groups || []).find((g) => String(g?.id || '').toUpperCase() === groupId);
  if (!group) {
    group = { id: groupId, name: groupName, studentUids: [], students: [] };
    tutorRow.groups = tutorRow.groups || [];
    tutorRow.groups.push(group);
  }

  const current = new Set((group.studentUids || []).map((uid) => String(uid || '').trim()).filter(Boolean));
  resolvedUids.forEach((uid) => current.add(uid));
  group.studentUids = Array.from(current);
  const fallbackEntries = new Set((group.students || []).map((entry) => String(entry || '').trim()).filter(Boolean));
  unresolved.forEach((entry) => fallbackEntries.add(String(entry || '').trim()));
  group.students = Array.from(fallbackEntries);
  if (!group.name) group.name = groupName;
  if (!group.id) group.id = groupId;

  _tgmSetEditorRows(rows);
  const msg = [
    `${resolvedUids.length} matched student${resolvedUids.length === 1 ? '' : 's'} added to ${groupId}.`,
    `${unresolved.length} unresolved entr${unresolved.length === 1 ? 'y was' : 'ies were'} kept as manual roster rows.`,
  ].join('\n');
  _showLecturerToast(msg, unresolved.length ? 'warn' : 'success', unresolved.length ? 3400 : 3000);
};

window._tgmClearBatchPaste = () => {
  const el = document.getElementById('tgm-batch-students');
  if (el) el.value = '';
};

function _tgmParseEditorRows(showAlerts = true) {
  const editor = document.getElementById('tgm-json-editor');
  if (!editor) {
    if (showAlerts) _showLecturerToast('Open the Tutor Group Manager screen and try again.', 'warn', 2800);
    return null;
  }
  try {
    const parsed = JSON.parse(editor.value || '[]');
    if (!Array.isArray(parsed)) {
      if (showAlerts) _showLecturerToast('Use a JSON array of tutor assignment rows.', 'warn', 3000);
      return null;
    }
    return parsed;
  } catch (err) {
    if (showAlerts) _showLecturerToast(`Invalid JSON: ${err.message}`, 'warn', 3600);
    return null;
  }
}

function _tgmRenderPreview(rows = []) {
  const host = document.getElementById('tgm-preview');
  if (!host) return;
  const stats = _summariseTutorRows(rows);
  const tutorOptions = _TGM_TUTOR_NAME_OPTIONS.map((n) => _esc(n));
  const rowHtml = rows.map((row, idx) => {
    const tutorLabel = row?.tutor?.displayName || row?.tutor?.email || row?.tutor?.uid || `Tutor ${idx + 1}`;
    const tutorUid = row?.tutor?.uid ? `<div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);">UID: ${_esc(row.tutor.uid)}</div>` : '';
    const currentTutorNorm = _normName(tutorLabel);
    const isUnassigned = currentTutorNorm.includes('unassigned') || !tutorLabel;
    const selectOptions = [
      `<option value="">-- Select tutor --</option>`,
      ...tutorOptions.map((n) => `<option value="${n}" ${_normName(n) === currentTutorNorm ? 'selected' : ''}>${n}</option>`),
      `<option value="${_TGM_OTHER_TUTOR_VALUE}">Other (type below)</option>`,
    ].join('');
    const groups = row?.groups || [];
    const groupText = groups.length
      ? groups.map((g) => {
        const groupName = g?.name || g?.id || 'Group';
        const studentCount = (Array.isArray(g?.studentUids) && g.studentUids.length)
          ? g.studentUids.length
          : (Array.isArray(g?.students) ? g.students.length : 0);
        return `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 7px;margin:2px 4px 2px 0;border:1px solid var(--border);border-radius:999px;background:#fff;">
            <span>${_esc(groupName)} (${studentCount})</span>
            <button onclick="_tgmDeleteTutorGroup(${idx}, ${groups.indexOf(g)})" title="Delete this group" style="border:none;background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 6px;font-size:10px;cursor:pointer;line-height:1;">✕</button>
          </span>`;
      }).join(' · ')
      : 'No groups';
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border);">
        <select onchange="_tgmReassignTutor(${idx}, this.value)" style="width:100%;padding:6px 8px;border:1px solid ${isUnassigned ? 'var(--amber)' : 'var(--border)'};border-radius:8px;font-size:12px;background:${isUnassigned ? 'var(--amber-dim)' : 'white'};">${selectOptions}</select>
        <input id="tgm-custom-tutor-${idx}" placeholder="Custom tutor name" onchange="_tgmReassignTutor(${idx}, this.value)" style="display:none;width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;" />
        ${tutorUid}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border);color:var(--muted);">${groups.length}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border);color:var(--muted);">${groupText}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border);">
        <button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#fef2f2;border-color:#fecaca;color:#991b1b;" onclick="_tgmDeleteTutor(${idx})">Delete</button>
      </td>
    </tr>`;
  }).join('');

  host.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Tutors: <strong>${stats.tutors}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Groups: <strong>${stats.groups}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Students: <strong>${stats.students}</strong></span>
      <button class="btn-prev" style="display:inline-flex;padding:4px 10px;font-size:12px;${_tgmDeleteHistory.length ? '' : 'opacity:.5;cursor:not-allowed;'}" ${_tgmDeleteHistory.length ? 'onclick="_tgmUndoLastDelete()"' : 'disabled'}>↶ Undo delete${_tgmDeleteHistory.length ? ` (${_tgmDeleteHistory.length})` : ''}</button>
    </div>
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;background:white;">
      <table style="width:100%;border-collapse:collapse;text-align:left;">
        <thead>
          <tr>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Tutor</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Groups</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Assignments</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Actions</th>
          </tr>
        </thead>
        <tbody>${rowHtml || '<tr><td colspan="4" style="padding:14px;color:var(--muted);">No tutor rows in current JSON.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function _tgmRememberDeleteSnapshot(rows = []) {
  try {
    const snapshot = JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : []));
    _tgmDeleteHistory.unshift(snapshot);
    if (_tgmDeleteHistory.length > _TGM_MAX_UNDO) {
      _tgmDeleteHistory = _tgmDeleteHistory.slice(0, _TGM_MAX_UNDO);
    }
  } catch {
    // ignore snapshot failures
  }
}

window._tgmUndoLastDelete = () => {
  if (!_tgmDeleteHistory.length) {
    _showLecturerToast('Make a delete action first, then undo.', 'warn', 2400);
    return;
  }
  const restored = _tgmDeleteHistory.shift();
  _tgmSetEditorRows(restored);
  _showLecturerToast(`Delete undone. Remaining undo steps: ${_tgmDeleteHistory.length}.`, 'success', 2600);
};

window._tgmDeleteTutor = (tutorIndex) => {
  const rows = _tgmParseEditorRows(true);
  if (!rows) return;
  const idx = Number(tutorIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= rows.length) {
    _showLecturerToast('Refresh the preview, then select an existing tutor row.', 'warn', 2800);
    return;
  }
  const label = rows[idx]?.tutor?.displayName || rows[idx]?.tutor?.email || rows[idx]?.tutor?.uid || `Tutor ${idx + 1}`;
  if (!confirm(`Delete tutor "${label}" and all assigned groups?`)) return;
  _tgmRememberDeleteSnapshot(rows);
  rows.splice(idx, 1);
  _tgmSetEditorRows(rows);
};

window._tgmDeleteTutorGroup = (tutorIndex, groupIndex) => {
  const rows = _tgmParseEditorRows(true);
  if (!rows) return;
  const tIdx = Number(tutorIndex);
  const gIdx = Number(groupIndex);
  if (!Number.isInteger(tIdx) || tIdx < 0 || tIdx >= rows.length) {
    _showLecturerToast('Refresh the preview, then select an existing tutor row.', 'warn', 2800);
    return;
  }
  const groups = Array.isArray(rows[tIdx]?.groups) ? rows[tIdx].groups : [];
  if (!Number.isInteger(gIdx) || gIdx < 0 || gIdx >= groups.length) {
    _showLecturerToast('Refresh the preview, then select an existing group.', 'warn', 2800);
    return;
  }
  const group = groups[gIdx];
  const groupLabel = group?.name || group?.id || `Group ${gIdx + 1}`;
  if (!confirm(`Delete group "${groupLabel}" from this tutor?`)) return;
  _tgmRememberDeleteSnapshot(rows);
  groups.splice(gIdx, 1);
  rows[tIdx].groups = groups;
  _tgmSetEditorRows(rows);
};

window._tgmReassignTutor = (tutorIndex, selectedValue) => {
  const rows = _tgmParseEditorRows(false);
  if (!rows) return;
  const idx = Number(tutorIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= rows.length) return;

  const customInput = document.getElementById(`tgm-custom-tutor-${idx}`);

  if (selectedValue === _TGM_OTHER_TUTOR_VALUE) {
    if (customInput) customInput.style.display = 'block';
    return;
  }

  if (customInput) customInput.style.display = 'none';

  if (!selectedValue) return;

  const users = _umUsersCache && Object.keys(_umUsersCache).length ? _umUsersCache : (_tgmUsersCache || {});
  const { uidByName } = _buildUserLookup(users);
  const resolvedUid = uidByName[_normName(selectedValue)] || '';
  const tutorUser = resolvedUid ? (users?.[resolvedUid] || {}) : {};

  rows[idx].tutor = rows[idx].tutor || {};
  rows[idx].tutor.displayName = selectedValue;
  rows[idx].tutor.uid = resolvedUid || rows[idx].tutor.uid || '';
  rows[idx].tutor.email = String(tutorUser?.profile?.email || rows[idx].tutor.email || '').trim();

  _tgmSetEditorRows(rows);
  _showLecturerToast(`Tutor for row ${idx + 1} set to "${selectedValue}".${resolvedUid ? '' : ' (UID not resolved — will resolve on save if user exists.)'}`, 'success', 2800);
};

function _tgmSetEditorRows(rows = []) {
  const editor = document.getElementById('tgm-json-editor');
  if (!editor) return;
  editor.value = JSON.stringify(rows, null, 2);
  _tgmRenderPreview(rows);
}

window._tgmValidatePreview = () => {
  const rows = _tgmParseEditorRows(true);
  if (!rows) return;
  _tgmRenderPreview(rows);
  _showLecturerToast('Tutor-group JSON is valid. Preview updated.', 'success', 2600);
};

window._tgmLoadLocalTemplate = () => {
  _tgmSetEditorRows(TUTOR_GROUP_ASSIGNMENTS);
};

window._tgmLoadCurrent = async () => {
  try {
    const snap = await get(ref(db, 'tutorial-groups/assignmentsByTutor'));
    const rows = snap.exists() ? _rowsFromTutorGroupPayload(snap.val()) : [];
    _tgmSetEditorRows(rows);
  } catch (err) {
    _showLecturerToast(`Failed to load current tutor groups: ${err.message}`, 'warn', 3600);
  }
};

window._tgmUploadJson = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      _showLecturerToast('Upload a JSON array of tutor assignment rows.', 'warn', 3200);
      return;
    }
    _tgmSetEditorRows(parsed);
    _showLecturerToast(`Uploaded ${file.name}. Review and click Save to apply.`, 'success', 3000);
  } catch (err) {
    _showLecturerToast(`Upload failed: ${err.message}`, 'warn', 3600);
  } finally {
    if (event?.target) event.target.value = '';
  }
};

window._tgmDownloadJson = () => {
  const rows = _tgmParseEditorRows(false);
  if (!rows) {
    _showLecturerToast('Fix invalid JSON before downloading.', 'warn', 2800);
    return;
  }
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tutor-group-assignments-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

window._tgmSave = async () => {
  const rows = _tgmParseEditorRows(true);
  if (!rows) return;
  try {
    if (!_tgmUsersCache) {
      const usersSnap = await get(ref(db, 'users'));
      _tgmUsersCache = usersSnap.exists() ? usersSnap.val() : {};
    }
    const { payload, unresolvedTutors, unresolvedStudents } = _toTutorGroupPayload(rows, _tgmUsersCache, 'dashboard/tutor-group-manager');
    await set(ref(db, 'tutorial-groups/assignmentsByTutor'), payload);
    const msg = [
      'Tutor-group save complete.',
      `Tutors saved: ${Object.keys(payload).length}`,
      `Unresolved tutors: ${unresolvedTutors.length}`,
      `Unresolved students: ${unresolvedStudents.length}`,
    ].join('\n');
    _showLecturerToast(msg, unresolvedTutors.length || unresolvedStudents.length ? 'warn' : 'success', unresolvedTutors.length || unresolvedStudents.length ? 3600 : 3000);
    await window._tgmLoadCurrent();
  } catch (err) {
    _showLecturerToast(`Save failed: ${err.message}`, 'warn', 3800);
  }
};

window._tgmAutoAssignFromRoster = () => {
  const rosterRows = Array.isArray(_tgmClassRosterCache) ? _tgmClassRosterCache : [];
  if (!rosterRows.length) {
    _showLecturerToast('No class roster loaded. Upload a roster first via the Class Roster Manager.', 'warn', 3200);
    return;
  }

  const withGroup = rosterRows.filter((r) => {
    const g = String(r?.tutorialGroup || '').trim().toUpperCase();
    return /^[K-Z]$/.test(g);
  });
  if (!withGroup.length) {
    _showLecturerToast('No roster entries have a tutorial group letter (K–Z). Check your roster Groups column.', 'warn', 3400);
    return;
  }

  const lookup = _tgmStudentLookup(_tgmUsersCache || {});
  const grouped = {};
  let matched = 0;
  let unmatched = 0;

  withGroup.forEach((row) => {
    const groupLetter = String(row.tutorialGroup).trim().toUpperCase();
    if (!grouped[groupLetter]) grouped[groupLetter] = { uids: new Set(), fallback: new Set() };

    const studentNumber = String(row?.studentId || row?.studentNumber || row?.studentNo || '').trim();
    const email = String(row?.email || '').trim().toLowerCase();
    const name = String(row?.name || row?.displayName || '').trim();

    const uid = (studentNumber && lookup.byNumber[studentNumber])
      || (email && lookup.byEmail[_normEmail(email)])
      || (name && lookup.byName[_normName(name)])
      || null;

    if (uid && !String(uid).startsWith('manual:')) {
      grouped[groupLetter].uids.add(uid);
      matched++;
    } else {
      const label = [name, studentNumber, email].filter(Boolean).join(' | ');
      if (label) grouped[groupLetter].fallback.add(label);
      unmatched++;
    }
  });

  const rows = _tgmParseEditorRows(false) || [];

  // Build a lookup of existing groups across all tutor rows
  const existingGroupMap = {};
  rows.forEach((row) => {
    (row.groups || []).forEach((g) => {
      const gid = String(g?.id || '').toUpperCase();
      if (gid) existingGroupMap[gid] = { row, group: g };
    });
  });

  Object.entries(grouped).forEach(([letter, { uids, fallback }]) => {
    const groupId = `TG${letter}`;
    const groupName = `Tutorial Group ${letter}`;

    if (existingGroupMap[groupId]) {
      // Merge into existing group
      const { group } = existingGroupMap[groupId];
      const existingUids = new Set((group.studentUids || []).map((u) => String(u).trim()).filter(Boolean));
      uids.forEach((u) => existingUids.add(u));
      group.studentUids = Array.from(existingUids);
      const existingFallback = new Set((group.students || []).map((s) => String(s).trim()).filter(Boolean));
      fallback.forEach((f) => existingFallback.add(f));
      group.students = Array.from(existingFallback);
    } else {
      // Create a new tutor row per group so tutors can be assigned individually
      rows.push({
        tutor: { uid: '', email: '', displayName: `Unassigned (${groupId})` },
        groups: [{
          id: groupId,
          name: groupName,
          studentUids: Array.from(uids),
          students: Array.from(fallback),
        }],
      });
    }
  });

  _tgmSetEditorRows(rows);
  const groupCount = Object.keys(grouped).length;
  _showLecturerToast(
    `Auto-assigned ${withGroup.length} roster entries across ${groupCount} group(s).\n${matched} matched to UIDs, ${unmatched} kept as fallback entries.\nUse the tutor selectors in the preview to assign tutors, then Save.`,
    unmatched ? 'warn' : 'success',
    4000,
  );
};

window._loadTutorGroupManager = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading tutor-group manager...</div>';
  try {
    const [usersSnap, assignmentsSnap, rosterSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'tutorial-groups/assignmentsByTutor')),
      get(ref(db, 'rosters/classList')),
    ]);
    _tgmUsersCache = usersSnap.exists() ? usersSnap.val() : {};
    _tgmClassRosterCache = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
    const rows = assignmentsSnap.exists() ? _rowsFromTutorGroupPayload(assignmentsSnap.val()) : TUTOR_GROUP_ASSIGNMENTS;
    const usersCount = Object.keys(_tgmUsersCache || {}).length;

    mount.innerHTML = `
      <div style="padding:34px;max-width:1100px;margin:0 auto;animation:fadeIn 0.3s ease;">
        <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">👥 Tutor Group Manager</h1>
        <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Upload, review, edit, and save tutor/tutorial/student allocations directly from this dashboard. Student emails are resolved to UIDs where possible.</p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          <button class="btn-prev" style="display:inline-flex;" onclick="_tgmLoadCurrent()">🔄 Load Current</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="_tgmLoadLocalTemplate()">📄 Load Local Template</button>
          <label class="btn-prev" style="display:inline-flex;cursor:pointer;">
            ⬆ Upload JSON
            <input type="file" accept="application/json,.json" style="display:none;" onchange="_tgmUploadJson(event)" />
          </label>
          <button class="btn-prev" style="display:inline-flex;" onclick="_tgmValidatePreview()">✅ Validate & Preview</button>
          <button class="btn-prev" style="display:inline-flex;background:var(--accent);color:white;border-color:var(--accent);" onclick="_tgmSave()">💾 Save to Firebase</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="_tgmDownloadJson()">⬇ Download JSON</button>
          <button class="btn-prev" style="display:inline-flex;background:var(--green);color:white;border-color:var(--green);" onclick="_tgmAutoAssignFromRoster()">📋 Auto-assign from Roster</button>
        </div>

        <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">Users available for UID resolution: <strong style="color:var(--navy);">${usersCount}</strong> · Firebase path: <strong style="color:var(--navy);">tutorial-groups/assignmentsByTutor</strong></div>

        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Batch Tutor Assignment (No JSON)</div>
          <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(140px,180px) 1fr auto auto;gap:10px;align-items:end;">
            <div>
              <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Tutor (manual list)</label>
              <select id="tgm-batch-tutor" onchange="_tgmOnTutorSelect()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;"></select>
            </div>
            <div id="tgm-batch-custom-wrap" style="display:none;">
              <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Custom tutor name</label>
              <input id="tgm-batch-custom-tutor" placeholder="Enter tutor full name" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
            </div>
            <div>
              <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Tutorial Group</label>
              <select id="tgm-batch-group" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;"></select>
            </div>
            <div>
              <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Paste students (name + student number per line)</label>
              <textarea id="tgm-batch-students" rows="3" placeholder="Jane Doe, 202412345\nJohn Smith\t202498765" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;line-height:1.4;resize:vertical;"></textarea>
            </div>
            <button class="btn-prev" style="display:inline-flex;" onclick="_tgmClearBatchPaste()">Clear</button>
            <button class="btn-prev" style="display:inline-flex;background:var(--accent);color:white;border-color:var(--accent);" onclick="_tgmBatchAddStudents()">Add Batch</button>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:8px;">Supported format per line: name + student number (comma/tab/space), or email. Group options are locked to K–Z.</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;">
          <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Editable JSON</div>
            <textarea id="tgm-json-editor" style="width:100%;min-height:460px;resize:vertical;border:1px solid var(--border);border-radius:10px;padding:12px;font-size:12px;line-height:1.45;font-family:var(--font-mono);box-sizing:border-box;"></textarea>
          </div>
          <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Review Preview</div>
            <div id="tgm-preview"></div>
          </div>
        </div>
      </div>`;

    _tgmPopulateBatchControls();
    _tgmSetEditorRows(rows);
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">Failed to load tutor-group manager: ${_esc(err.message)}</div>`;
  }
};

const _USER_ROLES = ['student', 'tutor', 'lecturer', 'moderator'];
let _umUsersCache = {};
let _umRosterRowsCache = [];
let _umRecoveryLogCache = [];
let _umRecoveryLogFilter = 'all';
let _umProcessedAuthUsersCache = {};
let _rosterOnlyCleanupReport = null;
let _umPage = 1;
let _umRecoveryLogPage = 1;
const _UM_PAGE_SIZE = 10;
const _UM_RECOVERY_LOG_PAGE_SIZE = 10;

function _roleFromProfile(user = {}) {
  const profileRole = String(user?.profile?.role || '').trim().toLowerCase();
  if (_USER_ROLES.includes(profileRole)) return profileRole;
  const displayRole = String(user?.profile?.displayName || '').match(/\[(.*?)\]/)?.[1]?.toLowerCase();
  return _USER_ROLES.includes(displayRole) ? displayRole : 'student';
}

function _processedAuthUserKey(email = '') {
  return normalizeStudentUsername(email).replace(/[.#$\[\]@/]/g, '_');
}

async function _upsertProcessedAuthUser(email, updates = {}) {
  const normalizedEmail = normalizeStudentUsername(email);
  const key = _processedAuthUserKey(normalizedEmail);
  const existing = _umProcessedAuthUsersCache?.[key] || {};
  const payload = _cleanFirebaseValue({
    email: normalizedEmail,
    authEmail: normalizedEmail,
    role: 'student',
    disabled: false,
    source: 'processed-auth-recovery',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...existing,
    ...updates,
  });
  await set(ref(db, `analytics/processed-auth-users/${key}`), payload);
  _umProcessedAuthUsersCache = { ...(_umProcessedAuthUsersCache || {}), [key]: payload };
}

async function _loadProcessedAuthUsers() {
  const snap = await get(ref(db, 'analytics/processed-auth-users'));
  _umProcessedAuthUsersCache = snap.exists() ? (snap.val() || {}) : {};
  return _umProcessedAuthUsersCache;
}

function _baseActiveUsersRows(users = {}, processedAuthUsers = {}) {
  const realRows = Object.entries(users || {}).map(([uid, user]) => ({
    uid,
    email: user?.profile?.personalEmail || user?.profile?.email || '',
    personalEmail: user?.profile?.personalEmail || user?.profile?.email || '',
    authEmail: user?.profile?.authEmail || user?.profile?.username || user?.profile?.email || '',
    name: String(user?.profile?.displayName || '').split(' [')[0] || user?.profile?.email || uid,
    role: _roleFromProfile(user),
    studentId: String(user?.profile?.studentId || user?.profile?.studentNumber || user?.profile?.studentNo || '').trim(),
    studentNumber: String(user?.profile?.studentId || user?.profile?.studentNumber || user?.profile?.studentNo || '').trim(),
    tutorialGroup: String(user?.profile?.tutorialGroup || '').trim().toUpperCase(),
    username: String(user?.profile?.username || '').trim(),
    initials: String(user?.profile?.initials || '').trim().toUpperCase(),
    surname: String(user?.profile?.surname || user?.profile?.lastName || '').trim(),
    firstName: String(user?.profile?.firstName || '').trim(),
    lastName: String(user?.profile?.lastName || user?.profile?.surname || '').trim(),
    disabled: Boolean(user?.profile?.disabled),
    createdAt: user?.profile?.createdAt || null,
    updatedAt: user?.profile?.updatedAt || user?.profile?.createdAt || null,
    source: String(user?.profile?.source || '').trim(),
    rosterEnrollmentStatus: String(user?.profile?.rosterEnrollmentStatus || '').trim(),
    lastPasswordResetSentAt: user?.profile?.lastPasswordResetSentAt || user?.profile?.lastPasswordResetAttemptAt || null,
    lastPasswordResetError: String(user?.profile?.lastPasswordResetError || '').trim(),
    isAuthOnlyProcessed: false,
  }));

  const realEmailSet = new Set(
    realRows
      .map((row) => normalizeStudentUsername(row.authEmail || row.username || row.email || ''))
      .filter(Boolean)
  );

  const processedRows = Object.entries(processedAuthUsers || {})
    .map(([key, record]) => {
      const email = normalizeStudentUsername(record?.authEmail || record?.email || key);
      return {
        uid: `auth-only:${key}`,
        email,
        personalEmail: '',
        authEmail: email,
        name: String(record?.name || `Pending profile (${email})`).trim(),
        role: 'student',
        studentId: String(record?.studentId || '').trim(),
        studentNumber: String(record?.studentId || '').trim(),
        tutorialGroup: String(record?.tutorialGroup || '').trim().toUpperCase(),
        username: email,
        initials: '',
        surname: '',
        firstName: '',
        lastName: '',
        disabled: false,
        createdAt: record?.createdAt || null,
        updatedAt: record?.updatedAt || record?.createdAt || null,
        source: String(record?.source || 'processed-auth-recovery').trim(),
        rosterEnrollmentStatus: String(record?.rosterEnrollmentStatus || '').trim(),
        lastPasswordResetSentAt: record?.lastPasswordResetSentAt || record?.lastPasswordResetAttemptAt || null,
        lastPasswordResetError: String(record?.lastPasswordResetError || '').trim(),
        isAuthOnlyProcessed: true,
      };
    })
    .filter((row) => row.authEmail && !realEmailSet.has(row.authEmail));

  return realRows.concat(processedRows);
}

function _studentRowAuthEmail(row = {}) {
  return String(row?.authEmail || row?.username || row?.email || '').trim();
}

function _studentRowId(row = {}) {
  return String(row?.studentId || row?.studentNumber || row?.studentNo || '').trim();
}

function _isPlaceholderStudentIdentity(row = {}) {
  if (String(row?.role || '').trim().toLowerCase() !== 'student') return false;
  const name = String(row?.name || '').trim();
  const email = String(row?.email || '').trim();
  const authEmail = String(row?.authEmail || row?.username || '').trim();
  const studentId = _studentRowId(row);
  return /^Student_/i.test(name) && !studentId && (!email || email === 'N/A') && !authEmail;
}

function _rosterCleanupRankRows(a = {}, b = {}) {
  const aProcessedPenalty = a?.isAuthOnlyProcessed ? 1 : 0;
  const bProcessedPenalty = b?.isAuthOnlyProcessed ? 1 : 0;
  if (aProcessedPenalty !== bProcessedPenalty) return aProcessedPenalty - bProcessedPenalty;
  if (Number(b?.workScore || 0) !== Number(a?.workScore || 0)) return Number(b?.workScore || 0) - Number(a?.workScore || 0);
  if (Boolean(a?.disabled) !== Boolean(b?.disabled)) return a?.disabled ? 1 : -1;
  const aUpdated = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
  const bUpdated = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
  return bUpdated - aUpdated;
}

function _buildRosterOnlyCleanupReport(users = {}, processedAuthUsers = {}, rosterRows = []) {
  const activeRosterRows = Array.isArray(rosterRows) ? rosterRows.filter((row) => row?.active !== false) : [];
  const studentRows = _baseActiveUsersRows(users, processedAuthUsers)
    .filter((row) => String(row?.role || '').trim().toLowerCase() === 'student');
  const report = {
    generatedAt: new Date().toISOString(),
    canonicalRows: [],
    duplicateRows: [],
    nonRosterRows: [],
    placeholderRows: [],
    invalidIdentityRows: [],
    removableRows: [],
    statusByUid: {},
  };
  const matchedGroups = new Map();

  studentRows.forEach((row) => {
    const authEmail = _studentRowAuthEmail(row);
    const studentId = _studentRowId(row);
    const rosterEntry = findRosterEntry(activeRosterRows, {
      authEmail,
      username: row?.username || authEmail,
      email: row?.personalEmail || row?.email,
      personalEmail: row?.personalEmail || row?.email,
      studentId,
    });
    const placeholder = _isPlaceholderStudentIdentity(row);
    const validUjIdentity = Boolean(authEmail) && isValidStudentUsername(authEmail);
    if (placeholder) {
      report.placeholderRows.push({ ...row, cleanupCategory: 'placeholder', rosterEntry: null });
      report.statusByUid[row.uid] = { code: 'placeholder', label: 'Placeholder', removable: true };
      return;
    }
    if (!validUjIdentity) {
      report.invalidIdentityRows.push({ ...row, cleanupCategory: 'invalid-identity', rosterEntry: rosterEntry || null });
      report.statusByUid[row.uid] = { code: 'invalid-identity', label: 'Invalid identity', removable: true };
      return;
    }
    if (!rosterEntry) {
      report.nonRosterRows.push({ ...row, cleanupCategory: 'non-roster', rosterEntry: null });
      report.statusByUid[row.uid] = { code: 'non-roster', label: 'Non-roster', removable: true };
      return;
    }

    const rosterKey = _canonicalRosterAuthEmail(rosterEntry) || (_rosterStudentIdValue(rosterEntry) ? `id:${_rosterStudentIdValue(rosterEntry)}` : '');
    const list = matchedGroups.get(rosterKey) || [];
    list.push({ ...row, cleanupCategory: 'roster-match', rosterEntry });
    matchedGroups.set(rosterKey, list);
  });

  matchedGroups.forEach((rows, rosterKey) => {
    const ranked = [...rows].sort(_rosterCleanupRankRows);
    const keeper = ranked[0];
    if (keeper) {
      report.canonicalRows.push({ ...keeper, rosterCleanupKey: rosterKey });
      report.statusByUid[keeper.uid] = { code: 'roster-canonical', label: 'Roster canonical', removable: false };
    }
    ranked.slice(1).forEach((row) => {
      report.duplicateRows.push({ ...row, rosterCleanupKey: rosterKey, keeper });
      report.statusByUid[row.uid] = { code: 'duplicate-noncanonical', label: 'Roster duplicate', removable: true };
    });
  });

  report.removableRows = []
    .concat(report.duplicateRows)
    .concat(report.nonRosterRows)
    .concat(report.placeholderRows)
    .concat(report.invalidIdentityRows);

  return report;
}

function _membershipMetaForRow(row = {}, cleanupReport = null) {
  if (String(row?.role || '').trim().toLowerCase() !== 'student') {
    return { code: 'staff', label: 'Staff', removable: false };
  }
  return cleanupReport?.statusByUid?.[row.uid] || { code: 'unknown', label: 'Unclassified', removable: false };
}

function _activeUsersRows(users = {}, processedAuthUsers = {}) {
  const rows = _baseActiveUsersRows(users, processedAuthUsers);
  return rows.map((row) => {
    const membership = _membershipMetaForRow(row, _rosterOnlyCleanupReport);
    return {
      ...row,
      membershipStatus: membership.code,
      membershipLabel: membership.label,
      membershipRemovable: Boolean(membership.removable),
    };
  });
}

function _umNormText(v = '') {
  return String(v || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _umQueryTokens(query = '') {
  return _umNormText(query).split(' ').filter(Boolean);
}

function _umSearchBlob(row = {}) {
  return _umNormText([
    row.name,
    row.email,
    row.uid,
    row.role,
    row.studentId,
    row.tutorialGroup,
    row.username,
    row.disabled ? 'disabled inactive blocked' : 'active enabled',
  ].join(' '));
}

function _umMatchesQuery(row = {}, query = '') {
  const tokens = _umQueryTokens(query);
  if (!tokens.length) return true;
  const blob = _umSearchBlob(row);
  return tokens.every((token) => blob.includes(token));
}

function _umResetStatusMeta(row = {}) {
  const status = String(row?.rosterEnrollmentStatus || '').trim().toLowerCase();
  if (status === 'reset-email-sent') return { label: 'Reset sent', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' };
  if (status === 'created-pending-reset-email' || status === 'pending-reset-email') return { label: 'Pending reset', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
  if (status === 'reset-email-failed') return { label: 'Reset failed', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
  return { label: 'No reset logged', color: 'var(--muted)', bg: 'var(--cream2)', border: 'var(--border)' };
}

function _umFormatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function _umNeedsResetAttention(row = {}) {
  if (row.role !== 'student' || row.disabled) return false;
  const status = String(row?.rosterEnrollmentStatus || '').trim().toLowerCase();
  return status !== 'reset-email-sent';
}

function _umIsNewlyCreatedAccount(row = {}) {
  return String(row?.source || '').trim().toLowerCase() === 'lecturer-user-manager';
}

function _umHasMissingFirebaseProfile(row = {}) {
  return Boolean(row?.isAuthOnlyProcessed);
}

function _umHasResetSent(row = {}) {
  return String(row?.rosterEnrollmentStatus || '').trim().toLowerCase() === 'reset-email-sent';
}

function _umHasInvalidStudentIdentity(row = {}) {
  if (row.role !== 'student' && !row.isAuthOnlyProcessed) return false;
  const authEmail = String(row?.authEmail || row?.username || row?.email || '').trim();
  return !authEmail || !isValidStudentUsername(authEmail);
}

function _umIsRosterCanonical(row = {}) {
  return String(row?.membershipStatus || '').trim().toLowerCase() === 'roster-canonical';
}

function _umIsDuplicateNonCanonical(row = {}) {
  return String(row?.membershipStatus || '').trim().toLowerCase() === 'duplicate-noncanonical';
}

function _umIsNonRosterStudent(row = {}) {
  return String(row?.membershipStatus || '').trim().toLowerCase() === 'non-roster';
}

function _umIsPlaceholderStudent(row = {}) {
  return String(row?.membershipStatus || '').trim().toLowerCase() === 'placeholder';
}

function _getVisibleUserManagementRows(rows = []) {
  const roleFilter = String(document.getElementById('um-filter-role')?.value || 'all');
  const q = String(document.getElementById('um-filter-q')?.value || '').trim();
  const includeDisabled = Boolean(document.getElementById('um-filter-disabled')?.checked);
  const resetAttentionOnly = Boolean(document.getElementById('um-filter-reset-attention')?.checked);
  const newAccountsOnly = Boolean(document.getElementById('um-filter-new-created')?.checked);
  const recoveryState = String(document.getElementById('um-filter-recovery-state')?.value || 'all');
  const membershipFilter = String(document.getElementById('um-filter-membership')?.value || 'all');

  return rows.filter((r) => {
    if (!includeDisabled && r.disabled) return false;
    if (roleFilter !== 'all' && r.role !== roleFilter) return false;
    if (resetAttentionOnly && !_umNeedsResetAttention(r)) return false;
    if (newAccountsOnly && !_umIsNewlyCreatedAccount(r)) return false;
    if (recoveryState === 'missing-no-reset' && !(_umHasMissingFirebaseProfile(r) && !_umHasResetSent(r))) return false;
    if (recoveryState === 'missing-reset-sent' && !(_umHasMissingFirebaseProfile(r) && _umHasResetSent(r))) return false;
    if (recoveryState === 'invalid-student-email' && !_umHasInvalidStudentIdentity(r)) return false;
    if (membershipFilter === 'non-roster' && !_umIsNonRosterStudent(r)) return false;
    if (membershipFilter === 'duplicate-noncanonical' && !_umIsDuplicateNonCanonical(r)) return false;
    if (membershipFilter === 'invalid-identity' && String(r?.membershipStatus || '') !== 'invalid-identity') return false;
    if (membershipFilter === 'placeholder' && !_umIsPlaceholderStudent(r)) return false;
    if (membershipFilter === 'roster-canonical' && !_umIsRosterCanonical(r)) return false;
    return _umMatchesQuery(r, q);
  });
}

function _renderUserManagementTable(rows = []) {
  const host = document.getElementById('um-users-table');
  if (!host) return;
  const filtered = _getVisibleUserManagementRows(rows);
  const totalPages = Math.max(1, Math.ceil(filtered.length / _UM_PAGE_SIZE));
  _umPage = Math.min(Math.max(1, _umPage), totalPages);
  const pageStart = (_umPage - 1) * _UM_PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + _UM_PAGE_SIZE);

  host.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Visible users: <strong>${filtered.length}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Disabled: <strong>${rows.filter(r => r.disabled).length}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Visible students: <strong>${filtered.filter(r => r.role === 'student' && !r.disabled).length}</strong></span>
      <span style="background:#eef6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font-size:12px;color:#1d4ed8;">Roster canonical: <strong>${filtered.filter((r) => _umIsRosterCanonical(r)).length}</strong></span>
      <span style="background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:4px 10px;font-size:12px;color:#9a3412;">Removable duplicates: <strong>${filtered.filter((r) => _umIsDuplicateNonCanonical(r)).length}</strong></span>
      <span style="background:#fef2f2;border:1px solid #fecaca;border-radius:999px;padding:4px 10px;font-size:12px;color:#991b1b;">Non-roster: <strong>${filtered.filter((r) => _umIsNonRosterStudent(r)).length}</strong></span>
      <span style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:999px;padding:4px 10px;font-size:12px;color:#7e22ce;">Placeholder: <strong>${filtered.filter((r) => _umIsPlaceholderStudent(r)).length}</strong></span>
      <span style="background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:4px 10px;font-size:12px;color:#9a3412;">Need reset attention: <strong>${filtered.filter((r) => _umNeedsResetAttention(r)).length}</strong></span>
      <span style="background:#eef6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font-size:12px;color:#1d4ed8;">Created here: <strong>${filtered.filter((r) => _umIsNewlyCreatedAccount(r)).length}</strong></span>
      <span style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font-size:12px;color:#1d4ed8;">No profile + no reset: <strong>${filtered.filter((r) => _umHasMissingFirebaseProfile(r) && !_umHasResetSent(r)).length}</strong></span>
      <span style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:4px 10px;font-size:12px;color:#166534;">No profile + reset sent: <strong>${filtered.filter((r) => _umHasMissingFirebaseProfile(r) && _umHasResetSent(r)).length}</strong></span>
      <span style="background:#fef2f2;border:1px solid #fecaca;border-radius:999px;padding:4px 10px;font-size:12px;color:#991b1b;">Invalid UJ email: <strong>${filtered.filter((r) => _umHasInvalidStudentIdentity(r)).length}</strong></span>
      <span style="background:white;border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Page: <strong>${_umPage}</strong> / ${totalPages}</span>
    </div>
    <div style="border:1px solid var(--border);border-radius:10px;overflow:auto;background:white;">
      <table style="width:100%;border-collapse:collapse;text-align:left;min-width:860px;">
        <thead>
          <tr>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Name</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Email</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">UID</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Role</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Membership</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Reset Status</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Last Reset</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Status</th>
            <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((r) => {
            const resetMeta = _umResetStatusMeta(r);
            return `
            <tr>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-weight:700;color:var(--navy);">${_esc(r.name)}</td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">${_esc(r.email || '—')}</td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);font-family:var(--font-mono);">${_esc(r.isAuthOnlyProcessed ? 'auth-only pending' : r.uid)}</td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);">
                ${r.isAuthOnlyProcessed
                  ? `<span style="font-size:12px;color:#1d4ed8;font-weight:700;">student (pending profile)</span>`
                  : `<select id="um-role-${_esc(r.uid)}" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;">
                  ${_USER_ROLES.map((role) => `<option value="${role}" ${r.role === role ? 'selected' : ''}>${role}</option>`).join('')}
                </select>`}
              </td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;">
                <span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;border:1px solid ${
                  r.membershipStatus === 'roster-canonical' ? '#bfdbfe'
                    : r.membershipStatus === 'duplicate-noncanonical' ? '#fed7aa'
                      : r.membershipStatus === 'non-roster' ? '#fecaca'
                        : r.membershipStatus === 'placeholder' ? '#e9d5ff'
                          : r.membershipStatus === 'invalid-identity' ? '#fecaca'
                            : 'var(--border)'
                };background:${
                  r.membershipStatus === 'roster-canonical' ? '#eff6ff'
                    : r.membershipStatus === 'duplicate-noncanonical' ? '#fff7ed'
                      : r.membershipStatus === 'non-roster' ? '#fef2f2'
                        : r.membershipStatus === 'placeholder' ? '#fdf4ff'
                          : r.membershipStatus === 'invalid-identity' ? '#fef2f2'
                            : 'var(--cream2)'
                };color:${
                  r.membershipStatus === 'roster-canonical' ? '#1d4ed8'
                    : r.membershipStatus === 'duplicate-noncanonical' ? '#9a3412'
                      : r.membershipStatus === 'non-roster' ? '#991b1b'
                        : r.membershipStatus === 'placeholder' ? '#7e22ce'
                          : r.membershipStatus === 'invalid-identity' ? '#991b1b'
                            : 'var(--muted)'
                };font-size:11px;font-weight:700;white-space:nowrap;">${_esc(r.membershipLabel || '—')}</span>
              </td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);">
                <span title="${_esc(r.lastPasswordResetError || r.rosterEnrollmentStatus || '')}" style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;border:1px solid ${resetMeta.border};background:${resetMeta.bg};color:${resetMeta.color};font-size:11px;font-weight:700;white-space:nowrap;">${_esc(resetMeta.label)}</span>
              </td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);white-space:nowrap;">${_esc(_umFormatTimestamp(r.lastPasswordResetSentAt))}</td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:${r.isAuthOnlyProcessed ? '#1d4ed8' : r.disabled ? '#b91c1c' : '#166534'};">${r.isAuthOnlyProcessed ? 'Processed auth-only' : r.disabled ? 'Disabled' : 'Active'}</td>
              <td style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;">
                ${r.isAuthOnlyProcessed ? '' : `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;" onclick="_umUpdateRole('${_esc(r.uid)}')">Save Role</button>`}
                ${r.role === 'student' && !r.disabled ? `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#ede9fe;border-color:#ddd6fe;color:#5b21b6;" onclick="_umResendResetLink('${_esc(r.uid)}')">Resend Reset</button>` : ''}
                ${r.isAuthOnlyProcessed ? '' : `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;${r.disabled ? '' : 'background:#fef2f2;border-color:#fecaca;color:#991b1b;'}" onclick="_umToggleDisabled('${_esc(r.uid)}', ${r.disabled ? 'false' : 'true'})">${r.disabled ? 'Restore' : 'Disable'}</button>`}
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="9" style="padding:14px;color:var(--muted);">No users match this filter.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
      <div style="font-size:12px;color:var(--muted);">Showing ${filtered.length ? pageStart + 1 : 0}-${Math.min(pageStart + _UM_PAGE_SIZE, filtered.length)} of ${filtered.length}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_umPage <= 1 ? 'opacity:.5;cursor:not-allowed;' : ''}" ${_umPage <= 1 ? 'disabled' : 'onclick="_umSetPage(' + (_umPage - 1) + ')"'}>← Prev</button>
        <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_umPage >= totalPages ? 'opacity:.5;cursor:not-allowed;' : ''}" ${_umPage >= totalPages ? 'disabled' : 'onclick="_umSetPage(' + (_umPage + 1) + ')"'}>Next →</button>
      </div>
    </div>`;
}

window._umSetPage = (page = 1) => {
  _umPage = Math.max(1, Number(page || 1));
  _renderUserManagementTable(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
};

function _renderProfileRecoveryLog() {
  const host = document.getElementById('um-recovery-log');
  if (!host) return;
  const filter = String(_umRecoveryLogFilter || 'all').toLowerCase();
  const visibleEntries = _umRecoveryLogCache.filter((entry) => {
    if (filter === 'all') return true;
    return String(entry?.status || '').toLowerCase() === filter;
  });
  if (!visibleEntries.length) {
    host.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:12px;">${filter === 'all' ? 'No missing-profile recovery attempts logged yet.' : 'No recovery attempts match the selected status filter.'}</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / _UM_RECOVERY_LOG_PAGE_SIZE));
  _umRecoveryLogPage = Math.min(Math.max(1, _umRecoveryLogPage), totalPages);
  const pageStart = (_umRecoveryLogPage - 1) * _UM_RECOVERY_LOG_PAGE_SIZE;
  const pageEntries = visibleEntries.slice(pageStart, pageStart + _UM_RECOVERY_LOG_PAGE_SIZE);

  host.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Visible attempts: <strong>${visibleEntries.length}</strong></span>
      <span style="background:white;border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Page: <strong>${_umRecoveryLogPage}</strong> / ${totalPages}</span>
    </div>
    <div style="display:grid;gap:10px;">
      ${pageEntries.map((entry) => {
    const statusColor = entry?.status === 'success'
      ? { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' }
      : entry?.status === 'warn'
        ? { color: '#92400e', bg: '#fffbeb', border: '#fde68a' }
        : { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
    return `
      <div style="padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:white;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-weight:800;color:var(--navy);">${_esc(entry?.email || 'Unknown account')}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">${_esc(entry?.source || 'manual')} · ${_esc(_umFormatTimestamp(entry?.at))}</div>
          </div>
          <span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;border:1px solid ${statusColor.border};background:${statusColor.bg};color:${statusColor.color};font-size:11px;font-weight:700;white-space:nowrap;">${_esc(entry?.statusLabel || 'Logged')}</span>
        </div>
        <div style="font-size:12px;color:var(--navy);margin-top:8px;line-height:1.6;">${_esc(entry?.message || '')}</div>
      </div>
    `;
  }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;">
      <div style="font-size:12px;color:var(--muted);">Showing ${pageStart + 1}-${Math.min(pageStart + _UM_RECOVERY_LOG_PAGE_SIZE, visibleEntries.length)} of ${visibleEntries.length}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_umRecoveryLogPage <= 1 ? 'opacity:.5;cursor:not-allowed;' : ''}" ${_umRecoveryLogPage <= 1 ? 'disabled' : `onclick="_umSetRecoveryLogPage(${_umRecoveryLogPage - 1})"`}>← Prev</button>
        <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;${_umRecoveryLogPage >= totalPages ? 'opacity:.5;cursor:not-allowed;' : ''}" ${_umRecoveryLogPage >= totalPages ? 'disabled' : `onclick="_umSetRecoveryLogPage(${_umRecoveryLogPage + 1})"`}>Next →</button>
      </div>
    </div>`;
}

window._setRecoveryLogFilter = (nextFilter = 'all') => {
  _umRecoveryLogFilter = String(nextFilter || 'all').toLowerCase();
  _umRecoveryLogPage = 1;
  const select = document.getElementById('um-recovery-log-filter');
  if (select && select.value !== _umRecoveryLogFilter) select.value = _umRecoveryLogFilter;
  _renderProfileRecoveryLog();
};

window._umSetRecoveryLogPage = (page = 1) => {
  _umRecoveryLogPage = Math.max(1, Number(page || 1));
  _renderProfileRecoveryLog();
};

async function _loadProfileRecoveryLog() {
  try {
    const snap = await get(ref(db, 'analytics/profile-recovery-attempts'));
    if (!snap.exists()) {
      _umRecoveryLogCache = [];
      _renderProfileRecoveryLog();
      return;
    }

    const entries = [];
    const raw = snap.val() || {};
    Object.entries(raw).forEach(([dayKey, dayEntries]) => {
      Object.entries(dayEntries || {}).forEach(([entryKey, entry]) => {
        entries.push({ id: entryKey, dayKey, ...(entry || {}) });
      });
    });
    entries.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    _umRecoveryLogCache = entries;
    _renderProfileRecoveryLog();
  } catch {
    _umRecoveryLogCache = [];
    _renderProfileRecoveryLog();
  }
}

async function _logProfileRecoveryAttempt({
  email,
  status = 'success',
  statusLabel,
  message,
  source = 'manual-recovery',
}) {
  const nowIso = new Date().toISOString();
  const dayKey = nowIso.slice(0, 10);
  const logKey = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const payload = {
    at: nowIso,
    email: String(email || '').trim(),
    status: String(status || 'success'),
    statusLabel: String(statusLabel || (status === 'success' ? 'Success' : status === 'warn' ? 'Attention' : 'Failed')),
    message: String(message || '').trim(),
    source: String(source || 'manual-recovery'),
    byUid: STATE.user?.uid || null,
    byName: STATE.user?.displayName || STATE.user?.email || null,
  };
  await set(ref(db, `analytics/profile-recovery-attempts/${dayKey}/${logKey}`), payload);
  _umRecoveryLogCache = [payload, ..._umRecoveryLogCache]
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  _umRecoveryLogPage = 1;
  _renderProfileRecoveryLog();
}

window._umApplyFilters = () => {
  _umPage = 1;
  _renderUserManagementTable(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
};

window._umClearSearch = () => {
  const input = document.getElementById('um-filter-q');
  if (input) input.value = '';
  const recoveryState = document.getElementById('um-filter-recovery-state');
  if (recoveryState) recoveryState.value = 'all';
  const membership = document.getElementById('um-filter-membership');
  if (membership) membership.value = 'all';
  _umPage = 1;
  _renderUserManagementTable(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
};

window._umSetRecoveryStateFilter = (value = 'all') => {
  const select = document.getElementById('um-filter-recovery-state');
  if (select && select.value !== value) select.value = value;
  _umPage = 1;
  _renderUserManagementTable(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
};

async function _umRefreshUsers() {
  const [usersSnap, rosterSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'rosters/classList')),
    _loadProcessedAuthUsers().catch(() => ({})),
  ]);
  _umUsersCache = usersSnap.exists() ? usersSnap.val() : {};
  _umRosterRowsCache = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
  _rosterOnlyCleanupReport = _buildRosterOnlyCleanupReport(_umUsersCache, _umProcessedAuthUsersCache, _umRosterRowsCache);
  _renderUserManagementTable(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
}

async function _createAuthUserViaRest({ name, email, password, role }) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing Firebase API key (VITE_FIREBASE_API_KEY).');

  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const signUpData = await signUpRes.json();
  if (!signUpRes.ok || signUpData?.error) {
    throw new Error(signUpData?.error?.message || 'Could not create auth user');
  }

  const uid = signUpData.localId;
  const idToken = signUpData.idToken;
  const displayName = `${name} [${role}]`;

  const updateRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, displayName, returnSecureToken: false }),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok || updateData?.error) {
    throw new Error(updateData?.error?.message || 'Created auth user but failed to set profile name');
  }

  return { uid, displayName };
}

async function _lookupAuthAccountByEmail(email) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing Firebase API key (VITE_FIREBASE_API_KEY).');

  const normalizedEmail = normalizeStudentUsername(email);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: normalizedEmail,
      continueUri: window.location.origin,
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || 'Could not check existing auth account');
  }
  return {
    email: normalizedEmail,
    registered: Boolean(data?.registered),
    signinMethods: Array.isArray(data?.signinMethods) ? data.signinMethods : [],
  };
}

function _findActiveRosterEntryForStudent(rowOrEmail, rosterRows = _umRosterRowsCache) {
  if (typeof rowOrEmail === 'string') {
    const email = normalizeStudentUsername(rowOrEmail);
    return findRosterEntry(rosterRows || [], { authEmail: email, username: email });
  }
  const row = rowOrEmail || {};
  return findRosterEntry(rosterRows || [], {
    authEmail: row?.authEmail || row?.username || row?.email || '',
    username: row?.username || row?.authEmail || row?.email || '',
    email: row?.personalEmail || row?.email || '',
    personalEmail: row?.personalEmail || row?.email || '',
    studentId: row?.studentId || row?.studentNumber || row?.studentNo || '',
  });
}

async function _sendRosterResetEmail(email) {
  await sendPasswordResetEmail(auth, email);
}

async function _sendUserResetLink(uid, user) {
  const profile = user?.profile || {};
  const role = _roleFromProfile(user);
  if (role !== 'student') {
    throw new Error('Reset-link resend is limited to student accounts.');
  }
  if (profile?.disabled) {
    throw new Error('Restore the student account before sending a reset link.');
  }

  const rawEmail = String(profile?.authEmail || profile?.username || profile?.email || '').trim();
  const email = normalizeStudentUsername(rawEmail);
  if (!email || !isValidStudentUsername(email)) {
    throw new Error('This student does not have a valid UJ email/username on record.');
  }
  if (!_findActiveRosterEntryForStudent({
    authEmail: email,
    username: profile?.username || email,
    email: profile?.personalEmail || profile?.email || '',
    personalEmail: profile?.personalEmail || profile?.email || '',
    studentId: profile?.studentId || profile?.studentNumber || profile?.studentNo || '',
  })) {
    throw new Error('This student is not on the current class roster.');
  }

  await _sendRosterResetEmail(email);
  await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
    ...profile,
    uid,
    role: 'student',
    username: profile?.username || email,
    authEmail: email,
    mustResetPassword: true,
    rosterEnrollmentStatus: 'reset-email-sent',
    lastPasswordResetSentAt: new Date().toISOString(),
    lastPasswordResetSentByUid: STATE.user?.uid || null,
    updatedAt: new Date().toISOString(),
    updatedByUid: STATE.user?.uid || null,
  }));
  return email;
}

async function _sendAuthOnlyResetLink(row = {}) {
  const email = normalizeStudentUsername(row?.authEmail || row?.username || row?.email || '');
  if (!email || !isValidStudentUsername(email)) {
    throw new Error('This processed auth-only user does not have a valid UJ email/username on record.');
  }
  if (!_findActiveRosterEntryForStudent(row)) {
    throw new Error('This processed auth-only user is not on the current class roster.');
  }
  await _sendRosterResetEmail(email);
  await _upsertProcessedAuthUser(email, {
    name: row?.name || `Pending profile (${email})`,
    studentId: row?.studentId || '',
    tutorialGroup: row?.tutorialGroup || '',
    rosterEnrollmentStatus: 'reset-email-sent',
    lastPasswordResetSentAt: new Date().toISOString(),
    lastPasswordResetSentByUid: STATE.user?.uid || null,
    lastPasswordResetError: '',
  });
  return email;
}

window._umRecoverMissingProfile = async () => {
  const input = document.getElementById('um-recover-email');
  const rawValue = String(input?.value || '').trim();
  const email = normalizeStudentUsername(rawValue);

  if (!email || !isValidStudentUsername(email)) {
    _showLecturerToast('Enter a student number or valid UJ student email first.', 'warn', 3200);
    return;
  }
  if (!_findActiveRosterEntryForStudent(email)) {
    _showLecturerToast('This UJ student account is not on the active class roster. Update the roster before recovery.', 'warn', 4200);
    return;
  }

  try {
    const existingUserRow = _activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache).find((row) => normalizeStudentUsername(row.authEmail || row.username || row.email || '') === email);
    if (existingUserRow) {
      const wantsResend = confirm(`${email} already has an app profile in User Management. Send another reset link?`);
      if (!wantsResend) return;
      const user = _umUsersCache?.[existingUserRow.uid];
      if (!user) throw new Error('User exists in the table but could not be loaded from cache. Refresh and try again.');
      await _sendUserResetLink(existingUserRow.uid, user);
      await _umRefreshUsers();
      await _logProfileRecoveryAttempt({
        email,
        status: 'success',
        statusLabel: 'Reset sent',
        message: 'Existing app profile found in User Management. Reset link resent from the recovery tool.',
        source: 'recover-panel-existing-profile',
      }).catch(() => { });
      _showLecturerToast(`Reset link sent to ${email}.`, 'success', 3200);
      return;
    }

    const authLookup = await _lookupAuthAccountByEmail(email);
    if (!authLookup.registered) {
      await _logProfileRecoveryAttempt({
        email,
        status: 'warn',
        statusLabel: 'No auth account',
        message: 'Recovery check found no Firebase Auth account. Lecturer must create the user or use roster enrollment.',
        source: 'recover-panel-auth-check',
      }).catch(() => { });
      _showLecturerToast(`No Firebase Auth account exists for ${email}. Create the user or use roster enrollment instead.`, 'warn', 4200);
      return;
    }

    const wantsReset = confirm(`Firebase Auth already has ${email}, but no app profile is visible in User Management. Send a reset link so the student can sign in and recreate the profile?`);
    if (!wantsReset) return;

    await _sendRosterResetEmail(email);
    await _upsertProcessedAuthUser(email, {
      name: `Pending profile (${email})`,
      rosterEnrollmentStatus: 'reset-email-sent',
      lastPasswordResetSentAt: new Date().toISOString(),
      lastPasswordResetSentByUid: STATE.user?.uid || null,
      lastPasswordResetError: '',
    }).catch(() => { });
    await _umRefreshUsers().catch(() => { });
    await _logProfileRecoveryAttempt({
      email,
      status: 'success',
      statusLabel: 'Reset sent',
      message: 'Firebase Auth account exists but no app profile was visible. Reset link sent so the student can recreate the profile on sign-in.',
      source: 'recover-panel-auth-only',
    }).catch(() => { });
    _showLecturerToast(`Reset link sent to ${email}. After one successful sign-in, the profile should reappear in User Management.`, 'success', 4600);
  } catch (err) {
    await _logProfileRecoveryAttempt({
      email,
      status: 'error',
      statusLabel: 'Recovery failed',
      message: String(err?.message || err || 'Unknown error'),
      source: 'recover-panel-error',
    }).catch(() => { });
    _showLecturerToast(`Profile recovery check failed: ${err?.message || err || 'Unknown error'}`, 'warn', 4600);
  }
};

function _buildRosterEnrollmentProfilePayload(item, uid) {
  const existingProfile = item?.existing?.existingProfile || {};
  const mergedProfile = item?.mergedProfile || {};
  const now = new Date().toISOString();
  return _cleanFirebaseValue({
    ...mergedProfile,
    ...existingProfile,
    ...mergedProfile,
    uid,
    role: 'student',
    username: item?.authEmail || mergedProfile?.username || existingProfile?.username || '',
    authEmail: item?.authEmail || mergedProfile?.authEmail || existingProfile?.authEmail || '',
    email: item?.personalEmail || mergedProfile?.email || existingProfile?.email || '',
    personalEmail: item?.personalEmail || mergedProfile?.personalEmail || existingProfile?.personalEmail || '',
    disabled: Boolean(existingProfile?.disabled),
    createdAt: existingProfile?.createdAt || now,
    createdByUid: existingProfile?.createdByUid || STATE.user?.uid || null,
    updatedAt: now,
    updatedByUid: STATE.user?.uid || null,
    source: existingProfile?.source || 'lecturer-roster-enrollment',
    rosterLinkedAt: now,
    rosterLinkedByUid: STATE.user?.uid || null,
    needsProfileReview: true,
    mustResetPassword: true,
    passwordResetRequiredAt: now,
    rosterEnrollmentStatus: 'pending-reset-email',
  });
}

let _umBulkActivationLastInput = '';

function _canonicalBulkActivationEmail(studentId = '') {
  const digits = String(studentId || '').replace(/\D+/g, '').trim();
  return digits ? normalizeStudentUsername(`${digits}@student.uj.ac.za`) : '';
}

function _parseBulkStudentActivationList(raw = '') {
  const entries = [];
  const invalid = [];

  String(raw || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const match = line.match(/^(.*?)\s*\(([^,()]+)\s*,\s*([0-9]{6,})\)\s*$/);
      if (!match) {
        invalid.push({ line, lineNo: index + 1, reason: 'Expected "Name (email, studentNumber)" format.' });
        return;
      }
      const [, rawName, rawPersonalEmail, rawStudentId] = match;
      const studentId = String(rawStudentId || '').replace(/\D+/g, '').trim();
      const authEmail = _canonicalBulkActivationEmail(studentId);
      const personalEmail = _normEmail(rawPersonalEmail || '');
      if (!studentId || !authEmail) {
        invalid.push({ line, lineNo: index + 1, reason: 'Missing a valid student number.' });
        return;
      }
      entries.push({
        line,
        lineNo: index + 1,
        name: String(rawName || '').trim(),
        personalEmail,
        studentId,
        authEmail,
      });
    });

  return { entries, invalid };
}

function _renderBulkStudentActivationSummary(results = {}) {
  const block = (title, items = [], tone = '#0f172a') => {
    if (!items.length) return '';
    return `
      <div style="border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:white;">
        <div style="font-size:12px;font-weight:800;color:${tone};text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">${_esc(title)} · ${items.length}</div>
        <div style="display:grid;gap:6px;max-height:140px;overflow:auto;">
          ${items.map((item) => `<div style="font-size:12px;color:var(--navy);line-height:1.45;">${_esc(item)}</div>`).join('')}
        </div>
      </div>`;
  };

  return `
    <div style="display:grid;gap:10px;margin-top:14px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
        <div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Processed</div>
          <div style="font-size:26px;color:#166534;font-weight:800;line-height:1.1;">${Number(results.processed || 0)}</div>
        </div>
        <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Created</div>
          <div style="font-size:26px;color:#1d4ed8;font-weight:800;line-height:1.1;">${Number(results.createdCount || 0)}</div>
        </div>
        <div style="border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;color:#5b21b6;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Restored</div>
          <div style="font-size:26px;color:#5b21b6;font-weight:800;line-height:1.1;">${Number(results.restoredCount || 0)}</div>
        </div>
        <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:10px 12px;">
          <div style="font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Manual review</div>
          <div style="font-size:26px;color:#92400e;font-weight:800;line-height:1.1;">${Number(results.manualCount || 0)}</div>
        </div>
      </div>
      ${block('Created accounts', results.created || [], '#1d4ed8')}
      ${block('Restored or aligned accounts', results.restored || [], '#5b21b6')}
      ${block('Reset sent to existing auth account', results.authOnly || [], '#0369a1')}
      ${block('Manual review required', results.manual || [], '#92400e')}
      ${block('Failed', results.failed || [], '#b91c1c')}
      ${block('Invalid lines', results.invalidLines || [], '#b91c1c')}
    </div>`;
}

window._openBulkStudentActivationModal = () => {
  document.getElementById('um-bulk-activate-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'um-bulk-activate-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100002;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="width:min(920px,100%);max-height:min(90vh,920px);overflow:auto;background:#fff;border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 24px 54px rgba(0,0,0,.28);">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px;">
        <div>
          <h3 style="margin:0;color:var(--navy);font-size:20px;">Bulk Activate Students from List</h3>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.6;">
            Paste lines in the format <strong>Name (personal email, student number)</strong>. The tool reconstructs the canonical UJ sign-in as <strong>studentNumber@student.uj.ac.za</strong>, checks the active roster, and only auto-processes safe cases.
          </div>
        </div>
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('um-bulk-activate-overlay')?.remove()">Close</button>
      </div>
      <textarea id="um-bulk-activate-input" rows="18" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;font-size:12px;font-family:'DM Mono',monospace;line-height:1.5;resize:vertical;" placeholder="G H Zulu (gcinahope.zulu@gmail.com, 218022155)">${_esc(_umBulkActivationLastInput)}</textarea>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;">
        <div style="font-size:12px;color:#92400e;line-height:1.5;max-width:640px;">
          Disabled non-canonical duplicates are not auto-restored. They are flagged for manual review so the tool does not revive the wrong account.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('um-bulk-activate-input').value=''">Clear</button>
          <button class="btn-next" style="display:inline-flex;" onclick="_submitBulkStudentActivation()">Activate Safe Matches</button>
        </div>
      </div>
      <div id="um-bulk-activate-results"></div>
    </div>`;
  document.body.appendChild(overlay);
};

function _matchBulkActivationRows(entry, activeRows = _activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache)) {
  const authEmail = normalizeStudentUsername(entry?.authEmail || '');
  const personalEmail = _normEmail(entry?.personalEmail || '');
  const studentId = String(entry?.studentId || '').trim();
  return (activeRows || []).filter((row) => {
    if (String(row?.role || '').trim().toLowerCase() !== 'student') return false;
    const rowAuthEmail = normalizeStudentUsername(_studentRowAuthEmail(row));
    const rowPersonalEmail = _normEmail(row?.personalEmail || row?.email || '');
    const rowStudentId = _studentRowId(row);
    return Boolean(
      (authEmail && rowAuthEmail === authEmail)
      || (personalEmail && rowPersonalEmail === personalEmail)
      || (studentId && rowStudentId === studentId)
    );
  });
}

function _buildBulkActivationItem(entry, rosterEntry, existingProfile = {}, uid = null) {
  const authEmail = normalizeStudentUsername(entry?.authEmail || '');
  const personalEmail = _normEmail(entry?.personalEmail || '');
  const studentId = String(entry?.studentId || '').trim();
  const mergedProfile = buildStudentProfileDraft(
    { uid: uid || null, email: authEmail },
    existingProfile || {},
    rosterEntry || {},
    {
      authEmail,
      username: authEmail,
      email: personalEmail,
      personalEmail,
      studentId,
    }
  );
  return {
    row: rosterEntry || {},
    authEmail,
    personalEmail,
    studentId,
    displayName: _rosterDisplayName(rosterEntry || {}) || String(entry?.name || '').trim() || mergedProfile?.displayName || authEmail,
    existing: uid ? { uid, existingProfile: existingProfile || {} } : null,
    uid: uid || null,
    mergedProfile,
  };
}

async function _activateSingleStudentFromList(entry) {
  const authEmail = normalizeStudentUsername(entry?.authEmail || '');
  const studentId = String(entry?.studentId || '').trim();
  const displayLabel = `${entry?.name || authEmail} (${studentId || authEmail})`;
  const rosterEntry = _findActiveRosterEntryForStudent({
    authEmail,
    username: authEmail,
    email: entry?.personalEmail || '',
    personalEmail: entry?.personalEmail || '',
    studentId,
  });

  if (!rosterEntry) {
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'warn',
      statusLabel: 'Not on roster',
      message: `${displayLabel} was skipped because the student is not on the active class roster.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'manual', message: `${displayLabel} -> not on active roster` };
  }

  const matches = _matchBulkActivationRows(entry);
  const canonicalMatches = matches.filter((row) => normalizeStudentUsername(_studentRowAuthEmail(row)) === authEmail);
  const realCanonical = canonicalMatches.filter((row) => !row.isAuthOnlyProcessed);
  const authOnlyCanonical = canonicalMatches.find((row) => row.isAuthOnlyProcessed);
  const conflictingRealMatches = matches.filter((row) => !row.isAuthOnlyProcessed);

  if (realCanonical.length > 1 || conflictingRealMatches.length > 1) {
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'warn',
      statusLabel: 'Manual review',
      message: `${displayLabel} matched multiple student profiles and was skipped for manual review.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'manual', message: `${displayLabel} -> multiple existing student profiles matched` };
  }

  if (!realCanonical.length && conflictingRealMatches.length === 1) {
    const conflicting = conflictingRealMatches[0];
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'warn',
      statusLabel: 'Manual review',
      message: `${displayLabel} matched a non-canonical student profile (${_studentRowAuthEmail(conflicting) || conflicting.uid}) and was skipped to avoid restoring the wrong account.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'manual', message: `${displayLabel} -> matched non-canonical account ${_studentRowAuthEmail(conflicting) || conflicting.uid}` };
  }

  if (realCanonical.length === 1) {
    const row = realCanonical[0];
    const user = _umUsersCache?.[row.uid];
    if (!user) {
      throw new Error(`${displayLabel}: user cache could not load ${row.uid}`);
    }
    const item = _buildBulkActivationItem(entry, rosterEntry, user.profile || {}, row.uid);
    const basePayload = _buildRosterEnrollmentProfilePayload(item, row.uid);
    const payload = _cleanFirebaseValue({
      ...basePayload,
      uid: row.uid,
      disabled: false,
      status: 'active',
      authEmail,
      username: authEmail,
      email: item.personalEmail || basePayload.email || '',
      personalEmail: item.personalEmail || basePayload.personalEmail || '',
      rosterEnrollmentStatus: 'pending-reset-email',
    });
    await set(ref(db, `users/${row.uid}/profile`), payload);
    await _sendRosterResetEmail(authEmail);
    await set(ref(db, `users/${row.uid}/profile`), _cleanFirebaseValue({
      ...payload,
      uid: row.uid,
      rosterEnrollmentStatus: 'reset-email-sent',
      lastPasswordResetSentAt: new Date().toISOString(),
      lastPasswordResetSentByUid: STATE.user?.uid || null,
      lastPasswordResetError: '',
    }));
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'success',
      statusLabel: row.disabled ? 'Restored + reset' : 'Aligned + reset',
      message: `${displayLabel} ${row.disabled ? 'was restored' : 'was aligned to the canonical UJ account'} and a reset link was sent.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'restored', message: `${displayLabel} -> ${row.disabled ? 'restored' : 'aligned'} and reset sent` };
  }

  if (authOnlyCanonical) {
    await _sendRosterResetEmail(authEmail);
    await _upsertProcessedAuthUser(authEmail, {
      name: _rosterDisplayName(rosterEntry) || entry?.name || `Pending profile (${authEmail})`,
      studentId,
      rosterEnrollmentStatus: 'reset-email-sent',
      lastPasswordResetSentAt: new Date().toISOString(),
      lastPasswordResetSentByUid: STATE.user?.uid || null,
      lastPasswordResetError: '',
    });
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'success',
      statusLabel: 'Reset sent',
      message: `${displayLabel} already had a Firebase Auth account without a visible profile. Reset link resent.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'authOnly', message: `${displayLabel} -> reset sent to existing auth-only account` };
  }

  const authLookup = await _lookupAuthAccountByEmail(authEmail);
  if (authLookup.registered) {
    await _sendRosterResetEmail(authEmail);
    await _upsertProcessedAuthUser(authEmail, {
      name: _rosterDisplayName(rosterEntry) || entry?.name || `Pending profile (${authEmail})`,
      studentId,
      rosterEnrollmentStatus: 'reset-email-sent',
      lastPasswordResetSentAt: new Date().toISOString(),
      lastPasswordResetSentByUid: STATE.user?.uid || null,
      lastPasswordResetError: '',
    });
    await _logProfileRecoveryAttempt({
      email: authEmail,
      status: 'success',
      statusLabel: 'Reset sent',
      message: `${displayLabel} had an existing Firebase Auth account. Reset link sent and auth-only recovery record updated.`,
      source: 'bulk-activate-list',
    }).catch(() => { });
    return { type: 'authOnly', message: `${displayLabel} -> reset sent to existing Firebase Auth account` };
  }

  const created = await _createAuthUserViaRest({
    name: _rosterDisplayName(rosterEntry) || entry?.name || authEmail,
    email: authEmail,
    password: _generateTempPassword(),
    role: 'student',
  });
  const item = _buildBulkActivationItem(entry, rosterEntry, {}, created.uid);
  const payload = _cleanFirebaseValue({
    ..._buildRosterEnrollmentProfilePayload(item, created.uid),
    uid: created.uid,
    displayName: created.displayName || item.mergedProfile?.displayName || item.displayName,
    disabled: false,
    status: 'active',
    rosterEnrollmentStatus: 'pending-reset-email',
  });
  await set(ref(db, `users/${created.uid}/profile`), payload);
  await _sendRosterResetEmail(authEmail);
  await set(ref(db, `users/${created.uid}/profile`), _cleanFirebaseValue({
    ...payload,
    uid: created.uid,
    rosterEnrollmentStatus: 'reset-email-sent',
    lastPasswordResetSentAt: new Date().toISOString(),
    lastPasswordResetSentByUid: STATE.user?.uid || null,
    lastPasswordResetError: '',
  }));
  await _logProfileRecoveryAttempt({
    email: authEmail,
    status: 'success',
    statusLabel: 'Created + reset',
    message: `${displayLabel} did not have an auth account. A new canonical UJ account was created and a reset link was sent.`,
    source: 'bulk-activate-list',
  }).catch(() => { });
  return { type: 'created', message: `${displayLabel} -> new canonical UJ account created and reset sent` };
}

window._submitBulkStudentActivation = async () => {
  const input = document.getElementById('um-bulk-activate-input');
  const resultMount = document.getElementById('um-bulk-activate-results');
  const raw = String(input?.value || '').trim();
  _umBulkActivationLastInput = raw;

  const parsed = _parseBulkStudentActivationList(raw);
  if (!parsed.entries.length && !parsed.invalid.length) {
    _showLecturerToast('Paste at least one student line first.', 'warn', 2600);
    return;
  }

  const confirmMessage = [
    `Process ${parsed.entries.length} valid student entr${parsed.entries.length === 1 ? 'y' : 'ies'}?`,
    parsed.invalid.length ? `- Invalid lines to skip: ${parsed.invalid.length}` : null,
    '',
    'Safe cases will be created, aligned, restored, and sent reset links automatically.',
    'Ambiguous or non-canonical matches will be skipped into manual review.',
  ].filter(Boolean).join('\n');
  if (!confirm(confirmMessage)) return;

  const results = {
    processed: parsed.entries.length,
    createdCount: 0,
    restoredCount: 0,
    manualCount: 0,
    created: [],
    restored: [],
    authOnly: [],
    manual: [],
    failed: [],
    invalidLines: parsed.invalid.map((item) => `Line ${item.lineNo}: ${item.line} -> ${item.reason}`),
  };

  _showLecturerProcessing(`Activating ${parsed.entries.length} student account${parsed.entries.length === 1 ? '' : 's'} from the pasted list...`);
  try {
    for (const entry of parsed.entries) {
      try {
        const outcome = await _activateSingleStudentFromList(entry);
        if (outcome.type === 'created') {
          results.createdCount += 1;
          results.created.push(outcome.message);
        } else if (outcome.type === 'restored') {
          results.restoredCount += 1;
          results.restored.push(outcome.message);
        } else if (outcome.type === 'authOnly') {
          results.authOnly.push(outcome.message);
        } else if (outcome.type === 'manual') {
          results.manualCount += 1;
          results.manual.push(outcome.message);
        }
      } catch (err) {
        results.failed.push(`${entry.name || entry.authEmail} (${entry.studentId}) -> ${err?.message || err || 'Unknown error'}`);
        await _logProfileRecoveryAttempt({
          email: entry.authEmail,
          status: 'error',
          statusLabel: 'Activation failed',
          message: `${entry.name || entry.authEmail} (${entry.studentId}) failed during bulk activation: ${err?.message || err || 'Unknown error'}`,
          source: 'bulk-activate-list',
        }).catch(() => { });
      }
    }

    await _umRefreshUsers().catch(() => { });
    await _loadProfileRecoveryLog().catch(() => { });

    if (resultMount) {
      resultMount.innerHTML = _renderBulkStudentActivationSummary(results);
    }

    const warnCount = results.manualCount + results.failed.length + results.invalidLines.length;
    const successCount = results.createdCount + results.restoredCount + results.authOnly.length;
    _showLecturerToast(
      warnCount
        ? `Processed ${parsed.entries.length} students. ${successCount} automatic recoveries succeeded; ${warnCount} need review.`
        : `Processed ${parsed.entries.length} students. ${successCount} accounts were recovered automatically.`,
      warnCount ? 'warn' : 'success',
      warnCount ? 4600 : 3200
    );
    _finishLecturerProcessing(warnCount ? 'warn' : 'success', warnCount ? 'Completed with review items' : 'Bulk activation complete', warnCount ? 1600 : 1200);
  } finally {
    const overlay = document.getElementById('lecturer-processing-overlay');
    if (overlay && overlay.style.display !== 'none' && overlay.dataset.finishing !== '1') {
      _hideLecturerProcessing();
    }
  }
};

window._runRosterEnrollmentRollout = async () => {
  const [usersSnap, rosterSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'rosters/classList')),
  ]);
  const users = usersSnap.exists() ? (usersSnap.val() || {}) : {};
  const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
  _rosterEnrollmentReport = _buildRosterEnrollmentReport(users, rosterRows);
  const report = _rosterEnrollmentReport;

  if (!report.readyRows.length) {
    _setRosterProfileSyncStatus('No roster rows are ready for enrollment. Fix the invalid/conflicting rows first.', 'warn');
    _showLecturerToast('No roster rows are ready for enrollment. Fix the invalid/conflicting rows first.', 'warn', 3600);
    await window._openRosterProfileSyncModal();
    return;
  }

  const confirmMessage = [
    `Provision or reconcile ${report.readyRows.length} roster student account(s)?`,
    `- Existing accounts to align: ${report.existingMatches.length}`,
    `- New auth accounts to create: ${report.newAccounts.length}`,
    `- Reset emails to send: ${report.readyRows.length}`,
    '',
    'This sends password reset emails to the canonical UJ email on the roster.',
  ].join('\n');
  if (!confirm(confirmMessage)) return;

  _setRosterSyncBusy(`Rolling out ${report.readyRows.length} roster account${report.readyRows.length === 1 ? '' : 's'}...`);
  try {
    const counts = {
      updated: 0,
      created: 0,
      resetsSent: 0,
      failures: [],
    };

    for (const item of report.readyRows) {
      try {
        let uid = item?.uid || null;
        const profilePayload = _buildRosterEnrollmentProfilePayload(item, uid);

        if (!uid) {
          const created = await _createAuthUserViaRest({
            name: item?.displayName || item?.mergedProfile?.name || item?.authEmail,
            email: item?.authEmail,
            password: _generateTempPassword(),
            role: 'student',
          });
          uid = created.uid;
          profilePayload.uid = uid;
          profilePayload.displayName = created.displayName || profilePayload.displayName;
          profilePayload.createdAt = new Date().toISOString();
          profilePayload.createdByUid = STATE.user?.uid || null;
          profilePayload.rosterEnrollmentStatus = 'created-pending-reset-email';
          counts.created += 1;
        } else {
          counts.updated += 1;
        }

        await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue(profilePayload));

        try {
          await _sendRosterResetEmail(item.authEmail);
          await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
            ...profilePayload,
            uid,
            rosterEnrollmentStatus: 'reset-email-sent',
            lastPasswordResetSentAt: new Date().toISOString(),
            lastPasswordResetSentByUid: STATE.user?.uid || null,
          }));
          counts.resetsSent += 1;
        } catch (resetErr) {
          counts.failures.push(`${item.authEmail}: reset email failed (${resetErr?.message || resetErr || 'Unknown error'})`);
          await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
            ...profilePayload,
            uid,
            rosterEnrollmentStatus: 'reset-email-failed',
            lastPasswordResetError: String(resetErr?.message || resetErr || 'Unknown error'),
            lastPasswordResetAttemptAt: new Date().toISOString(),
            lastPasswordResetSentByUid: STATE.user?.uid || null,
          }));
        }
      } catch (err) {
        counts.failures.push(`${item.authEmail}: ${err?.message || err || 'Unknown error'}`);
      }
    }

    await _umRefreshUsers().catch(() => { });
    const successLine = `Roster enrollment applied. Existing aligned: ${counts.updated}. New accounts created: ${counts.created}. Reset emails sent: ${counts.resetsSent}/${report.readyRows.length}.`;
    if (counts.failures.length) {
      _setRosterProfileSyncStatus(`${successLine} Failures: ${counts.failures.length}. First error: ${counts.failures[0]}`, 'warn');
      _showLecturerToast(`${successLine} Failures: ${counts.failures.length}. First error: ${counts.failures[0]}`, 'warn', 6200);
    } else {
      _setRosterProfileSyncStatus(successLine, 'success');
      _showLecturerToast(successLine, 'success', 3600);
    }
    await window._openRosterProfileSyncModal();
  } finally {
    _clearRosterSyncBusy();
  }
};

window._downloadRosterEnrollmentDryRunCsv = async () => {
  if (!_rosterEnrollmentReport) {
    await window._openRosterProfileSyncModal();
  }
  const report = _rosterEnrollmentReport;
  if (!report) {
    _showLecturerToast('Open the roster reconciliation workspace first, then export the dry-run CSV.', 'warn', 3200);
    return;
  }

  const header = [
    'category',
    'plannedAction',
    'rowNo',
    'displayName',
    'authEmail',
    'personalEmail',
    'studentId',
    'tutorialGroup',
    'matchedUid',
    'matchedProfileName',
    'missingFields',
    'reason',
    'candidateUids',
    'generatedAt',
  ].map(_csvCell).join(',');

  const rows = [];
  const pushRow = (category, plannedAction, item = {}) => {
    rows.push([
      _csvCell(category),
      _csvCell(plannedAction),
      _csvCell(item.rowNo || ''),
      _csvCell(item.displayName || item.mergedProfile?.name || _rosterDisplayName(item.row) || ''),
      _csvCell(item.authEmail || ''),
      _csvCell(item.personalEmail || item.row?.email || ''),
      _csvCell(item.studentId || _rosterStudentIdValue(item.row) || ''),
      _csvCell(item.mergedProfile?.tutorialGroup || item.row?.tutorialGroup || ''),
      _csvCell(item.uid || item.existing?.uid || ''),
      _csvCell(item.existing?.existingProfile?.displayName || ''),
      _csvCell((item.missingFields || []).join('; ')),
      _csvCell(item.reason || ''),
      _csvCell((item.candidates || []).map((candidate) => candidate?.uid || '').filter(Boolean).join('; ')),
      _csvCell(report.generatedAt || new Date().toISOString()),
    ].join(','));
  };

  (report.newAccounts || []).forEach((item) => pushRow('ready', 'create-auth-account-and-send-reset', item));
  (report.existingMatches || []).forEach((item) => pushRow('ready', 'align-existing-account-and-send-reset', item));
  (report.invalidRows || []).forEach((item) => pushRow('blocked', 'fix-roster-row', item));
  (report.conflicts || []).forEach((item) => pushRow('blocked', 'manual-review-conflict', item));

  if (!rows.length) {
    _showLecturerToast('There are no roster rollout rows to export yet.', 'warn', 2600);
    return;
  }

  const csvText = `${header}\n${rows.join('\n')}`;
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster-enrollment-dry-run-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  _showLecturerToast(`Dry-run CSV exported (${rows.length} row${rows.length === 1 ? '' : 's'}).`, 'success', 2800);
};

function _rosterOnlyCleanupReasonLabel(row = {}) {
  const code = String(row?.membershipStatus || row?.cleanupCategory || '').trim().toLowerCase();
  if (code === 'duplicate-noncanonical') return 'Duplicate non-canonical account';
  if (code === 'non-roster') return 'Not on active class roster';
  if (code === 'placeholder') return 'Placeholder account not linked to roster';
  if (code === 'invalid-identity') return 'Invalid/non-UJ student identity';
  return 'Roster-only cleanup';
}

function _rosterOnlyCleanupContact(row = {}) {
  return String(row?.authEmail || row?.email || row?.personalEmail || '').trim();
}

function _rosterOnlyCleanupStudentMessage(row = {}) {
  const name = String(row?.name || row?.mergedProfile?.displayName || row?.existingProfile?.displayName || 'Student').split(' [')[0].trim() || 'Student';
  const code = String(row?.membershipStatus || row?.cleanupCategory || '').trim().toLowerCase();
  if (code === 'duplicate-noncanonical') {
    const keeperIdentity = _studentRowAuthEmail(row?.keeper || {}) || 'your official roster-listed UJ account';
    return `Hello ${name}, your previous Academic Literacies account was removed because it was a duplicate non-canonical student account. Please sign in using ${keeperIdentity}. If you cannot access that account, contact your lecturer.`;
  }
  return `Hello ${name}, your previous Academic Literacies account was removed because it is not on the current class roster or is not linked to a valid roster-listed UJ student identity. If you should still be in the class, ask your lecturer to update the roster, then register or sign in again using your official UJ student email.`;
}

window._downloadRosterOnlyCleanupCsv = async () => {
  if (!_rosterOnlyCleanupReport) {
    await _umRefreshUsers().catch(() => { });
  }
  const report = _rosterOnlyCleanupReport;
  const rows = report?.removableRows || [];
  if (!rows.length) {
    _showLecturerToast('There are no roster-only cleanup candidates to export.', 'warn', 2800);
    return;
  }

  const header = [
    'category',
    'reasonLabel',
    'uid',
    'name',
    'contactAddress',
    'studentId',
    'tutorialGroup',
    'keeperUid',
    'keeperIdentity',
    'workScore',
    'generatedAt',
    'studentNotice',
  ].map(_csvCell).join(',');

  const csvRows = rows.map((row) => [
    _csvCell(String(row?.membershipStatus || row?.cleanupCategory || '')),
    _csvCell(_rosterOnlyCleanupReasonLabel(row)),
    _csvCell(row?.uid || ''),
    _csvCell(row?.name || row?.mergedProfile?.displayName || row?.existingProfile?.displayName || ''),
    _csvCell(_rosterOnlyCleanupContact(row)),
    _csvCell(_studentRowId(row)),
    _csvCell(row?.tutorialGroup || row?.mergedProfile?.tutorialGroup || row?.existingProfile?.tutorialGroup || ''),
    _csvCell(row?.keeper?.uid || ''),
    _csvCell(_studentRowAuthEmail(row?.keeper || {})),
    _csvCell(Number(row?.workScore || 0)),
    _csvCell(report?.generatedAt || new Date().toISOString()),
    _csvCell(_rosterOnlyCleanupStudentMessage(row)),
  ].join(','));

  const csvText = `${header}\n${csvRows.join('\n')}`;
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster-only-cleanup-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  _showLecturerToast(`Roster-only cleanup CSV exported (${rows.length} row${rows.length === 1 ? '' : 's'}).`, 'success', 3000);
};

window._copyRosterOnlyCleanupNotice = async () => {
  if (!_rosterOnlyCleanupReport) {
    await _umRefreshUsers().catch(() => { });
  }
  const rows = _rosterOnlyCleanupReport?.removableRows || [];
  if (!rows.length) {
    _showLecturerToast('There are no roster-only cleanup candidates to notify.', 'warn', 2800);
    return;
  }

  const text = [
    'Academic Literacies account update',
    '',
    'Your previous account on the Academic Literacies platform is no longer active because of class-roster cleanup.',
    '',
    'What you must do now:',
    '- do not create another account until your lecturer confirms which account you should use',
    '- if you are on the class roster, sign in using your official UJ student email',
    '- if you cannot access the correct account, send your lecturer your student number, your official UJ email, and the email you tried',
    '- if you are not on the roster but should be, ask your lecturer to update the roster first',
    '',
    'If your old account was a duplicate or non-UJ account, do not use it again.',
    'Use only your official roster-listed UJ student account.',
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    _showLecturerToast('Roster-only cleanup notice copied to clipboard.', 'success', 2600);
  } catch {
    _showLecturerToast('Could not copy the cleanup notice. Clipboard access was denied.', 'warn', 3200);
  }
};

window._umGenerateTempPassword = async () => {
  const generated = _generateTempPassword();
  const input = document.getElementById('um-new-password');
  if (input) input.value = generated;
  try {
    await navigator.clipboard.writeText(generated);
    _showLecturerToast('Temporary password generated and copied to clipboard.', 'success', 2600);
  } catch {
    _showLecturerToast('Temporary password generated.', 'success', 2400);
  }
};

window._umCreateUser = async () => {
  const name = String(document.getElementById('um-new-name')?.value || '').trim();
  const email = String(document.getElementById('um-new-email')?.value || '').trim().toLowerCase();
  const password = String(document.getElementById('um-new-password')?.value || '');
  const role = String(document.getElementById('um-new-role')?.value || 'student').toLowerCase();
  if (!name || !email) {
    _showLecturerToast('Enter name and email.', 'warn', 2600);
    return;
  }
  if (!_USER_ROLES.includes(role)) {
    _showLecturerToast('Select a valid role.', 'warn', 2400);
    return;
  }
  const effectivePassword = password || (role === 'student' ? _generateTempPassword() : '');
  if (!effectivePassword) {
    _showLecturerToast('Enter a password, or create the account as a student so the system can generate one automatically.', 'warn', 3600);
    return;
  }
  if (effectivePassword.length < 6) {
    _showLecturerToast('Enter a password with at least 6 characters.', 'warn', 2600);
    return;
  }

  try {
    const normalizedEmail = role === 'student' ? normalizeStudentUsername(email) : email;
    const rosterEntry = role === 'student' ? _findActiveRosterEntryForStudent(normalizedEmail) : null;
    if (role === 'student' && !rosterEntry) {
      _showLecturerToast('Student accounts must exist on the active class roster before they can be created here.', 'warn', 4200);
      return;
    }
    const nowIso = new Date().toISOString();
    const { uid, displayName } = await _createAuthUserViaRest({ name, email: normalizedEmail, password: effectivePassword, role });
    const draftProfile = role === 'student'
      ? buildStudentProfileDraft({ uid, email: normalizedEmail }, {}, rosterEntry || {}, {
        authEmail: normalizedEmail,
        username: normalizedEmail,
      })
      : {};
    const basePayload = {
      ...draftProfile,
      uid,
      email: role === 'student' ? (draftProfile?.email || normalizedEmail) : normalizedEmail,
      authEmail: role === 'student' ? normalizedEmail : null,
      username: role === 'student' ? normalizedEmail : null,
      displayName: role === 'student' ? (draftProfile?.displayName || displayName) : displayName,
      role,
      disabled: false,
      mustResetPassword: role === 'student',
      rosterEnrollmentStatus: role === 'student' ? 'created-pending-reset-email' : '',
      createdAt: nowIso,
      createdByUid: STATE.user?.uid || null,
      updatedAt: nowIso,
      updatedByUid: STATE.user?.uid || null,
      source: role === 'student' ? 'lecturer-user-manager-roster-backed' : 'lecturer-user-manager',
    };
    await set(ref(db, `users/${uid}/profile`), basePayload);

    let resetMessage = '';
    if (role === 'student') {
      try {
        await _sendRosterResetEmail(normalizedEmail);
        await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
          ...basePayload,
          uid,
          rosterEnrollmentStatus: 'reset-email-sent',
          lastPasswordResetSentAt: new Date().toISOString(),
          lastPasswordResetSentByUid: STATE.user?.uid || null,
        }));
        resetMessage = ' Reset link emailed automatically.';
        await _logProfileRecoveryAttempt({
          email: normalizedEmail,
          status: 'success',
          statusLabel: 'Reset sent',
          message: 'New student account created in User Management and reset email sent automatically.',
          source: 'create-user-auto-reset',
        }).catch(() => { });
      } catch (resetErr) {
        await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
          ...basePayload,
          uid,
          rosterEnrollmentStatus: 'reset-email-failed',
          lastPasswordResetError: String(resetErr?.message || resetErr || 'Unknown error'),
          lastPasswordResetAttemptAt: new Date().toISOString(),
          lastPasswordResetSentByUid: STATE.user?.uid || null,
        }));
        resetMessage = ` Reset email failed: ${resetErr?.message || resetErr || 'Unknown error'}`;
        await _logProfileRecoveryAttempt({
          email: normalizedEmail,
          status: 'error',
          statusLabel: 'Reset failed',
          message: `New student account created in User Management, but the automatic reset email failed: ${resetErr?.message || resetErr || 'Unknown error'}`,
          source: 'create-user-auto-reset',
        }).catch(() => { });
      }
    }

    document.getElementById('um-new-name').value = '';
    document.getElementById('um-new-email').value = '';
    document.getElementById('um-new-password').value = '';
    document.getElementById('um-new-role').value = 'student';
    await _umRefreshUsers();
    _showLecturerToast(`User created: ${normalizedEmail} (${role}).${resetMessage}`, resetMessage.includes('failed') ? 'warn' : 'success', resetMessage.includes('failed') ? 4800 : 3200);
  } catch (err) {
    const message = String(err?.message || err || '');
    if (message.includes('EMAIL_EXISTS')) {
      const wantsReset = confirm(`An auth account already exists for ${email}. This usually means Firebase Auth has the account but the app profile is missing. Send a password reset link so the student can sign in and rehydrate their profile?`);
      if (wantsReset) {
        try {
          await _sendRosterResetEmail(normalizeStudentUsername(email));
          await _upsertProcessedAuthUser(normalizeStudentUsername(email), {
            name: `Pending profile (${normalizeStudentUsername(email)})`,
            rosterEnrollmentStatus: 'reset-email-sent',
            lastPasswordResetSentAt: new Date().toISOString(),
            lastPasswordResetSentByUid: STATE.user?.uid || null,
            lastPasswordResetError: '',
          }).catch(() => { });
          await _umRefreshUsers().catch(() => { });
          await _logProfileRecoveryAttempt({
            email: normalizeStudentUsername(email),
            status: 'success',
            statusLabel: 'Reset sent',
            message: 'Create User hit EMAIL_EXISTS. Reset link sent so the student can sign in and recreate the missing profile.',
            source: 'create-user-email-exists',
          }).catch(() => { });
          _showLecturerToast(`Reset link sent to ${normalizeStudentUsername(email)}. After the student signs in, the profile will reappear in User Management.`, 'success', 4200);
        } catch (resetErr) {
          await _logProfileRecoveryAttempt({
            email: normalizeStudentUsername(email),
            status: 'error',
            statusLabel: 'Reset failed',
            message: `Create User hit EMAIL_EXISTS, and the recovery reset email failed: ${resetErr?.message || resetErr || 'Unknown error'}`,
            source: 'create-user-email-exists',
          }).catch(() => { });
          _showLecturerToast(`Auth account exists, but reset email failed: ${resetErr?.message || resetErr || 'Unknown error'}`, 'warn', 4600);
        }
      } else {
        await _logProfileRecoveryAttempt({
          email: normalizeStudentUsername(email),
          status: 'warn',
          statusLabel: 'Needs lecturer follow-up',
          message: 'Create User hit EMAIL_EXISTS. Lecturer chose not to send the recovery reset link.',
          source: 'create-user-email-exists',
        }).catch(() => { });
        _showLecturerToast('Auth account already exists. Ask the student to reset their password and sign in once so the profile is recreated.', 'warn', 4200);
      }
      return;
    }
    _showLecturerToast(`User creation failed: ${err.message || err}`, 'warn', 3600);
  }
};

window._umResendResetLink = async (uid) => {
  const row = _activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache).find((item) => item.uid === uid);
  if (!row) {
    _showLecturerToast('Refresh and select an existing user.', 'warn', 2600);
    return;
  }
  const user = _umUsersCache?.[uid];
  const email = normalizeStudentUsername(String(row?.authEmail || row?.username || row?.email || '').trim());

  if (!confirm(`Send a password reset link to ${email}?`)) return;

  try {
    if (row.isAuthOnlyProcessed) await _sendAuthOnlyResetLink(row);
    else await _sendUserResetLink(uid, user);
    await _umRefreshUsers();
    _showLecturerToast(`Password reset link sent to ${email}.`, 'success', 3200);
  } catch (err) {
    if (row.isAuthOnlyProcessed) {
      await _upsertProcessedAuthUser(email, {
        name: row?.name || `Pending profile (${email})`,
        rosterEnrollmentStatus: 'reset-email-failed',
        lastPasswordResetError: String(err?.message || err || 'Unknown error'),
        lastPasswordResetAttemptAt: new Date().toISOString(),
        lastPasswordResetSentByUid: STATE.user?.uid || null,
      }).catch(() => { });
    } else {
      const profile = user?.profile || {};
      await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
        ...profile,
        uid,
        role: 'student',
        username: profile?.username || email,
        authEmail: email,
        mustResetPassword: true,
        rosterEnrollmentStatus: 'reset-email-failed',
        lastPasswordResetError: String(err?.message || err || 'Unknown error'),
        lastPasswordResetAttemptAt: new Date().toISOString(),
        lastPasswordResetSentByUid: STATE.user?.uid || null,
        updatedAt: new Date().toISOString(),
        updatedByUid: STATE.user?.uid || null,
      })).catch(() => { });
    }
    _showLecturerToast(`Could not send reset link: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  }
};

window._umResendResetLinkBulk = async () => {
  const visibleRows = _getVisibleUserManagementRows(_activeUsersRows(_umUsersCache, _umProcessedAuthUsersCache));
  const studentRows = visibleRows.filter((row) => row.role === 'student' && !row.disabled);
  if (!studentRows.length) {
    _showLecturerToast('No active student rows are visible in the current filter.', 'warn', 2800);
    return;
  }

  if (!confirm(`Send password reset links to ${studentRows.length} visible student account(s)?`)) return;

  let sent = 0;
  const failures = [];
  for (const row of studentRows) {
    const user = _umUsersCache?.[row.uid];
    if (!user && !row.isAuthOnlyProcessed) {
      failures.push(`${row.uid}: user not found`);
      continue;
    }
    try {
      if (row.isAuthOnlyProcessed) await _sendAuthOnlyResetLink(row);
      else await _sendUserResetLink(row.uid, user);
      sent += 1;
    } catch (err) {
      failures.push(`${row.name || row.uid}: ${err?.message || err || 'Unknown error'}`);
      if (row.isAuthOnlyProcessed) {
        const email = normalizeStudentUsername(String(row?.authEmail || row?.username || row?.email || '').trim());
        await _upsertProcessedAuthUser(email, {
          name: row?.name || `Pending profile (${email})`,
          rosterEnrollmentStatus: 'reset-email-failed',
          lastPasswordResetError: String(err?.message || err || 'Unknown error'),
          lastPasswordResetAttemptAt: new Date().toISOString(),
          lastPasswordResetSentByUid: STATE.user?.uid || null,
        }).catch(() => { });
      } else {
        const profile = user?.profile || {};
        const email = normalizeStudentUsername(String(profile?.authEmail || profile?.username || profile?.email || '').trim());
        await set(ref(db, `users/${row.uid}/profile`), _cleanFirebaseValue({
          ...profile,
          uid: row.uid,
          role: 'student',
          username: profile?.username || email,
          authEmail: email,
          mustResetPassword: true,
          rosterEnrollmentStatus: 'reset-email-failed',
          lastPasswordResetError: String(err?.message || err || 'Unknown error'),
          lastPasswordResetAttemptAt: new Date().toISOString(),
          lastPasswordResetSentByUid: STATE.user?.uid || null,
          updatedAt: new Date().toISOString(),
          updatedByUid: STATE.user?.uid || null,
        })).catch(() => { });
      }
    }
  }

  await _umRefreshUsers();
  if (failures.length) {
    _showLecturerToast(`Reset links sent: ${sent}/${studentRows.length}. Failures: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
    return;
  }
  _showLecturerToast(`Reset links sent to ${sent} student account${sent === 1 ? '' : 's'}.`, 'success', 3200);
};

window._umUpdateRole = async (uid) => {
  const role = String(document.getElementById(`um-role-${uid}`)?.value || '').toLowerCase();
  if (!_USER_ROLES.includes(role)) {
    _showLecturerToast('Select a valid role before updating.', 'warn', 2400);
    return;
  }
  const user = _umUsersCache?.[uid];
  if (!user) {
    _showLecturerToast('Refresh and select an existing user.', 'warn', 2600);
    return;
  }
  const baseName = String(user?.profile?.displayName || user?.profile?.email || uid).split(' [')[0].trim();
  await set(ref(db, `users/${uid}/profile`), {
    ...(user.profile || {}),
    uid,
    email: user?.profile?.email || null,
    displayName: `${baseName} [${role}]`,
    role,
    updatedAt: new Date().toISOString(),
    updatedByUid: STATE.user?.uid || null,
  });
  await _umRefreshUsers();
  _showLecturerToast(`Role updated to ${role}.`, 'success', 2600);
};

window._umToggleDisabled = async (uid, disable = true) => {
  if (uid === STATE.user?.uid && disable) {
    _showLecturerToast('You cannot disable your own account from this panel.', 'warn', 2800);
    return;
  }
  const user = _umUsersCache?.[uid];
  if (!user) {
    _showLecturerToast('Refresh and select an existing user.', 'warn', 2600);
    return;
  }
  const action = disable ? 'disable' : 'restore';
  if (!confirm(`Confirm ${action} for ${user?.profile?.email || uid}?`)) return;
  await set(ref(db, `users/${uid}/profile`), {
    ...(user.profile || {}),
    uid,
    disabled: Boolean(disable),
    status: disable ? 'disabled' : 'active',
    updatedAt: new Date().toISOString(),
    updatedByUid: STATE.user?.uid || null,
  });
  if (disable) {
    await remove(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`)).catch(() => { });
  }
  await _umRefreshUsers();
  _showLecturerToast(disable ? 'User disabled.' : 'User restored.', disable ? 'warn' : 'success', 2600);
};

let _rosterDraftRows = [];
let _rosterDraftHistory = [];
let _rosterViewState = {
  q: '',
  field: 'all', // all|name|email|id|username|group
  showDupesOnly: false,
};

function _rosterNormId(v = '') {
  const digits = String(v || '').replace(/\D+/g, '').trim();
  if (!digits) return '';
  const stripped = digits.replace(/^0+/, '');
  return stripped || '';
}

function _rosterNormEmail(v = '') {
  return String(v || '').trim().toLowerCase();
}

function _rosterDraftToText(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows.map((r) => [
    r.firstName || '',
    r.lastName || '',
    r.username || '',
    r.studentId || '',
    r.email || '',
    r.tutorialGroup || '',
  ].join(',')).join('\n');
}

function _rosterSyncTextarea() {
  const ta = document.getElementById('roster-text');
  if (!ta) return;
  ta.value = _rosterDraftToText(_rosterDraftRows);
}

function _rosterPushHistory() {
  try {
    _rosterDraftHistory.push(JSON.stringify(_rosterDraftRows || []));
    if (_rosterDraftHistory.length > 12) _rosterDraftHistory = _rosterDraftHistory.slice(-12);
  } catch {
    // ignore history failures
  }
}

window._rosterUndo = () => {
  const snapshot = _rosterDraftHistory.pop();
  if (!snapshot) {
    _showLecturerToast('Nothing to undo.', 'warn', 2200);
    return;
  }
  try {
    _rosterDraftRows = JSON.parse(snapshot) || [];
  } catch {
    _showLecturerToast('Undo failed (invalid history state).', 'warn', 2800);
    return;
  }
  _rosterSyncTextarea();
  window._rosterRender?.();
  _showLecturerToast('Undid last roster change.', 'success', 2200);
};

window._rosterClearDraft = () => {
  if (!_rosterDraftRows.length && !String(document.getElementById('roster-text')?.value || '').trim()) {
    _showLecturerToast('Draft is already empty.', 'warn', 2200);
    return;
  }
  if (!confirm('Clear the draft roster (editor + preview)? This does not delete Firebase roster.')) return;
  _rosterPushHistory();
  _rosterDraftRows = [];
  _rosterSyncTextarea();
  _rosterRenderPreview([]);
  _showLecturerToast('Draft cleared.', 'warn', 2200);
};

function _rosterDuplicateSets(rows = []) {
  const idToCount = {};
  const emailToCount = {};
  (rows || []).forEach((r) => {
    const id = _rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo);
    const email = _rosterNormEmail(r?.email);
    if (id) idToCount[id] = (idToCount[id] || 0) + 1;
    if (email) emailToCount[email] = (emailToCount[email] || 0) + 1;
  });
  const dupIds = new Set(Object.entries(idToCount).filter(([, c]) => c > 1).map(([k]) => k));
  const dupEmails = new Set(Object.entries(emailToCount).filter(([, c]) => c > 1).map(([k]) => k));
  return { dupIds, dupEmails, idToCount, emailToCount };
}

function _rosterRowMatchesQuery(r, q, field) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return true;
  const name = String(r?.name || [r?.firstName, r?.lastName].filter(Boolean).join(' ') || '').trim().toLowerCase();
  const email = _rosterNormEmail(r?.email || '');
  const id = _rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo);
  const username = String(r?.username || '').trim().toLowerCase();
  const group = String(r?.tutorialGroup || '').trim().toLowerCase();

  if (field === 'name') return name.includes(query);
  if (field === 'email') return email.includes(query);
  if (field === 'id') return id.includes(query) || String(r?.studentId || '').trim().toLowerCase().includes(query);
  if (field === 'username') return username.includes(query);
  if (field === 'group') return group.includes(query);
  return [name, email, id, username, group].some((v) => String(v || '').includes(query));
}

function _rosterComputeStats(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const ids = safeRows.map((r) => _rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo)).filter(Boolean);
  const emails = safeRows.map((r) => _rosterNormEmail(r?.email)).filter(Boolean);
  const groups = safeRows.map((r) => String(r?.tutorialGroup || '').trim()).filter(Boolean);
  const { dupIds, dupEmails } = _rosterDuplicateSets(safeRows);
  const missingId = safeRows.filter((r) => !_rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo)).length;
  const missingEmail = safeRows.filter((r) => !_rosterNormEmail(r?.email)).length;
  const domains = {};
  emails.forEach((e) => {
    const d = String(e.split('@')[1] || '').trim().toLowerCase();
    if (!d) return;
    domains[d] = (domains[d] || 0) + 1;
  });
  const topDomain = Object.entries(domains).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  return {
    total: safeRows.length,
    uniqueIds: new Set(ids).size,
    uniqueEmails: new Set(emails).size,
    dupIdKeys: dupIds.size,
    dupEmailKeys: dupEmails.size,
    missingId,
    missingEmail,
    groupCount: new Set(groups).size,
    topDomain,
  };
}

function _rosterViewRows() {
  const allRows = Array.isArray(_rosterDraftRows) ? _rosterDraftRows : [];
  const { dupIds, dupEmails } = _rosterDuplicateSets(allRows);
  const statsAll = _rosterComputeStats(allRows);
  const q = _rosterViewState.q;
  const field = _rosterViewState.field;
  const showDupesOnly = Boolean(_rosterViewState.showDupesOnly);

  const view = allRows
    .map((r, idx) => {
      const idKey = _rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo);
      const emailKey = _rosterNormEmail(r?.email);
      return {
        ...r,
        _srcIndex: idx,
        _dupId: Boolean(idKey && dupIds.has(idKey)),
        _dupEmail: Boolean(emailKey && dupEmails.has(emailKey)),
      };
    })
    .filter((r) => _rosterRowMatchesQuery(r, q, field))
    .filter((r) => (showDupesOnly ? (r._dupId || r._dupEmail) : true));

  const statsView = _rosterComputeStats(view);
  return { allRows, viewRows: view, statsAll, statsView };
}

window._rosterRender = () => {
  const { allRows, viewRows, statsAll, statsView } = _rosterViewRows();
  _rosterRenderPreview(viewRows, { statsAll, statsView, totalRows: allRows.length });
};

window._rosterApplyFilter = () => {
  _rosterViewState.q = String(document.getElementById('roster-filter-q')?.value || '').trim();
  _rosterViewState.field = String(document.getElementById('roster-filter-field')?.value || 'all');
  _rosterViewState.showDupesOnly = Boolean(document.getElementById('roster-filter-dupes')?.checked);
  window._rosterRender?.();
};

window._rosterClearFilter = () => {
  _rosterViewState.q = '';
  _rosterViewState.field = 'all';
  _rosterViewState.showDupesOnly = false;
  const q = document.getElementById('roster-filter-q');
  const f = document.getElementById('roster-filter-field');
  const d = document.getElementById('roster-filter-dupes');
  if (q) q.value = '';
  if (f) f.value = 'all';
  if (d) d.checked = false;
  window._rosterRender?.();
};

function _rosterRemoveDupes(mode = 'id') {
  const allRows = Array.isArray(_rosterDraftRows) ? _rosterDraftRows : [];
  if (!allRows.length) {
    _showLecturerToast('No draft roster rows loaded.', 'warn', 2200);
    return;
  }
  const { dupIds, dupEmails } = _rosterDuplicateSets(allRows);
  const dupSet = mode === 'email' ? dupEmails : dupIds;
  const label = mode === 'email' ? 'email' : 'ID';
  if (!dupSet.size) {
    _showLecturerToast(`No duplicate ${label} values detected.`, 'success', 2200);
    return;
  }
  if (!confirm(`Remove duplicate roster rows by ${label}? Keeps the first occurrence of each ${label}.`)) return;

  _rosterPushHistory();
  const seen = new Set();
  const next = [];
  allRows.forEach((r) => {
    const key = mode === 'email'
      ? _rosterNormEmail(r?.email)
      : _rosterNormId(r?.studentId || r?.studentNumber || r?.studentNo);
    if (!key) {
      next.push(r);
      return;
    }
    if (!dupSet.has(key)) {
      next.push(r);
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    next.push(r);
  });

  const removed = allRows.length - next.length;
  _rosterDraftRows = next;
  _rosterSyncTextarea();
  window._rosterRender?.();
  _showLecturerToast(`Removed ${removed} duplicate row(s) by ${label}.`, removed ? 'success' : 'warn', 2600);
}

window._rosterRemoveDuplicateIds = () => _rosterRemoveDupes('id');
window._rosterRemoveDuplicateEmails = () => _rosterRemoveDupes('email');

window._rosterDeleteRow = (srcIndex) => {
  const idx = Number(srcIndex);
  if (!Number.isFinite(idx) || idx < 0) return;
  const allRows = Array.isArray(_rosterDraftRows) ? _rosterDraftRows : [];
  if (idx >= allRows.length) return;
  if (!confirm('Delete this roster row from the draft?')) return;
  _rosterPushHistory();
  _rosterDraftRows = allRows.filter((_, i) => i !== idx);
  _rosterSyncTextarea();
  window._rosterRender?.();
};

function _rosterDetectDelimiter(line = '') {
  const sample = String(line || '');
  const counts = {
    '\t': (sample.match(/\t/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ',';
}

function _rosterParseDelimitedLine(line = '', delimiter = ',') {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function _rosterSplit(line = '', delimiter = ',') {
  return _rosterParseDelimitedLine(String(line || ''), delimiter).map((v) => String(v || '').trim());
}

function _rosterLooksLikeHeader(cols = []) {
  const sample = cols.map((c) => String(c || '').toLowerCase());
  return sample.some((c) => c.includes('student') || c.includes('number') || c.includes('email') || c.includes('name'));
}

function _rosterIndexMap(headerCols = []) {
  const map = { studentId: -1, firstName: -1, lastName: -1, username: -1, name: -1, email: -1, tutorialGroup: -1 };
  headerCols.forEach((raw, idx) => {
    const h = String(raw || '').trim().toLowerCase();
    if (map.studentId < 0 && /(student\s*(id|number|no)|id\s*(number|no)|^stuno$|^studentid$|^id$)/.test(h)) map.studentId = idx;
    if (map.firstName < 0 && /(first\s*name|forename|given\s*name)/.test(h)) map.firstName = idx;
    if (map.lastName < 0 && /(last\s*name|surname|family\s*name)/.test(h)) map.lastName = idx;
    if (map.username < 0 && /(username|user\s*name|login|student\s*username)/.test(h)) map.username = idx;
    if (map.name < 0 && /(full\s*name|student\s*name|name|surname)/.test(h)) map.name = idx;
    if (map.email < 0 && /(email\s*address|email|e-mail|mail)/.test(h)) map.email = idx;
    if (map.tutorialGroup < 0 && /(groups|tutorial\s*group|group|tg|class)/.test(h)) map.tutorialGroup = idx;
  });
  return map;
}

function _rosterCell(cols = [], idx = -1) {
  if (!Array.isArray(cols) || idx < 0 || idx >= cols.length) return '';
  return String(cols[idx] || '').trim();
}

function _rosterLooksNumericId(value = '') {
  return /^\d{6,12}$/.test(String(value || '').trim());
}

function _rosterLooksEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(value || '').trim());
}

function _rosterParseText(raw = '') {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = _rosterDetectDelimiter(lines[0]);
  let startIndex = 0;
  const firstCols = _rosterSplit(lines[0], delimiter);
  const headerMap = _rosterLooksLikeHeader(firstCols) ? _rosterIndexMap(firstCols) : null;
  if (_rosterLooksLikeHeader(firstCols)) startIndex = 1;

  const rows = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const cols = _rosterSplit(lines[i], delimiter);
    if (!cols.length) continue;
    const looksLikeOfficialSixColumn =
      cols.length >= 5
      && _rosterLooksNumericId(cols[3] || '')
      && _rosterLooksEmail(cols[4] || '');
    const looksLikeLegacyIdFirst =
      cols.length >= 3
      && _rosterLooksNumericId(cols[0] || '')
      && _rosterLooksEmail(cols[2] || '');
    const defaultStudentId = looksLikeLegacyIdFirst
      ? (cols[0] || '')
      : (cols.length >= 4 ? cols[3] : (cols[0] || ''));
    const defaultFirstName = looksLikeLegacyIdFirst ? (cols[1] || '') : (cols[0] || '');
    const defaultLastName = looksLikeLegacyIdFirst ? '' : (cols.length >= 2 ? cols[1] : '');
    const defaultUsername = looksLikeLegacyIdFirst ? '' : (cols.length >= 3 ? cols[2] : '');
    const defaultEmail = looksLikeLegacyIdFirst
      ? (cols[2] || '')
      : (cols.length >= 5 ? cols[4] : (cols[2] || ''));
    const defaultTutorialGroup = looksLikeLegacyIdFirst
      ? (cols[3] || '')
      : (cols.length >= 6 ? cols[5] : (cols[3] || ''));
    const studentId = String(headerMap ? _rosterCell(cols, headerMap.studentId) : defaultStudentId).trim();
    const firstName = String(headerMap ? _rosterCell(cols, headerMap.firstName) : defaultFirstName).trim();
    const lastName = String(headerMap ? _rosterCell(cols, headerMap.lastName) : defaultLastName).trim();
    const username = String(headerMap ? _rosterCell(cols, headerMap.username) : defaultUsername).trim();
    const explicitName = String(headerMap ? _rosterCell(cols, headerMap.name) : '').trim();
    const name = explicitName || [firstName, lastName].filter(Boolean).join(' ').trim();
    const email = String(headerMap ? _rosterCell(cols, headerMap.email) : defaultEmail).trim().toLowerCase();
    const tutorialGroup = String(headerMap ? _rosterCell(cols, headerMap.tutorialGroup) : defaultTutorialGroup).trim().toUpperCase();
    if (!studentId && !email && !name) continue;
    rows.push({ studentId, firstName, lastName, username, name, email, tutorialGroup, active: true });
  }
  return rows;
}

function _rosterValidateRows(rows = []) {
  const issues = [];
  const missingIdRows = [];
  const missingEmailRows = [];
  const invalidEmailRows = [];
  const missingNameRows = [];
  const idMap = {};
  const emailMap = {};
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  rows.forEach((r, idx) => {
    const rowNo = idx + 1;
    const id = String(r?.studentId || '').trim();
    const email = String(r?.email || '').trim().toLowerCase();
    const firstName = String(r?.firstName || '').trim();
    const lastName = String(r?.lastName || '').trim();
    const displayName = String(r?.name || '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!id) missingIdRows.push(rowNo);
    else {
      idMap[id] = idMap[id] || [];
      idMap[id].push(rowNo);
    }

    if (!email) missingEmailRows.push(rowNo);
    else if (!emailRe.test(email)) invalidEmailRows.push(rowNo);
    else {
      emailMap[email] = emailMap[email] || [];
      emailMap[email].push(rowNo);
    }

    if (!displayName) missingNameRows.push(rowNo);
  });

  const duplicateIds = Object.entries(idMap).filter(([, list]) => list.length > 1);
  const duplicateEmails = Object.entries(emailMap).filter(([, list]) => list.length > 1);

  if (missingIdRows.length) issues.push(`Missing ID number: rows ${missingIdRows.join(', ')}`);
  if (missingEmailRows.length) issues.push(`Missing Email address: rows ${missingEmailRows.join(', ')}`);
  if (invalidEmailRows.length) issues.push(`Invalid Email address format: rows ${invalidEmailRows.join(', ')}`);
  if (duplicateIds.length) {
    duplicateIds.forEach(([id, list]) => issues.push(`Duplicate ID number "${id}": rows ${list.join(', ')}`));
  }
  if (duplicateEmails.length) {
    duplicateEmails.forEach(([email, list]) => issues.push(`Duplicate Email address "${email}": rows ${list.join(', ')}`));
  }
  if (missingNameRows.length) issues.push(`Missing name (first/last): rows ${missingNameRows.join(', ')}`);

  const criticalCount = missingIdRows.length
    + missingEmailRows.length
    + invalidEmailRows.length
    + duplicateIds.length
    + duplicateEmails.length;

  return {
    issues,
    criticalCount,
    warningCount: missingNameRows.length,
    missingIdRows,
    missingEmailRows,
    invalidEmailRows,
    duplicateIds,
    duplicateEmails,
    missingNameRows,
  };
}

function _rosterRenderPreview(rows = [], meta = {}) {
  const host = document.getElementById('roster-preview');
  if (!host) return;
  const safeRows = Array.isArray(rows) ? rows : [];
  const validation = _rosterValidateRows(safeRows);
  const statsAll = meta?.statsAll || _rosterComputeStats(_rosterDraftRows);
  const statsView = meta?.statsView || _rosterComputeStats(safeRows);
  const groupCount = new Set(safeRows.map((r) => r.tutorialGroup).filter(Boolean)).size;
  const validationHtml = validation.issues.length
    ? `<div style="margin-bottom:10px;border:1px solid ${validation.criticalCount ? '#fecaca' : 'var(--border)'};background:${validation.criticalCount ? '#fef2f2' : 'var(--cream2)'};border-radius:10px;padding:10px 12px;">
         <div style="font-size:12px;font-weight:700;color:${validation.criticalCount ? '#991b1b' : 'var(--navy)'};margin-bottom:6px;">${validation.criticalCount ? '⚠ Validation issues found' : 'ℹ Validation notes'}</div>
         <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:${validation.criticalCount ? '#7f1d1d' : 'var(--muted)'};max-height:140px;overflow:auto;">
           ${validation.issues.map((issue) => `<li>${_esc(issue)}</li>`).join('')}
         </ul>
       </div>`
    : '<div style="margin-bottom:10px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:10px 12px;font-size:12px;color:#166534;font-weight:700;">✅ Validation passed: no duplicate IDs/emails and all required fields are present.</div>';
  host.innerHTML = `
    <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px 12px;margin-bottom:10px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Filter</div>
            <input id="roster-filter-q" value="${_esc(_rosterViewState.q || '')}" placeholder="Search..." oninput="_rosterApplyFilter()" style="padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:12px;width:min(280px, 52vw);" />
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Field</div>
            <select id="roster-filter-field" onchange="_rosterApplyFilter()" style="padding:8px 10px;border:1px solid var(--border);border-radius:10px;font-size:12px;background:white;">
              <option value="all" ${_rosterViewState.field === 'all' ? 'selected' : ''}>All</option>
              <option value="name" ${_rosterViewState.field === 'name' ? 'selected' : ''}>Name</option>
              <option value="email" ${_rosterViewState.field === 'email' ? 'selected' : ''}>Email</option>
              <option value="id" ${_rosterViewState.field === 'id' ? 'selected' : ''}>ID number</option>
              <option value="username" ${_rosterViewState.field === 'username' ? 'selected' : ''}>Username</option>
              <option value="group" ${_rosterViewState.field === 'group' ? 'selected' : ''}>Group</option>
            </select>
          </div>
          <label style="display:flex;gap:8px;align-items:center;margin:0 0 2px 0;font-size:12px;color:var(--navy);user-select:none;">
            <input id="roster-filter-dupes" type="checkbox" onchange="_rosterApplyFilter()" ${_rosterViewState.showDupesOnly ? 'checked' : ''} />
            Duplicates only
          </label>
          <button class="btn-prev" style="display:inline-flex;" onclick="_rosterClearFilter()">Clear</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;">
          <button class="btn-prev" style="display:inline-flex;" onclick="_rosterUndo()">Undo</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="_rosterRemoveDuplicateIds()">Remove dup IDs</button>
          <button class="btn-prev" style="display:inline-flex;" onclick="_rosterRemoveDuplicateEmails()">Remove dup emails</button>
          <button class="btn-prev" style="display:inline-flex;background:#fee2e2;border-color:#fecaca;color:#991b1b;" onclick="_rosterClearDraft()">Clear draft</button>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Viewing: <strong>${statsView.total}</strong> / ${statsAll.total}</span>
        <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Unique IDs: <strong>${statsAll.uniqueIds}</strong></span>
        <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Unique emails: <strong>${statsAll.uniqueEmails}</strong></span>
        <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Groups: <strong>${statsAll.groupCount}</strong></span>
        ${statsAll.topDomain ? `<span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Top domain: <strong>${_esc(statsAll.topDomain)}</strong></span>` : ''}
        <span style="background:${statsAll.missingId ? '#fffbeb' : 'var(--cream2)'};border:1px solid ${statsAll.missingId ? '#fde68a' : 'var(--border)'};border-radius:999px;padding:4px 10px;font-size:12px;color:${statsAll.missingId ? '#92400e' : 'var(--navy)'};">Missing ID: <strong>${statsAll.missingId}</strong></span>
        <span style="background:${statsAll.missingEmail ? '#fffbeb' : 'var(--cream2)'};border:1px solid ${statsAll.missingEmail ? '#fde68a' : 'var(--border)'};border-radius:999px;padding:4px 10px;font-size:12px;color:${statsAll.missingEmail ? '#92400e' : 'var(--navy)'};">Missing email: <strong>${statsAll.missingEmail}</strong></span>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Rows: <strong>${safeRows.length}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Groups: <strong>${groupCount}</strong></span>
      <span style="background:${validation.criticalCount ? '#fef2f2' : '#f0fdf4'};border:1px solid ${validation.criticalCount ? '#fecaca' : '#bbf7d0'};border-radius:999px;padding:4px 10px;font-size:12px;color:${validation.criticalCount ? '#991b1b' : '#166534'};">Critical: <strong>${validation.criticalCount}</strong></span>
      <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--navy);">Warnings: <strong>${validation.warningCount}</strong></span>
    </div>
    ${validationHtml}
    <div style="border:1px solid var(--border);border-radius:10px;overflow:auto;background:white;max-height:360px;">
      <table style="width:100%;border-collapse:collapse;text-align:left;min-width:680px;">
        <thead>
          <tr>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">First name</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">Last name</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">Username</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">ID number</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">Email address</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">Groups</th>
            <th style="padding:10px 12px;background:var(--cream);font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${safeRows.map((r, i) => `<tr>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--navy);">${_esc(r.firstName || (r.name ? String(r.name).split(' ')[0] : '') || '—')}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--navy);">${_esc(r.lastName || (r.name ? String(r.name).split(' ').slice(1).join(' ') : '') || '—')}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:12px;color:var(--muted);">${_esc(r.username || '—')}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:12px;color:var(--navy);">${_esc(r.studentId || r.studentNumber || '—')}${r._dupId ? ' <span style="font-size:10px;color:#991b1b;font-weight:900;">DUP</span>' : ''}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">${_esc(r.email || '—')}${r._dupEmail ? ' <span style="font-size:10px;color:#991b1b;font-weight:900;">DUP</span>' : ''}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">${_esc(r.tutorialGroup || '—')}</td>
            <td style="padding:10px 12px;border-top:1px solid var(--border);">
              <button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#fee2e2;border-color:#fecaca;color:#991b1b;" onclick="_rosterDeleteRow(${Number.isFinite(r._srcIndex) ? r._srcIndex : i})">Delete</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="7" style="padding:14px;color:var(--muted);">No roster rows loaded yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

window._rosterParseDraft = () => {
  const text = String(document.getElementById('roster-text')?.value || '');
  const rows = _rosterParseText(text);
  const validation = _rosterValidateRows(rows);
  _rosterDraftRows = rows;
  window._rosterRender?.();
  if (validation.criticalCount) {
    _showLecturerToast(`Resolve ${validation.criticalCount} critical issue(s) before saving. Parsed ${rows.length} roster rows.`, 'warn', 3600);
    return;
  }
  _showLecturerToast(`Parsed ${rows.length} roster rows. Validation passed.`, 'success', 2800);
};

window._rosterUploadFile = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const rows = _rosterParseText(text);
    const validation = _rosterValidateRows(rows);
    _rosterDraftRows = rows;
    const ta = document.getElementById('roster-text');
    if (ta) ta.value = text;
    window._rosterRender?.();
    if (validation.criticalCount) {
      _showLecturerToast(`Resolve ${validation.criticalCount} critical issue(s) before saving. Loaded ${rows.length} row(s) from ${file.name}.`, 'warn', 3600);
      return;
    }
    _showLecturerToast(`Loaded ${rows.length} rows from ${file.name}. Validation passed.`, 'success', 2800);
  } catch (err) {
    _showLecturerToast(`Roster upload failed: ${err.message}`, 'warn', 3600);
  } finally {
    if (event?.target) event.target.value = '';
  }
};

async function _saveRosterDraftToFirebase() {
  const rows = Array.isArray(_rosterDraftRows) ? _rosterDraftRows : [];
  if (!rows.length) {
    _showLecturerToast('Paste or upload roster rows before saving.', 'warn', 2800);
    return false;
  }
  const validation = _rosterValidateRows(rows);
  if (validation.criticalCount) {
    _rosterRenderPreview(rows);
    _showLecturerToast(`Resolve ${validation.criticalCount} critical issue(s) shown in Roster Preview before saving.`, 'warn', 3800);
    return false;
  }
  const payload = {};
  let collisionCount = 0;
  rows.forEach((r, idx) => {
    const base = String(r.studentId || r.studentNumber || r.email || r.name || `row-${idx + 1}`)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[.#$\[\]/]/g, '_') || `row-${idx + 1}`;
    let key = base;
    let seq = 2;
    while (payload[key]) {
      key = `${base}_${seq}`;
      seq += 1;
      collisionCount += 1;
    }
    payload[key] = {
      studentId: r.studentId || r.studentNumber || '',
      studentNumber: r.studentId || r.studentNumber || '',
      studentNo: r.studentId || r.studentNumber || '',
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      username: r.username || '',
      name: r.name || '',
      email: r.email || '',
      tutorialGroup: r.tutorialGroup || '',
      active: true,
      updatedAt: new Date().toISOString(),
    };
  });
  await set(ref(db, 'rosters/classList'), payload);
  _tgmClassRosterCache = Object.values(payload);
  _showLecturerToast(`Class roster saved (${rows.length} rows).${collisionCount ? `\nResolved duplicate keys: ${collisionCount}` : ''}`, 'success', collisionCount ? 3400 : 2800);
  return true;
}

window._rosterSave = async () => {
  await _saveRosterDraftToFirebase();
};

window._rosterSaveAndActivate = async () => {
  const saved = await _saveRosterDraftToFirebase();
  if (!saved) return;
  await window._runRosterEnrollmentRollout?.();
};

window._rosterClearCurrent = async () => {
  const ok = confirm('Clear the current class roster from Firebase? This cannot be undone.');
  if (!ok) return;
  await remove(ref(db, 'rosters/classList'));
  _rosterDraftRows = [];
  _tgmClassRosterCache = [];
  const ta = document.getElementById('roster-text');
  if (ta) ta.value = '';
  _rosterRenderPreview([]);
  _showLecturerToast('Class roster cleared.', 'warn', 2400);
};

window._rosterLoadCurrent = async () => {
  const snap = await get(ref(db, 'rosters/classList'));
  const rows = snap.exists()
    ? Object.values(snap.val() || {}).map((r) => ({
      ...r,
      studentId: String(r?.studentId || r?.studentNumber || r?.studentNo || '').trim(),
      firstName: String(r?.firstName || '').trim(),
      lastName: String(r?.lastName || '').trim(),
      username: String(r?.username || '').trim(),
    }))
    : [];
  _rosterDraftRows = rows;
  _tgmClassRosterCache = rows;
  window._rosterRender?.();
  const ta = document.getElementById('roster-text');
  if (ta) {
    const header = 'First name,Last name,Username,ID number,Email address,Groups';
    const body = rows.map((r) => [
      r.firstName || '',
      r.lastName || '',
      r.username || '',
      r.studentId || r.studentNumber || r.studentNo || '',
      r.email || '',
      r.tutorialGroup || '',
    ].join(',')).join('\n');
    ta.value = [header, body].filter(Boolean).join('\n');
  }
};

window._rosterCancelDraft = async () => {
  if (!confirm('Discard draft changes and reload the saved roster?')) return;
  await window._rosterLoadCurrent();
  _showLecturerToast('Draft reset to saved roster.', 'warn', 2400);
};

window._rosterClose = () => {
  // "Close" means leave the roster manager screen.
  window._loadAnalytics?.();
};

window._loadRosterManager = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading class roster manager...</div>';
  mount.innerHTML = `
    <div style="padding:34px;max-width:1200px;margin:0 auto;animation:fadeIn 0.3s ease;">
      <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">📋 Class Roster Manager</h1>
      <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Upload or paste the official class list. Format columns as: <strong>First name, Last name, Username, ID number, Email address, Groups</strong>.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <label class="btn-prev" style="display:inline-flex;cursor:pointer;">⬆ Upload CSV/TSV
          <input type="file" accept=".csv,.tsv,text/csv,text/plain" style="display:none;" onchange="_rosterUploadFile(event)" />
        </label>
        <button class="btn-prev" style="display:inline-flex;" onclick="_rosterParseDraft()">✅ Parse & Preview</button>
        <button class="btn-prev" style="display:inline-flex;background:var(--accent);color:white;border-color:var(--accent);" onclick="_rosterSave()">💾 Save Roster</button>
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-color:#6d28d9;color:white;" onclick="_rosterSaveAndActivate()">🚀 Save + Activate Accounts</button>
        <button class="btn-prev" style="display:inline-flex;background:#fee2e2;border-color:#fecaca;color:#991b1b;" onclick="_rosterClearCurrent()">🗑 Clear Roster</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_rosterLoadCurrent()">↻ Load Current</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_rosterCancelDraft()">Cancel</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_rosterUndo()">Undo</button>
        <button class="btn-prev" style="display:inline-flex;background:#fee2e2;border-color:#fecaca;color:#991b1b;" onclick="_rosterClearDraft()">Clear Draft</button>
        <button class="btn-prev" style="display:inline-flex;background:var(--amber2);color:#222;border-color:var(--amber2);" onclick="_openCompareStudentsModal()">🔎 Compare to Active</button>
        <button class="btn-prev" style="display:inline-flex;background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8;" onclick="_openRosterProfileSyncModal()">🧩 Sync Profiles</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_rosterClose()">Close</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;">
        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Paste Roster Data</div>
          <textarea id="roster-text" rows="16" placeholder="First name,Last name,Username,ID number,Email address,Groups\nJane,Doe,jane.doe,20240001,jane@uni.ac.za,K" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:12px;line-height:1.45;resize:vertical;"></textarea>
        </div>
        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Roster Preview</div>
          <div id="roster-preview"></div>
        </div>
      </div>
    </div>`;

  try {
    await window._rosterLoadCurrent();
  } catch {
    _rosterRenderPreview([]);
  }
};

let _rosterProfileSyncReport = null;
let _rosterEnrollmentReport = null;
let _rosterProfileSyncLastStatus = null;

window._openRosterProfileSyncModal = async () => {
  const modalId = 'roster-profile-sync-modal';
  document.getElementById(modalId)?.remove();

  const [usersSnap, rosterSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'rosters/classList')),
    _loadProcessedAuthUsers().catch(() => ({})),
  ]);
  const users = usersSnap.exists() ? (usersSnap.val() || {}) : {};
  const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
  _umUsersCache = users;
  _umRosterRowsCache = rosterRows;
  _rosterProfileSyncReport = _buildRosterProfileSyncReport(users, rosterRows);
  _rosterEnrollmentReport = _buildRosterEnrollmentReport(users, rosterRows);
  _rosterOnlyCleanupReport = _buildRosterOnlyCleanupReport(users, _umProcessedAuthUsersCache, rosterRows);
  const report = _rosterProfileSyncReport;
  const enrollment = _rosterEnrollmentReport;
  const cleanup = _rosterOnlyCleanupReport;
  const lastStatusBanner = _rosterProfileSyncLastStatus ? `
    <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;border:1px solid ${_rosterProfileSyncLastStatus.type === 'warn' ? '#fde68a' : '#a7f3d0'};background:${_rosterProfileSyncLastStatus.type === 'warn' ? '#fffbeb' : '#ecfdf5'};color:${_rosterProfileSyncLastStatus.type === 'warn' ? '#92400e' : '#065f46'};font-size:12px;font-weight:700;line-height:1.6;">
      ${_esc(_rosterProfileSyncLastStatus.message || '')}
    </div>
  ` : '';
  const outOfSyncRows = [
    ...report.matchedMedium.map((row) => ({ ...row, syncStatus: 'review-match' })),
    ...report.unmatched.map((row) => ({ ...row, syncStatus: 'unmatched' })),
    ...report.reviewDuplicates.map((row) => ({ ...row, syncStatus: 'duplicate-review' })),
    ...report.safeArchiveCandidates.map((row) => ({ ...row, syncStatus: 'duplicate-safe' })),
  ];

  const renderRow = (row) => {
    const ident = _syncReviewIdentity(row);
    const changed = (row?.changedFields || []).map(_profileMergeFieldLabel).join(', ') || 'No field changes';
    const missing = (row?.missingFields || []).map(_profileMergeFieldLabel).join(', ');
    return `
      <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-weight:800;color:var(--navy);">${_esc(ident.displayName || row?.uid)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">UID: ${_esc(row?.uid || '')} · Match: ${_esc(row?.matchedBy || 'none')} · Work score: ${Number(row?.workScore || 0)}</div>
          </div>
          <div style="font-size:11px;padding:4px 8px;border-radius:999px;background:${row?.confidence === 'high' ? '#dcfce7' : '#fef3c7'};color:${row?.confidence === 'high' ? '#166534' : '#92400e'};font-weight:800;text-transform:uppercase;">${_esc(row?.confidence || 'none')}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;">
          <div style="font-size:12px;color:var(--navy);"><strong>Student ID:</strong> ${_esc(ident.studentId || '—')}</div>
          <div style="font-size:12px;color:var(--navy);"><strong>Group:</strong> ${_esc(ident.tutorialGroup || '—')}</div>
          <div style="font-size:12px;color:var(--navy);"><strong>Username:</strong> ${_esc(ident.username || '—')}</div>
          <div style="font-size:12px;color:var(--navy);"><strong>Personal email:</strong> ${_esc(ident.personalEmail || '—')}</div>
        </div>
        ${row?.rosterEntry ? `
          <div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid var(--border);font-size:12px;color:var(--muted);line-height:1.6;">
            <strong style="color:var(--navy);">Roster:</strong>
            ${_esc(ident.rosterName || '—')} · ${_esc(ident.rosterStudentId || '—')} · ${_esc(ident.rosterUsername || ident.rosterEmail || '—')}
          </div>
        ` : ''}
        <div style="font-size:12px;color:var(--navy);margin-top:8px;">Changes: ${_esc(changed)}</div>
        ${missing ? `<div style="font-size:12px;color:#b91c1c;margin-top:4px;">Still missing after merge: ${_esc(missing)}</div>` : ''}
      </div>
    `;
  };

  const duplicateCards = report.duplicateGroups.length
    ? report.duplicateGroups.map((group) => `
      <div style="padding:16px;border:1px solid rgba(15,23,42,.08);border-radius:18px;background:linear-gradient(180deg,#ffffff,#f8fbff);box-shadow:0 12px 26px rgba(15,23,42,.04);">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px;">
          <div style="font-weight:800;color:var(--navy);font-size:15px;">Duplicate group: ${_esc(group.keyLabel)}</div>
          <div style="font-size:10px;padding:5px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Needs attention</div>
        </div>
        <div style="font-size:12px;color:#166534;margin-bottom:10px;padding:10px 12px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">Keep: ${_esc(group.keeper?.mergedProfile?.displayName || group.keeper?.existingProfile?.displayName || group.keeper?.uid)} · work score ${Number(group.keeper?.workScore || 0)}</div>
        <div style="display:grid;gap:8px;">
          ${group.candidates.map((candidate) => `
            <div style="padding:12px;border-radius:14px;background:${candidate.safeArchive ? '#f0fdf4' : '#fff7ed'};border:1px solid ${candidate.safeArchive ? '#bbf7d0' : '#fed7aa'};">
              <div style="font-weight:700;color:var(--navy);">${_esc(candidate?.mergedProfile?.displayName || candidate?.existingProfile?.displayName || candidate?.uid)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">UID: ${_esc(candidate.uid)} · work score ${Number(candidate.workScore || 0)}</div>
              <div style="font-size:12px;color:${candidate.safeArchive ? '#166534' : '#9a3412'};margin-top:4px;">${candidate.safeArchive ? 'Safe to archive automatically: no meaningful work detected.' : 'Review required: this duplicate has recorded work.'}</div>
              ${_isNonUjDuplicateCandidate(candidate) ? `<div style="font-size:12px;color:#991b1b;margin-top:4px;font-weight:700;">Invalid non-UJ identity: eligible for hard delete.</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')
    : '<div style="font-size:12px;color:var(--muted);">No duplicate student accounts detected.</div>';

  const invalidNonUjDuplicateCards = report.invalidNonUjDuplicateCandidates.length
    ? report.invalidNonUjDuplicateCandidates.map((row) => {
      const duplicateName = row?.mergedProfile?.displayName || row?.existingProfile?.displayName || row?.uid;
      const duplicateIdentity = _rowAuthIdentity(row) || 'No auth identity recorded';
      const keeperName = row?.keeper?.mergedProfile?.displayName || row?.keeper?.existingProfile?.displayName || row?.keeper?.uid || 'No keeper selected';
      const keeperIdentity = _rowAuthIdentity(row?.keeper) || 'No keeper identity recorded';
      const studentId = row?.mergedProfile?.studentId || row?.existingProfile?.studentId || row?.existingProfile?.studentNumber || '—';
      return `
        <div style="padding:14px;border-radius:16px;background:linear-gradient(180deg,#fff5f5,#fef2f2);border:1px solid #fecaca;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
            <div>
              <div style="font-weight:800;color:#991b1b;">${_esc(duplicateName)}</div>
              <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">UID: ${_esc(row.uid)} · student ID ${_esc(studentId)} · work score ${Number(row?.workScore || 0)}</div>
              <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">Duplicate identity: ${_esc(duplicateIdentity)}</div>
              <div style="font-size:12px;color:#166534;margin-top:4px;">Keep: ${_esc(keeperName)} · ${_esc(keeperIdentity)}</div>
            </div>
            <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;background:#991b1b;border-color:#991b1b;color:white;" onclick="_hardDeleteSingleDuplicateProfile('${_esc(row.uid)}')">Hard Delete</button>
          </div>
        </div>
      `;
    }).join('')
    : '<div style="font-size:12px;color:var(--muted);">No invalid non-UJ duplicate accounts are currently flagged for hard delete.</div>';

  const outOfSyncTable = outOfSyncRows.length ? `
    <div style="border:1px solid var(--border);border-radius:12px;overflow:auto;background:white;">
      <table style="width:100%;border-collapse:collapse;min-width:980px;">
        <thead>
          <tr>
            ${['Student', 'Status', 'Match', 'Student ID', 'Username', 'Work', 'Actions'].map((h) => `
              <th style="padding:10px 12px;background:var(--cream);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);text-align:left;">${h}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${outOfSyncRows.map((row) => {
    const ident = _syncReviewIdentity(row);
    const statusLabel = row.syncStatus === 'review-match'
      ? 'Needs review'
      : row.syncStatus === 'unmatched'
        ? 'No roster match'
        : row.syncStatus === 'duplicate-safe'
          ? 'Safe duplicate'
          : 'Duplicate with work';
    const statusColor = row.syncStatus === 'duplicate-safe'
      ? '#166534'
      : row.syncStatus === 'review-match'
        ? '#92400e'
        : '#991b1b';
    const canSync = row.syncStatus === 'review-match';
    const canArchive = row.syncStatus === 'duplicate-safe';
    const canHardDelete = _isNonUjDuplicateCandidate(row) && (row.syncStatus === 'duplicate-safe' || row.syncStatus === 'duplicate-review');
    return `
              <tr>
                <td style="padding:10px 12px;border-top:1px solid var(--border);">
                  <div style="font-weight:800;color:var(--navy);">${_esc(ident.displayName || row?.uid)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">UID: ${_esc(row.uid)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(ident.personalEmail || ident.authEmail || '—')}</div>
                </td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:${statusColor};font-weight:700;">${_esc(statusLabel)}</td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">${_esc(row.matchedBy || '—')}</td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:12px;color:var(--navy);">
                  ${_esc(ident.studentId || '—')}
                  <div style="font-size:11px;color:var(--muted);font-family:inherit;margin-top:2px;">Group: ${_esc(ident.tutorialGroup || '—')}</div>
                </td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);">
                  ${_esc(ident.username || '—')}
                  ${row?.rosterEntry ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">Roster: ${_esc(ident.rosterUsername || ident.rosterEmail || '—')}</div>` : ''}
                </td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--navy);">${Number(row.workScore || 0)}</td>
                <td style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;">
                  ${canSync ? `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#1d4ed8;border-color:#1d4ed8;color:white;" onclick="_syncSingleStudentProfile('${_esc(row.uid)}')">Sync</button>` : ''}
                  <button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;" onclick="_markStudentProfileForReview('${_esc(row.uid)}')">Mark Review</button>
                  ${canArchive ? `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#166534;border-color:#166534;color:white;" onclick="_archiveSingleDuplicateProfile('${_esc(row.uid)}')">Archive Duplicate</button>` : ''}
                  ${canHardDelete ? `<button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;background:#991b1b;border-color:#991b1b;color:white;" onclick="_hardDeleteSingleDuplicateProfile('${_esc(row.uid)}')">Hard Delete</button>` : ''}
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  ` : '<div style="font-size:12px;color:var(--muted);">No out-of-sync student records detected.</div>';

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;inset:0;background:linear-gradient(180deg,rgba(7,14,27,.78),rgba(18,32,51,.88));backdrop-filter:blur(8px);z-index:100020;display:flex;align-items:center;justify-content:center;padding:22px;';
  modal.innerHTML = `
    <div style="width:min(1180px,96vw);max-height:90vh;overflow:auto;background:
      radial-gradient(circle at top right, rgba(255,183,3,.08), transparent 20%),
      radial-gradient(circle at bottom left, rgba(33,158,188,.08), transparent 24%),
      linear-gradient(180deg,#fbfcfe,#f3f7fb);
      border-radius:28px;padding:26px;border:1px solid rgba(255,255,255,.14);box-shadow:0 26px 70px rgba(0,0,0,.26);">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px;">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#219ebc;margin-bottom:10px;">Roster Reconciliation Workspace</div>
          <h2 style="margin:0;color:#10213a;font-family:var(--font-heading);font-size:34px;line-height:1.08;">Sync, review, and tidy student profiles</h2>
          <p style="margin:10px 0 0 0;color:#5b6b84;font-size:14px;line-height:1.8;max-width:760px;">Use this space to reconcile the active student list against the official class roster, keep the correct UID attached to completed work, and send students into a final profile confirmation flow on their next sign-in.</p>
        </div>
        <button class="btn-prev" style="display:inline-flex;border-radius:14px;padding:10px 14px;background:white;border-color:rgba(15,23,42,.1);" onclick="document.getElementById('${modalId}')?.remove()">Close</button>
      </div>
      ${lastStatusBanner}

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-color:#6d28d9;color:white;border-radius:16px;padding:12px 16px;box-shadow:0 16px 28px rgba(109,40,217,.18);" onclick="_runRosterEnrollmentRollout()">🚀 Enroll Roster + Send Reset Links (${enrollment.readyRows.length})</button>
        <button class="btn-prev" style="display:inline-flex;background:white;border-color:rgba(124,58,237,.18);color:#6d28d9;border-radius:16px;padding:12px 16px;" onclick="_downloadRosterEnrollmentDryRunCsv()">⬇ Dry-Run CSV</button>
        <button class="btn-prev" style="display:inline-flex;background:white;border-color:#fca5a5;color:#991b1b;border-radius:16px;padding:12px 16px;" onclick="_downloadRosterOnlyCleanupCsv()">⬇ Cleanup CSV</button>
        <button class="btn-prev" style="display:inline-flex;background:white;border-color:#fecaca;color:#991b1b;border-radius:16px;padding:12px 16px;" onclick="_copyRosterOnlyCleanupNotice()">📋 Copy Student Notice</button>
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#1d4ed8,#2563eb);border-color:#1d4ed8;color:white;border-radius:16px;padding:12px 16px;box-shadow:0 16px 28px rgba(37,99,235,.18);" onclick="_applyRosterProfileSync('high')">Apply High-Confidence Sync (${report.matchedHigh.length})</button>
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#166534,#15803d);border-color:#166534;color:white;border-radius:16px;padding:12px 16px;box-shadow:0 16px 28px rgba(21,128,61,.18);" onclick="_archiveSafeDuplicateProfiles()">Archive Safe Duplicates (${report.safeArchiveCandidates.length})</button>
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#b91c1c,#991b1b);border-color:#991b1b;color:white;border-radius:16px;padding:12px 16px;box-shadow:0 16px 28px rgba(153,27,27,.18);" onclick="_hardDeleteInvalidDuplicateProfiles()">Hard Delete Invalid Duplicates (${report.invalidNonUjDuplicateCandidates.length})</button>
        <button class="btn-prev" style="display:inline-flex;background:linear-gradient(135deg,#991b1b,#7f1d1d);border-color:#7f1d1d;color:white;border-radius:16px;padding:12px 16px;box-shadow:0 16px 28px rgba(127,29,29,.18);" onclick="_applyRosterOnlyCleanup()">Apply Roster-Only Cleanup (${cleanup.removableRows.length})</button>
        <button class="btn-prev" style="display:inline-flex;border-radius:16px;padding:12px 16px;background:white;border-color:rgba(15,23,42,.1);" onclick="_openRosterProfileSyncModal()">Refresh Report</button>
      </div>

      <div style="margin:-2px 0 18px 0;padding:14px 16px;border-radius:16px;border:1px solid rgba(124,58,237,.16);background:linear-gradient(180deg,#faf5ff,#f5f3ff);color:#4c1d95;font-size:12px;line-height:1.7;">
        Use the enrollment rollout after the roster is clean. It aligns existing student profiles to the roster, creates missing student accounts against the roster UJ email, and sends password reset links. Roster-only cleanup removes non-roster, placeholder, invalid-identity, and duplicate non-canonical student app records. Deleting the upstream Firebase Auth credential still requires a privileged Firebase Admin flow.
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px;">
        ${[
      ['Roster rows', report.rosterCount],
      ['Student accounts', report.studentCount],
      ['Awaiting confirmation', report.syncedAwaitingConfirmation.length],
      ['High confidence', report.matchedHigh.length],
      ['Medium confidence', report.matchedMedium.length],
      ['Unmatched', report.unmatched.length],
      ['Duplicate groups', report.duplicateGroups.length],
      ['Safe archives', report.safeArchiveCandidates.length],
      ['Invalid non-UJ dupes', report.invalidNonUjDuplicateCandidates.length],
      ['Review duplicates', report.reviewDuplicates.length],
      ['Cleanup removals', cleanup.removableRows.length],
    ].map(([label, value]) => `
          <div style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:18px;padding:14px 15px;box-shadow:0 12px 26px rgba(15,23,42,.04);">
            <div style="font-size:10px;color:#5b6b84;text-transform:uppercase;letter-spacing:.1em;font-family:'DM Mono',monospace;">${label}</div>
            <div style="font-size:24px;font-weight:900;color:#10213a;margin-top:6px;">${Number(value || 0)}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px;">
        ${[
      ['Ready for rollout', enrollment.readyRows.length],
      ['Existing to align', enrollment.existingMatches.length],
      ['New accounts', enrollment.newAccounts.length],
      ['Invalid rows', enrollment.invalidRows.length],
      ['Conflicts', enrollment.conflicts.length],
    ].map(([label, value]) => `
          <div style="background:linear-gradient(180deg,#ffffff,#fbf7ff);border:1px solid rgba(124,58,237,.12);border-radius:18px;padding:14px 15px;box-shadow:0 12px 26px rgba(15,23,42,.04);">
            <div style="font-size:10px;color:#6d28d9;text-transform:uppercase;letter-spacing:.1em;font-family:'DM Mono',monospace;">${label}</div>
            <div style="font-size:24px;font-weight:900;color:#4c1d95;margin-top:6px;">${Number(value || 0)}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">
        <section style="background:linear-gradient(180deg,#ffffff,#fbf7ff);border:1px solid rgba(124,58,237,.12);border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#4c1d95;font-size:16px;">Roster rollout - new accounts to create</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${enrollment.newAccounts.length ? enrollment.newAccounts.slice(0, 20).map((item) => `
              <div style="padding:12px 14px;border:1px solid #ddd6fe;border-radius:16px;background:linear-gradient(180deg,#faf5ff,#f5f3ff);">
                <div style="font-weight:800;color:#5b21b6;">${_esc(item.displayName || item.authEmail)}</div>
                <div style="font-size:12px;color:#6d28d9;margin-top:4px;">${_esc(item.authEmail)} · ${_esc(item.studentId || 'No student ID')} · Group ${_esc(item.mergedProfile?.tutorialGroup || '—')}</div>
                <div style="font-size:12px;color:#6d28d9;margin-top:4px;">A Firebase Auth account will be created and a reset link will be emailed to the roster UJ address.</div>
              </div>
            `).join('') : '<div style="font-size:12px;color:var(--muted);">No new roster-backed student accounts need to be created.</div>'}
          </div>
        </section>
        <section style="background:linear-gradient(180deg,#ffffff,#fbf7ff);border:1px solid rgba(124,58,237,.12);border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#4c1d95;font-size:16px;">Roster rollout - existing accounts to align</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${enrollment.existingMatches.length ? enrollment.existingMatches.slice(0, 20).map((item) => `
              <div style="padding:12px 14px;border:1px solid #ddd6fe;border-radius:16px;background:linear-gradient(180deg,#faf5ff,#f5f3ff);">
                <div style="font-weight:800;color:#5b21b6;">${_esc(item.mergedProfile?.displayName || item.authEmail)}</div>
                <div style="font-size:12px;color:#6d28d9;margin-top:4px;">UID: ${_esc(item.uid || '—')} · ${_esc(item.authEmail)} · ${_esc(item.studentId || 'No student ID')}</div>
                <div style="font-size:12px;color:#6d28d9;margin-top:4px;">This account will be aligned to the roster profile and sent a password reset link.</div>
              </div>
            `).join('') : '<div style="font-size:12px;color:var(--muted);">No existing student accounts are waiting for roster alignment.</div>'}
          </div>
        </section>
        <section style="background:linear-gradient(180deg,#ffffff,#fff7ed);border:1px solid #fed7aa;border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#9a3412;font-size:16px;">Rows blocked from rollout</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${enrollment.invalidRows.concat(enrollment.conflicts).length ? enrollment.invalidRows.concat(enrollment.conflicts).slice(0, 20).map((item) => `
              <div style="padding:12px 14px;border:1px solid #fed7aa;border-radius:16px;background:linear-gradient(180deg,#fff7ed,#fffbeb);">
                <div style="font-weight:800;color:#9a3412;">Row ${Number(item.rowNo || 0)} · ${_esc(item.displayName || _rosterDisplayName(item.row) || item.authEmail || 'Roster row')}</div>
                <div style="font-size:12px;color:#b45309;margin-top:4px;">${_esc(item.authEmail || 'No UJ username')} · ${_esc(item.studentId || _rosterStudentIdValue(item.row) || 'No student ID')}</div>
                <div style="font-size:12px;color:#9a3412;margin-top:4px;">${_esc(item.reason || 'Manual review required.')}</div>
              </div>
            `).join('') : '<div style="font-size:12px;color:var(--muted);">No blocking roster issues remain for the enrollment rollout.</div>'}
          </div>
        </section>
        <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#10213a;font-size:16px;">Synced - awaiting student confirmation</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${report.syncedAwaitingConfirmation.length ? report.syncedAwaitingConfirmation.slice(0, 24).map((row) => {
      const ident = _syncReviewIdentity(row);
      return `
              <div style="padding:12px 14px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(180deg,#eef6ff,#eff6ff);">
                <div style="font-weight:800;color:#1d4ed8;">${_esc(ident.displayName || row?.uid)}</div>
                <div style="font-size:12px;color:#1e3a8a;margin-top:4px;">${_esc(ident.studentId || '—')} · ${_esc(ident.username || '—')} · ${_esc(ident.personalEmail || '—')}</div>
                <div style="font-size:12px;color:#1e3a8a;margin-top:4px;">Roster sync already applied. This student will confirm their profile on next sign-in.</div>
              </div>
            `;
    }).join('') : '<div style="font-size:12px;color:var(--muted);">No synced students are currently waiting for confirmation.</div>'}
          </div>
        </section>
        <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#10213a;font-size:16px;">High-confidence matches</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${report.matchedHigh.length ? report.matchedHigh.slice(0, 24).map(renderRow).join('') : '<div style="font-size:12px;color:var(--muted);">No high-confidence matches found.</div>'}
          </div>
        </section>
        <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
          <h3 style="margin:0 0 10px 0;color:#10213a;font-size:16px;">Needs review before sync</h3>
          <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
            ${report.matchedMedium.length ? report.matchedMedium.slice(0, 16).map(renderRow).join('') : '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">No medium-confidence matches.</div>'}
            ${report.unmatched.length ? report.unmatched.slice(0, 16).map((row) => `
              <div style="padding:12px 14px;border:1px solid #fecaca;border-radius:16px;background:linear-gradient(180deg,#fff5f5,#fef2f2);">
                <div style="font-weight:800;color:#991b1b;">${_esc(row?.existingProfile?.displayName || row?.existingProfile?.email || row?.uid)}</div>
                <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">No roster match found. Leave this account untouched until reviewed.</div>
              </div>
            `).join('') : '<div style="font-size:12px;color:var(--muted);">No unmatched student accounts.</div>'}
          </div>
        </section>
      </div>

      <section style="background:linear-gradient(180deg,#ffffff,#fff7ed);border:1px solid #fed7aa;border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#9a3412;font-size:16px;">Roster-only cleanup report</h3>
        <p style="margin:0 0 12px 0;font-size:12px;color:#9a3412;line-height:1.7;">This is the destructive cleanup preview. Applying cleanup removes student app records that are not the single canonical roster-backed account.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div style="padding:14px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;">
            <div style="font-size:11px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;">Roster canonical</div>
            <div style="font-size:24px;font-weight:900;color:#1d4ed8;margin-top:6px;">${cleanup.canonicalRows.length}</div>
          </div>
          <div style="padding:14px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;">
            <div style="font-size:11px;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;">Duplicate non-canonical</div>
            <div style="font-size:24px;font-weight:900;color:#9a3412;margin-top:6px;">${cleanup.duplicateRows.length}</div>
          </div>
          <div style="padding:14px;border-radius:16px;background:#fef2f2;border:1px solid #fecaca;">
            <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:.08em;">Non-roster</div>
            <div style="font-size:24px;font-weight:900;color:#991b1b;margin-top:6px;">${cleanup.nonRosterRows.length}</div>
          </div>
          <div style="padding:14px;border-radius:16px;background:#fdf4ff;border:1px solid #e9d5ff;">
            <div style="font-size:11px;color:#7e22ce;text-transform:uppercase;letter-spacing:.08em;">Placeholder</div>
            <div style="font-size:24px;font-weight:900;color:#7e22ce;margin-top:6px;">${cleanup.placeholderRows.length}</div>
          </div>
          <div style="padding:14px;border-radius:16px;background:#fef2f2;border:1px solid #fecaca;">
            <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:.08em;">Invalid identity</div>
            <div style="font-size:24px;font-weight:900;color:#991b1b;margin-top:6px;">${cleanup.invalidIdentityRows.length}</div>
          </div>
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#fff7ed);border:1px solid #fed7aa;border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#9a3412;font-size:16px;">Duplicate non-canonical accounts to remove</h3>
        <div style="display:grid;gap:10px;max-height:260px;overflow:auto;">
          ${cleanup.duplicateRows.length ? cleanup.duplicateRows.map((row) => `
            <div style="padding:12px 14px;border:1px solid #fed7aa;border-radius:16px;background:linear-gradient(180deg,#fff7ed,#fffbeb);">
              <div style="font-weight:800;color:#9a3412;">${_esc(row?.name || row?.uid)}</div>
              <div style="font-size:12px;color:#b45309;margin-top:4px;">UID: ${_esc(row.uid)} · ${_esc(_studentRowAuthEmail(row) || 'No UJ identity')} · ${_esc(_studentRowId(row) || 'No student ID')}</div>
              <div style="font-size:12px;color:#166534;margin-top:4px;">Keep canonical: ${_esc(row?.keeper?.name || row?.keeper?.mergedProfile?.displayName || row?.keeper?.uid || '—')}</div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--muted);">No duplicate non-canonical student accounts are currently flagged.</div>'}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#fef2f2);border:1px solid #fecaca;border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#991b1b;font-size:16px;">Non-roster accounts to remove</h3>
        <div style="display:grid;gap:10px;max-height:260px;overflow:auto;">
          ${cleanup.nonRosterRows.length ? cleanup.nonRosterRows.map((row) => `
            <div style="padding:12px 14px;border:1px solid #fecaca;border-radius:16px;background:linear-gradient(180deg,#fff5f5,#fef2f2);">
              <div style="font-weight:800;color:#991b1b;">${_esc(row?.name || row?.uid)}</div>
              <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">UID: ${_esc(row.uid)} · ${_esc(_studentRowAuthEmail(row) || 'No UJ identity')} · ${_esc(_studentRowId(row) || 'No student ID')}</div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--muted);">No non-roster student accounts are currently flagged.</div>'}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#fdf4ff);border:1px solid #e9d5ff;border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#7e22ce;font-size:16px;">Placeholder accounts to remove</h3>
        <div style="display:grid;gap:10px;max-height:260px;overflow:auto;">
          ${cleanup.placeholderRows.length ? cleanup.placeholderRows.map((row) => `
            <div style="padding:12px 14px;border:1px solid #e9d5ff;border-radius:16px;background:linear-gradient(180deg,#fdf4ff,#faf5ff);">
              <div style="font-weight:800;color:#7e22ce;">${_esc(row?.name || row?.uid)}</div>
              <div style="font-size:12px;color:#6b21a8;margin-top:4px;">UID: ${_esc(row.uid)} · Work score ${Number(row?.workScore || 0)}</div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--muted);">No placeholder student accounts are currently flagged.</div>'}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#fef2f2);border:1px solid #fecaca;border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#991b1b;font-size:16px;">Invalid identity accounts to remove</h3>
        <div style="display:grid;gap:10px;max-height:260px;overflow:auto;">
          ${cleanup.invalidIdentityRows.length ? cleanup.invalidIdentityRows.map((row) => `
            <div style="padding:12px 14px;border:1px solid #fecaca;border-radius:16px;background:linear-gradient(180deg,#fff5f5,#fef2f2);">
              <div style="font-weight:800;color:#991b1b;">${_esc(row?.name || row?.uid)}</div>
              <div style="font-size:12px;color:#7f1d1d;margin-top:4px;">UID: ${_esc(row.uid)} · ${_esc(_studentRowAuthEmail(row) || 'No valid UJ identity')} · ${_esc(_studentRowId(row) || 'No student ID')}</div>
            </div>
          `).join('') : '<div style="font-size:12px;color:var(--muted);">No invalid-identity student accounts are currently flagged.</div>'}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#991b1b;font-size:16px;">Invalid non-UJ duplicates</h3>
        <p style="margin:0 0 12px 0;font-size:12px;color:#7f1d1d;line-height:1.7;">These duplicate accounts are not based on a valid UJ student identity. Review this list before hard delete. The keep account is the roster-aligned record that should remain active.</p>
        <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
          ${invalidNonUjDuplicateCards}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#10213a;font-size:16px;">Duplicate accounts</h3>
        <div style="display:grid;gap:10px;max-height:320px;overflow:auto;">
          ${duplicateCards}
        </div>
      </section>

      <section style="background:linear-gradient(180deg,#ffffff,#f8fbff);border:1px solid rgba(15,23,42,.08);border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 14px 28px rgba(15,23,42,.04);">
        <h3 style="margin:0 0 10px 0;color:#10213a;font-size:16px;">Out-of-Sync Students</h3>
        <p style="margin:0 0 12px 0;font-size:12px;color:#5b6b84;line-height:1.7;">This table isolates accounts that still need attention after automatic roster matching. Use Sync only for review matches you accept, Mark Review to force student confirmation, Archive Duplicate for safe duplicates with no work, and Hard Delete only for invalid non-UJ duplicates.</p>
        ${outOfSyncTable}
      </section>
    </div>
  `;
  document.body.appendChild(modal);
};

window._applyRosterProfileSync = async (confidence = 'high') => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const rows = confidence === 'medium'
    ? _rosterProfileSyncReport.matchedHigh.concat(_rosterProfileSyncReport.matchedMedium)
    : _rosterProfileSyncReport.matchedHigh;
  if (!rows.length) {
    _showLecturerToast('No matched student profiles are ready to sync.', 'warn', 2800);
    return;
  }
  if (!confirm(`Sync ${rows.length} student profiles from the roster and require confirmation on next sign-in?`)) return;

  _setRosterSyncBusy(`Syncing ${rows.length} student profile${rows.length === 1 ? '' : 's'} from the roster...`);
  try {
    let synced = 0;
    const failures = [];
    for (const row of rows) {
      try {
        const existing = row.existingProfile || {};
        const payload = {
          ...row.mergedProfile,
          uid: row.uid,
          role: 'student',
          disabled: Boolean(existing.disabled),
          createdAt: existing.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedByUid: STATE.user?.uid || null,
          source: existing.source || 'lecturer-roster-profile-sync',
          migrationConfidence: row.confidence,
          migrationMatchedBy: row.matchedBy,
          rosterLinkedAt: new Date().toISOString(),
          needsProfileReview: true,
        };
        await set(ref(db, `users/${row.uid}/profile`), _cleanFirebaseValue(payload));
        synced += 1;
      } catch (err) {
        failures.push(`${row.uid}: ${err?.message || err || 'Unknown error'}`);
      }
    }
    await _umRefreshUsers().catch(() => { });
    if (failures.length) {
      _setRosterProfileSyncStatus(`Roster sync completed for ${synced}/${rows.length} profiles. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn');
      _showLecturerToast(`Roster sync completed for ${synced}/${rows.length} profiles. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
    } else {
      _setRosterProfileSyncStatus(`Roster sync applied to ${synced} student profiles. Students will confirm these profiles after sign-in.`, 'success');
      _showLecturerToast(`Roster sync applied to ${synced} student profiles. Students will confirm these profiles after sign-in.`, 'success', 3400);
    }
    await window._openRosterProfileSyncModal();
  } finally {
    _clearRosterSyncBusy();
  }
};

window._archiveSafeDuplicateProfiles = async () => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const rows = _rosterProfileSyncReport.safeArchiveCandidates || [];
  if (!rows.length) {
    _showLecturerToast('No safe duplicate profiles are available for automatic archiving.', 'warn', 2800);
    return;
  }
  if (!confirm(`Archive ${rows.length} duplicate student account(s) with no meaningful work?`)) return;

  _setRosterSyncBusy(`Archiving ${rows.length} safe duplicate account${rows.length === 1 ? '' : 's'}...`);
  try {
    let archived = 0;
    const failures = [];
    for (const row of rows) {
      try {
        const existing = row.existingProfile || {};
        const payload = {
          ...existing,
          uid: row.uid,
          role: 'student',
          disabled: true,
          status: 'archived-duplicate',
          archivedDuplicateOf: row.keeper?.uid || null,
          archiveReason: _profileArchiveReason(row.group, row),
          updatedAt: new Date().toISOString(),
          updatedByUid: STATE.user?.uid || null,
        };
        await set(ref(db, `users/${row.uid}/profile`), _cleanFirebaseValue(payload));
        archived += 1;
      } catch (err) {
        failures.push(`${row.uid}: ${err?.message || err || 'Unknown error'}`);
      }
    }
    await _umRefreshUsers().catch(() => { });
    if (failures.length) {
      _setRosterProfileSyncStatus(`Duplicate archive completed for ${archived}/${rows.length} accounts. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn');
      _showLecturerToast(`Duplicate archive completed for ${archived}/${rows.length} accounts. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
    } else {
      _setRosterProfileSyncStatus(`Archived ${archived} duplicate student account(s). Accounts with work were left untouched for review.`, 'success');
      _showLecturerToast(`Archived ${archived} duplicate student account(s). Accounts with work were left untouched for review.`, 'success', 3400);
    }
    await window._openRosterProfileSyncModal();
  } finally {
    _clearRosterSyncBusy();
  }
};

window._syncSingleStudentProfile = async (uid) => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const row = _rosterProfileSyncReport.matchedHigh.concat(_rosterProfileSyncReport.matchedMedium).find((item) => item.uid === uid);
  if (!row) {
    _showLecturerToast('Student sync row not found. Refresh the report and retry.', 'warn', 2800);
    return;
  }
  if (!confirm(`Sync roster profile into ${row.mergedProfile?.displayName || uid} and require confirmation on next sign-in?`)) return;
  _setRosterSyncBusy('Syncing student profile...');
  try {
    const existing = row.existingProfile || {};
    await set(ref(db, `users/${row.uid}/profile`), _cleanFirebaseValue({
      ...row.mergedProfile,
      uid: row.uid,
      role: 'student',
      disabled: Boolean(existing.disabled),
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedByUid: STATE.user?.uid || null,
      source: existing.source || 'lecturer-roster-profile-sync',
      migrationConfidence: row.confidence,
      migrationMatchedBy: row.matchedBy,
      rosterLinkedAt: new Date().toISOString(),
      needsProfileReview: true,
    }));
    await _umRefreshUsers().catch(() => { });
    _setRosterProfileSyncStatus('Student profile synced and marked for confirmation.', 'success');
    _showLecturerToast('Student profile synced and marked for confirmation.', 'success', 2600);
    await window._openRosterProfileSyncModal();
  } catch (err) {
    _setRosterProfileSyncStatus(`Student sync failed: ${err?.message || err || 'Unknown error'}`, 'warn');
    _showLecturerToast(`Student sync failed: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  } finally {
    _clearRosterSyncBusy();
  }
};

window._markStudentProfileForReview = async (uid) => {
  const user = _umUsersCache?.[uid];
  if (!user?.profile) {
    _showLecturerToast('User not found. Refresh and retry.', 'warn', 2400);
    return;
  }
  _setRosterSyncBusy('Marking profile for review...');
  try {
    await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
      ...(user.profile || {}),
      uid,
      needsProfileReview: true,
      updatedAt: new Date().toISOString(),
      updatedByUid: STATE.user?.uid || null,
    }));
    await _umRefreshUsers().catch(() => { });
    _setRosterProfileSyncStatus('Profile marked for review on next sign-in.', 'success');
    _showLecturerToast('Profile marked for review on next sign-in.', 'success', 2400);
    await window._openRosterProfileSyncModal();
  } catch (err) {
    _setRosterProfileSyncStatus(`Could not mark profile for review: ${err?.message || err || 'Unknown error'}`, 'warn');
    _showLecturerToast(`Could not mark profile for review: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  } finally {
    _clearRosterSyncBusy();
  }
};

window._archiveSingleDuplicateProfile = async (uid) => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const row = (_rosterProfileSyncReport.safeArchiveCandidates || []).find((item) => item.uid === uid);
  if (!row) {
    _showLecturerToast('This duplicate is not marked safe for automatic archiving.', 'warn', 2800);
    return;
  }
  if (!confirm(`Archive duplicate account ${row.mergedProfile?.displayName || uid}?`)) return;
  _setRosterSyncBusy('Archiving duplicate account...');
  try {
    await set(ref(db, `users/${uid}/profile`), _cleanFirebaseValue({
      ...(row.existingProfile || {}),
      uid,
      role: 'student',
      disabled: true,
      status: 'archived-duplicate',
      archivedDuplicateOf: row.keeper?.uid || null,
      archiveReason: _profileArchiveReason(row.group, row),
      updatedAt: new Date().toISOString(),
      updatedByUid: STATE.user?.uid || null,
    }));
    await _umRefreshUsers().catch(() => { });
    _setRosterProfileSyncStatus('Duplicate account archived.', 'success');
    _showLecturerToast('Duplicate account archived.', 'success', 2400);
    await window._openRosterProfileSyncModal();
  } catch (err) {
    _setRosterProfileSyncStatus(`Duplicate archive failed: ${err?.message || err || 'Unknown error'}`, 'warn');
    _showLecturerToast(`Duplicate archive failed: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  } finally {
    _clearRosterSyncBusy();
  }
};

async function _removeProcessedAuthUserRecord(row = {}, audit = {}) {
  const rawKey = String(row?.uid || '').startsWith('auth-only:')
    ? String(row.uid).slice('auth-only:'.length)
    : _processedAuthUserKey(row?.authEmail || row?.email || '');
  if (!rawKey) throw new Error('Missing processed auth-only key.');
  const auditKey = `auth-only:${rawKey}`;
  await set(ref(db, `analytics/deleted-student-accounts/${auditKey.replace(/[.#$\[\]/]/g, '_')}`), _cleanFirebaseValue({
    uid: auditKey,
    deletedAt: new Date().toISOString(),
    deletedByUid: STATE.user?.uid || null,
    deletedByName: STATE.user?.displayName || STATE.user?.email || null,
    ...audit,
  }));
  await remove(ref(db, `analytics/processed-auth-users/${rawKey}`));
}

async function _deleteRosterOnlyCleanupRow(row = {}) {
  const membershipStatus = String(row?.membershipStatus || row?.cleanupCategory || '').trim().toLowerCase();
  const audit = {
    reason: membershipStatus || 'roster-only-cleanup',
    name: row?.name || row?.mergedProfile?.displayName || row?.existingProfile?.displayName || null,
    authIdentity: _studentRowAuthEmail(row) || null,
    studentId: _studentRowId(row) || null,
    tutorialGroup: row?.tutorialGroup || row?.mergedProfile?.tutorialGroup || row?.existingProfile?.tutorialGroup || null,
    workScore: Number(row?.workScore || 0),
  };
  if (row?.keeper?.uid) audit.archivedDuplicateOf = row.keeper.uid;
  if (row?.rosterEntry) {
    audit.rosterAuthEmail = _canonicalRosterAuthEmail(row.rosterEntry) || null;
    audit.rosterStudentId = _rosterStudentIdValue(row.rosterEntry) || null;
  }

  if (row?.isAuthOnlyProcessed || String(row?.uid || '').startsWith('auth-only:')) {
    await _removeProcessedAuthUserRecord(row, audit);
    return;
  }
  await _hardDeleteUserAccountRecord(row.uid, audit);
}

window._applyRosterOnlyCleanup = async () => {
  if (!_rosterOnlyCleanupReport) {
    await _umRefreshUsers();
  }
  const rows = _rosterOnlyCleanupReport?.removableRows || [];
  if (!rows.length) {
    _showLecturerToast('No removable non-roster or duplicate student accounts are currently flagged.', 'warn', 3400);
    return;
  }

  const summary = [
    `Apply roster-only cleanup to ${rows.length} student account(s)?`,
    `- Duplicate non-canonical: ${_rosterOnlyCleanupReport?.duplicateRows?.length || 0}`,
    `- Non-roster: ${_rosterOnlyCleanupReport?.nonRosterRows?.length || 0}`,
    `- Placeholder: ${_rosterOnlyCleanupReport?.placeholderRows?.length || 0}`,
    `- Invalid identity: ${_rosterOnlyCleanupReport?.invalidIdentityRows?.length || 0}`,
    '',
    'This deletes app-level student records and blocks those UIDs in the platform.',
  ].join('\n');
  if (!confirm(summary)) return;

  _setRosterSyncBusy(`Applying roster-only cleanup to ${rows.length} student account${rows.length === 1 ? '' : 's'}...`);
  try {
    let deleted = 0;
    const failures = [];
    for (const row of rows) {
      try {
        await _deleteRosterOnlyCleanupRow(row);
        deleted += 1;
      } catch (err) {
        failures.push(`${row?.uid || row?.name || 'unknown'}: ${err?.message || err || 'Unknown error'}`);
      }
    }
    await _umRefreshUsers().catch(() => { });
    if (failures.length) {
      _setRosterProfileSyncStatus(`Roster-only cleanup removed ${deleted}/${rows.length} student accounts. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn');
      _showLecturerToast(`Roster-only cleanup removed ${deleted}/${rows.length} student accounts. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
    } else {
      _setRosterProfileSyncStatus(`Roster-only cleanup removed ${deleted} non-roster or duplicate student account(s).`, 'success');
      _showLecturerToast(`Roster-only cleanup removed ${deleted} non-roster or duplicate student account(s).`, 'success', 3600);
    }
    if (document.getElementById('roster-profile-sync-modal')) {
      await window._openRosterProfileSyncModal();
    }
  } finally {
    _clearRosterSyncBusy();
  }
};

window._loadUserManagement = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading user management...</div>';
  mount.innerHTML = `
    <div style="padding:34px;max-width:1200px;margin:0 auto;animation:fadeIn 0.3s ease;">
      <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">🛠️ User Management</h1>
      <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Add and manage Students, Tutors, Lecturers, and Moderators. Disabling a user removes their app access while preserving records.</p>

      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Add User</div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(140px,1fr)) auto auto;gap:10px;align-items:end;">
          <input id="um-new-name" placeholder="Full name" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
          <input id="um-new-email" type="email" placeholder="email@domain" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
          <input id="um-new-password" type="text" placeholder="Temporary password (optional for students)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
          <select id="um-new-role" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;">
            ${_USER_ROLES.map((r) => `<option value="${r}">${r}</option>`).join('')}
          </select>
          <button class="btn-prev" style="display:inline-flex;" onclick="_umGenerateTempPassword()">🔐 Generate Password</button>
          <button class="btn-prev" style="display:inline-flex;background:var(--accent);color:white;border-color:var(--accent);" onclick="_umCreateUser()">➕ Create User</button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted);line-height:1.5;">For student accounts, you can leave the temporary password blank. The student must already exist on the active class roster. The system will generate a password internally and send the reset email automatically.</div>
      </div>

      <div style="background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Recover Missing Profile</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:10px;">Use this when Firebase Auth says the UJ email already exists, but the student does not appear in User Management. It checks Auth directly and can send a reset link so the student recreates their profile on next sign-in.</div>
        <div style="display:grid;grid-template-columns:minmax(260px,420px) auto;gap:10px;align-items:end;">
          <input id="um-recover-email" placeholder="Student number or UJ email" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
          <button class="btn-prev" style="display:inline-flex;background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8;" onclick="_umRecoverMissingProfile()">Recover Auth-Only Student</button>
        </div>
        <div style="margin-top:14px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Recent Recovery Attempts</div>
            <select id="um-recovery-log-filter" onchange="_setRecoveryLogFilter(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;color:var(--navy);">
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="warn">Attention</option>
              <option value="error">Failed</option>
            </select>
          </div>
          <div id="um-recovery-log" style="display:grid;gap:10px;"></div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
        <input id="um-filter-q" placeholder="Search name, email, UID, role, student ID, group" onkeydown="if(event.key==='Enter'){event.preventDefault();_umApplyFilters();}" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;min-width:240px;" />
        <button class="btn-prev" style="display:inline-flex;" onclick="_umApplyFilters()">🔎 Search</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_umClearSearch()">Clear</button>
        <select id="um-filter-role" onchange="_umApplyFilters()" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;">
          <option value="all">All roles</option>
          ${_USER_ROLES.map((r) => `<option value="${r}">${r}</option>`).join('')}
        </select>
        <select id="um-filter-membership" onchange="_umApplyFilters()" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;">
          <option value="all">All membership states</option>
          <option value="roster-canonical">Roster canonical</option>
          <option value="duplicate-noncanonical">Duplicate non-canonical</option>
          <option value="non-roster">Non-roster only</option>
          <option value="invalid-identity">Invalid identity</option>
          <option value="placeholder">Placeholder</option>
        </select>
        <select id="um-filter-recovery-state" onchange="_umSetRecoveryStateFilter(this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;">
          <option value="all">All recovery states</option>
          <option value="missing-no-reset">No profile + no reset</option>
          <option value="missing-reset-sent">No profile + reset sent</option>
          <option value="invalid-student-email">Invalid UJ email</option>
        </select>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);padding:0 6px;">
          <input id="um-filter-disabled" type="checkbox" onchange="_umApplyFilters()" />
          Include disabled
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#9a3412;padding:0 6px;">
          <input id="um-filter-reset-attention" type="checkbox" onchange="_umApplyFilters()" />
          Reset attention only
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#1d4ed8;padding:0 6px;">
          <input id="um-filter-new-created" type="checkbox" onchange="_umApplyFilters()" />
          Newly created only
        </label>
        <button class="btn-prev" style="display:inline-flex;background:#991b1b;border-color:#991b1b;color:white;" onclick="_applyRosterOnlyCleanup()">Apply Roster-Only Cleanup</button>
        <button class="btn-prev" style="display:inline-flex;background:#ede9fe;border-color:#ddd6fe;color:#5b21b6;" onclick="_umResendResetLinkBulk()">Resend Reset to Filtered</button>
        <button class="btn-prev" style="display:inline-flex;background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8;" onclick="_openBulkStudentActivationModal()">Bulk Activate from List</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_umRefreshUsers()">↻ Refresh</button>
      </div>

      <div id="um-users-table"></div>
    </div>`;

  try {
    await Promise.all([_umRefreshUsers(), _loadProfileRecoveryLog()]);
    window._setRecoveryLogFilter?.(_umRecoveryLogFilter);
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">Failed to load user management: ${_esc(err.message)}</div>`;
  }
};

async function _hardDeleteDuplicateProfileRow(row) {
  if (!row?.uid) throw new Error('Duplicate row is missing a UID.');

  const identity = _rowAuthIdentity(row);
  await _hardDeleteUserAccountRecord(row.uid, {
    reason: 'invalid-non-uj-duplicate',
    duplicateGroupKey: row?.group?.key || null,
    duplicateGroupLabel: row?.group?.keyLabel || null,
    archivedDuplicateOf: row?.keeper?.uid || null,
    authIdentity: identity || null,
    name: row?.mergedProfile?.displayName || row?.existingProfile?.displayName || null,
    studentId: row?.mergedProfile?.studentId || row?.existingProfile?.studentId || row?.existingProfile?.studentNumber || null,
    workScore: Number(row?.workScore || 0),
  });
}

window._hardDeleteInvalidDuplicateProfiles = async () => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const rows = _rosterProfileSyncReport.invalidNonUjDuplicateCandidates || [];
  if (!rows.length) {
    _showLecturerToast('No invalid non-UJ duplicate accounts are available for hard delete.', 'warn', 3200);
    return;
  }

  const confirmed = confirm(
    `Hard delete ${rows.length} invalid non-UJ duplicate account(s)? This permanently removes their app profile and stored state, and blocks that UID from signing into this app again.`
  );
  if (!confirmed) return;

  _setRosterSyncBusy(`Hard deleting ${rows.length} invalid duplicate account${rows.length === 1 ? '' : 's'}...`);
  try {
    let deleted = 0;
    const failures = [];
    for (const row of rows) {
      try {
        await _hardDeleteDuplicateProfileRow(row);
        deleted += 1;
      } catch (err) {
        failures.push(`${row.uid}: ${err?.message || err || 'Unknown error'}`);
      }
    }
    await _umRefreshUsers().catch(() => { });
    if (failures.length) {
      _setRosterProfileSyncStatus(`Hard delete completed for ${deleted}/${rows.length} duplicates. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn');
      _showLecturerToast(`Hard delete completed for ${deleted}/${rows.length} duplicates. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
    } else {
      _setRosterProfileSyncStatus(`Hard deleted ${deleted} invalid non-UJ duplicate account(s).`, 'success');
      _showLecturerToast(`Hard deleted ${deleted} invalid non-UJ duplicate account(s).`, 'success', 3400);
    }
    await window._openRosterProfileSyncModal();
  } finally {
    _clearRosterSyncBusy();
  }
};

window._hardDeleteSingleDuplicateProfile = async (uid) => {
  if (!_rosterProfileSyncReport) {
    await window._openRosterProfileSyncModal();
    return;
  }
  const row = (_rosterProfileSyncReport.invalidNonUjDuplicateCandidates || []).find((item) => item.uid === uid);
  if (!row) {
    _showLecturerToast('This duplicate is not eligible for invalid non-UJ hard delete.', 'warn', 3200);
    return;
  }
  const identity = _rowAuthIdentity(row) || 'unknown identity';
  if (!confirm(`Hard delete duplicate account ${row.mergedProfile?.displayName || uid} (${identity})? This permanently removes the app profile/state and blocks this UID from using the app again.`)) return;

  _setRosterSyncBusy('Hard deleting duplicate account...');
  try {
    await _hardDeleteDuplicateProfileRow(row);
    await _umRefreshUsers().catch(() => { });
    _setRosterProfileSyncStatus('Duplicate account hard deleted.', 'success');
    _showLecturerToast('Duplicate account hard deleted.', 'success', 2600);
    await window._openRosterProfileSyncModal();
  } catch (err) {
    _setRosterProfileSyncStatus(`Duplicate hard delete failed: ${err?.message || err || 'Unknown error'}`, 'warn');
    _showLecturerToast(`Duplicate hard delete failed: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  } finally {
    _clearRosterSyncBusy();
  }
};

window._hardDeletePlaceholderAccount = async (uid) => {
  const { placeholderActiveNoWork = [] } = window.compareStudentLists?.() || {};
  const row = placeholderActiveNoWork.find((item) => item.uid === uid);
  if (!row) {
    _showLecturerToast('This placeholder account is not eligible for no-work hard delete.', 'warn', 3200);
    return;
  }
  if (!confirm(`Hard delete placeholder account ${row.name || uid}? This permanently removes the app profile/state for this UID.`)) return;

  try {
    await _hardDeleteUserAccountRecord(uid, {
      reason: 'placeholder-active-not-in-roster-no-work',
      name: row?.name || null,
      authIdentity: row?.authEmail || row?.username || row?.email || null,
      studentId: row?.studentNumber || row?.studentId || null,
      workScore: Number(row?.workScore || 0),
    });
    document.getElementById('compare-students-modal')?.remove();
    _showLecturerToast('Placeholder account hard deleted.', 'success', 2600);
    window._openCompareStudentsModal?.();
    await _umRefreshUsers().catch(() => { });
  } catch (err) {
    _showLecturerToast(`Placeholder hard delete failed: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  }
};

window._hardDeletePlaceholderNoWorkAccounts = async () => {
  const { placeholderActiveNoWork = [] } = window.compareStudentLists?.() || {};
  if (!placeholderActiveNoWork.length) {
    _showLecturerToast('No no-work placeholder accounts are available for hard delete.', 'warn', 3200);
    return;
  }
  if (!confirm(`Hard delete ${placeholderActiveNoWork.length} placeholder Student_* account(s) with no work? This permanently removes their app profile/state.`)) return;

  let deleted = 0;
  const failures = [];
  for (const row of placeholderActiveNoWork) {
    try {
      await _hardDeleteUserAccountRecord(row.uid, {
        reason: 'placeholder-active-not-in-roster-no-work',
        name: row?.name || null,
        authIdentity: row?.authEmail || row?.username || row?.email || null,
        studentId: row?.studentNumber || row?.studentId || null,
        workScore: Number(row?.workScore || 0),
      });
      deleted += 1;
    } catch (err) {
      failures.push(`${row.uid}: ${err?.message || err || 'Unknown error'}`);
    }
  }

  document.getElementById('compare-students-modal')?.remove();
  await _umRefreshUsers().catch(() => { });
  if (failures.length) {
    _showLecturerToast(`Deleted ${deleted}/${placeholderActiveNoWork.length} placeholder accounts. Failed: ${failures.length}. First error: ${failures[0]}`, 'warn', 5200);
  } else {
    _showLecturerToast(`Hard deleted ${deleted} no-work placeholder accounts.`, 'success', 3200);
  }
  window._openCompareStudentsModal?.();
};

window._syncTutorGroupAssignments = async () => {
  try {
    const usersSnap = await get(ref(db, 'users'));
    if (!usersSnap.exists()) {
      _showLecturerToast('Sync aborted: no users found in Firebase.', 'warn', 2800);
      return;
    }

    const users = usersSnap.val();
    const { payload, unresolvedTutors, unresolvedStudents } = _toTutorGroupPayload(
      TUTOR_GROUP_ASSIGNMENTS,
      users,
      'content/tutorial-groups/assignments.js'
    );

    await set(ref(db, 'tutorial-groups/assignmentsByTutor'), payload);

    const tutorCount = Object.keys(payload).length;
    const msg = [
      `Tutor-group sync complete.`,
      `Tutors synced: ${tutorCount}`,
      `Unresolved tutors: ${unresolvedTutors.length}`,
      `Unresolved students: ${unresolvedStudents.length}`,
    ].join('\n');
    _showLecturerToast(msg, unresolvedTutors.length || unresolvedStudents.length ? 'warn' : 'success', unresolvedTutors.length || unresolvedStudents.length ? 3600 : 3000);
  } catch (err) {
    _showLecturerToast(`Tutor-group sync failed: ${err.message}`, 'warn', 3600);
  }
};

let _qrAttendanceState = null;

function _attendanceToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function _publishLiveAttendanceToken(state) {
  const now = Date.now();
  const token = _attendanceToken();
  const expiresAt = now + 60_000;
  state.token = token;
  state.expiresAt = expiresAt;

  await set(ref(db, `attendance/live/${state.sessionType}`), {
    active: true,
    sessionType: state.sessionType,
    token,
    sessionId: state.sessionId,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });

  const appUrl = `${window.location.origin}${window.location.pathname}?session=${state.sessionType}&attend=${token}`;
  const qrSrc = generateQrDataUrl(appUrl, 260);

  const img = document.getElementById('att-qr-img');
  const code = document.getElementById('att-qr-code');
  const link = document.getElementById('att-qr-link');
  if (img) img.src = qrSrc;
  if (code) code.textContent = token;
  if (link) {
    link.textContent = appUrl;
    link.href = appUrl;
  }
}

async function _stopQrAttendance(state, closeOverlay = false) {
  if (!state) return;
  clearInterval(state.rotateInterval);
  clearInterval(state.countdownInterval);
  try {
    await remove(ref(db, `attendance/live/${state.sessionType}`));
  } catch {
    // silent
  }
  if (closeOverlay) {
    document.getElementById('att-qr-overlay')?.remove();
  }
  _qrAttendanceState = null;
}

window._openAttendanceQrTool = async (sessionType = 'class') => {
  if (_qrAttendanceState) {
    await _stopQrAttendance(_qrAttendanceState, true);
  }

  const state = {
    sessionType: sessionType === 'tutorial' ? 'tutorial' : 'class',
    sessionId: `att_${Date.now()}`,
    token: null,
    expiresAt: 0,
    rotateInterval: null,
    countdownInterval: null,
  };
  _qrAttendanceState = state;

  const overlay = document.createElement('div');
  overlay.id = 'att-qr-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:560px;width:100%;padding:24px;border:1px solid var(--border);box-shadow:0 20px 50px rgba(0,0,0,.25);">
      <h2 style="margin:0 0 6px 0;color:var(--navy);font-family:var(--font-sans);">${state.sessionType === 'tutorial' ? 'Tutorial' : 'Contact'} QR Check-in</h2>
      <p style="margin:0 0 16px 0;color:var(--muted);font-size:13px;line-height:1.5;">Ask students to scan this QR code (or enter the token manually). The token rotates every 60 seconds.</p>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
        <div style="width:260px;height:260px;border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;">
          <img id="att-qr-img" alt="Attendance QR" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="flex:1;min-width:220px;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Current token</div>
          <div id="att-qr-code" style="font-family:var(--font-mono);font-size:30px;font-weight:800;color:var(--navy);letter-spacing:2px;margin-bottom:10px;">------</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Rotates in</div>
          <div id="att-qr-timer" style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:12px;">60s</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Student link</div>
          <a id="att-qr-link" href="#" target="_blank" rel="noopener" style="font-size:11px;word-break:break-all;color:var(--accent);display:block;"></a>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
        <button id="att-qr-stop" style="padding:8px 12px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;cursor:pointer;">Stop Session</button>
        <button id="att-qr-close" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--navy);cursor:pointer;">Close</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  await _publishLiveAttendanceToken(state);

  state.rotateInterval = setInterval(() => {
    _publishLiveAttendanceToken(state).catch(console.error);
  }, 60_000);

  state.countdownInterval = setInterval(() => {
    const leftMs = Math.max(0, state.expiresAt - Date.now());
    const left = Math.ceil(leftMs / 1000);
    const timer = document.getElementById('att-qr-timer');
    if (timer) timer.textContent = `${left}s`;
  }, 250);

  document.getElementById('att-qr-stop')?.addEventListener('click', async () => {
    await _stopQrAttendance(state, true);
  });
  document.getElementById('att-qr-close')?.addEventListener('click', async () => {
    await _stopQrAttendance(state, true);
  });
};

// ── Analytics Module ──────────────────────────────
function _buildAnalyticsSidebar() {
  return `
    <aside class="dash-sidebar">
      <div class="dash-sidebar-header">
        <div class="dash-role-badge lecturer-badge">🏫 Lecturer</div>
        <div class="dash-sidebar-title">Data Analytics</div>
        <div class="dash-sidebar-sub">Student Performance</div>
        ${_buildSidebarActions()}
      </div>

      <div class="dash-session-type-bar">
        <button class="dst-btn" onclick="_switchSessionType('contact')">🏫 Contact (90m)</button>
        <button class="dst-btn" onclick="_switchSessionType('tutorial')">👥 Tutorial (45m)</button>
        <button class="dst-btn dst-active">📊 Analytics</button>
      </div>

      <div class="dash-phase-group">
        <div class="dash-phase-label">Reports</div>
        <div class="dash-nav-item active" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadAnalytics()">
          <div class="dash-nav-id">📈</div>
          <div class="dash-nav-label">Cohort Overview</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadSkillAnalytics()">
          <div class="dash-nav-id">🧠</div>
          <div class="dash-nav-label">Skill Analytics</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadPhaseAnalysis()">
          <div class="dash-nav-id">🔍</div>
          <div class="dash-nav-label">Phase Robust Analysis</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadResourceManager()">
          <div class="dash-nav-id">📚</div>
          <div class="dash-nav-label">Resource Library</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadRosterManager()">
          <div class="dash-nav-id">📋</div>
          <div class="dash-nav-label">Class Roster</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadAttendanceImportManager()">
          <div class="dash-nav-id">🗓️</div>
          <div class="dash-nav-label">Attendance</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadLiveSessions()">
          <div class="dash-nav-id">📹</div>
          <div class="dash-nav-label">Live Sessions</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadTutorStaff()">
          <div class="dash-nav-id">🎓</div>
          <div class="dash-nav-label">Tutor Staff</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadSimpleGroupAssignment()">
          <div class="dash-nav-id">🗂️</div>
          <div class="dash-nav-label">Group Assignment</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadTutorialStats()">
          <div class="dash-nav-id">📊</div>
          <div class="dash-nav-label">Tutorial Stats</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadStudentNotebooks()">
          <div class="dash-nav-id">📝</div>
          <div class="dash-nav-label">Student Notebooks</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadGradebookManager()">
          <div class="dash-nav-id">📚</div>
          <div class="dash-nav-label">Gradebook</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadUserManagement()">
          <div class="dash-nav-id">🛠️</div>
          <div class="dash-nav-label">User Management</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); window._openAnalyticsReports()">
          <div class="dash-nav-id" style="background:#059669;color:white;">📊</div>
          <div class="dash-nav-label">Weekly/Monthly Reports</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); window._openSubmissionReviewer()">
          <div class="dash-nav-id" style="background:#2563eb;color:white;">📤</div>
          <div class="dash-nav-label">Student Submissions</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); window._openSubmissionReviewer('moderation')">
          <div class="dash-nav-id" style="background:#991b1b;color:white;">🧭</div>
          <div class="dash-nav-label">Moderation Queue</div>
        </div>
      </div>

      <div class="dash-sidebar-footer" style="padding:20px; text-align:center;">
        <div style="font-size:12px; color:var(--muted); line-height:1.4;">
          Data is pulled securely from Firebase in real-time. Only active students are shown.
        </div>
      </div>
    </aside>`;
}

let _cachedStudents = [];
let _cachedRecentOverrideRows = [];
let _cachedAllOverrideRows = [];
let _cachedRecentPromotionRequests = [];
let _cachedAllPromotionRequests = [];
let _cachedAttendanceRegisterRows = [];
let _cachedAttendanceRegisterDateKey = '';
let _cachedAttendanceRegisterSourceLabel = '';
let _attendanceImportDateKey = new Date().toISOString().slice(0, 10);
let _attendanceImportSessionType = 'class';
let _attendanceImportPreviewRows = [];
let _attendanceImportSourceLabel = '';
let _attendanceImportLastFileName = '';
let _gradebookRows = [];
let _gradebookAssessments = [];
let _gradebookSelectedAssessmentId = '';
let _gradebookEditMode = false;
let _gradebookMarkEdits = {};
let _gbBulkSelected = new Map();
let _gbBulkRunning = false;
let _gradebookReturnContext = null;
const _bulkPromoteSelectedUids = new Set();
let _bulkPromoteLastClickedIndex = null;
const _shiftRangeLastIndexByGroup = {};
let _rosterSearchQuery = '';
let _rosterFilterMode = 'all';
let _studentNotebookSearchQuery = '';
let _studentNotebookFilterMode = 'with-work';
let _attendanceAnalyticsSelectedDate = new Date().toISOString().slice(0, 10);
const _studentSupportModeByUid = {};
const _studentSupportSaveStateByUid = {};
const _studentSupportSaveTimerByUid = {};

function _attendanceDateKeyLabel(dateKey = '') {
  const normalized = String(dateKey || '').trim();
  if (!normalized) return 'Unknown date';
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

window._setAnalyticsAttendanceDate = (value = '') => {
  const normalized = String(value || '').trim();
  _attendanceAnalyticsSelectedDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? normalized
    : new Date().toISOString().slice(0, 10);
  window._loadAnalytics?.();
};

function _nextLockedForStudent(student) {
  const lockRows = _lockDiagnosticsForStudent(student || {});
  return lockRows.find((d) => d.locked) || null;
}

function _showLecturerToast(message, type = 'success', durationMs = 4200) {
  const id = 'lecturer-inline-toast';
  document.getElementById(id)?.remove();

  const toast = document.createElement('div');
  toast.id = id;
  const isWarn = String(type || '').toLowerCase() === 'warn';
  const bg = isWarn ? '#fffbeb' : '#ecfdf5';
  const border = isWarn ? '#fde68a' : '#a7f3d0';
  const color = isWarn ? '#92400e' : '#065f46';

  toast.style.cssText = `
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 100100;
    max-width: min(520px, calc(100vw - 36px));
    background: ${bg};
    border: 1px solid ${border};
    color: ${color};
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(0,0,0,.16);
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
    animation: fadeIn .18s ease;
  `;
  toast.textContent = String(message || 'Action completed.');
  document.body.appendChild(toast);
  const requestedMs = Number(durationMs);
  const hasRequestedDuration = Number.isFinite(requestedMs) && requestedMs > 0;
  const defaultMs = isWarn ? 3000 : 2600;
  let holdMs = defaultMs;

  if (hasRequestedDuration) {
    if (requestedMs <= 2500) holdMs = 2400;
    else if (requestedMs <= 2900) holdMs = 2600;
    else if (requestedMs <= 3400) holdMs = 3000;
    else holdMs = 3600;
  }

  window.setTimeout(() => {
    toast.remove();
  }, holdMs);
}

function _attendanceImportDigits(value = '') {
  return String(value || '').replace(/\D+/g, '');
}

function _attendanceImportText(value = '') {
  return String(value || '').trim();
}

function _attendanceImportDateFromValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _attendanceImportSessionLabel(sessionType = 'class') {
  return sessionType === 'tutorial' ? 'Tutorial' : 'Contact';
}

function _attendanceImportBool(value, fallback = true) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['yes', 'y', 'present', 'attended', 'checked in', 'checked-in', '1', 'true', 'p'].includes(normalized)) return true;
  if (['no', 'n', 'absent', 'missed', '0', 'false', 'a'].includes(normalized)) return false;
  return fallback;
}

function _attendanceImportNumber(value) {
  const numeric = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function _attendanceImportHeaderIndex(headers = [], patterns = []) {
  for (let idx = 0; idx < headers.length; idx++) {
    const header = String(headers[idx] || '').trim().toLowerCase();
    if (!header) continue;
    if (patterns.some((pattern) => pattern.test(header))) return idx;
  }
  return -1;
}

async function _loadAttendanceImportStudents() {
  if (Array.isArray(_cachedStudents) && _cachedStudents.length) {
    return _cachedStudents.map((student) => ({
      uid: student.uid,
      name: String(student.name || '').trim(),
      email: _normEmail(student.email || ''),
      studentNumber: String(student.studentNumber || '').trim(),
      tutorialGroup: String(student.tutorialGroup || '').trim().toUpperCase(),
      attendanceData: student.attendanceData || { byDate: {} },
    }));
  }

  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) return [];

  return Object.entries(usersSnap.val() || {})
    .filter(([, user]) => _roleFromProfile(user) === 'student' && !user?.profile?.disabled)
    .map(([uid, user]) => {
      const profile = user?.profile || {};
      const state = user?.state || {};
      return {
        uid,
        name: String(profile.displayName || profile.name || user?.email || `Student_${uid.slice(0, 6)}`).trim(),
        email: _normEmail(profile.authEmail || profile.username || profile.email || ''),
        studentNumber: String(profile.studentNumber || profile.studentNo || profile.studentId || '').trim(),
        tutorialGroup: String(profile.tutorialGroup || '').trim().toUpperCase(),
        attendanceData: state.attendance || { byDate: {} },
      };
    });
}

function _parseAttendanceImportRows(rows = []) {
  const nonEmptyRows = (rows || []).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()));
  if (!nonEmptyRows.length) return { rows: [], detectedDateKey: '', inferredSessionType: '' };

  const headers = nonEmptyRows[0].map((cell) => String(cell || '').trim());
  const bodyRows = nonEmptyRows.slice(1);
  const map = {
    studentNumber: _attendanceImportHeaderIndex(headers, [/student\s*(number|no|id)/, /^id$/, /^number$/]),
    email: _attendanceImportHeaderIndex(headers, [/email/]),
    name: _attendanceImportHeaderIndex(headers, [/student\s*name/, /full\s*name/, /^name$/]),
    firstName: _attendanceImportHeaderIndex(headers, [/first\s*name/, /^first$/]),
    lastName: _attendanceImportHeaderIndex(headers, [/last\s*name/, /^surname$/, /^last$/]),
    present: _attendanceImportHeaderIndex(headers, [/^present$/, /attendance/, /attended/, /status/, /check[\s-]*in/, /mark/]),
    date: _attendanceImportHeaderIndex(headers, [/^date$/, /session\s*date/, /attendance\s*date/]),
    totalMinutes: _attendanceImportHeaderIndex(headers, [/total\s*minutes/, /^minutes$/, /^mins$/, /duration/, /^time$/]),
    classMinutes: _attendanceImportHeaderIndex(headers, [/contact\s*minutes/, /class\s*minutes/]),
    tutorialMinutes: _attendanceImportHeaderIndex(headers, [/tutorial\s*minutes/]),
  };

  let detectedDateKey = '';
  const parsedRows = bodyRows.map((cols, index) => {
    const cell = (idx) => idx >= 0 ? _attendanceImportText(cols[idx]) : '';
    const firstName = cell(map.firstName);
    const lastName = cell(map.lastName);
    const studentNumber = cell(map.studentNumber);
    const email = _normEmail(cell(map.email));
    const name = cell(map.name) || String([firstName, lastName].filter(Boolean).join(' ')).trim();
    const presentValue = cell(map.present);
    const rowDateKey = _attendanceImportDateFromValue(cell(map.date));
    if (!detectedDateKey && rowDateKey) detectedDateKey = rowDateKey;
    return {
      rowNumber: index + 2,
      studentNumber,
      email,
      name,
      present: _attendanceImportBool(presentValue, true),
      statusRaw: presentValue,
      totalMinutes: _attendanceImportNumber(cell(map.totalMinutes)),
      classMinutes: _attendanceImportNumber(cell(map.classMinutes)),
      tutorialMinutes: _attendanceImportNumber(cell(map.tutorialMinutes)),
      rowDateKey,
    };
  }).filter((row) => row.studentNumber || row.email || row.name);

  const headerText = headers.join(' ').toLowerCase();
  const inferredSessionType = /tutorial/.test(headerText) ? 'tutorial' : (/contact|class/.test(headerText) ? 'class' : '');
  return { rows: parsedRows, detectedDateKey, inferredSessionType };
}

function _buildAttendanceImportPreviewRows(rows = [], students = []) {
  const studentByNumber = new Map();
  const studentByEmail = new Map();
  const studentByName = new Map();

  students.forEach((student) => {
    const idKey = _attendanceImportDigits(student.studentNumber);
    const emailKey = _normEmail(student.email);
    const nameKey = String(student.name || '').trim().toLowerCase();
    if (idKey && !studentByNumber.has(idKey)) studentByNumber.set(idKey, student);
    if (emailKey && !studentByEmail.has(emailKey)) studentByEmail.set(emailKey, student);
    if (nameKey && !studentByName.has(nameKey)) studentByName.set(nameKey, student);
  });

  return rows.map((row) => {
    const idKey = _attendanceImportDigits(row.studentNumber);
    const emailKey = _normEmail(row.email);
    const nameKey = String(row.name || '').trim().toLowerCase();

    let student = null;
    let matchedBy = '';
    if (idKey && studentByNumber.has(idKey)) {
      student = studentByNumber.get(idKey);
      matchedBy = 'student number';
    } else if (emailKey && studentByEmail.has(emailKey)) {
      student = studentByEmail.get(emailKey);
      matchedBy = 'email';
    } else if (nameKey && studentByName.has(nameKey)) {
      student = studentByName.get(nameKey);
      matchedBy = 'name';
    }

    return {
      ...row,
      matched: Boolean(student),
      matchedBy,
      student,
    };
  });
}

window._setAttendanceImportDate = (value = '') => {
  const normalized = _attendanceImportDateFromValue(value);
  _attendanceImportDateKey = normalized || new Date().toISOString().slice(0, 10);
  window._loadAttendanceImportManager?.();
};

window._setAttendanceImportSessionType = (value = '') => {
  _attendanceImportSessionType = value === 'tutorial' ? 'tutorial' : 'class';
  window._loadAttendanceImportManager?.();
};

window._handleAttendanceImportFile = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;

  try {
    const XLSX = await import('xlsx');
    const students = await _loadAttendanceImportStudents();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames?.[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!sheet) {
      _showLecturerToast('The workbook does not contain a readable sheet.', 'warn', 3200);
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    const parsed = _parseAttendanceImportRows(rawRows);
    if (!parsed.rows.length) {
      _showLecturerToast('No attendance rows were found in that workbook.', 'warn', 3200);
      return;
    }

    _attendanceImportLastFileName = file.name;
    _attendanceImportSourceLabel = file.name;
    if (parsed.detectedDateKey) _attendanceImportDateKey = parsed.detectedDateKey;
    if (parsed.inferredSessionType) _attendanceImportSessionType = parsed.inferredSessionType;
    _attendanceImportPreviewRows = _buildAttendanceImportPreviewRows(parsed.rows, students);
    _showLecturerToast(`Loaded ${parsed.rows.length} attendance row${parsed.rows.length === 1 ? '' : 's'} from ${file.name}.`, 'success', 3000);
  } catch (err) {
    console.error('Attendance import failed:', err);
    _showLecturerToast(`Attendance import failed: ${err.message || err}`, 'warn', 3800);
  } finally {
    if (event?.target) event.target.value = '';
    window._loadAttendanceImportManager?.();
  }
};

window._applyAttendanceImport = async () => {
  const matchedPresentRows = (_attendanceImportPreviewRows || []).filter((row) => row.matched && row.present);
  if (!matchedPresentRows.length) {
    _showLecturerToast('Load an attendance register with at least one matched present student first.', 'warn', 3200);
    return;
  }

  const dateKey = _attendanceImportDateKey || new Date().toISOString().slice(0, 10);
  const sessionType = _attendanceImportSessionType === 'tutorial' ? 'tutorial' : 'class';
  const sessionLabel = _attendanceImportSessionLabel(sessionType);
  const sessionId = `register_import_${dateKey}_${sessionType}`;
  const importedAt = new Date().toISOString();

  try {
    let applied = 0;
    for (const [index, row] of matchedPresentRows.entries()) {
      const student = row.student;
      if (!student?.uid) continue;

      const existing = student.attendanceData?.byDate?.[dateKey] || {};
      const existingCheckins = Array.isArray(existing.qrCheckins) ? existing.qrCheckins.slice() : [];
      const checkinAt = `${dateKey}T12:00:00.000Z`;
      const importSource = _attendanceImportSourceLabel || _attendanceImportLastFileName || 'attendance register';
      const checkin = {
        at: checkinAt,
        sessionType,
        sessionLabel,
        sessionId,
        source: 'register-import',
        importSource,
        importedAt,
      };
      const duplicateIndex = existingCheckins.findIndex((entry) =>
        entry?.source === 'register-import'
        && String(entry?.sessionType || '') === sessionType
        && String(entry?.importSource || '') === importSource
      );
      if (duplicateIndex >= 0) existingCheckins[duplicateIndex] = { ...existingCheckins[duplicateIndex], ...checkin };
      else existingCheckins.push(checkin);

      const totalMinutes = Math.max(row.totalMinutes || 0, row.classMinutes || 0, row.tutorialMinutes || 0);
      const nextRecord = {
        present: true,
        firstSeen: existing.firstSeen || checkinAt,
        lastSeen: importedAt,
        totalSeconds: Math.max(Number(existing.totalSeconds || 0), totalMinutes > 0 ? totalMinutes * 60 : Number(existing.totalSeconds || 0)),
        classSeconds: sessionType === 'class'
          ? Math.max(Number(existing.classSeconds || 0), (row.classMinutes || row.totalMinutes || 0) * 60)
          : Number(existing.classSeconds || 0),
        tutorialSeconds: sessionType === 'tutorial'
          ? Math.max(Number(existing.tutorialSeconds || 0), (row.tutorialMinutes || row.totalMinutes || 0) * 60)
          : Number(existing.tutorialSeconds || 0),
        lastSessionType: sessionType,
        qrCheckins: existingCheckins,
      };

      const stamp = `import_${Date.now()}_${index}`;
      const remotePayload = {
        ...checkin,
        dateKey,
        uid: student.uid,
      };
      await Promise.all([
        set(ref(db, `users/${student.uid}/state/attendance/byDate/${dateKey}`), nextRecord),
        set(ref(db, `attendance/checkins/${dateKey}/${student.uid}/${stamp}`), remotePayload),
        set(ref(db, `attendance/session-checkins/${sessionId}/${student.uid}`), remotePayload),
      ]);

      student.attendanceData = student.attendanceData || { byDate: {} };
      student.attendanceData.byDate = student.attendanceData.byDate || {};
      student.attendanceData.byDate[dateKey] = nextRecord;
      applied += 1;
    }

    _showLecturerToast(`Attendance imported for ${applied} student${applied === 1 ? '' : 's'}.`, 'success', 3200);
    _cachedStudents = [];
    await window._loadAttendanceImportManager?.();
  } catch (err) {
    console.error('Attendance import apply failed:', err);
    _showLecturerToast(`Attendance import failed: ${err.message || err}`, 'warn', 3800);
  }
};

window._loadAttendanceImportManager = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  const previewRows = Array.isArray(_attendanceImportPreviewRows) ? _attendanceImportPreviewRows : [];
  const matchedRows = previewRows.filter((row) => row.matched);
  const matchedPresentRows = matchedRows.filter((row) => row.present);
  const unmatchedRows = previewRows.filter((row) => !row.matched);
  const skippedRows = matchedRows.filter((row) => !row.present);

  mount.innerHTML = `
    <div style="display:grid;gap:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div>
          <h1 style="margin:0;color:var(--navy);font-family:var(--font-heading);font-size:30px;">Attendance Import</h1>
          <p style="margin:8px 0 0 0;color:var(--muted);line-height:1.6;max-width:760px;">Upload an Excel attendance register and write it into the same student attendance records used by the QR check-in flow and lecturer analytics.</p>
        </div>
        <button class="btn-prev" style="display:inline-flex;" onclick="_loadAnalytics()">Back to Cohort Overview</button>
      </div>

      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
          <div>
            <div style="font-size:12px;font-weight:900;color:var(--navy);text-transform:uppercase;letter-spacing:.08em;">Register Source</div>
            <div style="font-size:14px;color:var(--muted);margin-top:6px;">${_esc(_attendanceImportLastFileName || 'No workbook loaded yet')}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:8px;">
              Date
              <input type="date" value="${_esc(_attendanceImportDateKey)}" onchange="_setAttendanceImportDate(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;color:var(--navy);" />
            </label>
            <label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:8px;">
              Session
              <select onchange="_setAttendanceImportSessionType(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;color:var(--navy);">
                <option value="class" ${_attendanceImportSessionType === 'class' ? 'selected' : ''}>Contact</option>
                <option value="tutorial" ${_attendanceImportSessionType === 'tutorial' ? 'selected' : ''}>Tutorial</option>
              </select>
            </label>
            <label class="btn-prev" style="display:inline-flex;cursor:pointer;">
              ⬆ Upload XLS/XLSX
              <input type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none;" onchange="_handleAttendanceImportFile(event)" />
            </label>
            <button class="btn-next" style="display:inline-flex;" onclick="_applyAttendanceImport()">Apply Import</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Rows Loaded</div>
            <div style="font-size:24px;font-weight:900;color:var(--navy);margin-top:6px;">${previewRows.length}</div>
          </div>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:.08em;">Matched Present</div>
            <div style="font-size:24px;font-weight:900;color:#166534;margin-top:6px;">${matchedPresentRows.length}</div>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;">Matched Absent/Skipped</div>
            <div style="font-size:24px;font-weight:900;color:#9a3412;margin-top:6px;">${skippedRows.length}</div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;">
            <div style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:.08em;">Unmatched</div>
            <div style="font-size:24px;font-weight:900;color:#991b1b;margin-top:6px;">${unmatchedRows.length}</div>
          </div>
        </div>
      </div>

      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <h2 style="margin:0;color:var(--navy);font-size:18px;">Preview</h2>
            <div style="font-size:12px;color:var(--muted);margin-top:6px;">${_attendanceDateKeyLabel(_attendanceImportDateKey)} · ${_attendanceImportSessionLabel(_attendanceImportSessionType)} session</div>
          </div>
        </div>
        ${previewRows.length ? `
          <div style="overflow:auto;border:1px solid var(--border);border-radius:12px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f8fafc;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">
                  <th style="padding:12px 14px;text-align:left;">Row</th>
                  <th style="padding:12px 14px;text-align:left;">Register Entry</th>
                  <th style="padding:12px 14px;text-align:left;">Matched Student</th>
                  <th style="padding:12px 14px;text-align:left;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${previewRows.map((row) => `
                  <tr>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);color:var(--muted);">${row.rowNumber}</td>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);">
                      <div style="font-weight:800;color:var(--navy);">${_esc(row.name || 'Unnamed row')}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(row.studentNumber || 'No student number')} · ${_esc(row.email || 'No email')}</div>
                    </td>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);">
                      ${row.matched ? `
                        <div style="font-weight:800;color:var(--navy);">${_esc(row.student?.name || 'Matched')}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(row.student?.studentNumber || 'No student number')} · ${_esc(row.student?.email || 'No email')} · matched by ${_esc(row.matchedBy || 'unknown')}</div>
                      ` : '<span style="color:#991b1b;font-weight:800;">No matching student</span>'}
                    </td>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);">
                      <span style="display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;font-weight:800;${row.matched ? (row.present ? 'background:#dcfce7;color:#166534;' : 'background:#ffedd5;color:#9a3412;') : 'background:#fee2e2;color:#991b1b;'}">
                        ${row.matched ? (row.present ? 'Ready to import' : 'Skipped as absent') : 'Unmatched'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div style="font-size:13px;color:var(--muted);line-height:1.7;">Upload an attendance register in .xls or .xlsx format. Match using student number first, then email, then exact student name.</div>'}
      </div>
    </div>
  `;
};

function _gradebookAssessmentList() {
  const source = window._atConfigs && typeof window._atConfigs === 'object'
    ? Object.values(window._atConfigs)
    : Object.values(assessmentConfigs);
  return source
    .filter((cfg) => cfg && typeof cfg === 'object' && cfg.id)
    .map((cfg) => ({
      id: String(cfg.id || '').trim(),
      badge: String(cfg.badge || cfg.id || '').trim(),
      title: String(cfg.title || cfg.badge || cfg.id || '').trim(),
      marks: Number(cfg.marks || 100) || 100,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function _gradebookMs(value = '') {
  const parsed = new Date(value || '').getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function _gradebookResolvedMark(record = {}, submission = {}) {
  const moderationMark = Number(record?.moderation?.mark);
  if (Number.isFinite(moderationMark)) return { mark: moderationMark, source: 'Moderation' };

  const tutorMark = Number(record?.tutorReview?.mark);
  if (Number.isFinite(tutorMark)) return { mark: tutorMark, source: 'Tutor Review' };

  const releasedMark = Number(submission?.feedback?.mark);
  if (Number.isFinite(releasedMark)) return { mark: releasedMark, source: 'Released Feedback' };

  const aiMark = Number(record?.aiDraft?.overallMark);
  if (Number.isFinite(aiMark)) return { mark: aiMark, source: 'AI Draft' };

  return { mark: null, source: '' };
}

function _gradebookStatusLabel(record = {}, submission = {}) {
  const raw = String(record?.status || submission?.status || '').trim().toLowerCase();
  if (!raw && !submission?.submittedAt) return 'Not submitted';
  if (raw === 'finalised') return 'Finalised';
  if (raw === 'moderated') return 'Moderated';
  if (raw === 'moderation_required') return 'Moderation required';
  if (raw === 'tutor_reviewed') return 'Tutor reviewed';
  if (raw === 'ai_ready') return 'AI ready';
  if (raw === 'reviewed') return 'Reviewed';
  if (raw === 'submitted') return 'Submitted';
  if (raw === 'cleared') return 'Cleared';
  return raw ? raw.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Submitted';
}

function _gradebookLatestSubmission(rawBySubmission = {}) {
  return Object.entries(rawBySubmission || {})
    .map(([submissionId, submission]) => ({ ...(submission || {}), _submissionId: submissionId }))
    .filter((submission) => submission && submission.submittedAt && submission.status !== 'cleared')
    .sort((a, b) => _gradebookMs(b.submittedAt || b.updatedAt) - _gradebookMs(a.submittedAt || a.updatedAt))[0] || null;
}

function _gradebookSelectedRecord(rawBySubmission = {}, preferredSubmissionId = '') {
  const records = Object.entries(rawBySubmission || {})
    .map(([submissionId, record]) => ({ ...(record || {}), _submissionId: submissionId }))
    .filter((record) => record && typeof record === 'object');
  if (!records.length) return null;

  if (preferredSubmissionId) {
    const direct = records.find((record) => record._submissionId === preferredSubmissionId);
    if (direct) return direct;
  }

  const scored = records.filter((record) => _gradebookResolvedMark(record, {}).mark != null);
  const pool = scored.length ? scored : records;
  return pool.sort((a, b) => {
    const aMs = _gradebookMs(a.finalisedAt || a.moderatedAt || a.tutorReviewedAt || a.aiGeneratedAt || a.updatedAt);
    const bMs = _gradebookMs(b.finalisedAt || b.moderatedAt || b.tutorReviewedAt || b.aiGeneratedAt || b.updatedAt);
    return bMs - aMs;
  })[0] || null;
}

async function _loadGradebookStudents() {
  const [usersSnap, rosterSnap] = await Promise.all([
    get(ref(db, 'users')),
    get(ref(db, 'rosters/classList')).catch(() => ({ exists: () => false })),
  ]);
  if (!usersSnap.exists()) return [];

  const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
  const rosterNumberByEmail = new Map();
  rosterRows.forEach((row) => {
    const email = _normEmail(row?.email || '');
    const studentNumber = String(row?.studentNumber || row?.studentNo || row?.studentId || '').trim();
    if (email && studentNumber) rosterNumberByEmail.set(email, studentNumber);
  });

  return Object.entries(usersSnap.val() || {})
    .filter(([, user]) => _roleFromProfile(user) === 'student' && !user?.profile?.disabled)
    .map(([uid, user]) => {
      const profile = user?.profile || {};
      const state = user?.state || {};
      const email = _normEmail(profile.authEmail || profile.username || profile.email || '');
      return {
        uid,
        name: String(profile.displayName || profile.name || email || `Student_${uid.slice(0, 6)}`).trim(),
        studentNumber: String(
          profile.studentNumber
          || profile.studentNo
          || profile.studentId
          || rosterNumberByEmail.get(email)
          || ''
        ).trim(),
        email,
        tutorialGroup: String(profile.tutorialGroup || '').trim().toUpperCase(),
        state,
      };
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function _gradebookSheetName(label = '') {
  const safe = String(label || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim() || 'Sheet';
  return safe.slice(0, 31);
}

function _gradebookApplyColumnWidths(sheet, widths = []) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  sheet['!autofilter'] = { ref: sheet['!ref'] };
}

function _gradebookSummaryRows() {
  const assessments = _gradebookAssessments || [];
  return (_gradebookRows || []).map((row) => {
    const marks = assessments.map((assessment) => {
      const cell = row.assessments[assessment.id];
      return cell?.resolved?.mark;
    }).filter((mark) => Number.isFinite(Number(mark)));
    const average = marks.length
      ? Math.round((marks.reduce((sum, mark) => sum + Number(mark), 0) / marks.length) * 10) / 10
      : null;
    return [
      row.name,
      row.studentNumber,
      row.email,
      row.tutorialGroup,
      ...assessments.map((assessment) => {
        const cell = row.assessments[assessment.id];
        return cell?.resolved?.mark != null ? Number(cell.resolved.mark) : '';
      }),
      average != null ? average : '',
    ];
  });
}

function _gradebookAssessmentRows(assessmentId) {
  return (_gradebookRows || []).map((row) => {
    const cell = row.assessments?.[assessmentId] || {};
    return [
      row.name,
      row.studentNumber,
      row.email,
      row.tutorialGroup,
      cell?.resolved?.mark != null ? Number(cell.resolved.mark) : '',
      cell?.resolved?.source || '',
      cell?.statusLabel || 'Not submitted',
      cell?.releasedToStudent ? 'Yes' : 'No',
      cell?.submissionCount || 0,
      cell?.latestSubmissionAt || '',
      cell?.latestSubmissionId || '',
    ];
  });
}

async function _downloadWorkbookAsXlsm(filename, sheets = []) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheetDef) => {
    const ws = XLSX.utils.aoa_to_sheet(sheetDef.rows || []);
    _gradebookApplyColumnWidths(ws, sheetDef.widths || []);
    XLSX.utils.book_append_sheet(workbook, ws, _gradebookSheetName(sheetDef.name));
  });
  XLSX.writeFile(workbook, filename, { bookType: 'xlsm', compression: true });
}

window._downloadGradebookXlsm = async () => {
  if (!Array.isArray(_gradebookRows) || !_gradebookRows.length || !Array.isArray(_gradebookAssessments) || !_gradebookAssessments.length) {
    _showLecturerToast('Load the gradebook first, then export it.', 'warn', 2800);
    return;
  }
  const summaryHeaders = [
    'Student Name',
    'Student Number',
    'Email',
    'Tutorial Group',
    ..._gradebookAssessments.map((assessment) => `${assessment.badge} Mark`),
    'Average Mark',
  ];
  const sheets = [
    {
      name: 'Gradebook',
      rows: [summaryHeaders, ..._gradebookSummaryRows()],
      widths: [28, 16, 28, 14, ..._gradebookAssessments.map(() => 16), 14],
    },
    ..._gradebookAssessments.map((assessment) => ({
      name: assessment.badge || assessment.id,
      rows: [[
        'Student Name',
        'Student Number',
        'Email',
        'Tutorial Group',
        'Mark',
        'Mark Source',
        'Review Status',
        'Released To Student',
        'Submission Versions',
        'Latest Submission At',
        'Latest Submission ID',
      ], ..._gradebookAssessmentRows(assessment.id)],
      widths: [28, 16, 28, 14, 12, 16, 18, 16, 18, 22, 18],
    })),
  ];
  await _downloadWorkbookAsXlsm(`gradebook-${new Date().toISOString().slice(0, 10)}.xlsm`, sheets);
};

window._setGradebookAssessment = (assessmentId = '') => {
  _gradebookSelectedAssessmentId = String(assessmentId || '').trim();
  window._loadGradebookManager?.();
};

window._downloadSelectedAssessmentXlsm = async () => {
  const assessment = (_gradebookAssessments || []).find((item) => item.id === _gradebookSelectedAssessmentId)
    || (_gradebookAssessments || [])[0];
  if (!assessment) {
    _showLecturerToast('No assessment gradebook is available yet.', 'warn', 2800);
    return;
  }
  await _downloadWorkbookAsXlsm(`assessment-${assessment.id}-marks-${new Date().toISOString().slice(0, 10)}.xlsm`, [{
    name: assessment.badge || assessment.id,
    rows: [[
      'Student Name',
      'Student Number',
      'Email',
      'Tutorial Group',
      'Mark',
      'Mark Source',
      'Review Status',
      'Released To Student',
      'Submission Versions',
      'Latest Submission At',
      'Latest Submission ID',
    ], ..._gradebookAssessmentRows(assessment.id)],
    widths: [28, 16, 28, 14, 12, 16, 18, 16, 18, 22, 18],
  }]);
};

window._loadGradebookManager = async () => {
  let mount = document.getElementById('analytics-mount');
  if (!mount) {
    const content = document.getElementById('dash-content');
    if (!content) return;
    content.innerHTML = '<div id="analytics-mount" style="height:100%;overflow-y:auto;"></div>';
    mount = document.getElementById('analytics-mount');
    if (!mount) return;
  }
  mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading gradebook…</div>';

  try {
    const assessments = _gradebookAssessmentList();
    const students = await _loadGradebookStudents();
    const fetches = assessments.flatMap((assessment) => [
      get(ref(db, `submissions/${assessment.id}`)).catch(() => ({ exists: () => false })),
      get(ref(db, `grading-records/${assessment.id}`)).catch(() => ({ exists: () => false })),
    ]);
    const fetchResults = await Promise.all(fetches);

    const submissionsByAssessment = {};
    const recordsByAssessment = {};
    assessments.forEach((assessment, idx) => {
      const submissionsSnap = fetchResults[idx * 2];
      const recordsSnap = fetchResults[(idx * 2) + 1];
      submissionsByAssessment[assessment.id] = submissionsSnap?.exists?.() ? (submissionsSnap.val() || {}) : {};
      recordsByAssessment[assessment.id] = recordsSnap?.exists?.() ? (recordsSnap.val() || {}) : {};
    });

    _gradebookAssessments = assessments;
    if (!_gradebookSelectedAssessmentId || !assessments.some((assessment) => assessment.id === _gradebookSelectedAssessmentId)) {
      _gradebookSelectedAssessmentId = assessments[0]?.id || '';
    }

    _gradebookRows = students.map((student) => {
      const assessmentCells = {};
      assessments.forEach((assessment) => {
        const studentSubmissions = submissionsByAssessment[assessment.id]?.[student.uid] || {};
        const studentRecords = recordsByAssessment[assessment.id]?.[student.uid] || {};
        const latestSubmission = _gradebookLatestSubmission(studentSubmissions);
        const selectedRecord = _gradebookSelectedRecord(studentRecords, latestSubmission?._submissionId || '');
        const resolved = _gradebookResolvedMark(selectedRecord || {}, latestSubmission || {});
        assessmentCells[assessment.id] = {
          assessmentId: assessment.id,
          latestSubmissionId: latestSubmission?._submissionId || selectedRecord?._submissionId || '',
          latestSubmissionAt: latestSubmission?.submittedAt || latestSubmission?.updatedAt || '',
          submissionCount: Object.values(studentSubmissions || {}).filter((submission) => submission && submission.submittedAt && submission.status !== 'cleared').length,
          statusLabel: _gradebookStatusLabel(selectedRecord || {}, latestSubmission || {}),
          releasedToStudent: Boolean(latestSubmission?.feedback?.comment || latestSubmission?.feedback?.mark != null || selectedRecord?.status === 'finalised'),
          resolved,
          record: selectedRecord,
          submission: latestSubmission,
          submissionFileUrl: (Array.isArray(latestSubmission?.files) ? latestSubmission.files : [])[0]?.url || '',
        };
      });
      return {
        uid: student.uid,
        name: student.name,
        studentNumber: student.studentNumber || '',
        email: student.email || '',
        tutorialGroup: student.tutorialGroup || '',
        assessments: assessmentCells,
      };
    });

    const selectedAssessment = assessments.find((assessment) => assessment.id === _gradebookSelectedAssessmentId) || null;
    const completedMarks = _gradebookRows.reduce((sum, row) => sum + assessments.filter((assessment) => row.assessments[assessment.id]?.resolved?.mark != null).length, 0);
    const finalisedMarks = _gradebookRows.reduce((sum, row) => sum + assessments.filter((assessment) => row.assessments[assessment.id]?.statusLabel === 'Finalised').length, 0);

    mount.innerHTML = `
      <div style="display:grid;gap:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div>
            <h1 style="margin:0;color:var(--navy);font-family:var(--font-heading);font-size:30px;">Gradebook</h1>
            <p style="margin:8px 0 0 0;color:var(--muted);line-height:1.6;max-width:820px;">Review assessment marks across the cohort, then download the full gradebook or a single-assessment marks workbook as <code>.xlsm</code>.</p>
          </div>
          <button class="btn-prev" style="display:inline-flex;" onclick="_loadAnalytics()">Back to Cohort Overview</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Students</div>
            <div style="font-size:26px;font-weight:900;color:var(--navy);margin-top:6px;">${_gradebookRows.length}</div>
          </div>
          <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">Assessments</div>
            <div style="font-size:26px;font-weight:900;color:var(--navy);margin-top:6px;">${assessments.length}</div>
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;">
            <div style="font-size:11px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;">Marks Captured</div>
            <div style="font-size:26px;font-weight:900;color:#1d4ed8;margin-top:6px;">${completedMarks}</div>
          </div>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:16px;">
            <div style="font-size:11px;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Finalised Marks</div>
            <div style="font-size:26px;font-weight:900;color:#047857;margin-top:6px;">${finalisedMarks}</div>
          </div>
        </div>

        <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
            <div>
              <h2 style="margin:0;color:var(--navy);font-size:18px;">Exports</h2>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">Full gradebook plus separate assessment marks workbooks.</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <button class="btn-next" style="display:inline-flex;" onclick="_downloadGradebookXlsm()">⬇ Download Gradebook XLSM</button>
              <select onchange="_setGradebookAssessment(this.value)" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;color:var(--navy);min-width:220px;">
                ${assessments.map((assessment) => `<option value="${_esc(assessment.id)}" ${assessment.id === _gradebookSelectedAssessmentId ? 'selected' : ''}>${_esc(assessment.badge)} · ${_esc(assessment.title)}</option>`).join('')}
              </select>
              <button class="btn-prev" style="display:inline-flex;" onclick="_downloadSelectedAssessmentXlsm()">⬇ Download Assessment XLSM</button>
            </div>
          </div>
        </div>

        <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
            <div>
              <h2 style="margin:0;color:var(--navy);font-size:18px;">Cohort Gradebook</h2>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">Rows are students. Columns are assessments. Marks prefer moderation, then tutor review, then released feedback, then AI draft.</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              ${_gradebookEditMode
                ? `<button class="btn-next" style="display:inline-flex;background:#059669;border-color:#059669;" onclick="_gradebookSaveMarkChanges()">Save Mark Changes</button>
                   <button class="btn-prev" style="display:inline-flex;" onclick="_gradebookToggleEditMode()">Cancel</button>`
                : `<button class="btn-prev" style="display:inline-flex;" onclick="_gradebookToggleEditMode()">Edit Marks</button>`
              }
            </div>
          </div>
          <div style="overflow:auto;border:1px solid var(--border);border-radius:12px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f8fafc;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">
                  <th style="padding:12px 14px;text-align:left;min-width:220px;">Student</th>
                  <th style="padding:12px 14px;text-align:left;min-width:120px;">Student Number</th>
                  ${assessments.map((assessment) => `<th style="padding:12px 14px;text-align:left;min-width:200px;">${_esc(assessment.badge)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${_gradebookRows.map((row) => `
                  <tr>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);">
                      <div style="font-weight:800;color:var(--navy);">${_esc(row.name)}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(row.email || 'No email')} ${row.tutorialGroup ? `· Group ${_esc(row.tutorialGroup)}` : ''}</div>
                    </td>
                    <td style="padding:12px 14px;border-top:1px solid var(--border);color:var(--navy);font-weight:700;">${_esc(row.studentNumber || '—')}</td>
                    ${assessments.map((assessment) => {
                      const cell = row.assessments[assessment.id];
                      const mark = cell?.resolved?.mark;
                      const status = cell?.statusLabel || 'Not submitted';
                      const source = cell?.resolved?.source || '';
                      const bg = mark == null ? '#f8fafc' : (Number(mark) < 50 ? '#fef2f2' : '#ecfdf5');
                      const color = mark == null ? 'var(--muted)' : (Number(mark) < 50 ? '#991b1b' : '#166534');
                      const editKey = `${_esc(row.uid)}__${_esc(assessment.id)}`;
                      const hasSubmission = Boolean(cell?.latestSubmissionId);
                      const fileUrl = cell?.submissionFileUrl || '';
                      return `<td style="padding:10px 14px;border-top:1px solid var(--border);background:${bg};">
                        ${_gradebookEditMode && hasSubmission
                          ? `<input type="number" min="0" max="100"
                               data-edit-key="${editKey}"
                               data-uid="${_esc(row.uid)}"
                               data-assessment="${_esc(assessment.id)}"
                               value="${mark != null ? mark : ''}"
                               placeholder="—"
                               oninput="window._gradebookRecordEdit(this)"
                               style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-weight:900;color:${color};background:white;" /><span style="font-size:11px;color:var(--muted);margin-left:3px;">%</span>`
                          : `<div style="font-weight:900;color:${color};">${mark != null ? `${_esc(String(mark))}%` : '—'}</div>`
                        }
                        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(status)}${source ? ` · ${_esc(source)}` : ''}</div>
                        ${hasSubmission ? `<div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap;">
                          <button type="button" style="font-size:10px;padding:3px 7px;border:1px solid var(--border);border-radius:5px;background:white;color:var(--navy);cursor:pointer;white-space:nowrap;"
                            onclick="window._gradebookOpenMarkingPlatform(${_esc(JSON.stringify(assessment.id))},${_esc(JSON.stringify(row.uid))},${_esc(JSON.stringify(cell?.latestSubmissionId || ''))})">Marking Platform</button>
                          ${fileUrl ? `<button type="button" style="font-size:10px;padding:3px 7px;border:1px solid var(--border);border-radius:5px;background:white;color:var(--navy);cursor:pointer;white-space:nowrap;"
                            onclick="window.open(${_esc(JSON.stringify(fileUrl))},&apos;_blank&apos;)">Open Document</button>` : ''}
                        </div>` : ''}
                      </td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${selectedAssessment ? (() => {
          const gbSubmittedRows = _gradebookRows.filter((row) => Boolean(row.assessments[selectedAssessment.id]?.latestSubmissionId));
          const gbAllSelected = gbSubmittedRows.length > 0 && gbSubmittedRows.every((row) => _gbBulkSelected.has(row.uid + '__' + selectedAssessment.id));
          return `
          <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
              <div>
                <h2 style="margin:0;color:var(--navy);font-size:18px;">${_esc(selectedAssessment.badge)} Marks</h2>
                <div style="font-size:12px;color:var(--muted);margin-top:6px;">${_esc(selectedAssessment.title)}</div>
              </div>
            </div>

            ${_gbBulkSelected.size > 0 ? `
            <div style="margin-bottom:12px;padding:12px 16px;border:2px solid var(--navy);border-radius:12px;background:#f8fafc;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="font-size:13px;font-weight:800;color:var(--navy);">${_gbBulkSelected.size} student${_gbBulkSelected.size === 1 ? '' : 's'} selected</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 12px;background:#059669;border-color:#059669;${_gbBulkRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
                    ${_gbBulkRunning ? 'disabled' : 'onclick="window._gbBulkFinalise()"'}>Finalise Selected</button>
                  <button type="button" class="btn-next" style="display:inline-flex;font-size:12px;padding:6px 12px;${_gbBulkRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
                    ${_gbBulkRunning ? 'disabled' : 'onclick="window._gbBulkRelease()"'}>Release Selected</button>
                  <button type="button" class="btn-prev" style="display:inline-flex;font-size:12px;padding:6px 12px;border-color:#fca5a5;color:#991b1b;${_gbBulkRunning ? 'opacity:.55;cursor:not-allowed;' : ''}"
                    ${_gbBulkRunning ? 'disabled' : 'onclick="window._gbBulkReturnToTutor()"'}>Return to Tutor</button>
                  <button type="button" class="btn-prev" style="display:inline-flex;font-size:12px;padding:6px 12px;" onclick="window._gbBulkClearSelection()">Clear</button>
                </div>
              </div>
              <div id="gb-bulk-status" style="font-size:12px;color:var(--muted);margin-top:8px;min-height:16px;"></div>
            </div>` : ''}

            <div style="overflow:auto;border:1px solid var(--border);border-radius:12px;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:#f8fafc;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">
                    <th style="padding:12px 14px;text-align:left;width:36px;">
                      <input type="checkbox" title="Select all with submissions" ${gbAllSelected ? 'checked' : ''}
                        onchange="window._gbBulkSelectAll(this.checked, ${_esc(JSON.stringify(selectedAssessment.id))})" />
                    </th>
                    <th style="padding:12px 14px;text-align:left;">Student</th>
                    <th style="padding:12px 14px;text-align:left;">Student Number</th>
                    <th style="padding:12px 14px;text-align:left;">Mark</th>
                    <th style="padding:12px 14px;text-align:left;">Source</th>
                    <th style="padding:12px 14px;text-align:left;">Status</th>
                    <th style="padding:12px 14px;text-align:left;">Released</th>
                    <th style="padding:12px 14px;text-align:left;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${_gradebookRows.map((row) => {
                    const cell = row.assessments[selectedAssessment.id];
                    const mark = cell?.resolved?.mark;
                    const markColor = mark != null && Number(mark) < 50 ? '#991b1b' : '#166534';
                    const hasSubmission = Boolean(cell?.latestSubmissionId);
                    const fileUrl = cell?.submissionFileUrl || '';
                    const selKey = row.uid + '__' + selectedAssessment.id;
                    const isSelected = _gbBulkSelected.has(selKey);
                    return `<tr style="background:${isSelected ? '#eff6ff' : 'inherit'};">
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">
                        ${hasSubmission ? `<input type="checkbox" ${isSelected ? 'checked' : ''}
                          onchange="window._gbBulkToggle(${_esc(JSON.stringify(row.uid))},${_esc(JSON.stringify(selectedAssessment.id))},${_esc(JSON.stringify(cell?.latestSubmissionId || ''))},this.checked)" />` : ''}
                      </td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">
                        <div style="font-weight:800;color:var(--navy);">${_esc(row.name)}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(row.email || 'No email')}</div>
                      </td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">${_esc(row.studentNumber || '—')}</td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);font-weight:900;color:${markColor};">${mark != null ? `${_esc(String(mark))}%` : '—'}</td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">${_esc(cell?.resolved?.source || '—')}</td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">${_esc(cell?.statusLabel || 'Not submitted')}</td>
                      <td style="padding:12px 14px;border-top:1px solid var(--border);">${cell?.releasedToStudent ? 'Yes' : 'No'}</td>
                      <td style="padding:10px 14px;border-top:1px solid var(--border);">
                        ${hasSubmission ? `<div style="display:flex;gap:5px;flex-wrap:wrap;">
                          <button type="button" class="btn-prev" style="font-size:10px;padding:3px 9px;display:inline-flex;"
                            onclick="window._gradebookOpenMarkingPlatform(${_esc(JSON.stringify(selectedAssessment.id))},${_esc(JSON.stringify(row.uid))},${_esc(JSON.stringify(cell?.latestSubmissionId || ''))})">Marking Platform</button>
                          ${fileUrl ? `<button type="button" class="btn-prev" style="font-size:10px;padding:3px 9px;display:inline-flex;"
                            onclick="window.open(${_esc(JSON.stringify(fileUrl))},&apos;_blank&apos;)">Open Document</button>` : ''}
                        </div>` : '<span style="color:var(--muted);font-size:11px;">No submission</span>'}
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
        })() : ''}
      </div>
    `;
  } catch (err) {
    console.error('Gradebook load failed:', err);
    mount.innerHTML = `<div style="padding:40px;text-align:center;color:#b91c1c;">Failed to load gradebook: ${_esc(err?.message || err || 'Unknown error')}</div>`;
  }
};

window._gradebookToggleEditMode = () => {
  _gradebookEditMode = !_gradebookEditMode;
  _gradebookMarkEdits = {};
  window._loadGradebookManager?.();
};

window._gradebookRecordEdit = (input) => {
  const key = input.dataset.editKey;
  const uid = input.dataset.uid;
  const assessmentId = input.dataset.assessment;
  const val = input.value.trim();
  if (!key || !uid || !assessmentId) return;
  if (val === '') {
    delete _gradebookMarkEdits[key];
  } else {
    const num = Number(val);
    if (Number.isFinite(num) && num >= 0 && num <= 100) {
      _gradebookMarkEdits[key] = { uid, assessmentId, mark: num };
    }
  }
};

window._gradebookSaveMarkChanges = async () => {
  const edits = Object.values(_gradebookMarkEdits);
  if (!edits.length) {
    _showLecturerToast('No mark changes to save.', 'warn', 2400);
    return;
  }
  if (!confirm(`Save ${edits.length} mark change${edits.length === 1 ? '' : 's'}? This will write a moderation-level mark override for each selected student.`)) return;

  _showLecturerProcessing?.('Saving mark changes…');
  let saved = 0;
  let failed = 0;
  const now = new Date().toISOString();
  const user = STATE?.user;
  const moderatorName = user?.displayName || user?.email || 'Lecturer';
  const moderatorUid = user?.uid || '';

  for (const edit of edits) {
    const row = _gradebookRows.find((r) => r.uid === edit.uid);
    const cell = row?.assessments?.[edit.assessmentId];
    const submissionId = cell?.latestSubmissionId;
    if (!row || !submissionId) { failed++; continue; }
    try {
      await update(ref(db, `grading-records/${edit.assessmentId}/${edit.uid}/${submissionId}`), {
        'moderation/mark': edit.mark,
        'moderation/moderatorUid': moderatorUid,
        'moderation/moderatorName': moderatorName,
        'moderation/moderatedAt': now,
        'moderation/source': 'gradebook-edit',
        moderatedAt: now,
        moderatedByUid: moderatorUid,
        moderatedByName: moderatorName,
        updatedAt: now,
      });
      saved++;
    } catch (err) {
      console.error('Gradebook mark save failed for', edit.uid, err);
      failed++;
    }
  }

  _gradebookEditMode = false;
  _gradebookMarkEdits = {};
  await window._loadGradebookManager?.();
  if (failed) {
    _showLecturerToast(`${saved} mark${saved === 1 ? '' : 's'} saved; ${failed} failed.`, 'warn', 3500);
  } else {
    _showLecturerToast(`${saved} mark${saved === 1 ? '' : 's'} saved.`, 'success', 2800);
  }
};

window._gradebookOpenMarkingPlatform = (assessmentId, studentUid, submissionId) => {
  if (!assessmentId || !studentUid || !submissionId) {
    _showLecturerToast('Cannot open marking platform — submission data is missing.', 'warn', 2800);
    return;
  }
  const analyticsMount = document.getElementById('analytics-mount');
  _gradebookReturnContext = {
    assessmentId: _gradebookSelectedAssessmentId,
    scrollTop: analyticsMount ? analyticsMount.scrollTop : 0,
  };
  window._openSubmissionReviewer?.('moderation', true);
  window.setTimeout(() => {
    window._openMarkingWorkspace?.(assessmentId, studentUid, submissionId, 0, false);
  }, 400);
};

window._returnToGradebook = () => {
  const ctx = _gradebookReturnContext;
  _gradebookReturnContext = null;
  if (ctx?.assessmentId) _gradebookSelectedAssessmentId = ctx.assessmentId;
  window._loadGradebookManager?.();
  if (ctx?.scrollTop) {
    window.setTimeout(() => {
      const analyticsMount = document.getElementById('analytics-mount');
      if (analyticsMount) analyticsMount.scrollTop = ctx.scrollTop;
    }, 300);
  }
};

window._gbBulkToggle = (uid, assessmentId, submissionId, checked) => {
  const key = `${uid}__${assessmentId}`;
  if (checked) _gbBulkSelected.set(key, { uid, assessmentId, submissionId });
  else _gbBulkSelected.delete(key);
  window._loadGradebookManager?.();
};

window._gbBulkSelectAll = (checked, assessmentId) => {
  _gradebookRows.forEach((row) => {
    const cell = row.assessments[assessmentId];
    if (!cell?.latestSubmissionId) return;
    const key = `${row.uid}__${assessmentId}`;
    if (checked) _gbBulkSelected.set(key, { uid: row.uid, assessmentId, submissionId: cell.latestSubmissionId });
    else _gbBulkSelected.delete(key);
  });
  window._loadGradebookManager?.();
};

window._gbBulkClearSelection = () => {
  _gbBulkSelected.clear();
  window._loadGradebookManager?.();
};

function _gbSetStatus(text, color = 'var(--muted)') {
  const el = document.getElementById('gb-bulk-status');
  if (el) { el.textContent = text; el.style.color = color; }
}

window._gbBulkFinalise = async () => {
  const targets = Array.from(_gbBulkSelected.values());
  if (!targets.length) return;
  if (!confirm(`Finalise ${targets.length} submission${targets.length === 1 ? '' : 's'}? This approves the current tutor mark and sets each script ready to release.`)) return;
  _gbBulkRunning = true;
  await window._loadGradebookManager?.();
  let done = 0; let failed = 0;
  for (const { uid, assessmentId, submissionId } of targets) {
    _gbSetStatus(`Finalising ${done + failed + 1}/${targets.length}…`);
    const recordSnap = await get(ref(db, `grading-records/${assessmentId}/${uid}/${submissionId}`)).catch(() => null);
    const record = recordSnap?.val() || {};
    const review = record.moderation || record.tutorReview || record.aiDraft || {};
    const result = await saveModerationDecision(assessmentId, uid, submissionId, { action: 'release', finalReview: review, moderation: review });
    if (result?.ok) done++; else failed++;
  }
  _gbBulkRunning = false;
  _gbBulkSelected.clear();
  await window._loadGradebookManager?.();
  _gbSetStatus(failed ? `Finalised ${done}, ${failed} failed.` : `${done} script${done === 1 ? '' : 's'} finalised.`, failed ? '#92400e' : '#166534');
};

window._gbBulkRelease = async () => {
  const targets = Array.from(_gbBulkSelected.values());
  if (!targets.length) return;
  if (!confirm(`Release ${targets.length} script${targets.length === 1 ? '' : 's'} to students? Only finalised scripts will post successfully.`)) return;
  _gbBulkRunning = true;
  await window._loadGradebookManager?.();
  let done = 0; let failed = 0;
  for (const { uid, assessmentId, submissionId } of targets) {
    _gbSetStatus(`Releasing ${done + failed + 1}/${targets.length}…`);
    const result = await postFinalisedSubmissionFeedback(assessmentId, uid, submissionId);
    if (result?.ok) done++; else failed++;
  }
  _gbBulkRunning = false;
  _gbBulkSelected.clear();
  await window._loadGradebookManager?.();
  _gbSetStatus(failed ? `Released ${done}, ${failed} failed.` : `${done} script${done === 1 ? '' : 's'} released to students.`, failed ? '#92400e' : '#166534');
};

const _GB_RETURN_PRESETS = [
  { id: 'mark_too_high',        label: 'Mark too high',         detail: 'The awarded mark is higher than the evidence in the submission supports. Please review the criteria and adjust accordingly.' },
  { id: 'mark_too_low',         label: 'Mark too low',          detail: 'The awarded mark appears lower than warranted. Please re-read the submission against the rubric and reconsider.' },
  { id: 'weak_justification',   label: 'Weak justification',    detail: 'The marking rationale does not adequately explain how the mark was derived. Please expand your criterion comments.' },
  { id: 'criterion_misapplied', label: 'Criterion misapplied',  detail: 'One or more criteria have been applied incorrectly. Please re-read the rubric descriptors and re-mark the affected criteria.' },
  { id: 'integrity_concern',    label: 'Integrity concern',     detail: 'There are indicators of possible academic integrity issues that require further investigation before this submission can be finalised.' },
  { id: 'incomplete_marking',   label: 'Incomplete marking',    detail: 'Not all criteria have been marked. Please complete all rubric rows before resubmitting for moderation.' },
];

function _gbReturnModalHTML(count) {
  const chips = _GB_RETURN_PRESETS.map((p) => `
    <button type="button" class="gb-return-chip"
      data-detail="${_esc(p.detail)}"
      onclick="window._gbReturnSelectChip(this)"
      style="text-align:left;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;background:white;font-size:12px;cursor:pointer;color:var(--navy);transition:border-color .15s,background .15s;"
    >${_esc(p.label)}</button>`).join('');
  return `
    <div style="background:white;border-radius:18px;padding:28px;width:100%;max-width:500px;box-shadow:0 20px 60px rgba(15,23,42,.22);">
      <div style="font-size:18px;font-weight:900;color:var(--navy);margin-bottom:4px;">Return ${count} Script${count === 1 ? '' : 's'} to Tutor</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px;">Select a reason — this will be recorded for all selected submissions.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">${chips}</div>
      <textarea id="gb-return-overlay-reason" rows="3"
        placeholder="Optional: add specific details or instructions for the tutor…"
        style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('gb-return-overlay')?.remove()">Cancel</button>
        <button class="btn-next" style="display:inline-flex;background:#991b1b;border-color:#991b1b;" onclick="window._gbBulkReturnToTutorConfirm()">Return Selected</button>
      </div>
    </div>`;
}

window._gbReturnSelectChip = (btn) => {
  const overlay = btn.closest('#gb-return-overlay');
  if (!overlay) return;
  overlay.querySelectorAll('.gb-return-chip').forEach((c) => {
    c.style.borderColor = 'var(--border)';
    c.style.background = 'white';
    c.style.color = 'var(--navy)';
    c.style.fontWeight = 'normal';
  });
  btn.style.borderColor = '#991b1b';
  btn.style.background = '#fff1f2';
  btn.style.color = '#991b1b';
  btn.style.fontWeight = '700';
  overlay.dataset.chipSelected = '1';
  const textarea = overlay.querySelector('textarea');
  if (textarea && !textarea.value.trim()) textarea.value = btn.dataset.detail || '';
};

window._gbBulkReturnToTutor = () => {
  const targets = Array.from(_gbBulkSelected.values());
  if (!targets.length) return;
  const existing = document.getElementById('gb-return-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'gb-return-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = _gbReturnModalHTML(targets.length);
  document.body.appendChild(overlay);
};

window._gbBulkReturnToTutorConfirm = async () => {
  const overlay = document.getElementById('gb-return-overlay');
  if (!overlay?.dataset.chipSelected) { alert('Please select a reason chip before returning.'); return; }
  const reason = String(overlay.querySelector('textarea')?.value || '').trim();
  if (!reason) { alert('Please select a reason before returning.'); return; }
  overlay.remove();
  const targets = Array.from(_gbBulkSelected.values());
  _gbBulkRunning = true;
  await window._loadGradebookManager?.();
  let done = 0; let failed = 0;
  for (const { uid, assessmentId, submissionId } of targets) {
    _gbSetStatus(`Returning ${done + failed + 1}/${targets.length}…`);
    const result = await returnSubmissionToTutor(assessmentId, uid, submissionId, { reason });
    if (result?.ok) done++; else failed++;
  }
  _gbBulkRunning = false;
  _gbBulkSelected.clear();
  await window._loadGradebookManager?.();
  _gbSetStatus(failed ? `Returned ${done}, ${failed} failed.` : `${done} script${done === 1 ? '' : 's'} returned to tutor.`, failed ? '#92400e' : '#166534');
};

window._archiveCollaborationScope = async (scopeId) => {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) return;

  const label = _LECTURER_COLLAB_SCOPE_CATALOG.find((row) => row.id === safeScopeId)?.label || safeScopeId;
  const ok = confirm(
    `Archive "${label}"?\n\nThis moves the current groups and artefacts into the collaboration archive and locks the active space against further student changes.`
  );
  if (!ok) return;

  try {
    const result = await archiveCollaborationScope(safeScopeId, {
      reason: `Archived from lecturer dashboard by ${STATE.user?.email || STATE.user?.uid || 'staff'}`,
    });
    if (!result?.archived) {
      _showLecturerToast('This collaboration space is already archived.', 'warn', 3200);
      return;
    }
    _showLecturerToast(`Archived ${label}. Groups preserved: ${Number(result.count || 0)}.`, 'success', 3600);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(`Could not archive collaboration space: ${err?.message || err || 'Unknown error'}`, 'warn', 4600);
  }
};

window._startFreshCollaborationCycle = async (scopeId) => {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) return;

  const label = _LECTURER_COLLAB_SCOPE_CATALOG.find((row) => row.id === safeScopeId)?.label || safeScopeId;
  const ok = confirm(
    `Open a fresh cycle for "${label}"?\n\nThis archives the current live groups and artefacts if needed, then reopens the collaboration space as an empty active cycle so new groups can register.`
  );
  if (!ok) return;

  try {
    const result = await startFreshCollaborationCycle(safeScopeId, {
      reason: `Fresh cycle opened from lecturer dashboard by ${STATE.user?.email || STATE.user?.uid || 'staff'}`,
    });
    const archivedNote = Number(result?.archivedCount || 0) > 0
      ? ` Archived groups preserved: ${Number(result.archivedCount || 0)}.`
      : '';
    _showLecturerToast(`Fresh collaboration cycle opened for ${label}.${archivedNote}`, 'success', 4200);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(`Could not open a fresh collaboration cycle: ${err?.message || err || 'Unknown error'}`, 'warn', 4600);
  }
};

window._toggleLecturerCollabScope = async (scopeId, expanded) => {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) return;
  window._lecturerExpandedCollabScopes = window._lecturerExpandedCollabScopes || {};
  window._lecturerExpandedCollabScopes[safeScopeId] = Boolean(expanded);
  await window._loadAnalytics?.();
};

window._addManagedCollaborationGroup = async (scopeId) => {
  const safeScopeId = String(scopeId || '').trim();
  if (!safeScopeId) return;

  const scopeRow = _LECTURER_COLLAB_SCOPE_CATALOG.find((row) => row.id === safeScopeId) || {};
  const label = scopeRow.label || safeScopeId;
  const name = String(prompt(`Add a new group to "${label}"\n\nEnter the group name:`) || '').trim();
  if (!name) return;

  try {
    const created = await createManagedCollaborationGroup(safeScopeId, {
      scopeType: 'assessment',
      scopeLabel: label,
      sizeLimit: 5,
      name,
    });
    _showLecturerToast(`Added group "${created.groupName}". Students can join it online.`, 'success', 3600);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(`Could not add the group: ${err?.message || err || 'Unknown error'}`, 'warn', 4200);
  }
};

window._lecRenameGroup = async (scopeId, groupId) => {
  const newName = String(prompt('Enter the new group name:') || '').trim();
  if (!newName) return;
  try {
    const result = await renameCollaborationGroup(scopeId, groupId, newName);
    _showLecturerToast(`Group renamed to "${result.groupName}".`, 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not rename the group.', 'warn', 4000);
  }
};

window._lecTransferLeader = async (scopeId, groupId, uid, name) => {
  if (!confirm(`Make ${name} the leader of this group?`)) return;
  try {
    const result = await transferCollaborationGroupLeader(scopeId, groupId, uid);
    _showLecturerToast(`${result.newLeaderName} is now the group leader.`, 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not change the leader.', 'warn', 4000);
  }
};

window._lecRemoveMember = async (scopeId, groupId, uid, name) => {
  if (!confirm(`Remove ${name} from this group?`)) return;
  try {
    await removeCollaborationMember(scopeId, groupId, uid);
    _showLecturerToast(`Removed ${name} from the group.`, 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not remove the member.', 'warn', 4000);
  }
};

window._lecMoveMember = async (scopeId, fromGroupId, uid, selectId) => {
  const select = document.getElementById(selectId);
  const toGroupId = String(select?.value || '').trim();
  if (!toGroupId) { _showLecturerToast('Select a destination group first.', 'warn', 2500); return; }
  try {
    await moveCollaborationMember(scopeId, fromGroupId, toGroupId, uid);
    _showLecturerToast('Student moved to the new group.', 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not move the student.', 'warn', 4000);
  }
};

window._lecDeleteGroup = async (scopeId, groupId, groupName) => {
  if (!confirm(`Delete group "${groupName}"?\n\nAll members will be removed and the group chat will be closed. This cannot be undone.`)) return;
  try {
    await deleteCollaborationGroup(scopeId, groupId);
    _showLecturerToast(`Deleted group "${groupName}".`, 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not delete the group.', 'warn', 4000);
  }
};

function _lecStudentInAnyGroup(uid, groups) {
  for (const group of Object.values(groups || {})) {
    if (group?.members?.[uid]) return true;
  }
  return false;
}

window._lecAddStudentToGroup = async (scopeId, groupId, selectId) => {
  const select = document.getElementById(selectId);
  const uid = String(select?.value || '').trim();
  if (!uid) { _showLecturerToast('Select a student first.', 'warn', 2500); return; }

  const student = (Array.isArray(_cachedStudents) ? _cachedStudents : []).find((s) => s.uid === uid);
  if (!student) { _showLecturerToast('Student not found in roster.', 'warn', 3000); return; }

  try {
    await addMemberToCollaborationGroup(scopeId, groupId, {
      uid: student.uid,
      name: student.name,
      email: student.personalEmail || student.email,
    });
    _showLecturerToast(`Added ${student.name} to the group.`, 'success', 3000);
    await window._loadAnalytics?.();
  } catch (err) {
    _showLecturerToast(err?.message || 'Could not add the student.', 'warn', 4000);
  }
};

function _showLecturerProcessing(message = 'Processing request...') {
  const id = 'lecturer-processing-overlay';
  let overlay = document.getElementById(id);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:100020;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 14px 34px rgba(0,0,0,.18);min-width:240px;max-width:90vw;">
        <div id="lecturer-processing-icon" style="width:18px;height:18px;border:2px solid #cbd5e1;border-top-color:var(--accent);border-radius:50%;animation:lecSpin 0.8s linear infinite;"></div>
        <div id="lecturer-processing-text" style="font-size:13px;color:var(--navy);font-weight:700;">Processing request...</div>
      </div>
    `;
    document.body.appendChild(overlay);

    if (!document.getElementById('lecturer-processing-spin-style')) {
      const style = document.createElement('style');
      style.id = 'lecturer-processing-spin-style';
      style.textContent = '@keyframes lecSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }';
      document.head.appendChild(style);
    }
  }
  const icon = document.getElementById('lecturer-processing-icon');
  if (icon) {
    icon.style.cssText = 'width:18px;height:18px;border:2px solid #cbd5e1;border-top-color:var(--accent);border-radius:50%;animation:lecSpin 0.8s linear infinite;';
    icon.textContent = '';
  }
  const text = document.getElementById('lecturer-processing-text');
  if (text) text.textContent = String(message || 'Processing request...');
  overlay.dataset.finishing = '0';
  overlay.style.display = 'flex';
}

function _finishLecturerProcessing(type = 'success', message = 'Done', delayMs = 1100) {
  const overlay = document.getElementById('lecturer-processing-overlay');
  if (!overlay) return;
  overlay.dataset.finishing = '1';
  const icon = document.getElementById('lecturer-processing-icon');
  const text = document.getElementById('lecturer-processing-text');
  const isWarn = String(type || '').toLowerCase() === 'warn';

  if (icon) {
    icon.style.animation = 'none';
    icon.style.border = 'none';
    icon.style.width = '18px';
    icon.style.height = '18px';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.fontSize = '16px';
    icon.style.color = isWarn ? '#b45309' : '#047857';
    icon.textContent = isWarn ? '⚠' : '✓';
  }
  if (text) {
    text.textContent = String(message || (isWarn ? 'Completed with issues' : 'Done'));
    text.style.color = isWarn ? '#92400e' : '#065f46';
  }

  window.setTimeout(() => {
    overlay.dataset.finishing = '0';
    _hideLecturerProcessing();
  }, Math.max(450, Number(delayMs) || 1100));
}

function _hideLecturerProcessing() {
  const overlay = document.getElementById('lecturer-processing-overlay');
  if (overlay) overlay.style.display = 'none';
}

function _eligibleStudentsForPromote() {
  return _cachedStudents.filter((s) => _nextLockedForStudent(s));
}

function _refreshBulkPromoteSelectionUi() {
  const selectedStudents = _cachedStudents.filter((s) => _bulkPromoteSelectedUids.has(s.uid));
  const eligibleCount = selectedStudents.filter((s) => _nextLockedForStudent(s)).length;
  const countEl = document.getElementById('bulk-promote-selected-count');
  if (countEl) {
    countEl.textContent = `${selectedStudents.length} selected · ${eligibleCount} eligible`;
  }
  const btn = document.getElementById('bulk-promote-btn');
  if (btn) {
    btn.disabled = selectedStudents.length === 0 || eligibleCount === 0;
    btn.style.opacity = btn.disabled ? '0.5' : '1';
    btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
  }
}

window._toggleBulkPromoteSelection = (uid, checked, rowIndex = null, shiftHeld = false) => {
  const key = String(uid || '').trim();
  if (!key) return;

  const idx = Number.isInteger(rowIndex) ? rowIndex : Number.parseInt(rowIndex, 10);
  const canRangeSelect = Number.isInteger(idx) && Number.isInteger(_bulkPromoteLastClickedIndex) && Boolean(shiftHeld);

  if (canRangeSelect) {
    const start = Math.min(idx, _bulkPromoteLastClickedIndex);
    const end = Math.max(idx, _bulkPromoteLastClickedIndex);
    for (let i = start; i <= end; i += 1) {
      const cb = document.querySelector(`.bulk-promote-checkbox[data-row-index="${i}"]`);
      if (!cb || cb.disabled || cb.closest('tr')?.style.display === 'none') continue;
      const cbUid = String(cb.getAttribute('data-uid') || '').trim();
      if (!cbUid) continue;
      cb.checked = Boolean(checked);
      if (checked) _bulkPromoteSelectedUids.add(cbUid);
      else _bulkPromoteSelectedUids.delete(cbUid);
    }
  } else {
    if (checked) _bulkPromoteSelectedUids.add(key);
    else _bulkPromoteSelectedUids.delete(key);
  }

  if (Number.isInteger(idx)) {
    _bulkPromoteLastClickedIndex = idx;
  }
  _refreshBulkPromoteSelectionUi();
};

window._clearBulkPromoteSelection = () => {
  _bulkPromoteSelectedUids.clear();
  _bulkPromoteLastClickedIndex = null;
  document.querySelectorAll('.bulk-promote-checkbox').forEach((el) => {
    el.checked = false;
  });
  _refreshBulkPromoteSelectionUi();
};

function _bulkPromoteUnitFilter() {
  return String(document.getElementById('bulk-promote-unit-filter')?.value || 'all').trim();
}

function _studentMatchesUnitFilter(student, unitFilter) {
  if (!unitFilter || unitFilter === 'all') return true;
  const locked = _nextLockedForStudent(student);
  return locked && locked.unitId === unitFilter;
}

function _pendingPromotionRequestForStudentUnit(student, unitId) {
  const uid = String(student?.uid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  if (!uid || !targetUnitId) return null;

  return (_cachedAllPromotionRequests || []).find((row) => (
    String(row?.status || '').toLowerCase() === 'pending'
    && String(row?.uid || '').trim() === uid
    && String(row?.targetUnitId || '').trim() === targetUnitId
  )) || null;
}

window._selectAllBulkPromote = () => {
  const unitFilter = _bulkPromoteUnitFilter();
  _bulkPromoteSelectedUids.clear();
  _eligibleStudentsForPromote().forEach((s) => {
    if (_nextLockedForStudent(s) && _studentMatchesUnitFilter(s, unitFilter)) _bulkPromoteSelectedUids.add(s.uid);
  });
  _bulkPromoteLastClickedIndex = null;
  document.querySelectorAll('.bulk-promote-checkbox').forEach((el) => {
    const uid = String(el.getAttribute('data-uid') || '').trim();
    el.checked = Boolean(uid && _bulkPromoteSelectedUids.has(uid));
  });
  _refreshBulkPromoteSelectionUi();
};

window._openBulkPromoteAllEligible = () => {
  const unitFilter = _bulkPromoteUnitFilter();
  const eligibleStudents = _eligibleStudentsForPromote().filter((s) => _studentMatchesUnitFilter(s, unitFilter));
  if (!eligibleStudents.length) {
    _showLecturerToast('No students with a locked next unit match the current filter.', 'warn', 3000);
    return;
  }
  _bulkPromoteSelectedUids.clear();
  eligibleStudents.forEach((s) => _bulkPromoteSelectedUids.add(s.uid));
  _bulkPromoteLastClickedIndex = null;
  document.querySelectorAll('.bulk-promote-checkbox').forEach((el) => {
    const uid = String(el.getAttribute('data-uid') || '').trim();
    el.checked = Boolean(uid && _bulkPromoteSelectedUids.has(uid));
  });
  _refreshBulkPromoteSelectionUi();
  window._openBulkPromoteModal();
};

window._selectBulkPromoteByFilter = () => {
  const filter = String(document.getElementById('bulk-promote-filter')?.value || 'pending-requests').trim();
  const unitFilter = _bulkPromoteUnitFilter();

  if (filter === 'all-eligible') {
    window._selectAllBulkPromote();
    return;
  }

  if (filter === 'pending-requests') {
    _bulkPromoteSelectedUids.clear();
    _cachedStudents.forEach((student) => {
      const uid = String(student?.uid || '').trim();
      if (!uid) return;
      const locked = _nextLockedForStudent(student);
      if (!locked) return;
      if (!_pendingPromotionRequestForStudentUnit(student, locked.unitId)) return;
      if (!_studentMatchesUnitFilter(student, unitFilter)) return;
      _bulkPromoteSelectedUids.add(uid);
    });

    document.querySelectorAll('.bulk-promote-checkbox').forEach((el) => {
      const uid = String(el.getAttribute('data-uid') || '').trim();
      el.checked = Boolean(uid && _bulkPromoteSelectedUids.has(uid));
    });
    _refreshBulkPromoteSelectionUi();
  }
};

function _applyRosterTableFilters() {
  const q = String(_rosterSearchQuery || '').trim().toLowerCase();
  const mode = String(_rosterFilterMode || 'all').toLowerCase();
  const rows = document.querySelectorAll('#lecturer-roster-tbody tr[data-roster-row="1"]');
  let visibleCount = 0;

  rows.forEach((row) => {
    const blob = String(row.getAttribute('data-search') || '').toLowerCase();
    const eligible = row.getAttribute('data-eligible') === '1';
    const pending = row.getAttribute('data-pending') === '1';
    const risk = String(row.getAttribute('data-risk') || '').toLowerCase();

    let show = !q || blob.includes(q);
    if (show) {
      if (mode === 'eligible') show = eligible;
      else if (mode === 'pending') show = pending;
      else if (mode === 'high-risk') show = risk === 'high';
      else if (mode === 'needs-support') show = risk === 'high' || risk === 'medium';
    }

    row.style.display = show ? '' : 'none';
    if (show) visibleCount += 1;
  });

  const visibleEl = document.getElementById('roster-visible-count');
  if (visibleEl) visibleEl.textContent = `${visibleCount} shown`;
}

window._setRosterSearchQuery = () => {
  const input = document.getElementById('roster-search-input');
  _rosterSearchQuery = String(input?.value || '');
  _applyRosterTableFilters();
};

window._setRosterFilterMode = () => {
  const select = document.getElementById('roster-filter-mode');
  _rosterFilterMode = String(select?.value || 'all');
  _applyRosterTableFilters();
};

window._toggleShiftRangeGroup = (groupKey, index, checked, shiftHeld = false) => {
  const key = String(groupKey || '').trim();
  const idx = Number.isInteger(index) ? index : Number.parseInt(index, 10);
  if (!key || !Number.isInteger(idx)) return;

  const last = _shiftRangeLastIndexByGroup[key];
  const canRange = Number.isInteger(last) && Boolean(shiftHeld);

  if (canRange) {
    const start = Math.min(idx, last);
    const end = Math.max(idx, last);
    for (let i = start; i <= end; i += 1) {
      const cb = document.querySelector(`input[type="checkbox"][data-range-group="${key}"][data-range-index="${i}"]`);
      if (!cb || cb.disabled) continue;
      cb.checked = Boolean(checked);
    }
  }

  _shiftRangeLastIndexByGroup[key] = idx;
};

window._clearRosterFilters = () => {
  _rosterSearchQuery = '';
  _rosterFilterMode = 'all';
  const input = document.getElementById('roster-search-input');
  const select = document.getElementById('roster-filter-mode');
  if (input) input.value = '';
  if (select) select.value = 'all';
  _applyRosterTableFilters();
};

const SKILL_LABELS_LEC = {
  critical_reading: 'Critical Reading',
  evidence_use: 'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone: 'Academic Tone',
  source_evaluation: 'Source Evaluation',
  citation_practice: 'Citation & Integrity',
  research_skills: 'Research Skills',
  ai_literacy: 'AI Literacy',
};

function _collectAiDetections(progressObj = {}) {
  const events = [];

  Object.entries(progressObj).forEach(([unitId, data]) => {
    if (!data || typeof data !== 'object' || unitId === '__sessions') return;
    if (data.readingAiDetection) {
      events.push({ source: 'Reading', unitId, ...data.readingAiDetection });
    }
    if (data.visualAiDetection) {
      events.push({ source: 'Visual', unitId, ...data.visualAiDetection });
    }
    if (data.videoAiDetections && typeof data.videoAiDetections === 'object') {
      Object.values(data.videoAiDetections).forEach(det => {
        if (det) events.push({ source: 'Video', unitId, ...det });
      });
    }
  });

  const sessions = progressObj.__sessions || {};
  Object.entries(sessions).forEach(([sid, sData]) => {
    const pw = sData?.processWritingAiDetections || {};
    Object.values(pw).forEach(det => {
      if (det) events.push({ source: 'Process Writing', sessionId: sid, ...det });
    });
  });

  return events;
}

function _pctDelta(current, previous) {
  if (!previous && !current) return { text: '0%', color: 'var(--muted)' };
  if (!previous) return { text: '+100%', color: '#10b981' };
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct}%`,
    color: pct > 0 ? '#10b981' : (pct < 0 ? '#ef4444' : 'var(--muted)'),
  };
}

function _letterGrade(student) {
  const score = Math.round(
    (student.pct * 0.55)
    + ((5 - Math.min(5, student.frustrationIdx || 0)) * 8)
    + (Math.max(0, 5 - (student.needsRem?.length || 0)) * 3)
    + (Math.min(20, student.totalAnnotations || 0) * 0.5)
  );
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

function _supportConfig(mode = 'medium') {
  if (mode === 'low') {
    return {
      label: 'Low Support',
      horizon: 'Next 14 days',
      annotationTarget: 2,
      feedTarget: 1,
      microModules: 1,
    };
  }
  if (mode === 'high') {
    return {
      label: 'High Support',
      horizon: 'Next 10 days',
      annotationTarget: 5,
      feedTarget: 2,
      microModules: 2,
    };
  }
  return {
    label: 'Medium Support',
    horizon: 'Next 14 days',
    annotationTarget: 4,
    feedTarget: 1,
    microModules: 1,
  };
}

function _compileStudentProfile(student, supportMode = 'medium') {
  const support = _supportConfig(supportMode);
  const weakSkills = Object.entries(student.skillStatus || {})
    .filter(([, status]) => status === 'weak')
    .map(([id]) => SKILL_LABELS_LEC[id] || id);

  const strengths = Object.entries(student.skillStatus || {})
    .filter(([, status]) => status === 'strong')
    .map(([id]) => SKILL_LABELS_LEC[id] || id)
    .slice(0, 4);

  const prioritySkills = (weakSkills.length ? weakSkills : Object.entries(student.skillStatus || {})
    .filter(([, status]) => status === 'developing')
    .map(([id]) => SKILL_LABELS_LEC[id] || id)
    .slice(0, support.microModules + 1));

  const ilpActions = [
    prioritySkills[0] ? `Complete ${support.microModules} targeted micro-module${support.microModules > 1 ? 's' : ''} focused on ${prioritySkills.slice(0, support.microModules).join(', ')} and submit one artefact to Gallery.` : null,
    `Produce at least ${support.annotationTarget} annotated reading notes per week using claim-evidence reasoning.`,
    `Post ${support.feedTarget} reflective update${support.feedTarget > 1 ? 's' : ''} in Class Feed after contact sessions.`,
    student.avgDifficulty !== 'N/A' && Number(student.avgDifficulty) >= 4 ? 'Schedule tutor check-in to reduce reading difficulty load.' : null,
    (student.aiFlags || []).length ? 'Draft in stages and include source notes before final submissions.' : null,
  ].filter(Boolean);

  const reportCard = {
    grade: _letterGrade(student),
    progress: `${student.pct}%`,
    riskLevel: student.riskLevel,
    frustration: `${student.frustrationIdx.toFixed(1)}/5`,
    annotations: student.totalAnnotations || 0,
    aiFlags: (student.aiFlags || []).length,
    weakSkills: weakSkills.length,
  };

  return {
    summary: {
      name: student.name.split(' [')[0],
      strengths,
      prioritySkills,
      riskFactors: student.riskFactors || [],
      highPerformer: Boolean(student.highPerformer),
      escalations: (student.escalations || []).length,
    },
    ilp: {
      supportMode,
      supportLabel: support.label,
      horizon: support.horizon,
      actions: ilpActions,
      successMarkers: [
        'At least 2 new unit visits and 1 completed assessment-related activity.',
        `Reading annotation count increases by ${support.annotationTarget}+ over plan period.`,
        'Risk level stable or improved at next review.',
      ],
    },
    reportCard,
  };
}

function _profileExportText(student, compiled) {
  return [
    `Student Profile Report`,
    `Name: ${compiled.summary.name}`,
    `Email: ${student.email}`,
    `---`,
    `Report Card`,
    `Grade: ${compiled.reportCard.grade}`,
    `Progress: ${compiled.reportCard.progress}`,
    `Risk Level: ${compiled.reportCard.riskLevel}`,
    `Frustration: ${compiled.reportCard.frustration}`,
    `Annotations: ${compiled.reportCard.annotations}`,
    `AI Flags: ${compiled.reportCard.aiFlags}`,
    `Weak Skills: ${compiled.reportCard.weakSkills}`,
    `---`,
    `Strengths: ${compiled.summary.strengths.join(', ') || 'None identified yet'}`,
    `Priority Skills: ${compiled.summary.prioritySkills.join(', ') || 'General consolidation'}`,
    `Risk Factors: ${(compiled.summary.riskFactors || []).join(' | ') || 'No immediate risk factors'}`,
    `---`,
    `Individual Learning Plan (${compiled.ilp.horizon} · ${compiled.ilp.supportLabel})`,
    ...compiled.ilp.actions.map((a, i) => `${i + 1}. ${a}`),
    `Success Markers:`,
    ...compiled.ilp.successMarkers.map((m, i) => `- ${m}`),
  ].join('\n');
}

async function _loadAnalytics() {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  try {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading cohort data...</div>';

    const todayKey = (() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();
    const selectedAttendanceDateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(_attendanceAnalyticsSelectedDate || '').trim())
      ? String(_attendanceAnalyticsSelectedDate).trim()
      : todayKey;
    _attendanceAnalyticsSelectedDate = selectedAttendanceDateKey;
    const trendDateKeys = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
    const prevTrendDateKeys = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - idx));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
    const allTrendKeys = [...prevTrendDateKeys, ...trendDateKeys];
    const derivedMetricsPromise = rebuildDerivedMetricsForDate(todayKey);
    const trendDerivedMetricsPromise = Promise.all(
      allTrendKeys.map((key) => (key === todayKey ? derivedMetricsPromise : rebuildDerivedMetricsForDate(key)))
    );

    const [snap, liveSnap, trafficSnap, eventsSnap, supportModesSnap, gallerySnap, unlockOverridesSnap, rosterSnap, promotionRequestsSnap, rosterResetSignInsSnap, readingTaskSnap, derivedMetrics, trendDerivedMetrics] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'presence/live')),
      get(ref(db, `analytics/traffic/${todayKey}`)),
      get(ref(db, `analytics/events/${todayKey}`)),
      get(ref(db, 'analytics/student-support-modes')),
      get(ref(db, 'gallery/posts')),
      get(ref(db, 'analytics/unlock-overrides')),
      get(ref(db, 'rosters/classList')),
      get(ref(db, 'analytics/promotion-requests')),
      get(ref(db, `analytics/roster-reset-signins/${todayKey}`)),
      get(ref(db, 'analytics/reading-task-submissions')),
      derivedMetricsPromise,
      trendDerivedMetricsPromise,
    ]);
    const persistedModes = supportModesSnap.exists() ? supportModesSnap.val() : {};
    Object.keys(_studentSupportModeByUid).forEach((uid) => {
      delete _studentSupportModeByUid[uid];
    });
    Object.entries(persistedModes || {}).forEach(([uid, row]) => {
      const mode = String(row?.mode || '').toLowerCase();
      if (['low', 'medium', 'high'].includes(mode)) {
        _studentSupportModeByUid[uid] = mode;
      }
    });
    const galleryPostsRaw = gallerySnap.exists() ? Object.values(gallerySnap.val() || {}) : [];
    const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
    const readingTaskRoot = readingTaskSnap.exists() ? readingTaskSnap.val() : {};
    const readingTaskUnitMetaById = Object.fromEntries((UNITS || []).map((unit) => [unit.id, unit]));
    const readingTaskRows = [];
    const readingTaskByUid = new Map();
    const rosterNumberByEmail = {};
    rosterRows.forEach((row) => {
      const email = _normEmail(row?.email || '');
      const studentNumber = String(row?.studentNumber || row?.studentNo || row?.studentId || '').trim();
      if (email && studentNumber) {
        rosterNumberByEmail[email] = studentNumber;
      }
    });
    Object.entries(readingTaskRoot || {}).forEach(([unitId, byStudent]) => {
      const unitMeta = readingTaskUnitMetaById[unitId];
      Object.entries(byStudent || {}).forEach(([uid, byTask]) => {
        Object.entries(byTask || {}).forEach(([taskId, submission]) => {
          if (!submission || typeof submission !== 'object') return;
          const writing = String(submission.writing || submission.responseText || '').trim();
          const feedback = String(submission.feedback || submission.tutorFeedback || '').trim();
          const annotationsCount = Array.isArray(submission.annotations) ? submission.annotations.length : 0;
          const answersCount = submission.answers && typeof submission.answers === 'object' ? Object.keys(submission.answers).length : 0;
          const wordCount = Number(submission.writingWordCount || (writing ? writing.split(/\s+/).filter(Boolean).length : 0));
          const statusRaw = String(submission.status || '').trim().toLowerCase();
          const hasWork = Boolean(writing || feedback || annotationsCount || answersCount);
          const row = {
            unitId,
            unitBadge: unitMeta?.badge || String(unitId || '').toUpperCase(),
            unitTitle: unitMeta?.title || unitId,
            uid,
            taskId,
            status: statusRaw || (feedback ? 'reviewed' : (hasWork ? 'in_progress' : 'empty')),
            writing,
            wordCount,
            feedback,
            hasFeedback: Boolean(feedback),
            answersCount,
            annotationsCount,
            hasWork,
            updatedAt: String(submission.updatedAt || submission.savedAt || submission.submittedAt || '').trim(),
            aiScore: Number(
              submission?.aiDetection?.suspicionScore
              || submission?.aiDetection?.score
              || submission?.aiAnalysis?.suspicionScore
              || 0
            ),
            aiFlagged: Boolean(
              submission?.aiDetection?.isRiskFlag
              || submission?.aiDetection?.flagged
              || submission?.aiAnalysis?.isRiskFlag
              || submission?.aiAnalysis?.flagged
            ),
          };
          readingTaskRows.push(row);
          if (!readingTaskByUid.has(uid)) readingTaskByUid.set(uid, []);
          readingTaskByUid.get(uid).push(row);
        });
      });
    });
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
      if (createdAt.startsWith(todayKey)) stats.today += 1;
      tutorialSessionPostsByUid.set(authorUid, stats);
    });

    if (!snap.exists()) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No student data found in the database yet.</div>';
      return;
    }

    const users = snap.val();
    _cachedStudents = [];
    const rosterResetProfileRows = [];
    const TOTAL_UNITS = 20;

    for (const [uid, user] of Object.entries(users)) {
      if (!user.state) continue;
      if (_roleFromProfile(user) !== 'student') continue;
      if (user?.profile?.disabled) continue;

      const s = user.state;
      const profile = user.profile || {};
      const profileEmail = String(profile.email || '').trim();
      const profileEmailKey = _normEmail(profileEmail);
      const studentNumber = String(
        profile.studentNumber
        || profile.studentNo
        || profile.studentId
        || rosterNumberByEmail[profileEmailKey]
        || ''
      ).trim();
      const progressObj = s.progress || {};
      const adaptiveData = s.adaptive || {};
      const visitedCount = Object.values(progressObj).filter(p => p.visited).length;
      const completedCount = Object.values(progressObj).filter(p => p.readingComplete).length;

      const pct = Math.round((visitedCount / TOTAL_UNITS) * 100);
      const erMarks = s.erProgress?.extraMarks || 0;
      const resetSignInAt = String(profile.resetLinkSignInAlertShownAt || '').trim();
      if (resetSignInAt.startsWith(todayKey)) {
        rosterResetProfileRows.push({
          uid,
          name: profile.displayName || `Student_${uid.substring(0, 6)}`,
          email: String(profile.authEmail || profile.username || profile.email || '').trim(),
          studentNumber,
          signedInAt: resetSignInAt,
          source: 'profile-fallback',
        });
      }

      // Reading engagement metrics
      let totalAnnotations = 0;
      let totalDifficulty = 0;
      let surveyCount = 0;
      let activeStrats = 0;

      Object.values(progressObj).forEach(p => {
        if (p.annotations) totalAnnotations += p.annotations.length;
        if (p.readingSurvey) {
          totalDifficulty += p.readingSurvey.difficulty || 0;
          surveyCount++;
          if (p.readingSurvey.strategies) activeStrats += p.readingSurvey.strategies.length;
        }
      });

      const avgDifficulty = surveyCount > 0 ? (totalDifficulty / surveyCount).toFixed(1) : 'N/A';
      const attendanceToday = s.attendance?.byDate?.[todayKey] || null;
      const attendanceCheckins = attendanceToday?.qrCheckins || [];
      const tutorialCheckinsToday = attendanceCheckins.filter((c) => c?.sessionType === 'tutorial');
      const tutorialMinutesToday = Math.max(0, Math.round((attendanceToday?.tutorialSeconds || 0) / 60));
      const tutorialSessionContrib = tutorialSessionPostsByUid.get(uid) || { total: 0, today: 0 };

      // Adaptive skill data
      const skillStatus = adaptiveData.skill_status || {};
      const skillScores = adaptiveData.skill_scores || {};
      const needsRem = adaptiveData.needs_remediation || [];
      const frustrationIdx = adaptiveData.frustration_index || 0;
      const highPerformer = adaptiveData.high_performer || false;
      const studyTopics = adaptiveData.study_topics || [];
      const escalations = (s.escalations || []).filter(e => !e.resolved);
      const studentOutcomes = adaptiveData.outcomes || [];
      const aiDetections = _collectAiDetections(progressObj);
      const aiFlags = aiDetections.filter(d => d.isRiskFlag);
      const aiAvgScore = aiDetections.length
        ? Math.round(aiDetections.reduce((sum, d) => sum + (d.suspicionScore || 0), 0) / aiDetections.length)
        : 0;
      const aiTopReason = aiFlags[0]?.reasons?.[0] || null;
      const heutagogy = _heutagogySummary(progressObj);
      const workScore = _studentWorkScore(s || {});
      const readingTaskSubmissions = [...(readingTaskByUid.get(uid) || [])]
        .sort((a, b) => _lecturerSafeMs(b.updatedAt) - _lecturerSafeMs(a.updatedAt));
      const readingTaskSubmissionCount = readingTaskSubmissions.length;
      const readingTaskReviewedCount = readingTaskSubmissions.filter((row) => row.status === 'reviewed').length;
      const readingTaskPendingCount = readingTaskSubmissions.filter((row) => row.status !== 'reviewed' && row.hasWork).length;
      const readingTaskWordRows = readingTaskSubmissions.filter((row) => row.wordCount > 0);
      const readingTaskAvgWords = readingTaskWordRows.length
        ? Math.round(readingTaskWordRows.reduce((sum, row) => sum + row.wordCount, 0) / readingTaskWordRows.length)
        : 0;
      const readingTaskLowWordCount = readingTaskSubmissions.filter((row) => row.wordCount > 0 && row.wordCount < 80).length;
      const readingTaskFlagCount = readingTaskSubmissions.filter((row) => row.aiFlagged).length;
      const readingTaskLatestUpdatedAt = readingTaskSubmissions[0]?.updatedAt || '';

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

      // Per-skill averages for this student
      const skillAvgs = {};
      Object.entries(skillScores).forEach(([id, entries]) => {
        if (entries && entries.length >= 2) {
          const recent = entries.slice(-3).map(e => e.score);
          skillAvgs[id] = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length * 10) / 10;
        }
      });

      // ── Risk Assessment ──────────────────────
      let riskScore = 0;
      let riskFactors = [];

      // Course progress
      if (pct < 20) { riskScore += 2; riskFactors.push('Low course completion'); }
      // Self-reported difficulty
      if (avgDifficulty !== 'N/A' && parseFloat(avgDifficulty) >= 4.0) { riskScore += 2; riskFactors.push('Reporting high text difficulty'); }
      // Passive reading
      if (visitedCount > 3 && totalAnnotations === 0) { riskScore += 1; riskFactors.push('Passive reading — no annotations'); }
      if (surveyCount > 0 && activeStrats === 0) { riskScore += 1; riskFactors.push('Not using active reading strategies'); }
      // Adaptive signals
      if (frustrationIdx >= 3) { riskScore += 2; riskFactors.push(`High frustration index (${frustrationIdx.toFixed(1)}/5)`); }
      if (needsRem.length >= 2) { riskScore += 1; riskFactors.push(`${needsRem.length} skills flagged for remediation`); }
      // Tutorial attendance signals
      if (visitedCount >= 3 && tutorialCheckinsToday.length === 0) {
        riskScore += 1;
        riskFactors.push('No tutorial QR check-in recorded today');
      }
      if (tutorialCheckinsToday.length > 0 && tutorialMinutesToday < 10) {
        riskScore += 1;
        riskFactors.push(`Low tutorial engagement time today (${tutorialMinutesToday} min)`);
      }
      if (tutorialCheckinsToday.length > 0 && tutorialSessionContrib.today === 0) {
        riskScore += 1;
        riskFactors.push('No tutorial session contribution posted today');
      }
      if (visitedCount >= 3 && tutorialSessionContrib.total === 0) {
        riskScore += 1;
        riskFactors.push('No tutorial session contributions recorded yet');
      }
      if (tutorialSessionContrib.total >= 3) {
        riskScore = Math.max(0, riskScore - 1);
      }
      // Positive signal — reduce risk if high performer
      if (highPerformer) { riskScore = Math.max(0, riskScore - 1); }

      let riskLevel = 'Low';
      let riskColor = 'var(--green)';
      if (riskScore >= 4) { riskLevel = 'High'; riskColor = 'var(--red)'; }
      else if (riskScore >= 2) { riskLevel = 'Medium'; riskColor = 'var(--amber2)'; }

      _cachedStudents.push({
        uid,
        name: profile.displayName || `Student_${uid.substring(0, 6)}`,
        email: profile.personalEmail || profileEmail || 'N/A',
        personalEmail: profile.personalEmail || profileEmail || 'N/A',
        authEmail: profile.authEmail || profile.username || user?.email || '',
        username: profile.username || '',
        initials: profile.initials || '',
        surname: profile.surname || profile.lastName || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || profile.surname || '',
        studentNumber,
        studentId: studentNumber,
        tutorialGroup: String(profile.tutorialGroup || '').trim().toUpperCase(),
        pct, completedCount, erMarks, totalAnnotations, avgDifficulty,
        riskLevel, riskColor, riskFactors, progressObj,
        attendanceData: s.attendance || { byDate: {} },
        tutorialCheckinsToday: tutorialCheckinsToday.length,
        tutorialMinutesToday,
        tutorialSessionContribToday: tutorialSessionContrib.today,
        tutorialSessionContribTotal: tutorialSessionContrib.total,
        readingTaskSubmissions,
        readingTaskSubmissionCount,
        readingTaskReviewedCount,
        readingTaskPendingCount,
        readingTaskAvgWords,
        readingTaskLowWordCount,
        readingTaskFlagCount,
        readingTaskLatestUpdatedAt,
        workScore,
        aiDetections, aiFlags, aiAvgScore, aiTopReason,
        heutagogy, calibrationMatches,
        // adaptive
        skillStatus, skillScores, skillAvgs, needsRem,
        frustrationIdx, highPerformer, studyTopics,
        escalations, outcomes: studentOutcomes,
        state: s || {},
      });
    }

    if (_cachedStudents.length === 0) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No active student states found.</div>';
      return;
    }

    // Sort by risk (High -> Low), then by progress
    _cachedStudents.sort((a, b) => {
      const riskVal = { "High": 3, "Medium": 2, "Low": 1 };
      if (riskVal[b.riskLevel] !== riskVal[a.riskLevel]) return riskVal[b.riskLevel] - riskVal[a.riskLevel];
      return a.pct - b.pct;
    });

    const validUids = new Set(_cachedStudents.map((s) => s.uid));
    Array.from(_bulkPromoteSelectedUids).forEach((uid) => {
      if (!validUids.has(uid)) _bulkPromoteSelectedUids.delete(uid);
    });
    const activeReadingTaskRows = readingTaskRows
      .filter((row) => validUids.has(row.uid))
      .sort((a, b) => _lecturerSafeMs(b.updatedAt) - _lecturerSafeMs(a.updatedAt));
    const readingTaskStudentsCount = new Set(activeReadingTaskRows.map((row) => row.uid)).size;
    const readingTaskSubmissionCount = activeReadingTaskRows.length;
    const readingTaskReviewedCount = activeReadingTaskRows.filter((row) => row.status === 'reviewed').length;
    const readingTaskPendingCount = activeReadingTaskRows.filter((row) => row.status !== 'reviewed' && row.hasWork).length;
    const readingTaskWordRows = activeReadingTaskRows.filter((row) => row.wordCount > 0);
    const readingTaskAvgWords = readingTaskWordRows.length
      ? Math.round(readingTaskWordRows.reduce((sum, row) => sum + row.wordCount, 0) / readingTaskWordRows.length)
      : 0;
    const readingTaskAiFlagCount = activeReadingTaskRows.filter((row) => row.aiFlagged).length;
    const studentByUid = Object.fromEntries(_cachedStudents.map((student) => [student.uid, student]));
    const readingTaskUnitSummaries = Object.values(activeReadingTaskRows.reduce((acc, row) => {
      const key = row.unitId;
      if (!acc[key]) {
        acc[key] = {
          unitId: row.unitId,
          unitBadge: row.unitBadge,
          unitTitle: row.unitTitle,
          submissions: 0,
          reviewed: 0,
          pending: 0,
          aiFlags: 0,
          wordTotal: 0,
          wordRows: 0,
          writers: new Set(),
          latestAt: '',
        };
      }
      const bucket = acc[key];
      bucket.submissions += 1;
      bucket.writers.add(row.uid);
      if (row.status === 'reviewed') bucket.reviewed += 1;
      if (row.status !== 'reviewed' && row.hasWork) bucket.pending += 1;
      if (row.aiFlagged) bucket.aiFlags += 1;
      if (row.wordCount > 0) {
        bucket.wordTotal += row.wordCount;
        bucket.wordRows += 1;
      }
      if (_lecturerSafeMs(row.updatedAt) > _lecturerSafeMs(bucket.latestAt)) bucket.latestAt = row.updatedAt;
      return acc;
    }, {})).map((bucket) => ({
      ...bucket,
      writerCount: bucket.writers.size,
      avgWords: bucket.wordRows ? Math.round(bucket.wordTotal / bucket.wordRows) : 0,
    })).sort((a, b) => b.submissions - a.submissions || b.writerCount - a.writerCount);
    const readingTaskNeedsFollowUpRows = activeReadingTaskRows
      .filter((row) => (row.status !== 'reviewed' && row.hasWork) || (row.wordCount > 0 && row.wordCount < 80) || row.aiFlagged)
      .map((row) => {
        const student = studentByUid[row.uid];
        const reasons = [];
        if (row.status !== 'reviewed' && row.hasWork) reasons.push('Needs review');
        if (row.wordCount > 0 && row.wordCount < 80) reasons.push('Low word count');
        if (row.aiFlagged) reasons.push(`AI score ${row.aiScore || 0}`);
        return {
          ...row,
          studentName: student?.name?.split(' [')[0] || `Student_${row.uid.slice(0, 6)}`,
          studentNumber: student?.studentNumber || '',
          reasons,
        };
      })
      .slice(0, 8);
    const readingTaskTopWriters = _cachedStudents
      .filter((student) => student.readingTaskSubmissionCount > 0)
      .sort((a, b) =>
        b.readingTaskSubmissionCount - a.readingTaskSubmissionCount
        || b.readingTaskReviewedCount - a.readingTaskReviewedCount
        || b.readingTaskAvgWords - a.readingTaskAvgWords
      )
      .slice(0, 6);

    const avgProg = Math.round(_cachedStudents.reduce((acc, s) => acc + s.pct, 0) / _cachedStudents.length);
    const atRiskCount = _cachedStudents.filter(s => s.riskLevel === 'High').length;
    const frustCount = _cachedStudents.filter(s => s.frustrationIdx >= 3).length;
    const aiFlaggedStudents = _cachedStudents.filter(s => (s.aiFlags || []).length > 0).length;
    const aiFlagEvents = _cachedStudents.reduce((sum, s) => sum + ((s.aiFlags || []).length), 0);

    const derivedDaily = derivedMetrics?.daily || {};
    const derivedHourly = derivedMetrics?.hourly || {};

    const attendanceRows = _cachedStudents.map((s) => {
      const dayRec = s.attendanceData?.byDate?.[selectedAttendanceDateKey] || null;
      const qrCheckins = dayRec?.qrCheckins || [];
      const hasQrCheckin = Array.isArray(qrCheckins) && qrCheckins.length > 0;
      const latestQr = hasQrCheckin ? qrCheckins[qrCheckins.length - 1] : null;
      return {
        name: s.name,
        studentNumber: s.studentNumber || '',
        email: s.email || '',
        present: Boolean(dayRec?.present),
        hasQrCheckin,
        latestAt: latestQr?.at || null,
        latestType: latestQr?.sessionType || null,
        qrCount: qrCheckins.length,
        totalMinutes: Math.max(0, Math.round((dayRec?.totalSeconds || 0) / 60)),
        classMinutes: Math.max(0, Math.round((dayRec?.classSeconds || 0) / 60)),
        tutorialMinutes: Math.max(0, Math.round((dayRec?.tutorialSeconds || 0) / 60)),
      };
    });

    const checkedInRows = attendanceRows.filter(r => r.hasQrCheckin);
    const missingRows = attendanceRows.filter(r => !r.hasQrCheckin);
    const attendanceUsesDerived = selectedAttendanceDateKey === todayKey && String(derivedDaily?.coverage?.attendanceToday || '') === 'official';
    const attendanceCheckedInCount = attendanceUsesDerived
      ? Number(derivedDaily?.attendanceToday || 0)
      : checkedInRows.length;
    const attendanceSourceLabel = attendanceUsesDerived
      ? 'analytics/raw-events derived'
      : (selectedAttendanceDateKey === todayKey ? 'state attendance fallback' : 'state attendance history');
    const attendanceRegisterRows = [...attendanceRows].sort((a, b) => {
      if (Number(b.hasQrCheckin) !== Number(a.hasQrCheckin)) return Number(b.hasQrCheckin) - Number(a.hasQrCheckin);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    _cachedAttendanceRegisterRows = attendanceRegisterRows;
    _cachedAttendanceRegisterDateKey = selectedAttendanceDateKey;
    _cachedAttendanceRegisterSourceLabel = attendanceSourceLabel;

    const nowMs = Date.now();
    const studentNameByUid = Object.fromEntries(_cachedStudents.map(s => [s.uid, s.name]));
    const studentNumberByUid = Object.fromEntries(_cachedStudents.map(s => [s.uid, s.studentNumber || '']));
    const liveRaw = liveSnap.exists() ? liveSnap.val() : {};
    const liveRows = Object.entries(liveRaw)
      .map(([uid, v]) => {
        const lastSeenMs = new Date(v?.lastSeen || 0).getTime();
        const fresh = !Number.isNaN(lastSeenMs) && (nowMs - lastSeenMs) <= 120000;
        return {
          uid,
          name: studentNameByUid[uid] || v?.name || `Student_${uid.slice(0, 6)}`,
          online: Boolean(v?.online) && fresh,
          activity: v?.activity || 'dashboard',
          sessionMode: v?.sessionMode || 'class',
          qrVerifiedToday: Boolean(v?.qrVerifiedToday),
          lastSeenMs,
        };
      })
      .filter(r => Boolean(studentNameByUid[r.uid]))
      .sort((a, b) => b.lastSeenMs - a.lastSeenMs);

    const liveOnline = liveRows.filter(r => r.online);
    const liveInClass = liveOnline.filter(r => r.qrVerifiedToday);
    const liveOutClass = liveOnline.filter(r => !r.qrVerifiedToday);

    const eventRoot = eventsSnap.exists() ? eventsSnap.val() : {};
    const eventRows = Object.values(eventRoot).flatMap((userEvents) => Object.values(userEvents || {}));
    const studentEventRows = eventRows.filter((e) => {
      const role = String(e?.role || '').toLowerCase();
      return !role || role === 'student';
    });
    const trafficToday = trafficSnap.exists() ? trafficSnap.val() : {};
    const trafficHasStoredPings = Object.values(trafficToday || {}).some((row) => Number(row?.pings || 0) > 0);
    const eventTrafficByHour = {};
    studentEventRows.forEach((eventRow) => {
      const tsMs = _eventTimestampMs(eventRow);
      if (!_isReasonableTrafficTimestamp(tsMs, nowMs)) return;
      const ts = new Date(tsMs);
      const hourKey = String(ts.getHours()).padStart(2, '0');
      const bucket = eventTrafficByHour[hourKey] || { pings: 0, activities: {} };
      bucket.pings += 1;
      const activityKey = String(eventRow?.eventType || 'unknown').trim() || 'unknown';
      bucket.activities[activityKey] = (bucket.activities[activityKey] || 0) + 1;
      eventTrafficByHour[hourKey] = bucket;
    });
    const rosterResetRowsFromAnalytics = rosterResetSignInsSnap.exists()
      ? Object.values(rosterResetSignInsSnap.val() || {})
      : [];
    const rosterResetRowsFromDerived = Array.isArray(derivedDaily?.resetLinkSignInRows)
      ? derivedDaily.resetLinkSignInRows
      : [];
    const mergedRosterResetByUid = new Map();
    [...rosterResetRowsFromAnalytics, ...rosterResetRowsFromDerived, ...rosterResetProfileRows].forEach((row) => {
      const uid = String(row?.uid || '').trim();
      if (!uid) return;
      const prev = mergedRosterResetByUid.get(uid);
      const prevAt = String(prev?.signedInAt || '');
      const nextAt = String(row?.signedInAt || '');
      if (!prev || nextAt > prevAt) mergedRosterResetByUid.set(uid, row);
    });
    const rosterResetRows = Array.from(mergedRosterResetByUid.values())
      .sort((a, b) => String(b?.signedInAt || '').localeCompare(String(a?.signedInAt || '')));

    const eventTrafficHasPings = Object.values(eventTrafficByHour).some((row) => Number(row?.pings || 0) > 0);
    const derivedTrafficHasPings = Object.values(derivedHourly || {}).some((row) => Number(row?.pings || 0) > 0);
    const trafficUsesDerived = String(derivedDaily?.coverage?.hourlyTraffic || '') === 'official';
    const selectedTrafficSource = trafficUsesDerived
      ? derivedHourly
      : (trafficHasStoredPings
        ? trafficToday
        : (eventTrafficHasPings ? eventTrafficByHour : (derivedTrafficHasPings ? derivedHourly : eventTrafficByHour)));
    let hourRows = Array.from({ length: 24 }, (_, h) => {
      const key = String(h).padStart(2, '0');
      const row = selectedTrafficSource[key] || {};
      return { hour: key, pings: Number(row.pings || 0), activities: row.activities || {} };
    });
    const hasAnyTrafficRows = hourRows.some((row) => row.pings > 0);
    let trafficSourceLabel = trafficUsesDerived
      ? 'analytics/raw-events derived'
      : (trafficHasStoredPings
        ? 'analytics/traffic'
        : (eventTrafficHasPings ? 'analytics/events fallback' : (derivedTrafficHasPings ? 'analytics/raw-events derived' : 'analytics/events fallback')));
    if (!hasAnyTrafficRows && !trafficUsesDerived) {
      const supplementalTrafficByHour = {};
      const addFallbackTrafficSample = (at, activityKey) => {
        const tsMs = _eventTimestampMs({ at });
        if (!_isReasonableTrafficTimestamp(tsMs, nowMs)) return;
        const ts = new Date(tsMs);
        const hourKey = String(ts.getHours()).padStart(2, '0');
        const bucket = supplementalTrafficByHour[hourKey] || { pings: 0, activities: {} };
        bucket.pings += 1;
        bucket.activities[activityKey] = (bucket.activities[activityKey] || 0) + 1;
        supplementalTrafficByHour[hourKey] = bucket;
      };
      galleryPostsRaw.forEach((post) => addFallbackTrafficSample(post?.createdAt, 'gallery_post'));
      _cachedStudents.forEach((student) => {
        const qrRows = student?.attendanceData?.byDate?.[todayKey]?.qrCheckins || [];
        qrRows.forEach((row) => addFallbackTrafficSample(row?.at, `attendance_${row?.sessionType || 'class'}`));
      });
      rosterResetRows.forEach((row) => addFallbackTrafficSample(row?.signedInAt, 'reset_signin'));
      Object.values(liveRaw || {}).forEach((row) => addFallbackTrafficSample(row?.lastSeen, 'presence_ping'));
      hourRows = Array.from({ length: 24 }, (_, h) => {
        const key = String(h).padStart(2, '0');
        const row = supplementalTrafficByHour[key] || {};
        return { hour: key, pings: Number(row.pings || 0), activities: row.activities || {} };
      });
      if (hourRows.some((row) => row.pings > 0)) {
        trafficSourceLabel = 'attendance/gallery/presence fallback';
      }
    }
    const currentHour = new Date(nowMs).getHours();
    hourRows = hourRows.map((row) => (
      Number(row.hour) > currentHour
        ? { ...row, pings: 0, activities: {} }
        : row
    ));
    const maxPings = Math.max(0, ...hourRows.map(r => r.pings));
    const nonZero = hourRows.filter(r => r.pings > 0);
    const busiest = hourRows.reduce((best, r) => (r.pings > best.pings ? r : best), { hour: '--', pings: -1 });
    const quietest = nonZero.length
      ? nonZero.reduce((best, r) => (r.pings < best.pings ? r : best), nonZero[0])
      : null;
    const activityTotals = {};
    hourRows.forEach(r => {
      Object.entries(r.activities || {}).forEach(([k, v]) => {
        activityTotals[k] = (activityTotals[k] || 0) + (v || 0);
      });
    });
    const topActivities = Object.entries(activityTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`)
      .join(' · ');
    const derivedEventTypeCounts = (derivedDaily?.eventTypeCounts && typeof derivedDaily.eventTypeCounts === 'object')
      ? derivedDaily.eventTypeCounts
      : {};
    const activeLearnersTodayFallback = new Set(studentEventRows.map((e) => e?.uid).filter(Boolean)).size;
    const activeLearnersUsesDerived = String(derivedDaily?.coverage?.dailyActiveLearners || '') === 'official';
    const activeLearnersToday = activeLearnersUsesDerived
      ? Number(derivedDaily?.dailyActiveLearners || 0)
      : activeLearnersTodayFallback;
    const activeLearnersSourceLabel = activeLearnersUsesDerived
      ? 'analytics/raw-events derived'
      : 'analytics/events fallback';
    const learningActionsToday = Number(derivedDaily?.learningActions || 0);
    const feedPostsToday = Number(derivedDaily?.feedPosts || 0);
    const gallerySubmissionsToday = Number(derivedDaily?.gallerySubmissions || 0);
    const surveySubmitsToday = Number(derivedDaily?.surveySubmits || 0);
    const learningActionsSourceLabel = 'analytics/raw-events derived';
    const feedPostsSourceLabel = 'analytics/raw-events derived';
    const galleryPostsSourceLabel = 'analytics/raw-events derived';
    const surveySourceLabel = 'analytics/raw-events derived';
    const unitLockedAttemptsToday = Number(derivedEventTypeCounts.unit_locked_attempt || 0);
    const lockToSurveyConversion = unitLockedAttemptsToday
      ? Math.min(100, Math.round((surveySubmitsToday / unitLockedAttemptsToday) * 100))
      : null;
    const inClassEventsToday = studentEventRows.filter((e) => Boolean(e?.qrVerifiedToday)).length;
    const inClassEventShare = studentEventRows.length
      ? Math.round((inClassEventsToday / studentEventRows.length) * 100)
      : 0;
    const topLearningSignals = Object.entries(derivedEventTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`)
      .join(' · ');
    const dismissedResetAlertCount = _getRosterResetAlertDismissedCount(todayKey);
    const hasVisibleRosterResetAlert = rosterResetRows.length > dismissedResetAlertCount;
    const recentRosterResetRows = rosterResetRows.slice(0, 8);
    const rosterResetAlertHtml = hasVisibleRosterResetAlert ? `
        <div id="lecturer-roster-reset-alert" style="background:linear-gradient(135deg,#ecfeff 0%,#f0fdf4 100%);border:1px solid #99f6e4;border-radius:18px;padding:18px 20px;margin-bottom:22px;box-shadow:0 14px 30px rgba(15,23,42,.08);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
            <div>
              <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0f766e;">Roster Reset Sign-ins</div>
              <div style="font-size:22px;font-weight:900;color:var(--navy);margin-top:4px;">${rosterResetRows.length} student${rosterResetRows.length === 1 ? '' : 's'} signed in after receiving reset links today</div>
              <div style="font-size:13px;color:#155e75;margin-top:6px;line-height:1.55;">
                Running tally for <strong>${todayKey}</strong>. This alert stays visible until you close it.
                ${dismissedResetAlertCount > 0 ? ` It reopened because the tally increased beyond ${dismissedResetAlertCount}.` : ''}
              </div>
            </div>
            <button class="btn-prev" style="display:inline-flex;padding:8px 12px;background:#0f766e;border-color:#0f766e;color:white;" onclick="_dismissRosterResetAlert('${todayKey}', ${rosterResetRows.length})">Close alert</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:14px;">
            ${recentRosterResetRows.map((row) => {
      const at = row?.signedInAt ? new Date(row.signedInAt) : null;
      const hh = at && !Number.isNaN(at.getTime()) ? String(at.getHours()).padStart(2, '0') : '--';
      const mm = at && !Number.isNaN(at.getTime()) ? String(at.getMinutes()).padStart(2, '0') : '--';
      const studentName = _esc(String(row?.name || 'Student').split(' [')[0]);
      const studentNumber = _esc(row?.studentNumber || '—');
      const email = _esc(row?.email || '—');
      return `
              <div style="background:rgba(255,255,255,.82);border:1px solid rgba(15,118,110,.14);border-radius:12px;padding:10px 12px;">
                <div style="font-size:13px;font-weight:800;color:var(--navy);">${studentName}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;">${studentNumber} · ${email}</div>
                <div style="font-size:11px;color:#0f766e;font-weight:700;margin-top:6px;">Signed in at ${hh}:${mm}</div>
              </div>`;
    }).join('')}
          </div>
          ${rosterResetRows.length > recentRosterResetRows.length
        ? `<div style="font-size:12px;color:var(--muted);margin-top:10px;">Showing latest ${recentRosterResetRows.length} of ${rosterResetRows.length} sign-ins.</div>`
        : ''}
        </div>`
      : '';
    const trendDailyByDate = Object.fromEntries(
      (trendDerivedMetrics || []).map((result) => [String(result?.daily?.dateKey || ''), result?.daily || {}])
    );
    const trendRows = trendDateKeys.map((k) => {
      const summary = trendDailyByDate[k] || {};
      const actions = Number(summary.learningActions || 0);
      const learners = Number(summary.dailyActiveLearners || 0);
      const feed = Number(summary.feedPosts || 0);
      return {
        dateKey: k,
        label: k.slice(5),
        actions,
        learners,
        feed,
      };
    });
    const prevTrendRows = prevTrendDateKeys.map((k) => {
      const summary = trendDailyByDate[k] || {};
      return {
        actions: Number(summary.learningActions || 0),
        learners: Number(summary.dailyActiveLearners || 0),
        feed: Number(summary.feedPosts || 0),
      };
    });
    const currentWeekTotals = trendRows.reduce((acc, r) => {
      acc.actions += r.actions;
      acc.learners += r.learners;
      acc.feed += r.feed;
      return acc;
    }, { actions: 0, learners: 0, feed: 0 });
    const prevWeekTotals = prevTrendRows.reduce((acc, r) => {
      acc.actions += r.actions;
      acc.learners += r.learners;
      acc.feed += r.feed;
      return acc;
    }, { actions: 0, learners: 0, feed: 0 });
    const actionsDelta = _pctDelta(currentWeekTotals.actions, prevWeekTotals.actions);
    const learnersDelta = _pctDelta(currentWeekTotals.learners, prevWeekTotals.learners);
    const feedDelta = _pctDelta(currentWeekTotals.feed, prevWeekTotals.feed);
    const trendMaxActions = Math.max(1, ...trendRows.map((r) => r.actions));
    const trendMaxLearners = Math.max(1, ...trendRows.map((r) => r.learners));
    const trendMaxFeed = Math.max(1, ...trendRows.map((r) => r.feed));

    const unitMetaById = Object.fromEntries(UNITS.map((u) => [u.id, { badge: u.badge, title: u.title }]));
    const unlockOverrideRoot = unlockOverridesSnap.exists() ? unlockOverridesSnap.val() : {};
    const overrideActionRows = [];
    Object.entries(unlockOverrideRoot || {}).forEach(([dayKey, byStudent]) => {
      Object.entries(byStudent || {}).forEach(([uid, byLog]) => {
        Object.values(byLog || {}).forEach((row) => {
          if (!row || typeof row !== 'object') return;
          const at = String(row.at || '').trim();
          const unitId = String(row.unitId || '').trim();
          const unitMeta = unitMetaById[unitId] || { badge: unitId.toUpperCase(), title: unitId };
          const studentName = String(row.studentName || studentNameByUid[uid] || `Student_${uid.slice(0, 6)}`).split(' [')[0];
          const studentNumber = String(row.studentNumber || studentNumberByUid[uid] || '').trim();
          overrideActionRows.push({
            dayKey,
            uid,
            at,
            action: String(row.action || '').toLowerCase() === 'relock' ? 'relock' : 'unlock',
            studentName,
            studentNumber,
            unitId,
            unitBadge: unitMeta.badge,
            unitTitle: unitMeta.title,
            justification: String(row.justification || '').trim(),
            catchUpRequired: Boolean(row.catchUpRequired),
            catchUpPlan: String(row.catchUpPlan || '').trim(),
            lecturerName: String(row.lecturerName || '').trim() || 'Lecturer',
          });
        });
      });
    });
    overrideActionRows.sort((a, b) => {
      const atA = new Date(a.at || a.dayKey || 0).getTime();
      const atB = new Date(b.at || b.dayKey || 0).getTime();
      return atB - atA;
    });
    _cachedAllOverrideRows = overrideActionRows;
    const recentOverrideRows = overrideActionRows.slice(0, 20);
    _cachedRecentOverrideRows = recentOverrideRows;
    const overrideActionsToday = overrideActionRows.filter((r) => (r.at || '').startsWith(todayKey) || r.dayKey === todayKey).length;
    const openProfileIndexByUid = Object.fromEntries(_cachedStudents.map((s, index) => [s.uid, index]));
    const recentOverrideRowsHtml = recentOverrideRows.length
      ? recentOverrideRows.map((row) => {
        const rowTs = row.at ? new Date(row.at) : null;
        const when = rowTs ? rowTs.toLocaleString() : row.dayKey;
        const actionChip = row.action === 'unlock'
          ? '<span style="font-size:10px;font-weight:700;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px;">UNLOCK</span>'
          : '<span style="font-size:10px;font-weight:700;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:2px 8px;border-radius:999px;">RELOCK</span>';
        const openProfileBtn = Number.isInteger(openProfileIndexByUid[row.uid])
          ? `<button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;" onclick="_renderStudentProfile(${openProfileIndexByUid[row.uid]})">Open profile</button>`
          : '<span style="font-size:11px;color:var(--muted);">Profile unavailable</span>';
        return `
          <div style="display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(170px,1.4fr) minmax(120px,0.9fr) minmax(220px,2fr) minmax(190px,1.5fr) minmax(120px,0.9fr);gap:10px;align-items:start;padding:10px 12px;border-top:1px solid var(--border);font-size:12px;">
            <div>
              <div style="font-weight:700;color:var(--navy);">${_esc(row.studentName)}</div>
              <div style="font-size:11px;color:var(--muted);">Student no: ${_esc(row.studentNumber || 'N/A')}</div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);">${_esc(row.uid)}</div>
            </div>
            <div>
              <div style="font-weight:700;color:#92400e;">${_esc(row.unitBadge)} · ${_esc(row.unitTitle)}</div>
              <div style="font-size:11px;color:var(--muted);">${actionChip}</div>
            </div>
            <div style="color:var(--muted);font-size:11px;line-height:1.5;">
              <div>${_esc(when || 'Unknown')}</div>
              <div>By ${_esc(row.lecturerName)}</div>
            </div>
            <div style="line-height:1.5;">
              <div style="font-weight:600;color:var(--navy);margin-bottom:3px;">Justification</div>
              <div style="color:var(--muted);">${_esc(row.justification || 'Not recorded')}</div>
            </div>
            <div style="line-height:1.5;">
              <div style="font-weight:600;color:var(--navy);margin-bottom:3px;">Catch-up</div>
              <div style="color:var(--muted);">${row.catchUpRequired ? _esc(row.catchUpPlan || 'Required but not recorded') : 'Not required'}</div>
            </div>
            <div style="display:flex;justify-content:flex-end;align-items:center;">${openProfileBtn}</div>
          </div>
        `;
      }).join('')
      : '<div style="padding:12px;color:var(--muted);font-size:12px;">No override actions logged yet.</div>';

    const promotionRequestsRoot = promotionRequestsSnap.exists() ? promotionRequestsSnap.val() : {};
    const promotionRequestRows = [];
    const requestStatusByUidUnit = {};
    _cachedStudents.forEach((student) => {
      const requests = student?.progressObj?.__promotionRequests || {};
      Object.entries(requests).forEach(([unitId, request]) => {
        requestStatusByUidUnit[`${student.uid}|${unitId}`] = {
          status: String(request?.status || '').toLowerCase(),
          reviewedAt: request?.reviewedAt || null,
        };
      });
    });
    Object.entries(promotionRequestsRoot || {}).forEach(([dayKey, byStudent]) => {
      Object.entries(byStudent || {}).forEach(([uid, byRequest]) => {
        Object.entries(byRequest || {}).forEach(([requestId, row]) => {
          if (!row || typeof row !== 'object') return;
          const unitId = String(row.targetUnitId || row.unitId || '').trim();
          if (!unitId) return;
          const unitMeta = unitMetaById[unitId] || { badge: unitId.toUpperCase(), title: unitId };
          const latestStatus = requestStatusByUidUnit[`${uid}|${unitId}`]?.status;
          const status = latestStatus || String(row.status || 'pending').toLowerCase() || 'pending';
          promotionRequestRows.push({
            requestId,
            dayKey,
            uid,
            requestedAt: String(row.requestedAt || row.at || '').trim(),
            studentName: String(row.studentName || studentNameByUid[uid] || `Student_${uid.slice(0, 6)}`).split(' [')[0],
            studentNumber: String(row.studentNumber || studentNumberByUid[uid] || '').trim(),
            targetUnitId: unitId,
            targetUnitBadge: unitMeta.badge,
            targetUnitTitle: unitMeta.title,
            reason: String(row.reason || '').trim(),
            note: String(row.note || '').trim(),
            status,
          });
        });
      });
    });
    promotionRequestRows.sort((a, b) => {
      const atA = new Date(a.requestedAt || a.dayKey || 0).getTime();
      const atB = new Date(b.requestedAt || b.dayKey || 0).getTime();
      return atB - atA;
    });
    const seenReq = new Set();
    const dedupedPromotionRows = promotionRequestRows.filter((row) => {
      const key = `${row.uid}|${row.targetUnitId}|${row.status}`;
      if (seenReq.has(key)) return false;
      seenReq.add(key);
      return true;
    });
    const pendingPromotionByUid = new Set(
      dedupedPromotionRows
        .filter((row) => String(row?.status || '').toLowerCase() === 'pending')
        .map((row) => String(row?.uid || '').trim())
        .filter(Boolean)
    );
    _cachedAllPromotionRequests = dedupedPromotionRows;
    const recentPromotionRows = dedupedPromotionRows.slice(0, 20);
    _cachedRecentPromotionRequests = recentPromotionRows;
    const pendingPromotionCount = dedupedPromotionRows.filter((r) => r.status === 'pending').length;
    const recentPromotionRowsHtml = recentPromotionRows.length
      ? recentPromotionRows.map((row) => {
        const rowTs = row.requestedAt ? new Date(row.requestedAt) : null;
        const when = rowTs ? rowTs.toLocaleString() : row.dayKey;
        const statusChip = row.status === 'approved'
          ? '<span style="font-size:10px;font-weight:700;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px;">APPROVED</span>'
          : row.status === 'rejected'
            ? '<span style="font-size:10px;font-weight:700;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:2px 8px;border-radius:999px;">REJECTED</span>'
            : '<span style="font-size:10px;font-weight:700;background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:2px 8px;border-radius:999px;">PENDING</span>';
        const profileIndex = openProfileIndexByUid[row.uid];
        const openProfileBtn = Number.isInteger(profileIndex)
          ? `<button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;" onclick="_renderStudentProfile(${profileIndex})">Open profile</button>`
          : '<span style="font-size:11px;color:var(--muted);">Profile unavailable</span>';
        const promoteBtn = row.status === 'pending' && Number.isInteger(profileIndex)
          ? `<button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;border-color:#f59e0b;color:#92400e;" onclick="_openUnlockOverrideModal('${row.uid}','${row.targetUnitId}','unlock')">Promote now</button>`
          : '';
        const rejectBtn = row.status === 'pending' && Number.isInteger(profileIndex)
          ? `<button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;border-color:#fecaca;color:#991b1b;" onclick="_openRejectPromotionModal('${row.uid}','${row.targetUnitId}','${row.requestId}')">Reject</button>`
          : '';
        return `
          <div style="display:grid;grid-template-columns:minmax(130px,1fr) minmax(160px,1.2fr) minmax(115px,0.9fr) minmax(210px,1.8fr) minmax(170px,1.1fr) minmax(150px,1fr);gap:10px;align-items:start;padding:10px 12px;border-top:1px solid var(--border);font-size:12px;">
            <div>
              <div style="font-weight:700;color:var(--navy);">${_esc(row.studentName)}</div>
              <div style="font-size:11px;color:var(--muted);">Student no: ${_esc(row.studentNumber || 'N/A')}</div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);">${_esc(row.uid)}</div>
            </div>
            <div>
              <div style="font-weight:700;color:#92400e;line-height:1.4;white-space:normal;word-break:break-word;">${_esc(row.targetUnitBadge)} · ${_esc(row.targetUnitTitle)}</div>
              <div style="font-size:11px;color:var(--muted);">${statusChip}</div>
            </div>
            <div style="color:var(--muted);font-size:11px;line-height:1.5;">${_esc(when || 'Unknown')}</div>
            <div style="line-height:1.5;color:var(--muted);">
              <div><strong style="color:var(--navy);">System reason:</strong> ${_esc(row.reason || 'Not recorded')}</div>
              <div style="margin-top:4px;"><strong style="color:var(--navy);">Student note:</strong> ${_esc(row.note || 'Not provided')}</div>
            </div>
            <div style="font-size:11px;color:var(--muted);">Request ID: <span style="font-family:var(--font-mono);">${_esc(row.requestId)}</span></div>
            <div style="display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;">${promoteBtn}${rejectBtn}${openProfileBtn}</div>
          </div>
        `;
      }).join('')
      : '<div style="padding:12px;color:var(--muted);font-size:12px;">No promotion requests logged yet.</div>';

    // ── Class-wide skill heatmap ──────────────
    const classSkillData = {};
    Object.keys(SKILL_LABELS_LEC).forEach(id => {
      const scores = _cachedStudents
        .map(st => st.skillAvgs[id])
        .filter(v => v != null);
      const weakCount = _cachedStudents.filter(st => st.skillStatus[id] === 'weak').length;
      classSkillData[id] = {
        avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null,
        assessed: scores.length,
        weakCount,
      };
    });

    const heatmapRows = Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
      const d = classSkillData[id];
      if (!d.assessed) {
        return `<div class="lec-skill-row">
          <span class="lec-skill-name">${label}</span>
          <div class="lec-skill-bar-bg" style="flex:1"><div class="lec-skill-bar-fill" style="width:0%;background:#e2e8f0"></div></div>
          <span class="lec-skill-meta" style="color:var(--muted)">No data yet</span>
        </div>`;
      }
      const pct = Math.round((d.avg / 5) * 100);
      const color = d.avg < 2.5 ? '#ef4444' : d.avg < 3.5 ? '#f59e0b' : '#10b981';
      const flag = d.weakCount > 0 ? `<span style="color:#ef4444;font-size:11px;font-weight:700;"> ⚠ ${d.weakCount} weak</span>` : '';
      return `<div class="lec-skill-row">
        <span class="lec-skill-name">${label}</span>
        <div class="lec-skill-bar-bg" style="flex:1">
          <div class="lec-skill-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="lec-skill-meta">${d.avg}/5 · ${d.assessed} assessed${flag}</span>
      </div>`;
    }).join('');

    // ── Escalation & curriculum alert data ───────
    const escalatedStudents = _cachedStudents.filter(s => s.escalations.length > 0);
    const curriculumAlerts = Object.entries(classSkillData)
      .filter(([, d]) => d.assessed > 0 && (d.weakCount / _cachedStudents.length) >= 0.6)
      .map(([id]) => SKILL_LABELS_LEC[id]);
    const collaborationScopeRows = await Promise.all(
      _LECTURER_COLLAB_SCOPE_CATALOG.map(async (scope) => {
        try {
          const [liveScope, archivedVersions] = await Promise.all([
            getCollaborationScope(scope.id, {
              scopeType: 'assessment',
              scopeLabel: scope.label,
              sizeLimit: 5,
            }),
            getArchivedCollaborationScope(scope.id),
          ]);
          const activeSummary = _summarizeCollaborationScopeGroups(liveScope?.groups || {});
          const archiveEntries = Object.values(archivedVersions || {});
          const archivedGroups = archiveEntries.reduce((sum, entry) => sum + Object.keys(entry?.groups || {}).length, 0);
          const archivedArtefacts = archiveEntries.reduce((sum, entry) => {
            return sum + Object.values(entry?.groups || {}).reduce((groupSum, group) => groupSum + Object.keys(group?.artefacts || {}).length, 0);
          }, 0);
          return {
            ...scope,
            ok: true,
            meta: liveScope?.meta || {},
            groups: liveScope?.groups || {},
            activeSummary,
            archiveCount: archiveEntries.length,
            archivedGroups,
            archivedArtefacts,
          };
        } catch (err) {
          return {
            ...scope,
            ok: false,
            error: err?.message || 'Could not load collaboration space.',
            meta: {},
            groups: {},
            activeSummary: { groups: 0, members: 0, artefacts: 0 },
            archiveCount: 0,
            archivedGroups: 0,
            archivedArtefacts: 0,
          };
        }
      })
    );
    const collaborationScopeHtml = collaborationScopeRows.map((scope) => {
      const isArchived = String(scope?.meta?.status || 'active') === 'archived';
      const statusLabel = isArchived ? 'Archived' : 'Active';
      const statusColor = isArchived ? '#92400e' : '#166534';
      const statusBg = isArchived ? '#fffbeb' : '#ecfdf5';
      const actionLabel = isArchived ? 'Archived' : 'Archive space';
      const refreshLabel = isArchived ? 'Open new cycle' : 'Archive + new cycle';
      const compactExpanded = Boolean(window._lecturerExpandedCollabScopes?.[scope.id]);
      if (scope.compact && !compactExpanded) {
        const compactLabel = scope.compactLabel || scope.label;
        const compactDetail = scope.ok
          ? `${scope.activeSummary.groups} active group${scope.activeSummary.groups === 1 ? '' : 's'} · ${scope.activeSummary.members} member${scope.activeSummary.members === 1 ? '' : 's'} · ${scope.archiveCount} archive${scope.archiveCount === 1 ? '' : 's'}`
          : (scope.error || 'Could not load collaboration space.');
        return `
          <div style="width:100%;border:1px solid var(--border);border-radius:14px;padding:16px 18px;background:white;box-shadow:0 8px 22px rgba(15,23,42,.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-size:15px;font-weight:900;color:var(--navy);">${_esc(compactLabel)}</span>
              <span style="background:${statusBg};color:${statusColor};padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">${statusLabel}</span>
            </div>
            <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px;">${_esc(compactDetail)}</div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
              <button class="btn-prev" style="display:inline-flex;padding:6px 12px;font-size:12px;" onclick="_toggleLecturerCollabScope('${scope.id}', true)" ${!scope.ok ? 'disabled' : ''}>Manage A1</button>
            </div>
          </div>
        `;
      }

      const groupEntries = Object.entries(scope.groups || {}).sort(([, a], [, b]) => {
        const ac = Object.keys(a?.members || {}).length;
        const bc = Object.keys(b?.members || {}).length;
        return bc - ac || String(a?.name || '').localeCompare(String(b?.name || ''));
      });
      const allGroupIds = groupEntries.map(([gid]) => gid);

      const groupCardsHtml = groupEntries.map(([groupId, group]) => {
        const members = Object.entries(group?.members || {});
        const memberCount = members.length;
        const maxSize = Math.max(2, Number(group?.sizeLimit) || 5);
        const leaderUid = String(group?.leaderUid || '');

        return `
          <div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="font-size:14px;font-weight:700;color:var(--navy);">${_esc(group.name || 'Unnamed')}</div>
              <span style="font-size:12px;color:var(--muted);font-weight:600;">${memberCount} / ${maxSize}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">Leader: ${_esc(members.find(([uid]) => uid === leaderUid)?.[1]?.name || leaderUid || 'None')}</div>

            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button class="btn-prev" style="display:inline-flex;padding:3px 8px;font-size:11px;" onclick="_lecRenameGroup('${scope.id}','${groupId}')">Rename</button>
              <button class="btn-prev" style="display:inline-flex;padding:3px 8px;font-size:11px;border-color:#dc2626;color:#dc2626;" onclick="_lecDeleteGroup('${scope.id}','${groupId}','${_esc(group.name || '')}')">Delete</button>
            </div>

            <div style="margin-top:10px;">
              ${members.length ? members.map(([uid, m]) => {
                const isLeader = uid === leaderUid;
                const memberMoveOptions = allGroupIds
                  .filter((gid) => gid !== groupId)
                  .map((gid) => `<option value="${gid}">${_esc(scope.groups[gid]?.name || gid)}</option>`)
                  .join('');
                return `
                  <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:12px;font-weight:600;color:var(--navy);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(m?.name || m?.email || uid)}</span>
                      ${isLeader ? '<span style="background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;flex-shrink:0;">Leader</span>' : ''}
                    </div>
                    ${m?.email ? `<div style="font-size:10px;color:var(--muted);margin-top:1px;">${_esc(m.email)}</div>` : ''}
                    <div style="display:flex;align-items:center;gap:4px;margin-top:6px;flex-wrap:wrap;">
                      ${!isLeader ? `<button class="btn-prev" style="display:inline-flex;padding:2px 8px;font-size:10px;" onclick="_lecTransferLeader('${scope.id}','${groupId}','${uid}','${_esc(m?.name || uid)}')">Make leader</button>` : ''}
                      <button class="btn-prev" style="display:inline-flex;padding:2px 8px;font-size:10px;border-color:#dc2626;color:#dc2626;" onclick="_lecRemoveMember('${scope.id}','${groupId}','${uid}','${_esc(m?.name || uid)}')">Remove</button>
                      ${memberMoveOptions ? `
                        <select id="lec-move-${groupId}-${uid}" style="font-size:10px;padding:2px 6px;border:1px solid var(--border);border-radius:6px;max-width:120px;">
                          <option value="">Move to…</option>
                          ${memberMoveOptions}
                        </select>
                        <button class="btn-prev" style="display:inline-flex;padding:2px 8px;font-size:10px;" onclick="_lecMoveMember('${scope.id}','${groupId}','${uid}','lec-move-${groupId}-${uid}')">Go</button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('') : '<div style="font-size:12px;color:var(--muted);padding:8px 0;">No members</div>'}
            </div>

            ${memberCount < maxSize ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
                <div style="font-size:11px;font-weight:700;color:var(--navy);margin-bottom:6px;">Add student from roster</div>
                <div style="display:flex;gap:4px;align-items:center;">
                  <select id="lec-add-${groupId}" style="font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;flex:1;min-width:0;">
                    <option value="">Select student…</option>
                    ${(Array.isArray(_cachedStudents) ? _cachedStudents : [])
                      .filter((s) => !_lecStudentInAnyGroup(s.uid, scope.groups))
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((s) => `<option value="${s.uid}">${_esc(s.name || s.email)} ${s.studentNumber ? '(' + _esc(s.studentNumber) + ')' : ''}</option>`)
                      .join('')}
                  </select>
                  <button class="btn-prev" style="display:inline-flex;padding:3px 8px;font-size:11px;" onclick="_lecAddStudentToGroup('${scope.id}','${groupId}','lec-add-${groupId}')">Add</button>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      return `
        <div style="border:1px solid var(--border);border-radius:14px;padding:16px;background:${scope.ok ? 'white' : '#fff7ed'};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-size:15px;font-weight:800;color:var(--navy);">${_esc(scope.meta?.label || scope.label)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.5;">${_esc(scope.description || '')}</div>
            </div>
            <span style="background:${statusBg};color:${statusColor};padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;">${statusLabel}</span>
          </div>
          ${scope.ok ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:14px;">
              <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Active groups</div><div style="font-size:18px;font-weight:900;color:var(--navy);">${scope.activeSummary.groups}</div></div>
              <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Members</div><div style="font-size:18px;font-weight:900;color:var(--navy);">${scope.activeSummary.members}</div></div>
              <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Artefacts</div><div style="font-size:18px;font-weight:900;color:var(--navy);">${scope.activeSummary.artefacts}</div></div>
              <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;">Archives</div><div style="font-size:18px;font-weight:900;color:var(--navy);">${scope.archiveCount}</div></div>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:12px;line-height:1.6;">Archived history: <strong style="color:var(--navy);">${scope.archivedGroups}</strong> groups and <strong style="color:var(--navy);">${scope.archivedArtefacts}</strong> artefacts preserved.</div>

            ${groupCardsHtml ? `
              <div style="margin-top:16px;">
                <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px;">Group details</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px;">
                  ${groupCardsHtml}
                </div>
              </div>
            ` : ''}
          ` : `
            <div style="font-size:12px;color:#9a3412;margin-top:14px;">${_esc(scope.error || 'Could not load collaboration space.')}</div>
          `}
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
            <button class="btn-prev" style="display:inline-flex;background:#1d4ed8;border-color:#1d4ed8;color:white;" onclick="_addManagedCollaborationGroup('${scope.id}')" ${!scope.ok || isArchived ? 'disabled' : ''}>Add new group</button>
            ${scope.compact ? `<button class="btn-prev" style="display:inline-flex;" onclick="_toggleLecturerCollabScope('${scope.id}', false)">Contract A1</button>` : ''}
            <button class="btn-prev" style="display:inline-flex;background:#0f766e;border-color:#0f766e;color:white;" onclick="_startFreshCollaborationCycle('${scope.id}')" ${!scope.ok ? 'disabled' : ''}>${refreshLabel}</button>
            <button class="btn-prev" style="display:inline-flex;${isArchived ? 'background:#e5e7eb;border-color:#d1d5db;color:#6b7280;' : 'background:#7f1d1d;border-color:#7f1d1d;color:white;'}" onclick="_archiveCollaborationScope('${scope.id}')" ${!scope.ok || isArchived ? 'disabled' : ''}>${actionLabel}</button>
          </div>
        </div>
      `;
    }).join('');

    const studentRows = _cachedStudents.map((s, index) => {
      const frustDots = Array.from({ length: 5 }, (_, i) =>
        `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:2px;background:${i < Math.round(s.frustrationIdx) ? '#f59e0b' : '#e2e8f0'}"></span>`
      ).join('');
      const weakSkills = Object.entries(s.skillStatus).filter(([, v]) => v === 'weak').map(([id]) => SKILL_LABELS_LEC[id]?.split(' ')[0] || id);
      const aiFlagCount = (s.aiFlags || []).length;
      const aiBadge = aiFlagCount > 0
        ? `<span style="background:#fee2e2;color:#991b1b;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">⚠ ${aiFlagCount} flag${aiFlagCount > 1 ? 's' : ''}</span>`
        : `<span style="background:#ecfdf5;color:#047857;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">✓ Clear</span>`;
      const tutorialRiskDetected = (s.riskFactors || []).some((factor) =>
        factor === 'No tutorial QR check-in recorded today' || String(factor || '').startsWith('Low tutorial engagement time today')
      );
      const tutorialRiskReasons = (s.riskFactors || []).filter((factor) =>
        factor === 'No tutorial QR check-in recorded today' || String(factor || '').startsWith('Low tutorial engagement time today')
      );
      const tutorialRiskTooltip = tutorialRiskReasons.length
        ? `Trigger: ${tutorialRiskReasons.join(' · ').replace(/"/g, '&quot;')}`
        : 'No tutorial attendance risk factors detected today';
      const tutorialRiskBadge = tutorialRiskDetected
        ? `<span title="${tutorialRiskTooltip}" style="background:#fee2e2;color:#991b1b;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">⚠ Tutorial risk</span>`
        : `<span title="${tutorialRiskTooltip}" style="background:#ecfdf5;color:#047857;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">✓ On track</span>`;

      const calibrationBadge = (s.calibrationMatches || 0) > 0
        ? `<span title="${s.calibrationMatches} score alignments with tutor overrides" style="background:#eff6ff;color:#1e40af;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;border:1px solid #bfdbfe;">🎯 ${s.calibrationMatches} matches</span>`
        : '<span style="font-size:11px;color:var(--muted);">No calibration</span>';
      const rowNextLocked = _nextLockedForStudent(s);
      const hasPendingRequest = pendingPromotionByUid.has(s.uid);
      const quickPromoteCell = rowNextLocked
        ? `<button class="btn-prev" style="display:inline-flex;padding:4px 8px;font-size:11px;border-color:#f59e0b;color:#92400e;" onclick="event.stopPropagation();_openUnlockOverrideModal('${s.uid}','${rowNextLocked.unitId}','unlock')">Promote ${rowNextLocked.unitBadge}</button>`
        : '<span style="font-size:11px;color:var(--muted);">No locked unit</span>';
      const heutagogyChip = Number(s?.heutagogy?.total || 0)
        ? `<span style="background:${s.heutagogy.pending ? '#fffbeb' : '#ecfdf5'};color:${s.heutagogy.pending ? '#92400e' : '#166534'};padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid ${s.heutagogy.pending ? '#fde68a' : '#a7f3d0'};">${s.heutagogy.approved}/${s.heutagogy.total} approved</span><div style="font-size:11px;color:var(--muted);margin-top:4px;">Pending: ${s.heutagogy.pending} · Evidence: ${s.heutagogy.evidenceCount}/${s.heutagogy.total}</div>`
        : '<span style="font-size:11px;color:var(--muted);">No contracts yet</span>';
      const readingTaskSummary = s.readingTaskSubmissionCount
        ? `✍️ ${s.readingTaskSubmissionCount} task${s.readingTaskSubmissionCount === 1 ? '' : 's'} · ${s.readingTaskReviewedCount} reviewed · ${s.readingTaskAvgWords} avg words`
        : '✍️ No reading-task submissions yet';
      const searchBlob = [
        s.name.split(' [')[0],
        s.studentNumber || '',
        s.email || '',
        s.riskLevel || '',
        weakSkills.join(' '),
        readingTaskSummary,
        `${s?.heutagogy?.approved || 0} approved`,
        `${s?.heutagogy?.pending || 0} pending`,
        rowNextLocked?.unitBadge || '',
        rowNextLocked?.unitTitle || '',
      ].join(' ').toLowerCase();
      return `
      <tr data-roster-row="1" data-search="${_esc(searchBlob)}" data-eligible="${rowNextLocked ? '1' : '0'}" data-pending="${hasPendingRequest ? '1' : '0'}" data-risk="${_esc(String(s.riskLevel || '').toLowerCase())}" style="cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='var(--cream2)'" onmouseout="this.style.background='transparent'" onclick="_renderStudentProfile(${index})">
        <td style="padding:14px 10px;border-bottom:1px solid var(--border);text-align:center;position:sticky;left:0;z-index:3;background:white;min-width:56px;">
          <input class="bulk-promote-checkbox" data-uid="${_esc(s.uid)}" data-row-index="${index}" type="checkbox" ${_bulkPromoteSelectedUids.has(s.uid) ? 'checked' : ''} onclick="event.stopPropagation();_toggleBulkPromoteSelection('${s.uid}', this.checked, ${index}, event.shiftKey)" ${rowNextLocked ? '' : 'disabled'} />
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);color:var(--navy);font-weight:600;position:sticky;left:56px;z-index:2;background:white;min-width:220px;">
          ${s.name.split(' [')[0]}
          ${s.highPerformer ? '<span style="font-size:10px;background:rgba(16,185,129,0.12);color:#10b981;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:700;">★ High</span>' : ''}
          <div style="font-size:11px;color:var(--muted);font-weight:normal;">Student no: ${_esc(s.studentNumber || 'N/A')}</div>
          <div style="font-size:11px;color:var(--muted);font-weight:normal;font-family:var(--font-mono);">${s.email}</div>
          <div style="font-size:11px;color:var(--muted);font-weight:normal;margin-top:4px;">${_esc(readingTaskSummary)}</div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;background:var(--cream2);border-radius:6px;height:7px;overflow:hidden;">
              <div style="width:${s.pct}%;background:var(--accent);height:100%;border-radius:6px;"></div>
            </div>
            <div style="font-size:13px;font-weight:600;min-width:36px;">${s.pct}%</div>
          </div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">
          <span style="background:${s.riskColor}20;color:${s.riskColor};padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;">${s.riskLevel}</span>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:2px;" title="Frustration index ${s.frustrationIdx.toFixed(1)}/5">${frustDots}</div>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">${tutorialRiskBadge}</td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">${aiBadge}</td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;">${calibrationBadge}</td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);font-size:12px;line-height:1.4;">${heutagogyChip}</td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);font-size:12px;color:${weakSkills.length ? '#ef4444' : 'var(--muted)'};">
          ${weakSkills.length ? weakSkills.join(', ') : '—'}
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid var(--border);text-align:center;position:sticky;right:0;z-index:2;background:white;min-width:150px;">${quickPromoteCell}</td>
      </tr>`;
    });

    mount.innerHTML = `
      <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.5s ease;">
        ${rosterResetAlertHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          <h1 style="font-family:var(--font-heading);color:var(--navy);font-size:32px;margin:0;">📊 Cohort Analytics & Risk Overview</h1>
          <button id="analytics-auto-refresh-btn" onclick="_toggleAnalyticsAutoRefresh()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--navy);font-size:12px;cursor:pointer;">
            ${_analyticsAutoRefreshEnabled ? '🟢 Auto-refresh ON (20s)' : '⚪ Auto-refresh OFF'}
          </button>
        </div>

        <!-- Metric cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px;">
            ${_metricCard('👥', 'Active Students', _cachedStudents.length, 'var(--navy)', { metricClass: 'operational', sourceLabel: 'current cohort state' })}
            ${_metricCard('📈', 'Avg Progress', `${avgProg}<span style="font-size:20px">%</span>`, 'var(--accent)', { metricClass: 'operational', sourceLabel: 'unit progress state' })}
            ${_metricCard('⚠️', 'At-Risk Students', atRiskCount, atRiskCount > 0 ? 'var(--red)' : 'var(--green)', { metricClass: 'operational', sourceLabel: 'risk model' })}
            ${_metricCard('😤', 'High Frustration', frustCount, frustCount > 0 ? '#f59e0b' : 'var(--green)', { metricClass: 'operational', sourceLabel: 'adaptive state' })}
            ${_metricCard('🛡️', 'AI Flags', aiFlagEvents, aiFlagEvents > 0 ? '#991b1b' : 'var(--green)', { metricClass: 'operational', sourceLabel: 'integrity detections' })}
        </div>

        <details style="background:white;border-radius:16px;border:1px solid var(--border);margin-bottom:28px;">
          <summary style="padding:18px 24px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;list-style:none;">
            <div style="display:flex;align-items:center;gap:10px;">
              <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🧾 Recent Override Actions</h2>
              <span style="background:var(--cream2);border:1px solid var(--border);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--navy);font-weight:600;">${recentOverrideRows.length}</span>
              <span style="font-size:12px;color:var(--muted);">Today: <strong style="color:var(--navy);">${overrideActionsToday}</strong></span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="event.stopPropagation();_downloadOverrideActionsCsv('recent')">⬇ Recent CSV</button>
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="event.stopPropagation();_downloadOverrideActionsCsv('all')">⬇ All CSV</button>
              <span style="font-size:11px;color:var(--muted);margin-left:4px;">Click to expand</span>
            </div>
          </summary>
          <div style="padding:0 24px 24px;">
            <div style="border:1px solid var(--border);border-radius:12px;overflow:auto;background:#fff;">
              <div style="display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(170px,1.4fr) minmax(120px,0.9fr) minmax(220px,2fr) minmax(190px,1.5fr) minmax(120px,0.9fr);gap:10px;padding:10px 12px;background:var(--cream);border-bottom:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);">
                <div>Student</div>
                <div>Unit & Action</div>
                <div>When</div>
                <div>Justification</div>
                <div>Catch-up Plan</div>
                <div style="text-align:right;">Profile</div>
              </div>
              ${recentOverrideRowsHtml}
            </div>
          </div>
        </details>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">📨 Promotion Requests</h2>
            <div style="font-size:12px;color:var(--muted);">Pending: <strong style="color:var(--navy);">${pendingPromotionCount}</strong> · Showing latest <strong style="color:var(--navy);">${recentPromotionRows.length}</strong></div>
          </div>
          <div style="border:1px solid var(--border);border-radius:12px;overflow:auto;background:#fff;">
            <div style="display:grid;grid-template-columns:minmax(130px,1fr) minmax(160px,1.2fr) minmax(115px,0.9fr) minmax(210px,1.8fr) minmax(170px,1.1fr) minmax(150px,1fr);gap:10px;padding:10px 12px;background:var(--cream);border-bottom:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);">
              <div>Student</div>
              <div>Target Unit</div>
              <div>Requested At</div>
              <div>Request Details</div>
              <div>Request Ref</div>
              <div style="text-align:right;">Actions</div>
            </div>
            ${recentPromotionRowsHtml}
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
            <div>
              <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🗂️ Collaboration Spaces</h2>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.6;">Archive a collaboration space when an event is complete. Active groups and artefacts are preserved in the archive and the live space becomes read-only.</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">
            ${collaborationScopeHtml}
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🧭 Learning Signals (Today)</h2>
            <div style="font-size:12px;color:var(--muted);">Active learners source: <strong style="color:var(--navy);">${activeLearnersSourceLabel}</strong></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:12px;">
            ${_metricCard('🧑‍🎓', 'Active Learners', activeLearnersToday, 'var(--navy)', { metricClass: 'official', sourceLabel: activeLearnersSourceLabel })}
            ${_metricCard('🎯', 'Learning Actions', learningActionsToday, 'var(--accent)', { metricClass: 'partial', sourceLabel: learningActionsSourceLabel })}
            ${_metricCard('🖼️', 'Gallery Posts', gallerySubmissionsToday, gallerySubmissionsToday ? '#7c3aed' : 'var(--green)', { metricClass: 'official', sourceLabel: galleryPostsSourceLabel })}
            ${_metricCard('💬', 'Feed Posts', feedPostsToday, feedPostsToday ? '#2563eb' : 'var(--green)', { metricClass: 'official', sourceLabel: feedPostsSourceLabel })}
            ${_metricCard('📝', 'Survey Submits', surveySubmitsToday, surveySubmitsToday ? '#0f766e' : 'var(--muted)', { metricClass: 'official', sourceLabel: surveySourceLabel })}
          </div>
          <div style="font-size:12px;color:var(--muted);line-height:1.7;">
            In-class verified event share: <strong style="color:var(--navy);">${inClassEventShare}%</strong>
            ${lockToSurveyConversion != null ? ` · Lock → Survey conversion: <strong style="color:var(--navy);">${lockToSurveyConversion}%</strong>` : ''}
            ${topLearningSignals ? `<br>Top signals: ${topLearningSignals}` : ''}
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">📆 7-Day Learning Trends</h2>
            <div style="font-size:12px;color:var(--muted);">Official trend source: <strong style="color:var(--navy);">analytics/raw-events derived</strong></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="font-size:12px;font-weight:700;color:var(--navy);">Learning actions</div>
                <div style="font-size:11px;font-weight:700;color:${actionsDelta.color};">${actionsDelta.text}</div>
              </div>
              ${trendRows.map((r) => {
      const width = Math.max(8, Math.round((r.actions / trendMaxActions) * 100));
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:11px;color:var(--muted);width:44px;">${r.label}</span>
                  <div style="flex:1;background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
                    <div style="width:${width}%;height:100%;background:var(--accent);border-radius:6px;"></div>
                  </div>
                  <span style="font-size:11px;color:var(--navy);width:24px;text-align:right;">${r.actions}</span>
                </div>`;
    }).join('')}
            </div>
            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="font-size:12px;font-weight:700;color:var(--navy);">Active learners</div>
                <div style="font-size:11px;font-weight:700;color:${learnersDelta.color};">${learnersDelta.text}</div>
              </div>
              ${trendRows.map((r) => {
      const width = Math.max(8, Math.round((r.learners / trendMaxLearners) * 100));
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:11px;color:var(--muted);width:44px;">${r.label}</span>
                  <div style="flex:1;background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
                    <div style="width:${width}%;height:100%;background:#0f766e;border-radius:6px;"></div>
                  </div>
                  <span style="font-size:11px;color:var(--navy);width:24px;text-align:right;">${r.learners}</span>
                </div>`;
    }).join('')}
            </div>
            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="font-size:12px;font-weight:700;color:var(--navy);">Feed posts</div>
                <div style="font-size:11px;font-weight:700;color:${feedDelta.color};">${feedDelta.text}</div>
              </div>
              ${trendRows.map((r) => {
      const width = Math.max(8, Math.round((r.feed / trendMaxFeed) * 100));
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <span style="font-size:11px;color:var(--muted);width:44px;">${r.label}</span>
                  <div style="flex:1;background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
                    <div style="width:${width}%;height:100%;background:#2563eb;border-radius:6px;"></div>
                  </div>
                  <span style="font-size:11px;color:var(--navy);width:24px;text-align:right;">${r.feed}</span>
                </div>`;
    }).join('')}
            </div>
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
            <div>
              <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">📲 Attendance Register</h2>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">
                ${_attendanceDateKeyLabel(selectedAttendanceDateKey)} · <strong style="color:#10b981;">${attendanceCheckedInCount} checked in</strong> · <strong style="color:#ef4444;">${missingRows.length} missing</strong><br>
                Source: <strong style="color:var(--navy);">${attendanceSourceLabel}</strong>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:8px;">
                Date
                <input type="date" value="${_esc(selectedAttendanceDateKey)}" onchange="_setAnalyticsAttendanceDate(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;color:var(--navy);" />
              </label>
              <button class="btn-prev" style="display:inline-flex;padding:7px 10px;font-size:12px;" onclick="_loadAttendanceImportManager()">⬆ Import Register</button>
              <button class="btn-prev" style="display:inline-flex;padding:7px 10px;font-size:12px;" onclick="_downloadAttendanceExcel()">⬇ Excel</button>
              <button class="btn-prev" style="display:inline-flex;padding:7px 10px;font-size:12px;" onclick="_downloadAttendanceFullExcel()">⬇ Full Report</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <details style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;" ${checkedInRows.length > 10 ? '' : 'open'}>
              <summary style="font-size:12px;font-weight:700;color:#166534;cursor:pointer;user-select:none;">Checked in (${checkedInRows.length})</summary>
              <div style="margin-top:8px;max-height:260px;overflow:auto;">
                ${checkedInRows.length
        ? checkedInRows.map(r => {
          const ts = r.latestAt ? new Date(r.latestAt) : null;
          const hh = ts ? String(ts.getHours()).padStart(2, '0') : '--';
          const mm = ts ? String(ts.getMinutes()).padStart(2, '0') : '--';
          return `<div style="font-size:12px;color:#14532d;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.7);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;">
                      <span>${r.name.split(' [')[0]} <span style="color:var(--muted);">${_esc(r.studentNumber || 'N/A')}</span></span>
                      <span style="color:#166534;white-space:nowrap;">${hh}:${mm} · ${r.latestType || 'class'} · ${r.totalMinutes} min</span>
                    </div>`;
        }).join('')
        : `<div style="font-size:12px;color:#166534;opacity:.8;">No check-ins recorded for ${_esc(selectedAttendanceDateKey)}.</div>`}
              </div>
            </details>
            <details style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;" ${missingRows.length > 0 && missingRows.length <= 10 ? 'open' : ''}>
              <summary style="font-size:12px;font-weight:700;color:#991b1b;cursor:pointer;user-select:none;">Missing check-in (${missingRows.length})</summary>
              <div style="margin-top:8px;max-height:260px;overflow:auto;">
                ${missingRows.length
        ? missingRows.map(r => `<div style="font-size:12px;color:#7f1d1d;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.7);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;"><span>${r.name.split(' [')[0]}</span><span style="color:var(--muted);">${_esc(r.studentNumber || 'N/A')}</span></div>`).join('')
        : `<div style="font-size:12px;color:#991b1b;opacity:.8;">Everyone has checked in for ${_esc(selectedAttendanceDateKey)}.</div>`}
              </div>
            </details>
          </div>
          <details style="margin-top:16px;">
            <summary style="font-size:12px;font-weight:700;color:var(--navy);cursor:pointer;user-select:none;padding:8px 0;">Full register (${attendanceRegisterRows.length} students)</summary>
            <div style="border:1px solid var(--border);border-radius:12px;overflow:auto;background:#fff;margin-top:8px;">
              <div style="display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(90px,.8fr) minmax(110px,.9fr) minmax(90px,.8fr) minmax(140px,1fr) minmax(150px,1fr);gap:10px;padding:10px 12px;background:var(--cream);border-bottom:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">
                <div>Student</div>
                <div>Checked in</div>
                <div>Latest</div>
                <div>QR scans</div>
                <div>Minutes</div>
                <div>Session split</div>
              </div>
              ${attendanceRegisterRows.map((row) => {
      const latest = row.latestAt ? new Date(row.latestAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      return `<div style="display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(90px,.8fr) minmax(110px,.9fr) minmax(90px,.8fr) minmax(140px,1fr) minmax(150px,1fr);gap:10px;padding:10px 12px;border-top:1px solid rgba(148,163,184,.18);font-size:12px;align-items:center;">
                  <div>
                    <div style="font-weight:700;color:var(--navy);">${_esc(row.name.split(' [')[0])}</div>
                    <div style="font-size:11px;color:var(--muted);">${_esc(row.studentNumber || 'No student no.')} · ${_esc(row.email || 'No email')}</div>
                  </div>
                  <div><span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;background:${row.hasQrCheckin ? '#ecfdf5' : '#fef2f2'};color:${row.hasQrCheckin ? '#166534' : '#991b1b'};border:1px solid ${row.hasQrCheckin ? '#bbf7d0' : '#fecaca'};">${row.hasQrCheckin ? 'Yes' : 'No'}</span></div>
                  <div style="color:var(--navy);">${_esc(latest)}${row.latestType ? ` · ${_esc(row.latestType)}` : ''}</div>
                  <div style="color:var(--navy);">${row.qrCount}</div>
                  <div style="color:var(--navy);">${row.totalMinutes} min</div>
                  <div style="color:var(--muted);">Class ${row.classMinutes} · Tutorial ${row.tutorialMinutes}</div>
                </div>`;
    }).join('')}
            </div>
          </details>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🟢 Live Now & Usage Patterns</h2>
            <div style="font-size:12px;color:var(--muted);">Online now: <strong style="color:var(--navy);">${liveOnline.length}</strong> · In class/tutorial: <strong style="color:#10b981;">${liveInClass.length}</strong> · Out of class: <strong style="color:#6366f1;">${liveOutClass.length}</strong></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:12px;">
              <div style="font-size:12px;font-weight:700;color:#0f766e;margin-bottom:8px;">Live in class/tutorial</div>
              ${liveInClass.length
        ? liveInClass.map(r => `<div style="font-size:12px;color:#134e4a;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.8);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;"><span>${r.name.split(' [')[0]}</span><span style="opacity:.8;">${(r.activity || 'dashboard').replace(/_/g, ' ')}</span></div>`).join('')
        : '<div style="font-size:12px;color:#0f766e;opacity:.8;">No active in-class students right now.</div>'}
            </div>
            <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:12px;">
              <div style="font-size:12px;font-weight:700;color:#4338ca;margin-bottom:8px;">Live out of class</div>
              ${liveOutClass.length
        ? liveOutClass.map(r => `<div style="font-size:12px;color:#312e81;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.8);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;"><span>${r.name.split(' [')[0]}</span><span style="opacity:.8;">${(r.activity || 'dashboard').replace(/_/g, ' ')}</span></div>`).join('')
        : '<div style="font-size:12px;color:#4338ca;opacity:.8;">No out-of-class students online now.</div>'}
            </div>
          </div>

          <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;">
            <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">Today's traffic by hour</div>
            <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px;">
              ${hourRows.map(r => {
          const h = Number(r.hour);
          const label = `${String(h).padStart(2, '0')}:00`;
          const bar = maxPings > 0 ? Math.max(8, Math.round((r.pings / maxPings) * 100)) : 8;
          return `<div title="${label} · ${r.pings} ping(s)" style="display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;min-height:86px;">
                  <div style="width:100%;max-width:24px;height:${bar}%;background:${r.pings ? 'var(--accent)' : '#e2e8f0'};border-radius:6px;"></div>
                  <div style="font-size:10px;color:var(--muted);">${String(h).padStart(2, '0')}</div>
                </div>`;
        }).join('')}
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.6;">
              Source: <strong style="color:var(--navy);">${trafficSourceLabel}</strong><br>
              Future-dated samples are ignored and hours later than the current time are hidden.<br>
              Peak hour: <strong style="color:var(--navy);">${busiest.pings > 0 ? `${busiest.hour}:00 (${busiest.pings})` : 'No data yet'}</strong>
              ${quietest ? ` · Quietest active hour: <strong style="color:var(--navy);">${quietest.hour}:00 (${quietest.pings})</strong>` : ''}
              ${topActivities ? `<br>Top activities: ${topActivities}` : ''}
            </div>
          </div>
        </div>

        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">✍️ Reading Task Submission Layer</h2>
            <div style="font-size:12px;color:var(--muted);">Source: <strong style="color:var(--navy);">analytics/reading-task-submissions</strong> · Latest capture: <strong style="color:var(--navy);">${_lecturerWhenLabel(activeReadingTaskRows[0]?.updatedAt || '')}</strong></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px;">
            ${_metricCard('🧑‍💻', 'Students Writing', readingTaskStudentsCount, 'var(--navy)', { metricClass: 'official', sourceLabel: 'distinct students with reading-task records' })}
            ${_metricCard('✍️', 'Captured Tasks', readingTaskSubmissionCount, 'var(--accent)', { metricClass: 'official', sourceLabel: 'unit/task submissions in Firebase analytics' })}
            ${_metricCard('✅', 'Reviewed Tasks', readingTaskReviewedCount, readingTaskReviewedCount ? '#166534' : 'var(--muted)', { metricClass: 'operational', sourceLabel: 'feedback captured on submission records' })}
            ${_metricCard('🕒', 'Review Queue', readingTaskPendingCount, readingTaskPendingCount ? '#92400e' : 'var(--green)', { metricClass: 'partial', sourceLabel: 'captured work still awaiting review' })}
            ${_metricCard('📏', 'Avg Writing Words', readingTaskAvgWords || '0', '#0f766e', { metricClass: 'operational', sourceLabel: 'submissions with writing text only' })}
            ${_metricCard('🛡️', 'AI Checks', readingTaskAiFlagCount, readingTaskAiFlagCount ? '#991b1b' : 'var(--green)', { metricClass: 'operational', sourceLabel: 'high-risk reading-task AI flags' })}
          </div>
          <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:16px;">
            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px;">
              <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:8px;">By unit</div>
              ${readingTaskUnitSummaries.length
        ? `<div style="display:grid;grid-template-columns:minmax(120px,1.2fr) minmax(70px,.7fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(110px,.9fr);gap:10px;padding:8px 10px;border-radius:8px;background:white;border:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">
                    <div>Unit</div>
                    <div>Writers</div>
                    <div>Tasks</div>
                    <div>Reviewed</div>
                    <div>Avg words</div>
                    <div>Latest</div>
                  </div>
                  ${readingTaskUnitSummaries.slice(0, 8).map((row) => `<div style="display:grid;grid-template-columns:minmax(120px,1.2fr) minmax(70px,.7fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(110px,.9fr);gap:10px;padding:10px;border-radius:10px;background:white;border:1px solid rgba(148,163,184,.24);font-size:12px;color:var(--navy);margin-bottom:8px;align-items:center;">
                    <div>
                      <div style="font-weight:700;">${_esc(row.unitBadge)} · ${_esc(row.unitTitle)}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:4px;">Queue ${row.pending} · AI ${row.aiFlags}</div>
                    </div>
                    <div>${row.writerCount}</div>
                    <div>${row.submissions}</div>
                    <div style="color:${row.reviewed ? '#166534' : 'var(--muted)'};">${row.reviewed}</div>
                    <div>${row.avgWords || '—'}</div>
                    <div style="font-size:11px;color:var(--muted);">${_esc(_lecturerWhenLabel(row.latestAt))}</div>
                  </div>`).join('')}`
        : '<div style="font-size:12px;color:var(--muted);padding:10px;background:white;border:1px solid var(--border);border-radius:10px;">No reading-task submissions captured yet.</div>'}
            </div>
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;">
                <div style="font-size:12px;font-weight:700;color:#9a3412;margin-bottom:8px;">Needs follow-up</div>
                ${readingTaskNeedsFollowUpRows.length
        ? readingTaskNeedsFollowUpRows.map((row) => {
          const statusMeta = _lecturerReadingTaskStatusMeta(row.status);
          return `<div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.82);border:1px solid rgba(251,146,60,.25);margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                          <div>
                            <div style="font-size:12px;font-weight:700;color:var(--navy);">${_esc(row.studentName)}</div>
                            <div style="font-size:11px;color:var(--muted);">${_esc(row.studentNumber || 'No student no.')} · ${_esc(row.unitBadge)} · ${_esc(row.taskId)}</div>
                          </div>
                          <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${statusMeta.bg};color:${statusMeta.fg};border:1px solid ${statusMeta.border};">${statusMeta.label}</span>
                        </div>
                        <div style="font-size:11px;color:#7c2d12;margin-top:6px;line-height:1.5;">${_esc(row.reasons.join(' · '))}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:4px;">Words: ${row.wordCount || 0} · Updated ${_esc(_lecturerWhenLabel(row.updatedAt))}</div>
                      </div>`;
        }).join('')
        : '<div style="font-size:12px;color:#9a3412;opacity:.85;">No reading-task follow-up alerts right now.</div>'}
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px;">
                <div style="font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">Most active writers</div>
                ${readingTaskTopWriters.length
        ? readingTaskTopWriters.map((student) => `<div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.82);border:1px solid rgba(147,197,253,.35);margin-bottom:8px;">
                      <div style="font-size:12px;font-weight:700;color:var(--navy);">${_esc(student.name.split(' [')[0])}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:4px;">${_esc(student.studentNumber || 'No student no.')} · ${student.readingTaskSubmissionCount} task${student.readingTaskSubmissionCount === 1 ? '' : 's'} · ${student.readingTaskReviewedCount} reviewed</div>
                      <div style="font-size:11px;color:#1e3a8a;margin-top:4px;">Avg words ${student.readingTaskAvgWords || 0} · Last update ${_esc(_lecturerWhenLabel(student.readingTaskLatestUpdatedAt))}</div>
                    </div>`).join('')
        : '<div style="font-size:12px;color:#1d4ed8;opacity:.85;">No student writing activity recorded yet.</div>'}
              </div>
            </div>
          </div>
        </div>

        ${aiFlaggedStudents ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:28px;display:flex;gap:14px;align-items:flex-start;">
          <div style="font-size:20px;flex-shrink:0;">🛡️</div>
          <div>
            <div style="font-weight:700;color:#991b1b;font-size:14px;margin-bottom:4px;">AI Integrity Watchlist</div>
            <p style="font-size:13px;color:#7f1d1d;line-height:1.6;margin:0;">
              ${aiFlaggedStudents} student${aiFlaggedStudents > 1 ? 's have' : ' has'} at least one high-risk AI style flag across submitted writing tasks.
              Open student profiles to review reasons and patterns before intervention.
            </p>
          </div>
        </div>` : ''}

        <!-- Students Needing Attention -->
        ${escalatedStudents.length ? `
        <div style="background:white;border-radius:16px;border:2px solid rgba(239,68,68,0.3);padding:24px;margin-bottom:28px;">
          <h2 style="font-size:16px;color:#ef4444;margin-bottom:4px;font-family:var(--font-sans);">
            🔔 Students Needing Attention (${escalatedStudents.length})
          </h2>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
            These students have crossed escalation thresholds. Consider reaching out directly.
          </p>
          ${escalatedStudents.map(st => `
            <div style="padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;display:flex;gap:16px;align-items:flex-start;">
              <div style="flex:1;">
                <div style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:4px;">${st.name.split(' [')[0]}</div>
                ${st.escalations.map(e => `<div style="font-size:12px;color:#dc2626;">⚠ <strong>${e.trigger.replace(/-/g, ' ')}</strong> — ${e.message}</div>`).join('')}
              </div>
              <span style="font-size:10px;color:#ef4444;background:#fecaca;padding:2px 8px;border-radius:4px;white-space:nowrap;font-weight:700;flex-shrink:0;">
                ${(st.escalations[0]?.severity || 'alert').toUpperCase()}
              </span>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- Curriculum alerts -->
        ${curriculumAlerts.length ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:28px;display:flex;gap:14px;align-items:flex-start;">
          <div style="font-size:20px;flex-shrink:0;">⚡</div>
          <div>
            <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:4px;">Curriculum Alert</div>
            <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
              More than 60% of the class is struggling with:
              <strong>${curriculumAlerts.join(', ')}</strong>.
              Consider adjusting upcoming session plans to address this gap directly.
            </p>
          </div>
        </div>` : ''}

        <!-- Skill heatmap -->
        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:32px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🧠 Class Skill Heatmap</h2>
            <span style="font-size:12px;color:var(--muted);">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;margin-right:4px;"></span>Weak (&lt;2.5)
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f59e0b;margin:0 4px 0 10px;"></span>Developing
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10b981;margin:0 4px 0 10px;"></span>Strong (≥3.5)
            </span>
          </div>
          <div class="lec-heatmap">${heatmapRows}</div>
          <p style="font-size:12px;color:var(--muted);margin-top:14px;">
            Based on last 3 interactions per student. Only students with ≥2 interactions per skill are included.
            <a href="#" style="color:var(--accent);margin-left:8px;" onclick="event.preventDefault();document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active'));event.target.closest('.dash-nav-item+.dash-nav-item')?.classList.add('active');_loadSkillAnalytics()">→ Full Skill Analytics</a>
          </p>
        </div>

        <details id="student-roster-details" style="margin-bottom:8px;">
          <summary style="list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;background:white;border:1px solid var(--border);border-radius:12px;">
            <span style="font-size:20px;color:var(--navy);font-family:var(--font-sans);font-weight:700;">Student Roster</span>
            <span style="font-size:12px;color:var(--muted);">${_cachedStudents.length} students · click to expand</span>
          </summary>
          <div style="padding-top:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px 0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <input id="roster-search-input" type="text" value="${_esc(_rosterSearchQuery)}" oninput="_setRosterSearchQuery()" placeholder="Search name, student no, email, unit..." style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;min-width:250px;" />
                <select id="roster-filter-mode" onchange="_setRosterFilterMode()" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;">
                  <option value="all" ${_rosterFilterMode === 'all' ? 'selected' : ''}>All students</option>
                  <option value="eligible" ${_rosterFilterMode === 'eligible' ? 'selected' : ''}>Eligible for promote</option>
                  <option value="pending" ${_rosterFilterMode === 'pending' ? 'selected' : ''}>Pending request</option>
                  <option value="high-risk" ${_rosterFilterMode === 'high-risk' ? 'selected' : ''}>High risk only</option>
                  <option value="needs-support" ${_rosterFilterMode === 'needs-support' ? 'selected' : ''}>Medium + High risk</option>
                </select>
                <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="_clearRosterFilters()">Clear filters</button>
                <span id="roster-visible-count" style="font-size:12px;color:var(--muted);">0 shown</span>
              </div>
              <div id="bulk-promote-selected-count" style="font-size:12px;color:var(--muted);">0 selected · 0 eligible</div>
            </div>

            <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px 0;">
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;border-color:#f59e0b;color:#92400e;" onclick="_openBulkPromoteAllEligible()">⚡ Promote all eligible</button>
              <select id="bulk-promote-filter" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;">
                <option value="pending-requests">Pending promotion requests</option>
                <option value="all-eligible">All eligible students</option>
              </select>
              <select id="bulk-promote-unit-filter" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:white;">
                <option value="all">All units</option>
                ${Object.values(UNITS).map((u) => `<option value="${u.id}">${u.badge} - ${u.title}</option>`).join('')}
              </select>
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="_selectBulkPromoteByFilter()">Select by filter</button>
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="_selectAllBulkPromote()">Select all eligible</button>
              <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="_clearBulkPromoteSelection()">Clear selection</button>
              <button id="bulk-promote-btn" class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;border-color:#f59e0b;color:#92400e;" onclick="_openBulkPromoteModal()">🚀 Bulk Promote Selected</button>
            </div>

            <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.04);overflow:auto;">
              <table style="width:100%;min-width:1380px;border-collapse:collapse;text-align:left;">
                <thead>
                  <tr>
                    <th style="padding:14px 10px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;position:sticky;left:0;z-index:5;min-width:56px;">Pick</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);position:sticky;left:56px;z-index:4;min-width:220px;">Student</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);width:25%">Progress</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Risk</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Frustration</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Tutorial Attendance Risk</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">AI Integrity</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;">Calibration</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Heutagogy</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);">Weak Skills</th>
                    <th style="padding:14px 20px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:center;min-width:150px;position:sticky;right:0;z-index:4;">Quick Promote</th>
                  </tr>
                </thead>
                <tbody id="lecturer-roster-tbody">
                  ${studentRows.join('')}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    `;

    _refreshBulkPromoteSelectionUi();
    _applyRosterTableFilters();

  } catch (err) {
    mount.innerHTML = `<div style="padding:40px;color:red;text-align:center;">Failed to load analytics: ${err.message}</div>`;
  }
}
window._loadAnalytics = _loadAnalytics;

window._loadStudentNotebooks = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  if (!Array.isArray(_cachedStudents) || !_cachedStudents.length) {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">Loading student notebook data...</div>';
    await _loadAnalytics();
  }

  _renderStudentNotebookBrowser();
};

function _renderStudentNotebookBrowser() {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  if (!Array.isArray(_cachedStudents) || !_cachedStudents.length) {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No active student states found. Open Cohort Overview first, then return to Student Notebooks.</div>';
    return;
  }

  const stats = _studentNotebookCohortStats();
  mount.innerHTML = `
    <div style="padding:34px;max-width:1280px;margin:0 auto;animation:fadeIn .25s ease;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:18px;">
        <div>
          <h1 style="margin:0;color:var(--navy);font-family:var(--font-heading);font-size:30px;">Student Notebooks</h1>
          <p style="margin:6px 0 0 0;color:var(--muted);font-size:13px;line-height:1.6;">Browse saved tutorial and contact notebooks across the cohort without opening each student profile.</p>
        </div>
        <button class="btn-prev" style="display:inline-flex;" onclick="_loadAnalytics()">Back to Cohort Overview</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;">
        ${_studentNotebookMetric('Students', stats.students, 'var(--navy)')}
        ${_studentNotebookMetric('With Notebook Work', stats.withWork, '#166534')}
        ${_studentNotebookMetric('Tutorial Entries', stats.tutorialEntries, '#166534')}
        ${_studentNotebookMetric('Contact Entries', stats.contactEntries, '#1d4ed8')}
        ${_studentNotebookMetric('Notebook Words', stats.words.toLocaleString(), '#0f766e')}
        ${_studentNotebookMetric('Uploads', stats.uploads, '#7c3aed')}
      </div>

      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;display:grid;grid-template-columns:minmax(220px,1fr) 190px;gap:10px;align-items:center;">
        <input
          id="student-notebook-search"
          type="search"
          placeholder="Search student, group, notebook text, or attachment name..."
          value="${_esc(_studentNotebookSearchQuery)}"
          oninput="_setStudentNotebookSearch(this.value)"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;"
        />
        <select
          id="student-notebook-filter"
          onchange="_setStudentNotebookFilter(this.value)"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;"
        >
          <option value="with-work" ${_studentNotebookFilterMode === 'with-work' ? 'selected' : ''}>With notebook work</option>
          <option value="all" ${_studentNotebookFilterMode === 'all' ? 'selected' : ''}>All students</option>
          <option value="tutorial" ${_studentNotebookFilterMode === 'tutorial' ? 'selected' : ''}>Tutorial notebook</option>
          <option value="contact" ${_studentNotebookFilterMode === 'contact' ? 'selected' : ''}>Contact notebook</option>
          <option value="no-work" ${_studentNotebookFilterMode === 'no-work' ? 'selected' : ''}>No notebook work</option>
        </select>
      </div>

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
        <div id="student-notebook-count" style="font-size:12px;color:var(--muted);"></div>
        <div style="font-size:11px;color:var(--muted);">Rows open in place. Notebook content is read-only.</div>
      </div>
      <div id="student-notebook-list" style="display:grid;gap:10px;"></div>
    </div>
  `;

  _renderStudentNotebookRows();
}

window._setStudentNotebookSearch = function (value = '') {
  _studentNotebookSearchQuery = String(value || '');
  window._renderStudentNotebookRows();
};

window._setStudentNotebookFilter = function (value = '') {
  const mode = String(value || '').trim();
  _studentNotebookFilterMode = ['all', 'with-work', 'tutorial', 'contact', 'no-work'].includes(mode) ? mode : 'with-work';
  window._renderStudentNotebookRows();
};

window._renderStudentNotebookRows = function () {
  const list = document.getElementById('student-notebook-list');
  const count = document.getElementById('student-notebook-count');
  if (!list) return;

  const rows = _studentNotebookRows()
    .filter((row) => _studentNotebookMatchesFilter(row))
    .filter((row) => _studentNotebookMatchesSearch(row));

  if (count) {
    count.textContent = `Showing ${rows.length} of ${Array.isArray(_cachedStudents) ? _cachedStudents.length : 0} students`;
  }

  list.innerHTML = rows.length
    ? rows.map((row) => _renderStudentNotebookRow(row)).join('')
    : '<div style="padding:24px;text-align:center;color:var(--muted);background:white;border:1px solid var(--border);border-radius:12px;">No students match the current notebook filter.</div>';
};

function _studentNotebookMetric(label, value, color) {
  return `
    <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:12px;">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;font-weight:800;">${_esc(label)}</div>
      <div style="font-size:22px;font-weight:900;color:${color};margin-top:4px;">${_esc(value)}</div>
    </div>
  `;
}

function _studentNotebookRows() {
  return (Array.isArray(_cachedStudents) ? _cachedStudents : []).map((student, index) => {
    const tutorialEntries = _studentNotebookEntries(student, 'tutorial');
    const contactEntries = _studentNotebookEntries(student, 'contact');
    const tutorialStats = _studentNotebookStats(student, 'tutorial', tutorialEntries);
    const contactStats = _studentNotebookStats(student, 'contact', contactEntries);
    const totalEntries = tutorialEntries.length + contactEntries.length;
    const totalWords = tutorialStats.words + contactStats.words;
    const totalUploads = tutorialStats.uploads + contactStats.uploads;
    const latestMs = Math.max(tutorialStats.latestMs, contactStats.latestMs);
    return {
      index,
      student,
      tutorialEntries,
      contactEntries,
      tutorialStats,
      contactStats,
      totalEntries,
      totalWords,
      totalUploads,
      latestMs,
      hasWork: totalEntries > 0,
    };
  }).sort((a, b) => b.latestMs - a.latestMs || b.totalWords - a.totalWords || String(a.student.name || '').localeCompare(String(b.student.name || '')));
}

function _studentNotebookCohortStats() {
  return _studentNotebookRows().reduce((acc, row) => ({
    students: acc.students + 1,
    withWork: acc.withWork + (row.hasWork ? 1 : 0),
    tutorialEntries: acc.tutorialEntries + row.tutorialEntries.length,
    contactEntries: acc.contactEntries + row.contactEntries.length,
    words: acc.words + row.totalWords,
    uploads: acc.uploads + row.totalUploads,
  }), { students: 0, withWork: 0, tutorialEntries: 0, contactEntries: 0, words: 0, uploads: 0 });
}

function _studentNotebookMatchesFilter(row) {
  const mode = String(_studentNotebookFilterMode || 'with-work');
  if (mode === 'all') return true;
  if (mode === 'tutorial') return row.tutorialEntries.length > 0;
  if (mode === 'contact') return row.contactEntries.length > 0;
  if (mode === 'no-work') return !row.hasWork;
  return row.hasWork;
}

function _studentNotebookMatchesSearch(row) {
  const q = String(_studentNotebookSearchQuery || '').trim().toLowerCase();
  if (!q) return true;
  return _studentNotebookSearchText(row).includes(q);
}

function _studentNotebookSearchText(row) {
  const student = row.student || {};
  const entryText = [...row.tutorialEntries, ...row.contactEntries].map((entry) => {
    const attachments = (Array.isArray(entry.attachments) ? entry.attachments : [])
      .map((asset) => `${asset?.name || ''} ${asset?.type || ''} ${asset?.provider || ''}`)
      .join(' ');
    return `${entry.sessionTitle || ''} ${entry.sessionId || ''} ${entry.unitId || ''} ${entry.response || ''} ${entry.notes || ''} ${entry.searchLog || ''} ${entry.aiFeedback || ''} ${attachments}`;
  }).join(' ');
  return [
    student.name,
    student.email,
    student.authEmail,
    student.studentNumber,
    student.tutorialGroup,
    entryText,
  ].join(' ').toLowerCase();
}

function _renderStudentNotebookRow(row) {
  const student = row.student || {};
  const latestLabel = row.latestMs ? _lecturerWhenLabel(new Date(row.latestMs).toISOString()) : 'No notebook work yet';
  const workTone = row.hasWork ? '#166534' : '#64748b';
  return `
    <details style="background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:0 5px 16px rgba(15,23,42,.04);">
      <summary style="cursor:pointer;list-style:none;padding:14px 16px;">
        <div style="display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:12px;align-items:center;">
          <div style="min-width:0;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <div style="font-size:14px;font-weight:900;color:var(--navy);overflow-wrap:anywhere;">${_esc(student.name || 'Unknown student')}</div>
              ${student.tutorialGroup ? `<span style="font-size:10px;font-weight:900;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:3px 8px;">Group ${_esc(student.tutorialGroup)}</span>` : ''}
              <span style="font-size:10px;font-weight:900;color:${workTone};background:${row.hasWork ? '#ecfdf5' : '#f8fafc'};border:1px solid ${row.hasWork ? '#bbf7d0' : '#cbd5e1'};border-radius:999px;padding:3px 8px;">${row.hasWork ? 'Has notebook work' : 'No work'}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:3px;overflow-wrap:anywhere;">${_esc(student.email || student.authEmail || 'No email')} ${student.studentNumber ? `· ${_esc(student.studentNumber)}` : ''}</div>
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;">
            ${_studentNotebookPill('Tutorial', row.tutorialEntries.length, '#166534')}
            ${_studentNotebookPill('Contact', row.contactEntries.length, '#1d4ed8')}
            ${_studentNotebookPill('Words', row.totalWords.toLocaleString(), '#0f766e')}
            ${_studentNotebookPill('Uploads', row.totalUploads, '#7c3aed')}
          </div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;">Latest notebook update: <strong style="color:var(--navy);">${_esc(latestLabel)}</strong></div>
      </summary>
      <div style="border-top:1px solid #f1f5f9;padding:14px 16px;background:#fbfdff;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
          <div style="font-size:12px;color:var(--muted);">Read-only notebook evidence for this student.</div>
          <button class="btn-prev" style="display:inline-flex;padding:6px 10px;font-size:12px;" onclick="_renderStudentProfile(${row.index})">Open Profile</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;">
          ${_renderStudentNotebookType('Tutorial Notebook', row.tutorialEntries, row.tutorialStats, '#166534', '#f0fdf4', '#bbf7d0')}
          ${_renderStudentNotebookType('Contact Notebook', row.contactEntries, row.contactStats, '#1d4ed8', '#eff6ff', '#bfdbfe')}
        </div>
      </div>
    </details>
  `;
}

function _studentNotebookPill(label, value, color) {
  return `<span style="font-size:10px;font-weight:900;color:${color};background:${color}12;border:1px solid ${color}30;border-radius:999px;padding:4px 8px;">${_esc(label)}: ${_esc(value)}</span>`;
}

function _renderStudentNotebookType(title, entries, stats, accent, bg, border) {
  return `
    <div style="background:white;border:1px solid ${border};border-radius:12px;overflow:hidden;">
      <div style="padding:11px 12px;background:${bg};border-bottom:1px solid ${border};">
        <div style="font-size:13px;font-weight:900;color:${accent};">${_esc(title)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px;">${entries.length} entries · ${stats.words.toLocaleString()} words · ${stats.uploads} uploads</div>
      </div>
      <div style="display:grid;gap:8px;padding:10px;max-height:620px;overflow:auto;">
        ${entries.length ? entries.map((entry, idx) => _renderStudentNotebookEntry(entry, idx, accent)).join('') : '<div style="font-size:12px;color:var(--muted);padding:8px;">No saved entries in this notebook.</div>'}
      </div>
    </div>
  `;
}

function _renderStudentNotebookEntry(entry = {}, idx = 0, accent = 'var(--navy)') {
  const title = entry.sessionTitle || entry.title || entry.sessionId || `Entry ${idx + 1}`;
  const unit = entry.unitId ? String(entry.unitId).toUpperCase() : '';
  const updated = _studentNotebookUpdatedAt(entry);
  const words = _studentNotebookEntryWords(entry);
  const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];

  return `
    <details style="border:1px solid var(--border);border-radius:10px;background:white;overflow:hidden;">
      <summary style="cursor:pointer;list-style:none;padding:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:900;color:var(--navy);">${_esc(title)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${unit ? `${_esc(unit)} · ` : ''}${_esc(_studentNotebookDateLabel(updated))}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;">
            <span style="font-size:10px;font-weight:900;color:${accent};background:${accent}12;border:1px solid ${accent}30;border-radius:999px;padding:3px 7px;">${words} words</span>
            <span style="font-size:10px;font-weight:900;color:var(--navy);background:#f8fafc;border:1px solid #cbd5e1;border-radius:999px;padding:3px 7px;">${attachments.length} uploads</span>
          </div>
        </div>
      </summary>
      <div style="border-top:1px solid #f1f5f9;padding:10px;display:grid;gap:10px;">
        ${_renderStudentNotebookText('Student Response', entry.response)}
        ${_renderStudentNotebookText('Notes & Evidence', entry.notes)}
        ${_renderStudentNotebookText('Search Log & Sources', entry.searchLog)}
        ${_renderStudentNotebookText('AI Writing Feedback', entry.aiFeedback)}
        ${_renderStudentNotebookAttachments(attachments)}
      </div>
    </details>
  `;
}

function _renderStudentNotebookText(label, text = '') {
  const value = String(text || '').trim();
  if (!value) return '';
  return `
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:900;margin-bottom:4px;">${_esc(label)}</div>
      <div style="font-size:12px;color:#334155;line-height:1.65;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;max-height:220px;overflow:auto;">${_esc(value)}</div>
    </div>
  `;
}

function _renderStudentNotebookAttachments(attachments = []) {
  if (!attachments.length) return '';
  return `
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:900;margin-bottom:4px;">Attachments</div>
      <div style="display:grid;gap:6px;">
        ${attachments.map((asset) => {
    const url = _studentNotebookSafeUrl(asset?.url || '');
    const name = asset?.name || asset?.provider || 'Attachment';
    const meta = [asset?.type, asset?.size ? _studentNotebookFormatBytes(asset.size) : ''].filter(Boolean).join(' · ');
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

function _studentNotebookEntries(student, type) {
  const key = type === 'contact' ? 'contactNotebook' : 'tutorialNotebook';
  return Object.values(student?.state?.[key]?.entries || {})
    .filter(_studentNotebookEntryHasActivity)
    .sort((a, b) => _studentNotebookEntryMs(b) - _studentNotebookEntryMs(a));
}

function _studentNotebookStats(student, type, entries = []) {
  const key = type === 'contact' ? 'contactNotebook' : 'tutorialNotebook';
  const analytics = student?.state?.[key]?.analytics || {};
  const computedWords = entries.reduce((sum, entry) => sum + _studentNotebookEntryWords(entry), 0);
  const computedUploads = entries.reduce((sum, entry) => sum + (Array.isArray(entry.attachments) ? entry.attachments.length : 0), 0);
  return {
    words: Math.max(Number(analytics.totalWords || 0), computedWords),
    uploads: Math.max(Number(analytics.totalAttachments || 0), computedUploads),
    latestMs: entries.reduce((max, entry) => Math.max(max, _studentNotebookEntryMs(entry)), 0),
  };
}

function _studentNotebookUpdatedAt(entry = {}) {
  return entry.updatedAt || entry.createdAt || entry.aiFeedbackAt || '';
}

function _studentNotebookEntryMs(entry = {}) {
  const ms = new Date(_studentNotebookUpdatedAt(entry) || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function _studentNotebookEntryText(entry = {}) {
  return `${entry.response || ''}\n${entry.notes || ''}\n${entry.searchLog || ''}`.trim();
}

function _studentNotebookEntryWords(entry = {}) {
  return _studentNotebookEntryText(entry).split(/\s+/).filter(Boolean).length;
}

function _studentNotebookEntryHasActivity(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return Boolean(
    _studentNotebookEntryText(entry)
    || String(entry.aiFeedback || '').trim()
    || (Array.isArray(entry.attachments) && entry.attachments.length)
  );
}

function _studentNotebookDateLabel(value = '') {
  const ms = new Date(value || 0).getTime();
  if (!Number.isFinite(ms) || !ms) return 'Not timestamped';
  return _lecturerWhenLabel(value);
}

function _studentNotebookSafeUrl(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return '#';
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://example.invalid/';
    const url = new URL(text, base);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch { /* ignore malformed attachment URL */ }
  return '#';
}

function _studentNotebookFormatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

window._renderStudentProfile = (index) => {
  const mount = document.getElementById('analytics-mount');
  const student = _cachedStudents[index];
  if (!mount || !student) return;
  const supportMode = _studentSupportModeByUid[student.uid] || 'medium';
  const saveState = _studentSupportSaveStateByUid[student.uid] || 'idle';
  const saveStateUi = saveState === 'saving'
    ? { text: 'Saving…', color: '#f59e0b' }
    : saveState === 'saved'
      ? { text: 'Saved', color: '#10b981' }
      : saveState === 'error'
        ? { text: 'Save failed', color: '#ef4444' }
        : { text: 'Ready', color: 'var(--muted)' };
  const compiled = _compileStudentProfile(student, supportMode);

  const notesHtml = [];
  Object.entries(student.progressObj).forEach(([unitId, data]) => {
    if (data.annotations && data.annotations.length > 0) {
      data.annotations.forEach(a => {
        notesHtml.push(`
          <div style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;font-family:var(--font-mono);">${unitId.toUpperCase()}</div>
            <div style="font-size:13px;color:var(--muted);font-style:italic;border-left:2px solid var(--amber);padding-left:8px;margin-bottom:8px;">"${a.quote}"</div>
            <div style="font-size:14px;color:var(--navy);">${a.text}</div>
          </div>
        `);
      });
    }
  });

  const factorsHtml = student.riskFactors.length > 0
    ? student.riskFactors.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')
    : '<li style="color:var(--muted);">No immediate risk factors identified.</li>';
  const tutorialRiskDetected = (student.riskFactors || []).some((factor) =>
    factor === 'No tutorial QR check-in recorded today' || String(factor || '').startsWith('Low tutorial engagement time today')
  );
  const tutorialRiskReasons = (student.riskFactors || []).filter((factor) =>
    factor === 'No tutorial QR check-in recorded today' || String(factor || '').startsWith('Low tutorial engagement time today')
  );
  const tutorialRiskTooltip = tutorialRiskReasons.length
    ? `Trigger: ${tutorialRiskReasons.join(' · ').replace(/"/g, '&quot;')}`
    : 'No tutorial attendance risk factors detected today';
  const tutorialRiskBadge = tutorialRiskDetected
    ? `<span title="${tutorialRiskTooltip}" style="background:#fee2e2;color:#991b1b;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #fecaca;">Tutorial Attendance Risk: Alert</span>`
    : `<span title="${tutorialRiskTooltip}" style="background:#ecfdf5;color:#047857;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #a7f3d0;">Tutorial Attendance Risk: On track</span>`;
  const aiFlags = student.aiFlags || [];
  const aiEvents = student.aiDetections || [];
  const readingTaskSubmissions = [...(student.readingTaskSubmissions || [])]
    .sort((a, b) => _lecturerSafeMs(b.updatedAt) - _lecturerSafeMs(a.updatedAt));
  const readingTaskRowsHtml = readingTaskSubmissions.length
    ? readingTaskSubmissions.slice(0, 6).map((row) => {
      const statusMeta = _lecturerReadingTaskStatusMeta(row.status);
      return `
        <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--navy);">${_esc(row.unitBadge)} · ${_esc(row.unitTitle)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;">Task: <span style="font-family:var(--font-mono);">${_esc(row.taskId)}</span> · Updated ${_esc(_lecturerWhenLabel(row.updatedAt))}</div>
            </div>
            <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${statusMeta.bg};color:${statusMeta.fg};border:1px solid ${statusMeta.border};">${statusMeta.label}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            <span style="font-size:11px;background:#f8fafc;color:var(--navy);border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;">Words: ${row.wordCount || 0}</span>
            <span style="font-size:11px;background:${row.hasFeedback ? '#ecfdf5' : '#fffbeb'};color:${row.hasFeedback ? '#166534' : '#92400e'};border:1px solid ${row.hasFeedback ? '#a7f3d0' : '#fde68a'};border-radius:999px;padding:3px 8px;">${row.hasFeedback ? 'Feedback added' : 'No feedback yet'}</span>
            ${row.aiFlagged ? `<span style="font-size:11px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:999px;padding:3px 8px;">AI score ${row.aiScore || 0}</span>` : ''}
          </div>
        </div>
      `;
    }).join('')
    : '<div style="font-size:12px;color:var(--muted);">No reading-task submissions recorded for this student yet.</div>';
  const lockDiagnostics = _lockDiagnosticsForStudent(student);
  const lockedUnits = lockDiagnostics.filter((d) => d.locked);
  const nextLocked = lockedUnits[0] || null;
  const lockRowsHtml = lockDiagnostics.map((d) => {
    const status = d.locked ? 'Locked' : 'Open';
    const statusColor = d.locked ? '#991b1b' : '#166534';
    const statusBg = d.locked ? '#fee2e2' : '#ecfdf5';
    const requirementsHtml = d.requirements.length
      ? `<ul style="margin:6px 0 0 16px;padding:0;font-size:12px;color:var(--muted);line-height:1.5;">${d.requirements.map((r) => `<li>${r.done ? '✅' : '❌'} ${r.label}</li>`).join('')}</ul>`
      : '<div style="font-size:12px;color:var(--muted);margin-top:6px;">No missing gate requirements.</div>';
    const qualitySignals = `<div style="font-size:12px;color:var(--muted);margin-top:6px;">Task state: ${d.visited ? 'Visited' : 'Not visited'} · Reading complete: ${d.readingComplete ? 'Yes' : 'No'}${String(d.unitId).startsWith('a') ? ` · Assessment submitted: ${d.assessmentSubmitted ? 'Yes' : 'No'}` : ''}</div>`;
    const overrideMetaHtml = d.overrideMeta
      ? `<div style="margin-top:6px;font-size:11px;color:var(--muted);line-height:1.5;">Override note: ${_esc(d.overrideMeta.justification || '—')}${d.overrideMeta.catchUpRequired ? `<br/>Catch-up plan: ${_esc(d.overrideMeta.catchUpPlan || 'Required but not provided')}` : ''}</div>`
      : '';
    const actionBtn = d.locked
      ? `<button class="btn-prev" style="display:inline-flex;margin-top:8px;" onclick="_openUnlockOverrideModal('${student.uid}','${d.unitId}','unlock')">Unlock ${d.unitBadge}</button>`
      : (d.override
        ? `<button class="btn-prev" style="display:inline-flex;margin-top:8px;border-color:#fecaca;color:#991b1b;" onclick="_openUnlockOverrideModal('${student.uid}','${d.unitId}','relock')">Relock ${d.unitBadge}</button>`
        : '');
    return `
      <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;">
          <div style="font-size:13px;font-weight:700;color:var(--navy);">${d.unitBadge} · ${d.unitTitle}</div>
          <span style="font-size:11px;padding:3px 8px;border-radius:999px;background:${statusBg};color:${statusColor};font-weight:700;">${status}</span>
        </div>
        <div style="font-size:12px;color:var(--navy);margin-top:6px;">${d.reason}${d.override ? ' (Override active)' : ''}</div>
        ${requirementsHtml}
        ${qualitySignals}
        ${overrideMetaHtml}
        ${actionBtn}
      </div>

    <!-- Heutagogy & Learning Contracts Section -->
    <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;margin-bottom:28px;">
      <h3 style="font-size:16px;color:var(--navy);margin-bottom:16px;font-family:var(--font-sans);">🧭 Heutagogy: Learning Contracts & Portfolio</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Review the student's self-directed learning cycles, pathway choices, and capability evidence.</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <div style="background:var(--cream);border-radius:12px;padding:16px;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:700;">Score Calibration</div>
          <div style="font-size:24px;color:var(--navy);font-family:var(--font-heading);">${student.calibrationMatches || 0}</div>
          <div style="font-size:12px;color:var(--muted);">Matches between self-assessment and tutor overrides</div>
        </div>
        <div style="background:var(--cream);border-radius:12px;padding:16px;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:700;">Moderation Status</div>
          <div style="font-size:24px;color:var(--navy);font-family:var(--font-heading);">${student.heutagogy.approved}/${student.heutagogy.total}</div>
          <div style="font-size:12px;color:var(--muted);">Learning cycles approved by tutor</div>
        </div>
      </div>

      <div style="margin-top:20px;">
        <h4 style="font-size:14px;color:var(--navy);margin-bottom:12px;">Recent Learning Cycles</h4>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${_extractHeutagogyCycles(student.progressObj).slice(0, 5).map(c => `
            <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:11px;font-weight:700;color:var(--accent);">${c.unitId.toUpperCase()}</span>
                <span style="font-size:11px;color:var(--muted);">${new Date(c.savedAt).toLocaleDateString()}</span>
              </div>
              <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:4px;">Goal: ${_esc(c.goal)}</div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Pathway: <span style="text-transform:capitalize;">${_esc(c.pathway)}</span></div>
              <div style="font-size:12px;color:var(--navy);background:#f8fafc;padding:8px;border-radius:6px;margin-bottom:8px;">
                <strong>Reflection (Word count: ${c.reflection.split(/\s+/).filter(Boolean).length}):</strong><br>
                ${_esc(c.reflection)}
              </div>
              <div style="font-size:12px;color:var(--muted);">
                <strong>Evidence/Artifact:</strong> ${c.evidence ? `<a href="${_esc(c.evidence)}" target="_blank" style="color:var(--accent);">${_esc(c.evidence)}</a>` : 'No artifact linked'}
              </div>
            </div>
          `).join('') || '<div style="font-size:13px;color:var(--muted);">No learning cycles completed yet.</div>'}
        </div>
      </div>
    </div>
    `;
  }).join('');
  const overrideEntries = lockDiagnostics
    .filter((d) => d.override)
    .map((d) => ({
      unitBadge: d.unitBadge,
      unitTitle: d.unitTitle,
      meta: d.overrideMeta || {},
    }));
  const overrideLogHtml = overrideEntries.length
    ? overrideEntries.map((entry) => `
      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:10px;">
        <div style="font-size:12px;font-weight:700;color:#92400e;">${entry.unitBadge} · ${entry.unitTitle}</div>
        <div style="font-size:11px;color:#78350f;margin-top:4px;">Justification: ${_esc(entry.meta.justification || 'Not recorded')}</div>
        <div style="font-size:11px;color:#78350f;margin-top:4px;">Catch-up required: ${entry.meta.catchUpRequired ? 'Yes' : 'No'}</div>
        ${entry.meta.catchUpRequired ? `<div style="font-size:11px;color:#78350f;margin-top:4px;">Catch-up plan: ${_esc(entry.meta.catchUpPlan || 'Not recorded')}</div>` : ''}
        <div style="font-size:10px;color:#92400e;margin-top:4px;">Updated: ${_esc(entry.meta.updatedAt ? new Date(entry.meta.updatedAt).toLocaleString() : 'Unknown')}</div>
      </div>
    `).join('')
    : '<div style="font-size:12px;color:var(--muted);">No active override entries for this student.</div>';
  const aiFlagsHtml = aiFlags.length
    ? aiFlags.map((f, idx) => `<li style="margin-bottom:8px;"><strong>${f.source}${f.unitId ? ` · ${String(f.unitId).toUpperCase()}` : f.sessionId ? ` · ${f.sessionId.toUpperCase()}` : ''}</strong> — score ${f.suspicionScore || 0}. ${f.reasons?.[0] || 'Flagged for review.'}${idx < aiFlags.length - 1 ? '' : ''}</li>`).join('')
    : '<li style="color:var(--muted);">No high-risk AI integrity flags recorded.</li>';
  const heutagogyRows = _extractHeutagogyCycles(student.progressObj || {});
  const heutagogySummary = _heutagogySummary(student.progressObj || {});
  const heutagogyRowsHtml = heutagogyRows.length
    ? heutagogyRows.map((row) => {
      const unitMeta = UNITS.find((u) => u.id === row.unitId);
      const moderationStatus = String(row?.moderation?.status || 'pending');
      const moderationChip = moderationStatus === 'approved'
        ? '<span style="font-size:10px;font-weight:700;background:#ecfdf5;color:#166534;border:1px solid #a7f3d0;padding:2px 8px;border-radius:999px;">APPROVED</span>'
        : moderationStatus === 'revise'
          ? '<span style="font-size:10px;font-weight:700;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:2px 8px;border-radius:999px;">REVISION NEEDED</span>'
          : '<span style="font-size:10px;font-weight:700;background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:2px 8px;border-radius:999px;">PENDING REVIEW</span>';
      const moderatedBy = row?.moderation?.moderatedBy || '';
      const moderatedAt = row?.moderation?.moderatedAt ? new Date(row.moderation.moderatedAt).toLocaleString() : '';
      const moderationNote = String(row?.moderation?.note || '').trim();
      return `
        <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
            <div style="font-size:13px;font-weight:700;color:var(--navy);">${_esc(unitMeta?.badge || row.unitId.toUpperCase())} · ${_esc(row.cycleId)}</div>
            ${moderationChip}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.6;">
            <strong style="color:var(--navy);">Goal:</strong> ${_esc(row.goal || '—')}<br/>
            <strong style="color:var(--navy);">Pathway:</strong> ${_esc(row.pathway || 'Not selected')}<br/>
            <strong style="color:var(--navy);">Reflection:</strong> ${_esc(row.reflection || '—')}<br/>
            <strong style="color:var(--navy);">Evidence:</strong> ${_esc(row.evidence || '—')}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.6;">
            Saved: ${_esc(row.savedAt ? new Date(row.savedAt).toLocaleString() : 'Unknown')}
            ${moderatedBy ? `<br/>Moderated by ${_esc(moderatedBy)}${moderatedAt ? ` · ${_esc(moderatedAt)}` : ''}` : ''}
            ${moderationNote ? `<br/>Note: ${_esc(moderationNote)}` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            <button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;border-color:#a7f3d0;color:#166534;" onclick="_openHeutagogyModerationModal('${student.uid}','${row.unitId}','${row.cycleId}','approved')">Approve</button>
            <button class="btn-prev" style="display:inline-flex;padding:5px 8px;font-size:11px;border-color:#fecaca;color:#991b1b;" onclick="_openHeutagogyModerationModal('${student.uid}','${row.unitId}','${row.cycleId}','revise')">Needs revision</button>
          </div>
        </div>
      `;
    }).join('')
    : '<div style="font-size:12px;color:var(--muted);">No heutagogy contracts recorded yet for this student.</div>';

  mount.innerHTML = `
    <div style="padding:40px;max-width:900px;margin:0 auto;animation:fadeIn 0.3s ease;">
      <button onclick="_loadAnalytics()" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:14px;margin-bottom:20px;font-family:var(--font-serif);">← Back to Cohort Overview</button>
      
      <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);padding:32px;margin-bottom:24px;display:flex;gap:24px;align-items:flex-start;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0;">
          ${student.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <h1 style="font-family:var(--font-heading);color:var(--navy);font-size:28px;margin-bottom:4px;">${student.name.split(' [')[0]}</h1>
          <div style="font-size:14px;color:var(--muted);font-family:var(--font-mono);margin-bottom:16px;">${student.email}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:-8px;margin-bottom:16px;">Student no: <strong style="color:var(--navy);">${_esc(student.studentNumber || 'N/A')}</strong></div>
          
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <span style="background:var(--cream2);padding:6px 12px;border-radius:8px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Progress:</strong> ${student.pct}%</span>
            <span style="background:var(--cream2);padding:6px 12px;border-radius:8px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Completed Units:</strong> ${student.completedCount}</span>
            <span style="background:${student.riskColor}20;color:${student.riskColor};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.riskColor}40;">Risk Level: ${student.riskLevel}</span>
            ${tutorialRiskBadge}
            <span style="background:${aiFlags.length ? '#fee2e2' : '#ecfdf5'};color:${aiFlags.length ? '#991b1b' : '#047857'};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${aiFlags.length ? '#fecaca' : '#a7f3d0'};">AI Flags: ${aiFlags.length}</span>
            <span style="background:#eff6ff;color:#1d4ed8;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #bfdbfe;">Reading Tasks: ${student.readingTaskSubmissionCount || 0}</span>
            <span style="background:#eef2ff;color:#3730a3;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #c7d2fe;">Report Grade: ${compiled.reportCard.grade}</span>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="_copyStudentProfileReport(${index})">📋 Copy Profile Report</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_downloadStudentProfileReport(${index})">⬇ Download Report (.txt)</button>
        ${nextLocked ? `<button class="btn-prev" style="display:inline-flex;border-color:#f59e0b;color:#92400e;" onclick="_openUnlockOverrideModal('${student.uid}','${nextLocked.unitId}','unlock')">🚀 Promote: Unlock ${nextLocked.unitBadge}</button>` : ''}
        <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:white;">
          <span style="font-size:12px;color:var(--muted);">ILP Support</span>
          <select onchange="_setStudentSupportMode(${index}, this.value)" style="padding:6px;border:1px solid var(--border);border-radius:6px;font-size:12px;">
            <option value="low" ${supportMode === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${supportMode === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${supportMode === 'high' ? 'selected' : ''}>High</option>
          </select>
          <span style="font-size:11px;font-weight:700;color:${saveStateUi.color};">${saveStateUi.text}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
        <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;">
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:10px;font-family:var(--font-sans);">🧾 Compiled Student Profile</h2>
          <div style="font-size:13px;color:var(--navy);line-height:1.7;">
            <div><strong>Strengths:</strong> ${compiled.summary.strengths.length ? compiled.summary.strengths.join(', ') : 'None identified yet'}</div>
            <div><strong>Priority skills:</strong> ${compiled.summary.prioritySkills.length ? compiled.summary.prioritySkills.join(', ') : 'General consolidation'}</div>
            <div><strong>Escalations:</strong> ${compiled.summary.escalations}</div>
            <div style="margin-top:8px;"><strong>Risk factors:</strong></div>
            <ul style="margin:6px 0 0 18px;color:var(--muted);">
              ${(compiled.summary.riskFactors || []).length ? compiled.summary.riskFactors.map(f => `<li>${f}</li>`).join('') : '<li>No immediate risk factors identified.</li>'}
            </ul>
          </div>
        </div>
        <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;">
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:10px;font-family:var(--font-sans);">🗂️ Report Card</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:var(--navy);line-height:1.6;">
            <div><strong>Grade:</strong> ${compiled.reportCard.grade}</div>
            <div><strong>Progress:</strong> ${compiled.reportCard.progress}</div>
            <div><strong>Risk:</strong> ${compiled.reportCard.riskLevel}</div>
            <div><strong>Frustration:</strong> ${compiled.reportCard.frustration}</div>
            <div><strong>Annotations:</strong> ${compiled.reportCard.annotations}</div>
            <div><strong>AI flags:</strong> ${compiled.reportCard.aiFlags}</div>
            <div><strong>Weak skills:</strong> ${compiled.reportCard.weakSkills}</div>
          </div>
        </div>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">✍️ Reading Task Signals</h2>
          <div style="font-size:12px;color:var(--muted);">Latest update: <strong style="color:var(--navy);">${_esc(_lecturerWhenLabel(student.readingTaskLatestUpdatedAt))}</strong></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="background:#eff6ff;color:#1d4ed8;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #bfdbfe;">Captured: ${student.readingTaskSubmissionCount || 0}</span>
          <span style="background:${student.readingTaskReviewedCount ? '#ecfdf5' : '#f8fafc'};color:${student.readingTaskReviewedCount ? '#166534' : '#475569'};padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.readingTaskReviewedCount ? '#a7f3d0' : '#cbd5e1'};">Reviewed: ${student.readingTaskReviewedCount || 0}</span>
          <span style="background:${student.readingTaskPendingCount ? '#fffbeb' : '#f8fafc'};color:${student.readingTaskPendingCount ? '#92400e' : '#475569'};padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.readingTaskPendingCount ? '#fde68a' : '#cbd5e1'};">Pending review: ${student.readingTaskPendingCount || 0}</span>
          <span style="background:#ecfeff;color:#0f766e;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid #99f6e4;">Avg words: ${student.readingTaskAvgWords || 0}</span>
          <span style="background:${student.readingTaskLowWordCount ? '#fff7ed' : '#f8fafc'};color:${student.readingTaskLowWordCount ? '#9a3412' : '#475569'};padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.readingTaskLowWordCount ? '#fdba74' : '#cbd5e1'};">Low-word tasks: ${student.readingTaskLowWordCount || 0}</span>
          <span style="background:${student.readingTaskFlagCount ? '#fee2e2' : '#f8fafc'};color:${student.readingTaskFlagCount ? '#991b1b' : '#475569'};padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${student.readingTaskFlagCount ? '#fecaca' : '#cbd5e1'};">AI flags: ${student.readingTaskFlagCount || 0}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">${readingTaskRowsHtml}</div>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;margin-bottom:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:10px;font-family:var(--font-sans);">🔐 Unit Unlock Diagnostics</h2>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">This section explains exactly why each unit is locked/open for this student, including missing gate requirements and task-completion state.</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow:auto;">${lockRowsHtml}</div>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;margin-bottom:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:10px;font-family:var(--font-sans);">🧾 Override Accountability</h2>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">Every promoted unlock should include a clear justification and, where needed, a catch-up plan.</div>
        <div style="display:flex;flex-direction:column;gap:10px;">${overrideLogHtml}</div>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;margin-bottom:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:10px;font-family:var(--font-sans);">🎯 Individual Learning Plan (${compiled.ilp.horizon})</h2>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Mode: <strong style="color:var(--navy);">${compiled.ilp.supportLabel}</strong></div>
        <ol style="margin:0 0 12px 18px;font-size:13px;color:var(--navy);line-height:1.7;">
          ${compiled.ilp.actions.map((a) => `<li>${a}</li>`).join('')}
        </ol>
        <div style="font-size:12px;color:var(--muted);">Success markers: ${compiled.ilp.successMarkers.join(' · ')}</div>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:18px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🧭 Heutagogy Contracts & Moderation</h2>
          <div style="font-size:11px;color:var(--muted);">
            Total: <strong style="color:var(--navy);">${heutagogySummary.total}</strong> ·
            Approved: <strong style="color:#166534;">${heutagogySummary.approved}</strong> ·
            Pending: <strong style="color:#92400e;">${heutagogySummary.pending}</strong> ·
            Evidence: <strong style="color:var(--navy);">${heutagogySummary.evidenceCount}/${heutagogySummary.total}</strong>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">Moderate each learning contract with a decision and accountability note so tutors/students can action revisions clearly.</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-height:360px;overflow:auto;">${heutagogyRowsHtml}</div>
      </div>

      <!-- Skill profile grid -->
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:var(--font-sans);text-transform:uppercase;letter-spacing:1px;">
          🧠 Skill Profile
          ${student.highPerformer ? '<span style="font-size:12px;background:rgba(16,185,129,0.1);color:#10b981;padding:3px 8px;border-radius:6px;margin-left:8px;">★ High Performer</span>' : ''}
          ${student.frustrationIdx >= 3 ? `<span style="font-size:12px;background:rgba(245,158,11,0.1);color:#f59e0b;padding:3px 8px;border-radius:6px;margin-left:8px;">⚠ Frustration ${student.frustrationIdx.toFixed(1)}/5</span>` : ''}
        </h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
    const status = student.skillStatus[id] || 'untested';
    const avg = student.skillAvgs[id];
    const colors = { untested: '#94a3b8', weak: '#ef4444', developing: '#f59e0b', strong: '#10b981' };
    const labels = { untested: 'Not assessed', weak: 'Weak', developing: 'Developing', strong: 'Strong' };
    const col = colors[status];
    const inRem = student.needsRem.includes(id);
    return `<div style="background:white;border:1px solid var(--border);border-left:3px solid ${col};border-radius:10px;padding:12px;">
              <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">${label}</div>
              <span style="font-size:11px;font-weight:700;color:${col};background:${col}18;padding:2px 7px;border-radius:4px;">${labels[status]}</span>
              ${avg != null ? `<div style="margin-top:8px;height:3px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="width:${Math.round(avg / 5 * 100)}%;height:100%;background:${col};"></div></div><div style="font-size:10px;color:var(--muted);margin-top:4px;">${avg}/5</div>` : ''}
              ${inRem ? '<div style="font-size:10px;color:#ef4444;margin-top:4px;font-weight:700;">⚠ Needs focus</div>' : ''}
            </div>`;
  }).join('')}
        </div>
        ${student.studyTopics.length ? `<div style="margin-top:12px;font-size:12px;color:var(--muted);">
          Study Buddy topics: ${student.studyTopics.map(t => `<span style="background:var(--cream2);border:1px solid var(--border);padding:2px 8px;border-radius:4px;margin-right:4px;">${t.replace(/_/g, ' ')}</span>`).join('')}
        </div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">Diagnostic Assessment</h2>
          <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:20px;">
            <ul style="padding-left:20px;font-size:14px;color:var(--red);line-height:1.6;">
              ${factorsHtml}
            </ul>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:13px;">
              <span style="color:var(--muted);">Avg Reported Text Difficulty:</span>
              <strong style="color:var(--navy);">${student.avgDifficulty} / 5</strong>
            </div>
          </div>
        </div>

        <div>
          <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">Reading Engagement (${student.totalAnnotations} Notes)</h2>
          <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:20px;max-height:300px;overflow-y:auto;">
            ${notesHtml.length > 0 ? notesHtml.join('') : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No active reading annotations recorded yet.</p>'}
          </div>
        </div>
      </div>

      <div style="margin-top:24px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:12px;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:1px;">🛡️ Writing Integrity Profile</h2>
        <div style="background:white;border-radius:12px;border:1px solid var(--border);padding:20px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;">
            <span style="background:var(--cream2);padding:6px 10px;border-radius:6px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Analyzed submissions:</strong> ${aiEvents.length}</span>
            <span style="background:var(--cream2);padding:6px 10px;border-radius:6px;font-size:12px;color:var(--navy);border:1px solid var(--border);"><strong>Average suspicion:</strong> ${student.aiAvgScore || 0}/100</span>
            <span style="background:${aiFlags.length ? '#fee2e2' : '#ecfdf5'};color:${aiFlags.length ? '#991b1b' : '#047857'};padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700;border:1px solid ${aiFlags.length ? '#fecaca' : '#a7f3d0'};">
              ${aiFlags.length ? `High-risk flags: ${aiFlags.length}` : 'No high-risk flags'}
            </span>
          </div>
          <ul style="padding-left:20px;font-size:13px;line-height:1.6;color:${aiFlags.length ? '#7f1d1d' : 'var(--muted)'};margin:0;">
            ${aiFlagsHtml}
          </ul>
          <p style="font-size:12px;color:var(--muted);margin-top:10px;margin-bottom:0;">
            Use this as an early warning signal and combine with rubric-based judgement before escalating.
          </p>
        </div>
      </div>

      <div id="student-deep-dive-mount">
        <div style="text-align:center;padding:30px;color:var(--muted);">
          <div class="rec-spinner" style="width:20px;height:20px;margin:0 auto 8px auto;"></div>
          Loading comprehensive activity profile...
        </div>
      </div>
    </div>
  `;

  // Async load the deep-dive data and inject it
  renderStudentDeepDive(student).then((html) => {
    const ddMount = document.getElementById('student-deep-dive-mount');
    if (ddMount) ddMount.innerHTML = html;
  }).catch((err) => {
    const ddMount = document.getElementById('student-deep-dive-mount');
    if (ddMount) ddMount.innerHTML = `<div style="padding:20px;color:var(--muted);font-size:12px;">Could not load activity profile: ${err?.message || 'Unknown error'}</div>`;
  });
};

window._setStudentSupportMode = async (index, mode) => {
  const student = _cachedStudents[index];
  if (!student) return;
  const safeMode = ['low', 'medium', 'high'].includes(mode) ? mode : 'medium';
  _studentSupportModeByUid[student.uid] = safeMode;
  if (_studentSupportSaveTimerByUid[student.uid]) {
    clearTimeout(_studentSupportSaveTimerByUid[student.uid]);
    _studentSupportSaveTimerByUid[student.uid] = null;
  }
  _studentSupportSaveStateByUid[student.uid] = 'saving';
  window._renderStudentProfile(index);
  try {
    await set(ref(db, `analytics/student-support-modes/${student.uid}`), {
      mode: safeMode,
      updatedAt: new Date().toISOString(),
    });
    _studentSupportSaveStateByUid[student.uid] = 'saved';
    _studentSupportSaveTimerByUid[student.uid] = setTimeout(() => {
      _studentSupportSaveStateByUid[student.uid] = 'idle';
      _studentSupportSaveTimerByUid[student.uid] = null;
      const active = _cachedStudents[index];
      if (active?.uid === student.uid) {
        window._renderStudentProfile(index);
      }
    }, 2000);
  } catch {
    _studentSupportSaveStateByUid[student.uid] = 'error';
  }
  window._renderStudentProfile(index);
};

window._copyStudentProfileReport = async (index) => {
  const student = _cachedStudents[index];
  if (!student) return;
  const supportMode = _studentSupportModeByUid[student.uid] || 'medium';
  const compiled = _compileStudentProfile(student, supportMode);
  const text = _profileExportText(student, compiled);
  try {
    await navigator.clipboard.writeText(text);
    _showLecturerToast('Student profile report copied.', 'success', 2400);
  } catch {
    _showLecturerToast('Copy failed on this device.', 'warn', 2800);
  }
};

window._downloadStudentProfileReport = (index) => {
  const student = _cachedStudents[index];
  if (!student) return;
  const supportMode = _studentSupportModeByUid[student.uid] || 'medium';
  const compiled = _compileStudentProfile(student, supportMode);
  const text = _profileExportText(student, compiled);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `student-profile-${student.name.split(' ')[0].toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

window._openRejectPromotionModal = (studentUid, unitId, requestId = '') => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const rid = String(requestId || '').trim();
  if (!uid || !targetUnitId) return;
  const student = _cachedStudents.find((s) => s.uid === uid);
  const unit = UNITS.find((u) => u.id === targetUnitId);
  if (!student || !unit) return;

  document.getElementById('reject-promotion-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'reject-promotion-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="width:min(640px,100%);background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 18px 40px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 10px 0;color:#991b1b;">Reject Promotion Request</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
        Student: <strong style="color:var(--navy);">${_esc(student.name)}</strong><br/>
        Student no: <strong style="color:var(--navy);">${_esc(student.studentNumber || 'N/A')}</strong><br/>
        Unit: <strong style="color:var(--navy);">${_esc(unit.badge)} · ${_esc(unit.title)}</strong>
      </div>
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">Rejection reason (required)</label>
      <textarea id="reject-promotion-reason" rows="4" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="State what is missing before promotion can be approved..."></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('reject-promotion-overlay')?.remove()">Cancel</button>
        <button class="btn-prev" style="display:inline-flex;border-color:#fecaca;color:#991b1b;" onclick="_submitRejectPromotion('${uid}','${targetUnitId}','${rid}')">Save Rejection</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window._submitRejectPromotion = async (studentUid, unitId, requestId = '') => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const rid = String(requestId || '').trim();
  if (!uid || !targetUnitId) return;

  const reason = String(document.getElementById('reject-promotion-reason')?.value || '').trim();
  if (!reason) {
    _showLecturerToast('Enter a rejection reason for accountability.', 'warn', 2600);
    return;
  }

  const student = _cachedStudents.find((s) => s.uid === uid);
  const unit = UNITS.find((u) => u.id === targetUnitId);
  const existing = student?.progressObj?.__promotionRequests?.[targetUnitId] || {};
  const requestedDayKey = existing?.requestedDayKey || null;
  const requestedRequestId = rid || existing?.requestId || null;
  const lecturerName = String(window.STATE?.user?.displayName || window.STATE?.user?.email || 'Lecturer').split(' [')[0];
  const lecturerUid = window.STATE?.user?.uid || null;
  const nowIso = new Date().toISOString();

  _showLecturerProcessing('Saving rejection...');
  try {
    await set(ref(db, `users/${uid}/state/progress/__promotionRequests/${targetUnitId}`), {
      ...existing,
      targetUnitId,
      status: 'rejected',
      reviewerUid: lecturerUid,
      reviewerName: lecturerName,
      reviewedAt: nowIso,
      rejectionReason: reason,
      requestId: requestedRequestId,
      requestedDayKey,
    });

    if (requestedDayKey && requestedRequestId) {
      await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestedRequestId}/status`), 'rejected');
      await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestedRequestId}/reviewedAt`), nowIso);
      await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestedRequestId}/reviewerName`), lecturerName);
      await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestedRequestId}/rejectionReason`), reason);
    }

    await _sendPromotionWhatsAppWebhook('promotion_request_reviewed', {
      decision: 'rejected',
      uid,
      studentName: student?.name || '',
      studentNumber: student?.studentNumber || '',
      targetUnitId,
      targetUnitBadge: unit?.badge || targetUnitId.toUpperCase(),
      targetUnitTitle: unit?.title || targetUnitId,
      requestId: requestedRequestId,
      requestedDayKey,
      reason,
      reviewerName: lecturerName,
    });

    document.getElementById('reject-promotion-overlay')?.remove();
    _showLecturerToast(`Promotion request rejected for ${unit?.badge || targetUnitId.toUpperCase()}.`, 'warn', 2400);
    _finishLecturerProcessing('success', 'Rejection saved', 1100);
    await _loadAnalytics();
    const refreshedIndex = _cachedStudents.findIndex((s) => s.uid === uid);
    if (refreshedIndex >= 0) {
      window._renderStudentProfile(refreshedIndex);
    }
  } catch (err) {
    _showLecturerToast(`Could not save rejection: ${err.message || 'Unknown error'}`, 'warn', 3600);
    _finishLecturerProcessing('warn', 'Rejection failed', 1400);
  }
};

window._openHeutagogyModerationModal = (studentUid, unitId, cycleId, decision = 'approved') => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const targetCycleId = String(cycleId || '').trim();
  const status = decision === 'revise' ? 'revise' : 'approved';
  if (!uid || !targetUnitId || !targetCycleId) return;

  const student = _cachedStudents.find((s) => s.uid === uid);
  if (!student) return;

  document.getElementById('heutagogy-moderation-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'heutagogy-moderation-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="width:min(640px,100%);background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 18px 40px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 10px 0;color:var(--navy);">Heutagogy Contract Moderation</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
        Student: <strong style="color:var(--navy);">${_esc(student.name)}</strong><br/>
        Unit: <strong style="color:var(--navy);">${_esc(targetUnitId.toUpperCase())}</strong><br/>
        Contract: <strong style="color:var(--navy);">${_esc(targetCycleId)}</strong>
      </div>
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">Decision</label>
      <select id="heutagogy-moderation-status" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:10px;background:white;">
        <option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option>
        <option value="revise" ${status === 'revise' ? 'selected' : ''}>Needs revision</option>
      </select>
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">Moderation note (required)</label>
      <textarea id="heutagogy-moderation-note" rows="4" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="State what was strong and what should be improved next cycle..."></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('heutagogy-moderation-overlay')?.remove()">Cancel</button>
        <button class="btn-next" style="display:inline-flex;" onclick="_submitHeutagogyModeration('${uid}','${targetUnitId}','${targetCycleId}')">Save Moderation</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window._submitHeutagogyModeration = async (studentUid, unitId, cycleId) => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const targetCycleId = String(cycleId || '').trim();
  if (!uid || !targetUnitId || !targetCycleId) return;

  const statusRaw = String(document.getElementById('heutagogy-moderation-status')?.value || '').trim().toLowerCase();
  const status = statusRaw === 'revise' ? 'revise' : 'approved';
  const note = String(document.getElementById('heutagogy-moderation-note')?.value || '').trim();
  if (!note) {
    _showLecturerToast('Enter a moderation note before saving.', 'warn', 2600);
    return;
  }

  const lecturerName = String(window.STATE?.user?.displayName || window.STATE?.user?.email || 'Lecturer').split(' [')[0];
  const lecturerUid = window.STATE?.user?.uid || null;
  const nowIso = new Date().toISOString();
  const logKey = `${nowIso.slice(0, 10)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  _showLecturerProcessing('Saving heutagogy moderation...');
  try {
    const record = {
      status,
      note,
      moderatedBy: lecturerName,
      moderatedByUid: lecturerUid,
      moderatedAt: nowIso,
    };

    await set(ref(db, `users/${uid}/state/progress/__heutagogyModeration/${targetUnitId}/${targetCycleId}`), record);
    await set(ref(db, `analytics/heutagogy-moderation/${uid}/${targetUnitId}/${targetCycleId}/${logKey}`), {
      ...record,
      uid,
      unitId: targetUnitId,
      cycleId: targetCycleId,
    });

    document.getElementById('heutagogy-moderation-overlay')?.remove();
    _showLecturerToast(`Heutagogy contract marked as ${status === 'approved' ? 'approved' : 'needs revision'}.`, status === 'approved' ? 'success' : 'warn', 2400);
    _finishLecturerProcessing('success', 'Moderation saved', 1000);

    await _loadAnalytics();
    const refreshedIndex = _cachedStudents.findIndex((s) => s.uid === uid);
    if (refreshedIndex >= 0) {
      window._renderStudentProfile(refreshedIndex);
    }
  } catch (err) {
    _showLecturerToast(`Could not save moderation: ${err.message || 'Unknown error'}`, 'warn', 3600);
    _finishLecturerProcessing('warn', 'Moderation failed', 1200);
  }
};

function _csvCell(value) {
  const raw = String(value == null ? '' : value);
  return `"${raw.replace(/"/g, '""')}"`;
}

window._downloadAttendanceRegisterCsv = () => {
  const rows = Array.isArray(_cachedAttendanceRegisterRows) ? _cachedAttendanceRegisterRows : [];
  const dateKey = String(_cachedAttendanceRegisterDateKey || _attendanceAnalyticsSelectedDate || new Date().toISOString().slice(0, 10)).trim();
  if (!rows.length) {
    _showLecturerToast('Load an attendance register first, then export CSV.', 'warn', 2600);
    return;
  }

  const header = [
    'date',
    'student_name',
    'student_number',
    'email',
    'present',
    'checked_in',
    'latest_checkin_at',
    'latest_session_type',
    'qr_scans',
    'total_minutes',
    'class_minutes',
    'tutorial_minutes',
    'source',
  ];
  const csvRows = rows.map((row) => [
    _csvCell(dateKey),
    _csvCell(row.name || ''),
    _csvCell(row.studentNumber || ''),
    _csvCell(row.email || ''),
    _csvCell(row.present ? 'yes' : 'no'),
    _csvCell(row.hasQrCheckin ? 'yes' : 'no'),
    _csvCell(row.latestAt || ''),
    _csvCell(row.latestType || ''),
    _csvCell(row.qrCount || 0),
    _csvCell(row.totalMinutes || 0),
    _csvCell(row.classMinutes || 0),
    _csvCell(row.tutorialMinutes || 0),
    _csvCell(_cachedAttendanceRegisterSourceLabel || ''),
  ].join(','));

  const csvText = [header.join(','), ...csvRows].join('\n');
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-register-${dateKey || new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Excel attendance export (single date) ──
window._downloadAttendanceExcel = () => {
  const rows = Array.isArray(_cachedAttendanceRegisterRows) ? _cachedAttendanceRegisterRows : [];
  const dateKey = String(_cachedAttendanceRegisterDateKey || _attendanceAnalyticsSelectedDate || new Date().toISOString().slice(0, 10)).trim();
  if (!rows.length) {
    _showLecturerToast('Load an attendance register first, then export.', 'warn', 2600);
    return;
  }

  const headers = ['Student Name', 'Student Number', 'Email', 'Present', 'QR Checked In', 'Latest Check-in', 'Session Type', 'QR Scans', 'Total Minutes', 'Class Minutes', 'Tutorial Minutes'];
  const dataRows = rows.map((r) => [
    r.name || '',
    r.studentNumber || '',
    r.email || '',
    r.present ? 'Yes' : 'No',
    r.hasQrCheckin ? 'Yes' : 'No',
    r.latestAt || '',
    r.latestType || '',
    r.qrCount || 0,
    r.totalMinutes || 0,
    r.classMinutes || 0,
    r.tutorialMinutes || 0,
  ]);

  downloadXlsx(
    [{ name: `Attendance ${dateKey}`, headers, rows: dataRows }],
    `attendance-${dateKey}.xlsx`
  );
};

// ── Excel full attendance report (all dates, all students) ──
window._downloadAttendanceFullExcel = () => {
  const students = Array.isArray(_cachedStudents) ? _cachedStudents : [];
  if (!students.length) {
    _showLecturerToast('No student data loaded. Open the dashboard first.', 'warn', 2600);
    return;
  }

  // Collect all unique attendance dates across all students
  const allDates = new Set();
  for (const s of students) {
    const byDate = s.attendanceData?.byDate || {};
    for (const dk of Object.keys(byDate)) allDates.add(dk);
  }
  const sortedDates = [...allDates].sort();

  if (!sortedDates.length) {
    _showLecturerToast('No attendance dates found.', 'warn', 2600);
    return;
  }

  // Sheet 1: Summary — one row per student, columns for each date (Present/Absent)
  const summaryHeaders = ['Student Name', 'Student Number', 'Email', 'Tutorial Group', ...sortedDates, 'Days Present', 'Days Absent', 'Attendance %'];
  const summaryRows = students.map((s) => {
    const byDate = s.attendanceData?.byDate || {};
    let present = 0;
    const dateCells = sortedDates.map((dk) => {
      const rec = byDate[dk];
      const qrCheckins = rec?.qrCheckins || [];
      const checked = Array.isArray(qrCheckins) && qrCheckins.length > 0;
      if (checked) present++;
      return checked ? 'P' : 'A';
    });
    const absent = sortedDates.length - present;
    const pct = sortedDates.length > 0 ? Math.round((present / sortedDates.length) * 100) : 0;
    return [
      s.name || '',
      s.studentNumber || '',
      s.email || '',
      s.tutorialGroup || '',
      ...dateCells,
      present,
      absent,
      pct,
    ];
  });

  // Sheet 2: Detail — one row per student per date
  const detailHeaders = ['Date', 'Student Name', 'Student Number', 'Email', 'Tutorial Group', 'QR Checked In', 'Latest Check-in', 'Session Type', 'QR Scans', 'Total Minutes', 'Class Minutes', 'Tutorial Minutes'];
  const detailRows = [];
  for (const dk of sortedDates) {
    for (const s of students) {
      const rec = s.attendanceData?.byDate?.[dk] || null;
      const qrCheckins = rec?.qrCheckins || [];
      const hasQr = Array.isArray(qrCheckins) && qrCheckins.length > 0;
      const latestQr = hasQr ? qrCheckins[qrCheckins.length - 1] : null;
      detailRows.push([
        dk,
        s.name || '',
        s.studentNumber || '',
        s.email || '',
        s.tutorialGroup || '',
        hasQr ? 'Yes' : 'No',
        latestQr?.at || '',
        latestQr?.sessionType || '',
        qrCheckins.length,
        Math.max(0, Math.round((rec?.totalSeconds || 0) / 60)),
        Math.max(0, Math.round((rec?.classSeconds || 0) / 60)),
        Math.max(0, Math.round((rec?.tutorialSeconds || 0) / 60)),
      ]);
    }
  }

  // Sheet 3: Stats — per-date summary
  const statsHeaders = ['Date', 'Total Students', 'Present', 'Absent', 'Attendance %'];
  const statsRows = sortedDates.map((dk) => {
    let present = 0;
    for (const s of students) {
      const rec = s.attendanceData?.byDate?.[dk];
      const qr = rec?.qrCheckins || [];
      if (Array.isArray(qr) && qr.length > 0) present++;
    }
    const absent = students.length - present;
    const pct = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
    return [dk, students.length, present, absent, pct];
  });

  downloadXlsx(
    [
      { name: 'Summary', headers: summaryHeaders, rows: summaryRows },
      { name: 'Detail', headers: detailHeaders, rows: detailRows },
      { name: 'Daily Stats', headers: statsHeaders, rows: statsRows },
    ],
    `attendance-full-report-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

window._downloadOverrideActionsCsv = (scope = 'recent') => {
  const useAll = String(scope || '').toLowerCase() === 'all';
  const rows = useAll
    ? (Array.isArray(_cachedAllOverrideRows) ? _cachedAllOverrideRows : [])
    : (Array.isArray(_cachedRecentOverrideRows) ? _cachedRecentOverrideRows : []);
  if (!rows.length) {
    _showLecturerToast('Generate override actions first, then export CSV.', 'warn', 2600);
    return;
  }
  const header = [
    'timestamp',
    'action',
    'student_name',
    'student_number',
    'student_uid',
    'unit_id',
    'unit_badge',
    'unit_title',
    'justification',
    'catch_up_required',
    'catch_up_plan',
    'lecturer_name',
    'day_key',
  ].join(',');

  const body = rows.map((row) => [
    _csvCell(row.at || ''),
    _csvCell(row.action || ''),
    _csvCell(row.studentName || ''),
    _csvCell(row.studentNumber || ''),
    _csvCell(row.uid || ''),
    _csvCell(row.unitId || ''),
    _csvCell(row.unitBadge || ''),
    _csvCell(row.unitTitle || ''),
    _csvCell(row.justification || ''),
    _csvCell(row.catchUpRequired ? 'yes' : 'no'),
    _csvCell(row.catchUpPlan || ''),
    _csvCell(row.lecturerName || ''),
    _csvCell(row.dayKey || ''),
  ].join(',')).join('\n');

  const csvText = `${header}\n${body}`;
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${useAll ? 'override-actions-all' : 'override-actions-recent'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

window._openUnlockOverrideModal = (studentUid, unitId, mode = 'unlock') => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const actionMode = mode === 'relock' ? 'relock' : 'unlock';
  if (!uid || !targetUnitId) return;
  const student = _cachedStudents.find((s) => s.uid === uid);
  const unit = UNITS.find((u) => u.id === targetUnitId);
  if (!student || !unit) return;

  document.getElementById('unlock-override-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'unlock-override-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="width:min(640px,100%);background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 18px 40px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 10px 0;color:var(--navy);">${actionMode === 'unlock' ? 'Unlock Override' : 'Relock Unit'}</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
        Student: <strong style="color:var(--navy);">${_esc(student.name)}</strong><br/>
        Student no: <strong style="color:var(--navy);">${_esc(student.studentNumber || 'N/A')}</strong><br/>
        Unit: <strong style="color:var(--navy);">${_esc(unit.badge)} · ${_esc(unit.title)}</strong>
      </div>
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">Justification (required)</label>
      <textarea id="unlock-override-justification" rows="3" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="Provide clear academic justification..."></textarea>
      ${actionMode === 'unlock' ? `
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <input id="unlock-override-catchup-required" type="checkbox" />
            Catch-up plan required
          </label>
        </div>
        <label style="display:block;font-size:12px;color:var(--muted);margin:8px 0 4px 0;">Catch-up plan (required if checked)</label>
        <textarea id="unlock-override-catchup" rows="3" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="State what the student must complete and by when..."></textarea>
      ` : ''}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('unlock-override-overlay')?.remove()">Cancel</button>
        <button class="btn-next" style="display:inline-flex;" onclick="_submitUnlockOverride('${uid}','${targetUnitId}','${actionMode}')">${actionMode === 'unlock' ? 'Save & Unlock' : 'Save & Relock'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window._openBulkPromoteModal = () => {
  const selectedStudents = _cachedStudents.filter((s) => _bulkPromoteSelectedUids.has(s.uid));
  const eligibleRows = selectedStudents
    .map((student) => ({ student, locked: _nextLockedForStudent(student) }))
    .filter((r) => r.locked);

  if (!selectedStudents.length) {
    _showLecturerToast('Select at least one student first.', 'warn', 2400);
    return;
  }
  if (!eligibleRows.length) {
    _showLecturerToast('Select students who currently have a locked next unit.', 'warn', 2800);
    return;
  }

  document.getElementById('bulk-promote-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bulk-promote-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="width:min(760px,100%);background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:0 18px 40px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 10px 0;color:var(--navy);">Bulk Promote Selected Students</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
        Selected: <strong style="color:var(--navy);">${selectedStudents.length}</strong> · Eligible now: <strong style="color:#92400e;">${eligibleRows.length}</strong><br/>
        A single accountability note below will be applied to each promoted student.
      </div>
      <div style="max-height:170px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:10px;background:#f8fafc;">
        ${eligibleRows.map((r) => `<div style="font-size:12px;color:var(--navy);padding:5px 6px;border-bottom:1px solid rgba(148,163,184,.25);">${_esc(r.student.name.split(' [')[0])} · Student no: ${_esc(r.student.studentNumber || 'N/A')} → ${_esc(r.locked.unitBadge)} ${_esc(r.locked.unitTitle)}</div>`).join('')}
      </div>
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">Justification (required)</label>
      <textarea id="bulk-promote-justification" rows="3" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="Provide clear academic justification for this bulk promotion..."></textarea>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input id="bulk-promote-catchup-required" type="checkbox" />
          Catch-up plan required
        </label>
      </div>
      <label style="display:block;font-size:12px;color:var(--muted);margin:8px 0 4px 0;">Catch-up plan (required if checked)</label>
      <textarea id="bulk-promote-catchup" rows="3" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;font-size:13px;" placeholder="State what students must complete and by when..."></textarea>
      <div style="margin-top:10px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;">
        You are about to promote <strong>${eligibleRows.length}</strong> student${eligibleRows.length === 1 ? '' : 's'}.
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="document.getElementById('bulk-promote-overlay')?.remove()">Cancel</button>
        <button class="btn-next" style="display:inline-flex;" onclick="_submitBulkPromote()">Save & Promote ${eligibleRows.length}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

async function _applyUnlockOverrideRecord({ uid, targetUnitId, actionMode, justification, catchUpRequired, catchUpPlan }) {
  const lecturerName = String(window.STATE?.user?.displayName || window.STATE?.user?.email || 'Lecturer').split(' [')[0];
  const lecturerUid = window.STATE?.user?.uid || null;
  const nowIso = new Date().toISOString();
  const dayKey = nowIso.slice(0, 10);
  const logKey = `${targetUnitId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const student = _cachedStudents.find((s) => s.uid === uid);
  const unit = UNITS.find((u) => u.id === targetUnitId);

  if (actionMode === 'unlock') {
    await set(ref(db, `users/${uid}/state/progress/__unlockOverrides/${targetUnitId}`), true);
  } else {
    await remove(ref(db, `users/${uid}/state/progress/__unlockOverrides/${targetUnitId}`));
  }

  await set(ref(db, `users/${uid}/state/progress/__unlockOverridesMeta/${targetUnitId}`), {
    active: actionMode === 'unlock',
    justification,
    catchUpRequired,
    catchUpPlan: catchUpRequired ? catchUpPlan : '',
    lecturerUid,
    lecturerName,
    action: actionMode,
    updatedAt: nowIso,
  });

  await set(ref(db, `analytics/unlock-overrides/${dayKey}/${uid}/${logKey}`), {
    uid,
    studentName: student?.name || '',
    studentNumber: student?.studentNumber || '',
    unitId: targetUnitId,
    action: actionMode,
    justification,
    catchUpRequired,
    catchUpPlan: catchUpRequired ? catchUpPlan : '',
    lecturerUid,
    lecturerName,
    at: nowIso,
  });

  const existingPromotionRequest = student?.progressObj?.__promotionRequests?.[targetUnitId] || {};
  await set(ref(db, `users/${uid}/state/progress/__promotionRequests/${targetUnitId}`), {
    ...existingPromotionRequest,
    targetUnitId,
    status: actionMode === 'unlock' ? 'approved' : 'relocked',
    reviewedAt: nowIso,
    reviewerUid: lecturerUid,
    reviewerName: lecturerName,
  });

  const requestedDayKey = existingPromotionRequest?.requestedDayKey || null;
  const requestId = existingPromotionRequest?.requestId || null;
  if (requestedDayKey && requestId) {
    await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestId}/status`), actionMode === 'unlock' ? 'approved' : 'relocked');
    await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestId}/reviewedAt`), nowIso);
    await set(ref(db, `analytics/promotion-requests/${requestedDayKey}/${uid}/${requestId}/reviewerName`), lecturerName);
  }

  await _sendPromotionWhatsAppWebhook('promotion_request_reviewed', {
    decision: actionMode === 'unlock' ? 'approved' : 'relocked',
    uid,
    studentName: student?.name || '',
    studentNumber: student?.studentNumber || '',
    targetUnitId,
    targetUnitBadge: unit?.badge || targetUnitId.toUpperCase(),
    targetUnitTitle: unit?.title || targetUnitId,
    requestId,
    requestedDayKey,
    reviewerName: lecturerName,
    justification,
    catchUpRequired,
    catchUpPlan: catchUpRequired ? catchUpPlan : '',
  });
}

window._submitBulkPromote = async () => {
  const selectedStudents = _cachedStudents.filter((s) => _bulkPromoteSelectedUids.has(s.uid));
  const eligibleRows = selectedStudents
    .map((student) => ({ student, locked: _nextLockedForStudent(student) }))
    .filter((r) => r.locked);
  if (!eligibleRows.length) {
    _showLecturerToast('Select students who currently have a locked next unit.', 'warn', 2800);
    return;
  }

  const justification = String(document.getElementById('bulk-promote-justification')?.value || '').trim();
  const catchUpRequired = Boolean(document.getElementById('bulk-promote-catchup-required')?.checked);
  const catchUpPlan = String(document.getElementById('bulk-promote-catchup')?.value || '').trim();

  if (!justification) {
    _showLecturerToast('Enter a justification for accountability.', 'warn', 2600);
    return;
  }
  if (catchUpRequired && !catchUpPlan) {
    _showLecturerToast('Enter a catch-up plan when catch-up is marked as required.', 'warn', 3000);
    return;
  }

  _showLecturerProcessing(`Promoting ${eligibleRows.length} student${eligibleRows.length === 1 ? '' : 's'}...`);

  let successCount = 0;
  const failures = [];
  try {
    for (const row of eligibleRows) {
      try {
        await _applyUnlockOverrideRecord({
          uid: row.student.uid,
          targetUnitId: row.locked.unitId,
          actionMode: 'unlock',
          justification,
          catchUpRequired,
          catchUpPlan,
        });
        successCount += 1;
      } catch (err) {
        failures.push(`${row.student.name.split(' [')[0]} (${row.locked.unitBadge})`);
      }
    }

    document.getElementById('bulk-promote-overlay')?.remove();
    if (successCount > 0) {
      _bulkPromoteSelectedUids.clear();
    }
    const summaryMessage = !failures.length
      ? `✅ Promotion complete. You have promoted ${successCount} student${successCount === 1 ? '' : 's'}.`
      : `⚠️ Promotion partially completed. You have promoted ${successCount} student${successCount === 1 ? '' : 's'}; failed for ${failures.length}: ${failures.join(', ')}`;

    _showLecturerToast(summaryMessage, failures.length ? 'warn' : 'success', failures.length ? 3200 : 2600);
    _finishLecturerProcessing(failures.length ? 'warn' : 'success', failures.length ? 'Completed with issues' : 'Promotion complete', failures.length ? 1400 : 1200);

    try {
      await _loadAnalytics();
    } catch {
      // keep confirmation visible even if refresh fails
    }

    if (!failures.length) {
      return;
    }
  } finally {
    const overlay = document.getElementById('lecturer-processing-overlay');
    if (overlay && overlay.style.display !== 'none' && overlay.dataset.finishing !== '1') {
      _hideLecturerProcessing();
    }
  }
};

window._submitUnlockOverride = async (studentUid, unitId, mode = 'unlock') => {
  const uid = String(studentUid || '').trim();
  const targetUnitId = String(unitId || '').trim();
  const actionMode = mode === 'relock' ? 'relock' : 'unlock';
  if (!uid || !targetUnitId) return;

  const justification = String(document.getElementById('unlock-override-justification')?.value || '').trim();
  const catchUpRequired = actionMode === 'unlock'
    ? Boolean(document.getElementById('unlock-override-catchup-required')?.checked)
    : false;
  const catchUpPlan = actionMode === 'unlock'
    ? String(document.getElementById('unlock-override-catchup')?.value || '').trim()
    : '';

  if (!justification) {
    _showLecturerToast('Enter a justification for accountability.', 'warn', 2600);
    return;
  }
  if (actionMode === 'unlock' && catchUpRequired && !catchUpPlan) {
    _showLecturerToast('Enter a catch-up plan when catch-up is marked as required.', 'warn', 3000);
    return;
  }

  _showLecturerProcessing(actionMode === 'unlock' ? 'Saving unlock override...' : 'Saving relock override...');
  try {
    await _applyUnlockOverrideRecord({
      uid,
      targetUnitId,
      actionMode,
      justification,
      catchUpRequired,
      catchUpPlan,
    });

    document.getElementById('unlock-override-overlay')?.remove();
    _showLecturerToast(actionMode === 'unlock'
      ? `Override saved. ${targetUnitId.toUpperCase()} is now unlocked.`
      : `Override removed. ${targetUnitId.toUpperCase()} is relocked.`, actionMode === 'unlock' ? 'success' : 'warn', 2400);
    _finishLecturerProcessing('success', actionMode === 'unlock' ? 'Unlock saved' : 'Relock saved', 1100);

    await _loadAnalytics();
    const refreshedIndex = _cachedStudents.findIndex((s) => s.uid === uid);
    if (refreshedIndex >= 0) {
      window._renderStudentProfile(refreshedIndex);
    }
  } catch (err) {
    _showLecturerToast(`Could not save override record: ${err.message || 'Unknown error'}`, 'warn', 3600);
    _finishLecturerProcessing('warn', 'Save failed', 1400);
  }
};

// ── Shared helpers ────────────────────────────
function _lecturerSafeMs(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function _lecturerWhenLabel(value) {
  const ms = _lecturerSafeMs(value);
  if (!ms) return 'Unknown';
  const diffMs = Date.now() - ms;
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleString();
}

function _lecturerReadingTaskStatusMeta(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'reviewed') {
    return { label: 'Reviewed', bg: '#ecfdf5', fg: '#166534', border: '#a7f3d0' };
  }
  if (normalized === 'in_progress') {
    return { label: 'In progress', bg: '#fffbeb', fg: '#92400e', border: '#fde68a' };
  }
  if (normalized === 'empty') {
    return { label: 'Empty', bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' };
  }
  return { label: normalized ? normalized.replace(/_/g, ' ') : 'Captured', bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' };
}

function _metricCard(icon, label, value, color, options = {}) {
  const metricClass = String(options?.metricClass || '').trim().toLowerCase();
  const sourceLabel = String(options?.sourceLabel || '').trim();
  const badgePalette = {
    official: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
    partial: { bg: '#fef3c7', fg: '#92400e', border: '#fcd34d' },
    fallback: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
    operational: { bg: '#dbeafe', fg: '#1d4ed8', border: '#93c5fd' },
  };
  const badgeTone = badgePalette[metricClass] || badgePalette.operational;
  const badgeHtml = metricClass
    ? `<span style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:${badgeTone.bg};color:${badgeTone.fg};border:1px solid ${badgeTone.border};">${metricClass}</span>`
    : '';
  const sourceHtml = sourceLabel
    ? `<div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.45;">${sourceLabel}</div>`
    : '';
  return `<div style="background:white;padding:22px;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.04);border:1px solid var(--border);position:relative;overflow:hidden;">
    <div style="position:absolute;top:-8px;right:-8px;font-size:60px;opacity:0.05;">${icon}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
      <div style="font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:1px;font-weight:700;">${label}</div>
      ${badgeHtml}
    </div>
    <div style="font-size:34px;font-weight:800;color:${color};line-height:1;">${value}</div>
    ${sourceHtml}
  </div>`;
}

// ── Skill Analytics view ──────────────────────
window._loadSkillAnalytics = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  if (!_cachedStudents.length) {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading data… <a href="#" onclick="event.preventDefault();_loadAnalytics().then(()=>_loadSkillAnalytics())">Load Cohort first</a></div>';
    return;
  }

  // ── Delta scores: pre vs post micro-module ──
  const MODULE_NAMES = {
    'evidence-booster': 'Evidence Booster',
    'argument-builder': 'Argument Builder',
    'tone-workshop': 'Tone Workshop',
    'source-skills': 'Source Skills',
    'citation-guide': 'Citation Guide',
    'reading-strategies': 'Reading Strategies',
  };
  const MODULE_SKILL = {
    'evidence-booster': 'evidence_use',
    'argument-builder': 'argument_structure',
    'tone-workshop': 'academic_tone',
    'source-skills': 'source_evaluation',
    'citation-guide': 'citation_practice',
    'reading-strategies': 'critical_reading',
  };

  const deltaData = {};
  Object.entries(MODULE_NAMES).forEach(([mod]) => { deltaData[mod] = { deltas: [], count: 0 }; });

  // Outcome effectiveness from outcome records
  const effectivenessData = {};
  Object.keys(MODULE_NAMES).forEach(mod => {
    const closed = _cachedStudents.flatMap(st =>
      (st.outcomes || []).filter(o => o.moduleId === mod && o.status !== 'pending')
    );
    if (closed.length) {
      const improved = closed.filter(o => o.status === 'improved').length;
      effectivenessData[mod] = { pct: Math.round((improved / closed.length) * 100), total: closed.length };
    }
  });

  _cachedStudents.forEach(st => {
    Object.entries(MODULE_SKILL).forEach(([mod, skillId]) => {
      const entries = st.skillScores[skillId] || [];
      const postEntries = entries.filter(e => e.triggered_by === mod);
      if (!postEntries.length) return;
      // Find most recent pre-module score (no triggered_by)
      const preEntries = entries.filter(e => !e.triggered_by && new Date(e.timestamp) < new Date(postEntries[0].timestamp));
      if (!preEntries.length) return;
      const pre = preEntries[preEntries.length - 1].score;
      const post = postEntries[0].score;
      deltaData[mod].deltas.push(post - pre);
      deltaData[mod].count++;
    });
  });

  const deltaRows = Object.entries(MODULE_NAMES).map(([mod, name]) => {
    const d = deltaData[mod];
    if (!d.count) {
      return `<div class="lec-delta-row">
        <span class="lec-delta-name">${name}</span>
        <span style="color:var(--muted);font-size:13px;">No completions yet</span>
      </div>`;
    }
    const avg = d.deltas.reduce((a, b) => a + b, 0) / d.deltas.length;
    const color = avg > 0 ? '#10b981' : avg < 0 ? '#ef4444' : '#94a3b8';
    const sign = avg > 0 ? '+' : '';
    const eff = effectivenessData[mod];
    const effBadge = eff
      ? `<span style="font-size:11px;background:${eff.pct >= 60 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};color:${eff.pct >= 60 ? '#10b981' : '#ef4444'};padding:2px 8px;border-radius:4px;font-weight:700;white-space:nowrap;">${eff.pct}% effective · ${eff.total}</span>`
      : '';
    return `<div class="lec-delta-row">
      <span class="lec-delta-name">${name}</span>
      <span style="font-size:20px;font-weight:800;color:${color};min-width:70px;">${sign}${avg.toFixed(2)}</span>
      <span style="font-size:13px;color:var(--muted);">${d.count} student${d.count !== 1 ? 's' : ''}</span>
      ${effBadge}
      <div style="flex:1;background:var(--cream2);border-radius:4px;height:6px;overflow:hidden;max-width:200px;">
        <div style="width:${Math.min(100, Math.abs(avg) / 2 * 100)}%;height:100%;background:${color};border-radius:4px;"></div>
      </div>
    </div>`;
  }).join('');

  // ── Study topics across cohort ──────────────
  const topicFreq = {};
  _cachedStudents.forEach(st => {
    st.studyTopics.forEach(t => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
  });
  const topicPills = Object.entries(topicFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span style="background:var(--accent-dim);color:var(--accent);border:1px solid rgba(99,102,241,0.2);padding:5px 12px;border-radius:20px;font-size:13px;font-weight:600;margin:4px;">${t.replace(/_/g, ' ')} <span style="opacity:0.6;font-size:11px;">${n}</span></span>`)
    .join('') || '<span style="color:var(--muted);font-size:14px;">No Study Buddy interactions recorded yet.</span>';

  mount.innerHTML = `
    <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.4s ease;">
      <button onclick="_loadAnalytics()" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:14px;margin-bottom:24px;font-family:'Lora',serif;">← Back to Cohort Overview</button>

      <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:30px;margin-bottom:8px;">🧠 Skill Analytics</h1>
      <p style="color:var(--muted);font-size:15px;margin-bottom:32px;">Skill performance patterns and micro-module efficacy across ${_cachedStudents.length} students.</p>

      <!-- Module efficacy -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;margin-bottom:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:6px;font-family:'DM Sans',sans-serif;">📐 Micro-Module Efficacy (Delta Scores)</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px;">Average score improvement from before to after completing each micro-module. Positive = improvement.</p>
        <div class="lec-delta-table">${deltaRows}</div>
      </div>

      <!-- Study Buddy topics -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;margin-bottom:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:6px;font-family:'DM Sans',sans-serif;">💬 Study Buddy — What Students Are Asking About</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Topics detected from student Study Buddy conversations across the cohort.</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${topicPills}</div>
      </div>

      <!-- Per-skill weak student breakdown -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:28px;">
        <h2 style="font-size:16px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">👥 Students Flagged as Weak Per Skill</h2>
        ${Object.entries(SKILL_LABELS_LEC).map(([id, label]) => {
    const weakStudents = _cachedStudents.filter(st => st.skillStatus[id] === 'weak');
    if (!weakStudents.length) return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;"><span style="min-width:180px;color:var(--navy);font-weight:600;">${label}</span><span style="color:#10b981;">✓ No weak students</span></div>`;
    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <span style="min-width:180px;color:var(--navy);font-weight:600;font-size:14px;padding-top:4px;">${label}</span>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${weakStudents.map(st => `<span style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:3px 10px;border-radius:6px;font-size:12px;">${st.name.split(' [')[0].split(' ')[0]}</span>`).join('')}
            </div>
          </div>`;
  }).join('')}
      </div>
    </div>`;
};

window._loadPhaseAnalysis = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  try {
    mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Running deep phase analysis across cohort...</div>';

    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) {
      mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">No student data found for phase analysis.</div>';
      return;
    }

    const users = snap.val();

    let deviceData = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    let gapCounters = {
      'Sentence Construction': 0,
      'Evidence/Examples': 0,
      'Academic Register': 0,
      'Engagement with Reading': 0
    };

    let totalStudents = 0;

    for (const [uid, user] of Object.entries(users)) {
      if (!user.state) continue;
      totalStudents++;
      const s = user.state;

      if (s.deviceInfo && s.deviceInfo.type) {
        deviceData[s.deviceInfo.type] = (deviceData[s.deviceInfo.type] || 0) + 1;
      } else {
        deviceData.Unknown++;
      }

      if (s.progress) {
        Object.values(s.progress).forEach(p => {
          if (p.feedback && p.feedback.priority) {
            const prio = p.feedback.priority.toLowerCase();
            if (prio.includes('sentence') || prio.includes('run-on') || prio.includes('grammar')) gapCounters['Sentence Construction']++;
            if (prio.includes('example') || prio.includes('evidence')) gapCounters['Evidence/Examples']++;
            if (prio.includes('informal') || prio.includes('register') || prio.includes('vocabulary')) gapCounters['Academic Register']++;
            if (prio.includes('text') || prio.includes('reading') || prio.includes('task')) gapCounters['Engagement with Reading']++;
          }
        });
      }
    }

    let topGap = 'None identified yet';
    let maxGap = 0;
    Object.entries(gapCounters).forEach(([gap, count]) => {
      if (count > maxGap) { maxGap = count; topGap = gap; }
    });

    const mobilePct = totalStudents > 0 ? Math.round(((deviceData.Mobile + deviceData.Tablet) / totalStudents) * 100) : 0;

    mount.innerHTML = `
      <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.5s ease;">
        <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:32px;margin-bottom:12px;">🔍 Phase Robust Analysis</h1>
        <p style="font-size:16px;color:var(--muted);margin-bottom:32px;">Deep cognitive and structural insights automatically extracted from student writing tasks and device metrics.</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">📱 Device Analytics</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">${mobilePct > 50 ? '📱' : '💻'}</div>
              <div>
                <div style="font-size:28px;font-weight:700;color:var(--navy);line-height:1;">${mobilePct}% Mobile</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Desktop: ${deviceData.Desktop} | Mobile/Tablet: ${deviceData.Mobile + deviceData.Tablet}</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Pedagogical Implication:</strong> ${mobilePct > 50 ? 'With a high mobile user base, ensure long readings are broken into smaller chunks and avoid complex dragging interactions in upcoming assessments.' : 'Students are primarily using desktops; you can safely assign more complex, multi-window research tasks.'}
            </div>
          </div>

          <div style="background:white;padding:24px;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);">
            <h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:16px;font-family:'DM Mono',monospace;">🧠 Primary Cohort Knowledge Gap</h2>
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="font-size:48px;">⚠️</div>
              <div>
                <div style="font-size:24px;font-weight:700;color:var(--red);line-height:1.2;">${topGap}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:6px;">Identified in ${maxGap} writing submissions across the cohort.</div>
              </div>
            </div>
            <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:13px;color:#166534;line-height:1.5;">
              <strong>Recommended Intervention:</strong> ${topGap === 'Evidence/Examples' ? 'The next reading task should force students to highlight a specific quote before writing.' :
        topGap === 'Sentence Construction' ? 'Start the next contact session with a 10-minute sentence combining activity.' :
          topGap === 'Academic Register' ? 'Provide a formal vs informal translation exercise in the next tutorial.' :
            'Introduce a pre-reading quiz to force closer engagement with the text.'
      }
            </div>
          </div>
        </div>

        <h2 style="font-size:20px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">Curriculum Adaptation Engine</h2>
        <div style="background:white;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid var(--border);padding:24px;">
          <p style="font-size:14px;color:var(--navy);line-height:1.6;margin-bottom:16px;">Based on the recent phase analysis, the system recommends the following automated adaptations for the upcoming units to ensure autonomous learning:</p>
          
          <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:var(--navy);">
            <li><strong>For High-Performing Students (Levels 4-5):</strong> Automatically unlock a supplementary peer-reviewed text in the next unit instead of the Access Level text.</li>
            <li><strong>For Below-Standard Students (Levels 1-2):</strong> Inject a mandatory Argument Outline scaffolding step before they are permitted to draft their paragraph in the next unit.</li>
            <li><strong>For Mobile Users:</strong> Toggle Focus Mode by default to hide the sidebar and increase reading font sizes automatically to prevent eye strain.</li>
          </ul>
        </div>
      </div>
    `;

  } catch (err) {
    mount.innerHTML = `<div style="padding:40px;color:red;text-align:center;">Failed to run analysis: ${err.message}</div>`;
  }
};

// ── Resource Manager ──────────────────────────
const SKILL_LABELS_RES = {
  critical_reading: 'Critical Reading',
  evidence_use: 'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone: 'Academic Tone',
  source_evaluation: 'Source Evaluation',
  citation_practice: 'Citation & Integrity',
  research_skills: 'Research Skills',
  ai_literacy: 'AI Literacy',
};

window._loadResourceManager = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;

  mount.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading resource library…</div>';

  // Fetch all Firebase resources including unvetted (to show pending queue)
  let allFbRaw = [];
  try {
    const snap = await get(ref(db, 'resources'));
    if (snap.exists()) {
      allFbRaw = Object.entries(snap.val()).map(([id, d]) => ({ id, ...d }));
    }
  } catch { /* silent — no resources yet or no permission */ }

  const pending = allFbRaw.filter(r => !r.vetted && !r.removed);
  const approved = allFbRaw.filter(r => r.vetted && !r.removed);

  mount.innerHTML = `
    <div style="padding:40px;max-width:1100px;margin:0 auto;animation:fadeIn 0.4s ease;">
      <h1 style="font-family:'Playfair Display',serif;color:var(--navy);font-size:30px;margin-bottom:6px;">📚 Resource Library Manager</h1>
      <p style="color:var(--muted);font-size:14px;margin-bottom:32px;">
        Approve submitted resources, add new ones, and manage the student-facing library.
        The library ships with ${SEED_RESOURCES.length} curated seed resources (always visible).
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;">

        <!-- Pending queue -->
        <div style="background:white;border-radius:16px;border:2px solid ${pending.length ? 'rgba(245,158,11,0.4)' : 'var(--border)'};padding:24px;">
          <h2 style="font-size:15px;color:var(--navy);margin-bottom:4px;font-family:'DM Sans',sans-serif;">
            ⏳ Pending Approval
            ${pending.length ? `<span style="font-size:12px;background:#fde68a;color:#92400e;padding:2px 8px;border-radius:8px;margin-left:8px;">${pending.length}</span>` : ''}
          </h2>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px;">Resources submitted by lecturers awaiting vetting.</p>
          <div id="rm-pending-list">
            ${pending.length ? pending.map(r => _rmPendingCard(r)).join('') : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No pending resources.</p>'}
          </div>
        </div>

        <!-- Add resource form -->
        <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;">
          <h2 style="font-size:15px;color:var(--navy);margin-bottom:16px;font-family:'DM Sans',sans-serif;">➕ Add Resource</h2>
          <form id="rm-add-form" style="display:flex;flex-direction:column;gap:12px;">
            ${_rmInput('rm-title', 'Title *', 'text', 'Resource title')}
            <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;">
              ${_rmInput('rm-url', 'URL *', 'url', 'https://')}
              <label class="btn-prev" style="margin-bottom:0;cursor:pointer;display:inline-flex;align-items:center;padding:10px 14px;height:44px;box-sizing:border-box;">
                📁 Upload File
                <input type="file" style="display:none;" id="rm-file-upload" onchange="window._rmHandleFileUpload(event)" />
              </label>
            </div>
            ${_rmTextarea('rm-desc', 'Description *', 'One or two sentences describing this resource')}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${_rmSelect('rm-type', 'Type *', ['video', 'pdf', 'podcast', 'article', 'tiktok', 'tweet', 'image', 'link'])}
              ${_rmSelect('rm-embed', 'Embed type *', ['youtube', 'pdf', 'audio', 'link'])}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${_rmSelect('rm-source', 'Source *', ['YouTube', 'TikTok', 'X', 'Spotify', 'Podcast', 'Journal', 'University', 'Other'])}
              ${_rmInput('rm-duration', 'Duration', 'text', 'e.g. 8 min')}
            </div>
            <div>
              <label style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:6px;">Skill Tags *</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;" id="rm-skill-tags">
                ${Object.entries(SKILL_LABELS_RES).map(([id, label], idx) => `
                  <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:4px 9px;">
                    <input type="checkbox" value="${id}" data-range-group="rm-skill-tags" data-range-index="${idx}" onclick="_toggleShiftRangeGroup('rm-skill-tags', ${idx}, this.checked, event.shiftKey)" style="margin:0;cursor:pointer;"> ${label}
                  </label>
                `).join('')}
              </div>
            </div>
            <div id="rm-add-err" style="font-size:12px;color:#ef4444;display:none;"></div>
            <button type="submit" style="padding:10px;background:var(--accent);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity 0.2s;">Submit Resource</button>
          </form>
        </div>
      </div>

      <!-- Approved resources table -->
      <div style="background:white;border-radius:16px;border:1px solid var(--border);padding:24px;">
        <h2 style="font-size:15px;color:var(--navy);margin-bottom:4px;font-family:'DM Sans',sans-serif;">
          ✅ Approved Lecturer-Added Resources
          <span style="font-size:12px;color:var(--muted);font-weight:normal;margin-left:8px;">(${approved.length} items)</span>
        </h2>
        <p style="font-size:12px;color:var(--muted);margin-bottom:16px;">These are visible in the student library alongside the ${SEED_RESOURCES.length} seed resources.</p>
        <div id="rm-approved-list">
          ${approved.length ? `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr>
                  ${['Title', 'Type', 'Skills', 'Source', ''].map(h => `<th style="padding:10px 14px;background:var(--cream);color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);text-align:left;">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${approved.map(r => `
                  <tr>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--navy);font-weight:600;">${_esc(r.title)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--muted);">${r.type || ''}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;">
                      ${(r.skillTags || []).map(t => `<span style="background:var(--cream2,#f0f4ff);border:1px solid var(--border);padding:1px 7px;border-radius:6px;margin-right:3px;">${SKILL_LABELS_RES[t] || t}</span>`).join('')}
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);color:var(--muted);">${r.source || ''}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:right;">
                      <button onclick="_rmRemove('${r.id}')" style="font-size:11px;background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:3px 10px;cursor:pointer;">Remove</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>` : '<p style="font-size:14px;color:var(--muted);font-style:italic;">No lecturer-added resources approved yet.</p>'}
        </div>
      </div>
    </div>`;

  // Wire up form
  document.getElementById('rm-add-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('rm-add-err');
    errEl.style.display = 'none';

    const title = document.getElementById('rm-title')?.value.trim();
    const url = document.getElementById('rm-url')?.value.trim();
    const desc = document.getElementById('rm-desc')?.value.trim();
    const type = document.getElementById('rm-type')?.value;
    const embed = document.getElementById('rm-embed')?.value;
    const source = document.getElementById('rm-source')?.value;
    const dur = document.getElementById('rm-duration')?.value.trim();
    const skills = [...document.querySelectorAll('#rm-skill-tags input:checked')].map(i => i.value);

    if (!title || !url || !desc || !skills.length) {
      errEl.textContent = 'Please fill in Title, URL, Description, and at least one Skill Tag.';
      errEl.style.display = 'block';
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    const key = await addResource({
      type, embedType: embed, title, description: desc, url, source,
      duration: dur || null, skillTags: skills, phaseTags: [],
      addedBy: 'lecturer',
    });

    btn.disabled = false;
    btn.textContent = 'Submit Resource';

    if (key) {
      _showLecturerToast('Resource submitted! It will appear in the Pending Approval queue.', 'success', 3000);
      if (typeof saveState === 'function') await saveState();
      window._loadResourceManager();
    } else {
      errEl.textContent = 'Failed to save. Check your Firebase permissions.';
      errEl.style.display = 'block';
    }
  });
};

window._rmHandleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const label = e.target.closest('label');
  const originalHtml = label.innerHTML;
  label.style.opacity = '0.6';
  label.style.pointerEvents = 'none';
  label.innerHTML = '⌛ Uploading...';

  try {
    const asset = await uploadGalleryAsset(file);
    if (asset?.url) {
      const urlInput = document.getElementById('rm-url');
      if (urlInput) {
        urlInput.value = asset.url;
        // Auto-set type if PDF or Image
        const typeSelect = document.getElementById('rm-type');
        const embedSelect = document.getElementById('rm-embed');
        const fileName = file.name.toLowerCase();

        if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
          if (typeSelect) typeSelect.value = 'pdf';
          if (embedSelect) embedSelect.value = 'pdf';
        } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(fileName)) {
          if (typeSelect) typeSelect.value = 'image';
          if (embedSelect) embedSelect.value = 'link';
        }
      }
      _showLecturerToast('File uploaded successfully!', 'success');
    }
  } catch (err) {
    console.error('File upload failed:', err);
    _showLecturerToast('Upload failed: ' + (err.message || 'Unknown error'), 'warn');
  } finally {
    label.style.opacity = '1';
    label.style.pointerEvents = 'auto';
    label.innerHTML = originalHtml;
  }
};

function _rmPendingCard(r) {
  return `
    <div id="rmp-${r.id}" style="background:var(--cream,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:4px;">${_esc(r.title)}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${_esc(r.type)} · ${_esc(r.source || '')} · <a href="${_esc(r.url)}" target="_blank" rel="noopener" style="color:var(--accent);">Preview ↗</a></div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;">${_esc(r.description || '')}</div>
      <div style="display:flex;gap:8px;">
        <button onclick="_rmApprove('${r.id}')" style="flex:1;padding:7px;background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.3);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">✓ Approve</button>
        <button onclick="_rmRemove('${r.id}')" style="flex:1;padding:7px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.25);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">✗ Remove</button>
      </div>
    </div>`;
}

window._rmApprove = async (id) => {
  const ok = await vettResource(id, true);
  if (ok) { _showLecturerToast('Resource approved and now visible to students.', 'success', 2600); window._loadResourceManager(); }
  else _showLecturerToast('Failed to approve. Check Firebase permissions.', 'warn', 3200);
};

window._rmRemove = async (id) => {
  if (!confirm('Remove this resource? It will no longer appear in the student library.')) return;
  const ok = await removeResource(id);
  if (ok) { _showLecturerToast('Resource removed.', 'success', 2400); window._loadResourceManager(); }
  else _showLecturerToast('Failed to remove. Check Firebase permissions.', 'warn', 3200);
};

function _rmInput(id, label, type, placeholder) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <input id="${id}" type="${type}" placeholder="${placeholder}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;box-sizing:border-box;outline:none;" />
  </div>`;
}

function _rmTextarea(id, label, placeholder) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <textarea id="${id}" rows="3" placeholder="${placeholder}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;box-sizing:border-box;resize:vertical;outline:none;"></textarea>
  </div>`;
}

function _rmSelect(id, label, options) {
  return `<div>
    <label for="${id}" style="font-size:12px;font-weight:700;color:var(--navy);display:block;margin-bottom:4px;">${label}</label>
    <select id="${id}" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Lora',serif;background:white;box-sizing:border-box;outline:none;">
      ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
    </select>
  </div>`;
}

// ── Live Sessions (Teams Integration) ───────────
window._loadLiveSessions = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading live sessions...</div>';

  let classSession = null;
  let tutorialSession = null;
  try {
    const [classSnap, tutSnap] = await Promise.all([
      get(ref(db, 'sessions/live/class')),
      get(ref(db, 'sessions/live/tutorial')),
    ]);
    if (classSnap.exists()) classSession = classSnap.val();
    if (tutSnap.exists()) tutorialSession = tutSnap.val();
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#b91c1c;">Failed to load sessions: ${_esc(err.message)}</div>`;
    return;
  }

  const renderCard = (type, label, icon, session) => {
    const isActive = session?.active === true;
    const link = session?.teamsLink || '';
    const startedBy = session?.startedBy || '';
    const startedAt = session?.startedAt ? new Date(session.startedAt).toLocaleString() : '';
    return `
      <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:0 10px 24px rgba(15,23,42,.04);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--navy);">${icon} ${_esc(label)} Session</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;">
              Status: ${isActive
                ? '<span style="color:#166534;font-weight:700;">LIVE</span>'
                : '<span style="color:var(--muted);">Not active</span>'}
              ${isActive && startedAt ? ` · Started ${_esc(startedAt)}` : ''}
            </div>
          </div>
          ${isActive
            ? `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.5);animation:pulse 2s infinite;"></div>`
            : ''}
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:var(--navy);display:block;margin-bottom:6px;">Microsoft Teams Meeting Link</label>
          <input
            id="live-session-link-${type}"
            type="url"
            value="${_esc(link)}"
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:13px;font-family:var(--font-mono);box-sizing:border-box;"
          />
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${isActive
            ? `<a href="${_esc(link)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-weight:700;cursor:pointer;font-size:13px;text-decoration:none;">📹 Join Meeting</a>
               <button onclick="_stopLiveSession('${type}')" style="padding:10px 20px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-weight:700;cursor:pointer;font-size:13px;">Stop Session</button>
               <button onclick="_updateLiveSessionLink('${type}')" style="padding:10px 20px;border-radius:10px;border:1px solid var(--border);background:white;color:var(--navy);font-weight:600;cursor:pointer;font-size:13px;">Update Link</button>`
            : `<button onclick="_startLiveSession('${type}')" style="padding:10px 20px;border-radius:10px;border:none;background:var(--accent);color:white;font-weight:700;cursor:pointer;font-size:13px;">Start Session</button>
               <button onclick="_saveLiveSessionLink('${type}')" style="padding:10px 20px;border-radius:10px;border:1px solid var(--border);background:white;color:var(--navy);font-weight:600;cursor:pointer;font-size:13px;">Save Link</button>`}
        </div>
      </div>`;
  };

  mount.innerHTML = `
    <div style="max-width:900px;margin:0 auto;">
      <h2 style="margin:0 0 6px 0;color:var(--navy);">Live Sessions</h2>
      <p style="margin:0 0 24px 0;color:var(--muted);font-size:14px;line-height:1.6;">
        Set your Microsoft Teams meeting links below. When you start a session, students will see a prominent
        "Join Live Session" button on their dashboard. You can set the link in advance and start/stop sessions as needed.
      </p>
      <div style="display:grid;gap:20px;">
        ${renderCard('class', 'Contact Class', '🏫', classSession)}
        ${renderCard('tutorial', 'Tutorial', '👥', tutorialSession)}
      </div>
    </div>`;
};

window._startLiveSession = async (type) => {
  const input = document.getElementById(`live-session-link-${type}`);
  const link = input?.value?.trim() || '';
  if (!link) {
    _showLecturerToast('Please enter a Teams meeting link first.', 'warn');
    return;
  }
  try {
    const user = auth.currentUser;
    await set(ref(db, `sessions/live/${type}`), {
      active: true,
      teamsLink: link,
      startedBy: user?.displayName || user?.email || '',
      startedAt: new Date().toISOString(),
    });
    _showLecturerToast(`${type === 'class' ? 'Contact class' : 'Tutorial'} session is now LIVE. Students can join.`, 'ok');
    await _loadLiveSessions();
  } catch (err) {
    _showLecturerToast(`Failed to start session: ${err.message}`, 'warn');
  }
};

window._stopLiveSession = async (type) => {
  try {
    await set(ref(db, `sessions/live/${type}`), {
      active: false,
      teamsLink: (await get(ref(db, `sessions/live/${type}/teamsLink`))).val() || '',
      stoppedAt: new Date().toISOString(),
    });
    _showLecturerToast(`${type === 'class' ? 'Contact class' : 'Tutorial'} session stopped.`, 'ok');
    await _loadLiveSessions();
  } catch (err) {
    _showLecturerToast(`Failed to stop session: ${err.message}`, 'warn');
  }
};

window._updateLiveSessionLink = async (type) => {
  const input = document.getElementById(`live-session-link-${type}`);
  const link = input?.value?.trim() || '';
  if (!link) {
    _showLecturerToast('Please enter a Teams meeting link.', 'warn');
    return;
  }
  try {
    await set(ref(db, `sessions/live/${type}/teamsLink`), link);
    _showLecturerToast('Link updated.', 'ok');
  } catch (err) {
    _showLecturerToast(`Failed to update link: ${err.message}`, 'warn');
  }
};

window._saveLiveSessionLink = async (type) => {
  const input = document.getElementById(`live-session-link-${type}`);
  const link = input?.value?.trim() || '';
  if (!link) {
    _showLecturerToast('Please enter a Teams meeting link.', 'warn');
    return;
  }
  try {
    await set(ref(db, `sessions/live/${type}`), {
      active: false,
      teamsLink: link,
      savedAt: new Date().toISOString(),
    });
    _showLecturerToast('Link saved. Start the session when ready.', 'ok');
  } catch (err) {
    _showLecturerToast(`Failed to save link: ${err.message}`, 'warn');
  }
};

// ── Tutor Staff Screen ──────────────────────────
let _tutorStaffCache = [];

window._loadTutorStaff = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading tutor staff...</div>';

  try {
    const [usersSnap, assignSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'tutorial-groups/assignmentsByTutor')),
    ]);
    const allUsers = usersSnap.exists() ? usersSnap.val() : {};
    const assignments = assignSnap.exists() ? assignSnap.val() : {};

    // Filter tutors
    _tutorStaffCache = Object.entries(allUsers)
      .filter(([, u]) => String(u?.profile?.role || '').toLowerCase() === 'tutor')
      .map(([uid, u]) => {
        const p = u?.profile || {};
        const tutorAssignment = assignments[uid];
        const groupCount = Array.isArray(tutorAssignment?.groups) ? tutorAssignment.groups.length : 0;
        return {
          uid,
          displayName: p.displayName || '',
          email: p.email || '',
          disabled: Boolean(p.disabled),
          createdAt: p.createdAt || '',
          groupCount,
        };
      })
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

    const tutorRows = _tutorStaffCache.map((t) => {
      const cleanName = String(t.displayName || '').replace(/\s*\[tutor\]\s*/i, '').trim();
      return `
      <tr>
        <td style="padding:8px 10px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <input id="ts-name-${_esc(t.uid)}" value="${_esc(cleanName)}" style="font-weight:700;color:var(--navy);border:1px solid transparent;border-radius:6px;padding:4px 6px;font-size:13px;background:transparent;min-width:120px;transition:border-color .2s;" onfocus="this.style.borderColor='var(--border)';this.style.background='white'" onblur="this.style.borderColor='transparent';this.style.background='transparent'" />
          </div>
        </td>
        <td style="padding:8px 10px;">
          <input id="ts-email-${_esc(t.uid)}" value="${_esc(t.email)}" style="font-size:12px;color:var(--navy);border:1px solid transparent;border-radius:6px;padding:4px 6px;background:transparent;min-width:160px;transition:border-color .2s;" onfocus="this.style.borderColor='var(--border)';this.style.background='white'" onblur="this.style.borderColor='transparent';this.style.background='transparent'" />
        </td>
        <td style="padding:8px 10px;text-align:center;">${t.groupCount}</td>
        <td style="padding:8px 10px;text-align:center;">
          <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${t.disabled ? '#fef2f2' : '#ecfdf5'};color:${t.disabled ? '#991b1b' : '#065f46'};">${t.disabled ? 'Disabled' : 'Active'}</span>
        </td>
        <td style="padding:8px 10px;font-size:11px;color:var(--muted);">${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
        <td style="padding:8px 10px;">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn-prev" style="display:inline-flex;padding:4px 10px;font-size:11px;background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8;" onclick="_saveTutorProfile('${_esc(t.uid)}')">Save</button>
            <button class="btn-prev" style="display:inline-flex;padding:4px 10px;font-size:11px;background:#ecfdf5;border-color:#a7f3d0;color:#065f46;" onclick="_previewTutorDashboard('${_esc(t.uid)}')">Preview Dashboard</button>
            <button class="btn-prev" style="display:inline-flex;padding:4px 10px;font-size:11px;background:${t.disabled ? '#ecfdf5' : '#fef2f2'};border-color:${t.disabled ? '#a7f3d0' : '#fecaca'};color:${t.disabled ? '#065f46' : '#991b1b'};" onclick="_toggleTutorDisabled('${_esc(t.uid)}', ${!t.disabled})">${t.disabled ? 'Enable' : 'Disable'}</button>
            <button class="btn-prev" style="display:inline-flex;padding:4px 10px;font-size:11px;background:#fef2f2;border-color:#fecaca;color:#991b1b;" onclick="_deleteTutor('${_esc(t.uid)}', '${_esc(cleanName)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');

    mount.innerHTML = `
      <div style="padding:34px;max-width:1200px;margin:0 auto;animation:fadeIn 0.3s ease;">
        <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">🎓 Tutor Staff</h1>
        <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Enroll new tutors and manage existing tutor accounts.</p>

        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Enroll New Tutor</div>
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
            <input id="ts-new-name" placeholder="Full name" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
            <input id="ts-new-email" type="email" placeholder="email@domain" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;" />
            <button class="btn-prev" style="display:inline-flex;background:var(--accent);color:white;border-color:var(--accent);" onclick="_createTutorAccount()">Create Tutor Account</button>
          </div>
          <div id="ts-create-result" style="margin-top:8px;"></div>
        </div>

        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Current Tutors (${_tutorStaffCache.length})</div>
          ${_tutorStaffCache.length ? `
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="border-bottom:2px solid var(--border);text-align:left;">
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);">Name</th>
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);">Email</th>
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);text-align:center;">Groups</th>
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);text-align:center;">Status</th>
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);">Created</th>
                    <th style="padding:8px 10px;font-weight:800;color:var(--navy);"></th>
                  </tr>
                </thead>
                <tbody>${tutorRows}</tbody>
              </table>
            </div>
          ` : '<div style="font-size:13px;color:var(--muted);padding:12px 0;">No tutors enrolled yet.</div>'}
        </div>
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">Failed to load tutor staff: ${_esc(err.message)}</div>`;
  }
};

window._previewTutorDashboard = function (uid) {
  const tutor = _tutorStaffCache.find((entry) => entry.uid === uid);
  if (!tutor) {
    _showLecturerToast('Refresh the Tutor Staff screen, then select a tutor to preview.', 'warn', 3200);
    return;
  }
  if (typeof window.openTutorDashboardPreview !== 'function') {
    _showLecturerToast('Tutor dashboard preview is unavailable right now.', 'warn', 3200);
    return;
  }
  window.openTutorDashboardPreview({
    uid: tutor.uid,
    displayName: tutor.displayName,
    email: tutor.email,
  });
};

window._createTutorAccount = async () => {
  const name = String(document.getElementById('ts-new-name')?.value || '').trim();
  const email = String(document.getElementById('ts-new-email')?.value || '').trim().toLowerCase();
  const resultDiv = document.getElementById('ts-create-result');

  if (!name || !email) {
    _showLecturerToast('Enter both name and email.', 'warn', 2600);
    return;
  }

  try {
    if (resultDiv) resultDiv.innerHTML = '<div style="font-size:12px;color:var(--muted);">Creating tutor account...</div>';
    const createTutor = httpsCallable(functions, 'createTutorAccount');
    const result = await createTutor({ name, email });
    const { uid, tempPassword } = result.data;

    if (resultDiv) {
      resultDiv.innerHTML = `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px;margin-top:8px;">
          <div style="font-weight:800;color:#065f46;margin-bottom:6px;">Tutor account created successfully</div>
          <div style="font-size:12px;color:#065f46;line-height:1.6;">
            <div><strong>UID:</strong> ${_esc(uid)}</div>
            <div><strong>Email:</strong> ${_esc(email)}</div>
            <div><strong>Temporary Password:</strong> <code style="background:#d1fae5;padding:2px 6px;border-radius:4px;font-weight:800;user-select:all;">${_esc(tempPassword)}</code></div>
            <div style="margin-top:6px;color:#92400e;font-weight:700;">Share this password with the tutor securely. It is shown only once.</div>
          </div>
        </div>
      `;
    }

    document.getElementById('ts-new-name').value = '';
    document.getElementById('ts-new-email').value = '';
    // Refresh tutor list
    setTimeout(() => _loadTutorStaff(), 800);
  } catch (err) {
    const msg = err?.message || err?.code || 'Unknown error';
    if (resultDiv) {
      resultDiv.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px;margin-top:8px;font-size:12px;color:#991b1b;">${_esc(msg)}</div>`;
    }
    _showLecturerToast(`Failed to create tutor: ${msg}`, 'warn', 3600);
  }
};

window._toggleTutorDisabled = async (uid, disabled) => {
  if (!uid) return;
  const action = disabled ? 'disable' : 'enable';
  if (!confirm(`Are you sure you want to ${action} this tutor?`)) return;
  try {
    const snap = await get(ref(db, `users/${uid}/profile`));
    const current = snap.exists() ? snap.val() : {};
    await set(ref(db, `users/${uid}/profile`), {
      ...current,
      disabled,
      updatedAt: new Date().toISOString(),
      updatedByUid: STATE.user?.uid || null,
    });
    _showLecturerToast(`Tutor ${action}d.`, 'success', 2200);
    await _loadTutorStaff();
  } catch (err) {
    _showLecturerToast(`Failed to ${action} tutor: ${err.message}`, 'warn', 3200);
  }
};

window._saveTutorProfile = async (uid) => {
  if (!uid) return;
  const nameInput = document.getElementById(`ts-name-${uid}`);
  const emailInput = document.getElementById(`ts-email-${uid}`);
  const newName = String(nameInput?.value || '').trim();
  const newEmail = String(emailInput?.value || '').trim().toLowerCase();

  if (!newName) {
    _showLecturerToast('Name cannot be empty.', 'warn', 2400);
    return;
  }

  try {
    const snap = await get(ref(db, `users/${uid}/profile`));
    const current = snap.exists() ? snap.val() : {};
    const displayName = `${newName} [tutor]`;
    await set(ref(db, `users/${uid}/profile`), {
      ...current,
      displayName,
      email: newEmail || current.email,
      updatedAt: new Date().toISOString(),
      updatedByUid: STATE.user?.uid || null,
    });

    // Also update the tutor name in assignmentsByTutor if present
    const assignSnap = await get(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`));
    if (assignSnap.exists()) {
      const entry = assignSnap.val();
      entry.tutor = { ...entry.tutor, displayName, email: newEmail || entry.tutor?.email };
      entry.updatedAt = new Date().toISOString();
      await set(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`), entry);
    }

    await _syncGroupToTutorSummary();
    _showLecturerToast('Tutor profile saved.', 'success', 2200);
    await _loadTutorStaff();
  } catch (err) {
    _showLecturerToast(`Failed to save: ${err.message}`, 'warn', 3200);
  }
};

window._deleteTutor = async (uid, name) => {
  if (!uid) return;
  if (!confirm(`Permanently delete tutor "${name}"?\n\nThis will remove their profile and unassign all groups. This cannot be undone.`)) return;

  try {
    await _hardDeleteUserAccountRecord(uid, {
      reason: 'tutor-delete',
      name: name || null,
      role: 'tutor',
    });
    _showLecturerToast(`Tutor "${name}" deleted.`, 'success', 2600);
    await _loadTutorStaff();
  } catch (err) {
    _showLecturerToast(`Failed to delete tutor: ${err.message}`, 'warn', 3200);
  }
};

// ── Simple Group Assignment Screen ──────────────
window._loadSimpleGroupAssignment = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading group assignment...</div>';

  try {
    const [usersSnap, assignSnap, rosterSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'tutorial-groups/assignmentsByTutor')),
      get(ref(db, 'rosters/classList')),
    ]);
    const allUsers = usersSnap.exists() ? usersSnap.val() : {};
    const assignments = assignSnap.exists() ? assignSnap.val() : {};
    const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];

    // Get tutors
    const tutors = Object.entries(allUsers)
      .filter(([, u]) => String(u?.profile?.role || '').toLowerCase() === 'tutor' && !u?.profile?.disabled)
      .map(([uid, u]) => ({ uid, displayName: u?.profile?.displayName || '', email: u?.profile?.email || '' }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Build group letters from roster
    const groupLetters = [...new Set(
      rosterRows
        .map((r) => String(r?.tutorialGroup || r?.group || '').trim().toUpperCase())
        .filter((g) => /^[K-Z]$/.test(g))
    )].sort();

    // Count students per group from roster
    const studentsPerGroup = {};
    for (const letter of groupLetters) studentsPerGroup[letter] = 0;
    for (const row of rosterRows) {
      const g = String(row?.tutorialGroup || row?.group || '').trim().toUpperCase();
      if (groupLetters.includes(g)) studentsPerGroup[g]++;
    }

    // Build current assignment map: group letter -> tutor uid
    const groupToTutor = {};
    const tutorGroupCounts = {};
    for (const [tutorUid, entry] of Object.entries(assignments)) {
      const groups = Array.isArray(entry?.groups) ? entry.groups : [];
      tutorGroupCounts[tutorUid] = groups.length;
      for (const g of groups) {
        const gId = String(g?.id || '').toUpperCase();
        if (gId) groupToTutor[gId] = tutorUid;
      }
    }

    // Tutor option HTML
    const tutorOptions = tutors.map((t) => `<option value="${_esc(t.uid)}">${_esc(t.displayName)}</option>`).join('');

    // Build tutor summary cards
    const tutorCards = tutors.map((t) => {
      const count = tutorGroupCounts[t.uid] || 0;
      return `
        <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:10px 12px;min-width:140px;">
          <div style="font-weight:800;color:var(--navy);font-size:13px;">${_esc(t.displayName.replace(/\s*\[tutor\]\s*/i, ''))}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${_esc(t.email)}</div>
          <div style="font-size:12px;font-weight:700;color:var(--accent);margin-top:4px;">${count} group${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');

    // Build group cards
    const groupCards = groupLetters.map((letter) => {
      const assignedTutorUid = groupToTutor[letter] || '';
      const studentCount = studentsPerGroup[letter] || 0;
      const isUnassigned = !assignedTutorUid;
      const borderColor = isUnassigned ? '#fde68a' : 'var(--border)';
      const bgColor = isUnassigned ? '#fffbeb' : 'white';

      return `
        <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:12px;padding:12px;min-width:160px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-size:18px;font-weight:900;color:var(--navy);">Group ${_esc(letter)}</div>
            <div style="font-size:11px;color:var(--muted);">${studentCount} student${studentCount !== 1 ? 's' : ''}</div>
          </div>
          ${isUnassigned ? '<div style="font-size:11px;color:#92400e;font-weight:700;margin-bottom:6px;">Unassigned</div>' : ''}
          <select onchange="_sgaAssignGroup('${_esc(letter)}', this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:white;">
            <option value="">— No tutor —</option>
            ${tutors.map((t) => `<option value="${_esc(t.uid)}" ${assignedTutorUid === t.uid ? 'selected' : ''}>${_esc(t.displayName.replace(/\s*\[tutor\]\s*/i, ''))}</option>`).join('')}
          </select>
        </div>
      `;
    }).join('');

    const unassignedCount = groupLetters.filter((l) => !groupToTutor[l]).length;

    mount.innerHTML = `
      <div style="padding:34px;max-width:1200px;margin:0 auto;animation:fadeIn 0.3s ease;">
        <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">🗂️ Group Assignment</h1>
        <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Assign tutors to tutorial groups. Changes are saved immediately.</p>

        ${unassignedCount > 0 ? `<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px;font-weight:700;">${unassignedCount} group${unassignedCount !== 1 ? 's' : ''} still unassigned</div>` : ''}

        <div style="margin-bottom:14px;">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Tutors (${tutors.length})</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">${tutorCards || '<div style="font-size:13px;color:var(--muted);">No active tutors. Enroll tutors in the Tutor Staff screen.</div>'}</div>
        </div>

        <div>
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Groups (${groupLetters.length})</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">${groupCards || '<div style="font-size:13px;color:var(--muted);">No groups found. Upload a roster with tutorial group letters (K–Z).</div>'}</div>
        </div>
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">Failed to load group assignment: ${_esc(err.message)}</div>`;
  }
};

window._sgaAssignGroup = async (groupLetter, tutorUid) => {
  try {
    // Load current state
    const [assignSnap, usersSnap, rosterSnap] = await Promise.all([
      get(ref(db, 'tutorial-groups/assignmentsByTutor')),
      get(ref(db, 'users')),
      get(ref(db, 'rosters/classList')),
    ]);
    const currentAssignments = assignSnap.exists() ? assignSnap.val() : {};
    const allUsers = usersSnap.exists() ? usersSnap.val() : {};
    const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];

    // Find student UIDs for this group from roster
    const groupStudentUids = [];
    const { uidByEmail } = _buildUserLookup(allUsers);
    for (const row of rosterRows) {
      const g = String(row?.tutorialGroup || row?.group || '').trim().toUpperCase();
      if (g !== groupLetter) continue;
      const email = _normEmail(row?.email || '');
      if (email && uidByEmail[email]) groupStudentUids.push(uidByEmail[email]);
    }

    // Track which tutor UIDs need to be written
    const writes = [];

    // Remove this group from any current tutor
    for (const [uid, entry] of Object.entries(currentAssignments)) {
      if (!Array.isArray(entry?.groups)) continue;
      const hadGroup = entry.groups.some((g) => String(g?.id || '').toUpperCase() === groupLetter);
      if (!hadGroup) continue;
      entry.groups = entry.groups.filter((g) => String(g?.id || '').toUpperCase() !== groupLetter);
      if (entry.groups.length === 0) {
        // Remove this tutor entry entirely
        writes.push(remove(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`)));
      } else {
        // Update with group removed
        entry.updatedAt = new Date().toISOString();
        entry.source = 'dashboard/simple-group-assignment';
        writes.push(set(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`), entry));
      }
    }

    // Assign to new tutor (if a tutor was selected)
    if (tutorUid) {
      const tutorProfile = allUsers[tutorUid]?.profile || {};
      const existing = currentAssignments[tutorUid] || {
        tutor: {
          uid: tutorUid,
          email: tutorProfile.email || null,
          displayName: tutorProfile.displayName || null,
        },
        groups: [],
      };
      // Ensure we don't double-add (in case it was already there)
      existing.groups = (existing.groups || []).filter((g) => String(g?.id || '').toUpperCase() !== groupLetter);
      existing.groups.push({
        id: groupLetter,
        name: `Group ${groupLetter}`,
        studentUids: groupStudentUids,
        students: [],
      });
      existing.updatedAt = new Date().toISOString();
      existing.source = 'dashboard/simple-group-assignment';
      writes.push(set(ref(db, `tutorial-groups/assignmentsByTutor/${tutorUid}`), existing));
    }

    await Promise.all(writes);

    // Rebuild and write the groupToTutor summary (readable by students)
    await _syncGroupToTutorSummary();

    _showLecturerToast(tutorUid ? `Group ${groupLetter} assigned.` : `Group ${groupLetter} unassigned.`, 'success', 2000);
    // Refresh
    await _loadSimpleGroupAssignment();
  } catch (err) {
    _showLecturerToast(`Failed to update assignment: ${err.message}`, 'warn', 3200);
  }
};

// Sync a student-readable summary: { K: { tutorName, tutorEmail }, L: ... }
async function _syncGroupToTutorSummary() {
  try {
    const assignSnap = await get(ref(db, 'tutorial-groups/assignmentsByTutor'));
    const assignments = assignSnap.exists() ? assignSnap.val() : {};
    const summary = {};
    for (const [, entry] of Object.entries(assignments)) {
      const tutorName = String(entry?.tutor?.displayName || '').replace(/\s*\[tutor\]\s*/i, '').trim();
      const tutorEmail = String(entry?.tutor?.email || '').trim();
      for (const g of (entry?.groups || [])) {
        const gId = String(g?.id || '').toUpperCase();
        if (gId) {
          summary[gId] = { tutorName, tutorEmail };
        }
      }
    }
    await set(ref(db, 'tutorial-groups/groupToTutor'), summary);
  } catch (err) {
    console.warn('Failed to sync groupToTutor summary:', err);
  }
}

// ── Tutorial Stats Screen ───────────────────────
window._loadTutorialStats = async () => {
  const mount = document.getElementById('analytics-mount');
  if (!mount) return;
  mount.innerHTML = '<div style="padding:30px;color:var(--muted);text-align:center;">⏳ Loading tutorial statistics...</div>';

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    // Collect recent session dates (last 14 days)
    const recentDates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });

    const [usersSnap, assignSnap, rosterSnap, ...sessionCheckinSnaps] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'tutorial-groups/assignmentsByTutor')),
      get(ref(db, 'rosters/classList')),
      ...recentDates.map((d) => get(ref(db, `attendance/checkins/${d}`))),
    ]);

    const allUsers = usersSnap.exists() ? usersSnap.val() : {};
    const assignments = assignSnap.exists() ? assignSnap.val() : {};
    const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];

    // Merge all checkins
    const allCheckins = {};
    sessionCheckinSnaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const dayData = snap.val();
      for (const [uid, stamps] of Object.entries(dayData || {})) {
        if (!allCheckins[uid]) allCheckins[uid] = {};
        allCheckins[uid][recentDates[idx]] = stamps;
      }
    });

    // Build roster lookup: email -> group letter
    const emailToGroup = {};
    const { uidByEmail } = _buildUserLookup(allUsers);
    for (const row of rosterRows) {
      const email = _normEmail(row?.email || '');
      const g = String(row?.tutorialGroup || row?.group || '').trim().toUpperCase();
      if (email && /^[K-Z]$/.test(g)) emailToGroup[email] = g;
    }

    // uid -> group letter via roster
    const uidToGroup = {};
    for (const [email, g] of Object.entries(emailToGroup)) {
      const uid = uidByEmail[email];
      if (uid) uidToGroup[uid] = g;
    }

    // Build per-group stats
    const groupStats = {};
    const tutorStats = {};
    let totalAtRisk = 0;

    for (const [tutorUid, entry] of Object.entries(assignments)) {
      const tutorName = String(entry?.tutor?.displayName || '').replace(/\s*\[tutor\]\s*/i, '');
      const groups = Array.isArray(entry?.groups) ? entry.groups : [];
      if (!tutorStats[tutorUid]) {
        tutorStats[tutorUid] = { name: tutorName, groups: [], totalStudents: 0, totalAttendance: 0, totalAtRisk: 0 };
      }

      for (const g of groups) {
        const gId = String(g?.id || '').toUpperCase();
        const studentUids = Array.isArray(g?.studentUids) ? g.studentUids : [];
        const enrolled = studentUids.length;

        // Attendance: how many of these students have any checkin
        let attendedCount = 0;
        for (const uid of studentUids) {
          if (allCheckins[uid]) attendedCount++;
        }

        // Tutorial notebook word counts
        let totalWords = 0;
        let notebookCount = 0;
        let atRiskCount = 0;
        for (const uid of studentUids) {
          const userState = allUsers[uid]?.state;
          const analytics = userState?.tutorialNotebook?.analytics;
          if (analytics?.totalWords) {
            totalWords += Number(analytics.totalWords || 0);
            notebookCount++;
          }
          // At-risk check
          const escalations = userState?.adaptive?.escalations;
          if (escalations && typeof escalations === 'object' && Object.keys(escalations).length > 0) {
            atRiskCount++;
          }
        }

        const stat = {
          groupId: gId,
          enrolled,
          attended: attendedCount,
          attendanceRate: enrolled > 0 ? Math.round((attendedCount / enrolled) * 100) : 0,
          avgWords: notebookCount > 0 ? Math.round(totalWords / notebookCount) : 0,
          notebookSubmissions: notebookCount,
          atRisk: atRiskCount,
        };

        groupStats[gId] = stat;
        tutorStats[tutorUid].groups.push(stat);
        tutorStats[tutorUid].totalStudents += enrolled;
        tutorStats[tutorUid].totalAttendance += attendedCount;
        tutorStats[tutorUid].totalAtRisk += atRiskCount;
        totalAtRisk += atRiskCount;
      }
    }

    // Summary
    const totalTutors = Object.keys(tutorStats).length;
    const totalGroups = Object.keys(groupStats).length;
    const totalStudents = Object.values(tutorStats).reduce((s, t) => s + t.totalStudents, 0);
    const totalAttended = Object.values(tutorStats).reduce((s, t) => s + t.totalAttendance, 0);
    const avgAttendance = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;

    // Summary cards
    const summaryCards = [
      { label: 'Active Tutors', value: totalTutors, color: '#0d9488' },
      { label: 'Groups', value: totalGroups, color: '#2563eb' },
      { label: 'Total Students', value: totalStudents, color: '#7c3aed' },
      { label: 'Avg Attendance', value: `${avgAttendance}%`, color: '#059669' },
      { label: 'At-Risk Students', value: totalAtRisk, color: totalAtRisk > 0 ? '#dc2626' : '#059669' },
    ].map((c) => `
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;">${c.label}</div>
        <div style="font-size:22px;font-weight:900;color:${c.color};margin-top:4px;">${c.value}</div>
      </div>
    `).join('');

    // Detail table per tutor
    const tutorSections = Object.entries(tutorStats).map(([, t]) => {
      if (!t.groups.length) return '';
      const rows = t.groups.map((g) => `
        <tr>
          <td style="padding:6px 10px;font-weight:700;color:var(--navy);">Group ${_esc(g.groupId)}</td>
          <td style="padding:6px 10px;text-align:center;">${g.enrolled}</td>
          <td style="padding:6px 10px;text-align:center;">${g.attended}/${g.enrolled}</td>
          <td style="padding:6px 10px;text-align:center;font-weight:700;color:${g.attendanceRate >= 70 ? '#059669' : g.attendanceRate >= 40 ? '#d97706' : '#dc2626'};">${g.attendanceRate}%</td>
          <td style="padding:6px 10px;text-align:center;">${g.notebookSubmissions}</td>
          <td style="padding:6px 10px;text-align:center;">${g.avgWords}</td>
          <td style="padding:6px 10px;text-align:center;color:${g.atRisk > 0 ? '#dc2626' : '#059669'};font-weight:700;">${g.atRisk}</td>
        </tr>
      `).join('');

      return `
        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="font-weight:800;color:var(--navy);margin-bottom:8px;">${_esc(t.name || 'Unknown Tutor')} — ${t.groups.length} group${t.groups.length !== 1 ? 's' : ''}, ${t.totalStudents} students</div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="border-bottom:2px solid var(--border);text-align:left;">
                  <th style="padding:6px 10px;">Group</th>
                  <th style="padding:6px 10px;text-align:center;">Enrolled</th>
                  <th style="padding:6px 10px;text-align:center;">Attended</th>
                  <th style="padding:6px 10px;text-align:center;">Rate</th>
                  <th style="padding:6px 10px;text-align:center;">Notebooks</th>
                  <th style="padding:6px 10px;text-align:center;">Avg Words</th>
                  <th style="padding:6px 10px;text-align:center;">At-Risk</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    mount.innerHTML = `
      <div style="padding:34px;max-width:1200px;margin:0 auto;animation:fadeIn 0.3s ease;">
        <h1 style="margin:0 0 10px 0;color:var(--navy);font-family:var(--font-heading);">📊 Tutorial Statistics</h1>
        <p style="margin:0 0 16px 0;color:var(--muted);line-height:1.6;">Per-group performance metrics based on attendance, notebook submissions, and adaptive support data.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:20px;">${summaryCards}</div>

        ${tutorSections || '<div style="background:white;border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;color:var(--muted);font-size:13px;">No tutor group assignments found. Assign tutors to groups first.</div>'}
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<div style="padding:30px;color:#ef4444;text-align:center;">Failed to load tutorial statistics: ${_esc(err.message)}</div>`;
  }
};

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

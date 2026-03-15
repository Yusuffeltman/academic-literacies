import {
  buildStudentProfileDraft,
  findRosterEntry,
  getIncompleteStudentFields,
  isValidStudentUsername,
  normalizeStudentUsername,
  STUDENT_PROFILE_FIELD_LABELS,
} from '../profile.js';

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

  console.log('Active students not in roster:', anomaliesActive);
  console.log('Roster students not active:', anomaliesRoster);
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
import { renderSessionPlan } from '../components/session-plan.js';
import { auth, db } from '../firebase.js';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import { SEED_RESOURCES } from '../../content/resources.js';
import { addResource, vettResource, removeResource } from '../resources.js';
import { TUTOR_GROUP_ASSIGNMENTS } from '../../content/tutorial-groups/assignments.js';
import { STATE, saveState } from '../state.js';
import { uploadGalleryAsset } from '../gallery.js';

const PROMOTION_WHATSAPP_WEBHOOK_URL = String(import.meta.env.VITE_WHATSAPP_PROMOTION_WEBHOOK_URL || '').trim();

let _activeSession = 'c1';
let _analyticsAutoRefreshEnabled = false;
let _analyticsAutoRefreshTimer = null;

function _normEmail(v = '') {
  return String(v || '').trim().toLowerCase();
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
  const payload = _cleanFirebaseValue({
    uid,
    deletedAt: new Date().toISOString(),
    deletedByUid: STATE.user?.uid || null,
    deletedByName: STATE.user?.displayName || STATE.user?.email || null,
    ...audit,
  });
  await set(ref(db, `analytics/deleted-student-accounts/${uid}`), payload);
  await remove(ref(db, `users/${uid}`));
  await remove(ref(db, `tutorial-groups/assignmentsByTutor/${uid}`)).catch(() => { });
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
      report.invalidRows.push({ row, rowNo, authEmail, reason: `Invalid UJ username "${authEmail}". Use a student number or @student.uj.za email.` });
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
    });
  });

  window._dashLoadSession = _loadSession;
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
        <div class="dash-quick-tools">
          <div class="dash-qt-label">Quick Tools</div>
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('class')">📲 Class QR Check-in</button>
          <button class="dash-qt-btn" onclick="_openAttendanceQrTool('tutorial')">📲 Tutorial QR Check-in</button>
          <button class="dash-qt-btn" onclick="_fullPomodoro()">🍅 Class Pomodoro</button>
          <button class="dash-qt-btn" onclick="_randomiser()">🎲 Random Selector</button>
          <button class="dash-qt-btn" onclick="_printSession()">🖨️ Print Plan</button>
          <button class="dash-qt-btn" onclick="_syncTutorGroupAssignments()">🔐 Sync Tutor Groups</button>
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
    });
  });
}
window._switchSessionType = _switchSessionType;

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

function _buildWelcome(role) {
  const isContact = role === 'lecturer';
  return `
    <div class="dash-welcome">
      <div class="dash-welcome-icon">${isContact ? '🏫' : '👥'}</div>
      <h1 class="dash-welcome-title">${isContact ? 'Contact Session Planner' : 'Tutorial Session Planner'}</h1>
      <p class="dash-welcome-sub">
        ${isContact
      ? 'Select a session from the left to view the full 90-minute plan, including activity blocks, Pomodoro timers, process writing stages, and facilitator scripts.'
      : 'Select a session from the left to view the full 45-minute tutorial plan with targeted support activities, diagnostic tools, and artefact workshops.'}
      </p>
      <div class="dash-welcome-cards">
        <div class="dash-wc">
          <div class="dash-wc-icon">🔄</div>
          <div class="dash-wc-title">Flipped Classroom</div>
          <p>Content is delivered in the module. Sessions build on pre-work — never re-teach what students should have done.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🍅</div>
          <div class="dash-wc-title">Live Pomodoro Timer</div>
          <p>Every session includes a live Pomodoro timer you project to the class. Set it and let the rhythm drive focus.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">✍️</div>
          <div class="dash-wc-title">Process Writing</div>
          <p>Each session ties writing activities to the 5-stage process: pre-write → draft → peer feedback → revision → reflect.</p>
        </div>
        <div class="dash-wc">
          <div class="dash-wc-icon">🎫</div>
          <div class="dash-wc-title">Exit Tickets</div>
          <p>Every session ends with a specific exit ticket. Collect and read before the next session to target gaps.</p>
        </div>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:14px;margin-top:24px;">← Select a session from the sidebar to begin</p>
    </div>`;
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
    'Your previous account on the Academic Literacies platform has been removed as part of class-roster cleanup.',
    '',
    'What this means:',
    '- only students on the current class roster can keep or create student accounts',
    '- if you are on the class roster, sign in or register again using your official UJ student email',
    '- if you are not on the roster but should be, contact your lecturer to update the roster first',
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
    const studentId = String(headerMap ? _rosterCell(cols, headerMap.studentId) : (cols[0] || '')).trim();
    const firstName = String(headerMap ? _rosterCell(cols, headerMap.firstName) : (cols[1] || '')).trim();
    const lastName = String(headerMap ? _rosterCell(cols, headerMap.lastName) : '').trim();
    const username = String(headerMap ? _rosterCell(cols, headerMap.username) : '').trim();
    const explicitName = String(headerMap ? _rosterCell(cols, headerMap.name) : '').trim();
    const name = explicitName || [firstName, lastName].filter(Boolean).join(' ').trim();
    const email = String(headerMap ? _rosterCell(cols, headerMap.email) : (cols[2] || '')).trim().toLowerCase();
    const tutorialGroup = String(headerMap ? _rosterCell(cols, headerMap.tutorialGroup) : (cols[3] || '')).trim().toUpperCase();
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

window._rosterSave = async () => {
  const rows = Array.isArray(_rosterDraftRows) ? _rosterDraftRows : [];
  if (!rows.length) {
    _showLecturerToast('Paste or upload roster rows before saving.', 'warn', 2800);
    return;
  }
  const validation = _rosterValidateRows(rows);
  if (validation.criticalCount) {
    _rosterRenderPreview(rows);
    _showLecturerToast(`Resolve ${validation.criticalCount} critical issue(s) shown in Roster Preview before saving.`, 'warn', 3800);
    return;
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
    ta.value = rows.map((r) => [
      r.firstName || '',
      r.lastName || '',
      r.username || '',
      r.studentId || '',
      r.email || '',
      r.tutorialGroup || '',
    ].join(',')).join('\n');
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
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(appUrl)}`;

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
      <h2 style="margin:0 0 6px 0;color:var(--navy);font-family:var(--font-sans);">${state.sessionType === 'tutorial' ? 'Tutorial' : 'Class'} QR Check-in</h2>
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
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadTutorGroupManager()">
          <div class="dash-nav-id">👥</div>
          <div class="dash-nav-label">Tutor Groups</div>
        </div>
        <div class="dash-nav-item" onclick="document.querySelectorAll('.dash-nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); _loadUserManagement()">
          <div class="dash-nav-id">🛠️</div>
          <div class="dash-nav-label">User Management</div>
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
const _bulkPromoteSelectedUids = new Set();
let _bulkPromoteLastClickedIndex = null;
const _shiftRangeLastIndexByGroup = {};
let _rosterSearchQuery = '';
let _rosterFilterMode = 'all';
const _studentSupportModeByUid = {};
const _studentSupportSaveStateByUid = {};
const _studentSupportSaveTimerByUid = {};

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

window._selectAllBulkPromote = () => {
  _bulkPromoteSelectedUids.clear();
  _eligibleStudentsForPromote().forEach((s) => {
    if (_nextLockedForStudent(s)) _bulkPromoteSelectedUids.add(s.uid);
  });
  _bulkPromoteLastClickedIndex = null;
  document.querySelectorAll('.bulk-promote-checkbox').forEach((el) => {
    const uid = String(el.getAttribute('data-uid') || '').trim();
    el.checked = Boolean(uid && _bulkPromoteSelectedUids.has(uid));
  });
  _refreshBulkPromoteSelectionUi();
};

window._openBulkPromoteAllEligible = () => {
  const eligibleStudents = _eligibleStudentsForPromote();
  if (!eligibleStudents.length) {
    _showLecturerToast('Select students with a locked next unit before promoting all eligible.', 'warn', 3000);
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

  if (filter === 'all-eligible') {
    window._selectAllBulkPromote();
    return;
  }

  if (filter === 'pending-requests') {
    const pendingByUid = new Set(
      (_cachedAllPromotionRequests || [])
        .filter((row) => String(row?.status || '').toLowerCase() === 'pending')
        .map((row) => String(row?.uid || '').trim())
        .filter(Boolean)
    );

    _bulkPromoteSelectedUids.clear();
    _cachedStudents.forEach((student) => {
      const uid = String(student?.uid || '').trim();
      if (!uid) return;
      if (!pendingByUid.has(uid)) return;
      if (_nextLockedForStudent(student)) {
        _bulkPromoteSelectedUids.add(uid);
      }
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

    const [snap, liveSnap, trafficSnap, eventsSnap, supportModesSnap, gallerySnap, unlockOverridesSnap, rosterSnap, promotionRequestsSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'presence/live')),
      get(ref(db, `analytics/traffic/${todayKey}`)),
      get(ref(db, `analytics/events/${todayKey}`)),
      get(ref(db, 'analytics/student-support-modes')),
      get(ref(db, 'gallery/posts')),
      get(ref(db, 'analytics/unlock-overrides')),
      get(ref(db, 'rosters/classList')),
      get(ref(db, 'analytics/promotion-requests')),
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
    const trendSummarySnaps = await Promise.all(
      allTrendKeys.map((k) => get(ref(db, `analytics/events-summary/${k}`)))
    );

    const galleryPostsRaw = gallerySnap.exists() ? Object.values(gallerySnap.val() || {}) : [];
    const rosterRows = rosterSnap.exists() ? Object.values(rosterSnap.val() || {}) : [];
    const rosterNumberByEmail = {};
    rosterRows.forEach((row) => {
      const email = _normEmail(row?.email || '');
      const studentNumber = String(row?.studentNumber || row?.studentNo || row?.studentId || '').trim();
      if (email && studentNumber) {
        rosterNumberByEmail[email] = studentNumber;
      }
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
        workScore,
        aiDetections, aiFlags, aiAvgScore, aiTopReason,
        heutagogy, calibrationMatches,
        // adaptive
        skillStatus, skillScores, skillAvgs, needsRem,
        frustrationIdx, highPerformer, studyTopics,
        escalations, outcomes: studentOutcomes,
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

    const avgProg = Math.round(_cachedStudents.reduce((acc, s) => acc + s.pct, 0) / _cachedStudents.length);
    const atRiskCount = _cachedStudents.filter(s => s.riskLevel === 'High').length;
    const frustCount = _cachedStudents.filter(s => s.frustrationIdx >= 3).length;
    const aiFlaggedStudents = _cachedStudents.filter(s => (s.aiFlags || []).length > 0).length;
    const aiFlagEvents = _cachedStudents.reduce((sum, s) => sum + ((s.aiFlags || []).length), 0);

    const attendanceRows = _cachedStudents.map((s) => {
      const dayRec = s.attendanceData?.byDate?.[todayKey] || null;
      const qrCheckins = dayRec?.qrCheckins || [];
      const hasQrCheckin = Array.isArray(qrCheckins) && qrCheckins.length > 0;
      const latestQr = hasQrCheckin ? qrCheckins[qrCheckins.length - 1] : null;
      return {
        name: s.name,
        hasQrCheckin,
        latestAt: latestQr?.at || null,
        latestType: latestQr?.sessionType || null,
      };
    });

    const checkedInRows = attendanceRows.filter(r => r.hasQrCheckin);
    const missingRows = attendanceRows.filter(r => !r.hasQrCheckin);

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

    const trafficToday = trafficSnap.exists() ? trafficSnap.val() : {};
    const hourRows = Array.from({ length: 24 }, (_, h) => {
      const key = String(h).padStart(2, '0');
      const row = trafficToday[key] || {};
      return { hour: key, pings: row.pings || 0, activities: row.activities || {} };
    });
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

    const eventRoot = eventsSnap.exists() ? eventsSnap.val() : {};
    const eventRows = Object.values(eventRoot).flatMap((userEvents) => Object.values(userEvents || {}));
    const studentEventRows = eventRows.filter((e) => String(e?.role || '').toLowerCase() === 'student');
    const eventTypeCounts = studentEventRows.reduce((acc, e) => {
      const k = String(e?.eventType || 'unknown');
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const activeLearnersToday = new Set(studentEventRows.map((e) => e?.uid).filter(Boolean)).size;
    const learningActionTypes = [
      'unit_open',
      'assessment_open',
      'unit_first_visit',
      'resource_library_open',
      'er_open',
      'gallery_open',
      'gallery_showroom_open',
      'gallery_submission',
      'feed_post',
      'survey_submit',
    ];
    const learningActionsToday = learningActionTypes.reduce((sum, k) => sum + (eventTypeCounts[k] || 0), 0);
    const feedPostsToday = eventTypeCounts.feed_post || 0;
    const gallerySubmissionsToday = eventTypeCounts.gallery_submission || 0;
    const surveySubmitsToday = eventTypeCounts.survey_submit || 0;
    const unitLockedAttemptsToday = eventTypeCounts.unit_locked_attempt || 0;
    const lockToSurveyConversion = unitLockedAttemptsToday
      ? Math.min(100, Math.round((surveySubmitsToday / unitLockedAttemptsToday) * 100))
      : null;
    const inClassEventsToday = studentEventRows.filter((e) => Boolean(e?.qrVerifiedToday)).length;
    const inClassEventShare = studentEventRows.length
      ? Math.round((inClassEventsToday / studentEventRows.length) * 100)
      : 0;
    const topLearningSignals = Object.entries(eventTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`)
      .join(' · ');
    const trendRows = trendDateKeys.map((k) => {
      const snap = trendSummarySnaps[allTrendKeys.indexOf(k)];
      const summary = snap.exists() ? snap.val() : {};
      const byType = summary.byType || {};
      const actions = learningActionTypes.reduce((sum, key) => sum + (byType[key] || 0), 0);
      const learners = Object.keys(summary.activeStudents || {}).length;
      const feed = byType.feed_post || 0;
      return {
        dateKey: k,
        label: k.slice(5),
        actions,
        learners,
        feed,
      };
    });
    const prevTrendRows = prevTrendDateKeys.map((k) => {
      const snap = trendSummarySnaps[allTrendKeys.indexOf(k)];
      const summary = snap.exists() ? snap.val() : {};
      const byType = summary.byType || {};
      return {
        actions: learningActionTypes.reduce((sum, key) => sum + (byType[key] || 0), 0),
        learners: Object.keys(summary.activeStudents || {}).length,
        feed: byType.feed_post || 0,
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
      const searchBlob = [
        s.name.split(' [')[0],
        s.studentNumber || '',
        s.email || '',
        s.riskLevel || '',
        weakSkills.join(' '),
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
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          <h1 style="font-family:var(--font-heading);color:var(--navy);font-size:32px;margin:0;">📊 Cohort Analytics & Risk Overview</h1>
          <button id="analytics-auto-refresh-btn" onclick="_toggleAnalyticsAutoRefresh()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--navy);font-size:12px;cursor:pointer;">
            ${_analyticsAutoRefreshEnabled ? '🟢 Auto-refresh ON (20s)' : '⚪ Auto-refresh OFF'}
          </button>
        </div>

        <!-- Metric cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px;">
          ${_metricCard('👥', 'Active Students', _cachedStudents.length, 'var(--navy)')}
          ${_metricCard('📈', 'Avg Progress', `${avgProg}<span style="font-size:20px">%</span>`, 'var(--accent)')}
          ${_metricCard('⚠️', 'At-Risk Students', atRiskCount, atRiskCount > 0 ? 'var(--red)' : 'var(--green)')}
          ${_metricCard('😤', 'High Frustration', frustCount, frustCount > 0 ? '#f59e0b' : 'var(--green)')}
          ${_metricCard('🛡️', 'AI Flags', aiFlagEvents, aiFlagEvents > 0 ? '#991b1b' : 'var(--green)')}
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
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">🧭 Learning Signals (Today)</h2>
            <div style="font-size:12px;color:var(--muted);">Event path: <strong style="color:var(--navy);">analytics/events/${todayKey}</strong></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:12px;">
            ${_metricCard('🧑‍🎓', 'Active Learners', activeLearnersToday, 'var(--navy)')}
            ${_metricCard('🎯', 'Learning Actions', learningActionsToday, 'var(--accent)')}
            ${_metricCard('🖼️', 'Gallery Posts', gallerySubmissionsToday, gallerySubmissionsToday ? '#7c3aed' : 'var(--green)')}
            ${_metricCard('💬', 'Feed Posts', feedPostsToday, feedPostsToday ? '#2563eb' : 'var(--green)')}
            ${_metricCard('📝', 'Survey Submits', surveySubmitsToday, surveySubmitsToday ? '#0f766e' : 'var(--muted)')}
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
            <div style="font-size:12px;color:var(--muted);">From analytics/events-summary</div>
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
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <h2 style="font-size:16px;color:var(--navy);margin:0;font-family:var(--font-sans);">📲 Today's QR Attendance</h2>
            <div style="font-size:12px;color:var(--muted);">
              ${todayKey} · <strong style="color:#10b981;">${checkedInRows.length} checked in</strong> · <strong style="color:#ef4444;">${missingRows.length} missing</strong>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <details style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;">
              <summary style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px;cursor:pointer;user-select:none;">Checked in (${checkedInRows.length})</summary>
              <div style="margin-top:8px;max-height:260px;overflow:auto;">
                ${checkedInRows.length
        ? checkedInRows.map(r => {
          const ts = r.latestAt ? new Date(r.latestAt) : null;
          const hh = ts ? String(ts.getHours()).padStart(2, '0') : '--';
          const mm = ts ? String(ts.getMinutes()).padStart(2, '0') : '--';
          return `<div style="font-size:12px;color:#14532d;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.7);margin-bottom:6px;display:flex;justify-content:space-between;gap:8px;">
                      <span>${r.name.split(' [')[0]}</span>
                      <span style="color:#166534;white-space:nowrap;">${hh}:${mm} · ${r.latestType || 'class'}</span>
                    </div>`;
        }).join('')
        : '<div style="font-size:12px;color:#166534;opacity:.8;">No check-ins yet.</div>'}
              </div>
            </details>
            <details style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;">
              <summary style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:8px;cursor:pointer;user-select:none;">Missing check-in (${missingRows.length})</summary>
              <div style="margin-top:8px;max-height:260px;overflow:auto;">
                ${missingRows.length
        ? missingRows.map(r => `<div style="font-size:12px;color:#7f1d1d;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.7);margin-bottom:6px;">${r.name.split(' [')[0]}</div>`).join('')
        : '<div style="font-size:12px;color:#991b1b;opacity:.8;">Everyone has checked in.</div>'}
              </div>
            </details>
          </div>
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
              Peak hour: <strong style="color:var(--navy);">${busiest.pings > 0 ? `${busiest.hour}:00 (${busiest.pings})` : 'No data yet'}</strong>
              ${quietest ? ` · Quietest active hour: <strong style="color:var(--navy);">${quietest.hour}:00 (${quietest.pings})</strong>` : ''}
              ${topActivities ? `<br>Top activities: ${topActivities}` : ''}
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
                ${Object.values(UNITS).map(u => `<option value="${u.unitId}">${u.unitBadge} - ${u.unitTitle}</option>`).join('')}
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
    </div>
  `;
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
function _metricCard(icon, label, value, color) {
  return `<div style="background:white;padding:22px;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.04);border:1px solid var(--border);position:relative;overflow:hidden;">
    <div style="position:absolute;top:-8px;right:-8px;font-size:60px;opacity:0.05;">${icon}</div>
    <div style="font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:1px;margin-bottom:8px;font-weight:700;">${label}</div>
    <div style="font-size:34px;font-weight:800;color:${color};line-height:1;">${value}</div>
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

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

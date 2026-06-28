// src/components/lesson-experiment-report.js
// ─────────────────────────────────────────────
// Lecturer read-out for the lesson-presentation A/B (unit07/08).
// Reads lesson_completed events from analytics/raw-events over a date window
// and summarises each outcome by unit × arm. Decision-support, not a verdict.
//
// See docs/lesson-presentation-redesign-spec.md (§5–§6).
// ─────────────────────────────────────────────

import { ref, get } from 'firebase/database';
import { db } from '../firebase.js';
import { analyticsDateKey } from '../analytics.js';
import { TEST_UNIT_IDS } from '../lesson-experiment.js';
import { aggregateExperimentEvents } from '../lesson-measurement.js';

function _dateKeys(days) {
  const keys = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    keys.push(analyticsDateKey(d));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

const _fmt = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export async function renderLessonExperimentReport(container, { days = 30 } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div style="max-width:1100px;margin:24px auto 0;padding:18px 0;border-top:1px solid var(--border);">
      <h2 style="margin:0;color:var(--navy);font-size:20px;">Lesson presentation A/B — unit 7 & 8</h2>
      <p style="margin:6px 0 0;color:var(--muted);font-size:13px;">Loading the last ${days} days…</p>
    </div>`;

  let summary = {};
  try {
    const snaps = await Promise.all(
      _dateKeys(days).map((k) => get(ref(db, `analytics/raw-events/${k}`)).catch(() => null)),
    );
    const events = [];
    snaps.forEach((s) => { if (s && s.exists()) events.push(...Object.values(s.val() || {})); });
    summary = aggregateExperimentEvents(events);
  } catch (err) {
    console.error('Lesson experiment report failed to load:', err);
    container.innerHTML = `<div style="max-width:1100px;margin:24px auto 0;padding:18px 0;border-top:1px solid var(--border);color:var(--muted);font-size:13px;">Could not load experiment data.</div>`;
    return;
  }

  const totalN = Object.values(summary).reduce((s, g) => s + (g.n || 0), 0);
  const rows = [];
  for (const unitId of TEST_UNIT_IDS) {
    for (const arm of ['A', 'B']) {
      const g = summary[`${unitId}|${arm}`] || { n: 0 };
      const armLabel = arm === 'A' ? 'A · scroll' : 'B · segmented';
      rows.push(`
        <tr>
          <td style="padding:8px 10px;font-weight:600;color:var(--navy);">${unitId.toUpperCase()}</td>
          <td style="padding:8px 10px;">${armLabel}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.n)}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.comprehensionPct, '%')}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.effort)}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.writingLevel)}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.completionPct, '%')}</td>
          <td style="padding:8px 10px;text-align:right;">${_fmt(g.timeMin)}</td>
        </tr>`);
    }
  }

  container.innerHTML = `
    <div style="max-width:1100px;margin:24px auto 0;padding:18px 0;border-top:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;">
        <h2 style="margin:0;color:var(--navy);font-size:20px;">Lesson presentation A/B — unit 7 &amp; 8</h2>
        <span style="color:var(--muted);font-size:12px;">last ${days} days · ${totalN} completion${totalN === 1 ? '' : 's'}</span>
      </div>
      <p style="margin:6px 0 14px;color:var(--muted);font-size:13px;">
        Arm A = current scroll, Arm B = architecture-segmented. Decision rule: adopt B only if comprehension is non-inferior <em>and</em> effort is lower or completion higher, with writing not worse.
      </p>
      ${totalN === 0 ? `
        <div style="padding:24px;background:var(--cream2);border-radius:12px;color:var(--muted);font-size:13px;">
          No completions logged yet. Data appears once students submit the end-of-unit quick check on unit 7 or 8.
        </div>` : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:640px;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);color:var(--muted);text-align:left;">
                <th style="padding:8px 10px;">Unit</th>
                <th style="padding:8px 10px;">Arm</th>
                <th style="padding:8px 10px;text-align:right;">N</th>
                <th style="padding:8px 10px;text-align:right;">Comprehension</th>
                <th style="padding:8px 10px;text-align:right;">Effort /9</th>
                <th style="padding:8px 10px;text-align:right;">Writing /5</th>
                <th style="padding:8px 10px;text-align:right;">Reading done</th>
                <th style="padding:8px 10px;text-align:right;">Time (min)</th>
              </tr>
            </thead>
            <tbody>${rows.join('')}</tbody>
          </table>
        </div>`}
      <p style="margin:14px 0 0;color:var(--muted);font-size:12px;">
        Lower effort and higher completion favour B; comprehension and writing must not drop. Small samples are noisy — read alongside confidence, not as a verdict. Comprehension items are drafts pending review. Subgroup (prior-knowledge) split is a planned enhancement.
      </p>
    </div>`;
}

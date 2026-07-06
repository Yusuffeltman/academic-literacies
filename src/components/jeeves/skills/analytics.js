// src/components/jeeves/skills/analytics.js
import { registerSkill } from '../registry.js';
import { getDatabase, ref, get, child } from 'firebase/database';

function _dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

registerSkill({
  name: 'query_analytics',
  description: 'Summarise raw analytics events for a given date (YYYY-MM-DD) or "today". Optionally filter by eventType or assessmentId.',
  scope: 'app',
  roles: ['lecturer', 'moderator'],
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'YYYY-MM-DD or "today". Defaults to today.' },
      eventType: { type: 'string', description: 'Optional eventType filter (e.g. assessment_open).' },
      assessmentId: { type: 'string', description: 'Optional assessment filter.' },
    },
  },
  handler: async ({ date, eventType, assessmentId }) => {
    const dateKey = !date || date === 'today' ? _dateKey() : String(date);
    const db = getDatabase();
    const snap = await get(child(ref(db), `analytics/raw-events/${dateKey}`));
    if (!snap.exists()) return { dateKey, totalEvents: 0, byType: {}, sample: [] };

    const byType = {};
    const byAssessment = {};
    const uniqueUsers = new Set();
    const sample = [];
    let total = 0;

    snap.forEach((ev) => {
      const v = ev.val() || {};
      if (eventType && v.eventType !== eventType) return;
      if (assessmentId && v.assessmentId !== assessmentId) return;
      total += 1;
      byType[v.eventType || 'unknown'] = (byType[v.eventType || 'unknown'] || 0) + 1;
      if (v.assessmentId) byAssessment[v.assessmentId] = (byAssessment[v.assessmentId] || 0) + 1;
      if (v.uid) uniqueUsers.add(v.uid);
      if (sample.length < 5) sample.push({ eventType: v.eventType, uid: v.uid, assessmentId: v.assessmentId });
    });

    return {
      dateKey,
      totalEvents: total,
      uniqueUsers: uniqueUsers.size,
      byType,
      byAssessment,
      sample,
    };
  },
});

// src/cohort.js
// ─────────────────────────────────────────────
// Cohort-level aggregation queries from Firebase.
// Used by the student dashboard to show peer context.
// ─────────────────────────────────────────────
import { db } from './firebase.js';
import { ref, get } from 'firebase/database';

const SKILLS = [
  'critical_reading', 'evidence_use', 'argument_structure', 'academic_tone',
  'source_evaluation', 'citation_practice', 'research_skills', 'ai_literacy',
];

/**
 * Get cohort-wide skill aggregates.
 * Returns null gracefully on permission errors or empty data.
 *
 * @returns {Promise<{skillPercentages: Record<string,number>, totalStudents: number} | null>}
 *   skillPercentages: skill_id → % of students with weak or developing status
 */
export async function getCohortAverages() {
  try {
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return null;

    const users = snap.val();
    const skillCounts = {};
    SKILLS.forEach(s => { skillCounts[s] = 0; });
    let totalStudents = 0;

    for (const [, user] of Object.entries(users)) {
      if (!user.state?.adaptive?.skill_status) continue;
      totalStudents++;
      const status = user.state.adaptive.skill_status;
      SKILLS.forEach(s => {
        if (status[s] === 'weak' || status[s] === 'developing') {
          skillCounts[s]++;
        }
      });
    }

    if (totalStudents === 0) return null;

    const skillPercentages = {};
    SKILLS.forEach(s => {
      skillPercentages[s] = Math.round((skillCounts[s] / totalStudents) * 100);
    });

    return { skillPercentages, totalStudents };
  } catch {
    // Fail silently — permission denied or network error
    return null;
  }
}

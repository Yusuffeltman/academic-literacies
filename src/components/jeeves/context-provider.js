// src/components/jeeves/context-provider.js
// ─────────────────────────────────────────────
// App Context Provider — exposes app state to Jeeves.
// Gives full read access to STATE for contextual answers.
// ─────────────────────────────────────────────

import { get, ref as dbRef } from 'firebase/database';
import { getDatabase } from 'firebase/database';

export async function getAppContext(ctx) {
  if (typeof window === 'undefined') return {};
  
  const state = window.STATE || {};
  
  const context = {
    user: {
      uid: ctx?.uid,
      role: ctx?.role,
      displayName: state.profile?.displayName || state.user?.displayName,
      email: state.profile?.email || state.user?.email,
    },
    activeUnit: state.activeUnit ?? 0,
    currentView: _extractViewFromHash(),
    roster: _compactRoster(state.roster || state.classList || state.students || []),
    recentActivity: state.recentActivity?.slice(0, 10) || [],
  };

  if (ctx?.role === 'lecturer' || ctx?.role === 'moderator') {
    context.stats = await _getQuickStats(ctx);
    context.pendingSubmissions = await _getPendingSubmissions(ctx);
    context.recentAnnouncements = await _getRecentAnnouncements(ctx);
  }

  return context;
}

function _extractViewFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location?.hash || '';
  return hash.replace(/^#/, '') || 'dashboard';
}

function _compactRoster(roster) {
  if (!Array.isArray(roster)) {
    if (roster && typeof roster === 'object') {
      roster = Object.values(roster);
    } else {
      return [];
    }
  }
  return roster.slice(0, 50).map(s => ({
    uid: s.uid || s.id || null,
    name: s.displayName || s.name || null,
    role: s.role || 'student',
    email: s.email || null,
  }));
}

async function _getQuickStats(ctx) {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const [studentsSnap, submissionsSnap] = await Promise.all([
      get(dbRef(db, 'rosters/classList')),
      get(dbRef(db, `submissions/`)),
    ]);

    const studentCount = studentsSnap?.exists() ? Object.keys(studentsSnap.val() || {}).length : 0;
    let submissionCount = 0;
    let pendingCount = 0;
    
    if (submissionsSnap?.exists()) {
      const subs = submissionsSnap.val();
      Object.values(subs || {}).forEach(assessment => {
        Object.values(assessment || {}).forEach(student => {
          submissionCount++;
          if (!student?.feedback) pendingCount++;
        });
      });
    }

    return {
      totalStudents: studentCount,
      totalSubmissions: submissionCount,
      pendingFeedback: pendingCount,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function _getPendingSubmissions(ctx) {
  try {
    const db = getDatabase();
    const snap = await get(dbRef(db, 'submissions/'));
    if (!snap?.exists()) return [];
    
    const pending = [];
    const subs = snap.val();
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    
    Object.entries(subs).forEach(([assessmentId, students]) => {
      Object.entries(students).forEach(([studentUid, submissions]) => {
        Object.entries(submissions || {}).forEach(([subId, sub]) => {
          if (!sub?.feedback && sub?.submittedAt) {
            const age = now - new Date(sub.submittedAt).getTime();
            pending.push({
              assessmentId,
              studentUid,
              submittedAt: sub.submittedAt,
              ageDays: Math.floor(age / DAY_MS),
            });
          }
        });
      });
    });

    return pending.sort((a, b) => b.ageDays - a.ageDays).slice(0, 10);
  } catch (e) {
    return [];
  }
}

async function _getRecentAnnouncements(ctx) {
  try {
    const db = getDatabase();
    const snap = await get(dbRef(db, 'announcements/'));
    if (!snap?.exists()) return [];
    
    const announcements = [];
    snap.forEach((child) => {
      const val = child.val();
      if (val) {
        announcements.push({
          id: child.key,
          title: val.title || val.message?.slice(0, 50),
          message: val.message,
          createdAt: val.createdAt,
        });
      }
    });

    return announcements
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  } catch (e) {
    return [];
  }
}

export async function getCourseContent(unitId) {
  if (typeof window === 'undefined') return null;
  
  try {
    const response = await fetch(`/content/units/unit${String(unitId).padStart(2, '0')}.js`);
    if (!response.ok) return null;
    const module = await response.text();
    
    const match = module.match(/export\s+const\s+unit\s*=\s*(\{[\s\S]*?\})/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function searchAppData(query, ctx) {
  const context = await getAppContext(ctx);
  const results = {
    matchingStudents: [],
    matchingAssessments: [],
    matchingUnits: [],
  };

  if (!query) return results;
  const q = query.toLowerCase();

  if (context.roster) {
    results.matchingStudents = context.roster.filter(s => 
      s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }

  return results;
}

window._getAppContext = getAppContext;
window._getCourseContent = getCourseContent;
window._searchAppData = searchAppData;
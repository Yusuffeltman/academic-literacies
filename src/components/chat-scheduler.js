// src/components/chat-scheduler.js
// Staff: create scheduled chat sessions. Students: view upcoming sessions.
import { STATE } from '../state.js';
import { createScheduledSession, cancelScheduledSession } from '../chat.js';
import { showToast } from './toaster.js';

export function renderScheduleForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const role = STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student';
  if (role !== 'tutor' && role !== 'lecturer' && role !== 'moderator') return;

  container.innerHTML = `
    <div class="chat-schedule-form">
      <div class="chat-schedule-form-title">Schedule a Chat Session</div>
      <label class="chat-schedule-label">
        Title
        <input type="text" id="sched-title" class="chat-schedule-input" placeholder="e.g. APA Referencing Help" />
      </label>
      <label class="chat-schedule-label">
        Description (optional)
        <textarea id="sched-desc" class="chat-schedule-input" rows="2" placeholder="What will you cover?"></textarea>
      </label>
      <label class="chat-schedule-label">
        Start time
        <input type="datetime-local" id="sched-start" class="chat-schedule-input" />
      </label>
      <label class="chat-schedule-label">
        Duration
        <select id="sched-duration" class="chat-schedule-input">
          <option value="30">30 minutes</option>
          <option value="45" selected>45 minutes</option>
          <option value="60">60 minutes</option>
        </select>
      </label>
      <label class="chat-schedule-label">
        Audience
        <select id="sched-audience" class="chat-schedule-input">
          <option value="all">All students</option>
        </select>
      </label>
      <button id="sched-submit" class="chat-schedule-submit">Schedule Session</button>
    </div>
  `;

  document.getElementById('sched-submit')?.addEventListener('click', async () => {
    const title = document.getElementById('sched-title')?.value?.trim();
    const description = document.getElementById('sched-desc')?.value?.trim();
    const startStr = document.getElementById('sched-start')?.value;
    const duration = parseInt(document.getElementById('sched-duration')?.value || '45', 10);
    const audience = document.getElementById('sched-audience')?.value || 'all';

    if (!title) { showToast('Please enter a title', 'error'); return; }
    if (!startStr) { showToast('Please select a start time', 'error'); return; }

    const startsAt = new Date(startStr).toISOString();
    const endsAt = new Date(new Date(startStr).getTime() + duration * 60_000).toISOString();

    try {
      await createScheduledSession({
        title,
        description,
        startsAt,
        endsAt,
        targetAudience: audience,
      });
      showToast('Session scheduled!', 'success');
      // Clear form
      document.getElementById('sched-title').value = '';
      document.getElementById('sched-desc').value = '';
      document.getElementById('sched-start').value = '';
    } catch (err) {
      showToast('Failed to schedule session', 'error');
      console.error('Schedule error:', err);
    }
  });
}

export function renderUpcomingSessions(containerId, scheduledSessions = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const now = Date.now();
  const upcoming = Object.entries(scheduledSessions)
    .filter(([, s]) => !s.cancelled && new Date(s.endsAt).getTime() > now)
    .sort((a, b) => new Date(a[1].startsAt) - new Date(b[1].startsAt));

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="chat-empty" style="padding:16px;">No upcoming sessions scheduled.</div>';
    return;
  }

  container.innerHTML = upcoming.map(([id, s]) => {
    const d = new Date(s.startsAt);
    const timeStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isStaff = (STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student') !== 'student';
    return `
      <div class="chat-scheduled-item">
        <div class="chat-scheduled-title">${_esc(s.title)}</div>
        <div class="chat-scheduled-meta">${_esc(s.createdByName)} &middot; ${timeStr}</div>
        ${s.description ? `<div class="chat-scheduled-desc">${_esc(s.description)}</div>` : ''}
        ${isStaff ? `<button class="chat-schedule-cancel" data-sched-id="${id}">Cancel</button>` : ''}
      </div>
    `;
  }).join('');

  // Wire cancel buttons for staff
  container.querySelectorAll('.chat-schedule-cancel').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const schedId = btn.dataset.schedId;
      if (!schedId) return;
      try {
        await cancelScheduledSession(schedId);
        showToast('Session cancelled', 'info');
        btn.closest('.chat-scheduled-item')?.remove();
      } catch (err) {
        showToast('Failed to cancel session', 'error');
      }
    });
  });
}

function _esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

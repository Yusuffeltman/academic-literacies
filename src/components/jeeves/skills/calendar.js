// src/components/jeeves/skills/calendar.js
// ─────────────────────────────────────────────
// Google Calendar Skills for Jeeves.
// List, create, update, and delete calendar events.
// ─────────────────────────────────────────────

import { registerSkill } from '../registry.js';
import { googleFetch, isGoogleConnected, requestGoogleAuth } from '../integrations/oauth-connector.js';

const CALENDAR_SCOPES = ['lecturer', 'moderator'];

registerSkill({
  name: 'google_calendar_status',
  description: 'Check if Google Calendar is connected and authorized',
  scope: 'app',
  roles: CALENDAR_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    if (!isGoogleConnected()) {
      return { connected: false, needsAuth: true };
    }
    return { connected: true, needsAuth: false };
  },
});

registerSkill({
  name: 'google_calendar_connect',
  description: 'Initiate Google OAuth flow to connect Calendar access',
  scope: 'app',
  roles: CALENDAR_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    if (isGoogleConnected()) {
      return { initiated: true, connected: true, message: 'Google Calendar is already connected' };
    }
    const success = await requestGoogleAuth({ awaitCompletion: false });
    return {
      initiated: success,
      connected: false,
      message: success ? 'Google sign-in started. Complete the popup to finish connecting Calendar.' : 'OAuth not available',
    };
  },
});

registerSkill({
  name: 'calendar_list_events',
  description: 'List upcoming calendar events. Optionally filter by date range.',
  scope: 'app',
  roles: CALENDAR_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max events to return (default 10)' },
      timeMin: { type: 'string', description: 'Start of range (ISO 8601, default now)' },
      timeMax: { type: 'string', description: 'End of range (ISO 8601)' },
    },
  },
  handler: async ({ maxResults = 10, timeMin, timeMax } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Google Calendar not connected. Say "connect Google Calendar" first.' };
    }

    const params = new URLSearchParams({
      maxResults: String(maxResults),
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    
    if (timeMin) params.append('timeMin', timeMin);
    else params.append('timeMin', new Date().toISOString());
    
    if (timeMax) params.append('timeMax', timeMax);

    const data = await googleFetch(`/calendar/v3/calendars/primary/events?${params}`);
    
    const events = (data.items || []).map(e => ({
      id: e.id,
      summary: e.summary || '(No title)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || null,
      attendees: (e.attendees || []).map(a => a.email),
      description: e.description || null,
    }));

    return { ok: true, count: events.length, events };
  },
});

registerSkill({
  name: 'calendar_create_event',
  description: 'Create a new calendar event with title, time, and optional attendees.',
  scope: 'app',
  roles: ['lecturer'], // Higher permission for write operations
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title/summary' },
      startDateTime: { type: 'string', description: 'Start time (ISO 8601)' },
      endDateTime: { type: 'string', description: 'End time (ISO 8601)' },
      location: { type: 'string', description: 'Optional location' },
      description: { type: 'string', description: 'Optional description' },
      attendees: { type: 'array', items: { type: 'string' }, description: 'Email addresses' },
    },
    required: ['title', 'startDateTime', 'endDateTime'],
  },
  handler: async ({ title, startDateTime, endDateTime, location, description, attendees } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Google Calendar not connected' };
    }

    const event = {
      summary: title,
      start: { dateTime: startDateTime, timeZone: 'Africa/Johannesburg' },
      end: { dateTime: endDateTime, timeZone: 'Africa/Johannesburg' },
    };

    if (location) event.location = location;
    if (description) event.description = description;
    if (attendees?.length) {
      event.attendees = attendees.map(email => ({ email }));
    }

    const data = await googleFetch('/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      eventId: data.id,
      htmlLink: data.htmlLink,
      message: `Created "${title}" on your calendar`,
    };
  },
});

registerSkill({
  name: 'calendar_quick_event',
  description: 'Quickly create a 1-hour event today or on a specific day. Simpler than create_event.',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title' },
      day: { type: 'string', description: 'Day: "today", "tomorrow", or date "2024-12-25"' },
      hour: { type: 'number', description: 'Hour (0-23) to start the event' },
    },
    required: ['title', 'day'],
  },
  handler: async ({ title, day = 'today', hour = 14 } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Google Calendar not connected' };
    }

    let date;
    if (day === 'today') {
      date = new Date();
    } else if (day === 'tomorrow') {
      date = new Date();
      date.setDate(date.getDate() + 1);
    } else {
      date = new Date(day);
    }

    const startDateTime = new Date(date);
    startDateTime.setHours(hour, 0, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hour + 1, 0, 0, 0);

    return await googleFetch('/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify({
        summary: title,
        start: { dateTime: startDateTime.toISOString(), timeZone: 'Africa/Johannesburg' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'Africa/Johannesburg' },
      }),
      headers: { 'Content-Type': 'application/json' },
    }).then(data => ({
      ok: true,
      eventId: data.id,
      message: `Added "${title}" for ${day} at ${hour}:00`,
    })).catch(e => ({ ok: false, error: e.message }));
  },
});

registerSkill({
  name: 'calendar_delete_event',
  description: 'Delete a calendar event by its ID',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'The calendar event ID to delete' },
    },
    required: ['eventId'],
  },
  handler: async ({ eventId } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Google Calendar not connected' };
    }

    await googleFetch(`/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
    });

    return { ok: true, message: 'Event deleted' };
  },
});

registerSkill({
  name: 'calendar_find_free_slots',
  description: 'Find available time slots on a specific date',
  scope: 'app',
  roles: CALENDAR_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
      startHour: { type: 'number', description: 'Start of search window (default 8)' },
      endHour: { type: 'number', description: 'End of search window (default 18)' },
      durationMinutes: { type: 'number', description: 'Slot duration needed (default 60)' },
    },
    required: ['date'],
  },
  handler: async ({ date, startHour = 8, endHour = 18, durationMinutes = 60 } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Google Calendar not connected' };
    }

    const dayStart = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`);
    const dayEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`);

    const params = new URLSearchParams({
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: 'true',
    });

    const data = await googleFetch(`/calendar/v3/calendars/primary/events?${params}`);
    const busySlots = (data.items || []).map(e => ({
      start: e.start?.dateTime,
      end: e.end?.dateTime,
    }));

    const freeSlots = [];
    let slotStart = new Date(dayStart);
    
    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
      
      const isFree = !busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
      
      if (isFree && slotEnd <= dayEnd) {
        freeSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
      
      slotStart = slotEnd;
    }

    return {
      ok: true,
      date,
      freeSlots: freeSlots.slice(0, 5),
      message: freeSlots.length > 0 
        ? `Found ${freeSlots.length} free slots` 
        : 'No free slots found',
    };
  },
});

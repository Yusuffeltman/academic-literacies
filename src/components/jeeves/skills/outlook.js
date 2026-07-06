// src/components/jeeves/skills/outlook.js
// ─────────────────────────────────────────────
// Microsoft Outlook Skills for Jeeves.
// Calendar and Email via Microsoft Graph API.
// ─────────────────────────────────────────────

import { registerSkill } from '../registry.js';
import { microsoftFetch, isMicrosoftConnected, requestMicrosoftAuth } from '../integrations/microsoft-oauth.js';

const OUTLOOK_SCOPES = ['lecturer', 'moderator'];

registerSkill({
  name: 'outlook_status',
  description: 'Check if Microsoft Outlook is connected and authorized',
  scope: 'app',
  roles: OUTLOOK_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    if (!isMicrosoftConnected()) {
      return { connected: false, needsAuth: true };
    }
    return { connected: true, needsAuth: false };
  },
});

registerSkill({
  name: 'outlook_connect',
  description: 'Initiate Microsoft OAuth flow to connect Outlook access',
  scope: 'app',
  roles: OUTLOOK_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    const success = await requestMicrosoftAuth();
    return { initiated: success, message: success ? 'OAuth popup opened' : 'OAuth not available' };
  },
});

registerSkill({
  name: 'outlook_list_events',
  description: 'List upcoming Outlook calendar events',
  scope: 'app',
  roles: OUTLOOK_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max events (default 10)' },
      startDate: { type: 'string', description: 'Start date (ISO 8601)' },
      endDate: { type: 'string', description: 'End date (ISO 8601)' },
    },
  },
  handler: async ({ maxResults = 10, startDate, endDate } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected. Say "connect Outlook" first.' };
    }

    const params = new URLSearchParams({
      $top: String(maxResults),
      $orderby: 'start/dateTime',
      $filter: 'isOrganizer eq true',
    });

    const start = startDate || new Date().toISOString();
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    params.append('$filter', `start/dateTime ge '${start}' and end/dateTime le '${end}'`);

    const data = await microsoftFetch(`/me/calendar/events?${params}`);
    
    const events = (data.value || []).map(e => ({
      id: e.id,
      subject: e.subject || '(No title)',
      start: e.start?.dateTime,
      end: e.end?.dateTime,
      location: e.location?.displayName || null,
      isOnline: e.isOnlineMeeting,
      joinUrl: e.onlineMeeting?.joinUrl || null,
    }));

    return { ok: true, count: events.length, events };
  },
});

registerSkill({
  name: 'outlook_create_event',
  description: 'Create a new Outlook calendar event',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Event title' },
      start: { type: 'string', description: 'Start datetime (ISO 8601)' },
      end: { type: 'string', description: 'End datetime (ISO 8601)' },
      location: { type: 'string', description: 'Optional location' },
      body: { type: 'string', description: 'Optional description' },
      attendees: { type: 'array', items: { type: 'string' }, description: 'Email addresses' },
    },
    required: ['subject', 'start', 'end'],
  },
  handler: async ({ subject, start, end, location, body, attendees } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    const event = {
      subject,
      start: { dateTime: start, timeZone: 'Africa/Johannesburg' },
      end: { dateTime: end, timeZone: 'Africa/Johannesburg' },
    };

    if (location) event.location = { displayName: location };
    if (body) event.body = { contentType: 'text', content: body };
    if (attendees?.length) {
      event.attendees = attendees.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }

    const data = await microsoftFetch('/me/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      eventId: data.id,
      message: `Created "${subject}" on your calendar`,
    };
  },
});

registerSkill({
  name: 'outlook_delete_event',
  description: 'Delete an Outlook calendar event by ID',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Event ID to delete' },
    },
    required: ['eventId'],
  },
  handler: async ({ eventId } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    await microsoftFetch(`/me/calendar/events/${eventId}`, {
      method: 'DELETE',
    });

    return { ok: true, message: 'Event deleted' };
  },
});

registerSkill({
  name: 'outlook_list_emails',
  description: 'List recent emails from Outlook inbox',
  scope: 'app',
  roles: OUTLOOK_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max emails (default 10)' },
      filter: { type: 'string', description: 'Filter: "unread", "flagged", "from:..."' },
    },
  },
  handler: async ({ maxResults = 10, filter } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    let filterQuery = '';
    if (filter === 'unread') filterQuery = "isRead eq false";
    else if (filter === 'flagged') filterQuery = "isFlagged eq true";
    else if (filter?.startsWith('from:')) filterQuery = `from/emailAddress/address eq '${filter.slice(5)}'`;

    const params = new URLSearchParams({
      $top: String(maxResults),
      $select: 'id,subject,from,to,receivedDateTime,isRead,isFlagged,preview',
    });
    if (filterQuery) params.append('$filter', filterQuery);

    const data = await microsoftFetch(`/me/messages?${params}`);
    
    const emails = (data.value || []).map(e => ({
      id: e.id,
      subject: e.subject || '(No subject)',
      from: e.from?.emailAddress?.address,
      to: e.toRecipients?.[0]?.emailAddress?.address,
      received: e.receivedDateTime,
      isRead: e.isRead,
      isFlagged: e.isFlagged,
      preview: e.preview,
    }));

    return { ok: true, count: emails.length, emails };
  },
});

registerSkill({
  name: 'outlook_send_email',
  description: 'Send an email via Outlook',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body' },
      cc: { type: 'string', description: 'Optional CC' },
    },
    required: ['to', 'subject', 'body'],
  },
  handler: async ({ to, subject, body, cc } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    const message = {
      subject,
      body: { contentType: 'text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    };

    if (cc) {
      message.ccRecipients = [{ emailAddress: { address: cc } }];
    }

    await microsoftFetch('/me/sendMail', {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json' },
    });

    return { ok: true, message: `Email sent to ${to}` };
  },
});

registerSkill({
  name: 'outlook_reply_email',
  description: 'Reply to a specific Outlook email by ID.',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'Outlook message ID to reply to.' },
      body: { type: 'string', description: 'Reply text to send.' },
      replyAll: { type: 'boolean', description: 'Reply to all recipients instead of only the sender.' },
    },
    required: ['messageId', 'body'],
  },
  handler: async ({ messageId, body, replyAll = false } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    const endpoint = replyAll ? `/me/messages/${messageId}/replyAll` : `/me/messages/${messageId}/reply`;
    await microsoftFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ comment: body }),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      messageId,
      message: replyAll ? 'Reply-all sent' : 'Reply sent',
    };
  },
});

registerSkill({
  name: 'outlook_reply_latest',
  description: 'Reply to the latest Outlook email, optionally filtered by sender. Can also reply-all.',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      body: { type: 'string', description: 'Reply text to send.' },
      from: { type: 'string', description: 'Optional sender email address to narrow the latest message.' },
      replyAll: { type: 'boolean', description: 'Reply to all recipients instead of only the sender.' },
    },
    required: ['body'],
  },
  handler: async ({ body, from, replyAll = false } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    const params = new URLSearchParams({
      $top: '1',
      $orderby: 'receivedDateTime desc',
      $select: 'id,subject,from,receivedDateTime',
    });
    if (from) {
      params.append('$filter', `from/emailAddress/address eq '${String(from).replace(/'/g, "''")}'`);
    }

    const data = await microsoftFetch(`/me/messages?${params}`);
    const latest = data?.value?.[0];
    if (!latest?.id) {
      return { ok: false, error: 'No matching Outlook message found to reply to.' };
    }

    const endpoint = replyAll ? `/me/messages/${latest.id}/replyAll` : `/me/messages/${latest.id}/reply`;
    await microsoftFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ comment: body }),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      repliedToMessageId: latest.id,
      subject: latest.subject || '(No subject)',
      from: latest.from?.emailAddress?.address || null,
      message: replyAll ? 'Reply-all sent' : 'Reply sent',
    };
  },
});

registerSkill({
  name: 'outlook_mark_read',
  description: 'Mark an Outlook email as read',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'Email ID to mark as read' },
    },
    required: ['messageId'],
  },
  handler: async ({ messageId } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    await microsoftFetch(`/me/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    });

    return { ok: true, message: 'Email marked as read' };
  },
});

registerSkill({
  name: 'outlook_flag_email',
  description: 'Flag an Outlook email for follow-up',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'Email ID to flag' },
      flag: { type: 'string', description: 'Flag status: "flagged", "completed", "cleared"' },
    },
    required: ['messageId'],
  },
  handler: async ({ messageId, flag = 'flagged' } = {}) => {
    if (!isMicrosoftConnected()) {
      return { ok: false, error: 'Outlook not connected' };
    }

    const flagStatus = {
      flagged: { flagStatus: 'flagged' },
      completed: { flagStatus: 'completed' },
      cleared: { flagStatus: 'notFlagged' },
    };

    await microsoftFetch(`/me/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(flagStatus[flag] || { flagStatus: 'flagged' }),
      headers: { 'Content-Type': 'application/json' },
    });

    return { ok: true, message: `Email ${flag}` };
  },
});

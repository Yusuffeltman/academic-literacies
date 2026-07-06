// src/components/jeeves/skills/email.js
// ─────────────────────────────────────────────
// Gmail Skills for Jeeves.
// Read, send, label, and manage emails.
// ─────────────────────────────────────────────

import { registerSkill } from '../registry.js';
import { googleFetch, isGoogleConnected, requestGoogleAuth } from '../integrations/oauth-connector.js';

const EMAIL_SCOPES = ['lecturer', 'moderator'];

function _parseEmail(email) {
  if (!email) return null;
  return {
    id: email.id,
    threadId: email.threadId,
    subject: email.payload?.headers?.find(h => h.name === 'Subject')?.value || '(No subject)',
    from: email.payload?.headers?.find(h => h.name === 'From')?.value || '',
    to: email.payload?.headers?.find(h => h.name === 'To')?.value || '',
    date: email.payload?.headers?.find(h => h.name === 'Date')?.value || '',
    snippet: email.snippet || '',
    labelIds: email.labelIds || [],
  };
}

function _extractAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] || raw).trim();
}

function _replySubject(subject) {
  const clean = String(subject || '').trim();
  if (!clean) return 'Re: (No subject)';
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

function _base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function _buildRawEmail({ to, cc, subject, body, inReplyTo, references }) {
  return [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    `Subject: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    references ? `References: ${references}` : '',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].filter(Boolean).join('\n');
}

function _gmailQuery({ from, query }) {
  const parts = [];
  if (from) parts.push(`from:${from}`);
  if (query) parts.push(String(query).trim());
  return parts.filter(Boolean).join(' ').trim();
}

registerSkill({
  name: 'gmail_status',
  description: 'Check if Gmail is connected and authorized',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    if (!isGoogleConnected()) {
      return { connected: false, needsAuth: true };
    }
    return { connected: true, needsAuth: false };
  },
});

registerSkill({
  name: 'gmail_connect',
  description: 'Initiate Google OAuth flow to connect Gmail access',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    if (isGoogleConnected()) {
      return { initiated: true, connected: true, message: 'Gmail is already connected' };
    }
    const success = await requestGoogleAuth({ awaitCompletion: false });
    return {
      initiated: success,
      connected: false,
      message: success ? 'Google sign-in started. Complete the popup to finish connecting Gmail.' : 'OAuth not available',
    };
  },
});

registerSkill({
  name: 'email_list_unread',
  description: 'List unread emails in inbox',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max emails to return (default 10)' },
    },
  },
  handler: async ({ maxResults = 10 } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected. Say "connect Gmail" first.' };
    }

    const data = await googleFetch(`/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread`);
    
    if (!data.messages?.length) {
      return { ok: true, count: 0, emails: [], message: 'No unread emails' };
    }

    const emails = [];
    for (const msg of data.messages.slice(0, 5)) {
      const full = await googleFetch(`/gmail/v1/users/me/messages/${msg.id}?format=full`);
      emails.push(_parseEmail(full));
    }

    return { ok: true, count: emails.length, emails };
  },
});

registerSkill({
  name: 'email_list_starred',
  description: 'List starred/flagged emails',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max emails to return (default 10)' },
    },
  },
  handler: async ({ maxResults = 10 } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const data = await googleFetch(`/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:starred`);
    
    if (!data.messages?.length) {
      return { ok: true, count: 0, emails: [], message: 'No starred emails' };
    }

    const emails = [];
    for (const msg of data.messages.slice(0, 5)) {
      const full = await googleFetch(`/gmail/v1/users/me/messages/${msg.id}?format=full`);
      emails.push(_parseEmail(full));
    }

    return { ok: true, count: emails.length, emails };
  },
});

registerSkill({
  name: 'email_read',
  description: 'Read the full content of a specific email by ID',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'The email message ID' },
    },
    required: ['messageId'],
  },
  handler: async ({ messageId } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const email = await googleFetch(`/gmail/v1/users/me/messages/${messageId}?format=full`);
    
    const headers = email.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    let body = '';
    if (email.payload?.body?.data) {
      body = atob(email.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (email.payload?.parts) {
      const part = email.payload.parts.find(p => p.mimeType === 'text/plain');
      if (part?.body?.data) {
        body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    return {
      ok: true,
      id: email.id,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      body: body.slice(0, 2000),
    };
  },
});

registerSkill({
  name: 'email_send',
  description: 'Send an email to specified recipients',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address(es), comma-separated' },
      subject: { type: 'string', description: 'Email subject line' },
      body: { type: 'string', description: 'Email body content' },
      cc: { type: 'string', description: 'Optional CC recipients' },
    },
    required: ['to', 'subject', 'body'],
  },
  handler: async ({ to, subject, body, cc } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const raw = _buildRawEmail({ to, cc, subject, body });
    const encoded = _base64UrlEncode(raw);

    const data = await googleFetch('/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encoded }),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      messageId: data.id,
      message: `Email sent to ${to}`,
    };
  },
});

registerSkill({
  name: 'email_reply',
  description: 'Reply to a specific Gmail message by ID, preserving the thread.',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'The Gmail message ID to reply to.' },
      body: { type: 'string', description: 'The reply body to send.' },
    },
    required: ['messageId', 'body'],
  },
  handler: async ({ messageId, body } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const original = await googleFetch(`/gmail/v1/users/me/messages/${messageId}?format=full`);
    const headers = original.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const to = _extractAddress(getHeader('Reply-To') || getHeader('From'));
    if (!to) {
      return { ok: false, error: 'Could not determine a reply address for that email.' };
    }

    const originalMessageId = getHeader('Message-ID') || getHeader('Message-Id');
    const references = [getHeader('References'), originalMessageId].filter(Boolean).join(' ').trim();
    const raw = _buildRawEmail({
      to,
      subject: _replySubject(getHeader('Subject')),
      body,
      inReplyTo: originalMessageId || undefined,
      references: references || undefined,
    });

    const data = await googleFetch('/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        raw: _base64UrlEncode(raw),
        threadId: original.threadId,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: true,
      messageId: data.id,
      threadId: data.threadId || original.threadId,
      to,
      message: `Reply sent to ${to}`,
    };
  },
});

registerSkill({
  name: 'email_reply_latest',
  description: 'Reply to the latest Gmail message, optionally filtered by sender or Gmail search query.',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      body: { type: 'string', description: 'The reply body to send.' },
      from: { type: 'string', description: 'Optional sender email or name fragment to narrow the latest message.' },
      query: { type: 'string', description: 'Optional Gmail search query, e.g. "label:inbox subject:meeting".' },
    },
    required: ['body'],
  },
  handler: async ({ body, from, query } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const search = _gmailQuery({ from, query });
    const suffix = search ? `&q=${encodeURIComponent(search)}` : '';
    const list = await googleFetch(`/gmail/v1/users/me/messages?maxResults=1${suffix}`);
    const latest = list.messages?.[0];
    if (!latest?.id) {
      return { ok: false, error: 'No matching Gmail message found to reply to.' };
    }

    const result = await (async () => {
      const original = await googleFetch(`/gmail/v1/users/me/messages/${latest.id}?format=full`);
      const headers = original.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const to = _extractAddress(getHeader('Reply-To') || getHeader('From'));
      if (!to) {
        return { ok: false, error: 'Could not determine a reply address for that email.' };
      }

      const originalMessageId = getHeader('Message-ID') || getHeader('Message-Id');
      const references = [getHeader('References'), originalMessageId].filter(Boolean).join(' ').trim();
      const raw = _buildRawEmail({
        to,
        subject: _replySubject(getHeader('Subject')),
        body,
        inReplyTo: originalMessageId || undefined,
        references: references || undefined,
      });

      const data = await googleFetch('/gmail/v1/users/me/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          raw: _base64UrlEncode(raw),
          threadId: original.threadId,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        ok: true,
        messageId: data.id,
        threadId: data.threadId || original.threadId,
        repliedToMessageId: latest.id,
        to,
        subject: getHeader('Subject') || '(No subject)',
        message: `Reply sent to ${to}`,
      };
    })();

    return result;
  },
});

registerSkill({
  name: 'email_label',
  description: 'Add a label to an email (create label if needed)',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'Email message ID' },
      labelName: { type: 'string', description: 'Label name to apply' },
    },
    required: ['messageId', 'labelName'],
  },
  handler: async ({ messageId, labelName } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const labels = await googleFetch('/gmail/v1/users/me/labels');
    let labelId = labels.labels?.find(l => l.name === labelName)?.id;
    
    if (!labelId) {
      const created = await googleFetch('/gmail/v1/users/me/labels', {
        method: 'POST',
        body: JSON.stringify({ name: labelName }),
        headers: { 'Content-Type': 'application/json' },
      });
      labelId = created.id;
    }

    await googleFetch(`/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: [labelId] }),
      headers: { 'Content-Type': 'application/json' },
    });

    return { ok: true, message: `Label "${labelName}" applied` };
  },
});

registerSkill({
  name: 'email_archive',
  description: 'Archive an email (move to All Mail)',
  scope: 'app',
  roles: ['lecturer'],
  dangerous: true,
  parameters: {
    type: 'object',
    properties: {
      messageId: { type: 'string', description: 'Email message ID to archive' },
    },
    required: ['messageId'],
  },
  handler: async ({ messageId } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    await googleFetch(`/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    return { ok: true, message: 'Email archived' };
  },
});

registerSkill({
  name: 'email_search',
  description: 'Search emails by query (subject, sender, keywords)',
  scope: 'app',
  roles: EMAIL_SCOPES,
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Gmail search query' },
      maxResults: { type: 'number', description: 'Max results (default 10)' },
    },
    required: ['query'],
  },
  handler: async ({ query, maxResults = 10 } = {}) => {
    if (!isGoogleConnected()) {
      return { ok: false, error: 'Gmail not connected' };
    }

    const data = await googleFetch(`/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`);
    
    if (!data.messages?.length) {
      return { ok: true, count: 0, emails: [], message: 'No emails found' };
    }

    const emails = [];
    for (const msg of data.messages.slice(0, 5)) {
      const full = await googleFetch(`/gmail/v1/users/me/messages/${msg.id}?format=full`);
      emails.push(_parseEmail(full));
    }

    return { ok: true, count: emails.length, emails, query };
  },
});

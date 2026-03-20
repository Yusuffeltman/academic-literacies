// src/components/chat-panel.js
// Live chat UI — room list, thread view, input area, FAB with badge.
// Follows the ai-tutor.js pattern: createElement + innerHTML + event listeners.
import { STATE } from '../state.js';
import {
  sendMessage, openThread, closeThread, sendTypingIndicator,
  clearTypingIndicator, getCachedRooms, getUnreadTotal,
  setChatCallbacks, startChatListeners, stopChatListeners,
  setChatAvailability, clearLiveStatus, flushOfflineQueue,
  createGroupRoom, createDirectRoom, getRoomMembers,
  ensureTutorialGroupRooms, getAvailableStudents,
} from '../chat.js';
import { showToast } from './toaster.js';

let _chatOpen = false;
let _currentView = 'room-list'; // 'room-list' | 'thread' | 'new-chat'
let _activeRoomId = null;
let _messages = [];
let _liveStaff = {};
let _scheduledSessions = {};
let _typingUsers = {};
let _reminderTimer = null;

// ── Init ────────────────────────────────────────

export function initChatPanel() {
  if (document.getElementById('chat-fab')) return;

  // Create FAB
  const fab = document.createElement('button');
  fab.id = 'chat-fab';
  fab.className = 'chat-fab';
  fab.innerHTML = `<span class="chat-fab-icon">💬</span><span id="chat-fab-badge" class="chat-fab-badge hidden">0</span>`;
  fab.addEventListener('click', toggleChatPanel);
  document.body.appendChild(fab);

  // Create panel (hidden)
  const panel = document.createElement('div');
  panel.id = 'chat-panel';
  panel.className = 'chat-panel hidden';
  panel.innerHTML = _renderRoomList();
  document.body.appendChild(panel);

  // Wire callbacks from chat.js
  setChatCallbacks({
    onRoomListUpdate: _handleRoomListUpdate,
    onLiveStatusUpdate: _handleLiveStatusUpdate,
    onScheduledUpdate: _handleScheduledUpdate,
    onNewMessage: _handleNewMessages,
    onTypingUpdate: _handleTypingUpdate,
  });

  // Start listeners
  startChatListeners();

  // Flush any offline messages
  flushOfflineQueue().catch(console.error);

  // Scheduled session reminder — check every 60s
  _reminderTimer = setInterval(_checkScheduledReminders, 60_000);
}

export function destroyChatPanel() {
  stopChatListeners();
  if (_reminderTimer) { clearInterval(_reminderTimer); _reminderTimer = null; }
  document.getElementById('chat-fab')?.remove();
  document.getElementById('chat-panel')?.remove();
  _chatOpen = false;
  _currentView = 'room-list';
  _activeRoomId = null;
}

// ── Toggle ──────────────────────────────────────

export function toggleChatPanel() {
  _chatOpen = !_chatOpen;
  const panel = document.getElementById('chat-panel');
  if (!panel) return;

  if (_chatOpen) {
    panel.classList.remove('hidden');
    if (_currentView === 'room-list') {
      _renderAndMountRoomList();
    }
  } else {
    panel.classList.add('hidden');
    if (_activeRoomId) {
      closeThread();
      _activeRoomId = null;
      _currentView = 'room-list';
    }
  }
}

export function isChatPanelOpen() { return _chatOpen; }

export function closeChatPanel() {
  if (!_chatOpen) return;
  toggleChatPanel();
}

// ── Back handler (for Android) ──────────────────

export function handleChatBack() {
  if (!_chatOpen) return false;
  if (_currentView === 'thread') {
    closeThread();
    _activeRoomId = null;
    _currentView = 'room-list';
    _renderAndMountRoomList();
    return true;
  }
  if (_currentView === 'new-chat') {
    _currentView = 'room-list';
    _renderAndMountRoomList();
    return true;
  }
  closeChatPanel();
  return true;
}

// ── Callback handlers ───────────────────────────

function _handleRoomListUpdate(rooms) {
  _updateBadge();
  if (_chatOpen && _currentView === 'room-list') {
    _renderAndMountRoomList();
  }
}

function _handleLiveStatusUpdate(statuses, newlyLive) {
  _liveStaff = statuses;
  // Toast for newly-live staff
  for (const s of newlyLive) {
    showToast(`${s.name} is now available for chat${s.message ? ': ' + s.message : ''}`, 'info');
  }
  if (_chatOpen && _currentView === 'room-list') {
    _renderAndMountRoomList();
  }
}

function _handleScheduledUpdate(scheduled) {
  _scheduledSessions = scheduled;
  if (_chatOpen && _currentView === 'room-list') {
    _renderAndMountRoomList();
  }
}

function _handleNewMessages(roomId, messages) {
  if (_activeRoomId === roomId && _currentView === 'thread') {
    _messages = messages;
    _renderAndMountThread();
  }
}

function _handleTypingUpdate(roomId, typing) {
  if (_activeRoomId === roomId && _currentView === 'thread') {
    _typingUsers = typing;
    _updateTypingIndicator();
  }
}

// ── Badge ───────────────────────────────────────

function _updateBadge() {
  const badge = document.getElementById('chat-fab-badge');
  if (!badge) return;
  const total = getUnreadTotal();
  badge.textContent = total > 99 ? '99+' : String(total);
  badge.classList.toggle('hidden', total === 0);
}

// ── Room list rendering ─────────────────────────

function _renderRoomList() {
  const rooms = getCachedRooms();
  const role = STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student';
  const isStaff = role === 'tutor' || role === 'lecturer' || role === 'moderator';

  // Live staff section (for students)
  let liveHtml = '';
  const liveEntries = Object.entries(_liveStaff).filter(([, s]) => s.available);
  if (liveEntries.length > 0) {
    liveHtml = `
      <div class="chat-section-header">Live Now</div>
      ${liveEntries.map(([uid, s]) => `
        <div class="chat-live-item">
          <span class="chat-live-dot"></span>
          <span class="chat-live-name">${_esc(s.name)}</span>
          <span class="chat-live-role">${s.role}</span>
          ${s.message ? `<span class="chat-live-msg">${_esc(s.message)}</span>` : ''}
        </div>
      `).join('')}
    `;
  }

  // Upcoming scheduled sessions
  let scheduledHtml = '';
  const now = Date.now();
  const upcoming = Object.entries(_scheduledSessions)
    .filter(([, s]) => !s.cancelled && new Date(s.endsAt).getTime() > now)
    .sort((a, b) => new Date(a[1].startsAt) - new Date(b[1].startsAt))
    .slice(0, 3);
  if (upcoming.length > 0) {
    scheduledHtml = `
      <div class="chat-section-header">Upcoming Sessions</div>
      ${upcoming.map(([id, s]) => `
        <div class="chat-scheduled-item">
          <div class="chat-scheduled-title">${_esc(s.title)}</div>
          <div class="chat-scheduled-meta">${_esc(s.createdByName)} &middot; ${_formatDateTime(s.startsAt)}</div>
        </div>
      `).join('')}
    `;
  }

  // Room list
  const roomEntries = Object.entries(rooms)
    .sort((a, b) => (b[1].lastMessageAt || '').localeCompare(a[1].lastMessageAt || ''));

  let roomsHtml = '';
  if (roomEntries.length === 0) {
    roomsHtml = '<div class="chat-empty">No conversations yet</div>';
  } else {
    roomsHtml = roomEntries.map(([roomId, room]) => {
      const unread = room.unreadCount || 0;
      const icon = room.type === 'direct' ? '👤' : '👥';
      return `
        <button class="chat-room-item" data-room-id="${roomId}">
          <span class="chat-room-icon">${icon}</span>
          <div class="chat-room-info">
            <div class="chat-room-name">${_esc(room.name || 'Chat')}</div>
            <div class="chat-room-time">${room.lastMessageAt ? _formatTime(room.lastMessageAt) : ''}</div>
          </div>
          ${unread > 0 ? `<span class="chat-room-badge">${unread}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  // Staff: "New Conversation" button
  const newChatBtn = isStaff
    ? '<button class="chat-new-btn" id="chat-new-btn">+ New</button>'
    : '';

  return `
    <div class="chat-panel-header">
      <div class="chat-panel-title">Chat</div>
      ${newChatBtn}
      <button class="chat-panel-close" id="chat-panel-close">&times;</button>
    </div>
    <div class="chat-panel-body" id="chat-panel-body">
      ${liveHtml}
      ${scheduledHtml}
      ${roomEntries.length > 0 || liveEntries.length > 0 || upcoming.length > 0
        ? '<div class="chat-section-header">Conversations</div>'
        : ''}
      ${roomsHtml}
    </div>
  `;
}

function _renderAndMountRoomList() {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;
  panel.innerHTML = _renderRoomList();
  _wireRoomListEvents();
}

function _wireRoomListEvents() {
  document.getElementById('chat-panel-close')?.addEventListener('click', closeChatPanel);
  document.getElementById('chat-new-btn')?.addEventListener('click', () => {
    _currentView = 'new-chat';
    _renderAndMountNewChat();
  });
  document.querySelectorAll('.chat-room-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const roomId = btn.dataset.roomId;
      if (roomId) _openRoom(roomId);
    });
  });
}

// ── Thread rendering ────────────────────────────

let _readReceipts = {}; // { uid: { name, lastRead } }

function _openRoom(roomId) {
  _activeRoomId = roomId;
  _currentView = 'thread';
  _messages = [];
  _typingUsers = {};
  _readReceipts = {};
  openThread(roomId);
  _renderAndMountThread();
  // Load read receipts asynchronously
  _loadReadReceipts(roomId).then(r => {
    _readReceipts = r;
    _updateReadReceiptDisplay();
  });
}

function _renderThread() {
  const rooms = getCachedRooms();
  const room = rooms[_activeRoomId] || {};
  const roomName = room.name || 'Chat';
  const uid = STATE.user?.uid;

  // Find last own message index for read receipt placement
  let lastOwnIdx = -1;
  for (let i = _messages.length - 1; i >= 0; i--) {
    if (_messages[i].sender === uid && _messages[i].type !== 'system') { lastOwnIdx = i; break; }
  }

  const messagesHtml = _messages.map((msg, idx) => {
    if (msg.type === 'system') {
      return `<div class="chat-msg-system">${_esc(msg.text)}</div>`;
    }
    const isOwn = msg.sender === uid;
    const pending = msg.status === 'pending';
    const showReceipt = isOwn && idx === lastOwnIdx && !pending;
    return `
      <div class="chat-msg ${isOwn ? 'chat-msg-own' : 'chat-msg-other'} ${pending ? 'chat-msg-pending' : ''}">
        ${!isOwn ? `<div class="chat-msg-sender">${_esc(msg.senderName)}</div>` : ''}
        <div class="chat-msg-bubble">${_esc(msg.text)}</div>
        <div class="chat-msg-time">${_formatTime(msg.timestamp)}${pending ? ' · sending...' : ''}${showReceipt ? '<span id="chat-read-receipt" class="chat-read-receipt"></span>' : ''}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="chat-panel-header">
      <button class="chat-back-btn" id="chat-back-btn">&#8592;</button>
      <div class="chat-panel-title">${_esc(roomName)}</div>
      <button class="chat-panel-close" id="chat-panel-close">&times;</button>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messagesHtml || '<div class="chat-empty">No messages yet. Say hello!</div>'}
    </div>
    <div class="chat-typing" id="chat-typing"></div>
    <div class="chat-input-area">
      <textarea id="chat-input" class="chat-input" placeholder="Type a message..." rows="1"></textarea>
      <button id="chat-send-btn" class="chat-send-btn">Send</button>
    </div>
  `;
}

function _renderAndMountThread() {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;
  panel.innerHTML = _renderThread();
  _wireThreadEvents();
  _scrollToBottom();
}

function _wireThreadEvents() {
  document.getElementById('chat-panel-close')?.addEventListener('click', closeChatPanel);
  document.getElementById('chat-back-btn')?.addEventListener('click', () => {
    closeThread();
    _activeRoomId = null;
    _currentView = 'room-list';
    _renderAndMountRoomList();
  });

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  sendBtn?.addEventListener('click', _handleSend);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _handleSend();
    }
  });
  input?.addEventListener('input', () => {
    if (_activeRoomId) sendTypingIndicator(_activeRoomId);
  });
}

async function _handleSend() {
  const input = document.getElementById('chat-input');
  const text = input?.value?.trim();
  if (!text || !_activeRoomId) return;

  input.value = '';
  clearTypingIndicator(_activeRoomId);

  // Optimistic: add to local messages immediately
  const optimistic = {
    id: `local_${Date.now()}`,
    sender: STATE.user?.uid,
    senderName: STATE.user?.displayName?.split(' [')[0] || 'You',
    senderRole: STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student',
    text,
    timestamp: new Date().toISOString(),
    type: 'text',
    status: 'pending',
  };
  _messages.push(optimistic);
  _renderAndMountThread();

  await sendMessage(_activeRoomId, text);
}

function _scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }
}

function _updateTypingIndicator() {
  const el = document.getElementById('chat-typing');
  if (!el) return;
  const names = Object.values(_typingUsers).map(t => t.name);
  if (names.length === 0) {
    el.textContent = '';
  } else if (names.length === 1) {
    el.textContent = `${names[0]} is typing...`;
  } else {
    el.textContent = `${names.join(', ')} are typing...`;
  }
}

// ── New chat view (staff only) ──────────────────

async function _renderAndMountNewChat() {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="chat-panel-header">
      <button class="chat-back-btn" id="chat-new-back">&#8592;</button>
      <div class="chat-panel-title">New Conversation</div>
      <button class="chat-panel-close" id="chat-panel-close">&times;</button>
    </div>
    <div class="chat-panel-body" id="chat-panel-body">
      <div class="chat-section-header">Quick setup</div>
      <button id="chat-auto-groups" class="chat-room-item">
        <span class="chat-room-icon">⚡</span>
        <div class="chat-room-info">
          <div class="chat-room-name">Create tutorial group rooms</div>
          <div class="chat-room-time">Auto-create from your assigned groups</div>
        </div>
      </button>
      <button id="chat-new-broadcast" class="chat-room-item">
        <span class="chat-room-icon">📢</span>
        <div class="chat-room-info">
          <div class="chat-room-name">All Students broadcast</div>
          <div class="chat-room-time">Open channel for everyone</div>
        </div>
      </button>

      <div class="chat-section-header" style="margin-top:12px;">Custom group</div>
      <div class="chat-new-form">
        <input type="text" id="chat-new-name" class="chat-new-input" placeholder="Group name" />
        <button id="chat-new-create-group" class="chat-new-create-btn">Create</button>
      </div>

      <div class="chat-section-header" style="margin-top:12px;">Direct message a student</div>
      <div id="chat-student-list" class="chat-student-list">
        <div class="chat-empty" style="padding:12px 16px;">Loading students...</div>
      </div>
    </div>
  `;

  // Wire header buttons
  document.getElementById('chat-panel-close')?.addEventListener('click', closeChatPanel);
  document.getElementById('chat-new-back')?.addEventListener('click', () => {
    _currentView = 'room-list';
    _renderAndMountRoomList();
  });

  // Auto-create tutorial group rooms
  document.getElementById('chat-auto-groups')?.addEventListener('click', async () => {
    showToast('Creating tutorial group rooms...', 'info');
    try {
      const created = await ensureTutorialGroupRooms();
      if (created.length === 0) {
        showToast('All group rooms already exist', 'info');
      } else {
        showToast(`Created ${created.length} group room${created.length > 1 ? 's' : ''}!`, 'success');
      }
      _currentView = 'room-list';
      _renderAndMountRoomList();
    } catch (err) {
      showToast('Failed to create group rooms', 'error');
      console.error('Auto-create error:', err);
    }
  });

  // Broadcast room
  document.getElementById('chat-new-broadcast')?.addEventListener('click', async () => {
    const rooms = getCachedRooms();
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.name === 'All Students') {
        _openRoom(roomId);
        return;
      }
    }
    try {
      const roomId = await createGroupRoom('All Students', []);
      if (roomId) {
        showToast('Broadcast room created!', 'success');
        _openRoom(roomId);
      }
    } catch (err) {
      showToast('Failed to create broadcast room', 'error');
    }
  });

  // Custom group
  document.getElementById('chat-new-create-group')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('chat-new-name');
    const name = nameInput?.value?.trim();
    if (!name) { showToast('Please enter a group name', 'error'); return; }
    try {
      const roomId = await createGroupRoom(name, []);
      if (roomId) {
        showToast('Group created!', 'success');
        _openRoom(roomId);
      }
    } catch (err) {
      showToast('Failed to create group', 'error');
    }
  });

  // Load student list for 1:1 DMs
  _loadStudentListForDM();
}

async function _loadStudentListForDM() {
  const container = document.getElementById('chat-student-list');
  if (!container) return;

  try {
    const students = await getAvailableStudents();
    if (students.length === 0) {
      container.innerHTML = '<div class="chat-empty" style="padding:12px 16px;">No students found in your assigned groups.</div>';
      return;
    }

    // Check existing direct rooms to show status
    const rooms = getCachedRooms();
    const existingDirectUids = new Set();
    const existingDirectRoomIds = {};
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.type === 'direct' && room.otherUid) {
        existingDirectUids.add(room.otherUid);
        existingDirectRoomIds[room.otherUid] = roomId;
      }
    }

    container.innerHTML = students.map(s => {
      const hasRoom = existingDirectUids.has(s.uid);
      return `
        <button class="chat-room-item chat-student-item" data-student-uid="${s.uid}" data-student-name="${_esc(s.name)}" ${hasRoom ? `data-existing-room="${existingDirectRoomIds[s.uid]}"` : ''}>
          <span class="chat-room-icon">👤</span>
          <div class="chat-room-info">
            <div class="chat-room-name">${_esc(s.name)}</div>
            <div class="chat-room-time">${_esc(s.group)}${hasRoom ? ' · has chat' : ''}</div>
          </div>
          <span style="font-size:12px;color:#64748b;">${hasRoom ? 'Open' : 'Start'}</span>
        </button>
      `;
    }).join('');

    // Wire click handlers
    container.querySelectorAll('.chat-student-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const existingRoom = btn.dataset.existingRoom;
        if (existingRoom) {
          _openRoom(existingRoom);
          return;
        }
        const studentUid = btn.dataset.studentUid;
        const studentName = btn.dataset.studentName;
        try {
          const roomId = await createDirectRoom(studentUid, studentName);
          if (roomId) {
            showToast(`Chat started with ${studentName}`, 'success');
            _openRoom(roomId);
          }
        } catch (err) {
          showToast('Failed to start chat', 'error');
          console.error('DM create error:', err);
        }
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="chat-empty" style="padding:12px 16px;">Failed to load students.</div>';
    console.error('Load students error:', err);
  }
}

function _updateReadReceiptDisplay() {
  const el = document.getElementById('chat-read-receipt');
  if (!el) return;
  // Count how many other members have read up to or past the last own message timestamp
  const ownMessages = _messages.filter(m => m.sender === STATE.user?.uid && m.type !== 'system');
  if (ownMessages.length === 0) return;
  const lastOwnTs = ownMessages[ownMessages.length - 1].timestamp;
  const readers = Object.values(_readReceipts).filter(r => r.lastRead >= lastOwnTs);
  if (readers.length > 0) {
    el.textContent = ` · Seen`;
  }
}

// ── Scheduled session reminders ─────────────────

const _remindedSessions = new Set();

function _checkScheduledReminders() {
  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;
  for (const [id, s] of Object.entries(_scheduledSessions)) {
    if (s.cancelled || _remindedSessions.has(id)) continue;
    const startsAt = new Date(s.startsAt).getTime();
    const diff = startsAt - now;
    if (diff > 0 && diff <= fifteenMin) {
      _remindedSessions.add(id);
      const mins = Math.ceil(diff / 60_000);
      showToast(`Upcoming: "${s.title}" starts in ${mins} min`, 'info');
    }
  }
}

// ── Read receipts (thread enrichment) ───────────

async function _loadReadReceipts(roomId) {
  try {
    const members = await getRoomMembers(roomId);
    const receipts = {};
    for (const [uid, m] of Object.entries(members)) {
      if (uid !== STATE.user?.uid) {
        receipts[uid] = { name: m.role || 'member', lastRead: m.lastRead || '' };
      }
    }
    return receipts;
  } catch { return {}; }
}

// ── Utilities ───────────────────────────────────

function _esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function _formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function _formatDateTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── Staff helpers (exposed for dashboard integration) ──

export function renderGoLiveToggle(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const role = STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1] || 'student';
  if (role !== 'tutor' && role !== 'lecturer' && role !== 'moderator') return;

  const uid = STATE.user?.uid;
  const isLive = _liveStaff[uid]?.available || false;

  container.innerHTML = `
    <div class="chat-go-live-container">
      <button id="chat-go-live-btn" class="chat-go-live-btn ${isLive ? 'chat-go-live-btn--active' : ''}">
        <span class="chat-live-dot ${isLive ? '' : 'chat-live-dot--off'}"></span>
        ${isLive ? 'Live for Chat' : 'Go Live'}
      </button>
      ${isLive ? '<span class="chat-go-live-hint">Students can see you are available</span>' : ''}
    </div>
  `;

  document.getElementById('chat-go-live-btn')?.addEventListener('click', async () => {
    try {
      await setChatAvailability(!isLive);
      showToast(isLive ? 'You are no longer live for chat' : 'You are now live for chat!', 'success');
      // Re-render after a short delay for listener to update
      setTimeout(() => renderGoLiveToggle(containerId), 500);
    } catch (err) {
      showToast('Failed to update live status', 'error');
    }
  });
}

export { _liveStaff, _scheduledSessions };

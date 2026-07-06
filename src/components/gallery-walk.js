import { STATE } from '../state.js';
import { getGalleryPosts, createGalleryPost, addGalleryReaction, addGalleryComment, setGalleryPinned, hideGalleryPost, setGalleryStaffAssessment, uploadGalleryAsset, seedGalleryWalkDemoPosts } from '../gallery.js';
import { writeUploadSuccessEvent } from '../analytics.js';

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function me() {
  const user = STATE.user;
  const name = user?.displayName?.split(' [')[0] || user?.email || 'Student';
  return { uid: user?.uid || null, name };
}

function role() {
  return STATE.user?.displayName?.match(/\[(.*?)\]/)?.[1]?.toLowerCase() || 'student';
}

function analyticsProfile() {
  return STATE.user?._studentProfileContext?.profile || {
    uid: STATE.user?.uid || '',
    role: 'student',
    authEmail: STATE.user?.email || '',
    username: STATE.user?.email || '',
    displayName: STATE.user?.displayName || '',
  };
}

function isStaff() {
  const r = role();
  return r === 'lecturer' || r === 'tutor';
}

let _galleryPostsCache = [];
let _galleryFilter = 'all';
let _galleryViewMode = 'studio';
let _galleryTab = 'showcase';
let _galleryFeedFilter = 'all';
let _galleryFeedTag = '';
let _gallerySessionOptions = [];
let _gallerySessionSort = 'newest';

function _activeGalleryInstance() {
  const ctx = window._galleryInstanceContext;
  if (!ctx || typeof ctx !== 'object') return null;
  const id = String(ctx.id || '').trim();
  if (!id) return null;
  return {
    id,
    type: String(ctx.type || ''),
    day: String(ctx.day || ''),
    sessionId: String(ctx.sessionId || ''),
    label: String(ctx.label || ''),
  };
}

function _postInActiveInstance(post) {
  const ctx = _activeGalleryInstance();
  if (!ctx) return true;
  return String(post?.instanceId || '') === ctx.id;
}

function _collectGallerySessions(posts = []) {
  const seen = new Set();
  const sessions = [];
  posts.forEach((p) => {
    const id = String(p?.instanceId || '').trim();
    if (!id || seen.has(id)) return;
    const type = String(p?.instanceMeta?.type || '').trim();
    if (type && type !== 'tutorial') return;
    seen.add(id);
    sessions.push({
      id,
      type: type || 'tutorial',
      day: String(p?.instanceMeta?.day || '').trim(),
      sessionId: String(p?.instanceMeta?.sessionId || '').trim(),
      label: String(p?.instanceLabel || '').trim() || id,
      latestAt: String(p?.updatedAt || p?.createdAt || '').trim(),
    });
  });
  if (_gallerySessionSort === 'alpha') {
    sessions.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    sessions.sort((a, b) => {
      const ta = new Date(a.latestAt || 0).getTime();
      const tb = new Date(b.latestAt || 0).getTime();
      return tb - ta;
    });
  }
  return sessions;
}

async function _renderGallerySessionPicker() {
  const wrap = document.getElementById('gallery-session-picker-wrap');
  if (!wrap) return;
  if (!isStaff()) {
    wrap.innerHTML = '';
    return;
  }

  const posts = await getGalleryPosts();
  _gallerySessionOptions = _collectGallerySessions(posts);
  const active = _activeGalleryInstance();
  const currentValue = active?.id || '';

  wrap.innerHTML = `
    <label style="font-size:12px;color:var(--muted);font-weight:700;">Session</label>
    <select id="gallery-session-sort" onchange="_gallerySetSessionSort(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
      <option value="newest" ${_gallerySessionSort === 'newest' ? 'selected' : ''}>Newest first</option>
      <option value="alpha" ${_gallerySessionSort === 'alpha' ? 'selected' : ''}>A–Z</option>
    </select>
    <select id="gallery-session-picker" onchange="_gallerySetSessionScope(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;min-width:240px;">
      <option value="" ${currentValue === '' ? 'selected' : ''}>All sessions</option>
      ${_gallerySessionOptions.map((s) => `<option value="${esc(s.id)}" ${currentValue === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
    </select>
  `;
}

const GALLERY_CRITERIA = [
  {
    id: 'quality',
    title: 'Quality of Idea',
    desc: 'Is the core idea clear, relevant, and academically meaningful?',
  },
  {
    id: 'evidence',
    title: 'Use of Evidence',
    desc: 'Are claims supported with examples, sources, or concrete reasoning?',
  },
  {
    id: 'communication',
    title: 'Communication',
    desc: 'Is the work logically structured and easy for peers to understand?',
  },
  {
    id: 'collaboration',
    title: 'Collaboration / Contribution',
    desc: 'For group work: are roles and contributions visible? For individual work: does it engage peer dialogue?',
  },
  {
    id: 'reflection',
    title: 'Reflection & Improvement',
    desc: 'Does the submission show awareness of what was learned and what to improve next?',
  },
];

function _criteriaSummary(selfAssessment) {
  const scores = Object.values(selfAssessment?.scores || {}).map((v) => Number(v) || 0).filter((v) => v > 0);
  if (!scores.length) return null;
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  return `${avg}/4 self-rating`;
}

function _staffSummary(staffAssessment) {
  const scores = Object.values(staffAssessment?.scores || {}).map((v) => Number(v) || 0).filter((v) => v > 0);
  if (!scores.length) return null;
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  return `${avg}/4 staff-rating`;
}

function _scoreSelect(postId, critId, value = '') {
  const v = String(value || '');
  return `
    <select id="gallery-staff-${postId}-${critId}" style="padding:6px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
      <option value="" ${v === '' ? 'selected' : ''}>-</option>
      <option value="1" ${v === '1' ? 'selected' : ''}>1</option>
      <option value="2" ${v === '2' ? 'selected' : ''}>2</option>
      <option value="3" ${v === '3' ? 'selected' : ''}>3</option>
      <option value="4" ${v === '4' ? 'selected' : ''}>4</option>
    </select>
  `;
}

function _isPresentationPost(p) {
  const category = String(p?.category || '').toLowerCase();
  const hasAsset = Boolean(p?.asset?.url);
  const hasLink = Boolean(p?.link);
  return hasAsset || hasLink || category.includes('mini-lesson') || category.includes('workflow');
}

function _isFeedPost(p) {
  return p?.channel === 'feed' || String(p?.category || '').toLowerCase() === 'class feed';
}

function _normalizeTag(raw = '') {
  const t = String(raw || '').trim().toLowerCase();
  if (!t) return '';
  return t.startsWith('#') ? t : `#${t}`;
}

function _extractTagsFromPost(p) {
  const explicit = String(p?.tags || '').split(/[\s,]+/g).map(_normalizeTag).filter(Boolean);
  const contentTags = String(p?.content || '').match(/#[a-zA-Z0-9_-]+/g) || [];
  const merged = [...explicit, ...contentTags.map(_normalizeTag)];
  return [...new Set(merged)];
}

function _topFeedTagsFromPosts(posts = [], limit = 8) {
  const counts = new Map();
  posts.forEach((p) => {
    _extractTagsFromPost(p).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, Number(limit) || 8));
}

function _postCard(p) {
  const isFeed = _isFeedPost(p);
  const reactions = p.reactions || {};
  const comments = p.comments ? Object.values(p.comments) : [];
  const modeLabel = isFeed
    ? '💬 Class Feed'
    : (p.mode === 'group' ? `👥 Group: ${esc(p.groupName || 'Unnamed Group')}` : '🧍 Individual');
  const critSummary = _criteriaSummary(p.selfAssessment);
  const staffSummary = _staffSummary(p.staffAssessment);
  const assessmentGap = critSummary && staffSummary
    ? (Number(staffSummary.split('/')[0]) - Number(critSummary.split('/')[0])).toFixed(1)
    : null;
  const feedTags = _extractTagsFromPost(p);
  return `
    <article data-gallery-post-id="${p.id}" style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:box-shadow .2s ease, border-color .2s ease;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${modeLabel}</div>
          <h3 style="font-size:18px;color:var(--navy);margin:0 0 6px 0;">${esc(p.title || 'Untitled')}</h3>
          <div style="font-size:12px;color:var(--muted);">By ${esc(p.authorName || 'Anonymous')} · ${esc((p.createdAt || '').replace('T', ' ').slice(0, 16))}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          ${p.pinned ? '<span style="font-size:11px;background:#fffbeb;color:#92400e;padding:4px 8px;border-radius:999px;">📌 Highlighted</span>' : ''}
          <span style="font-size:11px;background:#eef2ff;color:#3730a3;padding:4px 8px;border-radius:999px;">${esc(p.category || 'General')}</span>
        </div>
      </div>

      <p style="margin:12px 0 8px 0;color:var(--navy);line-height:1.6;white-space:pre-wrap;">${esc(p.content || '')}</p>

      ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);">🔗 Linked artefact</a>` : ''}
      ${_assetPreviewHtml(p.asset)}

      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px;">
        ${isFeed ? feedTags.slice(0, 4).map((tag) => `<div style="font-size:11px;color:#374151;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:3px 8px;display:inline-flex;">${esc(tag)}</div>`).join('') : ''}
        ${critSummary ? `<div style="font-size:11px;color:#0f766e;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:3px 8px;display:inline-flex;">📏 ${esc(critSummary)}</div>` : ''}
        ${staffSummary ? `<div style="font-size:11px;color:#7c2d12;background:#fff7ed;border:1px solid #fdba74;border-radius:999px;padding:3px 8px;display:inline-flex;">🧑‍🏫 ${esc(staffSummary)}</div>` : ''}
        ${assessmentGap != null ? `<div style="font-size:11px;color:${Number(assessmentGap) >= 0 ? '#166534' : '#991b1b'};background:${Number(assessmentGap) >= 0 ? '#f0fdf4' : '#fef2f2'};border:1px solid ${Number(assessmentGap) >= 0 ? '#86efac' : '#fecaca'};border-radius:999px;padding:3px 8px;display:inline-flex;">Δ ${assessmentGap}</div>` : ''}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn-prev" style="display:inline-flex;" onclick="_galleryReact('${p.id}','heart')">❤️ ${reactions.heart || 0}</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_galleryReact('${p.id}','spark')">✨ ${reactions.spark || 0}</button>
        <button class="btn-prev" style="display:inline-flex;" onclick="_galleryReact('${p.id}','clap')">👏 ${reactions.clap || 0}</button>
        ${isFeed ? `<button class="btn-prev" style="display:inline-flex;" onclick="_galleryCopyPostLink('${p.id}')">🔗 Copy link</button>` : ''}
        ${isStaff() ? `<button class="btn-prev" style="display:inline-flex;${p.pinned ? 'border-color:#f59e0b;color:#b45309;' : ''}" onclick="_galleryPin('${p.id}',${p.pinned ? 'false' : 'true'})">${p.pinned ? 'Unpin' : '📌 Pin Highlight'}</button>
        <button class="btn-prev" style="display:inline-flex;border-color:#fecaca;color:#b91c1c;" onclick="_galleryHide('${p.id}')">Hide Post</button>` : ''}
      </div>

      ${isStaff() && !isFeed ? `
        <details style="margin-top:12px;border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;">
          <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--navy);">Assess Submission (Staff)</summary>
          <div style="display:grid;grid-template-columns:1fr 70px;gap:8px;align-items:center;margin-top:10px;">
            ${GALLERY_CRITERIA.map((c) => `
              <div style="font-size:12px;color:var(--navy);">${c.title}</div>
              ${_scoreSelect(p.id, c.id, p.staffAssessment?.scores?.[c.id] || '')}
            `).join('')}
          </div>
          <label style="font-size:11px;color:var(--muted);display:block;margin:10px 0 4px 0;">Feedback note (optional)</label>
          <textarea id="gallery-staff-fb-${p.id}" rows="2" placeholder="Short assessor feedback" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;">${esc(p.staffAssessment?.feedback || '')}</textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn-next" style="display:inline-flex;" onclick="_gallerySaveStaffAssess('${p.id}')">Save Assessment</button>
          </div>
        </details>
      ` : ''}

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;">Peer comments (${comments.length})</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;">
          ${comments.slice(-3).map(c => `<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--navy);"><strong>${esc(c.authorName || 'Peer')}:</strong> ${esc(c.text || '')}</div>`).join('') || '<div style="font-size:12px;color:var(--muted);">No comments yet.</div>'}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="gallery-cmt-${p.id}" type="text" placeholder="Add a constructive comment..." style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;" />
          <button class="btn-next" style="display:inline-flex;" onclick="_galleryComment('${p.id}')">Post</button>
        </div>
      </div>
    </article>`;
}

function _assetPreviewHtml(asset) {
  if (!asset?.url) return '';
  const type = String(asset.type || '').toLowerCase();
  const name = esc(asset.name || 'Attachment');
  const url = esc(asset.url);

  if (type.startsWith('image/')) {
    return `<div style="margin-top:10px;"><img src="${url}" alt="${name}" style="max-width:100%;border:1px solid var(--border);border-radius:10px;display:block;max-height:320px;object-fit:contain;background:#f8fafc;" /></div>`;
  }
  if (type.startsWith('video/')) {
    return `<div style="margin-top:10px;"><video controls style="max-width:100%;border:1px solid var(--border);border-radius:10px;display:block;max-height:320px;background:#000;"><source src="${url}" type="${esc(type)}" />Your browser does not support video playback.</video></div>`;
  }
  if (type === 'application/pdf') {
    return `<div style="margin-top:10px;"><a href="${url}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);">📄 Open PDF: ${name}</a></div>`;
  }
  return `<div style="margin-top:10px;"><a href="${url}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);">📎 Download file: ${name}</a></div>`;
}

async function _renderGalleryList() {
  const list = document.getElementById('gallery-list');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--muted);padding:10px;">Loading submissions…</div>';
  const posts = await getGalleryPosts();
  _galleryPostsCache = posts;
  const showcasePosts = posts.filter((p) => !_isFeedPost(p)).filter(_postInActiveInstance);
  const filtered = showcasePosts.filter((p) => {
    if (_galleryFilter === 'all') return true;
    if (_galleryFilter === 'individual') return p.mode !== 'group';
    if (_galleryFilter === 'group') return p.mode === 'group';
    if (_galleryFilter === 'pinned') return Boolean(p.pinned);
    if (_galleryFilter === 'presentations') return _isPresentationPost(p);
    return true;
  });
  if (!filtered.length) {
    list.innerHTML = '<div style="background:white;border:1px dashed var(--border);padding:20px;border-radius:12px;color:var(--muted);">No submissions yet. Be the first to share your work.</div>';
    return;
  }
  list.innerHTML = filtered.map(_postCard).join('');
  _focusGalleryPostIfNeeded();
}

async function _renderFeedList() {
  const list = document.getElementById('gallery-feed-list');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--muted);padding:10px;">Loading feed…</div>';
  const posts = await getGalleryPosts();
  _galleryPostsCache = posts;
  const allFeedPosts = posts.filter((p) => _isFeedPost(p)).filter(_postInActiveInstance);
  const trending = _topFeedTagsFromPosts(allFeedPosts, 8);
  const trendingEl = document.getElementById('gallery-feed-trending');
  if (trendingEl) {
    trendingEl.innerHTML = trending.length
      ? `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--muted);">Trending:</span>
          ${trending.map(([tag, count]) => `<button class="btn-prev" style="display:inline-flex;" onclick="_galleryPickFeedTag('${esc(tag)}')">${esc(tag)} · ${count}</button>`).join('')}
        </div>`
      : '';
  }
  const who = me();
  const desiredTag = _normalizeTag(_galleryFeedTag);
  const feedPosts = allFeedPosts.filter((p) => {
    if (_galleryFeedFilter === 'mine' && who.uid && p.authorUid !== who.uid) return false;
    if (_galleryFeedFilter === 'tag' && desiredTag) {
      const tags = _extractTagsFromPost(p);
      if (!tags.includes(desiredTag)) return false;
    }
    return true;
  });
  if (!feedPosts.length) {
    list.innerHTML = '<div style="background:white;border:1px dashed var(--border);padding:20px;border-radius:12px;color:var(--muted);">No matching feed posts yet. Try a different filter or create a new post.</div>';
    return;
  }
  list.innerHTML = feedPosts.map(_postCard).join('');
}

function _focusGalleryPostIfNeeded() {
  const targetId = window._galleryFocusPostId;
  if (!targetId) return;
  const el = document.querySelector(`[data-gallery-post-id="${targetId}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.borderColor = '#f59e0b';
  el.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.22), 0 8px 20px rgba(0,0,0,.08)';
  setTimeout(() => {
    el.style.borderColor = 'var(--border)';
    el.style.boxShadow = '0 2px 10px rgba(0,0,0,.04)';
  }, 2200);

  window._galleryFocusPostId = null;
}

function _exportPostsCsv() {
  const rows = _galleryPostsCache.map((p) => [
    p.id,
    p.mode,
    p.groupName || '',
    p.category || '',
    p.title || '',
    p.authorName || '',
    p.createdAt || '',
    p.pinned ? 'yes' : 'no',
    (p.reactions?.heart || 0) + (p.reactions?.spark || 0) + (p.reactions?.clap || 0),
  ]);
  const header = ['id','mode','groupName','category','title','author','createdAt','pinned','totalReactions'];
  const csv = [header, ...rows]
    .map((arr) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gallery-walk-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function renderGalleryWalk() {
  const area = document.getElementById('content-area');
  if (!area) return;
  const currentRole = role();
  const activeInstance = _activeGalleryInstance();
  _galleryViewMode = window._galleryViewMode === 'showroom' ? 'showroom' : 'studio';
  const showroomMode = _galleryViewMode === 'showroom';
  if (showroomMode) _galleryTab = 'showcase';
  if (showroomMode && _galleryFilter === 'all') _galleryFilter = 'presentations';
  if (!showroomMode && _galleryFilter === 'presentations') _galleryFilter = 'all';
  const backLabel = (currentRole === 'lecturer' || currentRole === 'tutor') ? 'Back to Dashboard' : 'Back to Home';

  area.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
      <button class="btn-prev" style="display:inline-flex;" onclick="_galleryBackToDashboard()">← ${backLabel}</button>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div id="gallery-session-picker-wrap" style="display:flex;align-items:center;gap:6px;"></div>
        ${showroomMode ? '<button class="btn-prev" style="display:inline-flex;" onclick="_galleryOpenStudio()">✍ Open Studio</button>' : '<button class="btn-prev" style="display:inline-flex;" onclick="_galleryOpenShowroom()">🎞 Open Showroom</button>'}
      </div>
    </div>
    <h1>${showroomMode ? 'Gallery Walk Showroom' : 'Gallery Walk Studio'}</h1>
    <p class="lead">${showroomMode ? 'Presentation artefacts only — curated for projection and class walkthroughs.' : 'Share your work, explore your peers’ ideas, and build both individual and collaborative artefacts.'}</p>
    ${activeInstance ? `<div style="margin:-2px 0 12px 0;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 10px;">Scoped session: <strong>${esc(activeInstance.label || activeInstance.id)}</strong> · New posts save to this tutorial session.</div>` : ''}

    <div style="display:grid;grid-template-columns:${showroomMode ? '1fr' : 'minmax(280px,420px) 1fr'};gap:16px;align-items:start;">
      ${showroomMode ? '' : `
      <section style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;position:sticky;top:10px;">
        <h3 style="margin:0 0 12px 0;color:var(--navy);">Submit to the Gallery</h3>
        ${isStaff() ? '<button class="btn-prev" style="display:inline-flex;margin-bottom:10px;" onclick="_gallerySeedDemo()">🧪 Load Demo Gallery Walk</button>' : ''}

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Work type</label>
        <select id="gallery-mode" style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;" onchange="_galleryModeToggle()">
          <option value="individual">Individual Work</option>
          <option value="group">Collaborative Group Work</option>
        </select>

        <div id="gallery-group-wrap" style="display:none;">
          <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Group name</label>
          <input id="gallery-group-name" type="text" placeholder="e.g. Team SIFT Investigators" style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;" />
        </div>

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Category</label>
        <select id="gallery-category" style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">
          <option>Mini-Lesson Output</option>
          <option>Workflow Reflection</option>
          <option>Draft Paragraph</option>
          <option>Source Evaluation</option>
          <option>Other</option>
        </select>

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Title</label>
        <input id="gallery-title" type="text" placeholder="Give your work a clear title" style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;" />

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Your work</label>
        <textarea id="gallery-content" rows="7" placeholder="Paste or write your artefact..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;"></textarea>

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Optional link</label>
        <input id="gallery-link" type="url" placeholder="https://..." style="width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px;" />

        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Upload file (optional)</label>
        <input id="gallery-file" type="file" accept="image/*,video/*,application/pdf,.ppt,.pptx,.doc,.docx,.txt" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:#fff;margin-bottom:12px;" />

        <div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:#f8fafc;margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px;">Assessment Criteria (Rubric)</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:8px;">Rate your submission from 1–4 for each criterion before publishing.<br>1 = Emerging · 2 = Developing · 3 = Proficient · 4 = Excellent</div>
          ${GALLERY_CRITERIA.map((c) => `
            <div style="display:grid;grid-template-columns:1fr 84px;gap:8px;align-items:center;margin-bottom:8px;">
              <div>
                <div style="font-size:12px;color:var(--navy);font-weight:600;">${c.title}</div>
                <div style="font-size:11px;color:var(--muted);">${c.desc}</div>
              </div>
              <select id="gallery-crit-${c.id}" style="padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
                <option value="">-</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
          `).join('')}
          <label style="font-size:11px;color:var(--muted);display:block;margin:6px 0 4px 0;">Brief reflective note (required)</label>
          <textarea id="gallery-reflection" rows="3" placeholder="What is one strength of this submission, and one next improvement?" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;"></textarea>
        </div>

        <button class="auth-submit" onclick="_gallerySubmit()">Publish to Gallery Walk</button>
        <div id="gallery-msg" style="font-size:12px;color:var(--muted);margin-top:8px;min-height:16px;"></div>
      </section>
      `}

      <section>
        ${showroomMode ? '' : `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
          <button class="btn-prev" style="display:inline-flex;${_galleryTab === 'showcase' ? 'background:#eef2ff;border-color:#c7d2fe;color:#3730a3;' : ''}" onclick="_gallerySetTab('showcase')">🖼 Showcase</button>
          <button class="btn-prev" style="display:inline-flex;${_galleryTab === 'feed' ? 'background:#eef2ff;border-color:#c7d2fe;color:#3730a3;' : ''}" onclick="_gallerySetTab('feed')">💬 Class Feed</button>
        </div>
        `}

        <div id="gallery-showcase-panel" style="display:${_galleryTab === 'feed' && !showroomMode ? 'none' : 'block'};">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          <h3 style="margin:0;color:var(--navy);">Showcase Wall</h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="gallery-filter" onchange="_gallerySetFilter(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
              ${showroomMode
                ? `<option value="presentations" ${_galleryFilter === 'presentations' ? 'selected' : ''}>Presentations Only</option>
                   <option value="pinned" ${_galleryFilter === 'pinned' ? 'selected' : ''}>Pinned Highlights</option>`
                : `<option value="all" ${_galleryFilter === 'all' ? 'selected' : ''}>All</option>
                   <option value="individual" ${_galleryFilter === 'individual' ? 'selected' : ''}>Individual</option>
                   <option value="group" ${_galleryFilter === 'group' ? 'selected' : ''}>Group</option>
                   <option value="presentations" ${_galleryFilter === 'presentations' ? 'selected' : ''}>Presentations Only</option>
                   <option value="pinned" ${_galleryFilter === 'pinned' ? 'selected' : ''}>Pinned Highlights</option>`}
            </select>
            ${isStaff() ? '<button class="btn-prev" style="display:inline-flex;" onclick="_galleryExport()">⬇ Export CSV</button>' : ''}
            <button class="btn-prev" style="display:inline-flex;" onclick="_galleryRefresh()">↻ Refresh</button>
          </div>
        </div>
        <div id="gallery-list" style="display:flex;flex-direction:column;gap:12px;"></div>
        </div>

        <div id="gallery-feed-panel" style="display:${_galleryTab === 'feed' && !showroomMode ? 'block' : 'none'};">
          <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;">
            <h3 style="margin:0 0 8px 0;color:var(--navy);">Class Feed</h3>
            <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Quick social posts for updates, questions, and links.</div>
            <textarea id="gallery-feed-text" rows="3" placeholder="Share an update, ask a question, or post an idea…" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;"></textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
              <input id="gallery-feed-tags" type="text" placeholder="#unit3 #sources" style="padding:8px;border:1px solid var(--border);border-radius:8px;" />
              <input id="gallery-feed-link" type="url" placeholder="Optional link" style="padding:8px;border:1px solid var(--border);border-radius:8px;" />
            </div>
            <input id="gallery-feed-file" type="file" accept="image/*,video/*,application/pdf,.ppt,.pptx,.doc,.docx,.txt" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:#fff;margin-bottom:8px;" />
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div id="gallery-feed-msg" style="font-size:12px;color:var(--muted);min-height:16px;"></div>
              <button class="btn-next" style="display:inline-flex;" onclick="_galleryPostFeed()">Post to Feed</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
            <select id="gallery-feed-filter" onchange="_gallerySetFeedFilter(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;">
              <option value="all" ${_galleryFeedFilter === 'all' ? 'selected' : ''}>All posts</option>
              <option value="mine" ${_galleryFeedFilter === 'mine' ? 'selected' : ''}>My posts</option>
              <option value="tag" ${_galleryFeedFilter === 'tag' ? 'selected' : ''}>#Tag</option>
            </select>
            <input id="gallery-feed-filter-tag" type="text" value="${esc(_galleryFeedTag)}" placeholder="#unit3" oninput="_gallerySetFeedTag(this.value)" style="padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:12px;min-width:120px;${_galleryFeedFilter === 'tag' ? '' : 'display:none;'}" />
            ${_galleryFeedFilter === 'tag' && _normalizeTag(_galleryFeedTag)
              ? `<button class="btn-prev" style="display:inline-flex;" onclick="_galleryClearFeedTag()">✕ ${esc(_normalizeTag(_galleryFeedTag))}</button>`
              : ''}
            <button class="btn-prev" style="display:inline-flex;" onclick="_galleryRefreshFeed()">↻ Refresh</button>
          </div>
          <div id="gallery-feed-trending" style="margin:2px 0 10px 0;"></div>
          <div id="gallery-feed-list" style="display:flex;flex-direction:column;gap:12px;"></div>
        </div>
      </section>
    </div>
  `;

  window._galleryModeToggle = () => {
    const mode = document.getElementById('gallery-mode')?.value || 'individual';
    const groupWrap = document.getElementById('gallery-group-wrap');
    if (groupWrap) groupWrap.style.display = mode === 'group' ? 'block' : 'none';
  };
  window._galleryBackToDashboard = () => {
    const r = role();
    if (r === 'lecturer') {
      window.returnToLecturerDashboard?.();
      return;
    }
    if (r === 'tutor') {
      if (window._viewAsTutorFromLecturer) {
        window.returnToLecturerDashboard?.();
        return;
      }
      window.returnToDashboardView?.();
      return;
    }
    window.renderStudentDashboard?.();
  };
  window._galleryOpenShowroom = () => {
    window._galleryViewMode = 'showroom';
    window.openGalleryShowroom?.({ instanceContext: _activeGalleryInstance() || undefined });
  };
  window._galleryOpenStudio = () => {
    window._galleryViewMode = 'studio';
    window.openGalleryWalk?.({ instanceContext: _activeGalleryInstance() || undefined });
  };

  window._gallerySubmit = async () => {
    const mode = document.getElementById('gallery-mode')?.value || 'individual';
    const groupName = (document.getElementById('gallery-group-name')?.value || '').trim();
    const category = (document.getElementById('gallery-category')?.value || 'Other').trim();
    const title = (document.getElementById('gallery-title')?.value || '').trim();
    const content = (document.getElementById('gallery-content')?.value || '').trim();
    const link = (document.getElementById('gallery-link')?.value || '').trim();
    const fileInput = document.getElementById('gallery-file');
    const file = fileInput?.files?.[0] || null;
    const reflection = (document.getElementById('gallery-reflection')?.value || '').trim();
    const msg = document.getElementById('gallery-msg');

    const scores = Object.fromEntries(
      GALLERY_CRITERIA.map((c) => [c.id, document.getElementById(`gallery-crit-${c.id}`)?.value || ''])
    );
    const missingCriteria = Object.values(scores).some((v) => !v);

    if (!title || !content) {
      if (msg) msg.textContent = 'Please provide both a title and work content.';
      return;
    }
    if (mode === 'group' && !groupName) {
      if (msg) msg.textContent = 'Please add a group name for collaborative work.';
      return;
    }
    if (missingCriteria) {
      if (msg) msg.textContent = 'Please complete all rubric ratings (1–4) before publishing.';
      return;
    }
    if (!reflection) {
      if (msg) msg.textContent = 'Please add a short reflective note before publishing.';
      return;
    }

    const who = me();
    const instance = _activeGalleryInstance();
    let asset = null;
    if (file) {
      if (msg) msg.textContent = 'Uploading file…';
      asset = await uploadGalleryAsset(file, who.uid || 'anonymous');
      if (!asset) {
        if (msg) msg.textContent = 'File upload failed. Please try again or submit without a file.';
        return;
      }
      await writeUploadSuccessEvent({
        user: STATE.user || {},
        profile: analyticsProfile(),
        scope: 'gallery-walk',
        sessionId: instance?.sessionId || '',
        unitId: instance?.unitId || instance?.id || '',
        asset,
        source: 'gallery-walk-upload',
      }).catch(() => {});
    }
    const created = await createGalleryPost({
      mode: mode === 'group' ? 'group' : 'individual',
      groupName: mode === 'group' ? groupName : null,
      category,
      title,
      content,
      link: link || null,
      asset,
      authorUid: who.uid,
      authorName: who.name,
      instanceId: instance?.id || null,
      instanceLabel: instance?.label || null,
      instanceMeta: instance ? {
        type: instance.type || null,
        day: instance.day || null,
        sessionId: instance.sessionId || null,
      } : null,
      rubricVersion: 'gallery-v1',
      selfAssessment: {
        scores,
        reflection,
      },
    });

    if (!created) {
      if (msg) msg.textContent = 'Could not publish right now. Please try again.';
      return;
    }

    window.trackLearningEvent?.('gallery_submission', {
      mode: mode === 'group' ? 'group' : 'individual',
      category,
      hasLink: Boolean(link),
      hasAsset: Boolean(asset?.url),
      hasReflection: Boolean(reflection),
    });

    if (msg) msg.textContent = 'Published! Your work is now on the showcase wall.';
    // Save gallery submission to notebook
    try {
      if (!window.STATE || !window.saveState) {
        const mod = await import('../state.js');
        window.STATE = mod.STATE;
        window.saveState = mod.saveState;
      }
      const entryId = `gallery-${created}`;
      if (!window.STATE.tutorialNotebook) window.STATE.tutorialNotebook = { entries: {} };
      window.STATE.tutorialNotebook.entries[entryId] = {
        type: 'gallery-upload',
        assetUrl: asset?.url || null,
        assetName: asset?.name || null,
        reflection,
        rubricScores: scores,
        category,
        title,
        content,
        link: link || null,
        timestamp: new Date().toISOString(),
        galleryPostId: created,
      };
      await window.saveState();
    } catch (err) {
      console.error('Notebook save failed:', err);
    }
    document.getElementById('gallery-title').value = '';
    document.getElementById('gallery-content').value = '';
    document.getElementById('gallery-link').value = '';
    if (fileInput) fileInput.value = '';
    document.getElementById('gallery-reflection').value = '';
    GALLERY_CRITERIA.forEach((c) => {
      const el = document.getElementById(`gallery-crit-${c.id}`);
      if (el) el.value = '';
    });
    await _renderGalleryList();
  };

  window._galleryReact = async (postId, reaction) => {
    await addGalleryReaction(postId, reaction);
    await _renderGalleryList();
  };

  window._galleryComment = async (postId) => {
    const input = document.getElementById(`gallery-cmt-${postId}`);
    const text = (input?.value || '').trim();
    if (!text) return;
    const who = me();
    const ok = await addGalleryComment(postId, {
      authorUid: who.uid,
      authorName: who.name,
      text,
    });
    if (ok && input) input.value = '';
    await _renderGalleryList();
  };

  window._galleryRefresh = () => _renderGalleryList();
  window._gallerySetFilter = (value) => {
    _galleryFilter = value || 'all';
    _renderGalleryList();
  };
  window._gallerySetTab = (tab) => {
    _galleryTab = tab === 'feed' ? 'feed' : 'showcase';
    renderGalleryWalk();
  };
  window._gallerySetFeedFilter = (value) => {
    _galleryFeedFilter = value || 'all';
    const tagInput = document.getElementById('gallery-feed-filter-tag');
    if (tagInput) tagInput.style.display = _galleryFeedFilter === 'tag' ? '' : 'none';
    _renderFeedList();
  };
  window._gallerySetFeedTag = (value) => {
    _galleryFeedTag = value || '';
    if (_galleryFeedFilter === 'tag') {
      _renderFeedList();
      renderGalleryWalk();
    }
  };
  window._galleryClearFeedTag = () => {
    _galleryFeedFilter = 'all';
    _galleryFeedTag = '';
    const filterSel = document.getElementById('gallery-feed-filter');
    if (filterSel) filterSel.value = 'all';
    const tagInput = document.getElementById('gallery-feed-filter-tag');
    if (tagInput) {
      tagInput.value = '';
      tagInput.style.display = 'none';
    }
    _renderFeedList();
    renderGalleryWalk();
  };
  window._galleryPickFeedTag = (tag) => {
    _galleryFeedFilter = 'tag';
    _galleryFeedTag = _normalizeTag(tag || '');
    const filterSel = document.getElementById('gallery-feed-filter');
    if (filterSel) filterSel.value = 'tag';
    const tagInput = document.getElementById('gallery-feed-filter-tag');
    if (tagInput) {
      tagInput.style.display = '';
      tagInput.value = _galleryFeedTag;
    }
    _renderFeedList();
  };
  window._galleryRefreshFeed = () => _renderFeedList();
  window._gallerySetSessionScope = (sessionScopeId) => {
    const id = String(sessionScopeId || '').trim();
    if (!id) {
      window._galleryInstanceContext = null;
      renderGalleryWalk();
      return;
    }
    const match = _gallerySessionOptions.find((s) => s.id === id);
    if (!match) {
      window._galleryInstanceContext = { id };
      renderGalleryWalk();
      return;
    }
    window._galleryInstanceContext = {
      id: match.id,
      type: match.type,
      day: match.day,
      sessionId: match.sessionId,
      label: match.label,
    };
    renderGalleryWalk();
  };
  window._gallerySetSessionSort = (sortValue) => {
    _gallerySessionSort = sortValue === 'alpha' ? 'alpha' : 'newest';
    renderGalleryWalk();
  };
  window._galleryCopyPostLink = async (postId) => {
    const link = new URL(window.location.href);
    link.searchParams.set('galleryPost', postId);
    const value = link.toString();

    try {
      await navigator.clipboard.writeText(value);
      alert('Post link copied to clipboard.');
      return;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('Post link copied to clipboard.');
      } catch {
        alert(`Copy this link:\n${value}`);
      } finally {
        ta.remove();
      }
    }
  };
  window._galleryExport = () => _exportPostsCsv();
  window._galleryPin = async (postId, pin) => {
    await setGalleryPinned(postId, Boolean(pin));
    await _renderGalleryList();
  };
  window._galleryHide = async (postId) => {
    const ok = confirm('Hide this post from the gallery?');
    if (!ok) return;
    await hideGalleryPost(postId);
    await _renderGalleryList();
  };
  window._gallerySaveStaffAssess = async (postId) => {
    const scores = Object.fromEntries(
      GALLERY_CRITERIA.map((c) => [c.id, document.getElementById(`gallery-staff-${postId}-${c.id}`)?.value || ''])
    );
    const missing = Object.values(scores).some((v) => !v);
    if (missing) {
      alert('Please score all criteria (1–4) before saving staff assessment.');
      return;
    }

    const who = me();
    const fb = (document.getElementById(`gallery-staff-fb-${postId}`)?.value || '').trim();
    await setGalleryStaffAssessment(postId, {
      assessorUid: who.uid,
      assessorName: who.name,
      assessorRole: role(),
      assessedAt: new Date().toISOString(),
      scores,
      feedback: fb,
    });
    await _renderGalleryList();
  };
  window._gallerySeedDemo = async () => {
    const msg = document.getElementById('gallery-msg');
    if (msg) msg.textContent = 'Loading demo gallery artefacts…';
    const res = await seedGalleryWalkDemoPosts();
    if (msg) {
      msg.textContent = res.skipped
        ? 'Demo artefacts already loaded. Scroll the showcase wall to view them.'
        : `Demo loaded: ${res.seeded} sample submissions added.`;
    }
    await _renderGalleryList();
  };
  window._galleryPostFeed = async () => {
    const msg = document.getElementById('gallery-feed-msg');
    const text = (document.getElementById('gallery-feed-text')?.value || '').trim();
    const tags = (document.getElementById('gallery-feed-tags')?.value || '').trim();
    const link = (document.getElementById('gallery-feed-link')?.value || '').trim();
    const fileInput = document.getElementById('gallery-feed-file');
    const file = fileInput?.files?.[0] || null;
    if (!text) {
      if (msg) msg.textContent = 'Write a short post before publishing.';
      return;
    }
    const who = me();
    const instance = _activeGalleryInstance();
    let asset = null;
    if (file) {
      if (msg) msg.textContent = 'Uploading file…';
      asset = await uploadGalleryAsset(file, who.uid || 'anonymous');
      if (!asset) {
        if (msg) msg.textContent = 'Upload failed. Try again or post without a file.';
        return;
      }
      await writeUploadSuccessEvent({
        user: STATE.user || {},
        profile: analyticsProfile(),
        scope: 'gallery-feed',
        sessionId: instance?.sessionId || '',
        unitId: instance?.unitId || instance?.id || '',
        asset,
        source: 'gallery-feed-upload',
      }).catch(() => {});
    }
    const postId = await createGalleryPost({
      channel: 'feed',
      mode: 'individual',
      category: 'Class Feed',
      title: `Feed post · ${new Date().toLocaleDateString()}`,
      content: text,
      link: link || null,
      asset,
      tags: tags || null,
      authorUid: who.uid,
      authorName: who.name,
      instanceId: instance?.id || null,
      instanceLabel: instance?.label || null,
      instanceMeta: instance ? {
        type: instance.type || null,
        day: instance.day || null,
        sessionId: instance.sessionId || null,
      } : null,
    });
    if (!postId) {
      if (msg) msg.textContent = 'Could not post right now. Please retry.';
      return;
    }
    window.trackLearningEvent?.('feed_post', {
      hasLink: Boolean(link),
      hasAsset: Boolean(asset?.url),
      hasTags: Boolean(tags),
    });
    if (msg) msg.textContent = 'Posted to class feed.';
    document.getElementById('gallery-feed-text').value = '';
    document.getElementById('gallery-feed-tags').value = '';
    document.getElementById('gallery-feed-link').value = '';
    if (fileInput) fileInput.value = '';
    await _renderFeedList();
  };

  window._galleryModeToggle();
  _renderGallerySessionPicker();
  _renderGalleryList();
  _renderFeedList();
}

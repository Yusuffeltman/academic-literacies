// src/components/resource-library.js
// ─────────────────────────────────────────────
// Student-facing Resource Library: personalised strip, filters, grid, lightbox.
// ─────────────────────────────────────────────
import { STATE } from '../state.js';
import { SEED_RESOURCES } from '../../content/resources.js';
import { getLecturerResources } from '../resources.js';

const SKILL_LABELS = {
  critical_reading:   'Critical Reading',
  evidence_use:       'Using Evidence',
  argument_structure: 'Argument Structure',
  academic_tone:      'Academic Tone',
  source_evaluation:  'Source Evaluation',
  citation_practice:  'Citation & Integrity',
  research_skills:    'Research Skills',
  ai_literacy:        'AI Literacy',
};

const TYPE_ICONS = {
  video:   '▶',
  pdf:     '📄',
  podcast: '🎧',
  article: '📰',
  tiktok:  '♪',
  tweet:   '𝕏',
  image:   '🖼',
  link:    '🔗',
};

// Module-level state
let _allResources = [];
let _activeType   = 'all';
let _activeSkill  = 'all';
let _searchQuery  = '';

// ── Public entry point ────────────────────────
export async function renderResourceLibrary() {
  const area = document.getElementById('content-area');
  if (!area) return;

  area.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);">⏳ Loading resources…</div>';

  // Merge seed + Firebase
  const lecturerResources = await getLecturerResources();
  _allResources = [
    ...SEED_RESOURCES,
    ...lecturerResources.filter(r => r.vetted && !r.removed),
  ];

  // Reset filters
  _activeType   = 'all';
  _activeSkill  = 'all';
  _searchQuery  = '';

  _renderPage();
}

// ── Main render ───────────────────────────────
function _renderPage() {
  const area = document.getElementById('content-area');
  if (!area) return;

  const weakSkills = Object.entries(STATE.adaptive?.skill_status || {})
    .filter(([, s]) => s === 'weak' || s === 'developing')
    .map(([id]) => id);

  const recommended = weakSkills.length
    ? _allResources.filter(r => r.skillTags.some(t => weakSkills.includes(t))).slice(0, 6)
    : [];

  area.innerHTML = `
    <div class="resource-library">
      <h1>📚 Resource Library</h1>
      <p class="resource-library-sub">Curated multimedia learning materials to support your academic writing journey.</p>

      ${recommended.length ? `
        <div class="resource-rec-section">
          <div class="resource-rec-label">⭐ Recommended for you</div>
          <div class="resource-rec-strip" id="rl-rec-strip">
            ${recommended.map(_cardHTML).join('')}
          </div>
        </div>` : ''}

      <div class="resource-filters">
        <div class="resource-filter-row">
          <div class="resource-search-wrap">
            <span class="resource-search-icon">🔍</span>
            <input
              id="rl-search"
              class="resource-search"
              type="text"
              placeholder="Search resources…"
              value="${_escapeAttr(_searchQuery)}"
            />
          </div>
          ${['all','video','pdf','podcast','article','tiktok','tweet','link'].map(t => `
            <button
              class="resource-filter-pill ${_activeType === t ? 'active' : ''}"
              data-rl-type="${t}"
            >${t === 'all' ? 'All' : _capitalize(t)}</button>
          `).join('')}
        </div>
        <div class="resource-filter-row">
          <span style="font-size:12px;color:var(--muted);font-weight:600;min-width:52px;">Skills:</span>
          <button class="resource-skill-chip ${_activeSkill === 'all' ? 'active' : ''}" data-rl-skill="all">All Skills</button>
          ${Object.entries(SKILL_LABELS).map(([id, label]) => `
            <button class="resource-skill-chip ${_activeSkill === id ? 'active' : ''}" data-rl-skill="${id}">${label}</button>
          `).join('')}
        </div>
      </div>

      <div class="resource-grid" id="rl-grid">
        ${_filteredCardsHTML()}
      </div>
    </div>`;

  _bindEvents(area);
}

// ── Bind events ───────────────────────────────
function _bindEvents(area) {
  // Search
  const searchEl = area.querySelector('#rl-search');
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      _searchQuery = e.target.value;
      _updateGrid();
    });
  }

  // Type filter pills
  area.querySelectorAll('[data-rl-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeType = btn.dataset.rlType;
      area.querySelectorAll('[data-rl-type]').forEach(b => b.classList.toggle('active', b === btn));
      _updateGrid();
    });
  });

  // Skill chips
  area.querySelectorAll('[data-rl-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeSkill = btn.dataset.rlSkill;
      area.querySelectorAll('[data-rl-skill]').forEach(b => b.classList.toggle('active', b === btn));
      _updateGrid();
    });
  });

  // Card clicks (grid + rec strip)
  area.addEventListener('click', e => {
    const card = e.target.closest('[data-rl-id]');
    if (card) {
      const id  = card.dataset.rlId;
      const res = _allResources.find(r => r.id === id);
      if (res) _openLightbox(res);
    }
  });
}

// ── Grid update (no full re-render) ──────────
function _updateGrid() {
  const grid = document.getElementById('rl-grid');
  if (grid) grid.innerHTML = _filteredCardsHTML();
}

// ── Filter logic ─────────────────────────────
function _filtered() {
  const q = _searchQuery.trim().toLowerCase();
  return _allResources.filter(r => {
    if (_activeType !== 'all' && r.type !== _activeType) return false;
    if (_activeSkill !== 'all' && !r.skillTags.includes(_activeSkill)) return false;
    if (q && !r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
    return true;
  });
}

function _filteredCardsHTML() {
  const items = _filtered();
  if (!items.length) return '<div class="resource-grid-empty">No resources match your filters.</div>';
  return items.map(_cardHTML).join('');
}

// ── Card HTML ─────────────────────────────────
function _cardHTML(r) {
  const skillLabels = r.skillTags.map(t => SKILL_LABELS[t] || t).join(', ');
  return `
    <div class="resource-card" data-rl-id="${r.id}" data-type="${r.type}">
      <div class="resource-card-thumb"></div>
      <div class="resource-card-body">
        <div class="resource-card-header">
          <span class="resource-type-badge resource-type-badge--${r.type}">
            ${TYPE_ICONS[r.type] || ''} ${r.type}
          </span>
          ${r.duration ? `<span class="resource-card-duration">${r.duration}</span>` : ''}
        </div>
        <div class="resource-card-title">${_escapeHTML(r.title)}</div>
        <div class="resource-card-desc">${_escapeHTML(r.description)}</div>
        <div class="resource-card-footer">
          ${r.skillTags.map(t => `<span class="resource-card-skill-tag">${SKILL_LABELS[t] || t}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

// ── Lightbox ──────────────────────────────────
function _openLightbox(resource) {
  // Remove any existing lightbox
  document.getElementById('rl-lightbox')?.remove();

  const embedHTML = _buildEmbed(resource);
  const tagHTML   = resource.skillTags.map(t =>
    `<span class="resource-lightbox-tag">${SKILL_LABELS[t] || t}</span>`
  ).join('');

  const lb = document.createElement('div');
  lb.className  = 'resource-lightbox';
  lb.id         = 'rl-lightbox';
  lb.innerHTML  = `
    <div class="resource-lightbox-inner" role="dialog" aria-modal="true">
      <div class="resource-lightbox-topbar">
        <span class="resource-lightbox-source">${resource.source || resource.type}</span>
        <button class="resource-lightbox-close" id="rl-lb-close" title="Close (Esc)">✕</button>
      </div>
      <div class="resource-lightbox-embed">${embedHTML}</div>
      <div class="resource-lightbox-meta">
        <div class="resource-lightbox-title">${_escapeHTML(resource.title)}</div>
        <div class="resource-lightbox-desc">${_escapeHTML(resource.description)}</div>
        <div class="resource-lightbox-tags">${tagHTML}</div>
      </div>
    </div>`;

  document.body.appendChild(lb);

  const close = () => lb.remove();

  lb.querySelector('#rl-lb-close').addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  const onKey = e => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

function _buildEmbed(r) {
  switch (r.embedType) {
    case 'youtube': {
      const videoId = _extractYouTubeId(r.url);
      if (!videoId) return _linkCard(r);
      return `<iframe
        src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        title="${_escapeAttr(r.title)}"
      ></iframe>`;
    }
    case 'audio':
      return `<audio controls src="${_escapeAttr(r.url)}" style="width:100%;padding:20px;box-sizing:border-box;background:var(--cream,#f8fafc);">
        Your browser does not support audio playback.
      </audio>`;
    case 'pdf': {
      const encoded = encodeURIComponent(r.url);
      return `<iframe
        src="https://docs.google.com/viewer?url=${encoded}&embedded=true"
        title="${_escapeAttr(r.title)}"
      ></iframe>`;
    }
    default:
      return _linkCard(r);
  }
}

function _linkCard(r) {
  const icon = TYPE_ICONS[r.type] || '🔗';
  return `
    <div class="resource-lightbox-link-card">
      <div class="resource-lightbox-link-icon">${icon}</div>
      <div style="font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:4px;">
        This resource opens in an external tab.
      </div>
      <a class="resource-lightbox-link-btn" href="${_escapeAttr(r.url)}" target="_blank" rel="noopener noreferrer">
        Open ${_capitalize(r.type)} ↗
      </a>
    </div>`;
}

// ── Utilities ─────────────────────────────────
function _extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    return u.searchParams.get('v') || null;
  } catch {
    return null;
  }
}

function _escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

function _capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

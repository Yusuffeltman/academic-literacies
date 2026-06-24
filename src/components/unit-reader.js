// src/components/unit-reader.js
// ─────────────────────────────────────────────
// Unit Reader — linear, screen-by-screen navigation for unit content.
//
// PROTOTYPE: wraps an already-rendered unit so the learner moves through
// one focused screen at a time (Learn → Watch → Practise → …) instead of
// scrolling a single long page. Reduces cognitive load and gives a clear
// sense of progress.
//
// Non-invasive by design: it runs AFTER the unit's interactive components
// have been booted, then MOVES the live DOM nodes into screen sections.
// Because appendChild moves nodes rather than cloning them, event
// listeners, video iframes, and the reading-task stepper keep working.
//
// Screens are split at natural content boundaries: <h1>, <h2>, and
// .section-label. No change to unit content is required, so this works
// for any unit once enabled.
// ─────────────────────────────────────────────

function _isBoundary(node) {
  if (!node || node.nodeType !== 1) return false;
  return node.tagName === 'H1'
    || node.tagName === 'H2'
    || (node.classList && node.classList.contains('section-label'));
}

function _hasElement(group) {
  return group.some((n) => n.nodeType === 1);
}

function _titleOf(group, fallback) {
  for (const n of group) {
    if (_isBoundary(n)) return (n.textContent || '').trim();
  }
  return fallback;
}

/**
 * Transform the children of `area` into a stepped reader.
 * @param {HTMLElement} area        the unit content container (#content-area)
 * @param {object}      opts
 * @param {Function}    opts.onComplete  called when the learner finishes the last screen
 * @param {string}      opts.scrollSelector  id of the scroll container to reset (default content-window)
 * @returns {{goTo:Function}|null}   null if the content had no boundaries to split on
 */
export function paginateUnit(area, { onComplete = null, scrollSelector = 'content-window' } = {}) {
  if (!area) return null;

  // 1. Snapshot existing (already-booted) child nodes and group them.
  const nodes = Array.from(area.childNodes);
  let groups = [];
  let current = null;
  for (const node of nodes) {
    if (_isBoundary(node)) {
      current = [node];
      groups.push(current);
    } else {
      if (!current) { current = []; groups.push(current); }
      current.push(node);
    }
  }
  groups = groups.filter(_hasElement); // drop leading whitespace-only groups

  // Nothing meaningful to split → leave the page as-is.
  if (groups.length <= 1) return null;

  // 2. Build the reader scaffold.
  area.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'unit-reader';

  const header = document.createElement('div');
  header.className = 'unit-reader-head';

  const screensHost = document.createElement('div');
  screensHost.className = 'unit-reader-screens';

  const footer = document.createElement('div');
  footer.className = 'unit-reader-foot';

  wrap.append(header, screensHost, footer);
  area.appendChild(wrap);

  // 3. Move grouped nodes into screen sections (move = preserve live state).
  const titles = [];
  groups.forEach((group, i) => {
    const section = document.createElement('section');
    section.className = 'unit-screen';
    section.dataset.index = String(i);
    group.forEach((n) => section.appendChild(n));
    screensHost.appendChild(section);
    titles.push(_titleOf(group, `Section ${i + 1}`));
  });

  const total = groups.length;
  let idx = 0;

  function renderChrome() {
    const dots = titles.map((t, i) => {
      const state = i === idx ? 'is-active' : (i < idx ? 'is-done' : '');
      const safe = t.replace(/"/g, '&quot;');
      return `<button type="button" class="ur-dot ${state}" data-go="${i}" title="${safe}" aria-label="Go to: ${safe}"></button>`;
    }).join('');
    header.innerHTML = `
      <div class="ur-progress-row">
        <span class="ur-step-count">Step ${idx + 1} of ${total}</span>
        <div class="ur-dots">${dots}</div>
      </div>
      <h2 class="ur-screen-title">${titles[idx]}</h2>`;

    const onFirst = idx === 0;
    const onLast = idx === total - 1;
    const pct = Math.round(((idx + 1) / total) * 100);
    footer.innerHTML = `
      <button type="button" class="ur-btn ur-back" data-act="back" ${onFirst ? 'disabled' : ''}>← Back</button>
      <span class="ur-bar"><span class="ur-bar-fill" style="width:${pct}%"></span></span>
      <button type="button" class="ur-btn ur-next" data-act="${onLast ? 'complete' : 'next'}">${onLast ? 'Finish Unit ✓' : 'Next →'}</button>`;
  }

  function show(n) {
    idx = Math.max(0, Math.min(total - 1, n));
    const children = Array.from(screensHost.children);
    children.forEach((sec, i) => { sec.style.display = i === idx ? '' : 'none'; });
    const active = children[idx];
    if (active) {
      active.classList.remove('ur-anim');
      void active.offsetWidth; // restart animation
      active.classList.add('ur-anim');
    }
    renderChrome();
    const scroller = document.getElementById(scrollSelector);
    if (scroller) scroller.scrollTop = 0;
  }

  header.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-go]');
    if (dot) show(Number(dot.dataset.go));
  });

  footer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'back') show(idx - 1);
    else if (act === 'next') show(idx + 1);
    else if (act === 'complete' && typeof onComplete === 'function') onComplete();
  });

  show(0);
  return { goTo: show };
}

// src/components/unit-reader.js
// ─────────────────────────────────────────────
// Unit Reader — linear, screen-by-screen navigation for unit content.
//
// PROTOTYPE: wraps an already-rendered unit so the learner moves through
// one focused screen at a time instead of scrolling a long page.
//
// Non-invasive: runs AFTER the unit's interactive components are booted,
// then MOVES the live DOM nodes into screen sections. appendChild moves
// nodes rather than cloning, so listeners, video iframes, and the
// reading-task stepper keep working. Screens split at natural content
// boundaries (<h1>, <h2>, .section-label).
//
// HOST MODE / delegation: a screen may contain a component with its own
// step flow (e.g. the reading task) that exposes a navigation contract on
// window._stepperNav[id]. The reader absorbs those inner steps into ONE
// continuous flow: it hides the component's own chrome and drives it from
// the single Back/Next footer, with the Next button gated and relabelled
// per inner step. Progress ("Step X of N") counts the inner steps too.
// ─────────────────────────────────────────────

let _rtChangeHandler = null;

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

// Screen types — the predictable lesson "beat". Each screen does one job.
const SCREEN_TYPES = {
  orient:   { label: 'Orient', icon: '🎯' },
  watch:    { label: 'Watch', icon: '🎬' },
  learn:    { label: 'Learn', icon: '💡' },
  check:    { label: 'Check', icon: '✅' },
  practise: { label: 'Practise', icon: '✍️' },
  reflect:  { label: 'Reflect', icon: '💭' },
};

// Infer a screen's type from its content and heading. Heuristic, no content
// changes required; order matters (first match wins).
function _screenType(section, index, title) {
  const has = (sel) => !!section.querySelector(sel);
  const t = (title || '').toLowerCase();
  if (index === 0) return 'orient';
  if (has('.ivp-container') || /\bwatch\b/.test(t)) return 'watch';
  if (has('.rt-container') || has('.visual-task') || has('.assessment-task')) return 'practise';
  if (has('.ex-block') || has('.unit-closing')
      || /reflect|before you move on|self-directed|portfolio|milestone|contract|learning cycle/.test(t)) return 'reflect';
  if (has('.quiz-block')) return 'check';
  return 'learn';
}

// Collapse static "aside" concept cards (analogies, notes) behind a toggle to
// reduce default density. Interactive concept cards (pathway/portfolio blocks
// carry inputs/buttons) are left expanded.
function _wrapAsides(section) {
  section.querySelectorAll('.concept-card').forEach((card) => {
    if (card.closest('.ur-disclosure')) return;
    if (card.querySelector('input,textarea,select,button,a,[contenteditable],.ivp-container')) return;
    const labelEl = card.querySelector('.concept-card-label');
    const summaryText = labelEl ? labelEl.textContent.trim() : 'Show example';
    const details = document.createElement('details');
    details.className = 'ur-disclosure';
    const summary = document.createElement('summary');
    summary.textContent = summaryText;
    card.parentNode.insertBefore(details, card);
    details.appendChild(summary);
    details.appendChild(card);
    if (labelEl) labelEl.style.display = 'none';
  });
}

// Find a hosted stepper inside a screen section: a .rt-container (or other
// future stepper mount) whose id is registered in window._stepperNav.
function _findStepperId(section) {
  const nav = window._stepperNav || {};
  const mounts = section.querySelectorAll('.rt-container[id]');
  for (const el of mounts) {
    if (nav[el.id]) return el.id;
  }
  return null;
}

export function paginateUnit(area, { onComplete = null, scrollSelector = 'content-window' } = {}) {
  if (!area) return null;

  // Tear down any listener from a previous pagination.
  if (_rtChangeHandler) {
    document.removeEventListener('rt:stepchange', _rtChangeHandler);
    _rtChangeHandler = null;
  }

  // 1. Group existing (already-booted) child nodes at boundaries.
  const childNodes = Array.from(area.childNodes);
  let groups = [];
  let current = null;
  for (const node of childNodes) {
    if (_isBoundary(node)) { current = [node]; groups.push(current); }
    else { if (!current) { current = []; groups.push(current); } current.push(node); }
  }
  groups = groups.filter(_hasElement);
  if (groups.length <= 1) return null;

  // 2. Build scaffold.
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

  // 3. Move grouped nodes into screen sections; detect hosted steppers.
  const screens = [];
  groups.forEach((group, i) => {
    const section = document.createElement('section');
    section.className = 'unit-screen';
    section.dataset.index = String(i);
    group.forEach((n) => section.appendChild(n));
    screensHost.appendChild(section);

    const stepperId = _findStepperId(section);
    if (stepperId) window._rtSetHostMode?.(stepperId, true); // hide inner chrome

    // Title comes from the heading; hide it in the body (the chrome shows it).
    // Strip any leading emoji/symbol — the type chip already carries an icon.
    const boundary = group.find(_isBoundary);
    const rawTitle = boundary ? (boundary.textContent || '').trim() : `Section ${i + 1}`;
    const title = rawTitle.replace(/^[^\p{L}\p{N}]+/u, '').trim() || rawTitle;
    if (boundary) boundary.style.display = 'none';

    const type = _screenType(section, i, title);
    section.dataset.type = type;
    if (type !== 'practise') _wrapAsides(section); // don't touch reading-task internals

    screens.push({ section, title, stepperId, type });
  });

  // 4. Flatten into "stops": each non-stepper screen is one stop; a stepper
  //    screen contributes one stop per inner step.
  const stops = [];
  screens.forEach((scr, si) => {
    const nav = scr.stepperId ? window._stepperNav[scr.stepperId] : null;
    if (nav) nav.steps.forEach((step, k) => stops.push({ screen: si, stepperId: scr.stepperId, step, innerIdx: k }));
    else stops.push({ screen: si, stepperId: null });
  });
  const total = stops.length;

  let pos = 0;          // current flat stop index
  let maxScreen = 0;    // furthest screen reached (gates forward dot jumps)

  const navOf = (s) => (s.stepperId ? window._stepperNav[s.stepperId] : null);
  const firstStopOfScreen = (si) => stops.findIndex((s) => s.screen === si);
  const stopOfScreenStep = (si, step) => {
    const idx = stops.findIndex((s) => s.screen === si && s.step === step);
    return idx === -1 ? firstStopOfScreen(si) : idx;
  };

  function renderChrome() {
    const s = stops[pos];
    const nav = navOf(s);
    const innerIdx = nav ? nav.index() : -1;
    const onFirst = pos === 0;
    const onLast = pos === total - 1;

    // One dot per screen (major sections); clickable up to furthest reached.
    const dots = screens.map((scr, si) => {
      const state = si === s.screen ? 'is-active' : (si < s.screen ? 'is-done' : '');
      const reachable = si <= maxScreen;
      const safe = scr.title.replace(/"/g, '&quot;');
      return `<button type="button" class="ur-dot ${state}" data-screen="${si}" ${reachable ? '' : 'disabled'} title="${safe}" aria-label="Go to: ${safe}"></button>`;
    }).join('');

    const scr = screens[s.screen];
    const ty = SCREEN_TYPES[scr.type] || SCREEN_TYPES.learn;
    const innerSuffix = nav ? ` · ${nav.labels[innerIdx]}` : '';
    header.innerHTML = `
      <div class="ur-top-row">
        <span class="ur-type-chip ur-type-${scr.type}">${ty.icon} ${ty.label}</span>
        <span class="ur-step-count">Step ${pos + 1} of ${total}</span>
      </div>
      <div class="ur-dots">${dots}</div>
      <h2 class="ur-screen-title">${scr.title}${innerSuffix}</h2>`;

    // Footer Next: delegate to inner unless on the inner's last step.
    let nextLabel = onLast ? 'Finish Unit ✓' : 'Next →';
    let nextDisabled = false;
    const innerHasMore = nav && innerIdx < nav.count() - 1;
    if (innerHasMore) {
      nextLabel = nav.nextLabel();
      nextDisabled = !nav.canNext();
    }
    const pct = Math.round(((pos + 1) / total) * 100);
    footer.innerHTML = `
      <button type="button" class="ur-btn ur-back" data-act="back" ${onFirst ? 'disabled' : ''}>← Back</button>
      <span class="ur-bar"><span class="ur-bar-fill" style="width:${pct}%"></span></span>
      <button type="button" class="ur-btn ur-next" data-act="next" ${nextDisabled ? 'disabled' : ''}>${nextLabel}</button>`;
  }

  function showScreen(si) {
    Array.from(screensHost.children).forEach((sec, i) => { sec.style.display = i === si ? '' : 'none'; });
    const active = screensHost.children[si];
    if (active) {
      active.classList.remove('ur-anim');
      void active.offsetWidth;
      active.classList.add('ur-anim');
    }
    maxScreen = Math.max(maxScreen, si);
    const scroller = document.getElementById(scrollSelector);
    if (scroller) scroller.scrollTop = 0;
  }

  // Move to an absolute stop. When landing on a stepper screen, snap to the
  // inner component's CURRENT step (so a resumed task lands in the right place).
  function gotoStop(n) {
    n = Math.max(0, Math.min(total - 1, n));
    const s = stops[n];
    const nav = navOf(s);
    if (nav) pos = stopOfScreenStep(s.screen, nav.current());
    else pos = n;
    showScreen(stops[pos].screen);
    renderChrome();
  }

  function onNext() {
    const s = stops[pos];
    const nav = navOf(s);
    if (nav && nav.index() < nav.count() - 1) {
      if (!nav.canNext()) return;        // gated (button is disabled anyway)
      nav.next();                        // advances inner → rt:stepchange re-syncs us
      return;
    }
    if (pos === total - 1) { if (typeof onComplete === 'function') onComplete(); return; }
    gotoStop(pos + 1);
  }

  function onBack() {
    const s = stops[pos];
    const nav = navOf(s);
    if (nav && nav.index() > 0) { nav.prev(); return; } // step inner back → re-syncs
    gotoStop(pos - 1);
  }

  header.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-screen]');
    if (dot && !dot.disabled) gotoStop(firstStopOfScreen(Number(dot.dataset.screen)));
  });
  footer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.act === 'back') onBack();
    else if (btn.dataset.act === 'next') onNext();
  });

  // When a hosted stepper changes its own step (delegated nav, live gate
  // updates, or the async writing→feedback transition), re-sync the reader.
  _rtChangeHandler = (e) => {
    const id = e?.detail?.id;
    if (!id) return;
    const s = stops[pos];
    if (s.stepperId === id) {
      const nav = navOf(s);
      const newPos = stopOfScreenStep(s.screen, nav.current());
      const stepChanged = newPos !== pos;
      pos = newPos;
      renderChrome();
      if (stepChanged) {
        const scroller = document.getElementById(scrollSelector);
        if (scroller) scroller.scrollTop = 0;
      }
    }
  };
  document.addEventListener('rt:stepchange', _rtChangeHandler);

  gotoStop(0);
  return { goTo: gotoStop };
}

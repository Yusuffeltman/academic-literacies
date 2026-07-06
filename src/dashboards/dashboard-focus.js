const FOCUS_STORAGE_KEY = 'ale-dashboard-focus-view';
const PHONE_QUERY = '(max-width: 900px)';

let resizeListenerBound = false;

function _wrapper() {
  return document.querySelector('.dash-wrapper');
}

function _isPhoneView() {
  return typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches;
}

function _setFocusLabels(enabled) {
  document.querySelectorAll('[data-dash-focus-label]').forEach((node) => {
    node.textContent = enabled ? 'Exit focus view' : 'Focus view';
  });
}

function _wireSidebarAutoClose() {
  document
    .querySelectorAll('.dash-sidebar .dash-nav-item, .dash-sidebar .dash-qt-btn, .dash-sidebar .dst-btn')
    .forEach((node) => {
      if (node.dataset.dashAutoCloseBound === '1') return;
      node.dataset.dashAutoCloseBound = '1';
      node.addEventListener('click', () => {
        window.setTimeout(autoCloseDashboardSidebar, 0);
      });
    });
}

export function isDashboardFocusEnabled() {
  try {
    return window.localStorage?.getItem(FOCUS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function closeDashboardSidebar() {
  _wrapper()?.classList.remove('dash-sidebar-open');
}

export function toggleDashboardSidebar() {
  _wrapper()?.classList.toggle('dash-sidebar-open');
}

export function applyDashboardFocusMode() {
  const wrapper = _wrapper();
  if (!wrapper) return;

  const enabled = isDashboardFocusEnabled();
  wrapper.classList.toggle('dash-focus-mode', enabled);
  _setFocusLabels(enabled);

  if (enabled && _isPhoneView()) {
    closeDashboardSidebar();
  }
}

export function toggleDashboardFocusMode() {
  const nextEnabled = !isDashboardFocusEnabled();
  try {
    window.localStorage?.setItem(FOCUS_STORAGE_KEY, nextEnabled ? '1' : '0');
  } catch {
    // If storage is unavailable, keep the toggle session-local via the class.
  }
  applyDashboardFocusMode();
}

export function autoCloseDashboardSidebar() {
  if (_isPhoneView() && isDashboardFocusEnabled()) {
    closeDashboardSidebar();
  }
}

export function initDashboardFocusChrome() {
  window._toggleDashSidebar = toggleDashboardSidebar;
  window._closeDashSidebar = closeDashboardSidebar;
  window._toggleDashFocusMode = toggleDashboardFocusMode;
  window._autoCloseDashSidebar = autoCloseDashboardSidebar;

  applyDashboardFocusMode();
  _wireSidebarAutoClose();

  if (!resizeListenerBound) {
    window.addEventListener('resize', applyDashboardFocusMode, { passive: true });
    resizeListenerBound = true;
  }
}

// src/components/experiment-notice.js
// ─────────────────────────────────────────────
// Ethics notice + opt-out for the lesson-presentation A/B.
// Shows a one-time, dismissible notice on test units informing the student
// that the layout is being trialled — voluntary, anonymous, no effect on
// marks — with a one-click opt-out to the standard layout.
//
// Aligns with docs/lesson-experiment-ethics-notice.md and the project's
// DPIA / equity-review framework.
// ─────────────────────────────────────────────

import { STATE } from '../state.js';

const BANNER_ID = 'experiment-notice-banner';

// True when the student is currently a participant: a test unit, not opted out.
export function isParticipating(unitId, isTestUnit) {
  return !!isTestUnit && !STATE.experiment?.optOut;
}

export function setLessonExperimentOptOut(optOut) {
  STATE.experiment = { ...(STATE.experiment || {}), optOut: !!optOut, noticeAck: true };
  window.saveState?.();
}

// Show the notice once per student (until acknowledged or opted out).
export function maybeShowExperimentNotice(participating) {
  if (!participating) return;
  if (STATE.experiment?.noticeAck || STATE.experiment?.optOut) return;
  if (document.getElementById(BANNER_ID)) return;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:8500;max-width:560px;width:calc(100% - 32px);background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.18);padding:18px 20px;';
  banner.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="font-size:20px;line-height:1;flex-shrink:0;">📋</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;color:var(--navy);font-size:14px;margin-bottom:4px;">We're trialling how this unit is laid out</div>
        <p style="margin:0 0 12px;font-size:13px;color:var(--muted);line-height:1.6;">
          A short, anonymous quick-check at the end helps us learn which layout supports learning best. It's <strong>voluntary</strong> and <strong>does not affect your marks</strong>. You can use the standard layout instead at any time.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn-next" style="display:inline-flex;font-size:13px;padding:7px 16px;" onclick="window._ackExperimentNotice()">Got it</button>
          <button type="button" class="btn-prev" style="display:inline-flex;font-size:13px;padding:7px 16px;" onclick="window._optOutExperiment()">Use the standard layout</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(banner);
}

window._ackExperimentNotice = function () {
  STATE.experiment = { ...(STATE.experiment || {}), noticeAck: true };
  window.saveState?.();
  document.getElementById(BANNER_ID)?.remove();
};

window._optOutExperiment = function () {
  setLessonExperimentOptOut(true);
  document.getElementById(BANNER_ID)?.remove();
  // Re-render the current unit immediately in the standard (control) layout.
  if (typeof window.navigateTo === 'function' && typeof STATE.activeUnit === 'number') {
    window.navigateTo(STATE.activeUnit);
  }
};

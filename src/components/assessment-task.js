// src/components/assessment-task.js
// ─────────────────────────────────────────────
// Assessment Task Component
// Renders a 2-week major task with:
//   - Real-world context + brief
//   - Jigsaw collaboration protocol
//   - Week-by-week milestone tracker
//   - Group contribution panel (reads from Firebase)
//   - Individual submission checklist + self-assessment
// ─────────────────────────────────────────────

import { _aiChat } from '../ai.js';
import {
  getCachedAssessmentSettingsOverride,
  loadAssessmentSettingsOverrides,
  mergeAssessmentConfig,
} from '../assessment-settings.js';
import { STATE, persistLocalStateSoon, registerFlushCallback } from '../state.js';
import { openChatRoom } from './chat-panel.js';
import {
  addCollaborationLinkArtefact,
  createCollaborationGroup,
  ensureCollaborationScopeCapacity,
  ensureCollaborationGroupRoom,
  ensureCollaborationScope,
  findUserCollaborationGroupEntry,
  getArchivedCollaborationScope,
  joinCollaborationGroup,
  leaveCollaborationGroup,
  migrateLegacyAssessmentGroups,
  normalizeCollaborationGroupName,
  removeCollaborationMember,
  renameCollaborationGroup,
  resolveCollaborationScope,
  saveCollaborationWorkspaceSection,
  subscribeToCollaborationScope,
  setCollaborationGroupManagementLock,
  transferCollaborationGroupLeader,
  uploadCollaborationArtefact,
} from '../collaboration-groups.js';

window._atState = window._atState || {};
window._atGroupState = window._atGroupState || {};
window._atGroupSubs = window._atGroupSubs || {};
window._atGroupBootstrap = window._atGroupBootstrap || {};
window._atWorkspaceSaveTimers = window._atWorkspaceSaveTimers || {};
window._atGroupLaunchOpen = window._atGroupLaunchOpen || {};

if (!window._assessmentSettingsBootstrapStarted) {
  window._assessmentSettingsBootstrapStarted = true;
  loadAssessmentSettingsOverrides().catch(() => {});
  window.addEventListener('assessment-settings-updated', () => {
    document.querySelectorAll('.at-container[data-at-ready="1"]').forEach((el) => {
      const id = String(el.id || '').replace('at-', '');
      if (id) _atRender(id);
    });
  });
}

if (!window._atWorkspaceSyncBootstrapStarted) {
  window._atWorkspaceSyncBootstrapStarted = true;
  window.addEventListener('online', () => {
    _atFlushPendingWorkspaceDrafts().catch(() => {});
  });
}

// ── Public render function ────────────────────
export function assessmentTask(cfg) {
  // Initialise state if not present — Firebase-restored state takes priority (see _applyState)
  if (!window._atState[cfg.id]) {
    window._atState[cfg.id] = {
      milestones:  {},
      checklist:   {},
      drafts:      {},
      selfScore:   null,
      reflection:  '',
      submitted:   false,
    };
  }
  // Ensure drafts bucket exists on legacy state objects
  if (!window._atState[cfg.id].drafts) window._atState[cfg.id].drafts = {};
  return `<div id="at-${cfg.id}" class="at-container"></div>`;
}

export function initAllAssessmentTasks() {
  document.querySelectorAll('.at-container:not([data-at-ready])').forEach(el => {
    const id  = el.id.replace('at-', '');
    const cfg = window._atConfigs?.[id];
    if (!cfg) return;
    el.dataset.atReady = '1';
    try {
      _atRender(id);
    } catch (err) {
      console.error(`[assessment-task] render failed for "${id}":`, err);
      el.innerHTML = `<div style="padding:24px;color:#991b1b;background:#fef2f2;border-radius:12px;margin:16px;">
        <strong>Could not load assessment content.</strong><br>
        <span style="font-size:12px;">Please reload the page. If the problem persists, contact your lecturer.<br>Error: ${String(err?.message || err)}</span>
      </div>`;
    }
  });
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    _atFlushPendingWorkspaceDrafts().catch(() => {});
  }
}

// Register config globally so it persists after navigation
export function registerAssessment(cfg) {
  window._atConfigs = window._atConfigs || {};
  window._atConfigs[cfg.id] = cfg;
}

// ── Main renderer ─────────────────────────────
function _atRender(id) {
  const el  = document.getElementById(`at-${id}`);
  const cfg = _atResolveConfig(window._atConfigs[id]);
  if (!el || !cfg) return;

  // Ensure state exists with all required fields (Firebase-restored state may be incomplete)
  if (!window._atState[id] || typeof window._atState[id] !== 'object') {
    window._atState[id] = { milestones: {}, checklist: {}, drafts: {}, selfScore: null, reflection: '', submitted: false };
  }
  const st = window._atState[id];
  if (!st.milestones || typeof st.milestones !== 'object') st.milestones = {};
  if (!st.checklist  || typeof st.checklist  !== 'object') st.checklist  = {};
  if (!st.drafts     || typeof st.drafts     !== 'object') st.drafts     = {};

  _atEnsureGroupSubscription(id);

  const totalMilestones = cfg.weeks.flatMap(w => w.milestones).length;
  const doneMilestones  = Object.values(st.milestones).filter(Boolean).length;
  const pct             = Math.round((doneMilestones / totalMilestones) * 100);

  el.innerHTML = `
    <div class="at-wrapper">

      ${_atHero(cfg)}
      ${_atContext(cfg)}
      ${_atCollab(cfg)}
      ${_atGroupFormation(id, cfg)}
      ${_atDraftStudio(id, cfg)}
      ${_atProgress(id, cfg, st, pct)}
      ${_atWeeks(id, cfg, st)}
      ${_atContributions(id, cfg)}
      ${_atSubmission(id, cfg, st)}

    </div>`;

  // Re-attach any saved checkbox states
  Object.entries(st.milestones).forEach(([mid, val]) => {
    const cb = document.getElementById(`at-ms-${id}-${mid}`);
    if (cb) cb.checked = val;
  });
  Object.entries(st.checklist).forEach(([cid, val]) => {
    const cb = document.getElementById(`at-cl-${id}-${cid}`);
    if (cb) cb.checked = val;
  });

  _atUpdateProgress(id);
}

function _atResolveConfig(baseCfg) {
  if (!baseCfg) return null;
  return mergeAssessmentConfig(baseCfg, getCachedAssessmentSettingsOverride(baseCfg.id));
}

// ── Sections ──────────────────────────────────
function _atHero(cfg) {
  return `
    <div class="at-hero" style="background:${cfg.color};">
      <div class="at-hero-left">
        <div class="at-hero-badge">${cfg.badge}</div>
        <h1 class="at-hero-title">${cfg.title}</h1>
        <p class="at-hero-sub">${cfg.subtitle}</p>
        <div class="at-hero-tags">
          <span class="at-tag">⏱ 2 weeks</span>
          <span class="at-tag">👥 Collaborative + Individual</span>
          <span class="at-tag">📋 ${cfg.marks} marks</span>
          ${cfg.skills.map(s => `<span class="at-tag skill">${s}</span>`).join('')}
        </div>
      </div>
      <div class="at-hero-icon">${cfg.icon}</div>
    </div>`;
}

function _atContext(cfg) {
  return `
    <div class="at-section">
      <div class="at-section-label">Real-World Context</div>
      <div class="at-context-box">
        <div class="at-context-scenario">${cfg.scenario}</div>
        <div class="at-context-brief">
          <div class="at-brief-label">Your Brief</div>
          <p>${cfg.brief}</p>
        </div>
        <div class="at-context-product">
          <div class="at-brief-label">What You Will Produce</div>
          <ul>${cfg.products.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;
}

function _atCollab(cfg) {
  const c = cfg.collaboration;
  return `
    <div class="at-section">
      <div class="at-section-label">Collaboration Protocol — ${c.type}</div>
      <div class="at-collab-box">
        <div class="at-collab-mechanic">
          <div class="at-collab-icon">${c.icon}</div>
          <div>
            <div class="at-collab-name">${c.name}</div>
            <p class="at-collab-how">${c.how}</p>
          </div>
        </div>
        <div class="at-collab-why">
          <div class="at-collab-why-label">🔗 Why this is interdependent</div>
          <p>${c.interdependence}</p>
        </div>
        <div class="at-roles-grid">
          ${c.roles.map((r, i) => `
            <div class="at-role-card ${r.isYours ? 'at-role-yours' : ''}">
              <div class="at-role-num">Role ${i + 1}</div>
              <div class="at-role-title">${r.icon} ${r.title}</div>
              <p class="at-role-desc">${r.description}</p>
              <div class="at-role-contributes">Contributes: <strong>${r.contributes}</strong></div>
              ${r.isYours ? '<div class="at-role-badge-yours">← Your role (confirm with lecturer)</div>' : ''}
            </div>`).join('')}
        </div>
        <div class="at-collab-note">
          <strong>📌 Note to students:</strong> Your lecturer will assign you to a group and confirm your role.
          Each group should have one student per role. Do not duplicate roles in a group.
        </div>
      </div>
    </div>`;
}

function _atProgress(id, cfg, st, pct) {
  return `
    <div class="at-section">
      <div class="at-section-label">Your Progress</div>
      <div class="at-progress-row">
        <div class="at-progress-bar-bg">
          <div class="at-progress-bar-fill" id="at-prog-fill-${id}" style="width:${pct}%;"></div>
        </div>
        <div class="at-progress-pct" id="at-prog-pct-${id}">${pct}%</div>
      </div>
    </div>`;
}

function _atWeeks(id, cfg, st) {
  return cfg.weeks.map((week, wi) => `
    <div class="at-week">
      <div class="at-week-header">
        <div class="at-week-num">Week ${wi + 1}</div>
        <div class="at-week-title">${week.title}</div>
        <div class="at-week-focus">${week.focus}</div>
      </div>
      <div class="at-week-body">
        ${week.milestones.map((m, mi) => {
          const msId = `w${wi}m${mi}`;
          const done = st.milestones[msId] || false;
          return `
            <div class="at-milestone ${done ? 'at-ms-done' : ''}">
              <label class="at-ms-label">
                <input type="checkbox" id="at-ms-${id}-${msId}" ${done ? 'checked' : ''}
                  onchange="_atToggleMilestone('${id}','${msId}',this.checked)">
                <div class="at-ms-content">
                  <div class="at-ms-day">Day ${m.day}${m.dayEnd ? '–' + m.dayEnd : ''}</div>
                  <div class="at-ms-title">${m.title}</div>
                  <p class="at-ms-desc">${m.desc}</p>
                  ${m.tools ? `<div class="at-ms-tools">${m.tools.map(t => `<span class="at-tool">${t}</span>`).join('')}</div>` : ''}
                  ${m.tip  ? `<div class="at-ms-tip">💡 ${m.tip}</div>` : ''}
                </div>
              </label>
            </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function _atContributions(id, cfg) {
  return `
    <div class="at-section">
      <div class="at-section-label">Group Contributions Panel</div>
      <div class="at-contrib-box">
        <p class="at-contrib-intro">${cfg.collaboration.groupPanelNote}</p>
        <div class="at-contrib-slots">
          ${cfg.collaboration.roles.map(r => `
            <div class="at-contrib-slot">
              <div class="at-contrib-role">${r.icon} ${r.title}</div>
              <div class="at-contrib-expects">Expects: ${r.contributes}</div>
              <div class="at-contrib-placeholder">
                <span class="at-placeholder-icon">⏳</span>
                Waiting for your group member's contribution
              </div>
            </div>`).join('')}
        </div>
        <div class="at-collab-note" style="margin-top:16px;">
          In the full deployment, this panel shows your group members' submitted contributions in real time
          via the shared Firebase database. Your lecturer can also post example contributions here.
        </div>
      </div>
    </div>`;
}

function _atDraftStudio(id, cfg) {
  const studio = cfg.workspaceTemplates;
  if (!studio?.enabled) return '';

  const groupState = _atEnsureGroupState(id);
  const user = _atCurrentAssessmentUser();
  const currentEntry = _atFindUserGroupEntry(groupState.groups, user.uid);
  const currentGroupId = currentEntry?.[0] || '';
  const currentGroup = currentEntry?.[1] || null;
  const sections = currentGroup?.workspace?.sections || {};
  const roles = Array.isArray(cfg?.collaboration?.roles) ? cfg.collaboration.roles : [];
  const localDrafts = [
    {
      id: 'observation-log',
      title: 'Observation Log',
      helper: 'Structured daily notes over 7 days. This is your evidence base and is not submitted directly.',
      starter: _atObservationLogStarter(),
    },
    {
      id: 'platform-intelligence-report',
      title: '300-word Platform Intelligence Report',
      helper: 'Document filter bubble evidence, algorithm behaviour, and information quality on your assigned platform.',
      starter: _atPlatformReportStarter(),
    },
    {
      id: 'policy-recommendation',
      title: '700-word Media Literacy Policy Recommendation',
      helper: 'Address a specific school principal and draw on both your own platform evidence and your group’s cross-platform comparison.',
      starter: _atPolicyRecommendationStarter(studio?.jointReportWordCount || 1000),
    },
    {
      id: 'reference-list',
      title: 'Reference List in APA 7th',
      helper: 'Record a minimum of 3 verified sources in APA 7th format.',
      starter: _atReferenceListStarter(),
    },
  ];
  const sharedSections = [
    {
      id: 'comparison-board',
      title: 'Cross-Platform Comparison Board',
      helper: 'Capture the patterns your group is noticing across all five platforms before you draft the joint report.',
      starter: _atComparisonBoardStarter(roles),
    },
    {
      id: 'joint-report',
      title: `${studio?.jointReportWordCount || 1000}-word Joint Cross-Platform Report`,
      helper: 'This is the shared drafting space for the five-student comparative report.',
      starter: _atJointReportStarter(studio?.jointReportWordCount || 1000),
    },
  ];

  return `
    <div class="at-section">
      <div class="at-section-label">Report Studio</div>
      <div class="at-draft-box">
        <div class="at-draft-intro">
          <div>
            <div class="at-group-title">Work on the required artefacts here</div>
            <p class="at-group-copy">${_esc(studio.localDraftNote || '')}</p>
          </div>
          <div class="at-group-pill">${localDrafts.length} templates</div>
        </div>
        <div class="at-draft-grid">
          ${localDrafts.map((draft) => {
            const draftValue = _atGetLocalDraft(id, draft.id, draft.starter);
            const inputId = `at-draft-${id}-${draft.id}`;
            return `
              <div class="at-draft-card">
                <div class="at-group-current-label">${_esc(draft.title)}</div>
                <div class="at-group-help" style="margin-top:6px;">${_esc(draft.helper)}</div>
                <textarea id="${inputId}" class="at-draft-textarea" rows="12" oninput="_atSaveDraftLocal('${id}','${draft.id}',this.value)">${_esc(draftValue)}</textarea>
                <div class="at-group-help">Auto-saved to your account (${_esc(user.name || user.email || 'student')}).</div>
              </div>
            `;
          }).join('')}
        </div>

        ${currentGroup ? `
          <div class="at-group-workspace">
            <div class="at-group-workspace-head">
              <div>
                <div class="at-group-current-label">${_esc(studio.sharedStudioLabel || 'Shared group workspace')}</div>
                <div class="at-group-title">${_esc(studio.sharedStudioIntro || '')}</div>
              </div>
              <div class="at-group-pill">${roles.length} platform columns</div>
            </div>
            <div class="at-draft-grid at-draft-grid--roles">
              ${roles.map((role, idx) => {
                const sectionId = `role-${idx}-log`;
                const inputId = `at-group-section-${id}-${sectionId}`;
                const value = _atGetGroupWorkspaceLocalDraft(id, currentGroupId, sectionId, sections?.[sectionId]?.text || _atRoleObservationStarter(role, idx));
                const savedBy = sections?.[sectionId]?.updatedByName
                  ? `Last saved by ${sections[sectionId].updatedByName}`
                  : 'Shared group notes for this platform role.';
                return `
                  <div class="at-draft-card">
                    <div class="at-group-current-label">Platform Column ${idx + 1}</div>
                    <div class="at-role-title">${_esc(role.icon || '')} ${_esc(role.title || `Role ${idx + 1}`)}</div>
                    <div class="at-group-help" style="margin-top:6px;">${_esc(role.description || '')}</div>
                    <textarea id="${inputId}" class="at-draft-textarea" rows="14" oninput="_atSaveGroupWorkspaceDraft('${id}','${currentGroupId}','${sectionId}',this.value,'${inputId}')">${_esc(value)}</textarea>
                    <div class="at-draft-actions">
                      <button class="at-group-btn at-group-btn--quiet" onclick="_atSaveGroupWorkspaceSection('${id}','${currentGroupId}','${sectionId}','${inputId}')">Save column</button>
                      <div class="at-group-help">${_esc(savedBy)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="at-draft-grid">
              ${sharedSections.map((section) => {
                const inputId = `at-group-section-${id}-${section.id}`;
                const value = _atGetGroupWorkspaceLocalDraft(id, currentGroupId, section.id, sections?.[section.id]?.text || section.starter);
                const savedBy = sections?.[section.id]?.updatedByName
                  ? `Last saved by ${sections[section.id].updatedByName}`
                  : 'Shared draft area for the whole group.';
                return `
                  <div class="at-draft-card at-draft-card--wide">
                    <div class="at-group-current-label">${_esc(section.title)}</div>
                    <div class="at-group-help" style="margin-top:6px;">${_esc(section.helper)}</div>
                    <textarea id="${inputId}" class="at-draft-textarea" rows="${section.id === 'joint-report' ? 16 : 12}" oninput="_atSaveGroupWorkspaceDraft('${id}','${currentGroupId}','${section.id}',this.value,'${inputId}')">${_esc(value)}</textarea>
                    <div class="at-draft-actions">
                      <button class="at-group-btn" onclick="_atSaveGroupWorkspaceSection('${id}','${currentGroupId}','${section.id}','${inputId}')">Save shared section</button>
                      <div class="at-group-help">${_esc(savedBy)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="at-group-status at-group-status--neutral" style="display:block;margin-top:18px;">
            Join or create a group to unlock the shared five-student observation board and joint report drafting area.
          </div>
        `}
      </div>
    </div>
  `;
}

function _atGroupFormation(id, cfg) {
  const formation = cfg.groupFormation;
  if (!formation?.enabled) return '';

  const groupState = _atEnsureGroupState(id);
  const scope = _atGroupScope(id);
  const user = _atCurrentAssessmentUser();
  const currentEntry = _atFindUserGroupEntry(groupState.groups, user.uid);
  const currentGroupId = currentEntry?.[0] || '';
  const currentGroup = currentEntry?.[1] || null;
  const currentIsLeader = Boolean(currentGroup && currentGroup.leaderUid === user.uid);
  const currentGroupLocked = Boolean(currentGroup?.managementLocked);
  const currentGroupLimit = _atGroupSizeLimit(currentGroup, formation);
  const currentGroupFull = Boolean(currentGroup && Object.keys(currentGroup.members || {}).length >= currentGroupLimit);
  const scopeMeta = groupState.meta || scope;
  const isArchivedScope = String(scopeMeta?.status || 'active') === 'archived';
  const archiveVersions = Object.values(groupState.archives || {}).sort(
    (a, b) => new Date(b?.meta?.archivedAt || 0).getTime() - new Date(a?.meta?.archivedAt || 0).getTime()
  );
  const groups = Object.entries(groupState.groups || {}).sort(([, a], [, b]) => {
    const aCount = Object.keys(a?.members || {}).length;
    const bCount = Object.keys(b?.members || {}).length;
    if (aCount !== bCount) return bCount - aCount;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
  const artefacts = Object.values(currentGroup?.artefacts || {}).sort(
    (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
  );
  const statusTone = groupState.error ? 'error' : groupState.notice ? 'success' : 'neutral';

  const groupMarkup = `
        <div class="at-group-intro">
          <div>
            <div class="at-group-title">Named groups of ${formation.size}</div>
            <p class="at-group-copy">${formation.intro || 'Form your group here before you begin the shared assessment work.'}</p>
          </div>
          <div class="at-group-pill">${groups.length} group${groups.length === 1 ? '' : 's'}</div>
        </div>

        ${groupState.loading ? `
          <div class="at-group-status at-group-status--neutral">Loading live groups…</div>
        ` : `
          <div class="at-group-status at-group-status--${statusTone}" ${groupState.notice || groupState.error ? '' : 'style="display:none;"'}>
            ${_esc(groupState.error || groupState.notice || '')}
          </div>
        `}

        ${isArchivedScope ? `
          <div class="at-group-status at-group-status--neutral" style="display:block;">
            This collaboration space was archived${scopeMeta?.archivedAt ? ` on ${_esc(_atFormatGroupTime(scopeMeta.archivedAt))}` : ''}. Existing groups remain in the archive, but new group changes are locked.
          </div>
        ` : ''}

        ${currentGroup ? `
          <div class="at-group-current">
            <div class="at-group-current-head">
              <div>
                <div class="at-group-current-label">Your current group</div>
                <div class="at-group-current-name">${_esc(currentGroup.name || 'Unnamed group')} ${currentGroupLocked ? '<span class="at-group-member-badge">Locked</span>' : ''}</div>
                <div class="at-group-help" style="margin-top:6px;">Leader: ${_esc(_atGroupLeaderLabel(currentGroup))}</div>
              </div>
              <div class="at-group-current-count">${Object.keys(currentGroup.members || {}).length} / ${currentGroupLimit}</div>
            </div>

            ${!isArchivedScope && currentIsLeader ? `
              <div class="at-group-edit-row">
                <input id="at-rename-${id}" class="at-group-input" type="text" maxlength="48" placeholder="${_esc(currentGroup.name || 'New group name')}" value="${_esc(currentGroup.name || '')}" ${groupState.pending || currentGroupLocked ? 'disabled' : ''} />
                <button class="at-group-btn at-group-btn--quiet" onclick="_atRenameGroup('${id}','${currentGroupId}')" ${groupState.pending || currentGroupLocked ? 'disabled' : ''}>Rename</button>
              </div>
            ` : ''}

            <div class="at-group-members at-group-members--stacked">
              ${Object.values(currentGroup.members || {}).map((member) => `
                <div class="at-group-member-row">
                  <div class="at-group-member-chip">
                    ${_esc(_atMemberLabel(member))}
                    ${member?.uid === currentGroup.leaderUid ? '<span class="at-group-member-badge">Leader</span>' : ''}
                  </div>
                  <div class="at-group-member-actions">
                    ${!isArchivedScope && currentIsLeader && !currentGroupLocked && member?.uid && member.uid !== user.uid ? `
                      <button class="at-group-mini-btn" onclick="_atTransferLeader('${id}','${currentGroupId}','${member.uid}')" ${groupState.pending ? 'disabled' : ''} title="Make leader">Make leader</button>
                      <button class="at-group-mini-btn at-group-mini-btn--danger" onclick="_atRemoveGroupMember('${id}','${currentGroupId}','${member.uid}')" ${groupState.pending ? 'disabled' : ''}>Remove</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="at-group-actions">
              ${!isArchivedScope && currentIsLeader ? `
                <button class="at-group-btn ${currentGroupLocked ? 'at-group-btn--quiet' : 'at-group-btn--danger'}" onclick="_atToggleGroupLock('${id}','${currentGroupId}')" ${groupState.pending ? 'disabled' : ''}>${currentGroupLocked ? 'Unlock group' : 'Lock group'}</button>
              ` : ''}
              <button class="at-group-btn at-group-btn--quiet" onclick="_atOpenGroupChat('${id}','${currentGroupId}')" ${(groupState.pending || groupState.sharing) ? 'disabled' : ''}>Open group chat</button>
              <button class="at-group-btn at-group-btn--danger" onclick="_atLeaveGroup('${id}')" ${(groupState.pending || isArchivedScope || currentGroupLocked) ? 'disabled' : ''}>Leave group</button>
              <div class="at-group-help">${currentGroupLocked ? 'This group is locked for membership changes. Use Unlock group to edit it again.' : (currentGroupFull ? `This group is full at ${currentGroupLimit} members. You can lock it once the roster is final.` : 'A collaboration chat room is linked to this group. Open it here or from the floating Chat panel.')}</div>
            </div>
          </div>

          <div class="at-group-workspace">
            <div class="at-group-workspace-head">
              <div>
                <div class="at-group-current-label">Shared artefacts</div>
                <div class="at-group-title">Post files, links, and evidence for your team</div>
              </div>
              <div class="at-group-pill">${artefacts.length} artefact${artefacts.length === 1 ? '' : 's'}</div>
            </div>
            <div class="at-group-share-grid">
              <div class="at-group-share-card">
                <label class="at-group-field-label" for="at-group-file-${id}">Upload a file</label>
                <input id="at-group-file-${id}" class="at-group-input" type="file" ${(groupState.sharing || isArchivedScope) ? 'disabled' : ''} onchange="_atStorePendingFile('${id}',this.files[0])" />
                <button class="at-group-btn" onclick="_atUploadGroupArtefact('${id}','${currentGroupId}')" ${(groupState.sharing || isArchivedScope) ? 'disabled' : ''}>Share file</button>
              </div>
              <div class="at-group-share-card">
                <label class="at-group-field-label" for="at-group-link-${id}">Share a link</label>
                <input id="at-group-link-${id}" class="at-group-input" type="url" placeholder="Paste a research source, video, or shared doc link" ${(groupState.sharing || isArchivedScope) ? 'disabled' : ''} />
                <button class="at-group-btn at-group-btn--quiet" onclick="_atShareGroupLink('${id}','${currentGroupId}')" ${(groupState.sharing || isArchivedScope) ? 'disabled' : ''}>Share link</button>
              </div>
            </div>
            <div class="at-group-help">Each artefact is added to the permanent group workspace and echoed into the group chat as a shared item.</div>
            <div class="at-group-artefacts">
              ${artefacts.length ? artefacts.map((asset) => `
                <div class="at-group-artefact">
                  <div>
                    <div class="at-group-artefact-name">${_esc(asset.name || asset.url || 'Shared artefact')}</div>
                    <div class="at-group-artefact-meta">${_esc(asset.createdByName || 'Group member')} · ${_esc(_atFormatGroupTime(asset.createdAt))}</div>
                  </div>
                  <a class="at-group-artefact-link" href="${_esc(asset.url || '#')}" target="_blank" rel="noopener">Open</a>
                </div>
              `).join('') : '<div class="at-group-empty">No artefacts shared yet. Start the group workspace with a file or link above.</div>'}
            </div>
          </div>
        ` : `
          <div class="at-group-create">
            <label class="at-group-field-label" for="at-group-name-${id}">Add a new group</label>
            <div class="at-group-create-row">
              <input id="at-group-name-${id}" class="at-group-input" type="text" maxlength="48" placeholder="e.g. Critical Lens Five" ${(groupState.pending || isArchivedScope) ? 'disabled' : ''} />
              <button class="at-group-btn" onclick="_atCreateGroup('${id}')" ${(groupState.pending || isArchivedScope) ? 'disabled' : ''}>Add new group</button>
            </div>
            <div class="at-group-help">Choose a distinctive group name. Other students can join it until the group reaches ${formation.size} members.</div>
          </div>
        `}

        <div class="at-group-grid">
          ${groups.length ? groups.map(([groupId, group]) => {
            const members = Object.values(group?.members || {});
            const memberCount = members.length;
            const maxSize = _atGroupSizeLimit(group, formation);
            const full = memberCount >= maxSize;
            const isCurrent = currentGroupId === groupId;
            const joinDisabled = groupState.pending || isArchivedScope || isCurrent || full;
            let joinLabel = 'Join group';
            if (isCurrent) joinLabel = 'Your group';
            else if (full) joinLabel = 'Full';
            return `
              <div class="at-group-card ${isCurrent ? 'at-group-card--active' : ''}">
                <div class="at-group-card-head">
                  <div class="at-group-card-name">${_esc(group.name || 'Unnamed group')}</div>
                  <div class="at-group-card-count">${memberCount} / ${maxSize}</div>
                </div>
                <div class="at-group-help" style="margin-top:-4px;margin-bottom:10px;">Leader: ${_esc(_atGroupLeaderLabel(group))}</div>
                <div class="at-group-card-members">
                  ${members.length ? members.map((member) => `
                    <div class="at-group-card-member">${_esc(_atMemberLabel(member))}${member?.uid === group?.leaderUid ? ' · leader' : ''}</div>
                  `).join('') : '<div class="at-group-card-empty">No members yet.</div>'}
                </div>
                <button class="at-group-btn ${isCurrent ? 'at-group-btn--quiet' : ''}" onclick="_atJoinGroup('${id}','${groupId}')" ${joinDisabled ? 'disabled' : ''}>${joinLabel}</button>
              </div>
            `;
          }).join('') : `
            <div class="at-group-empty">
              No groups exist yet. The first student can create one above.
            </div>
          `}
        </div>

        ${archiveVersions.length ? `
          <div class="at-group-workspace">
            <div class="at-group-workspace-head">
              <div>
                <div class="at-group-current-label">Archived collaboration spaces</div>
                <div class="at-group-title">Previous groups and artefacts are preserved here</div>
              </div>
              <div class="at-group-pill">${archiveVersions.length} archive${archiveVersions.length === 1 ? '' : 's'}</div>
            </div>
            <div class="at-group-artefacts">
              ${archiveVersions.map((archive) => {
                const summaryGroups = Object.values(archive?.groups || {});
                const artefactCount = summaryGroups.reduce((sum, group) => sum + Object.keys(group?.artefacts || {}).length, 0);
                return `
                  <div class="at-group-artefact">
                    <div>
                      <div class="at-group-artefact-name">${_esc(archive?.meta?.label || scope.label || 'Archived collaboration space')}</div>
                      <div class="at-group-artefact-meta">${summaryGroups.length} group${summaryGroups.length === 1 ? '' : 's'} · ${artefactCount} artefact${artefactCount === 1 ? '' : 's'} · archived ${_esc(_atFormatGroupTime(archive?.meta?.archivedAt || ''))}</div>
                    </div>
                    <span class="at-group-pill">Read only</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
  `;

  if (formation.compactLaunch) {
    const launchLabel = formation.launchLabel || `Open ${formation.label || 'group space'}`;
    const currentText = currentGroup
      ? `Current group: ${currentGroup.name || 'Unnamed group'} · ${Object.keys(currentGroup.members || {}).length} / ${currentGroupLimit}`
      : `${groups.length} group${groups.length === 1 ? '' : 's'} available`;
    return `
      <div class="at-section">
        <button class="at-group-launch-btn" onclick="_atOpenCompactGroup('${id}','${currentGroupId}')">
          <span>${_esc(launchLabel)}</span>
          <small>${_esc(currentText)}</small>
        </button>
      </div>`;
  }

  return `
    <div class="at-section">
      <div class="at-section-label">${formation.label || 'Group Formation'}</div>
      <div class="at-group-box">
        ${groupMarkup}
      </div>
    </div>`;
}

function _atSubmission(id, cfg, st) {
  const allChecked = cfg.checklist.every((_, i) => st.checklist[i] || false);

  return `
    <div class="at-section">
      <div class="at-section-label">Individual Submission Checklist</div>
      <div class="at-checklist-box">
        <p style="font-size:14px;color:var(--muted);margin-bottom:18px;">
          Tick each item only when you have genuinely completed it.
          You cannot submit until all items are checked.
        </p>
        ${cfg.checklist.map((item, i) => {
          const done = st.checklist[i] || false;
          return `
            <label class="at-cl-item ${done ? 'at-cl-done' : ''}">
              <input type="checkbox" id="at-cl-${id}-${i}" ${done ? 'checked' : ''}
                onchange="_atToggleChecklist('${id}',${i},this.checked)">
              <div class="at-cl-content">
                <div class="at-cl-title">${item.title}</div>
                <p class="at-cl-detail">${item.detail}</p>
              </div>
            </label>`;
        }).join('')}
      </div>

      <div class="at-section-label" style="margin-top:32px;">Self-Assessment</div>
      <div class="at-self-assess">
        <p>Before submitting, rate your work honestly against the assessment criteria below.</p>
        <div class="at-rubric">
          ${cfg.rubric.map(r => `
            <div class="at-rubric-row">
              <div class="at-rubric-criterion">${r.criterion}</div>
              <div class="at-rubric-levels">
                ${r.levels.map((lv, li) => `
                  <div class="at-rubric-cell">
                    <div class="at-rubric-mark">${lv.mark}</div>
                    <div class="at-rubric-desc">${lv.desc}</div>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>

        <div class="at-self-score">
          <div class="at-self-score-label">Your estimated mark (honest self-assessment):</div>
          <input type="number" id="at-ss-${id}" min="0" max="${cfg.marks}"
            value="${st.selfScore || ''}"
            placeholder="e.g. 68" class="at-score-input"
            oninput="_atSaveScore('${id}',this.value)">
          <span style="font-size:13px;color:var(--muted);">/ ${cfg.marks}</span>
        </div>

        <div class="at-reflection-box">
          <label for="at-refl-${id}" class="at-refl-label">
            Reflection: What is the strongest aspect of your submission — and what would you strengthen with more time? (2–3 sentences)
          </label>
          <textarea id="at-refl-${id}" class="at-refl-ta" rows="4"
            placeholder="Write honestly…"
            oninput="_atSaveReflection('${id}',this.value)">${st.reflection}</textarea>
        </div>

        <div class="at-submit-row">
          <button class="at-submit-btn ${allChecked ? '' : 'at-submit-disabled'}"
            id="at-submit-${id}"
            onclick="_atFinalSubmit('${id}')"
            ${allChecked ? '' : 'disabled'}>
            Open Submission Portal
          </button>
          ${!allChecked ? `<span class="at-submit-hint">Complete the checklist above to unlock the submission portal.</span>` : '<span class="at-submitted-note">This opens the upload portal where your files are submitted.</span>'}
        </div>
      </div>
    </div>`;
}

// ── Global handlers ───────────────────────────
window._atOpenGroupLaunch = (id) => {
  window._atGroupLaunchOpen = window._atGroupLaunchOpen || {};
  window._atGroupLaunchOpen[id] = true;
  _atRender(id);
  requestAnimationFrame(() => {
    document.getElementById(`at-${id}`)?.querySelector('.at-group-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

window._atOpenCompactGroup = async (id, groupId) => {
  const safeGroupId = String(groupId || '').trim();
  if (!safeGroupId) {
    alert('Assessment 1 groups are now contracted on this page. Use the Assessment 2 collaboration space for current group formation.');
    return;
  }
  await window._atOpenGroupChat(id, safeGroupId);
};

window._atToggleMilestone = (id, msId, val) => {
  window._atState[id].milestones[msId] = val;
  _atUpdateProgress(id);
  _atSaveToFirebase(id);
};

window._atToggleChecklist = (id, i, val) => {
  window._atState[id].checklist[i] = val;
  _atCheckSubmitUnlock(id);
  _atSaveToFirebase(id);
};

window._atSaveScore = (id, val) => {
  window._atState[id].selfScore = parseInt(val) || null;
  _atSaveToFirebase(id);
};

window._atSaveReflection = (id, val) => {
  window._atState[id].reflection = val;
  _atSaveToFirebase(id);
};

window._atFinalSubmit = async (id) => {
  const cfg = _atResolveConfig(window._atConfigs[id]);
  const st  = window._atState[id];
  const btn = document.getElementById(`at-submit-${id}`);

  if (!cfg.checklist.every((_, i) => st.checklist[i])) return;

  btn.textContent = 'Opening…';
  btn.disabled    = true;

  const saved = await _atSaveToFirebase(id);
  if (!saved) {
    btn.textContent = 'Open Submission Portal';
    btn.disabled    = false;
    _atShowSaveError(id, 'Your checklist state could not be saved — please check your internet connection and try again.');
    return;
  }

  if (typeof window.goToSubmissionAssessment === 'function') {
    window.goToSubmissionAssessment(cfg.id);
    return;
  }

  if (typeof window.goToSubmissions === 'function') {
    window.goToSubmissions(cfg.id);
    return;
  }

  btn.textContent = 'Open Submission Portal';
  btn.disabled = false;
  _atShowSaveError(id, 'The submission portal could not be opened from this page.');
};

function _atUpdateProgress(id) {
  const cfg = _atResolveConfig(window._atConfigs[id]);
  const st  = window._atState[id];
  if (!cfg || !st) return;
  if (!st.milestones || typeof st.milestones !== 'object') st.milestones = {};
  const total = cfg.weeks.flatMap(w => w.milestones).length;
  const done  = Object.values(st.milestones).filter(Boolean).length;
  const pct   = Math.round((done / total) * 100);

  const fill = document.getElementById(`at-prog-fill-${id}`);
  const pctEl = document.getElementById(`at-prog-pct-${id}`);
  if (fill)  fill.style.width   = pct + '%';
  if (pctEl) pctEl.textContent  = pct + '%';
}

function _atCheckSubmitUnlock(id) {
  const cfg = _atResolveConfig(window._atConfigs[id]);
  const st  = window._atState[id];
  if (!cfg || !st) return;
  if (!st.checklist || typeof st.checklist !== 'object') st.checklist = {};
  const all = cfg.checklist.every((_, i) => st.checklist[i] || false);
  const btn = document.getElementById(`at-submit-${id}`);
  const hint = btn?.nextElementSibling;
  if (btn) {
    btn.disabled = !all;
    btn.classList.toggle('at-submit-disabled', !all);
  }
  if (hint && hint.classList.contains('at-submit-hint')) {
    hint.style.display = all ? 'none' : '';
  }
}

// Debounce map for non-critical saves (milestones, checklists, score, reflection)
const _atSaveTimers = {};
const _atWorkspaceAutoSaveDelayMs = 900;

function _atWorkspaceTimerKey(id, groupId, sectionId) {
  return `${String(id || '').trim()}::${String(groupId || '').trim()}::${String(sectionId || '').trim()}`;
}

function _atScheduleGroupWorkspaceSave(id, groupId, sectionId, inputId = '') {
  const key = _atWorkspaceTimerKey(id, groupId, sectionId);
  if (window._atWorkspaceSaveTimers[key]) clearTimeout(window._atWorkspaceSaveTimers[key]);
  window._atWorkspaceSaveTimers[key] = setTimeout(() => {
    window._atWorkspaceSaveTimers[key] = null;
    _atPersistGroupWorkspaceSection(id, groupId, sectionId, inputId, { silent: true }).catch(() => {});
  }, _atWorkspaceAutoSaveDelayMs);
}

async function _atPersistGroupWorkspaceSection(id, groupId, sectionId, inputId = '', options = {}) {
  const groupState = _atEnsureGroupState(id);
  const input = inputId ? document.getElementById(inputId) : null;
  const text = input ? String(input.value || '') : _atGetGroupWorkspaceLocalDraft(id, groupId, sectionId, '');
  _atStoreGroupWorkspaceLocalDraft(id, groupId, sectionId, text);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (!options.silent) {
      _atSetGroupFeedback(id, 'Saved locally. The shared workspace will sync when you reconnect.', 'success');
      if (document.getElementById(`at-${id}`)) _atRender(id);
    }
    return false;
  }

  try {
    const saved = await saveCollaborationWorkspaceSection(_atGroupScope(id).id, groupId, sectionId, text);
    const group = groupState.groups?.[groupId];
    if (group) {
      group.workspace = group.workspace || {};
      group.workspace.sections = group.workspace.sections || {};
      group.workspace.sections[sectionId] = saved;
    }
    _atClearGroupWorkspaceLocalDraft(id, groupId, sectionId);
    if (!options.silent) {
      _atSetGroupFeedback(id, 'Shared workspace saved.', 'success');
    }
    if (document.getElementById(`at-${id}`)) _atRender(id);
    return true;
  } catch (err) {
    if (!options.silent) {
      _atSetGroupFeedback(id, err?.message || 'Could not save the shared workspace right now. Your local draft is still protected.', 'error');
      if (document.getElementById(`at-${id}`)) _atRender(id);
    }
    return false;
  }
}

async function _atFlushPendingWorkspaceDrafts() {
  const pending = _atReadPendingWorkspaceDrafts();
  for (const item of pending) {
    if (!item?.assessmentId || !item?.groupId || !item?.sectionId) continue;
    await _atPersistGroupWorkspaceSection(item.assessmentId, item.groupId, item.sectionId, '', { silent: true });
  }
}

async function _atSaveToFirebase(id) {
  if (!window.STATE || !window.saveState) return false;
  if (!window.STATE.assessments) window.STATE.assessments = {};
  window.STATE.assessments[id] = { ...window._atState[id] };
  persistLocalStateSoon('assessment-task');

  // Debounce: coalesce rapid-fire saves (typing, checkbox clicks) into one write
  return new Promise((resolve) => {
    if (_atSaveTimers[id]) clearTimeout(_atSaveTimers[id]);
    _atSaveTimers[id] = setTimeout(async () => {
      _atSaveTimers[id] = null;
      // Snapshot the latest state at flush time (may have changed during debounce)
      window.STATE.assessments[id] = { ...window._atState[id] };
      try {
        const ok = await window.saveState();
        if (!ok) {
          _atShowSaveError(id, 'Your work could not be saved to the cloud — check your connection. We will keep retrying.');
        }
        resolve(ok !== false);
      } catch (err) {
        console.error(`Assessment ${id} save failed:`, err);
        _atShowSaveError(id, 'Your work could not be saved to the cloud — check your connection. We will keep retrying.');
        resolve(false);
      }
    }, 600);
  });
}

// Flush any pending debounced saves immediately (called before page unload)
function _atFlushPendingSaves() {
  for (const id of Object.keys(_atSaveTimers)) {
    if (_atSaveTimers[id]) {
      clearTimeout(_atSaveTimers[id]);
      _atSaveTimers[id] = null;
      if (window.STATE) {
        if (!window.STATE.assessments) window.STATE.assessments = {};
        window.STATE.assessments[id] = { ...window._atState[id] };
      }
    }
  }
}
registerFlushCallback(_atFlushPendingSaves);

function _atShowSaveError(id, message) {
  let banner = document.getElementById(`at-save-error-${id}`);
  if (!banner) {
    const container = document.getElementById(`at-${id}`);
    if (!container) return;
    banner = document.createElement('div');
    banner.id = `at-save-error-${id}`;
    banner.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;padding:10px 14px;border-radius:8px;margin:12px 0;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;';
    container.prepend(banner);
  }
  banner.textContent = message;
  banner.style.display = 'flex';
  // Auto-hide after 15s — the sync indicator will keep showing the persistent state
  setTimeout(() => { if (banner) banner.style.display = 'none'; }, 15000);
}

function _atEnsureGroupState(id) {
  if (!window._atGroupState[id]) {
    window._atGroupState[id] = {
      meta: null,
      archives: {},
      groups: {},
      loading: true,
      pending: false,
      sharing: false,
      pendingFile: null,
      notice: '',
      error: '',
    };
  }
  return window._atGroupState[id];
}

function _atEnsureGroupSubscription(id) {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled || window._atGroupSubs[id]) return;
  const groupState = _atEnsureGroupState(id);
  const scope = _atGroupScope(id);

  if (!window._atGroupBootstrap[id]) {
    window._atGroupBootstrap[id] = Promise.resolve()
      .then(async () => {
        await ensureCollaborationScope(scope.id, scope);
        await ensureCollaborationScopeCapacity(scope.id, scope);
        if (scope.legacyAssessmentId) {
          await migrateLegacyAssessmentGroups(scope.id, scope.legacyAssessmentId, scope);
          await ensureCollaborationScopeCapacity(scope.id, scope);
        }
        groupState.archives = await getArchivedCollaborationScope(scope.id);
      })
      .catch(() => {})
      .finally(() => {
        delete window._atGroupBootstrap[id];
      });
  }

  window._atGroupSubs[id] = subscribeToCollaborationScope(
    scope.id,
    async (payload) => {
      groupState.meta = payload?.meta || null;
      groupState.groups = payload?.groups || {};
      groupState.loading = false;
      const currentEntry = _atFindUserGroupEntry(groupState.groups, _atCurrentAssessmentUser().uid);
      if (currentEntry?.[1] && !currentEntry[1]?.chatRoomId) {
        ensureCollaborationGroupRoom(scope.id, currentEntry[0], currentEntry[1]).catch((err) => {
          groupState.error = err?.message || 'Could not connect your group chat right now.';
          if (document.getElementById(`at-${id}`)) _atRender(id);
        });
      }
      if (document.getElementById(`at-${id}`)) _atRender(id);
    },
    () => {
      groupState.loading = false;
      groupState.error = 'Could not load the live group list right now.';
      if (document.getElementById(`at-${id}`)) _atRender(id);
    },
    scope
  );
}

function _atCurrentAssessmentUser() {
  const user = STATE.user || {};
  const rawName = String(user?.displayName || '').split(' [')[0].trim();
  const rawEmail = String(user?.email || '').trim();
  return {
    uid: String(user?.uid || '').trim(),
    name: rawName || rawEmail || 'Student',
    email: rawEmail,
  };
}

function _atMemberLabel(member = {}) {
  return String(member?.name || member?.email || member?.uid || 'Student').trim();
}

function _atGroupScope(id) {
  const cfg = window._atConfigs?.[id] || {};
  const formation = cfg?.groupFormation || {};
  return resolveCollaborationScope(
    formation.scopeId || `assessment-${String(id || '').trim()}`,
    {
      scopeType: formation.scopeType || 'assessment',
      scopeLabel: formation.scopeLabel || cfg?.title || formation.label || 'Collaboration group',
      sizeLimit: formation.size || 5,
      legacyAssessmentId: formation.legacyAssessmentId ?? id,
    }
  );
}

function _atGroupLeaderLabel(group = {}) {
  const leaderUid = String(group?.leaderUid || '').trim();
  if (!leaderUid) return 'Not assigned yet';
  const member = group?.members?.[leaderUid] || {};
  return _atMemberLabel(member);
}

function _atGroupSizeLimit(group = null, formation = {}) {
  return Math.max(2, Number(formation?.size) || 0, Number(group?.sizeLimit) || 0);
}

function _atDraftStorageKey(id, draftId) {
  const user = _atCurrentAssessmentUser();
  return `at:draft:${String(id || '').trim()}:${String(user.uid || user.email || 'guest').trim()}:${String(draftId || '').trim()}`;
}

function _atWorkspaceDraftKey(id, groupId, sectionId) {
  const user = _atCurrentAssessmentUser();
  return `at:workspace:${String(id || '').trim()}:${String(groupId || '').trim()}:${String(user.uid || user.email || 'guest').trim()}:${String(sectionId || '').trim()}`;
}

function _atWorkspacePendingKey() {
  const user = _atCurrentAssessmentUser();
  return `at:workspace:pending:${String(user.uid || user.email || 'guest').trim()}`;
}

function _atReadPendingWorkspaceDrafts() {
  try {
    const raw = localStorage.getItem(_atWorkspacePendingKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _atWritePendingWorkspaceDrafts(items = []) {
  try {
    localStorage.setItem(_atWorkspacePendingKey(), JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // Ignore fallback cache failures.
  }
}

function _atMarkPendingWorkspaceDraft(id, groupId, sectionId) {
  const key = `${String(id || '').trim()}::${String(groupId || '').trim()}::${String(sectionId || '').trim()}`;
  const next = _atReadPendingWorkspaceDrafts().filter((item) => item?.key !== key);
  next.push({
    key,
    assessmentId: String(id || '').trim(),
    groupId: String(groupId || '').trim(),
    sectionId: String(sectionId || '').trim(),
  });
  _atWritePendingWorkspaceDrafts(next);
}

function _atClearPendingWorkspaceDraft(id, groupId, sectionId) {
  const key = `${String(id || '').trim()}::${String(groupId || '').trim()}::${String(sectionId || '').trim()}`;
  _atWritePendingWorkspaceDrafts(_atReadPendingWorkspaceDrafts().filter((item) => item?.key !== key));
}

function _atGetGroupWorkspaceLocalDraft(id, groupId, sectionId, fallback = '') {
  try {
    const stored = localStorage.getItem(_atWorkspaceDraftKey(id, groupId, sectionId));
    return stored == null ? fallback : stored;
  } catch {
    return fallback;
  }
}

function _atStoreGroupWorkspaceLocalDraft(id, groupId, sectionId, value) {
  try {
    localStorage.setItem(_atWorkspaceDraftKey(id, groupId, sectionId), String(value || ''));
  } catch {
    // Ignore fallback cache failures.
  }
  _atMarkPendingWorkspaceDraft(id, groupId, sectionId);
}

function _atClearGroupWorkspaceLocalDraft(id, groupId, sectionId) {
  try {
    localStorage.removeItem(_atWorkspaceDraftKey(id, groupId, sectionId));
  } catch {
    // Ignore fallback cache cleanup failures.
  }
  _atClearPendingWorkspaceDraft(id, groupId, sectionId);
}

function _atGetLocalDraft(id, draftId, fallback = '') {
  // Prefer Firebase-synced draft over localStorage
  const firebaseDraft = window._atState[id]?.drafts?.[draftId];
  if (firebaseDraft != null) return firebaseDraft;
  try {
    const stored = localStorage.getItem(_atDraftStorageKey(id, draftId));
    return stored == null ? fallback : stored;
  } catch {
    return fallback;
  }
}

function _atObservationLogStarter() {
  return Array.from({ length: 7 }, (_, idx) => {
    const day = idx + 1;
    return [
      `Day ${day}`,
      'Date / Time:',
      'Platform / role:',
      'What appeared in the feed / search / recommendation path:',
      'Evidence of algorithm behaviour or personalisation:',
      'Information quality / misinformation note:',
      'Screenshot or artefact reference:',
      '',
    ].join('\n');
  }).join('\n');
}

function _atPlatformReportStarter() {
  return [
    'Platform Intelligence Report Draft',
    '',
    '1. Platform description and how the algorithm works',
    '- What kind of content did the platform push most often?',
    '- What signals seemed to shape recommendation or ranking?',
    '',
    '2. Evidence of filter bubble or misinformation risk',
    '- Quote or describe 2-3 specific observations from your log.',
    '- Identify the clearest algorithm pattern.',
    '',
    '3. Why this matters for a South African teacher',
    '- Explain the professional or civic literacy implication.',
    '- Add in-text citations.',
  ].join('\n');
}

function _atPolicyRecommendationStarter(jointWordCount = 1000) {
  return [
    'Policy Recommendation Draft',
    '',
    'To: Principal ____________________________',
    'School: _________________________________',
    '',
    'Context',
    '- Summarise the media-literacy problem using your platform evidence and group comparison.',
    '',
    'Recommendation 1',
    '- State the action clearly.',
    '- Explain the evidence behind it.',
    '',
    'Recommendation 2',
    '- State the action clearly.',
    '- Explain the evidence behind it.',
    '',
    'Implementation in a low-resource school',
    '- Show how the recommendation can work with limited device access.',
    '',
    `Draw on the shared ${jointWordCount}-word group comparison space below when you finalise this piece.`,
  ].join('\n');
}

function _atReferenceListStarter() {
  return [
    'Reference List (APA 7th)',
    '',
    '1. Author, A. A. (Year). Title of article. Journal Name, volume(issue), page-page. https://doi.org/xxxxx',
    '2. Organisation Name. (Year). Title of report. Publisher. URL',
    '3. Author, B. B. (Year). Title of source. Publisher / Journal. URL',
  ].join('\n');
}

function _atRoleObservationStarter(role = {}, idx = 0) {
  return [
    `${role?.title || `Platform role ${idx + 1}`}`,
    '',
    'Assigned student:',
    'Platform being monitored:',
    '',
    'Daily observation log',
    'Day 1:',
    'Day 2:',
    'Day 3:',
    'Day 4:',
    'Day 5:',
    'Day 6:',
    'Day 7:',
    'Day 8:',
    'Day 9:',
    'Day 10:',
    'Day 11:',
    'Day 12:',
    'Day 7:',
    '',
    'Most important algorithm pattern:',
    'Strongest evidence / screenshot reference:',
    'Information quality / misinformation concern:',
  ].join('\n');
}

function _atComparisonBoardStarter(roles = []) {
  return roles.map((role, idx) => [
    `Platform ${idx + 1}: ${role?.title || `Role ${idx + 1}`}`,
    '- Filter bubble evidence:',
    '- Algorithm behaviour:',
    '- Information quality / misinformation risk:',
    '- What the rest of the group should cite from this platform:',
    '',
  ].join('\n')).join('\n');
}

function _atJointReportStarter(wordCount = 1000) {
  return [
    `Joint Cross-Platform Report Draft (${wordCount} words)`,
    '',
    'Title:',
    '',
    'Introduction',
    '- Explain the purpose of the five-platform comparison.',
    '',
    'Platform-by-platform findings',
    '- Compare the five monitored environments.',
    '- Highlight common patterns and major differences.',
    '',
    'Information quality and misinformation risks',
    '- Identify the strongest risk patterns across platforms.',
    '',
    'Implications for media literacy practice',
    '- Explain what schools or teachers should learn from the evidence.',
    '',
    'Evidence tracker',
    '- Which screenshots, artefacts, and citations support each section?',
  ].join('\n');
}

function _atFormatGroupTime(value = '') {
  const dt = value ? new Date(value) : null;
  if (!dt || Number.isNaN(dt.getTime())) return 'just now';
  return dt.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function _atFindUserGroupEntry(groups = {}, uid = '') {
  return findUserCollaborationGroupEntry(groups, uid);
}

function _atSetGroupFeedback(id, message = '', tone = 'success') {
  const groupState = _atEnsureGroupState(id);
  groupState.notice = tone === 'success' ? message : '';
  groupState.error = tone === 'error' ? message : '';
}

window._atCreateGroup = async (id) => {
  const cfg = window._atConfigs?.[id];
  const formation = cfg?.groupFormation;
  if (!formation?.enabled) return;

  const groupState = _atEnsureGroupState(id);
  const user = _atCurrentAssessmentUser();
  const name = normalizeCollaborationGroupName(document.getElementById(`at-group-name-${id}`)?.value || '');

  if (!user.uid) {
    _atSetGroupFeedback(id, 'Sign in again before creating a group.', 'error');
    _atRender(id);
    return;
  }
  if (!name || name.length < 3) {
    _atSetGroupFeedback(id, 'Enter a group name with at least 3 characters.', 'error');
    _atRender(id);
    return;
  }

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const scope = _atGroupScope(id);
    const created = await createCollaborationGroup(scope.id, {
      name,
      sizeLimit: formation.size,
      scopeType: scope.type,
      scopeLabel: scope.label,
    });
    _atSetGroupFeedback(id, `Group "${created.groupName}" created.`, 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not create the group right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atJoinGroup = async (id, groupId) => {
  const cfg = window._atConfigs?.[id];
  const formation = cfg?.groupFormation;
  if (!formation?.enabled || !groupId) return;

  const groupState = _atEnsureGroupState(id);
  const user = _atCurrentAssessmentUser();
  if (!user.uid) {
    _atSetGroupFeedback(id, 'Sign in again before joining a group.', 'error');
    _atRender(id);
    return;
  }

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const scope = _atGroupScope(id);
    const joined = await joinCollaborationGroup(scope.id, groupId, formation.size, scope);
    _atSetGroupFeedback(id, `${joined.movedFromAnotherGroup ? 'Moved to' : 'Joined'} ${joined.groupName}.`, 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not join the group right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atLeaveGroup = async (id) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled) return;

  const groupState = _atEnsureGroupState(id);
  const user = _atCurrentAssessmentUser();
  if (!user.uid) {
    _atSetGroupFeedback(id, 'Sign in again before changing groups.', 'error');
    _atRender(id);
    return;
  }

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    await leaveCollaborationGroup(_atGroupScope(id).id);
    _atSetGroupFeedback(id, 'You left the group.', 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not leave the group right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atRemoveGroupMember = async (id, groupId, memberUid) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled) return;
  const groupState = _atEnsureGroupState(id);

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    await removeCollaborationMember(_atGroupScope(id).id, groupId, memberUid);
    _atSetGroupFeedback(id, 'Group membership updated.', 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not update group membership.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atRenameGroup = async (id, groupId) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled || !groupId) return;
  const groupState = _atEnsureGroupState(id);
  const input = document.getElementById(`at-rename-${id}`);
  const newName = String(input?.value || '').trim();

  if (!newName || newName.length < 3) {
    _atSetGroupFeedback(id, 'Enter a group name with at least 3 characters.', 'error');
    _atRender(id);
    return;
  }

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const result = await renameCollaborationGroup(_atGroupScope(id).id, groupId, newName);
    _atSetGroupFeedback(id, `Group renamed to "${result.groupName}".`, 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not rename the group right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atTransferLeader = async (id, groupId, memberUid) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled || !groupId || !memberUid) return;
  const groupState = _atEnsureGroupState(id);

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const result = await transferCollaborationGroupLeader(_atGroupScope(id).id, groupId, memberUid);
    _atSetGroupFeedback(id, `${result.newLeaderName} is now the group leader.`, 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not change the leader right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atToggleGroupLock = async (id, groupId) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled || !groupId) return;
  const groupState = _atEnsureGroupState(id);
  const group = groupState.groups?.[groupId] || null;
  const nextLocked = !Boolean(group?.managementLocked);

  if (!confirm(nextLocked ? 'Lock this group for membership changes?' : 'Unlock this group so membership can be edited again?')) return;

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const result = await setCollaborationGroupManagementLock(_atGroupScope(id).id, groupId, nextLocked);
    _atSetGroupFeedback(id, result.locked ? 'Group locked.' : 'Group unlocked.', 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not update the group lock right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atOpenGroupChat = async (id, groupId) => {
  const cfg = window._atConfigs?.[id];
  if (!cfg?.groupFormation?.enabled || !groupId) return;

  const groupState = _atEnsureGroupState(id);
  const scope = _atGroupScope(id);
  const group = groupState.groups?.[groupId] || null;

  groupState.pending = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const roomId = await ensureCollaborationGroupRoom(scope.id, groupId, group);
    if (!roomId) throw new Error('Could not open the group chat right now.');
    openChatRoom(roomId, {
      type: 'group',
      subtype: 'collaboration',
      name: group?.name || 'Group Chat',
      collaborationGroupId: groupId,
      collaborationScopeId: scope.id,
      lastMessageAt: group?.updatedAt || new Date().toISOString(),
    });
    _atSetGroupFeedback(id, 'Group chat opened.', 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not open the group chat right now.', 'error');
  } finally {
    groupState.pending = false;
    _atRender(id);
  }
};

window._atStorePendingFile = function(id, file) {
  const groupState = _atEnsureGroupState(id);
  groupState.pendingFile = file || null;
};

window._atUploadGroupArtefact = async (id, groupId) => {
  const groupState = _atEnsureGroupState(id);
  // Read from state — survives re-renders triggered by live subscription updates
  const file = groupState.pendingFile || null;
  groupState.pendingFile = null;

  groupState.sharing = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const asset = await uploadCollaborationArtefact(_atGroupScope(id).id, groupId, file);
    _atSetGroupFeedback(id, `Shared ${asset.name || 'the file'} with your group.`, 'success');
  } catch (err) {
    const errMsg = err?.message || 'Could not share the file right now.';
    console.error('[Group file upload error]', errMsg);
    _atSetGroupFeedback(id, errMsg, 'error');
  } finally {
    groupState.sharing = false;
    _atRender(id);
  }
};

window._atShareGroupLink = async (id, groupId) => {
  const groupState = _atEnsureGroupState(id);
  const input = document.getElementById(`at-group-link-${id}`);
  const url = String(input?.value || '').trim();

  groupState.sharing = true;
  _atSetGroupFeedback(id, '', 'success');
  _atRender(id);

  try {
    const asset = await addCollaborationLinkArtefact(_atGroupScope(id).id, groupId, { url });
    if (input) input.value = '';
    _atSetGroupFeedback(id, `Shared ${asset.name || 'the link'} with your group.`, 'success');
  } catch (err) {
    _atSetGroupFeedback(id, err?.message || 'Could not share the link right now.', 'error');
  } finally {
    groupState.sharing = false;
    _atRender(id);
  }
};

window._atSaveDraftLocal = (id, draftId, value) => {
  try {
    localStorage.setItem(_atDraftStorageKey(id, draftId), String(value || ''));
  } catch (_) {
    // localStorage is a fallback cache — Firebase is the source of truth
  }
  // Persist drafts to Firebase alongside assessment state
  if (!window._atState[id]) return;
  if (!window._atState[id].drafts) window._atState[id].drafts = {};
  window._atState[id].drafts[draftId] = String(value || '');
  persistLocalStateSoon('assessment-task-draft');
  _atSaveToFirebase(id);
};

window._atSaveGroupWorkspaceDraft = (id, groupId, sectionId, value, inputId = '') => {
  _atStoreGroupWorkspaceLocalDraft(id, groupId, sectionId, value);
  _atScheduleGroupWorkspaceSave(id, groupId, sectionId, inputId);
};

window._atSaveGroupWorkspaceSection = async (id, groupId, sectionId, inputId) => {
  await _atPersistGroupWorkspaceSection(id, groupId, sectionId, inputId, { silent: false });
};

function _esc(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

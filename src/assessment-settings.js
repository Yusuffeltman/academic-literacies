import { get, ref, remove, set } from 'firebase/database';
import { db } from './firebase.js';
import { STATE } from './state.js';

const SETTINGS_ROOT = 'assessment-settings';

let _loadPromise = null;

function _cleanText(value, max = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function _normalizeDeadline(raw) {
  if (raw == null || raw === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function _normalizeChecklist(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      title: _cleanText(item?.title, 180),
      detail: _cleanText(item?.detail, 1000),
    }))
    .filter((item) => item.title || item.detail);
}

function _normalizeRubric(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => ({
      criterion: _cleanText(row?.criterion, 240),
      levels: Array.isArray(row?.levels)
        ? row.levels
          .map((level) => ({
            mark: _cleanText(level?.mark, 80),
            desc: _cleanText(level?.desc, 600),
          }))
          .filter((level) => level.mark || level.desc)
        : [],
    }))
    .filter((row) => row.criterion || row.levels.length);
}

function _cloneChecklist(list = []) {
  return list.map((item) => ({
    title: String(item?.title || ''),
    detail: String(item?.detail || ''),
  }));
}

function _cloneRubric(list = []) {
  return list.map((row) => ({
    criterion: String(row?.criterion || ''),
    levels: Array.isArray(row?.levels)
      ? row.levels.map((level) => ({
        mark: String(level?.mark || ''),
        desc: String(level?.desc || ''),
      }))
      : [],
  }));
}

function _ensureOverrideCache() {
  if (!window._assessmentSettingsOverrides || typeof window._assessmentSettingsOverrides !== 'object') {
    window._assessmentSettingsOverrides = {};
  }
  return window._assessmentSettingsOverrides;
}

function _emitUpdate() {
  window.dispatchEvent(new CustomEvent('assessment-settings-updated', {
    detail: { overrides: { ..._ensureOverrideCache() } },
  }));
}

function _normalizeLoadedAssessmentSettingsOverride(assessmentId, raw = {}) {
  const safeId = _cleanText(assessmentId, 40);
  if (!safeId) return null;
  return {
    assessmentId: safeId,
    deadline: Object.prototype.hasOwnProperty.call(raw, 'deadline')
      ? _normalizeDeadline(raw.deadline)
      : null,
    checklist: _normalizeChecklist(raw.checklist),
    rubric: _normalizeRubric(raw.rubric),
    updatedAt: _cleanText(raw.updatedAt, 80),
    updatedByUid: _cleanText(raw.updatedByUid, 120),
    updatedByName: _cleanText(raw.updatedByName, 120),
  };
}

export function normalizeAssessmentSettingsOverride(assessmentId, raw = {}) {
  const safeId = _cleanText(assessmentId, 40);
  if (!safeId) return null;
  return {
    assessmentId: safeId,
    deadline: Object.prototype.hasOwnProperty.call(raw, 'deadline')
      ? _normalizeDeadline(raw.deadline)
      : null,
    checklist: _normalizeChecklist(raw.checklist),
    rubric: _normalizeRubric(raw.rubric),
    updatedAt: new Date().toISOString(),
    updatedByUid: STATE.user?.uid || '',
    updatedByName: _cleanText(
      STATE.user?.displayName?.split(' [')[0] || STATE.user?.email || 'Staff',
      120,
    ),
  };
}

export function getCachedAssessmentSettingsOverride(assessmentId) {
  if (!assessmentId) return null;
  return _ensureOverrideCache()[assessmentId] || null;
}

export function mergeAssessmentConfig(baseCfg, overrideCfg = null) {
  if (!baseCfg) return null;
  const cfg = {
    ...baseCfg,
    checklist: _cloneChecklist(baseCfg.checklist || []),
    rubric: _cloneRubric(baseCfg.rubric || []),
  };
  const override = overrideCfg || getCachedAssessmentSettingsOverride(baseCfg.id);
  if (!override) return cfg;

  if (Object.prototype.hasOwnProperty.call(override, 'deadline')) {
    cfg.deadline = override.deadline || null;
  }
  if (Array.isArray(override.checklist)) {
    cfg.checklist = _cloneChecklist(override.checklist);
  }
  if (Array.isArray(override.rubric)) {
    cfg.rubric = _cloneRubric(override.rubric);
  }
  cfg._assessmentSettingsMeta = {
    updatedAt: override.updatedAt || '',
    updatedByUid: override.updatedByUid || '',
    updatedByName: override.updatedByName || '',
  };
  return cfg;
}

export const getMergedAssessmentConfig = mergeAssessmentConfig;

export async function loadAssessmentSettingsOverrides({ force = false } = {}) {
  if (!force) {
    const cached = window._assessmentSettingsOverrides;
    if (window._assessmentSettingsOverridesLoaded && cached && typeof cached === 'object') return cached;
    if (_loadPromise) return _loadPromise;
  }

  _loadPromise = get(ref(db, SETTINGS_ROOT))
    .then((snap) => {
      const next = {};
      const raw = snap.exists() ? snap.val() : {};
      Object.entries(raw || {}).forEach(([assessmentId, value]) => {
        const normalized = _normalizeLoadedAssessmentSettingsOverride(assessmentId, value || {});
        if (normalized) next[assessmentId] = normalized;
      });
      window._assessmentSettingsOverrides = next;
      window._assessmentSettingsOverridesLoaded = true;
      _emitUpdate();
      return next;
    })
    .catch(() => {
      const existing = _ensureOverrideCache();
      return existing;
    })
    .finally(() => {
      _loadPromise = null;
    });

  return _loadPromise;
}

export async function saveAssessmentSettingsOverride(assessmentId, raw = {}) {
  const payload = normalizeAssessmentSettingsOverride(assessmentId, raw);
  if (!payload) return { ok: false, error: 'Invalid assessment id.' };
  try {
    await set(ref(db, `${SETTINGS_ROOT}/${payload.assessmentId}`), payload);
    _ensureOverrideCache()[payload.assessmentId] = payload;
    window._assessmentSettingsOverridesLoaded = true;
    _emitUpdate();
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save assessment settings.' };
  }
}

export async function clearAssessmentSettingsOverride(assessmentId) {
  const safeId = _cleanText(assessmentId, 40);
  if (!safeId) return { ok: false, error: 'Invalid assessment id.' };
  try {
    await remove(ref(db, `${SETTINGS_ROOT}/${safeId}`));
    const cache = _ensureOverrideCache();
    delete cache[safeId];
    window._assessmentSettingsOverridesLoaded = true;
    _emitUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to reset assessment settings.' };
  }
}

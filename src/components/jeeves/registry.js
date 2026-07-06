// src/components/jeeves/registry.js
// ─────────────────────────────────────────────
// SkillRegistry — the core abstraction Jeeves is built around.
//
// Every capability (navigate the UI, query Firebase, send a chat, later:
// run a shell command, browse the web) is a **skill** registered here.
// The agent loop (agent.js) exposes the enabled skills to Gemini as
// function declarations, then calls handlers by name when the model
// asks for them.
//
// Adding Tier B/C later = dropping new skill files in ./skills/ with a
// different `scope`. Nothing in agent.js needs to change.
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Skill
 * @property {string} name - unique function name exposed to the LLM (snake_case)
 * @property {string} description - what it does, shown to the LLM
 * @property {'app'|'desktop'|'open'} scope - tier gate
 * @property {object} parameters - JSON Schema (Gemini function declaration format)
 * @property {Array<'lecturer'|'moderator'|'tutor'|'student'>} [roles] - allowed roles
 * @property {(args: object, ctx: object) => Promise<any>} handler
 * @property {boolean} [dangerous] - if true, require explicit confirm before run
 */

const _skills = new Map();
/** @type {Set<string>} */
const _enabledScopes = new Set(['app']); // Tier A only by default

/**
 * Register a skill. Safe to call multiple times — later calls overwrite.
 * @param {Skill} skill
 */
export function registerSkill(skill) {
  if (!skill || !skill.name || typeof skill.handler !== 'function') {
    throw new Error('registerSkill: invalid skill');
  }
  _skills.set(skill.name, skill);
}

/** Enable an additional scope (e.g. 'desktop', 'open'). */
export function enableScope(scope) { _enabledScopes.add(scope); }
export function disableScope(scope) { _enabledScopes.delete(scope); }

/**
 * Return skills visible to the current user, filtered by scope + role.
 * @param {{role:string}} ctx
 * @returns {Skill[]}
 */
export function getAvailableSkills(ctx) {
  const out = [];
  for (const s of _skills.values()) {
    if (!_enabledScopes.has(s.scope)) continue;
    if (s.roles && ctx?.role && !s.roles.includes(ctx.role)) continue;
    out.push(s);
  }
  return out;
}

/**
 * Build the Gemini `functionDeclarations` array from available skills.
 * @param {{role:string}} ctx
 */
export function getToolDeclarations(ctx) {
  return getAvailableSkills(ctx).map(s => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters || { type: 'object', properties: {} },
  }));
}

/**
 * Invoke a skill by name. Validates scope/role and writes an audit event.
 * Throws if the skill is not found or the caller is not allowed to run it.
 *
 * @param {string} name
 * @param {object} args
 * @param {{role:string, uid:string}} ctx
 */
export async function invokeSkill(name, args, ctx) {
  const skill = _skills.get(name);
  if (!skill) throw new Error(`Unknown skill: ${name}`);
  if (!_enabledScopes.has(skill.scope)) {
    throw new Error(`Skill '${name}' requires scope '${skill.scope}' which is not enabled`);
  }
  if (skill.roles && ctx?.role && !skill.roles.includes(ctx.role)) {
    throw new Error(`Skill '${name}' not available for role '${ctx.role}'`);
  }

  const startedAt = Date.now();
  try {
    const result = await skill.handler(args || {}, ctx || {});
    _audit(name, args, ctx, 'ok', Date.now() - startedAt);
    return result;
  } catch (err) {
    _audit(name, args, ctx, 'error', Date.now() - startedAt, err?.message);
    throw err;
  }
}

/** Write an audit entry to analytics/raw-events. Fire-and-forget. */
function _audit(name, args, ctx, status, durationMs, errorMessage) {
  try {
    // Reuse the app's existing analytics pipeline if it exposes a helper.
    // If not, we log to console so nothing breaks.
    const payload = {
      eventType: 'jeeves_action',
      skill: name,
      status,
      durationMs,
      uid: ctx?.uid || null,
      role: ctx?.role || null,
      // Truncate args to avoid leaking long dictations into analytics.
      argsPreview: _truncateArgs(args),
      ...(errorMessage ? { error: String(errorMessage).slice(0, 200) } : {}),
      timestamp: new Date().toISOString(),
    };
    if (typeof window !== 'undefined' && typeof window._logAnalyticsEvent === 'function') {
      window._logAnalyticsEvent(payload);
    } else {
      console.debug('[jeeves:audit]', payload);
    }
  } catch (e) {
    console.warn('[jeeves:audit] failed', e);
  }
}

function _truncateArgs(args) {
  try {
    const s = JSON.stringify(args || {});
    return s.length > 240 ? s.slice(0, 240) + '…' : s;
  } catch { return '[unserializable]'; }
}

// Test-only helpers
export function _resetRegistry() { _skills.clear(); _enabledScopes.clear(); _enabledScopes.add('app'); }
export function _getSkill(name) { return _skills.get(name); }

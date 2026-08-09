// src/components/jeeves/guard-rails.js
// ─────────────────────────────────────────────
// Guard Rails — tiered permission system for Jeeves.
// Controls what operations are allowed based on user role.
// ─────────────────────────────────────────────

import { get } from 'firebase/database';
import { ref as dbRef } from 'firebase/database';
import { getDatabase } from 'firebase/database';

export const TIER_SAFE = 1;       // Read-only, navigation, queries
export const TIER_CONFIRM = 2;    // Create, modify, moderate (requires ack)
export const TIER_ADMIN = 3;       // Code changes, config, full access
export const TIER_LOCKED = 0;      // No Jeeves access

const ROLE_TIER_MAP = {
  lecturer: TIER_ADMIN,
  moderator: TIER_CONFIRM,
  tutor: TIER_SAFE,
  student: TIER_LOCKED,
};

export function getPermissionTier(ctx) {
  if (!ctx?.role) return TIER_LOCKED;
  return ROLE_TIER_MAP[ctx.role] ?? TIER_LOCKED;
}

export function canUseDeepThink(ctx) {
  const tier = getPermissionTier(ctx);
  return tier >= TIER_SAFE;
}

export function needsConfirmation(operation, ctx) {
  const tier = getPermissionTier(ctx);
  const confirmOps = ['create', 'update', 'delete', 'send', 'moderate'];
  return tier < TIER_ADMIN && confirmOps.includes(operation);
}

export function isOperationAllowed(operation, ctx) {
  const tier = getPermissionTier(ctx);
  const forbidden = ['delete', 'grant', 'revoke', 'access_keys'];
  if (forbidden.includes(operation)) return false;
  if (tier < TIER_CONFIRM && ['create', 'update', 'write'].includes(operation)) {
    return false;
  }
  return true;
}

export async function checkPermission(scope, ctx) {
  const tier = getPermissionTier(ctx);
  
  const scopeRequirements = {
    'app': TIER_SAFE,
    'desktop': TIER_CONFIRM,
    'admin': TIER_ADMIN,
    'open': TIER_ADMIN,
  };

  const required = scopeRequirements[scope] ?? TIER_SAFE;
  if (tier < required) {
    throw new Error(`This operation requires ${scope} access (${getTierName(required)}+)`);
  }

  return { allowed: true, tier };
}

export function getTierName(tier) {
  const names = {
    [TIER_LOCKED]: 'Locked',
    [TIER_SAFE]: 'Safe',
    [TIER_CONFIRM]: 'Confirm',
    [TIER_ADMIN]: 'Admin',
  };
  return names[tier] ?? 'Unknown';
}

export function getUserPermissions(ctx) {
  const tier = getPermissionTier(ctx);
  return {
    tier,
    tierName: getTierName(tier),
    canRead: tier >= TIER_SAFE,
    canWrite: tier >= TIER_CONFIRM,
    canCode: tier >= TIER_ADMIN,
    canDelete: tier >= TIER_ADMIN,
    deepThink: canUseDeepThink(ctx),
  };
}

export function confirmAction(message, ctx) {
  const tier = getPermissionTier(ctx);
  if (tier >= TIER_ADMIN) return Promise.resolve(true);
  if (tier < TIER_CONFIRM) return Promise.resolve(false);
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.confirm) {
      resolve(window.confirm(`Jeeves wants to: ${message}. Allow?`));
    } else {
      resolve(false);
    }
  });
}

export async function auditAction(action, ctx, details = {}) {
  try {
    const payload = {
      eventType: 'jeeves_permission_check',
      action,
      tier: getPermissionTier(ctx),
      role: ctx?.role,
      uid: ctx?.uid,
      ...details,
      timestamp: new Date().toISOString(),
    };
    if (typeof window !== 'undefined' && typeof window._logAnalyticsEvent === 'function') {
      window._logAnalyticsEvent(payload);
    }
  } catch (e) {
    console.warn('[jeeves:audit] failed', e);
  }
}

export const OPERATION_CATEGORIES = {
  read: { tier: TIER_SAFE, confirm: false },
  navigate: { tier: TIER_SAFE, confirm: false },
  query: { tier: TIER_SAFE, confirm: false },
  create: { tier: TIER_CONFIRM, confirm: true },
  update: { tier: TIER_CONFIRM, confirm: true },
  write: { tier: TIER_CONFIRM, confirm: true },
  delete: { tier: TIER_ADMIN, confirm: true },
  code_change: { tier: TIER_ADMIN, confirm: true },
  config: { tier: TIER_ADMIN, confirm: true },
  grant: { tier: TIER_ADMIN, confirm: true },
};

export function classifyOperation(operation) {
  return OPERATION_CATEGORIES[operation] ?? { tier: TIER_LOCKED, confirm: true };
}
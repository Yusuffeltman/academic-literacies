// src/resources.js
// ─────────────────────────────────────────────
// Firebase CRUD for lecturer-added resources.
// Seed resources live in content/resources.js — this module handles
// the dynamic (Firebase) layer only.
// ─────────────────────────────────────────────
import { db } from './firebase.js';
import { ref, get, push, update } from 'firebase/database';

/**
 * Fetch all lecturer-added resources from Firebase.
 * Returns [] on permission error or missing data.
 */
export async function getLecturerResources() {
  try {
    const snap = await get(ref(db, 'resources'));
    if (!snap.exists()) return [];
    const raw = snap.val();
    return Object.entries(raw)
      .map(([id, data]) => ({ id, ...data }))
      .filter(r => !r.removed);
  } catch {
    return [];
  }
}

/**
 * Add a new resource to Firebase.
 * Returns the generated Firebase key on success, null on error.
 */
export async function addResource(data) {
  try {
    const newRef = await push(ref(db, 'resources'), {
      ...data,
      vetted: false,
      addedAt: new Date().toISOString(),
    });
    return newRef.key;
  } catch {
    return null;
  }
}

/**
 * Approve or reject (un-approve) a resource.
 * @param {string} id   Firebase resource key
 * @param {boolean} approve  true = approve, false = un-approve
 */
export async function vettResource(id, approve) {
  try {
    await update(ref(db, `resources/${id}`), { vetted: approve });
    return true;
  } catch {
    return false;
  }
}

/**
 * Soft-delete a resource (sets removed:true).
 * The seed layer is never written to Firebase; to hide a seed resource
 * the lecturer manager creates a removal record keyed by seed id.
 */
export async function removeResource(id) {
  try {
    await update(ref(db, `resources/${id}`), { removed: true });
    return true;
  } catch {
    return false;
  }
}

// src/firebase.js
// ─────────────────────────────────────────────
// Replace these values with your own Firebase project config.
// Go to: Firebase Console → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase Config Loaded (Sanitized):', { ...firebaseConfig, apiKey: '***' });
console.log('Initializing Firebase App...');
export const app = initializeApp(firebaseConfig);

// New default Firebase Storage buckets use *.firebasestorage.app.
// Older projects may still use *.appspot.com, so use the configured bucket as-is.
const rawBucket = firebaseConfig.storageBucket || '';
const projectId = firebaseConfig.projectId || '';
const resolvedBucket = rawBucket || (projectId ? `${projectId}.firebasestorage.app` : null);

function createAuth() {
  console.log('Initializing Firebase Auth with multi-persistence fallbacks...');
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
    });
  } catch (err) {
    console.warn('Primary auth initialization failed, falling back to default auth instance:', err?.code || err?.message || err);
    return getAuth(app);
  }
}

export const auth = createAuth();

setPersistence(auth, inMemoryPersistence)
  .then(() => console.log('Firebase Auth persistence set to in-memory fallback-safe mode.'))
  .catch((err) => console.warn('Could not force in-memory persistence; continuing with SDK defaults:', err?.code || err?.message || err));

export const db = getDatabase(app);
export const storage = resolvedBucket ? getStorage(app, `gs://${resolvedBucket}`) : getStorage(app);

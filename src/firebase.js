// src/firebase.js
// ─────────────────────────────────────────────
// Replace these values with your own Firebase project config.
// Go to: Firebase Console → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app  = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence
});
export const db   = getDatabase(app);

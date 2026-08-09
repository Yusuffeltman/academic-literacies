// src/firebase.js
// ─────────────────────────────────────────────
// Replace these values with your own Firebase project config.
// Go to: Firebase Console → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  initializeAuth,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
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

const REQUIRED_FIREBASE_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'appId',
];

const missingFirebaseConfigKeys = REQUIRED_FIREBASE_CONFIG_KEYS.filter((key) => !String(firebaseConfig[key] || '').trim());
export const firebaseConfigError = missingFirebaseConfigKeys.length
  ? `Firebase sign-in is not configured correctly. Missing: ${missingFirebaseConfigKeys.join(', ')}.`
  : '';
const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
export const appCheckConfigError = appCheckSiteKey
  ? ''
  : 'Firebase App Check is not configured correctly. Missing: VITE_RECAPTCHA_ENTERPRISE_SITE_KEY.';

function isAndroidNativeWebView() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const host = String(window.location?.hostname || '').trim().toLowerCase();
  const ua = String(navigator.userAgent || '');
  return host === 'localhost' && /Android/i.test(ua);
}

if (firebaseConfigError) {
  console.error(firebaseConfigError);
}
if (appCheckConfigError) {
  console.warn(appCheckConfigError);
}

export const app = initializeApp(firebaseConfig);

// New default Firebase Storage buckets use *.firebasestorage.app.
// Older projects may still use *.appspot.com, so use the configured bucket as-is.
const rawBucket = firebaseConfig.storageBucket || '';
const projectId = firebaseConfig.projectId || '';
const resolvedBucket = rawBucket || (projectId ? `${projectId}.firebasestorage.app` : null);

function createAuth() {
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

function createAppCheck() {
  if (!appCheckSiteKey) return null;
  if (isAndroidNativeWebView()) {
    console.info('Skipping Firebase App Check in Android WebView.');
    return null;
  }
  try {
    if (import.meta.env.DEV && typeof self !== 'undefined') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN || true;
    }
    return initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('Firebase App Check initialization failed:', err?.code || err?.message || err);
    return null;
  }
}

export const appCheck = createAppCheck();

async function ensureDurablePersistence() {
  const fallbacks = [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ];
  for (const persistence of fallbacks) {
    try {
      await setPersistence(auth, persistence);
      return;
    } catch (err) {
      console.warn('Firebase auth persistence fallback failed:', err?.code || err?.message || err);
    }
  }
}

export const authReady = ensureDurablePersistence().catch((err) => {
  console.warn('Could not configure Firebase auth persistence; continuing with SDK defaults:', err?.code || err?.message || err);
});

const functionsRegion = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || '').trim() || 'us-central1';
if (!import.meta.env.DEV && !String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || '').trim()) {
  console.warn('VITE_FIREBASE_FUNCTIONS_REGION is not set. Falling back to us-central1.');
}

export const db = getDatabase(app);
export const functions = getFunctions(app, functionsRegion);
export const storage = resolvedBucket ? getStorage(app, `gs://${resolvedBucket}`) : getStorage(app);

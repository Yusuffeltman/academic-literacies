// src/components/jeeves/integrations/oauth-connector.js
// ─────────────────────────────────────────────
// Google OAuth 2.0 Connector for Jeeves.
// Handles OAuth flow for Calendar and Gmail access.
// ─────────────────────────────────────────────

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify';
const STORAGE_KEY = 'jeeves_google_tokens';
const TOKEN_REFRESH_GRACE_MS = 60 * 1000;
const SUPPORTED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://academic-literacy.web.app',
]);

let _tokenClient = null;
let _accessToken = null;
let _tokenExpiresAt = 0;
let _grantedScope = '';
let _isInitialized = false;
let _initPromise = null;
let _gapiInitPromise = null;
let _pendingTokenRequest = null;

function _getOrigin() {
  return typeof window !== 'undefined' ? (window.location?.origin || '') : '';
}

function _hasFreshToken() {
  return !!_accessToken && _tokenExpiresAt - Date.now() > TOKEN_REFRESH_GRACE_MS;
}

function _clearTokens() {
  _accessToken = null;
  _tokenExpiresAt = 0;
  _grantedScope = '';
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function _loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function _loadSavedTokens() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const tokens = JSON.parse(stored);
    if (tokens.access_token && tokens.expires_at > Date.now()) {
      _accessToken = tokens.access_token;
      _tokenExpiresAt = tokens.expires_at;
      _grantedScope = tokens.scope || '';
      return;
    }
  } catch (e) {
    console.warn('[jeeves:oauth] Failed to load saved tokens', e);
  }
  _clearTokens();
}

function _saveTokens(response) {
  const expiresAt = Date.now() + ((response.expires_in || 3600) * 1000);
  _accessToken = response.access_token || null;
  _tokenExpiresAt = expiresAt;
  _grantedScope = response.scope || _grantedScope || '';
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      access_token: _accessToken,
      expires_at: expiresAt,
      scope: _grantedScope,
    }));
  } catch (e) {
    console.warn('[jeeves:oauth] Failed to persist tokens', e);
  }
}

async function _loadGapiClient() {
  if (_gapiInitPromise) return _gapiInitPromise;
  _gapiInitPromise = (async () => {
    await _loadScriptOnce('https://apis.google.com/js/api.js', 'jeeves-google-gapi');
    await new Promise((resolve, reject) => {
      if (!window.gapi?.load) return reject(new Error('Google API client not available'));
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
              'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
            ],
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  })();

  try {
    await _gapiInitPromise;
    console.log('[jeeves:oauth] GAPI client loaded');
    return true;
  } catch (e) {
    console.error('[jeeves:oauth] GAPI init failed', e);
    _gapiInitPromise = null;
    return false;
  }
}

async function _ensureInitialized() {
  if (_isInitialized) return true;
  return initGoogleOAuth();
}

export async function initGoogleOAuth() {
  if (_isInitialized) return true;
  if (_initPromise) return _initPromise;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (!GOOGLE_CLIENT_ID) {
    console.warn('[jeeves:oauth] Google Client ID not configured');
    return false;
  }
  if (!GOOGLE_API_KEY) {
    console.warn('[jeeves:oauth] Google API key not configured');
    return false;
  }

  const origin = _getOrigin();
  if (origin && !SUPPORTED_ORIGINS.has(origin)) {
    console.warn(`[jeeves:oauth] Origin ${origin} is not in the expected Google OAuth allowlist`);
  }

  _initPromise = (async () => {
    try {
      await _loadScriptOnce('https://accounts.google.com/gsi/client', 'jeeves-google-gsi');
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services not available');
      }

      _tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response?.error) {
            console.error('[jeeves:oauth] Token request failed', response);
            const reject = _pendingTokenRequest?.reject;
            _pendingTokenRequest = null;
            reject?.(new Error(response.error));
            return;
          }
          if (!response?.access_token) {
            const reject = _pendingTokenRequest?.reject;
            _pendingTokenRequest = null;
            reject?.(new Error('Google OAuth returned no access token'));
            return;
          }

          _saveTokens(response);
          void _loadGapiClient().catch((e) => {
            console.warn('[jeeves:oauth] Deferred GAPI load failed', e);
          });
          const resolve = _pendingTokenRequest?.resolve;
          _pendingTokenRequest = null;
          resolve?.(true);
        },
      });

      _loadSavedTokens();
      _isInitialized = true;

      if (_accessToken) {
        await _loadGapiClient();
      }
      return true;
    } catch (e) {
      console.error('[jeeves:oauth] Failed to initialize Google OAuth', e);
      _initPromise = null;
      return false;
    }
  })();

  return _initPromise;
}

export async function requestGoogleAuth({ interactive = true, awaitCompletion = true } = {}) {
  const ok = await _ensureInitialized();
  if (!ok || !_tokenClient) {
    console.warn('[jeeves:oauth] Not initialized');
    return false;
  }
  if (_pendingTokenRequest) {
    return awaitCompletion ? _pendingTokenRequest.promise : true;
  }

  _pendingTokenRequest = {};
  _pendingTokenRequest.promise = new Promise((resolve, reject) => {
    _pendingTokenRequest.resolve = resolve;
    _pendingTokenRequest.reject = reject;
  });

  try {
    _tokenClient.requestAccessToken({
      prompt: interactive ? 'select_account' : '',
    });
    if (!awaitCompletion) {
      return true;
    }
    const granted = await _pendingTokenRequest.promise;
    if (granted) {
      await _loadGapiClient();
    }
    return granted;
  } catch (e) {
    console.warn('[jeeves:oauth] Token acquisition failed', e);
    _pendingTokenRequest = null;
    if (!interactive) return false;
    return false;
  }
}

export function isGoogleConnected() {
  return _hasFreshToken();
}

export function getAccessToken() {
  return _accessToken;
}

async function _ensureGoogleToken() {
  const ok = await _ensureInitialized();
  if (!ok) {
    throw new Error('Google OAuth is not initialized');
  }
  if (_hasFreshToken()) return true;

  const renewed = await requestGoogleAuth({ interactive: false });
  if (renewed) return true;

  _clearTokens();
  throw new Error('Google authentication expired. Reconnect Gmail or Google Calendar.');
}

export async function googleFetch(endpoint, options = {}) {
  await _ensureGoogleToken();

  const response = await fetch(`https://www.googleapis.com${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${_accessToken}`,
    },
  });

  if (response.status === 401) {
    _clearTokens();
    throw new Error('Google authentication expired. Reconnect Gmail or Google Calendar.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Google API error ${response.status}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function disconnectGoogle() {
  const token = _accessToken;
  _clearTokens();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
}

export function getGoogleAuthStatus() {
  return {
    connected: _hasFreshToken(),
    initialized: _isInitialized,
    expiresAt: _tokenExpiresAt || null,
    origin: _getOrigin() || null,
    hasCalendarScope: _grantedScope.includes('https://www.googleapis.com/auth/calendar'),
    hasGmailScope: _grantedScope.includes('https://www.googleapis.com/auth/gmail.modify'),
  };
}

if (typeof window !== 'undefined') {
  window.initGoogleOAuth = initGoogleOAuth;
  window.requestGoogleAuth = requestGoogleAuth;
  window.isGoogleConnected = isGoogleConnected;
  window.disconnectGoogle = disconnectGoogle;
}

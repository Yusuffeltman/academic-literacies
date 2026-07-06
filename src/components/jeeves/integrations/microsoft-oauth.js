// src/components/jeeves/integrations/microsoft-oauth.js
// ─────────────────────────────────────────────
// Microsoft OAuth 2.0 Connector for Jeeves.
// Handles OAuth flow for Outlook Calendar and Outlook Mail access.
// ─────────────────────────────────────────────

const MS_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const MS_TENANT_ID = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
const MS_SCOPES = 'Calendars.ReadWrite Mail.ReadWrite Mail.Send User.Read offline_access';

const STORAGE_KEY = 'jeeves_microsoft_tokens';

let _msalInstance = null;
let _accessToken = null;
let _isInitialized = false;

const msConfig = {
  auth: {
    clientId: MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
    redirectUri: window.location?.origin || 'http://localhost:5173',
  },
  cache: { cacheLocation: 'localStorage' },
};

export async function initMicrosoftOAuth() {
  if (_isInitialized) return true;
  
  if (!MS_CLIENT_ID) {
    console.warn('[jeeves:microsoft] Client ID not configured');
    return false;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.0.0/dist/msal.min.js';
    script.onload = async () => {
      try {
        _msalInstance = new msal.PublicClientApplication(msConfig);
        await _msalInstance.initialize();
        _isInitialized = true;
        await _loadSavedTokens();
        resolve(true);
      } catch (e) {
        console.error('[jeeves:microsoft] Init failed', e);
        resolve(false);
      }
    };
    script.onerror = () => {
      console.error('[jeeves:microsoft] Failed to load MSAL script');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

async function _loadSavedTokens() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const tokens = JSON.parse(stored);
      if (tokens.accessToken && tokens.expiresAt > Date.now()) {
        _accessToken = tokens.accessToken;
      } else if (tokens.refreshToken) {
        await _acquireTokenByRefreshToken(tokens.refreshToken);
      }
    }
  } catch (e) {
    console.warn('[jeeves:microsoft] Failed to load saved tokens', e);
  }
}

function _saveTokens(response) {
  const tokens = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + (response.expiresIn * 1000),
    scopes: response.scopes,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

async function _acquireTokenByRefreshToken(refreshToken) {
  try {
    const response = await _msalInstance.acquireTokenByRefreshToken({
      refreshToken,
      scopes: MS_SCOPES.split(' '),
    });
    _accessToken = response.accessToken;
    _saveTokens(response);
    return true;
  } catch (e) {
    console.warn('[jeeves:microsoft] Refresh token failed', e);
    return false;
  }
}

export async function requestMicrosoftAuth() {
  if (!_msalInstance) {
    console.warn('[jeeves:microsoft] Not initialized');
    return false;
  }

  try {
    const response = await _msalInstance.loginPopup({
      scopes: MS_SCOPES.split(' '),
    });
    _accessToken = response.accessToken;
    _saveTokens(response);
    return true;
  } catch (e) {
    console.error('[jeeves:microsoft] Login failed', e);
    return false;
  }
}

export function isMicrosoftConnected() {
  return !!_accessToken;
}

export function getAccessToken() {
  return _accessToken;
}

export async function microsoftFetch(endpoint, options = {}) {
  if (!_accessToken) {
    throw new Error('Not authenticated with Microsoft');
  }
  
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${_accessToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Microsoft Graph error ${response.status}`);
  }
  
  if (response.status === 202 || response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function disconnectMicrosoft() {
  _accessToken = null;
  localStorage.removeItem(STORAGE_KEY);
  if (_msalInstance) {
    _msalInstance.clearCache();
  }
}

export function getMicrosoftAuthStatus() {
  return {
    connected: !!_accessToken,
    hasCalendarScope: true,
    hasMailScope: true,
  };
}

window.initMicrosoftOAuth = initMicrosoftOAuth;
window.requestMicrosoftAuth = requestMicrosoftAuth;
window.isMicrosoftConnected = isMicrosoftConnected;
window.disconnectMicrosoft = disconnectMicrosoft;

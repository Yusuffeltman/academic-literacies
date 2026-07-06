import { Capacitor } from '@capacitor/core';

const MOBILE_UA_RE = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i;
const TABLET_UA_RE = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i;

function _detectDeviceClass() {
  const ua = navigator.userAgent || '';
  if (MOBILE_UA_RE.test(ua)) return 'mobile';
  if (TABLET_UA_RE.test(ua)) return 'tablet';
  return 'desktop';
}

function _baseSurfaceContract() {
  const ua = navigator.userAgent || '';
  const isAndroidUa = /Android/i.test(ua);
  const localhostHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const platform = typeof Capacitor?.getPlatform === 'function' ? Capacitor.getPlatform() : 'web';
  const isNativeApp = typeof Capacitor?.isNativePlatform === 'function'
    ? Capacitor.isNativePlatform()
    : platform !== 'web';
  const androidNativeFallback = isAndroidUa && localhostHost;
  const isAndroidApp = (platform === 'android' && isNativeApp)
    || (platform === 'android')
    || (isNativeApp && isAndroidUa)
    || androidNativeFallback;

  return {
    platform,
    deviceClass: _detectDeviceClass(),
    isNativeApp,
    isAndroidApp,
    isMobileViewport: window.innerWidth <= 960,
    isOnline: navigator.onLine,
  };
}

function _commitSurfaceContract(patch = {}) {
  const next = {
    ...(window.__ACADEMIC_APP_SURFACE || {}),
    ..._baseSurfaceContract(),
    ...patch,
  };

  window.__ACADEMIC_APP_SURFACE = next;

  if (document?.documentElement) {
    document.documentElement.dataset.platform = next.platform;
    document.documentElement.dataset.appSurface = next.isAndroidApp
      ? 'android-native-shell'
      : (next.isNativeApp ? 'native-web' : 'web');
  }

  if (document?.body) {
    document.body.classList.toggle('android-app', Boolean(next.isAndroidApp));
    document.body.classList.toggle('native-app', Boolean(next.isNativeApp));
  }

  return next;
}

export function getAppSurface() {
  return _commitSurfaceContract();
}

export function setAppSurfaceRoute(route = '') {
  return _commitSurfaceContract({ route: String(route || '').trim() });
}

export function registerAndroidBackHandler(handler) {
  return _commitSurfaceContract({
    backHandler: typeof handler === 'function' ? handler : null,
  });
}

export function consumeAndroidBack() {
  try {
    const handler = window.__ACADEMIC_APP_SURFACE?.backHandler;
    return typeof handler === 'function' ? Boolean(handler()) : false;
  } catch (err) {
    console.error('Android back handler failed:', err);
    return false;
  }
}

let _surfaceRuntimeInitialized = false;

export function initAppSurfaceRuntime() {
  if (_surfaceRuntimeInitialized) {
    return _commitSurfaceContract();
  }
  _surfaceRuntimeInitialized = true;

  const apply = (patch = {}) => _commitSurfaceContract(patch);
  const markResume = () => apply({ lastResumeAt: new Date().toISOString() });

  window.addEventListener('resize', () => apply());
  window.addEventListener('orientationchange', () => apply());
  window.addEventListener('online', () => apply({ isOnline: true }));
  window.addEventListener('offline', () => apply({ isOnline: false }));
  window.addEventListener('pageshow', markResume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markResume();
    }
  });

  window.__consumeAcademicAndroidBack = () => {
    window.dispatchEvent(new CustomEvent('academicbackbutton'));
    return consumeAndroidBack();
  };

  return apply({
    sessionStartedAt: new Date().toISOString(),
    lastResumeAt: new Date().toISOString(),
  });
}

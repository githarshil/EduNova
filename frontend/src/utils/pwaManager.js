/**
 * PWA installation, update detection, and standalone mode manager.
 */

const DISMISS_STORAGE_KEY = 'evidya_pwa_install_dismissed_until';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

let deferredInstallPrompt = null;
let waitingWorker = null;
let registrationRef = null;
let initialized = false;
const listeners = new Set();

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(mq || window.navigator.standalone === true);
}

export function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
  return isIos && isSafari;
}

export function isInstallDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    return Number(raw) > Date.now();
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
  } catch {
    // Ignore storage quota errors
  }
  notify();
}

export function getPwaState() {
  const standalone = isStandaloneMode();
  return {
    canPromptInstall: !standalone && Boolean(deferredInstallPrompt) && !isInstallDismissed(),
    showIosHint: !standalone && !deferredInstallPrompt && isIosSafari() && !isInstallDismissed(),
    updateAvailable: Boolean(waitingWorker),
    isStandalone: standalone,
  };
}

function notify() {
  const state = getPwaState();
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch (_) {}
  });
}

export function subscribePwaState(callback) {
  listeners.add(callback);
  callback(getPwaState());
  return () => listeners.delete(callback);
}

export async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) return { outcome: 'unavailable' };
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  notify();
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === 'dismissed') {
      dismissInstallPrompt();
    }
    return choice || { outcome: 'dismissed' };
  } catch {
    return { outcome: 'error' };
  }
}

export function applyPwaUpdate() {
  if (!waitingWorker) return;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function initPwaListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notify();
  });
}

export function registerServiceWorker() {
  initPwaListeners();
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
  if (!isProd && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  if (!isProd) return;

  window.addEventListener('load', () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (!reg) return;
        registrationRef = reg;
        if (reg.waiting) {
          waitingWorker = reg.waiting;
          notify();
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = installing;
              notify();
            }
          });
        });
      })
      .catch(() => {
        // Ignore SW registration rejection when blocked by browser privacy policy
      });
  });
}

export function checkForPwaUpdate() {
  registrationRef?.update?.().catch(() => {});
}

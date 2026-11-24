/**
 * Soporte PWA / modo sin conexión (navegador, Android Chrome e iOS Safari).
 * No hace nada en `file://`, Node ni dentro de la APK nativa Android (`appassets.androidplatform.net`).
 */
export const CARDS_CACHE = 'ih-cards-v1';

let manifestPromise = null;
let downloadPromise = null;
const listeners = new Set();

export function isWebPwaEnv() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof location === 'undefined') return false;
  if (location.hostname === 'appassets.androidplatform.net') return false;
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.navigator?.standalone === true || !!window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches;
}

export function isIosSafariNotStandalone() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !isStandalone();
}

const abs = (rel) => new URL(rel, location.href).href;

export function loadPwaAssets() {
  if (!manifestPromise) {
    manifestPromise = fetch('./pwa-assets.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

function notify(state) {
  for (const fn of listeners) try { fn(state); } catch { /* noop */ }
}

export function onOfflineProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getOfflineStats() {
  if (!isWebPwaEnv() || typeof caches === 'undefined') return null;
  const m = await loadPwaAssets();
  if (!m?.cards?.length) return null;
  const cache = await caches.open(CARDS_CACHE);
  const keys = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  let cached = 0; let baseCached = 0;
  for (const rel of m.cards) {
    if (keys.has(new URL(rel, location.href).pathname)) cached++;
  }
  for (const rel of (m.base || [])) {
    if (keys.has(new URL(rel, location.href).pathname)) baseCached++;
  }
  return { total: m.cards.length, cached, baseTotal: (m.base || []).length, baseCached, busy: !!downloadPromise };
}

async function cacheUrls(urls, { concurrency = 4, scope = 'all' } = {}) {
  if (!urls.length || typeof caches === 'undefined') return { done: 0, total: 0, failed: 0 };
  const cache = await caches.open(CARDS_CACHE);
  const existing = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const pending = urls.filter((rel) => !existing.has(new URL(rel, location.href).pathname));
  const total = urls.length;
  let done = total - pending.length;
  let failed = 0;
  notify({ scope, busy: true, done, total, failed });
  let i = 0;
  async function worker() {
    while (i < pending.length) {
      const rel = pending[i++];
      const u = abs(rel);
      try {
        if (await cache.match(u)) { done++; continue; }
        const res = await fetch(u);
        if (res.ok) { await cache.put(u, res); done++; }
        else failed++;
      } catch { failed++; }
      notify({ scope, busy: true, done, total, failed });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length || 1) }, worker));
  notify({ scope, busy: false, done, total, failed });
  return { done, total, failed };
}

export function downloadAllOffline() {
  if (!isWebPwaEnv()) return Promise.resolve(null);
  if (downloadPromise) return downloadPromise;
  downloadPromise = (async () => {
    try {
      const m = await loadPwaAssets();
      if (!m?.cards?.length) return null;
      return await cacheUrls(m.cards, { concurrency: 5, scope: 'all' });
    } finally {
      downloadPromise = null;
    }
  })();
  return downloadPromise;
}

async function warmBaseCards() {
  if (!isWebPwaEnv() || navigator.onLine === false || downloadPromise) return;
  const m = await loadPwaAssets();
  if (!m?.base?.length) return;
  await cacheUrls(m.base, { concurrency: 3, scope: 'base' });
}

export function initPwa({ onUpdate } = {}) {
  if (!isWebPwaEnv()) return null;
  let notified = false;
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller && !notified) {
          notified = true;
          onUpdate?.();
        }
      });
    });
  }).catch((e) => console.warn('Service Worker no disponible:', e));

  setTimeout(() => { warmBaseCards().catch(() => {}); }, 1600);
  return true;
}

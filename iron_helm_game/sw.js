/* IRON HELM · Service Worker para jugar sin conexión en navegador, Android e iOS */
const CACHE_VER = 'ih-core-24c4b254d07a';
const CARDS_CACHE = 'ih-cards-v1';

const abs = (rel) => new URL(rel, self.location.href).href;

async function readAssetList() {
  const url = abs('./pwa-assets.json');
  try {
    const res = await fetch(new Request(url, { cache: 'no-store' }));
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch { /* sin red: intenta caché local */ }
  const cached = await caches.match(url);
  if (cached) return cached.json();
  throw new Error('No se pudo cargar pwa-assets.json');
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const data = await readAssetList();
    const cache = await caches.open(CACHE_VER);
    const urls = [...new Set([...data.core, './pwa-assets.json'])];
    await Promise.all(urls.map(async (rel) => {
      const u = abs(rel);
      const res = await fetch(new Request(u, { cache: 'reload' }));
      if (!res.ok) throw new Error(`Error precacheando ${rel}: ${res.status}`);
      await cache.put(u, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_VER && k !== CARDS_CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const basePath = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(basePath)) return;
  const rel = url.pathname.slice(basePath.length);
  if (rel === 'sw.js') return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const core = await caches.open(CACHE_VER);
      const cached = await core.match(abs('./index.html'));
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net.ok) await core.put(abs('./index.html'), net.clone());
        return net;
      } catch {
        return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (rel === 'pwa-assets.json') {
    event.respondWith((async () => {
      const core = await caches.open(CACHE_VER);
      try {
        const net = await fetch(req);
        if (net.ok) await core.put(abs('./pwa-assets.json'), net.clone());
        return net;
      } catch {
        return (await core.match(abs('./pwa-assets.json'))) || new Response('{}', { status: 503 });
      }
    })());
    return;
  }

  if (rel.startsWith('assets/cards/')) {
    event.respondWith((async () => {
      const cards = await caches.open(CARDS_CACHE);
      const hit = await cards.match(url.origin + url.pathname);
      if (hit) return hit;
      const core = await caches.open(CACHE_VER);
      const coreHit = await core.match(url.origin + url.pathname);
      if (coreHit) return coreHit;
      const net = await fetch(req);
      if (net.ok) await cards.put(url.origin + url.pathname, net.clone());
      return net;
    })());
    return;
  }

  event.respondWith((async () => {
    const core = await caches.open(CACHE_VER);
    const hit = await core.match(url.origin + url.pathname);
    if (hit) return hit;
    const net = await fetch(req);
    if (net.ok && (rel === '' || rel === 'manifest.webmanifest' || rel.startsWith('css/') || rel.startsWith('fonts/') || rel.startsWith('icons/') || rel.startsWith('assets/'))) {
      await core.put(url.origin + url.pathname, net.clone());
    }
    return net;
  })());
});

/**
 * EVidya Production Service Worker
 * - Pre-caches minimal safe shell & fonts
 * - Cache-first for immutable bundled/static assets
 * - Network-first with cached SPA shell fallback + offline.html for navigations
 * - Never caches API responses, auth routes, Range requests, or cross-origin requests
 * - Supports explicit user-confirmed updates via SKIP_WAITING message
 */

const CACHE_VERSION = 'v2';
const SHELL_CACHE = `evidya-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `evidya-assets-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
  '/fonts/bricolage-grotesque-latin-wght-normal.woff2',
  '/fonts/plus-jakarta-sans-latin-400-normal.woff2',
  '/fonts/plus-jakarta-sans-latin-700-normal.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate automatically only on brand-new install (no active worker yet).
  // Updates wait politely until the user clicks "Update" (SKIP_WAITING).
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((oldKey) => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isStaticAssetPath(pathname) {
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/audio/') ||
    pathname.startsWith('/hero/') ||
    pathname.startsWith('/sounds/') ||
    pathname.startsWith('/demo/') ||
    /\.(?:js|css|woff2|png|svg|ico|webp)$/i.test(pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, cross-origin, Range requests (video 206), and authenticated/API/WS traffic
  if (request.method !== 'GET' || request.headers.has('range') || request.headers.has('authorization')) {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/') || url.pathname.includes('/auth/')) {
    return;
  }

  // App navigations: Network-first, falling back to cached SPA index.html or offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          if (url.pathname === '/offline.html') {
            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) return offlinePage;
          }
          const shell = await caches.match('/index.html');
          if (shell) return shell;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Immutable static assets & bundles: Cache-first with background fill
  if (isStaticAssetPath(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        });
      })
    );
  }
});

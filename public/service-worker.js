// ============================================================
// AI App Builder Challenge — Service Worker
// Caches static assets for offline / instant load
// ============================================================

const CACHE_NAME   = 'ai-challenge-v2';
const STATIC_ASSETS = [
  '/',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install: pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache for static assets, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — always go to network (never cache dynamic data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets — cache-first strategy
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for static assets
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback — serve the cached shell
      return caches.match('/');
    })
  );
});

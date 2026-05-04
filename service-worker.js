'use strict';

// Bump this version on every deploy to invalidate the old cache
const CACHE_VERSION = 'gm-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pre-cached on install: shell + critical assets so the app loads offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/style.css',
  '/js/i18n.js',
  '/js/db.js',
  '/js/utils.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/shopping.js',
  '/js/inventory.js',
  '/js/prices.js',
  '/js/expenses.js',
  '/js/revenues.js',
  '/js/categories.js',
  '/js/charts.js',
  '/js/export.js',
  '/js/settings.js',
  '/js/users.js',
  '/js/onboarding.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
];

// Install: pre-cache the app shell. Failures on individual files don't break install.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] precache miss:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: drop old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - API & POST/PUT/DELETE      -> network only (don't cache mutations)
//   - HTML navigations           -> network first, fall back to cached / index.html
//   - Static assets (js/css/img) -> cache first, fall back to network and cache
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never cache API responses (user-specific, mutating)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML navigations: network first
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, copy));
        }
        return res;
      });
    })
  );
});

// Allow the page to trigger an update check
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

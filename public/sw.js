// __BUILD_ID__ is replaced with the commit hash by the CI deploy workflow. A new name per deploy
// changes this file, so the browser installs the new SW and the activate handler below deletes
// the previous deploy's cache (otherwise old hashed assets pile up forever).
const CACHE_NAME = 'mini-war-machine-__BUILD_ID__';
const INDEX_URL = './index.html';
// Relative to this script's URL, so the same file works at root and under a sub-folder
// (e.g. GitHub Pages at /mini-war-machine/).
const urlsToCache = [
  './',
  INDEX_URL,
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // The Cache API only stores GET; let anything else go straight to the network.
  if (event.request.method !== 'GET') return;

  // Network-first for page loads: index.html keeps the same URL across deploys but points at
  // new hashed bundles, so serving it from cache would pin users to an old build.
  // Offline, fall back to the last index.html we saw.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only a real 200 refreshes the offline copy. Deep links on GitHub Pages come back as
          // 404 (served from 404.html, a copy of the app); still returned, just not cached.
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  // Cache-first for everything else: Vite's JS/CSS have content hashes in their names,
  // so a cached copy can never be stale.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

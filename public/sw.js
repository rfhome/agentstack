// Minimal service worker — enables PWA installability and custom home screen icon on Android Chrome.
// No caching strategy: all requests pass through to the network.

const CACHE_VERSION = 'agentstack-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Pass all fetches through to the network — no offline caching for now.
self.addEventListener('fetch', () => {});

// Bump this version every deploy to bust all cached assets
const CACHE_NAME = 'rio-advisor-v5';

// Install — take control immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — delete every old cache version
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch — NETWORK FIRST, cache as fallback
// This ensures users always see the latest deploy.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Only handle same-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a copy of successful responses
        if (response && response.status === 200 && response.type !== 'error') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache if available
        return caches.match(event.request);
      })
  );
});

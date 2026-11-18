const CACHE_NAME = 'sonora-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Pass through audio streaming, range requests, audio media elements, chrome-extensions directly
  if (
    event.request.url.startsWith('blob:') ||
    event.request.url.startsWith('chrome-extension:') ||
    event.request.destination === 'audio' ||
    event.request.headers.has('range') ||
    event.request.url.match(/\.(mp3|m4a|wav|ogg|flac|aac)(\?.*)?$/i) ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-first strategy: always fetch latest from server, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

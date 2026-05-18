const CACHE = 'gyamera-v2';
const PRECACHE = [
  './index.html',
  './gyameraaesthetics-logo.jpg',
  './gyameraaesthetics-favicon.png'
];

// Install — pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Apps Script API calls — let the browser handle them
  // natively so CORS + redirect handling works correctly for reading responses.
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com')
  ) {
    return;
  }

  // Don't intercept Google Fonts stylesheet (network only, no cache needed)
  if (url.hostname.includes('fonts.googleapis.com')) {
    return;
  }

  // Cache-first for Google Fonts files (the actual font binaries)
  if (url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Cache-first for everything else (local assets, index.html)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

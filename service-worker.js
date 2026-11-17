const CACHE_NAME = 'mon-espace-v13';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=15',
  './script.js?v=20',
  './widget-resize.js',
  './grade-statistics.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('mon-espace-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin
    || requestUrl.pathname.includes('/api/')) return;

  if (requestUrl.pathname.includes('/widget-preview/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', response.clone()))
          );
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || caches.match('./index.html'))
    );
    return;
  }

  if (requestUrl.pathname.endsWith('.css') || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.svg') || requestUrl.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
        );
        return response;
      }))
    );
  }
});

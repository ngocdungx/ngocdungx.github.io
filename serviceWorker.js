const CACHE_PREFIX = 'ngocdung-portfolio-';
const CACHE_NAME = `${CACHE_PREFIX}v21`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/styles.css?v=6.0',
  '/assets/css/resources.css?v=1.6',
  '/assets/js/main.js?v=4.0',
  '/tai-nguyen/',
  '/assets/js/resources.js?v=1.5',
  '/assets/data/resources.json',
  '/assets/img/tnd.jpg',
  '/assets/photos/c1-thumb.webp',
  '/assets/photos/c2-thumb.webp',
  '/assets/photos/c3-thumb.webp',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return Response.error();
      })
  );
});

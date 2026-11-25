const CACHE = 'skipcam-web-__CACHE_VERSION__';
const APP_FILES = [
  '/', '/scan/', '/generate/', '/history/', '/extension/',
  '/scan-qr-code-from-image/', '/scan-qr-code-without-phone/', '/wifi-qr-code-generator/',
  '/guides/why-a-qr-code-will-not-scan/', '/about/', '/privacy/', '/security/', '/help/',
  '/site.css', '/app.js', '/scan-worker.js', '/manifest.webmanifest',
  '/media/favicon.svg', '/media/favicon.png', '/media/symbol.svg',
  '/media/app-icon-512.png', '/media/app-icon-1024.png',
  '/media/web-app-scanner.png', '/media/web-app-generator.png', '/media/web-app-result.png',
  '/media/web-app-history.png', '/media/web-app-mobile.png', '/media/web-app-crop.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('skipcam-web-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const fresh = fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    });
    return cached || fresh;
  }));
});

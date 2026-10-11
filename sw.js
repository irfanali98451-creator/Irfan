// Hisaab service worker: caches the app shell so it opens instantly and offline.
// Bump CACHE when you change index.html so phones pick up the new version.
const CACHE = 'hisaab-v11';
const SHELL = ['./', './index.html', './manifest.webmanifest', './config.js', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls to Google; always go to the network.
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (e.request.method !== 'GET') return;
  // config.js holds the connection URL: always try the network first so an updated URL is picked up on the very next load.
  if (url.pathname.endsWith('/config.js')) { e.respondWith(fetch(e.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request))); return; }
  // App shell: cache first, then refresh in the background.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => { if (res.ok && url.origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => cached);
      return cached || fresh;
    })
  );
});

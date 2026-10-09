/* Bump CACHE on every release so installed copies pick up the new files. */
const CACHE = 'little-artist-v4';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function shell(request) {
  return caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Opening the app: newest page if online, stored copy if offline or slow (3s).
  if (request.mode === 'navigate') {
    const network = fetch(request, { cache: 'no-store' }).then((r) => (r && r.ok ? r : Promise.reject(r)));
    const timeout = new Promise((_, reject) => setTimeout(reject, 3000));
    event.respondWith(Promise.race([network, timeout]).catch(() => shell(request)));
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request))
  );
});

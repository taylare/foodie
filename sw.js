// Foodie service worker – makes the app installable and fully offline.
// Bump VERSION whenever you change any app file so phones pick up the update.
const VERSION = 'foodie-v2.1.0';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/platform.js',
  './js/ingredients.js',
  './js/importers.js',
  './js/shoplist.js',
  './js/pickers.js',
  './js/samples.js',
  './js/views/today.js',
  './js/views/recipes.js',
  './js/views/recipe.js',
  './js/views/editor.js',
  './js/views/cook.js',
  './js/views/planner.js',
  './js/views/shopping.js',
  './js/views/discover.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
const RUNTIME = 'foodie-runtime';

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so updates are really fresh
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

async function trim(cache, max = 250) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Opening the app: serve the cached shell (it's a single-page app, routes live in the #hash)
  if (req.mode === 'navigate' && url.origin === location.origin) {
    const scopePath = new URL(self.registration.scope).pathname;
    const isApp = url.pathname === scopePath || url.pathname === scopePath + 'index.html';
    e.respondWith(isApp
      ? caches.match('./index.html').then(r => r || fetch(req))
      : fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // Own files: cache first
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Fonts and recipe photos: stale-while-revalidate so they work offline
  const cacheable = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)
    || req.destination === 'image';
  if (cacheable) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone()).then(() => trim(c));
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
  // Everything else (recipe APIs) goes straight to the network.
});

// Tapping a timer notification brings the app back
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});

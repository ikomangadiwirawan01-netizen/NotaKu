/* =====================================================
   Service Worker NotaKu untuk GitHub Pages
   -----------------------------------------------------
   Fungsi:
   - Mempercepat loading file static GitHub Pages.
   - Menyimpan index.html dan invoice.html di cache browser.
   - Tidak menyimpan data API Apps Script agar data nota tetap terbaru.

   Jika Anda update index.html / invoice.html, naikkan angka versi cache
   di CACHE_NAME, contoh: notaku-cache-v2 menjadi notaku-cache-v3.
===================================================== */

const CACHE_NAME = 'notaku-cache-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './invoice.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Hanya cache request GET.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan cache request luar domain GitHub Pages, termasuk API Apps Script.
  if (url.origin !== self.location.origin) return;

  // Jangan cache service worker itu sendiri.
  if (url.pathname.endsWith('/sw.js')) return;

  // Untuk navigasi halaman, coba online dulu agar update terbaru cepat muncul.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Untuk asset static, pakai cache dulu lalu update dari network.
  event.respondWith(cacheFirstStatic(request));
});

async function networkFirstPage(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const url = new URL(request.url);
    if (url.pathname.endsWith('/invoice.html')) {
      return caches.match('./invoice.html');
    }
    return caches.match('./index.html') || caches.match('./');
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, fresh.clone());
  return fresh;
}

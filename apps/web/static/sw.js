// Bump this version to invalidate every previously cached asset.
const CACHE = 'panggora-shell-v2';
const SHELL = ['/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls and SvelteKit data requests always go straight to the network.
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('__data.json')) return;

  // Navigations: network first, offline page only when the network truly fails.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;padding:2rem"><h1>Tidak ada koneksi</h1><p>Buka kembali aplikasi saat koneksi tersedia.</p></body></html>',
          { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 200 },
        ),
      ),
    );
    return;
  }

  // Only content-hashed build assets are cache-first; their URL changes on
  // every deploy, so a stale entry can never shadow a new build.
  if (url.pathname.startsWith('/_app/immutable/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (images, manifest, icons): network first, cache fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && /\.(?:css|js|svg|jpe?g|png|webp|woff2?)$/.test(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});

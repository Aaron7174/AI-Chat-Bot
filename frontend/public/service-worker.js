const CACHE_PREFIX = 'employee-ai-static-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/employee-ai-192.png',
  '/icons/employee-ai-512.png',
  '/icons/employee-ai-maskable-512.png',
];

const precacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const indexResponse = await fetch('/index.html');
  if (!indexResponse.ok) throw new Error(`Unable to preload the application shell: ${indexResponse.status}`);

  const html = await indexResponse.text();
  const staticAssets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map((match) => match[1])
    .filter((assetPath) => assetPath.startsWith('/assets/'));
  await cache.addAll([...new Set(staticAssets)]);
};

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const shell = await cache.match('/index.html');
          if (shell) return shell;
          return Response.error();
        }),
    );
    return;
  }

  if (APP_SHELL.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => cache.match(request))
        .then((cached) => cached || fetch(request)),
    );
    return;
  }

  if (!requestUrl.pathname.startsWith('/assets/')) return;

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      }),
  );
});

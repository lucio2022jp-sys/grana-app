/* eslint-disable no-restricted-globals */
/**
 * Service worker do Grana.
 *
 * Estrategia:
 *   - Shell estatico (manifest, icones, fontes) cacheado em "cache-first".
 *   - Tudo dentro de /api eh "network-only" pra nunca servir dado financeiro
 *     velho. Sem internet, falha mesmo, mas a falha eh tratada na UI.
 *   - HTML / paginas usam "network-first" com fallback pro cache, pra ficar
 *     usavel offline sem servir versao antiga indefinidamente.
 *   - Versao do cache muda a cada deploy via SW_VERSION; bump manualmente
 *     pra forcar invalidacao quando algo critico mudar.
 */

const SW_VERSION = 'grana-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;
const PAGES_CACHE = `${SW_VERSION}-pages`;

const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nao mexe em rotas de API ou auth — sempre rede pra evitar dado obsoleto.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // HTML / navegacao: network-first.
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Estatico (build assets, imagens, fontes): cache-first.
  if (
    url.origin === self.location.origin ||
    url.hostname.endsWith('fonts.googleapis.com') ||
    url.hostname.endsWith('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      }),
    );
  }
});

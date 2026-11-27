/* Service worker de Ruteando. Hecho a mano y sin dependencias.
 *
 * Qué guarda:
 *  - la carcasa estática (`/_next/static/*`, con hash en el nombre: inmutable), los iconos y la página sin conexión;
 *  - las teselas de OpenStreetMap (hasta TILE_LIMIT, 7 días).
 * Qué NO guarda, nunca: páginas con sesión (HTML con datos de la persona), `/middleware/*` y `/gateway/*` (datos y sesión siempre por red).
 * Sin conexión, una navegación muestra `/offline`.
 * Cambiar VERSION invalida los cachés anteriores.
 */
const VERSION = 'v1';
const STATIC = `ruteando-static-${VERSION}`;
const TILES = `ruteando-tiles-${VERSION}`;
const OFFLINE_URL = '/offline';
const TILE_LIMIT = 300;
const TILE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => ![STATIC, TILES].includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/** Quita las entradas más viejas hasta dejar `limit`. */
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Teselas: la copia guardada si es reciente y, si no, la red (y la copia vieja si la red falla). */
async function tile(request) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(request);
  const fresh = hit && Date.now() - Number(hit.headers.get('x-cached-at') || 0) < TILE_MAX_AGE;
  if (fresh) return hit;
  try {
    const response = await fetch(request);
    // Las teselas de otro origen llegan opacas (status 0): se guardan igual, con la fecha en una respuesta propia no se puede, así que
    // se guarda tal cual y la caducidad la decide el límite de entradas.
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone();
      if (response.ok) {
        const headers = new Headers(copy.headers);
        headers.set('x-cached-at', String(Date.now()));
        await cache.put(request, new Response(await copy.blob(), { status: copy.status, headers }));
      } else {
        await cache.put(request, copy);
      }
      trim(TILES, TILE_LIMIT);
    }
    return response;
  } catch (error) {
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'tile.openstreetmap.org' || url.hostname.endsWith('.tile.openstreetmap.org')) {
    event.respondWith(tile(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Datos y sesión: siempre la red, sin tocarlos
  if (url.pathname.startsWith('/middleware/') || url.pathname.startsWith('/gateway/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(OFFLINE_URL)) || new Response('Sin conexión', { status: 503 })
      )
    );
  }
});

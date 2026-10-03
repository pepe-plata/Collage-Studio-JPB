// ============================================
// sw.js — Service Worker (network-first, cache fallback)
// ============================================

const CACHE = 'collage-jpb-v5'; // ⬅️ sube la versión
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './README.md',
  './css/styles.css',
  './js/main.js',
  './js/canvas.js',
  './js/ui.js',
  './js/history.js',
  './js/tools.js',
  './js/filters.js',
  './js/project.js',
  './icons/icon-192.png',   // ✅ NUEVO
  './icons/icon-512.png',   // ✅ NUEVO
  './icons/help.png',       // ✅ NUEVO
  './icons/duplicate.png',
  './icons/delete.png',
  './icons/sendback.png',
  './icons/sendfront.png',
  './icons/center.png',
  './icons/rotate-left.png',
  './icons/rotate-right.png',
  './icons/fliphorizontal.png',
  './icons/flipvertical.png',
  './icons/padlock.png',
  './icons/scissors.png',
  './icons/zoomin.png',
  './icons/zoomout.png',
  './icons/resetzoom.png',
  'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js'
];

// ===== INSTALL =====
self.addEventListener('install', (e) => {
  console.log('🔧 SW instalando');
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting(); // ✅ activa inmediatamente la nueva versión
});

// ===== ACTIVATE =====
self.addEventListener('activate', (e) => {
  console.log('✅ SW activo');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== FETCH: network-first, cache fallback =====
self.addEventListener('fetch', (e) => {
  // Solo GET
  if (e.request.method !== 'GET') return;

  // No interceptar extensiones de Chrome
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Guardar copia fresca en caché
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Sin red → usar caché
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Si es navegación, devolver index.html cacheado
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// ===== MENSAJES =====
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
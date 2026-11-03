// Service worker: cache dos arquivos do app (e das libs de CDN após o 1º uso) para abrir offline.
const CACHE = 'vr-atendente-v1';
const CORE = ['./', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './js/main.js', './js/settings.js', './js/filters.js', './js/gestures.js', './js/handtracking.js',
  './js/hands3d.js', './js/vr.js', './js/audio.js', './js/textures.js', './js/world.js',
  './js/physics.js', './js/interaction.js', './js/npc.js', './js/game.js', './js/ui.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const ok = res && (res.status === 200 || res.type === 'opaque');
    if (ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});

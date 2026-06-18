const CACHE_NAME = 'financas-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json',
  './pwa-192x192.png',
  './pwa-512x512.png'
];

// Instalação - Cacheia ativos iniciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requisições (Estratégia Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  // Ignora chamadas a extensões ou métodos não GET
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Salva resposta atualizada no cache se for válida
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Se falhar a rede, retorna offline se disponível no cache
          return cachedResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});

/* GYMRAT service worker — tryb "network-first".
 * Zapewnia instalowalność PWA oraz działanie offline w podstawowym zakresie
 * (cache zapisuje odpowiedzi GET, przy braku sieci zwraca ostatnią wersję).
 * Strony autoryzowane (SSR) są zawsze pobierane na świeżo dzięki network-first.
 */
const CACHE = "gymrat-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});

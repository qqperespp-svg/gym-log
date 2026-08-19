/* GYMRAT service worker — tryb offline.
 * - Pliki statyczne (_next/static, ikony, vendor): stale-while-revalidate (cache-first).
 * - Strony (nawigacja): network-first z fallbackiem do cache — działa offline.
 * - Dane (API): network-only (zapis offline obsługuje IndexedDB + /api/sync).
 */
const CACHE_STATIC = "gymrat-static-v2";
const CACHE_PAGES = "gymrat-pages-v2";

const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_PAGES).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  const url = new URL(request.url);

  // Pliki statyczne Next.js — stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/vendor/zxing.min.js") {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Nawigacja (strony) — network-first z fallbackiem offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_PAGES).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Pozostałe GET (manifest, api) — domyślne
});

// Odznaka (badge) — np. ile kcal zostało do celu (Android/Chrome PWA).
self.addEventListener("message", (event) => {
  if (event.data?.type === "set-badge") {
    const n = Number(event.data.count) || 0;
    if (navigator.setAppBadge) {
      navigator.setAppBadge(n).catch(() => {});
    }
  }
  if (event.data?.type === "clear-badge") {
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  }
});

// Powiadomienia lokalne (przypomnienia o wodzie/posiłku), gdy aplikacja działa.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard"));
});

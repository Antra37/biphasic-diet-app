const CACHE_NAME = "sibo-food-checker-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./match.js",
  "./app.js",
  "./meal.js",
  "./push-config.js",
  "./data/supplements-extra.js",
  "./supplements.js",
  "./data/foods.js",
  "./data/nutrition.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/veg-bg.jpg",
  "./assets/fruit-bg.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to get the latest deployed code when online, and only fall
// back to the cached copy when offline. (A cache-first/stale-while-revalidate strategy
// was tried here before, but it means a freshly-deployed fix doesn't actually show up
// until the *second* time the app is opened - not acceptable while this app is still
// actively being updated.)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Leave cross-origin requests (e.g. the supplement label API) to the browser.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---------- Supplement reminders pushed from the worker/ backend ----------
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "Supplement due";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: data.url || "./#supplements" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./#supplements", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

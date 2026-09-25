const CACHE_NAME = "sibo-food-checker-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./match.js",
  "./app.js",
  "./meal.js",
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
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

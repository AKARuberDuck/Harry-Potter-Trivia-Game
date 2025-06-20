const CACHE_NAME = "hp-trivia-v1";
const ASSETS = [
  "/Harry-Potter-Trivia-Game/",
  "/Harry-Potter-Trivia-Game/index.html",
  "/Harry-Potter-Trivia-Game/style.css",
  "/Harry-Potter-Trivia-Game/script.js",
  "/Harry-Potter-Trivia-Game/manifest.json",
  "/Harry-Potter-Trivia-Game/icon-192.png",
  "/Harry-Potter-Trivia-Game/icon-512.png",
  "/Harry-Potter-Trivia-Game/intro-scene.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
});

// Service worker: cache khung ung dung de tai lai nhanh (ban dung lai).
const CACHE = "volam-idle-v1";
const SHELL = ["/", "/game.html", "/src/game/main.js", "/assets/web/ui/style.css"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => { if (e.request.method !== "GET") return; e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((f) => { const c = f.clone(); caches.open(CACHE).then((cc) => cc.put(e.request, c)).catch(() => {}); return f; }).catch(() => caches.match("/game.html")))); });
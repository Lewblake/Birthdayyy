/* PALITAN ANG PANGALAN/ICON NG APP: Android = "short_name" sa manifest.json + icon-192/512.png; iPhone = apple-mobile-web-app-title sa index.html + icon-192.png.
   Tapos palitan ang VERSION sa baba at i-install ulit sa phone. */
/* Service worker: para gumana ang website bilang app at kahit walang internet pagkatapos ma-open ng isang beses.
   Palitan ang VERSION kapag nag-update ka ng files para ma-refresh ang cache. */
const VERSION = "v10";
const CACHE = "birthday-" + VERSION;
const CORE = ["./", "./index.html", "./style.css", "./script.js", "./chat.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;        // hayaan ang audio/video streaming
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                           // fonts, API, atbp.: hindi ginagalaw
  e.respondWith(
    fetch(req).then((res) => {                                          // network muna, para laging bago
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});

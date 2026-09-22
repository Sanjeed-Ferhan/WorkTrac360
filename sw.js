/* WorkTrac360 service worker — offline app shell.
   Caches the static app; never caches the Google Sheets API. */
const CACHE = "wt360-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // never touch POST (API saves)
  const url = new URL(req.url);
  if (url.hostname.indexOf("script.google.com") >= 0 ||
      url.hostname.indexOf("googleusercontent.com") >= 0) return;  // never cache the backend

  if (req.mode === "navigate") {                          // app shell: network first, cache fallback
    e.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(                                          // assets: cache first, then network
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit)
    )
  );
});

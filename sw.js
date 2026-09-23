/* WorkTrac360 service worker — offline app shell.
   v4: blank-DB write guard, stale cache flush. */
const CACHE = "wt360-v4";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
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
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache Google Sheets API or external resources
  if (url.hostname.indexOf("script.google.com") >= 0 ||
      url.hostname.indexOf("googleusercontent.com") >= 0 ||
      url.hostname.indexOf("fonts.googleapis.com") >= 0 ||
      url.hostname.indexOf("fonts.gstatic.com") >= 0) return;

  // Navigation: network-first with cache fallback
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "reload" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Assets: cache-first, then network (with background update)
  e.respondWith(
    caches.match(req).then((hit) => {
      const fetchPromise = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});

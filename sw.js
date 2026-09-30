/* WorkTrac360 service worker — online-only gate.
   v10: the app is NOT cached; when the network is unavailable visitors get a
   dedicated "Please connect to Internet" page instead of the web app. */
const CACHE = "wt360-v10";
const ASSETS = ["./offline.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

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

const OFFLINE_HTML = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>No Internet</title></head>' +
  '<body style="margin:0;font-family:system-ui,Arial,sans-serif;background:#0f2233;color:#fff;height:100vh;' +
  'display:flex;align-items:center;justify-content:center;text-align:center;padding:24px">' +
  '<div><div style="font-size:52px">&#128225;</div><h1 style="font-size:21px">No Internet Connection</h1>' +
  '<p style="color:#c9d6e2;font-size:14px">Please connect to Internet to use WorkTrac360.</p>' +
  '<button onclick="location.reload()" style="background:#2E86C1;color:#fff;border:none;border-radius:8px;' +
  'padding:12px 22px;font-weight:600;cursor:pointer">Retry</button></div></body></html>';

function offlinePage() {
  return caches.match("./offline.html").then((hit) => hit ||
    new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept the backend API, CDN, or external resources.
  if (url.hostname.indexOf("supabase.co") >= 0 ||
      url.hostname.indexOf("cdn.jsdelivr.net") >= 0 ||
      url.hostname.indexOf("script.google.com") >= 0 ||
      url.hostname.indexOf("googleusercontent.com") >= 0 ||
      url.hostname.indexOf("fonts.googleapis.com") >= 0 ||
      url.hostname.indexOf("fonts.gstatic.com") >= 0) return;

  // Navigation: network-only. If it fails, show the offline message instead of the app.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => offlinePage())
    );
    return;
  }

  // Local assets (icons/manifest/offline page): cache-first.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});

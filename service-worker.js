// PokeRogue 离线版 Service Worker（自动生成）
const CACHE = "pokerogue-offline-v1";
const MANIFEST = "./offline-manifest.json";
let warming = false;

self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  if (event.data === "warm") {
    warm();
  }
});

async function warm() {
  if (warming) {
    return;
  }
  warming = true;
  try {
    const res = await fetch(MANIFEST, { cache: "no-store" });
    const list = await res.json();
    const cache = await caches.open(CACHE);
    let i = 0;
    const worker = async () => {
      while (i < list.length) {
        const rel = list[i++];
        try {
          const url = new URL(rel, self.registration.scope).href;
          const hit = await cache.match(url);
          if (!hit) {
            const r = await fetch(url);
            if (r && r.ok) {
              await cache.put(url, r.clone());
            }
          }
        } catch (e) {}
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
  } catch (e) {} finally {
    warming = false;
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") {
    return;
  }
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url.href, { ignoreSearch: true });
      if (hit) {
        return hit;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          cache.put(url.href, res.clone());
        }
        return res;
      } catch (e) {
        const fb = await cache.match(new URL("./index.html", self.registration.scope).href);
        return fb || Response.error();
      }
    })(),
  );
});

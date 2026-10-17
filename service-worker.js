// PokeRogue 离线版 Service Worker（自动生成）
// 策略：应用外壳（html/js/css/manifest）网络优先 -> 保证版本更新；
//       素材（images/audio/fonts/locales/battle-anims）缓存优先 -> 离线可玩。
const CACHE = "pokerogue-offline-v2";
const MANIFEST = "./offline-manifest.json";
let warming = false;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      // 清理旧版本缓存，避免占用空间
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
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

function isAppShell(url, request) {
  if (request.mode === "navigate") {
    return true;
  }
  const p = url.pathname;
  return (
    p.endsWith("/") ||
    p.endsWith("/index.html") ||
    p.endsWith("/asset-manifest.json") ||
    p.endsWith("/service-worker.js") ||
    p.endsWith("/manifest.webmanifest") ||
    p.endsWith("/offline-warmup.js") ||
    p.includes("/assets/")
  );
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

      if (isAppShell(url, req)) {
        // 网络优先：保证能拿到最新版本
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            cache.put(url.href, res.clone());
          }
          return res;
        } catch (e) {
          const hit = await cache.match(url.href, { ignoreSearch: true });
          if (hit) {
            return hit;
          }
          const fb = await cache.match(new URL("./index.html", self.registration.scope).href);
          return fb || Response.error();
        }
      }

      // 素材：缓存优先
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
        return Response.error();
      }
    })(),
  );
});

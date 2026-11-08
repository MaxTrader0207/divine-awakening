// 神格覺醒 Service Worker（v1.85）：安裝時把整個遊戲下載到快取，沒網路也能完整開啟、遊玩。
// 建置時 vite.config.ts 的 precacheSW() 會填入版本號與檔案清單（不用手動改）。
const VERSION = 'divine-__SW_VERSION__';
const PRECACHE = [/*__PRECACHE__*/];
/** 開啟頁面時等網路幾毫秒，超過就先用快取（訊號很差時不會卡在白畫面） */
const NAV_TIMEOUT = 3500;

/** 把還沒存到的檔案補下載（安裝時、啟用時、頁面問狀態時都會跑；同時只跑一個） */
let filling = null;
function fillMissing() {
  if (filling) return filling;
  filling = caches
    .open(VERSION)
    .then(async (c) => {
      const missing = [];
      for (const u of PRECACHE) if (!(await c.match(u, { ignoreVary: true }))) missing.push(u);
      // 一次 6 個，一個失敗不影響其他（之後再補）
      for (let i = 0; i < missing.length; i += 6) {
        await Promise.allSettled(missing.slice(i, i + 6).map((u) => fetch(u, { cache: 'reload' }).then((r) => (r.ok ? c.put(u, r) : null))));
      }
    })
    .finally(() => {
      filling = null;
    });
  return filling;
}

self.addEventListener('install', (e) => {
  e.waitUntil(fillMissing().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => fillMissing())
      .then(() => self.clients.matchAll())
      .then((list) => list.forEach((c) => c.postMessage({ type: 'sw:ready', version: VERSION, files: PRECACHE.length }))),
  );
});

self.addEventListener('message', (e) => {
  // 頁面問：離線檔案下載了幾個
  if (e.data?.type === 'sw:status') {
    fillMissing()
      .catch(() => null)
      .then(() => caches.open(VERSION))
      .then((c) => Promise.all(PRECACHE.map((u) => c.match(u, { ignoreVary: true }).then((r) => !!r))))
      .then((ok) => e.source?.postMessage({ type: 'sw:status', version: VERSION, cached: ok.filter(Boolean).length, total: PRECACHE.length }));
  }
});

function putCache(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 雲端存檔 API 不經過快取
  // 開啟頁面：網路優先（拿到最新版），太慢或沒網路就用快取
  if (req.mode === 'navigate') {
    e.respondWith(
      new Promise((resolve) => {
        let done = false;
        const fallback = () =>
          caches.match('./index.html', { ignoreVary: true }).then((r) => r || caches.match('./', { ignoreVary: true })).then((r) => {
            if (!done && r) {
              done = true;
              resolve(r);
            }
            return r;
          });
        const timer = setTimeout(fallback, NAV_TIMEOUT);
        fetch(req)
          .then((res) => {
            clearTimeout(timer);
            putCache('./index.html', res.clone());
            if (!done) {
              done = true;
              resolve(res);
            }
          })
          .catch(() => {
            clearTimeout(timer);
            fallback().then((r) => {
              if (!done) {
                done = true;
                resolve(r || Response.error());
              }
            });
          });
      }),
    );
    return;
  }
  // 檔名有雜湊的資源（assets/）：內容不會變，快取優先
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req, { ignoreVary: true, ignoreSearch: false }).then((r) => r || fetch(req).then((res) => putCache(req, res))));
    return;
  }
  // 其他（圖示、manifest）：先給快取，背景更新
  e.respondWith(
    caches.match(req, { ignoreVary: true, ignoreSearch: false }).then((r) => {
      const net = fetch(req)
        .then((res) => putCache(req, res))
        .catch(() => r);
      return r || net;
    }),
  );
});

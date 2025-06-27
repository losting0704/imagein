// /js/sw.js (最終清理版)

// ★★★ 如果未來有修改，請記得提升版本號，例如 v14 ★★★
const CACHE_NAME = "dryer-logger-cache-v20";

// 核心檔案 (請勿修改此列表)
const CORE_FILES = [
  "/",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/main.js",
  "./js/core.js",
  "./js/modules/config.js",
  "./js/modules/utils.js",
  "./js/modules/uiManager.js",
  "./js/modules/dataManager.js",
  "./js/modules/chartManager.js",
  "./js/modules/csvHandler.js",
  "./js/modules/eventHandler.js",
  "./js/modules/config/hmi.js",
  "./js/modules/config/measurements.js",
  "./img/icon-512x512.png",
];

// ★★★ 圖片資源：請檢查您的 img 資料夾，如果沒有對應的圖片，請將該行刪除或在前面加上 // 註解掉 ★★★
const IMAGE_FILES = [
  // 範例：如果您的專案中沒有 vt1 的 HMI 圖片，可以這樣做：
  // "./img/vt1-hmi-monitor-1.svg", --> //"./img/vt1-hmi-monitor-1.svg",

  // --- Damper 佈局圖 ---
  "./img/damper-layout-vt1.jpg",
  "./img/damper-layout-vt5.jpg",
  "./img/damper-layout-vt6.jpg",
  "./img/damper-layout-vt7.jpg",
  "./img/damper-layout-vt8.jpg",
  // --- HMI 介面背景圖 ---
  //"./img/vt1-hmi-monitor-1.svg",
  //"./img/vt1-hmi-monitor-2.svg",
  //"./img/vt1-hmi-pid-1.svg",
  "./img/vt5-hmi-monitor-1.svg",
  //"./img/vt5-hmi-monitor-2.svg",
  //"./img/vt5-hmi-pid-1.svg",
  "./img/vt6-hmi-monitor-1.svg",
  "./img/vt6-hmi-monitor-2.svg",
  "./img/vt6-hmi-pid-1.svg",
  "./img/vt7-hmi-monitor-1.svg",
  "./img/vt7-hmi-monitor-2.svg",
  "./img/vt7-hmi-pid-1.svg",
  "./img/vt8-hmi-monitor-1.svg",
  "./img/vt8-hmi-monitor-2.svg",
  "./img/vt8-hmi-pid-1.svg",
  "./img/vt8-hmi-pid-2.svg",
  // --- 風量測量點實景圖 ---
  "./img/vt1-chamber1-supply-motor-before.jpg",
  "./img/vt1-chamber1-supply-motor-after.jpg",
  "./img/vt1-chamber1-exhaust-motor-before.jpg",
  "./img/vt1-chamber1-exhaust-motor-after.jpg",
  "./img/vt1-chamber2-supply-motor-before.jpg",
  "./img/vt1-chamber2-supply-motor-after.jpg",
  "./img/vt1-chamber2-exhaust-motor-before.jpg",
  "./img/vt1-chamber2-exhaust-motor-after.jpg",
  "./img/vt1-chamber1-upper-ac-supply.jpg",
  "./img/vt1-upper-ac-supply.jpg",
  "./img/vt1-chamber2-upper-ac-supply.jpg",
  "./img/vt1-top-roll-exhaust-fan-before.jpg",
  "./img/vt1-top-roll-exhaust-fan-after.jpg",
  "./img/vt1-lower-ac-supply.jpg",
  "./img/vt1-lower-ac-exhaust.jpg",
  "./img/vt5-chamber1-supply.jpg",
  "./img/vt5-chamber1-exhaust.jpg",
  "./img/vt5-chamber2-supply.jpg",
  "./img/vt5-chamber2-exhaust.jpg",
  "./img/vt5-chamber1-2-exhaust.jpg",
  "./img/vt5-chamber1-upper-ac-supply.jpg",
  "./img/vt5-chamber1-upper-ac-supply-front.jpg",
  "./img/vt5-chamber1-upper-ac-supply-rear.jpg",
  "./img/vt5-chamber2-upper-ac-supply.jpg",
  "./img/vt5-chamber2-upper-ac-supply-front.jpg",
  "./img/vt5-chamber2-upper-ac-supply-rear.jpg",
  "./img/vt6-chamber1-supply.jpg",
  "./img/vt6-chamber1-exhaust.jpg",
  "./img/vt6-chamber2-supply.jpg",
  "./img/vt6-chamber2-exhaust.jpg",
  "./img/vt6-chamber1-upper-ac-supply-upper.jpg",
  "./img/vt6-chamber1-upper-ac-supply-lower.jpg",
  "./img/vt6-chamber1-upper-ac-exhaust.jpg",
  "./img/vt6-chamber2-upper-ac-supply.jpg",
  "./img/vt6-chamber2-upper-ac-exhaust.jpg",
  "./img/vt6-upper-ac-exhaust-1-2.jpg",
  "./img/vt6-top-exhaust-right.jpg",
  "./img/vt6-top-exhaust-left.jpg",
  "./img/vt6-lower-ac-exhaust.jpg",
  "./img/vt7-chamber1-supply.jpg",
  "./img/vt7-chamber1-exhaust.jpg",
  "./img/vt7-chamber2-supply.jpg",
  "./img/vt7-chamber2-exhaust.jpg",
  "./img/vt7-chamber1-2-exhaust.jpg",
  "./img/vt7-chamber1-upper-ac-supply-upper.jpg",
  "./img/vt7-chamber1-upper-ac-supply-lower.jpg",
  "./img/vt7-chamber2-upper-ac-supply.jpg",
  "./img/vt7-top-exhaust.jpg",
  "./img/vt7-upper-ac-exhaust-outdoor.jpg",
  "./img/vt7-lower-ac-supply.jpg",
  "./img/vt7-chamber2-lower-ac-exhaust.jpg",
  "./img/vt8-chamber1-supply.jpg",
  "./img/vt8-chamber2-supply-after-filter.jpg",
  "./img/vt8-chamber2-supply-before-filter.jpg",
  "./img/vt8-chamber1-exhaust-before-motor.jpg",
  "./img/vt8-chamber2-exhaust-before-motor.jpg",
  "./img/vt8-chamber1-upper-ac-supply.jpg",
  "./img/vt8-chamber1-upper-ac-supply-front.jpg",
  "./img/vt8-chamber1-upper-ac-supply-rear.jpg",
  "./img/vt8-chamber2-upper-ac-supply.jpg",
  "./img/vt8-chamber2-upper-ac-supply-front.jpg",
  "./img/vt8-chamber2-upper-ac-supply-rear.jpg",
  "./img/vt8-upper-ac-top-exhaust-outdoor.jpg",
  "./img/vt8-lower-ac-exhaust.jpg",
  "./img/vt8-lower-ac-exhaust-outdoor.jpg",
];

// --- 以下的程式碼不需要修改 ---

// 1. 安裝 Service Worker 並快取檔案
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install event for cache version:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching core application shell...");
      return cache.addAll(CORE_FILES).then(() => {
        console.log("[Service Worker] Caching non-essential image assets...");
        return Promise.all(
          IMAGE_FILES.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(
                `[SW] Failed to cache non-essential asset: ${url}`,
                err
              );
            });
          })
        );
      });
    })
  );
});

// 2. 啟用新的 Service Worker 時，刪除舊的快取
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. 攔截網路請求，優先從快取提供資源
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

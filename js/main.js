// /js/main.js

import { registerModule, startAllModules } from "./core.js";

import UIManager from "./modules/uiManager.js";
import DataManager from "./modules/dataManager.js";
import ChartManager from "./modules/chartManager.js";
import CsvHandler from "./modules/csvHandler.js";
import EventHandler from "./modules/eventHandler.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 已載入，準備啟動應用程式...");

  // 核心原則：被依賴的模組先註冊
  registerModule("uiManager", UIManager); // UIManager 必須最先註冊
  registerModule("dataManager", DataManager);
  registerModule("chartManager", ChartManager);
  registerModule("csvHandler", CsvHandler);
  registerModule("eventHandler", EventHandler);

  try {
    startAllModules();
    document.body.style.opacity = "1";
  } catch (error) {
    console.error("應用程式啟動失敗:", error);
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.classList.remove("visible");
    }
    const messageBox = document.getElementById("messageBox");
    if (messageBox) {
      messageBox.textContent = "應用程式啟動失敗，請檢查控制台錯誤。";
      messageBox.className = "message-box visible error";
    }
    document.body.style.opacity = "1";
  }

  console.log("===================================");
  console.log("乾燥機數據紀錄器已嘗試啟動！");
  console.log("===================================");

  // ▼▼▼ PWA 註冊程式碼 ▼▼▼
  if ("serviceWorker" in navigator) {
    // ★ 核心修正 ★：
    // 使用 '/sw.js' (從網站根目錄出發的絕對路徑)。
    // 這是最穩健可靠的方式，可以確保不論 main.js 在哪個資料夾內，
    // 瀏覽器都能正確地從網站的根目錄找到 sw.js 檔案，從而解決 404 找不到檔案的錯誤。
    navigator.serviceWorker
      .register("/sw.js", { type: "module" })
      .then((registration) => {
        console.log("Service Worker 註冊成功:", registration);
      })
      .catch((error) => {
        console.log("Service Worker 註冊失敗:", error);
      });
  }
  // ▲▲▲ PWA 註冊程式碼結束 ▲▲▲
});

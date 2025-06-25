// /js/modules/eventHandler.js (修正後)

import * as utils from "./utils.js";

const EventHandler = (sandbox) => {
  let ui;
  let chartManager; // 新增 chartManager 的引用
  let debouncedValidate;

  const safeAddEventListener = (element, event, handler) => {
    if (element) {
      element.addEventListener(event, handler);
    }
  };

  const _handleKeyboardShortcuts = (e) => {
    const dom = ui.getDomElements();
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      const isUpdateMode = dom.updateDataBtn.style.display !== "none";
      if (isUpdateMode) dom.updateDataBtn.click();
      else dom.saveDataBtn.click();
    } else if (e.key === "Escape") {
      const isUpdateMode = dom.updateDataBtn.style.display !== "none";
      if (isUpdateMode) {
        e.preventDefault();
        dom.cancelEditBtn.click();
      }
    }
  };

  const _attachEventListeners = () => {
    const dom = ui.getDomElements();
    document.addEventListener("keydown", _handleKeyboardShortcuts);
    debouncedValidate = utils.debounce((inputElement) => {
      sandbox.publish("request-validate-field", { element: inputElement });
    }, 500);

    // --- 資料庫管理流程事件綁定 ---
    safeAddEventListener(dom.loadMasterDbBtn, "click", () => {
      sandbox.publish("request-load-master-db-start");
    });
    safeAddEventListener(dom.createMasterDbBtn, "click", () => {
      sandbox.publish("request-create-master-db-start");
    });
    safeAddEventListener(dom.mergeToMasterBtn, "click", () => {
      sandbox.publish("request-merge-start");
    });
    safeAddEventListener(dom.exportForPowerBIBtn, "click", () => {
      sandbox.publish("request-export-all-for-powerbi");
    });
    safeAddEventListener(dom.exportDailyJsonBtn, "click", () => {
      sandbox.publish("request-export-daily-json");
    });

    // --- 主要按鈕功能事件綁定 ---
    safeAddEventListener(dom.saveDataBtn, "click", () => {
      if (ui.validateForm()) {
        sandbox.publish("request-save-data", ui.getRecordDataFromForm());
      } else {
        sandbox.publish("show-message", {
          text: "請修正表單中的錯誤欄位。",
          type: "error",
        });
      }
    });
    safeAddEventListener(dom.setNowBtn, "click", (e) => {
      e.preventDefault();
      sandbox.publish("request-set-now");
    });
    safeAddEventListener(dom.updateDataBtn, "click", () => {
      if (ui.validateForm()) {
        sandbox.publish("request-update-data", ui.getRecordDataFromForm());
      }
    });
    safeAddEventListener(dom.cancelEditBtn, "click", () =>
      sandbox.publish("request-cancel-edit")
    );
    safeAddEventListener(dom.clearDataBtn, "click", () =>
      sandbox.publish("request-confirm", {
        message: "您確定要清除所有本地儲存的數據嗎？此操作無法復原！",
        onConfirm: () => sandbox.publish("request-clear-all-data"),
      })
    );
    safeAddEventListener(dom.exportCsvBtn, "click", () =>
      sandbox.publish("request-current-data-for-export")
    );
    safeAddEventListener(dom.importCsvBtn, "click", () => {
      if (dom.csvFileInput) dom.csvFileInput.click();
    });
    safeAddEventListener(dom.csvFileInput, "change", (e) => {
      if (e.target.files.length > 0) {
        sandbox.publish("request-import-csv-records", {
          file: e.target.files[0],
        });
        e.target.value = "";
      }
    });
    safeAddEventListener(dom.rawCsvFileInput, "change", (e) => {
      if (e.target.files[0]) {
        sandbox.publish("request-import-raw-csv", { file: e.target.files[0] });
        e.target.value = "";
      }
    });

    // --- 圖表匯出按鈕事件 (核心修正) ---
    safeAddEventListener(dom.exportChartBtn, "click", () =>
      chartManager.exportChart(
        "temperatureChart",
        "技術溫測實溫分佈圖",
        "技術溫測實溫分佈圖"
      )
    );
    safeAddEventListener(dom.exportRawChartButton, "click", () => {
      if (dom.exportRawChartButton.disabled) return;
      chartManager.exportChart(
        "rawTemperatureChart",
        "原始溫測數據圖",
        "原始溫測數據圖 (CSV 匯入)"
      );
    });
    safeAddEventListener(
      document.getElementById("exportAirVolumeChartBtn"),
      "click",
      () =>
        chartManager.exportChart(
          "dashboardRtoChart",
          "風量比較圖",
          "風量比較圖"
        )
    );
    safeAddEventListener(
      document.getElementById("exportTempCompareChartBtn"),
      "click",
      () =>
        chartManager.exportChart(
          "dashboardTempChart",
          "溫度比較圖",
          "溫度比較圖"
        )
    );

    // --- (新增) Damper 佈局圖按鈕事件 ---
    safeAddEventListener(dom.viewDamperLayoutBtn, "click", (e) => {
      const button = e.currentTarget;
      if (button && button.dataset.imageSrc) {
        sandbox.publish("show-image-modal", {
          src: button.dataset.imageSrc,
          caption: button.dataset.imageCaption || "Damper 佈局圖",
        });
      }
    });

    // --- UI 互動事件 ---
    if (dom.radioButtons) {
      dom.radioButtons.forEach((radio) => {
        safeAddEventListener(radio, "change", (e) =>
          sandbox.publish("request-toggle-sections", e.target.value)
        );
      });
    }
    safeAddEventListener(dom.dryerModelSelect, "change", (e) =>
      sandbox.publish("request-change-dryer-model", e.target.value)
    );
    safeAddEventListener(dom.applyFiltersBtn, "click", () =>
      sandbox.publish("request-apply-filters", ui.getFilters())
    );
    safeAddEventListener(dom.resetFiltersBtn, "click", () => ui.resetFilters());
    safeAddEventListener(dom.imageModalClose, "click", () =>
      dom.imageModalOverlay.classList.remove("visible")
    );

    // --- 整頁的點擊事件代理 (Event Delegation) ---
    safeAddEventListener(document.body, "click", (e) => {
      const button = e.target.closest("button");
      if (
        button &&
        button.classList.contains("icon-btn") &&
        button.dataset.imageSrc
      ) {
        e.stopPropagation();
        sandbox.publish("show-image-modal", {
          src: button.dataset.imageSrc,
          caption: button.dataset.imageCaption || "實景圖",
        });
        return;
      }
      if (
        button &&
        button.classList.contains("pagination-button") &&
        button.dataset.page
      ) {
        const page = parseInt(button.dataset.page, 10);
        if (!isNaN(page)) sandbox.publish("request-change-page", page);
        return;
      }
      const tableRow = e.target.closest("tr");
      if (
        tableRow &&
        dom.dataTableBody &&
        tableRow.parentElement === dom.dataTableBody
      ) {
        if (e.target.classList.contains("compare-checkbox")) {
          sandbox.publish(
            "compare-selection-changed",
            e.target.dataset.recordId
          );
          return;
        }
        const targetButton = e.target.closest("button");
        const recordId = targetButton?.dataset.recordId;
        if (targetButton && recordId) {
          if (targetButton.classList.contains("golden-batch-btn"))
            sandbox.publish("request-set-golden-batch", recordId);
          else if (targetButton.classList.contains("edit-btn"))
            sandbox.publish("request-load-edit-data", recordId);
          else if (targetButton.classList.contains("delete-btn")) {
            sandbox.publish("request-confirm", {
              message: "確定要刪除這筆紀錄嗎？此操作無法恢復！",
              onConfirm: () => sandbox.publish("request-delete-data", recordId),
            });
          } else if (targetButton.classList.contains("view-raw-btn")) {
            sandbox.publish("request-view-raw-data", recordId);
            document
              .getElementById("rawTemperatureChartContainer")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return;
        }
      }
      const tableHeader = e.target.closest("th[data-sort-key]");
      if (tableHeader) {
        sandbox.publish("request-sort-history", tableHeader.dataset.sortKey);
        return;
      }
      const header = e.target.closest(".accordion-toggle");
      if (header) {
        sandbox.publish("request-toggle-accordion", header);
      }
    });

    // --- 整頁的輸入事件代理 ---
    safeAddEventListener(dom.allInputFieldsContainer, "input", (e) => {
      const target = e.target;
      if (
        !target.id ||
        (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")
      )
        return;
      debouncedValidate(target);
      if (
        target.id.startsWith("air_speed_") ||
        target.id.startsWith("air_temp_")
      ) {
        const measureId = target.id
          .replace("air_speed_", "")
          .replace("air_temp_", "");
        sandbox.publish("request-update-air-volume-row", measureId);
      } else if (
        target.id.startsWith("techTemp_") &&
        !target.id.endsWith("_diff")
      ) {
        const pointId = target.id.split("_")[1];
        sandbox.publish("request-update-tech-temp-row", pointId);
      }
      if (target.closest('.record-section[data-type="evaluationTeam"]')) {
        sandbox.publish("request-chart-preview", ui.getRecordDataFromForm());
      }
    });
  };

  return {
    init: () => {
      ui = sandbox.getModule("uiManager");
      chartManager = sandbox.getModule("chartManager"); // 取得 chartManager 模組
      if (!ui || !chartManager) {
        console.error(
          "EventHandler: 缺少 uiManager 或 chartManager 模組！應用程式無法啟動。"
        );
        return;
      }
      console.log("EventHandler: 模組初始化完成");
      try {
        _attachEventListeners();
      } catch (error) {
        console.error("EventHandler: 綁定事件時發生未預期的錯誤:", error);
        sandbox.publish("show-message", {
          text: "應用程式事件處理器啟動失敗。",
          type: "error",
        });
      }
    },
  };
};

export default EventHandler;

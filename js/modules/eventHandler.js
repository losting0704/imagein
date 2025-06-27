// /js/modules/eventHandler.js (完整功能版)

import * as utils from "./utils.js";

const EventHandler = (sandbox) => {
  // --- 模組私有變數 ---
  let ui; // 用於儲存 uiManager 模組的實例
  let chartManager; // 用於儲存 chartManager 模組的實例
  let debouncedValidate; // 用於存放防抖動後的驗證函式

  /**
   * 一個安全的事件監聽器綁定函式，會先檢查元素是否存在。
   * @param {HTMLElement | null} element - 要綁定事件的 DOM 元素。
   * @param {string} event - 事件名稱，例如 'click'。
   * @param {Function} handler - 事件觸發時要執行的函式。
   */
  const safeAddEventListener = (element, event, handler) => {
    if (element) {
      element.addEventListener(event, handler);
    }
  };

  /**
   * 綁定應用程式中所有的事件監聽器。
   * 這是整個應用的互動核心。
   */
  const _attachEventListeners = () => {
    // 從沙箱中取得 uiManager 的實例，以便操作 DOM 元素
    const dom = ui.getDomElements();

    // --- Raw Data 文字區塊處理 ---
    safeAddEventListener(dom.generateRawChartFromTextBtn, "click", () => {
      const rawText = dom.rawCsvTextArea.value;
      if (!rawText.trim()) {
        sandbox.publish("show-message", {
          text: "請先貼上 CSV 資料。",
          type: "error",
        });
        return;
      }
      sandbox.publish("request-parse-raw-text", { text: rawText });
    });

    // --- 全域鍵盤快捷鍵 ---
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const isUpdateMode = dom.updateDataBtn.style.display !== "none";
        if (isUpdateMode) dom.updateDataBtn.click();
        else dom.saveDataBtn.click();
      } else if (
        e.key === "Escape" &&
        dom.updateDataBtn.style.display !== "none"
      ) {
        e.preventDefault();
        dom.cancelEditBtn.click();
      }
    });

    // --- 表單輸入驗證 (使用 Debounce 防止頻繁觸發) ---
    debouncedValidate = utils.debounce((inputElement) => {
      sandbox.publish("request-validate-field", { element: inputElement });
    }, 500);

    // --- 主要操作按鈕 ---
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
    safeAddEventListener(dom.updateDataBtn, "click", () => {
      if (ui.validateForm()) {
        sandbox.publish("request-update-data", ui.getRecordDataFromForm());
      }
    });
    safeAddEventListener(dom.cancelEditBtn, "click", () =>
      sandbox.publish("request-cancel-edit")
    );
    safeAddEventListener(dom.setNowBtn, "click", (e) => {
      e.preventDefault();
      sandbox.publish("request-set-now");
    });

    // --- 數據匯入/匯出按鈕 ---
    safeAddEventListener(dom.importCsvBtn, "click", () =>
      dom.csvFileInput.click()
    );
    safeAddEventListener(dom.exportCsvBtn, "click", () =>
      sandbox.publish("request-current-data-for-export")
    );
    safeAddEventListener(dom.exportChartBtn, "click", () => {
        const includeLegend = dom.includeLegendTech.checked;
        chartManager.exportChart(
            "temperatureChart",
            "技術溫測實溫分佈圖",
            "技術溫測實溫分佈圖",
            includeLegend
        );
    });
    safeAddEventListener(dom.exportRawChartButton, "click", () => {
      if (dom.exportRawChartButton.disabled) return;
      const includeLegend = dom.includeLegendRaw.checked;
      chartManager.exportChart(
        "rawTemperatureChart",
        "原始溫測數據圖",
        "原始溫測數據圖 (CSV 匯入)",
        includeLegend
      );
    });
    safeAddEventListener(
      dom.exportAirVolumeChartBtn,
      "click",
      () => {
          const includeLegend = dom.includeLegendAir.checked;
          chartManager.exportChart(
              "dashboardRtoChart",
              "風量比較圖",
              "風量比較圖",
              includeLegend
          );
      }
    );
    safeAddEventListener(
      dom.exportTempCompareChartBtn,
      "click",
      () => {
          const includeLegend = dom.includeLegendCompare.checked;
          chartManager.exportChart(
              "dashboardTempChart",
              "溫度比較圖",
              "溫度比較圖",
              includeLegend
          );
      }
    );
    safeAddEventListener(dom.clearDataBtn, "click", () =>
      sandbox.publish("request-confirm", {
        message: "您確定要清除所有本地儲存的數據嗎？此操作無法復原！",
        onConfirm: () => sandbox.publish("request-clear-all-data"),
      })
    );
    
    // --- 資料庫管理按鈕 ---
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
      sandbox.publish("request-daily-records-for-export");
    });

    // --- 圖表互動按鈕 ---
    safeAddEventListener(dom.toggleDataLabelsBtn, "click", (e) => {
        sandbox.publish("request-toggle-datalabels", {
            chartId: 'temperatureChart',
            visible: e.target.checked
        });
    });
    safeAddEventListener(document.getElementById("toggleDataLabels_air"), "click", (e) => {
        sandbox.publish("request-toggle-datalabels", {
            chartId: 'dashboardRtoChart',
            visible: e.target.checked
        });
    });
    
    // --- 檔案輸入框變更事件 ---
    safeAddEventListener(dom.csvFileInput, "change", (e) => {
      if (e.target.files.length > 0) {
        sandbox.publish("request-import-csv-records", {
          file: e.target.files[0],
        });
        e.target.value = "";
      }
    });

    // --- UI 互動控制 ---
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

    // --- 歷史數據篩選器 ---
    safeAddEventListener(dom.applyFiltersBtn, "click", () =>
      sandbox.publish("request-apply-filters", ui.getFilters())
    );
    safeAddEventListener(dom.resetFiltersBtn, "click", () => ui.resetFilters());

    // --- 事件代理: 處理動態產生的元素 ---
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

      const header = e.target.closest(".accordion-toggle");
      if (header) {
        sandbox.publish("request-toggle-accordion", header);
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
    });

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
      try {
        ui = sandbox.getModule("uiManager");
        chartManager = sandbox.getModule("chartManager");
        if (!ui || !chartManager) {
          throw new Error(
            "EventHandler: 缺少 uiManager 或 chartManager 模組！"
          );
        }
        _attachEventListeners();
        console.log("EventHandler: 模組初始化完成");
      } catch (error) {
        console.error("EventHandler: 模組初始化失敗！", error);
        sandbox.publish("show-message", {
          text: "事件處理器啟動失敗，部分功能可能無法使用。",
          type: "error",
        });
      }
    },
  };
};

export default EventHandler;

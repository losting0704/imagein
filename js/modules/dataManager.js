// /js/modules/dataManager.js

import {
  LOCAL_STORAGE_KEY,
  techTempPoints,
  getAirVolumeMeasurementsByModel,
} from "./config.js";
import * as utils from "./utils.js";

const DataManager = (sandbox) => {
  let records = [];
  let editingIndex = -1;
  let ui;
  let filterState = {};
  let sortState = { key: "dateTime", direction: "desc" };
  let goldenBatchId = null;
  let currentPage = 1;
  const ITEMS_PER_PAGE = 20;

  /**
   * 從 Local Storage 載入數據。
   * 這個版本經過強化，可以處理資料損毀的情況。
   */
  const _loadDataFromLocalStorage = () => {
    const storedRecords = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedRecords) {
      try {
        const parsedData = JSON.parse(storedRecords);
        if (!Array.isArray(parsedData)) {
          throw new Error("儲存的資料格式不正確，並非陣列。");
        }
        records = parsedData;
        records.forEach((record) => {
          if (!record.id) {
            record.id = crypto.randomUUID();
          }
        });
        records = records.filter((r) => r && typeof r === "object");
        console.log("DataManager: 已從 Local Storage 載入數據。");
      } catch (parseError) {
        console.error(
          "DataManager: 解析 Local Storage 數據失敗，資料可能已損毀。",
          parseError
        );
        records = [];
        sandbox.publish("show-message", {
          text: "本地資料損毀，已重設為空白。舊有資料已無法讀取。",
          type: "error",
        });
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          console.log("DataManager: 已清除損毀的 Local Storage 數據。");
        } catch (removeError) {
          console.error("DataManager: 清除損毀數據時發生錯誤。", removeError);
        }
      }
    } else {
      records = [];
    }

    try {
      if (ui) {
        const dryerModel = ui.getCurrentDryerModel();
        goldenBatchId = localStorage.getItem(`goldenBatchId_${dryerModel}`);
      }
    } catch (e) {
      console.error("DataManager: 載入 goldenBatchId 時發生錯誤", e);
      goldenBatchId = null;
    }
  };

  /**
   * 將當前記憶體中的數據儲存到 Local Storage。
   */
  const _saveRecordsToLocalStorage = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
      console.log("DataManager: 數據已儲存到 Local Storage。");
    } catch (e) {
      console.error("DataManager: 儲存 Local Storage 失敗", e);
      sandbox.publish("show-message", {
        text: "儲存本地數據失敗。",
        type: "error",
      });
    }
  };

  const _mergeImportedRecords = ({ records: importedRecords }) => {
    if (!Array.isArray(importedRecords) || importedRecords.length === 0) {
      sandbox.publish("show-message", {
        text: "匯入的檔案中沒有可添加的數據。",
        type: "info",
      });
      return;
    }

    const existingIds = new Set(records.map((r) => r.id));
    const recordsToAdd = importedRecords.filter((r) => {
      if (!r.id || existingIds.has(r.id)) {
        r.id = crypto.randomUUID();
      }
      if (typeof r.dryerModel === "string") {
        r.dryerModel = r.dryerModel.toLowerCase();
      }
      if (typeof r.recordType === "string") {
        if (r.recordType.includes("評價")) {
          r.recordType = "evaluationTeam";
        } else if (r.recordType.includes("條件設定")) {
          r.recordType = "conditionSetting";
        } else {
          r.recordType = r.recordType.toLowerCase();
        }
      }
      r.isSynced = false;
      return true;
    });

    records.unshift(...recordsToAdd);
    records.sort(
      (a, b) => new Date(b.dateTime || 0) - new Date(a.dateTime || 0)
    );

    _saveRecordsToLocalStorage();
    _publishDataUpdate();

    sandbox.publish("show-message", {
      text: `成功從 CSV 檔案匯入 ${recordsToAdd.length} 筆紀錄！`,
      type: "success",
    });
    console.log(`DataManager: 從 CSV 合併了 ${recordsToAdd.length} 筆紀錄。`);
  };

  const _saveGoldenBatchIdToLocalStorage = () => {
    try {
      if (!ui) {
        console.warn(
          "DataManager: UIManager 尚未初始化，無法儲存黃金樣板 ID。"
        );
        return;
      }
      const dryerModel = ui.getCurrentDryerModel();
      const storageKey = `goldenBatchId_${dryerModel}`;
      if (goldenBatchId) {
        localStorage.setItem(storageKey, goldenBatchId);
      } else {
        localStorage.removeItem(storageKey);
      }
      console.log(
        `DataManager: 黃金樣板 ID (${goldenBatchId}) 已為機型 ${dryerModel} 儲存。`
      );
    } catch (e) {
      console.error("DataManager: 儲存黃金樣板ID失敗", e);
      sandbox.publish("show-message", {
        text: "儲存黃金樣板設定失敗。",
        type: "error",
      });
    }
  };

  const _getFilteredAndSortedRecords = () => {
    if (!ui) {
      console.warn(
        "DataManager: UIManager 尚未初始化，無法獲取當前 UI 狀態進行過濾。"
      );
      return [];
    }
    const recordType = ui.getCurrentRecordType();
    const dryerModel = ui.getCurrentDryerModel();

    let filtered = records.filter(
      (r) => r.recordType === recordType && r.dryerModel === dryerModel
    );

    if (filterState.rtoStatus && filterState.rtoStatus !== "all") {
      filtered = filtered.filter(
        (record) => record.rtoStatus === filterState.rtoStatus
      );
    }

    if (filterState.heatingStatus && filterState.heatingStatus !== "all") {
      filtered = filtered.filter(
        (record) => record.heatingStatus === filterState.heatingStatus
      );
    }

    if (filterState.remark) {
      const lowerCaseQuery = filterState.remark.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.remark && record.remark.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (filterState.startDate) {
      filtered = filtered.filter(
        (record) =>
          record.dateTime &&
          record.dateTime.slice(0, 10) >= filterState.startDate
      );
    }
    if (filterState.endDate) {
      filtered = filtered.filter(
        (record) =>
          record.dateTime && record.dateTime.slice(0, 10) <= filterState.endDate
      );
    }

    if (
      filterState.field &&
      (filterState.min !== "" || filterState.max !== "")
    ) {
      const min =
        filterState.min !== "" ? parseFloat(filterState.min) : -Infinity;
      const max =
        filterState.max !== "" ? parseFloat(filterState.max) : Infinity;

      if (!isNaN(min) && !isNaN(max)) {
        filtered = filtered.filter((record) => {
          const value = utils.getNestedValue(record, filterState.field);
          if (value === null || value === undefined) return false;
          const numValue = parseFloat(value);
          return !isNaN(numValue) && numValue >= min && numValue <= max;
        });
      }
    }

    if (sortState.key) {
      filtered.sort((a, b) => {
        let valA = utils.getNestedValue(a, sortState.key);
        let valB = utils.getNestedValue(b, sortState.key);

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (
          typeof valA === "string" &&
          isNaN(valA) &&
          typeof valB === "string" &&
          isNaN(valB)
        ) {
          return sortState.direction === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        } else {
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
          return sortState.direction === "asc" ? numA - numB : numB - numA;
        }
      });
    }

    return filtered;
  };

  const _publishDataUpdate = (overridePayload = {}) => {
    const allVisibleRecords = _getFilteredAndSortedRecords();
    const totalPages =
      Math.ceil(allVisibleRecords.length / ITEMS_PER_PAGE) || 1;

    if (currentPage > totalPages) {
      currentPage = 1;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedRecords = allVisibleRecords.slice(startIndex, endIndex);

    const recordBeingEdited =
      editingIndex !== -1
        ? records.find((r) => r.id === records[editingIndex].id)
        : null;
    const newEditingIndex = recordBeingEdited
      ? paginatedRecords.findIndex((r) => r.id === recordBeingEdited.id)
      : -1;

    const payload = {
      records: paginatedRecords,
      pagination: { currentPage, totalPages },
      editingIndex: newEditingIndex,
      sortState: { ...sortState },
      goldenBatchId: goldenBatchId,
      ...overridePayload,
    };
    sandbox.publish("data-updated", payload);
  };

  const _changePage = (newPage) => {
    const allVisibleRecords = _getFilteredAndSortedRecords();
    const totalPages =
      Math.ceil(allVisibleRecords.length / ITEMS_PER_PAGE) || 1;
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      _publishDataUpdate();
    }
  };

  const _setGoldenBatch = (recordId) => {
    goldenBatchId = goldenBatchId === recordId ? null : recordId;
    _saveGoldenBatchIdToLocalStorage();
    _publishDataUpdate();
    sandbox.publish("show-message", {
      text: `黃金樣板已${goldenBatchId ? "設定" : "取消"}。`,
      type: "success",
    });
  };

  const _analyzeManualComparison = (recordIds) => {
    if (!recordIds || recordIds.length !== 2) {
      _clearCompareChart();
      return;
    }
    const record1 = records.find((r) => r.id === recordIds[0]);
    const record2 = records.find((r) => r.id === recordIds[1]);

    if (!record1 || !record2) {
      sandbox.publish("show-message", {
        text: "選取的紀錄無效，無法進行比較。",
        type: "error",
      });
      _clearCompareChart();
      return;
    }
    const analysisResult = _performComparison(record1, record2);
    _publishDataUpdate({ comparisonAnalysis: analysisResult });
  };

  const _performComparison = (recordA, recordB) => {
    const measurementsA = getAirVolumeMeasurementsByModel(recordA.dryerModel);
    const measurementsB = getAirVolumeMeasurementsByModel(recordB.dryerModel);

    const labelMap = new Map();
    measurementsA.forEach((m) => labelMap.set(m.id, m.label));
    measurementsB.forEach((m) => labelMap.set(m.id, m.label));

    const airVolumeLabels = [];
    const airDataA = [];
    const airDataB = [];
    const combinedAirKeys = [
      ...new Set([
        ...Object.keys(recordA.airVolumes || {}),
        ...Object.keys(recordB.airVolumes || {}),
      ]),
    ];

    for (const key of combinedAirKeys) {
      const volumeA = utils.getNestedValue(recordA, `airVolumes.${key}.volume`);
      const volumeB = utils.getNestedValue(recordB, `airVolumes.${key}.volume`);
      const label = labelMap.get(key) || key;
      if (
        (volumeA !== null && !isNaN(volumeA)) ||
        (volumeB !== null && !isNaN(volumeB))
      ) {
        airVolumeLabels.push(label);
        airDataA.push(volumeA || 0);
        airDataB.push(volumeB || 0);
      }
    }

    const tempLabels = techTempPoints.map((p) =>
      p.label.replace("技術溫測實溫_", "")
    );
    const tempDatasets = [];
    const lineNames = ["1(右)", "2", "3(中)", "4", "5(左)"];

    for (let i = 1; i <= 5; i++) {
      const data = tempLabels.map((label) => {
        const point = techTempPoints.find(
          (p) => p.label.replace("技術溫測實溫_", "") === label
        );
        if (!point) return null;
        const recordPointKey = utils.getActualTempRecordKey(point.id);
        return utils.getNestedValue(
          recordA,
          `actualTemps.${recordPointKey}.val${i}`,
          null
        );
      });
      tempDatasets.push({
        label: `紀錄 1 - ${lineNames[i - 1]}`,
        data,
        borderColor: `rgba(54, 162, 235, ${1 - (i - 1) * 0.15})`,
        fill: false,
        tension: 0.1,
      });
    }

    for (let i = 1; i <= 5; i++) {
      const data = tempLabels.map((label) => {
        const point = techTempPoints.find(
          (p) => p.label.replace("技術溫測實溫_", "") === label
        );
        if (!point) return null;
        const recordPointKey = utils.getActualTempRecordKey(point.id);
        return utils.getNestedValue(
          recordB,
          `actualTemps.${recordPointKey}.val${i}`,
          null
        );
      });
      tempDatasets.push({
        label: `紀錄 2 - ${lineNames[i - 1]}`,
        data,
        borderColor: `rgba(255, 159, 64, ${1 - (i - 1) * 0.15})`,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
      });
    }

    return {
      airVolumeData:
        airVolumeLabels.length > 0
          ? {
              labels: airVolumeLabels,
              datasets: [
                {
                  label: `紀錄 1 風量 (${
                    recordA.rtoStatus === "yes" ? "RTO啟用" : "RTO停用"
                  })`,
                  data: airDataA,
                  backgroundColor: "rgba(54, 162, 235, 0.6)",
                },
                {
                  label: `紀錄 2 風量 (${
                    recordB.rtoStatus === "yes" ? "RTO啟用" : "RTO停用"
                  })`,
                  data: airDataB,
                  backgroundColor: "rgba(255, 159, 64, 0.6)",
                },
              ],
            }
          : null,
      tempData: { labels: tempLabels, datasets: tempDatasets },
      recordInfo: {
        recordA: `紀錄 1: ${
          recordA.dateTime ? recordA.dateTime.replace("T", " ") : "無時間"
        }`,
        recordB: `紀錄 2: ${
          recordB.dateTime ? recordB.dateTime.replace("T", " ") : "無時間"
        }`,
      },
    };
  };

  const _clearCompareChart = () => {
    _publishDataUpdate({ comparisonAnalysis: null });
  };

  const _addRecord = (newRecord) => {
    newRecord.isSynced = false;
    records.unshift(newRecord);
    _saveRecordsToLocalStorage();
    _publishDataUpdate();
    sandbox.publish("show-message", {
      text: "數據已成功新增！",
      type: "success",
    });
    sandbox.publish("action-completed-clear-form");
  };

  const _updateRecord = (updatedRecord) => {
    const recordIndex = records.findIndex((r) => r.id === updatedRecord.id);
    if (recordIndex !== -1) {
      updatedRecord.isSynced = false;
      records[recordIndex] = { ...records[recordIndex], ...updatedRecord };
      _saveRecordsToLocalStorage();
      _publishDataUpdate();
      sandbox.publish("show-message", {
        text: "數據已成功更新！",
        type: "success",
      });
    } else {
      sandbox.publish("show-message", {
        text: "要更新的紀錄不存在。",
        type: "error",
      });
    }
  };

  const _deleteRecord = (recordId) => {
    const globalIndex = records.findIndex((r) => r.id === recordId);
    if (globalIndex !== -1) {
      if (globalIndex === editingIndex) {
        editingIndex = -1;
        sandbox.publish("action-completed-clear-form");
      }
      records.splice(globalIndex, 1);
      _saveRecordsToLocalStorage();
      _publishDataUpdate();
      sandbox.publish("show-message", { text: "紀錄已刪除。", type: "info" });
    } else {
      sandbox.publish("show-message", {
        text: "要刪除的紀錄不存在。",
        type: "error",
      });
    }
  };

  const _loadRecordForEdit = (recordId) => {
    const globalIndex = records.findIndex((r) => r.id === recordId);
    if (globalIndex !== -1) {
      editingIndex = globalIndex;
      sandbox.publish("load-data-to-form-for-edit", records[globalIndex]);
      _publishDataUpdate();
    } else {
      sandbox.publish("show-message", {
        text: "要編輯的紀錄不存在。",
        type: "error",
      });
    }
  };

  const _cancelEdit = () => {
    editingIndex = -1;
    _publishDataUpdate();
    sandbox.publish("action-completed-clear-form");
  };

  const _clearAllData = () => {
    records = [];
    editingIndex = -1;
    goldenBatchId = null;
    _saveRecordsToLocalStorage();
    _saveGoldenBatchIdToLocalStorage();
    _publishDataUpdate();
    sandbox.publish("show-message", { text: "所有數據已清除。", type: "info" });
  };

  const _handleApplyFilters = (filters) => {
    filterState = filters;
    currentPage = 1;
    _publishDataUpdate();
  };

  const _handleSort = (key) => {
    if (sortState.key === key) {
      sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    } else {
      sortState.key = key;
      sortState.direction = "desc";
    }
    currentPage = 1;
    _publishDataUpdate();
  };

  const _replaceAllData = (newRecords) => {
    if (!Array.isArray(newRecords)) {
      sandbox.publish("show-message", {
        text: "載入失敗：檔案格式不正確。",
        type: "error",
      });
      return;
    }

    newRecords.forEach((r) => {
      r.isSynced = true;
      if (!r.id) r.id = crypto.randomUUID();
      if (typeof r.dryerModel === "string") {
        r.dryerModel = r.dryerModel.toLowerCase();
      }
      if (typeof r.recordType === "string") {
        if (r.recordType === "評價TEAM用") {
          r.recordType = "evaluationTeam";
        } else if (r.recordType === "條件設定用") {
          r.recordType = "conditionSetting";
        } else {
          r.recordType = r.recordType.toLowerCase();
        }
      }
    });
    records = newRecords;
    _saveRecordsToLocalStorage();

    if (newRecords.length > 0) {
      const firstRecord = newRecords[0];
      sandbox.publish("request-view-switch", {
        recordType: firstRecord.recordType,
        dryerModel: firstRecord.dryerModel,
      });
    } else {
      _publishDataUpdate();
    }

    sandbox.publish("show-message", {
      text: `主資料庫載入成功！共 ${records.length} 筆紀錄。`,
      type: "success",
    });
  };

  // ★★★ 新增：取得今日新增紀錄的函式 ★★★
  const _getDailyRecords = () => {
    const today = new Date().toISOString().slice(0, 10);
    // 篩選出今天建立且尚未同步的紀錄
    return records.filter(
      (r) => r.dateTime && r.dateTime.startsWith(today) && !r.isSynced
    );
  };

  return {
    init: () => {
      ui = sandbox.getModule("uiManager");
      if (!ui) {
        console.error(
          "DataManager: 缺少 uiManager 模組！Data Manager 無法正常運行。"
        );
        sandbox.publish("show-message", {
          text: "核心模組載入失敗，應用程式無法完全啟動。",
          type: "error",
        });
        return;
      }
      _loadDataFromLocalStorage();

      sandbox.subscribe("request-change-page", _changePage);
      sandbox.subscribe("request-set-golden-batch", _setGoldenBatch);
      sandbox.subscribe("request-change-dryer-model", () => {
        currentPage = 1;
        _publishDataUpdate();
      });
      sandbox.subscribe("request-save-data", _addRecord);
      sandbox.subscribe("request-update-data", _updateRecord);
      sandbox.subscribe("request-delete-data", _deleteRecord);
      sandbox.subscribe("request-load-edit-data", _loadRecordForEdit);
      sandbox.subscribe("request-clear-all-data", _clearAllData);
      sandbox.subscribe("request-cancel-edit", _cancelEdit);
      sandbox.subscribe("request-current-data-for-export", () => {
        sandbox.publish("request-export-main-csv", {
          records: _getFilteredAndSortedRecords(),
        });
      });
      sandbox.subscribe("request-record-type-change", () => {
        currentPage = 1;
        _publishDataUpdate();
      });
      sandbox.subscribe("request-apply-filters", _handleApplyFilters);
      sandbox.subscribe("request-sort-history", _handleSort);
      sandbox.subscribe("request-compare-records", _analyzeManualComparison);
      sandbox.subscribe("request-clear-compare-chart", _clearCompareChart);
      sandbox.subscribe("request-manual-data-update", _publishDataUpdate);

      sandbox.subscribe("request-view-raw-data", (recordId) => {
        const record = records.find((r) => r.id === recordId);
        if (record && record.rawChartData) {
          sandbox.publish("plot-raw-data-chart", {
            results: record.rawChartData,
          });
          sandbox.publish("show-message", {
            text: "原始數據圖已載入。",
            type: "info",
          });
        } else {
          sandbox.publish("show-message", {
            text: "此紀錄不包含有效的原始數據圖表資料。",
            type: "error",
          });
        }
      });

      sandbox.subscribe("request-replace-all-data", (data) =>
        _replaceAllData(data.records)
      );
      sandbox.subscribe(
        "request-merge-imported-records",
        _mergeImportedRecords
      );

      // ★★★ 新增：監聽來自 eventHandler 的請求 ★★★
      sandbox.subscribe("request-daily-records-for-export", () => {
        const dailyRecords = _getDailyRecords();
        // 將今日紀錄發布出去，讓 csvHandler 接收
        sandbox.publish("request-export-daily-json", { dailyRecords });
      });

      _publishDataUpdate();
      console.log("DataManager: 模組初始化完成。");
    },
  };
};

export default DataManager;

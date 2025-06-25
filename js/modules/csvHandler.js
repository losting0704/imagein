// /js/modules/csvHandler.js (完整註釋版)

import { generateFieldConfigurations } from "./config.js";
import * as utils from "./utils.js";

// CsvHandler 模組：負責所有與 CSV 和 JSON 檔案的讀取、解析、匯出相關的操作
const CsvHandler = (sandbox) => {
  // --- 模組私有變數 ---
  let ui; // 用於儲存 uiManager 模組的實例

  /**
   * 將 Papa.parse 解析後的資料列陣列，轉換為應用程式內部使用的紀錄物件陣列。
   * @param {Array<Object>} rows - 從 CSV 解析出來的資料列陣列。
   * @returns {Array<Object>} 轉換後的紀錄物件陣列。
   */
  const _parseCsvRowsToRecords = (rows) => {
    const importedRecords = [];
    const supportedModels = ["vt1", "vt5", "vt6", "vt7", "vt8"];
    const masterHeaderMap = new Map();
    supportedModels.forEach((model) => {
      const modelFieldConfigs = generateFieldConfigurations(model);
      masterHeaderMap.set(model, modelFieldConfigs);
    });

    for (const row of rows) {
      try {
        const recordTypeValue = row["類型"] || "";
        let recordType = "";
        if (recordTypeValue.includes("評價")) {
          recordType = "evaluationTeam";
        } else if (recordTypeValue.includes("條件設定")) {
          recordType = "conditionSetting";
        }

        const dryerModel = (row["機台型號"] || "vt8").toLowerCase();

        if (
          !recordType ||
          !dryerModel ||
          !supportedModels.includes(dryerModel)
        ) {
          console.warn(`跳過無效的 CSV 資料列:`, row);
          continue;
        }

        const allConfigsForModel = masterHeaderMap.get(dryerModel);
        if (!allConfigsForModel) {
          console.warn(`找不到機型 "${dryerModel}" 的設定，跳過資料列。`);
          continue;
        }

        const recordData = {
          id: crypto.randomUUID(),
          recordType,
          dryerModel,
          isSynced: true,
          airVolumes: {},
          actualTemps: {},
          recorder1Data: {},
          recorder2Data: {},
          airExternalData: {},
          damperOpeningData: {},
          hmiData: {},
          rawChartData: null,
        };

        for (const headerFromFile in row) {
          const trimmedHeader = headerFromFile.trim();
          let value = row[headerFromFile];

          if (trimmedHeader === "RTO啟用狀態") {
            recordData.rtoStatus =
              value === "有" ? "yes" : value === "無" ? "no" : null;
            continue;
          }
          if (trimmedHeader === "升溫狀態") {
            recordData.heatingStatus =
              value === "有" ? "yes" : value === "無" ? "no" : null;
            continue;
          }

          let config = allConfigsForModel.find(
            (c) => c.csvHeader === trimmedHeader
          );

          if (config && config.dataKey) {
            if (
              value === null ||
              value === undefined ||
              String(value).trim() === "" ||
              String(value).toLowerCase() === "null"
            ) {
              value = null;
            } else if (config.elemType === "number" || config.isCalculated) {
              const num = parseFloat(value);
              value = isNaN(num) ? null : num;
            }
            if (value !== undefined) {
              utils.setNestedValue(recordData, config.dataKey, value);
            }
          }
        }
        importedRecords.push(recordData);
      } catch (error) {
        console.error("處理 CSV 資料列時發生錯誤:", error, "問題資料列:", row);
      }
    }
    return importedRecords;
  };

  /**
   * 處理來自文字區塊的 Raw Data。
   * @param {Object} { text } - 包含貼上文字的物件。
   */
  const _handleRawTextImport = ({ text }) => {
    if (!text || !text.trim()) {
      sandbox.publish("show-message", {
        text: "貼上的內容為空。",
        type: "info",
      });
      return;
    }
    sandbox.publish("show-loader");

    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        sandbox.publish("hide-loader");
        if (results.errors.length) {
          const errorMessage = `解析貼上內容失敗: ${results.errors[0].message}`;
          console.error(errorMessage, results.errors);
          sandbox.publish("show-message", {
            text: errorMessage,
            type: "error",
          });
        } else {
          sandbox.publish("raw-data-parsed-for-charting", { results });
        }
      },
      error: (err) => {
        sandbox.publish("hide-loader");
        const errorMessage = `解析貼上內容時發生嚴重錯誤: ${err.message}`;
        console.error(errorMessage, err);
        sandbox.publish("show-message", { text: errorMessage, type: "error" });
      },
    });
  };

  /**
   * 觸發瀏覽器下載檔案的輔助函式。
   * @param {string} content - 檔案內容。
   * @param {string} filename - 下載的檔名。
   * @param {string} mimeType - 檔案的 MIME 類型。
   */
  const _triggerDownload = (content, filename, mimeType) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`下載檔案 "${filename}" 時失敗:`, error);
      sandbox.publish("show-message", {
        text: `檔案下載失敗: ${error.message}`,
        type: "error",
      });
    }
  };

  /**
   * 匯出當前顯示在歷史紀錄表格中的數據為 CSV 檔案。
   * @param {object} { records } - 要匯出的紀錄陣列。
   */
  const _exportMainCsv = ({ records }) => {
    if (!records || records.length === 0) {
      sandbox.publish("show-message", {
        text: "目前沒有數據可以匯出。",
        type: "info",
      });
      return;
    }

    try {
      const firstRecord = records[0];
      const recordType = firstRecord.recordType;
      const dryerModel = firstRecord.dryerModel;

      const fieldConfigs = generateFieldConfigurations(dryerModel);
      const headersConfig = fieldConfigs.filter(
        (f) => f.inTable && f.recordTypes.includes(recordType)
      );

      const dataForCsv = records.map((record) => {
        const row = {};
        headersConfig.forEach((fieldConfig) => {
          const header = fieldConfig.csvHeader || fieldConfig.label;
          let valueToPush = "";
          if (fieldConfig.dataKey === "recordType") {
            valueToPush =
              record.recordType === "evaluationTeam"
                ? "評價TEAM用"
                : "條件設定用";
          } else if (fieldConfig.dataKey === "dryerModel") {
            valueToPush = record.dryerModel
              ? record.dryerModel.toUpperCase()
              : "";
          } else if (fieldConfig.dataKey === "rtoStatus") {
            const rtoValue = utils.getNestedValue(record, "rtoStatus");
            valueToPush =
              rtoValue === "yes" ? "有" : rtoValue === "no" ? "無" : "";
          } else if (fieldConfig.dataKey === "heatingStatus") {
            const heatingValue = utils.getNestedValue(record, "heatingStatus");
            valueToPush =
              heatingValue === "yes" ? "有" : heatingValue === "no" ? "無" : "";
          } else {
            valueToPush = utils.getNestedValue(record, fieldConfig.dataKey, "");
          }
          row[header] = valueToPush;
        });
        return row;
      });

      const csvContent = Papa.unparse(dataForCsv);
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[-:T]/g, "");
      _triggerDownload(
        "\ufeff" + csvContent,
        `乾燥機數據_${dryerModel}_${timestamp}.csv`,
        "text/csv;charset=utf-8;"
      );
      sandbox.publish("show-message", {
        text: "CSV 檔案已成功匯出！",
        type: "success",
      });
    } catch (error) {
      console.error("匯出 CSV 時發生錯誤:", error);
      sandbox.publish("show-message", {
        text: `匯出失敗: ${error.message}`,
        type: "error",
      });
    }
  };

  /**
   * 處理從檔案選擇器匯入歷史紀錄 CSV 的流程。
   * @param {object} { file } - 使用者選擇的檔案物件。
   */
  const _handleImportCsvRecords = ({ file }) => {
    if (!file) return;
    sandbox.publish("show-loader");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (results) => {
        sandbox.publish("hide-loader");
        if (results.errors.length) {
          sandbox.publish("show-message", {
            text: `檔案 ${file.name} 解析失敗: ${results.errors[0].message}`,
            type: "error",
          });
        } else {
          const importedRecords = _parseCsvRowsToRecords(results.data);
          if (importedRecords.length > 0) {
            sandbox.publish("request-merge-imported-records", {
              records: importedRecords,
            });
          } else {
            sandbox.publish("show-message", {
              text: "CSV 檔案中未找到有效數據。",
              type: "info",
            });
          }
        }
      },
      error: (err) => {
        sandbox.publish("hide-loader");
        sandbox.publish("show-message", {
          text: `讀取檔案 ${file.name} 失敗: ${err.message}`,
          type: "error",
        });
      },
    });
  };

  /**
   * 輔助函式，用於彈出檔案選擇對話框。
   * @param {HTMLElement} inputElement - 隱藏的 <input type="file"> 元素。
   * @param {Function} callback - 使用者選擇檔案後要執行的回呼函式。
   */
  const _promptForFiles = (inputElement, callback) => {
    inputElement.onchange = (event) => {
      if (event.target.files && event.target.files.length > 0) {
        callback(event.target.files);
      }
      inputElement.onchange = null; // 避免重複觸發
      inputElement.value = ""; // 清空選擇，以便下次能選擇同一個檔案
    };
    inputElement.click();
  };

  /**
   * 啟動「載入主資料庫」的流程。
   */
  const _startLoadMasterDbFlow = () => {
    const dom = ui.getDomElements();
    sandbox.publish("show-message", {
      text: "請選擇要載入的主資料庫檔案 (all_records.json)",
      type: "info",
    });
    _promptForFiles(dom.masterJsonInput, (files) => {
      const file = files[0];
      sandbox.publish("show-loader");
      file
        .text()
        .then((content) => {
          const allRecords = JSON.parse(content);
          sandbox.publish("request-replace-all-data", { records: allRecords });
        })
        .catch((err) => {
          sandbox.publish("show-message", {
            text: `檔案讀取或解析失敗: ${err.message}`,
            type: "error",
          });
        })
        .finally(() => {
          sandbox.publish("hide-loader");
        });
    });
  };

  /**
   * 啟動「從歷史 CSV 建立主資料庫」的流程。
   */
  const _startCreateMasterDbFlow = () => {
    const dom = ui.getDomElements();
    _promptForFiles(dom.historyCsvInput, (files) => {
      _handleCreateMasterDb(files);
    });
  };

  /**
   * 處理多個歷史 CSV 檔案，將它們合併成一個主資料庫 JSON 檔案。
   * @param {FileList} files - 使用者選擇的多個檔案。
   */
  const _handleCreateMasterDb = (files) => {
    if (!files || files.length === 0) return;
    sandbox.publish("show-message", {
      text: `正在讀取 ${files.length} 個CSV檔案...`,
      type: "info",
    });
    sandbox.publish("show-loader");

    const fileReadPromises = Array.from(files).map((file) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          encoding: "utf-8",
          complete: (results) => {
            if (results.errors.length) {
              reject(
                new Error(
                  `檔案 ${file.name} 解析失敗: ${results.errors[0].message}`
                )
              );
            } else {
              resolve(_parseCsvRowsToRecords(results.data));
            }
          },
          error: (err) =>
            reject(new Error(`讀取檔案 ${file.name} 失敗: ${err.message}`)),
        });
      });
    });

    Promise.all(fileReadPromises)
      .then((arrayOfRecordArrays) => {
        const allRecords = arrayOfRecordArrays.flat();
        if (allRecords.length > 0) {
          allRecords.sort(
            (a, b) => new Date(b.dateTime || 0) - new Date(a.dateTime || 0)
          );
          const jsonContent = JSON.stringify(allRecords, null, 2);
          _triggerDownload(
            jsonContent,
            "all_records.json",
            "application/json;charset=utf-8;"
          );
          sandbox.publish("show-message", {
            text: `主資料庫 all_records.json 已成功建立！共合併了 ${allRecords.length} 筆紀錄。`,
            type: "success",
          });
        } else {
          sandbox.publish("show-message", {
            text: "所有選擇的CSV中均無有效數據可建立資料庫。",
            type: "error",
          });
        }
      })
      .catch((error) => {
        sandbox.publish("show-message", { text: error.message, type: "error" });
      })
      .finally(() => {
        sandbox.publish("hide-loader");
      });
  };

  /**
   * 匯出本日新增的紀錄為 JSON 檔案。
   * @param {object} { dailyRecords } - 當天新增的紀錄陣列。
   */
  const _createDailyJsonFile = ({ dailyRecords }) => {
    if (!dailyRecords || dailyRecords.length === 0) {
      sandbox.publish("show-message", {
        text: "今日無新增紀錄可匯出。",
        type: "info",
      });
      return;
    }
    const jsonContent = JSON.stringify(dailyRecords, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    _triggerDownload(
      jsonContent,
      `tablet-data-${date}.json`,
      "application/json;charset=utf-8;"
    );
    sandbox.publish("records-successfully-exported", {
      ids: dailyRecords.map((r) => r.id),
    });
    sandbox.publish("show-message", {
      text: `本日新紀錄 (${dailyRecords.length} 筆) 已匯出。`,
      type: "success",
    });
  };

  /**
   * 啟動「合併資料至主資料庫」的流程。
   */
  const _handleMergeStart = () => {
    const dom = ui.getDomElements();
    sandbox.publish("show-message", {
      text: "請先選擇您的「主資料庫檔案 (all_records.json)」",
      type: "info",
    });
    _promptForFiles(dom.masterJsonInput, (masterFiles) => {
      const masterFile = masterFiles[0];
      sandbox.publish("show-message", {
        text: "接著，請選擇從平板匯出的「本日新紀錄檔案」",
        type: "info",
      });
      _promptForFiles(dom.dailyJsonInput, (dailyFiles) => {
        const dailyFile = dailyFiles[0];
        sandbox.publish("show-loader");
        Promise.all([masterFile.text(), dailyFile.text()])
          .then(([masterContent, dailyContent]) => {
            const masterRecords = JSON.parse(masterContent);
            const dailyRecords = JSON.parse(dailyContent);
            sandbox.publish("request-merge-records", {
              masterRecords,
              dailyRecords,
            });
          })
          .catch((err) => {
            sandbox.publish("show-message", {
              text: `檔案讀取或解析失敗: ${err.message}`,
              type: "error",
            });
          })
          .finally(() => {
            sandbox.publish("hide-loader");
          });
      });
    });
  };

  /**
   * 接收合併後的最終紀錄，並觸發下載。
   * @param {object} { finalRecords } - 合併並排序後的完整紀錄陣列。
   */
  const _createNewMasterFile = ({ finalRecords }) => {
    const jsonContent = JSON.stringify(finalRecords, null, 2);
    _triggerDownload(
      jsonContent,
      "all_records_updated.json",
      "application/json;charset=utf-8;"
    );
    sandbox.publish("show-message", {
      text: "資料合併成功！新的主資料庫 all_records_updated.json 已儲存。",
      type: "success",
    });
  };

  /**
   * 啟動「匯出 Power BI 專用 CSV」的流程。
   */
  const _exportAllForPowerBI = () => {
    const dom = ui.getDomElements();
    sandbox.publish("show-message", {
      text: "請選擇您的「主資料庫檔案 (all_records.json)」以進行匯出",
      type: "info",
    });
    _promptForFiles(dom.masterJsonInput, (files) => {
      const file = files[0];
      sandbox.publish("show-loader");
      file
        .text()
        .then((content) => {
          const allRecords = JSON.parse(content);
          if (!Array.isArray(allRecords))
            throw new Error("JSON格式不正確，並非紀錄陣列。");

          const allHeaders = new Map();
          const supportedModels = ["vt1", "vt5", "vt6", "vt7", "vt8"];
          supportedModels.forEach((model) => {
            generateFieldConfigurations(model).forEach((config) => {
              if (config.inTable) {
                const header = config.csvHeader || config.label;
                if (!allHeaders.has(header)) {
                  allHeaders.set(header, config);
                }
              }
            });
          });
          const sortedFieldConfigs = Array.from(allHeaders.values()).sort(
            (a, b) => (a.order || 9999) - (b.order || 9999)
          );

          const dataForCsv = allRecords.map((record) => {
            const row = {};
            sortedFieldConfigs.forEach((fieldConfig) => {
              const header = fieldConfig.csvHeader || fieldConfig.label;
              let valueToPush = utils.getNestedValue(
                record,
                fieldConfig.dataKey,
                ""
              );
              row[header] = valueToPush;
            });
            return row;
          });

          const csvContent = Papa.unparse(dataForCsv);
          _triggerDownload(
            "\ufeff" + csvContent,
            "power_bi_export_full.csv",
            "text/csv;charset=utf-8;"
          );
          sandbox.publish("show-message", {
            text: `成功為 Power BI 匯出 ${allRecords.length} 筆完整紀錄！`,
            type: "success",
          });
        })
        .catch((err) => {
          sandbox.publish("show-message", {
            text: `匯出失敗: ${err.message}`,
            type: "error",
          });
        })
        .finally(() => {
          sandbox.publish("hide-loader");
        });
    });
  };

  // --- 模組的初始化函式 ---
  return {
    init: () => {
      ui = sandbox.getModule("uiManager");
      if (!ui) {
        console.error("CsvHandler: 缺少 uiManager 模組！模組將無法正常運作。");
        return;
      }
      console.log("CsvHandler: 模組初始化完成");

      // --- 訂閱來自核心的事件 ---
      sandbox.subscribe("request-parse-raw-text", _handleRawTextImport);
      sandbox.subscribe("request-export-main-csv", _exportMainCsv);
      sandbox.subscribe("request-import-csv-records", _handleImportCsvRecords);
      sandbox.subscribe("request-load-master-db-start", _startLoadMasterDbFlow);
      sandbox.subscribe(
        "request-create-master-db-start",
        _startCreateMasterDbFlow
      );
      sandbox.subscribe("request-export-daily-json", _createDailyJsonFile);
      sandbox.subscribe("request-merge-start", _handleMergeStart);
      sandbox.subscribe("request-create-new-master-file", _createNewMasterFile);
      sandbox.subscribe("request-export-all-for-powerbi", _exportAllForPowerBI);
    },
  };
};

export default CsvHandler;

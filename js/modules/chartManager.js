// /js/modules/chartManager.js (錯誤修正版)

import { techTempPoints } from "./config.js"; //
import * as utils from "./utils.js"; //

// Chart.js 的客製化外掛，用於在主圖表無數據時顯示提示文字
const mainChartNoDataPlugin = {
  id: "mainChartNoData",
  afterDraw: (chart) => {
    const hasData = chart.data.datasets.some(
      (ds) => ds.data && ds.data.some((point) => point !== null)
    );
    if (!hasData) {
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px 'Noto Sans TC'";
      ctx.fillStyle = "#999";
      ctx.fillText(
        "沒有可用於圖表的評價數據",
        chartArea.width / 2,
        chartArea.height / 2
      );
      ctx.restore();
    }
  },
};

const ChartManager = (sandbox) => {
  // --- 模組私有變數 ---
  const chartInstances = {}; // 使用一個物件來儲存所有圖表實例
  let datasetVisibility = {}; // 記住主圖表各數據線的顯示/隱藏狀態
  let rawDatasetVisibility = {}; // 記住原始數據圖表各數據線的顯示/隱藏狀態

  /**
   * 取得目前時間戳記，用於匯出檔名
   * @returns {string} 格式為YYYYMMDD_HHMMSS 的字串
   */
  const _getTimestamp = () => {
    const now = new Date();
    // ▼▼▼【已修正】將 wwww 改為 yyyy，修正 ReferenceError ▼▼▼
    const yyyy = now.getFullYear(); //
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${MM}${DD}_${hh}${mm}${ss}`; //
  };

  /**
   * 通用的圖表匯出函式，可匯出任何指定的圖表為 PNG 圖片
   * @param {string} chartId - 圖表 <canvas> 元素的 ID
   * @param {string} filename - 匯出的預設檔名 (不含副檔名)
   * @param {string} [title] - (可選) 要加在圖片頂端的標題
   */
  const exportChart = (chartId, filename, title) => {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) {
      sandbox.publish("show-message", {
        text: `找不到圖表 '${chartId}'，無法匯出。`,
        type: "error",
      });
      return;
    }
    const offScreenCanvas = document.createElement("canvas");
    const originalCanvas = chartInstance.canvas;
    const ctx = offScreenCanvas.getContext("2d");
    const titleHeight = title ? 60 : 0;
    const padding = 20;
    offScreenCanvas.width = originalCanvas.width + padding * 2;
    offScreenCanvas.height = originalCanvas.height + titleHeight + padding * 2;
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    if (title) {
      ctx.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--text-primary")
          .trim() || "#000000";
      ctx.font = "bold 24px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, offScreenCanvas.width / 2, 40);
    }
    ctx.drawImage(originalCanvas, padding, titleHeight + padding);
    const imageURL = offScreenCanvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${filename}_${_getTimestamp()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 更新（或建立）比較圖表 - 風量比較
   * @param {object | null} analysisData - 包含圖表數據的物件，或 null 來隱藏圖表
   */
  const _updateAirVolumeComparisonChart = (analysisData) => {
    const container = document.getElementById("dashboard-rto-chart-container");
    const ctx = document.getElementById("dashboardRtoChart")?.getContext("2d");
    const dashboardContainer = document.getElementById("dashboard-container");
    const chartId = "dashboardRtoChart";
    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy();
      delete chartInstances[chartId];
    }
    const airVolumeData = analysisData?.airVolumeData;
    if (!airVolumeData || !ctx) {
      if (container) container.style.display = "none";
      if (!chartInstances["dashboardTempChart"] && dashboardContainer)
        dashboardContainer.style.display = "none";
      return;
    }
    if (dashboardContainer) dashboardContainer.style.display = "block";
    if (container) container.style.display = "block";
    chartInstances[chartId] = new Chart(ctx, {
      type: "bar",
      data: airVolumeData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: `風量比較 (${
              analysisData?.recordInfo?.recordA || "紀錄1"
            } vs ${analysisData?.recordInfo?.recordB || "紀錄2"})`,
            font: {
              size: 16,
            },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label +=
                    new Intl.NumberFormat("zh-TW", {
                      maximumFractionDigits: 1,
                    }).format(context.parsed.y) + " Nm³/分";
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "測量點",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "風量 (Nm³/分)",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
        },
      },
    });
  };

  /**
   * 更新（或建立）比較圖表 - 溫度比較
   * @param {object | null} analysisData - 包含圖表數據的物件，或 null 來隱藏圖表
   */
  const _updateTempComparisonChart = (analysisData) => {
    const container = document.getElementById("dashboard-temp-chart-container");
    const ctx = document.getElementById("dashboardTempChart")?.getContext("2d");
    const dashboardContainer = document.getElementById("dashboard-container");
    const chartId = "dashboardTempChart";
    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy();
      delete chartInstances[chartId];
    }
    const tempData = analysisData?.tempData;
    if (!tempData || !ctx) {
      if (container) container.style.display = "none";
      if (!chartInstances["dashboardRtoChart"] && dashboardContainer)
        dashboardContainer.style.display = "none";
      return;
    }
    if (dashboardContainer) dashboardContainer.style.display = "block";
    if (container) container.style.display = "block";

    let yMin = 0,
      yMax = 100; // 預設範圍
    const allDataValues = tempData.datasets
      .flatMap((ds) => ds.data)
      .filter((v) => v !== null && !isNaN(v));
    if (allDataValues.length > 0) {
      let dataMin = Math.min(...allDataValues);
      let dataMax = Math.max(...allDataValues);
      const paddingValue = (dataMax - dataMin) * 0.1 || 5;
      yMin = Math.floor(dataMin - paddingValue);
      yMax = Math.ceil(dataMax + paddingValue);
      if (yMin < 0 && dataMin >= 0) yMin = 0;
    }

    chartInstances[chartId] = new Chart(ctx, {
      type: "line",
      data: tempData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: true,
            text: `技術溫測實溫比較 (${
              analysisData?.recordInfo?.recordA || "紀錄1"
            } vs ${analysisData?.recordInfo?.recordB || "紀錄2"})`,
            font: {
              size: 16,
            },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label +=
                    new Intl.NumberFormat("zh-TW", {
                      maximumFractionDigits: 1,
                    }).format(context.parsed.y) + " ℃";
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "溫測點",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
          y: {
            beginAtZero: false,
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: "溫度 (℃)",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
        },
      },
    });
  };

  /**
   * 為圖表的圖例項目增加鍵盤可及性 (Accessibility)
   * @param {string} chartId - 目標圖表的 ID
   */
  const _addKeyboardNavigationToLegend = (chartId) => {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) return;
    const container = chartElement.closest(
      ".chart-container, .raw-data-chart-section"
    );
    if (!container) return;
    const legendContainer = container.querySelector(
      'div[aria-label="Chart legend"]'
    );
    if (!legendContainer) return;
    const legendItems = legendContainer.querySelectorAll("li");
    legendItems.forEach((item) => {
      if (item.getAttribute("tabindex") !== "0") {
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "button");
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            item.click();
          }
        });
      }
    });
  };

  /**
   * 更新主圖表 (技術溫測實溫分佈圖)
   * @param {object | null} source - 觸發更新的紀錄物件，或 null 來清空圖表
   */
  const _updateMainChart = (source) => {
    const chartId = "temperatureChart";
    const ctx = document.getElementById(chartId)?.getContext("2d");
    if (!ctx) return;
    if (chartInstances[chartId]) {
      Object.keys(datasetVisibility).forEach((label) => {
        const datasetIndex = chartInstances[chartId].data.datasets.findIndex(
          (ds) => ds.label === label
        );
        if (datasetIndex !== -1) {
          datasetVisibility[label] =
            chartInstances[chartId].isDatasetVisible(datasetIndex);
        }
      });
      chartInstances[chartId].destroy();
    }
    let recordToChart = null;
    if (source) {
      if (Array.isArray(source)) {
        for (let i = source.length - 1; i >= 0; i--) {
          if (source[i] && source[i].recordType === "evaluationTeam") {
            recordToChart = source[i];
            break;
          }
        }
      } else if (
        typeof source === "object" &&
        source.recordType === "evaluationTeam"
      ) {
        recordToChart = source;
      }
    }
    const chartLabels = techTempPoints.map((p) =>
      p.label.replace("技術溫測實溫_", "")
    );
    const datasets = [];
    const datasetLabels = ["1(右)", "2", "3(中)", "4", "5(左)"];
    const allDataValues = [];
    for (let i = 1; i <= 5; i++) {
      const label = datasetLabels[i - 1];
      const data = chartLabels.map((pointLabel) => {
        if (recordToChart) {
          const pointDefinition = techTempPoints.find(
            (p) => p.label.replace("技術溫測實溫_", "") === pointLabel
          );
          if (pointDefinition) {
            const recordPointKey = utils.getActualTempRecordKey(
              pointDefinition.id
            );
            const value = utils.getNestedValue(
              recordToChart,
              `actualTemps.${recordPointKey}.val${i}`
            );
            if (value !== null && !isNaN(value)) allDataValues.push(value);
            return value;
          }
        }
        return null;
      });
      const isHidden =
        datasetVisibility[label] === undefined
          ? true
          : !datasetVisibility[label];
      datasets.push({
        label,
        data,
        fill: false,
        tension: 0.1,
        order: 0,
        hidden: isHidden,
        borderColor: `hsl(${i * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${i * 60}, 70%, 50%, 0.2)`,
      });
    }
    const machineDisplayLabel = "機台顯示溫度";
    const machineDisplayData = chartLabels.map((label) => {
      if (recordToChart) {
        const pointDefinition = techTempPoints.find(
          (p) => p.label.replace("技術溫測實溫_", "") === label
        );
        if (pointDefinition) {
          const value = utils.getMachineDisplayTempForPoint(
            pointDefinition.id,
            recordToChart
          );
          if (value !== null && !isNaN(value)) {
            allDataValues.push(value);
          }
          return value;
        }
      }
      return null;
    });
    const isMachineHidden =
      datasetVisibility[machineDisplayLabel] === undefined
        ? false
        : !datasetVisibility[machineDisplayLabel];
    datasets.push({
      label: machineDisplayLabel,
      data: machineDisplayData,
      borderColor: "red",
      backgroundColor: "rgba(255, 0, 0, 0.2)",
      fill: false,
      borderWidth: 2.5,
      tension: 0.1,
      order: 1,
      hidden: isMachineHidden,
    });
    let yMin = 0,
      yMax = 10;
    const filteredDataValues = allDataValues.filter(
      (v) => v !== null && !isNaN(v)
    );
    if (filteredDataValues.length > 0) {
      let dataMin = Math.min(...filteredDataValues);
      let dataMax = Math.max(...filteredDataValues);
      const paddingValue = (dataMax - dataMin) * 0.1 || 5;
      yMin = Math.floor(dataMin - paddingValue);
      yMax = Math.ceil(dataMax + paddingValue);
      if (yMin < 0 && dataMin >= 0) yMin = 0;
    }
    chartInstances[chartId] = new Chart(ctx, {
      type: "line",
      data: { labels: chartLabels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            onClick: (e, legendItem, legend) => {
              const chart = legend.chart;
              chart.data.datasets.forEach((dataset, index) => {
                if (dataset.label === legendItem.text) {
                  chart.setDatasetVisibility(
                    index,
                    !chart.isDatasetVisible(index)
                  );
                }
              });
              chart.update();
              _addKeyboardNavigationToLegend(chartId); // 重新應用鍵盤導航
            },
          },
          title: {
            display: true,
            text: "技術溫測實溫分佈圖",
            font: {
              size: 16,
            },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label +=
                    new Intl.NumberFormat("zh-TW", {
                      maximumFractionDigits: 1,
                    }).format(context.parsed.y) + " ℃";
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "測量點",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
          y: {
            beginAtZero: false,
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: "溫度 (℃)",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-secondary")
                .trim(),
            },
          },
        },
      },
      plugins: [mainChartNoDataPlugin],
    });
    // 確保每次更新圖表後都重新應用鍵盤導航
    chartInstances[chartId].update();
    _addKeyboardNavigationToLegend(chartId);
  };

  /**
   * 【核心修正】更新（或清除）原始數據圖表的函式
   * @param {object | null} payload - 包含解析結果的物件 { results }，或 null 來清除圖表
   */
  const _updateRawDataChart = (payload) => {
    const chartId = "rawTemperatureChart";
    const ctx = document.getElementById(chartId)?.getContext("2d");
    if (!ctx) {
      return;
    }

    // 初始化圖表實例，如果它還不存在
    if (!chartInstances[chartId]) {
      chartInstances[chartId] = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              onClick: (e, legendItem, legend) => {
                const chart = legend.chart;
                chart.data.datasets.forEach((dataset, index) => {
                  if (dataset.label === legendItem.text) {
                    chart.setDatasetVisibility(
                      index,
                      !chart.isDatasetVisible(index)
                    );
                  }
                });
                chart.update();
                // 重新應用鍵盤導航
                _addKeyboardNavigationToLegend(chartId);
              },
            },
            title: {
              display: true,
              text: "原始溫測數據圖 (CSV 匯入)",
              font: {
                size: 16,
              },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    label +=
                      new Intl.NumberFormat("zh-TW", {
                        maximumFractionDigits: 1,
                      }).format(context.parsed.y) + " ℃";
                  }
                  return label;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "時間 (秒)",
                color: getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-primary")
                  .trim(),
              },
              ticks: {
                color: getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-secondary")
                  .trim(),
              },
            },
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: "溫度 (℃)",
                color: getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-primary")
                  .trim(),
              },
              ticks: {
                color: getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-secondary")
                  .trim(),
              },
            },
          },
        },
      });
    }

    const chart = chartInstances[chartId];
    const results = payload?.results;

    if (!results || !results.data || results.data.length === 0) {
      // 修正了 !results.data.length === 0 的邏輯
      // 在清除數據前保存可見性狀態
      if (chart.data.datasets.length > 0) {
        Object.keys(rawDatasetVisibility).forEach((label) => {
          const datasetIndex = chart.data.datasets.findIndex(
            (ds) => ds.label === label
          );
          if (datasetIndex !== -1) {
            rawDatasetVisibility[label] = chart.isDatasetVisible(datasetIndex);
          }
        });
      }
      chart.data.labels = [];
      chart.data.datasets = [];
      chart.update();
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    const dataRows = results.data;
    const headers = results.meta?.fields || []; // 從 results.meta.fields 獲取標頭
    const channels = ["CH01", "CH02", "CH03", "CH04", "CH05", "AVE"];
    const defaultColors = [
      "rgba(255, 99, 132, 1)", // Red
      "rgba(54, 162, 235, 1)", // Blue
      "rgba(255, 206, 86, 1)", // Yellow
      "rgba(75, 192, 192, 1)", // Green
      "rgba(153, 102, 255, 1)", // Purple
      "rgba(255, 159, 64, 1)", // Orange
    ];

    // 清除舊數據
    chart.data.datasets = [];

    // 重新創建數據集
    channels
      .filter((ch) => headers.includes(ch)) // 只包含 CSV 中存在的通道
      .forEach((channel, index) => {
        const data = dataRows.map((row) => {
          const value = row[channel];
          return value === null || value === undefined
            ? null
            : parseFloat(value);
        });

        // 重新應用保存的可見性狀態，如果沒有保存過則預設為可見
        const isHidden =
          rawDatasetVisibility[channel] === undefined
            ? false // 預設為可見
            : !rawDatasetVisibility[channel];

        chart.data.datasets.push({
          label: channel,
          data: data,
          borderColor: defaultColors[index % defaultColors.length],
          backgroundColor: defaultColors[index % defaultColors.length].replace(
            "1)",
            "0.2)"
          ), // 帶透明度的背景色
          fill: false,
          tension: 0.1,
          hidden: isHidden, // 應用保存的狀態
          pointRadius: 0, // 點半徑設為0，只顯示線條
        });
      });

    // 原始數據的時間標籤通常是索引乘以間隔 (例如每10秒一筆數據)
    // 假設每筆數據間隔 10 秒
    chart.data.labels = dataRows.map((_, index) => index * 10);

    chart.update();
    sandbox.publish("toggle-raw-chart-export-button", { disabled: false });
    _addKeyboardNavigationToLegend(chartId); // 確保每次更新圖表後都重新應用鍵盤導航
  };

  return {
    init: () => {
      console.log("ChartManager: 模組初始化完成");
      sandbox.subscribe("uiReadyForRawChart", _updateRawDataChart);
      sandbox.subscribe("raw-data-parsed-for-charting", _updateRawDataChart);
      sandbox.subscribe("form-cleared", () => _updateRawDataChart(null));
      sandbox.subscribe("data-updated", (data) => {
        _updateMainChart(data ? data.records : []);
        _updateAirVolumeComparisonChart(data ? data.comparisonAnalysis : null);
        _updateTempComparisonChart(data ? data.comparisonAnalysis : null);
      });
      sandbox.subscribe("request-chart-preview", (recordData) =>
        _updateMainChart(recordData)
      );
      sandbox.subscribe("plot-raw-data-chart", _updateRawDataChart); // 新增的訂閱

      _updateMainChart(null);
      _updateRawDataChart(null);
      _updateAirVolumeComparisonChart(null);
      _updateTempComparisonChart(null);
    },
    exportChart,
  };
};

export default ChartManager;

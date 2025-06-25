// /js/modules/chartManager.js (修正後)

import { techTempPoints } from "./config.js";
import * as utils from "./utils.js";

// 用於在主圖表無數據時顯示提示文字的客製化外掛
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
  // --- 模組私有屬性 ---
  const chartInstances = {}; // 使用一個物件來儲存所有圖表實例
  let datasetVisibility = {};
  let rawDatasetVisibility = {};

  /**
   * @description 取得目前時間戳記，用於檔名
   * @returns {string} 格式為 YYYYMMDD_HHMMSS 的字串
   */
  const _getTimestamp = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${MM}${DD}_${hh}${mm}${ss}`;
  };

  /**
   * @description (核心修正) 通用的圖表匯出函式
   * @param {string} chartId - 圖表 canvas 元素的 ID
   * @param {string} filename - 匯出的預設檔名 (不含副檔名)
   * @param {string} [title] - (可選) 要加在圖表頂端的標題
   */
  const exportChart = (chartId, filename, title) => {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) {
      sandbox.publish("show-message", {
        message: `找不到圖表 '${chartId}'，無法匯出。`,
        type: "error",
      });
      console.error(`[ChartManager] 找不到圖表實例: ${chartId}`);
      return;
    }

    // 建立一個離屏 canvas 來加上背景色和標題
    const offScreenCanvas = document.createElement("canvas");
    const originalCanvas = chartInstance.canvas;
    const ctx = offScreenCanvas.getContext("2d");

    const titleHeight = title ? 60 : 0; // 如果有標題，預留 60px 的高度
    const padding = 20;

    // 設定新 canvas 的尺寸
    offScreenCanvas.width = originalCanvas.width + padding * 2;
    offScreenCanvas.height = originalCanvas.height + titleHeight + padding * 2;

    // 1. 填滿背景色 (從 CSS 變數中取得)
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);

    // 2. 繪製標題 (如果有的話)
    if (title) {
      ctx.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--text-primary")
          .trim() || "#000000";
      ctx.font = "bold 24px 'Noto Sans TC', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, offScreenCanvas.width / 2, 40);
    }

    // 3. 將原始圖表繪製到新 canvas 上
    ctx.drawImage(originalCanvas, padding, titleHeight + padding);

    // 4. 產生圖片 URL 並觸發下載
    const imageURL = offScreenCanvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${filename}_${_getTimestamp()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    sandbox.publish("show-message", {
      text: `${filename}.png 已開始下載。`,
      type: "success",
    });
  };

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
          title: { display: true, text: "風量比較", font: { size: 18 } },
          subtitle: {
            display: true,
            text: [
              analysisData.recordInfo.recordA,
              analysisData.recordInfo.recordB,
            ],
            position: "bottom",
            align: "start",
          },
          legend: { position: "top" },
        },
        scales: {
          x: { title: { display: true, text: "風量測量位置" } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "風量 (Nm³/分)" },
          },
        },
      },
    });
  };

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

    chartInstances[chartId] = new Chart(ctx, {
      type: "line",
      data: tempData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "技術實測溫度比較 (5條溫測線)",
            font: { size: 18 },
          },
          subtitle: {
            display: true,
            text: [
              analysisData.recordInfo.recordA,
              analysisData.recordInfo.recordB,
            ],
            position: "bottom",
            align: "start",
          },
          legend: { position: "top" },
        },
        scales: {
          x: { title: { display: true, text: "溫測點位" } },
          y: {
            beginAtZero: false,
            title: { display: true, text: "溫度 (°C)" },
          },
        },
      },
    });
  };

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
      if (item.getAttribute("tabindex") === "0") return;
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        }
      });
    });
  };

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
        scales: {
          x: { title: { display: true, text: "點位名稱" } },
          y: {
            title: { display: true, text: "溫度 (°C)" },
            min: yMin,
            max: yMax,
          },
        },
        plugins: {
          title: { display: true, text: "技術溫測實溫分佈圖" },
          tooltip: {
            callbacks: {
              title: (context) => {
                const pointDefinition = techTempPoints.find(
                  (p) =>
                    p.label.replace("技術溫測實溫_", "") === context[0].label
                );
                return pointDefinition
                  ? pointDefinition.label
                  : context[0].label;
              },
              label: (context) => {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                return `${label}: ${
                  value !== null ? value.toFixed(2) + " °C" : "N/A"
                }`;
              },
            },
          },
          legend: {
            position: "top",
            onClick: (e, legendItem, legend) => {
              const index = legendItem.datasetIndex;
              const ci = legend.chart;
              if (ci.isDatasetVisible(index)) {
                ci.hide(index);
                datasetVisibility[legendItem.text] = false;
              } else {
                ci.show(index);
                datasetVisibility[legendItem.text] = true;
              }
            },
            onHover: (e) => {
              if (e.native.target) e.native.target.style.cursor = "pointer";
            },
            onLeave: (e) => {
              if (e.native.target) e.native.target.style.cursor = "default";
            },
          },
        },
        animation: {
          onComplete: () => _addKeyboardNavigationToLegend("temperatureChart"),
        },
      },
      plugins: [mainChartNoDataPlugin],
    });
  };

  const _plotRawData = (results) => {
    console.log("ChartManager: _plotRawData 收到數據:", results);
    sandbox.publish("clear-raw-chart-error");
    const chartId = "rawTemperatureChart";
    const canvasElement = document.getElementById(chartId);

    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy();
      delete chartInstances[chartId];
    }

    if (!canvasElement) {
      console.error("ChartManager: rawTemperatureChart 元素不存在。");
      sandbox.publish("show-raw-chart-error", "找不到圖表繪製區域。");
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }
    const ctx = canvasElement.getContext("2d");
    if (!ctx) {
      console.error("ChartManager: 無法獲取 2D 上下文。");
      sandbox.publish("show-raw-chart-error", "無法初始化圖表繪製引擎。");
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    // 動態設定 Canvas 尺寸
    const container = canvasElement.parentElement;
    if (container) {
      canvasElement.width = container.offsetWidth;
      canvasElement.height = container.offsetHeight;
    }

    if (!results || !results.data || results.data.length === 0) {
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      sandbox.publish("show-message", {
        text: "原始數據無效或為空，無法繪製圖表。",
        type: "info",
      });
      return;
    }

    if (results.errors && results.errors.length > 0) {
      const errorMessagesText = results.errors
        .map((err) => `(第 ${err.row + 1} 行) ${err.message}`)
        .join("; ");
      sandbox.publish(
        "show-raw-chart-error",
        "CSV 解析錯誤: " + errorMessagesText
      );
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    const dataRows = results.data;
    const headersFromPapaParse = results.fields || [];
    const channelColumnsToPlot = [
      "CH01",
      "CH02",
      "CH03",
      "CH04",
      "CH05",
      "AVE",
    ];
    const datasets = [];
    let foundChannelsCount = 0;
    const defaultColors = [
      "rgba(255, 159, 64, 1)",
      "rgba(54, 162, 235, 1)",
      "rgba(255, 206, 86, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(255, 99, 132, 1)",
    ];

    channelColumnsToPlot.forEach((columnKey, index) => {
      if (headersFromPapaParse.includes(columnKey)) {
        foundChannelsCount++;
        const channelData = dataRows.map((row) => {
          const value = row[columnKey];
          const numValue = parseFloat(value);
          return isNaN(numValue) ? null : numValue;
        });
        const isHidden =
          rawDatasetVisibility[columnKey] !== undefined
            ? !rawDatasetVisibility[columnKey]
            : false;
        datasets.push({
          label: columnKey,
          data: channelData,
          borderColor: defaultColors[index % defaultColors.length],
          hidden: isHidden,
          fill: false,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
        });
      }
    });

    if (foundChannelsCount === 0) {
      sandbox.publish(
        "show-raw-chart-error",
        `CSV 表頭中必須包含至少一個以下欄位: ${channelColumnsToPlot.join(", ")}`
      );
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    const elapsedSeconds = dataRows.map((_, index) => index * 10);
    const maxActualElapsedSeconds =
      elapsedSeconds.length > 0 ? elapsedSeconds[elapsedSeconds.length - 1] : 0;
    let xAxisMax = Math.ceil(maxActualElapsedSeconds / 100.0) * 100;
    if (xAxisMax < 100 && elapsedSeconds.length > 0) xAxisMax = 100;
    else if (elapsedSeconds.length === 0) xAxisMax = 0;

    const chartData = { labels: elapsedSeconds, datasets: datasets };
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: xAxisMax,
          title: { display: true, text: "時間 (分鐘)", font: { size: 14 } },
          ticks: {
            stepSize: 100,
            callback: (value) =>
              value % 100 === 0 ? (value / 60).toFixed(1) : null,
            autoSkip: false,
            maxRotation: 45,
            minRotation: 30,
          },
        },
        y: {
          title: { display: true, text: "溫度 (°C)", font: { size: 14 } },
          grace: "5%",
          beginAtZero: false,
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: { font: { size: 12 } },
          onClick: (e, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            ci.isDatasetVisible(index) ? ci.hide(index) : ci.show(index);
            rawDatasetVisibility[legendItem.text] = ci.isDatasetVisible(index);
          },
          onHover: (e) => (e.native.target.style.cursor = "pointer"),
          onLeave: (e) => (e.native.target.style.cursor = "default"),
        },
        title: {
          display: true,
          text: "原始溫度數據圖 (CSV 匯入)",
          font: { size: 18 },
          padding: { top: 10, bottom: 20 },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: (tooltipItems) => {
              if (tooltipItems.length > 0) {
                const seconds = tooltipItems[0].parsed.x;
                return `時間: ${(seconds / 60).toFixed(1)} 分鐘`;
              }
              return "";
            },
            label: (tooltipItem) => {
              let label = tooltipItem.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (tooltipItem.parsed.y !== null) {
                label += tooltipItem.parsed.y.toFixed(2) + " °C";
              }
              return label;
            },
          },
        },
      },
      animation: { onComplete: () => _addKeyboardNavigationToLegend(chartId) },
    };

    try {
      chartInstances[chartId] = new Chart(ctx, {
        type: "line",
        data: chartData,
        options: chartOptions,
      });
      sandbox.publish("toggle-raw-chart-export-button", { disabled: false });
      sandbox.publish("show-message", {
        text: "原始數據圖表已成功繪製。",
        type: "success",
      });
    } catch (chartError) {
      console.error("ChartManager: 繪製原始數據圖表時發生錯誤:", chartError);
      sandbox.publish(
        "show-raw-chart-error",
        "繪製圖表時發生錯誤: " + chartError.message
      );
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
    }

    sandbox.publish("raw-csv-data-parsed", results);
  };

  return {
    init: () => {
      console.log("ChartManager: 模組初始化完成");

      sandbox.subscribe("raw-data-parsed-for-charting", (data) =>
        _plotRawData(data)
      );
      sandbox.subscribe("uiReadyForRawChart", (data) => _plotRawData(data)); // 監聽新事件
      sandbox.subscribe("data-updated", (data) => {
        _updateMainChart(data ? data.records : []);
        const comparisonData = data ? data.comparisonAnalysis : null;
        _updateAirVolumeComparisonChart(comparisonData);
        _updateTempComparisonChart(comparisonData);
      });
      sandbox.subscribe("load-data-to-form", (record) =>
        _updateMainChart(record)
      );
      sandbox.subscribe("form-cleared", () => {
        _updateMainChart(null);
        _plotRawData(null);
      });
      sandbox.subscribe("request-chart-preview", (recordDataFromEvent) => {
        _updateMainChart(recordDataFromEvent);
      });

      _updateMainChart([]);
      _updateAirVolumeComparisonChart(null);
      _updateTempComparisonChart(null);
    },
    // 將匯出函式暴露給 eventHandler 使用
    exportChart,
  };
};

export default ChartManager;

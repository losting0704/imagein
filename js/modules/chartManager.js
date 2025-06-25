// /js/modules/chartManager.js (最終修正版本)

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
  let temperatureChartInstance = null;
  let rawTemperatureChartInstance = null;
  let airVolumeCompareChartInstance = null;
  let tempCompareChartInstance = null;
  let datasetVisibility = {};
  let rawDatasetVisibility = {};

  const _getTimestamp = () => {
    const now = new Date();
    constigliano = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${MM}${DD}_${hh}${mm}${ss}`;
  };

  const _updateAirVolumeComparisonChart = (analysisData) => {
    const container = document.getElementById("dashboard-rto-chart-container");
    const ctx = document.getElementById("dashboardRtoChart")?.getContext("2d");
    const dashboardContainer = document.getElementById("dashboard-container");

    if (airVolumeCompareChartInstance) {
      airVolumeCompareChartInstance.destroy();
      airVolumeCompareChartInstance = null;
    }

    const airVolumeData = analysisData?.airVolumeData;
    if (!airVolumeData || !ctx) {
      if (container) container.style.display = "none";
      if (!tempCompareChartInstance && dashboardContainer)
        dashboardContainer.style.display = "none";
      return;
    }
    if (dashboardContainer) dashboardContainer.style.display = "block";
    if (container) container.style.display = "block";

    airVolumeCompareChartInstance = new Chart(ctx, {
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

    if (tempCompareChartInstance) {
      tempCompareChartInstance.destroy();
      tempCompareChartInstance = null;
    }

    const tempData = analysisData?.tempData;
    if (!tempData || !ctx) {
      if (container) container.style.display = "none";
      if (!airVolumeCompareChartInstance && dashboardContainer)
        dashboardContainer.style.display = "none";
      return;
    }
    if (dashboardContainer) dashboardContainer.style.display = "block";
    if (container) container.style.display = "block";

    tempCompareChartInstance = new Chart(ctx, {
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
    const ctx = document.getElementById("temperatureChart").getContext("2d");
    if (temperatureChartInstance) {
      Object.keys(datasetVisibility).forEach((label) => {
        const datasetIndex = temperatureChartInstance.data.datasets.findIndex(
          (ds) => ds.label === label
        );
        if (datasetIndex !== -1) {
          datasetVisibility[label] =
            temperatureChartInstance.isDatasetVisible(datasetIndex);
        }
      });
      temperatureChartInstance.destroy();
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
    temperatureChartInstance = new Chart(ctx, {
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

    // --- 關鍵修正：確保在獲取 Canvas 之前，元素確實存在於 DOM 中 ---
    let canvasElement = document.getElementById("rawTemperatureChart");
    let ctx = null;

    if (!canvasElement) {
        console.error("ChartManager: 警告！rawTemperatureChart 元素不存在於 DOM 中。等待它出現。");
        // 如果元素不存在，設定一個延遲重試機制
        // 這裡可以使用一個更精細的策略，例如 MutationObserver 或更長的延遲
        setTimeout(() => {
            canvasElement = document.getElementById("rawTemperatureChart");
            if (canvasElement) {
                ctx = canvasElement.getContext("2d");
                if (ctx) {
                    console.log("ChartManager: 延遲後成功獲取到 rawTemperatureChart Canvas.");
                    // 新增偵錯日誌，顯示 Canvas 及其容器尺寸
                    const container = canvasElement.parentElement;
                    console.log("ChartManager: 延遲後 Canvas 元素尺寸:", canvasElement.width, "x", canvasElement.height);
                    console.log("ChartManager: 延遲後容器 (.raw-data-chart-section) 尺寸:", container?.offsetWidth, "x", container?.offsetHeight);
                    _drawRawChart(results, ctx, canvasElement); // 傳遞 canvasElement
                } else {
                    console.error("ChartManager: 延遲後無法獲取 rawTemperatureChart 的 2D 上下文。");
                    sandbox.publish("show-raw-chart-error", "無法找到圖表繪製區域。");
                    sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
                }
            } else {
                console.error("ChartManager: 延遲後 rawTemperatureChart 元素仍然不存在。放棄繪製。");
                sandbox.publish("show-raw-chart-error", "無法找到圖表繪製區域。");
                sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
            }
        }, 100); // 延遲 100 毫秒後重試

        sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
        sandbox.publish("show-message", { text: "正在嘗試載入圖表，請稍候...", type: "info" });
        return; // 立即返回，因為我們正在重試
    } else {
        // 如果元素一開始就存在，直接獲取上下文
        ctx = canvasElement.getContext("2d");
        if (!ctx) {
            console.error("ChartManager: 無法獲取 rawTemperatureChart 的 2D 上下文。圖表可能不存在或已損壞。");
            sandbox.publish("show-raw-chart-error", "無法找到圖表繪製區域。");
            sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
            return;
        }
        // 新增偵錯日誌，顯示 Canvas 及其容器尺寸 (如果第一次就獲取到)
        const container = canvasElement.parentElement;
        console.log("ChartManager: 初始 Canvas 元素尺寸:", canvasElement.width, "x", canvasElement.height);
        console.log("ChartManager: 初始容器 (.raw-data-chart-section) 尺寸:", container?.offsetWidth, "x", container?.offsetHeight);
    }

    // 將核心繪製邏輯移到一個單獨的函式中
    _drawRawChart(results, ctx, canvasElement); // 傳遞 canvasElement
  };

  // 將原始數據的繪製邏輯封裝在一個獨立的函式中
  const _drawRawChart = (results, ctx, canvasElement) => { // 接收 canvasElement
    // 檢查 ctx 是否有效，再次防止在極端情況下出錯
    if (!ctx || !canvasElement) { // 同時檢查 canvasElement
        console.error("ChartManager: _drawRawChart 接收到無效的上下文或 Canvas 元素。無法繪製。");
        sandbox.publish("show-raw-chart-error", "圖表繪製上下文無效。");
        sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
        return;
    }

    // --- 新增：根據容器尺寸設定 Canvas 元素的繪圖表面尺寸 ---
    const container = canvasElement.parentElement;
    if (container) {
        // 設定 Canvas 的繪圖表面尺寸為容器的實際渲染尺寸
        canvasElement.width = container.offsetWidth;
        canvasElement.height = container.offsetHeight;
        console.log("ChartManager: 動態設定 Canvas 繪圖尺寸為:", canvasElement.width, "x", canvasElement.height);
    } else {
        // 如果沒有父容器，則使用預設或 fallback 尺寸
        console.warn("ChartManager: 無法找到 rawTemperatureChart 的父容器，將使用 Canvas 預設尺寸。");
        // 可以考慮設定一個固定的 fallback 尺寸
        canvasElement.width = 792; // 預設的寬度
        canvasElement.height = 450; // 預設的高度
    }
    // -------------------------------------------------------------


    if (!results || !results.data || results.data.length === 0) {
        if (rawTemperatureChartInstance) {
            rawTemperatureChartInstance.destroy();
            rawTemperatureChartInstance = null;
        }
        sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
        sandbox.publish("show-message", { text: "原始數據無效或為空，無法繪製圖表。", type: "info" });
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
        if (rawTemperatureChartInstance) {
            rawTemperatureChartInstance.destroy();
            rawTemperatureChartInstance = null;
        }
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
      "rgba(255, 159, 64, 1)", // Orange
      "rgba(54, 162, 235, 1)", // Blue
      "rgba(255, 206, 86, 1)", // Yellow
      "rgba(75, 192, 192, 1)", // Green
      "rgba(153, 102, 255, 1)", // Purple
      "rgba(255, 99, 132, 1)", // Red
    ];

    channelColumnsToPlot.forEach((columnKey, index) => {
      if (headersFromPapaParse.includes(columnKey)) {
        foundChannelsCount++;
        // 確保數據是數字類型，如果不是則轉換或設定為 null
        const channelData = dataRows.map((row) => {
          const value = row[columnKey];
          // 嘗試將值轉換為數字，如果失敗則設為 null
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
      if (rawTemperatureChartInstance) {
          rawTemperatureChartInstance.destroy();
          rawTemperatureChartInstance = null;
      }
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    const elapsedSeconds = dataRows.map((_, index) => index * 10);
    const maxActualElapsedSeconds =
      elapsedSeconds.length > 0 ? elapsedSeconds[elapsedSeconds.length - 1] : 0;
    let xAxisMax = Math.ceil(maxActualElapsedSeconds / 100.0) * 100;
    if (xAxisMax < 100 && elapsedSeconds.length > 0) {
        xAxisMax = 100;
    } else if (elapsedSeconds.length === 0) {
        xAxisMax = 0;
    }
    
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
              title: function(tooltipItems) {
                  if (tooltipItems.length > 0) {
                      const seconds = tooltipItems[0].parsed.x;
                      return `時間: ${(seconds / 60).toFixed(1)} 分鐘`;
                  }
                  return '';
              },
              label: function(tooltipItem) {
                  let label = tooltipItem.dataset.label || '';
                  if (label) { label += ': '; }
                  if (tooltipItem.parsed.y !== null) {
                      label += tooltipItem.parsed.y.toFixed(2) + ' °C';
                  }
                  return label;
              }
          }
        },
      },
      animation: {
        onComplete: () => _addKeyboardNavigationToLegend("rawTemperatureChart"),
      },
    };

    if (rawTemperatureChartInstance) {
      rawTemperatureChartInstance.destroy();
    }
    try {
        rawTemperatureChartInstance = new Chart(ctx, {
            type: "line",
            data: chartData,
            options: chartOptions,
        });
        // 成功繪製後啟用匯出按鈕
        sandbox.publish("toggle-raw-chart-export-button", { disabled: false });
        sandbox.publish("show-message", { text: "原始數據圖表已成功繪製。", type: "success" });
    } catch (chartError) {
        console.error("ChartManager: 繪製原始數據圖表時發生錯誤:", chartError);
        sandbox.publish("show-raw-chart-error", "繪製圖表時發生錯誤: " + chartError.message);
        sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
        // 確保即使繪製失敗，舊圖表也會被銷毀
        if (rawTemperatureChartInstance) {
            rawTemperatureChartInstance.destroy();
            rawTemperatureChartInstance = null;
        }
    }
    
    sandbox.publish("raw-csv-data-parsed", results);
  };


  const _exportMainChart = () => {
    if (!temperatureChartInstance) {
      sandbox.publish("show-message", {
        text: "目前沒有主圖表可以匯出。",
        type: "info",
      });
      return;
    }
    const chartCanvas = document.getElementById("temperatureChart");
    const ctx = chartCanvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    const image = chartCanvas.toDataURL("image/png", 1.0);
    ctx.restore();
    const link = document.createElement("a");
    link.href = image;
    link.download = `技術溫測圖_${_getTimestamp()}.png`;
    link.click();
    sandbox.publish("show-message", {
      text: "主圖表已成功匯出為 PNG！",
      type: "success",
    });
  };

  const _exportRawChart = () => {
    if (!rawTemperatureChartInstance) {
      sandbox.publish("show-raw-chart-error", "沒有原始數據圖表可供匯出。");
      return;
    }
    const chartCanvas = document.getElementById("rawTemperatureChart");
    const ctx = chartCanvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    const image = chartCanvas.toDataURL("image/png", 1.0);
    ctx.restore();
    const link = document.createElement("a");
    link.href = image;
    link.download = `原始數據圖_${_getTimestamp()}.png`;
    link.click();
    sandbox.publish("show-message", {
      text: "原始數據圖表已成功匯出為 PNG！",
      type: "success",
    });
  };

  const _exportAirVolumeCompareChart = () => {
    if (!airVolumeCompareChartInstance) {
      sandbox.publish("show-message", {
        text: "沒有風量比較圖可供匯出。",
        type: "info",
      });
      return;
    }
    const chartCanvas = document.getElementById("dashboardRtoChart");
    const ctx = chartCanvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    const image = chartCanvas.toDataURL("image/png", 1.0);
    ctx.restore();

    const link = document.createElement("a");
    link.href = image;
    link.download = `風量比較圖_${_getTimestamp()}.png`;
    link.click();
  };

  const _exportTempCompareChart = () => {
    if (!tempCompareChartInstance) {
      sandbox.publish("show-message", {
        text: "沒有溫度比較圖可供匯出。",
        type: "info",
      });
      return;
    }
    const chartCanvas = document.getElementById("dashboardTempChart");
    const ctx = chartCanvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-container")
        .trim() || "#FFFFFF";
    ctx.fillRect(0, 0, chartCanvas.width, canvas.height);
    const image = chartCanvas.toDataURL("image/png", 1.0);
    ctx.restore();

    const link = document.createElement("a");
    link.href = image;
    link.download = `溫度比較圖_${_getTimestamp()}.png`;
    link.click();
  };

  return {
    init: () => {
      console.log("ChartManager: 模組初始化完成");

      sandbox.subscribe("raw-data-parsed-for-charting", (data) => _plotRawData(data));
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
      sandbox.subscribe("plot-raw-data-chart", (data) => _plotRawData(data));
      sandbox.subscribe("request-export-main-chart", _exportMainChart);
      sandbox.subscribe("request-export-raw-chart", _exportRawChart);
      sandbox.subscribe("request-chart-preview", (recordDataFromEvent) => {
        _updateMainChart(recordDataFromEvent);
      });
      sandbox.subscribe(
        "request-export-air-volume-chart",
        _exportAirVolumeCompareChart
      );
      sandbox.subscribe(
        "request-export-temp-compare-chart",
        (data) => _exportTempCompareChart(data) // 修正這裡的綁定
      );

      _updateMainChart([]);
      _updateAirVolumeComparisonChart(null);
      _updateTempComparisonChart(null);
    },
  };
};

export default ChartManager;

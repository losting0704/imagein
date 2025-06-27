// /js/modules/chartManager.js (動態標題版)

import { techTempPoints } from "./config.js";
import * as utils from "./utils.js";

if (typeof ChartDataLabels !== "undefined") {
  Chart.register(ChartDataLabels);
}

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
  const chartInstances = {};
  let datasetVisibility = {};
  let rawDatasetVisibility = {};
  let isDataLabelsVisible = false;
  let isAirVolumeDataLabelsVisible = false;

  const _getTimestamp = () => {
    const now = new Date();
    const inplaceYear = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${inplaceYear}${MM}${DD}_${hh}${mm}${ss}`;
  };

  const exportChart = (chartId, filename, title, includeLegend = true) => {
    const chartInstance = chartInstances[chartId];
    if (!chartInstance) {
      sandbox.publish("show-message", {
        text: `找不到圖表 '${chartId}'，無法匯出。`,
        type: "error",
      });
      return;
    }

    const originalLegendDisplay = chartInstance.options.plugins.legend.display;
    try {
      chartInstance.options.plugins.legend.display = includeLegend;
      chartInstance.update();

      const offScreenCanvas = document.createElement("canvas");
      const originalCanvas = chartInstance.canvas;
      const ctx = offScreenCanvas.getContext("2d");
      const titleHeight = title ? 60 : 0;
      const padding = 20;
      offScreenCanvas.width = originalCanvas.width + padding * 2;
      offScreenCanvas.height =
        originalCanvas.height + titleHeight + padding * 2;
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
    } finally {
      chartInstance.options.plugins.legend.display = true;
      chartInstance.update();
    }
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
          legend: {
            position: "top",
            display: true,
          },
          title: {
            display: true,
            text: `風量比較 (${
              analysisData?.recordInfo?.recordA || "紀錄1"
            } vs ${analysisData?.recordInfo?.recordB || "紀錄2"})`,
            font: { size: 16 },
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
          datalabels: {
            display: isAirVolumeDataLabelsVisible,
            anchor: "end",
            align: "top",
            formatter: (value) => {
              return value.toFixed(1);
            },
            font: {
              weight: "bold",
            },
            color: "#444",
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
      yMax = 100;
    const allDataValues = tempData.datasets
      .flatMap((ds) => ds.data)
      .filter((v) => v !== null && isFinite(v));
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
            display: true,
          },
          title: {
            display: true,
            text: `技術溫測實溫比較 (${
              analysisData?.recordInfo?.recordA || "紀錄1"
            } vs ${analysisData?.recordInfo?.recordB || "紀錄2"})`,
            font: { size: 16 },
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

    // ▼▼▼【新增】動態設定圖表標題 ▼▼▼
    let chartTitle = "技術溫測實溫分佈圖";
    if (recordToChart) {
      if (recordToChart.dateTime) {
        const formattedTime = recordToChart.dateTime.replace("T", " ");
        chartTitle = `技術溫測實溫分佈圖 (紀錄: ${formattedTime})`;
      } else {
        chartTitle = "技術溫測實溫分佈圖 (目前輸入預覽)";
      }
    }
    // ▲▲▲【新增】動態設定圖表標題 ▲▲▲

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
            if (typeof value === "number") allDataValues.push(value);
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
          if (typeof value === "number") {
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

    let yMin = 0;
    let yMax = 10;
    const filteredDataValues = allDataValues.filter((v) => isFinite(v));
    if (filteredDataValues.length > 0) {
      let dataMin = Math.min(...filteredDataValues);
      let dataMax = Math.max(...filteredDataValues);
      const paddingValue = (dataMax - dataMin) * 0.1 || 5;
      yMin = Math.floor(dataMin - paddingValue);
      yMax = Math.ceil(dataMax + paddingValue);
      if (yMin < 0 && dataMin >= 0) {
        yMin = 0;
      }
    }

    try {
      chartInstances[chartId] = new Chart(ctx, {
        type: "line",
        data: { labels: chartLabels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              display: true,
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
                _addKeyboardNavigationToLegend(chartId);
              },
            },
            title: {
              display: true,
              // ▼▼▼【修改】使用動態標題 ▼▼▼
              text: chartTitle,
              font: { size: 16 },
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
            datalabels: {
              display: isDataLabelsVisible,
              align: "top",
              offset: 6,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              borderRadius: 4,
              color: "white",
              font: {
                size: 10,
                weight: "bold",
              },
              padding: 4,
              formatter: (value, context) => {
                if (typeof value === "number") {
                  if (context.dataset.label === "機台顯示溫度") {
                    return `💻${value.toFixed(1)}`;
                  }
                  return value.toFixed(1);
                }
                return null;
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
      chartInstances[chartId].update();
      _addKeyboardNavigationToLegend(chartId);
    } catch (err) {
      console.error("★★★ 建立圖表時發生致命錯誤! ★★★", err);
      console.error(`傳入的Y軸範圍是: min=${yMin}, max=${yMax}`);
    }
  };

  const _updateRawDataChart = (payload) => {
    const chartId = "rawTemperatureChart";
    const ctx = document.getElementById(chartId)?.getContext("2d");
    if (!ctx) {
      return;
    }

    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy();
    }

    const results = payload?.results;
    // ▼▼▼【新增】從 payload 中取得紀錄資訊 ▼▼▼
    const recordInfo = payload?.recordInfo;

    if (!results || !results.data || !results.data.length === 0) {
      chartInstances[chartId] = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "原始溫測數據圖 (CSV 匯入)" },
            legend: { display: false },
          },
        },
      });
      sandbox.publish("toggle-raw-chart-export-button", { disabled: true });
      return;
    }

    // ▼▼▼【新增】動態設定圖表標題 ▼▼▼
    let chartTitle = "原始溫測數據圖 (CSV 匯入)";
    if (recordInfo && recordInfo.dateTime) {
      const formattedTime = recordInfo.dateTime.replace("T", " ");
      chartTitle = `原始溫測數據圖 (紀錄: ${formattedTime})`;
    }
    // ▲▲▲【新增】動態設定圖表標題 ▲▲▲

    const dataRows = results.data;
    const headers = results.meta?.fields || [];
    const channels = ["CH01", "CH02", "CH03", "CH04", "CH05", "AVE"];
    const defaultColors = [
      "rgba(255, 99, 132, 1)",
      "rgba(54, 162, 235, 1)",
      "rgba(255, 206, 86, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(255, 159, 64, 1)",
    ];

    const datasets = channels
      .filter((ch) => headers.includes(ch))
      .map((channel, index) => {
        const data = dataRows.map((row, i) => ({
          x: i * 10,
          y:
            row[channel] !== null && row[channel] !== undefined
              ? parseFloat(row[channel])
              : null,
        }));

        const isHidden =
          rawDatasetVisibility[channel] === undefined
            ? false
            : !rawDatasetVisibility[channel];

        return {
          label: channel,
          data: data,
          borderColor: defaultColors[index % defaultColors.length],
          backgroundColor: defaultColors[index % defaultColors.length].replace(
            "1)",
            "0.2)"
          ),
          fill: false,
          tension: 0.1,
          hidden: isHidden,
          pointRadius: 0,
        };
      });

    const elapsedSeconds = dataRows.map((_, index) => index * 10);
    const maxSeconds =
      elapsedSeconds.length > 0 ? elapsedSeconds[elapsedSeconds.length - 1] : 0;
    const xAxisMax = Math.ceil(maxSeconds / 100) * 100;

    chartInstances[chartId] = new Chart(ctx, {
      type: "line",
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            display: true,
            onClick: (e, legendItem, legend) => {
              const chart = legend.chart;
              legend.legendItems.forEach((item) => {
                rawDatasetVisibility[item.text] = chart.isDatasetVisible(
                  item.datasetIndex
                );
              });
              rawDatasetVisibility[legendItem.text] =
                !rawDatasetVisibility[legendItem.text];

              chart.setDatasetVisibility(
                legendItem.datasetIndex,
                !chart.isDatasetVisible(legendItem.datasetIndex)
              );
              chart.update();
              _addKeyboardNavigationToLegend(chartId);
            },
          },
          title: {
            display: true,
            // ▼▼▼【修改】使用動態標題 ▼▼▼
            text: chartTitle,
            font: { size: 16 },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue("--text-primary")
              .trim(),
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: function (tooltipItems) {
                if (tooltipItems.length > 0) {
                  const seconds = tooltipItems[0].parsed.x;
                  return `時間: ${(seconds / 60).toFixed(
                    2
                  )} 分鐘 (${seconds}秒)`;
                }
                return "";
              },
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label +=
                    new Intl.NumberFormat("zh-TW", {
                      maximumFractionDigits: 2,
                    }).format(context.parsed.y) + " ℃";
                }
                return label;
              },
            },
          },
          datalabels: {
            display: false,
          },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: xAxisMax > 0 ? xAxisMax : 100,
            title: {
              display: true,
              text: "時間 (分鐘)",
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--text-primary")
                .trim(),
            },
            ticks: {
              stepSize: 100,
              callback: function (value, index, ticks) {
                return (value / 60).toFixed(1);
              },
              autoSkip: true,
              maxRotation: 45,
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
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
      },
    });

    sandbox.publish("toggle-raw-chart-export-button", { disabled: false });
    _addKeyboardNavigationToLegend(chartId);
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
      sandbox.subscribe("plot-raw-data-chart", _updateRawDataChart);

      sandbox.subscribe("request-toggle-datalabels", ({ chartId, visible }) => {
        const chart = chartInstances[chartId];
        if (chart) {
          if (chartId === "temperatureChart") {
            isDataLabelsVisible = visible;
          } else if (chartId === "dashboardRtoChart") {
            isAirVolumeDataLabelsVisible = visible;
          }
          chart.options.plugins.datalabels.display = visible;
          chart.update();
        }
      });

      _updateMainChart(null);
      _updateRawDataChart(null);
      _updateAirVolumeComparisonChart(null);
      _updateTempComparisonChart(null);
    },
    exportChart,
  };
};
export default ChartManager;

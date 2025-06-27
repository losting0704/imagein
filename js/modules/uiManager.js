// /js/modules/uiManager.js (作用域修正版)

import {
  generateFieldConfigurations,
  getAirVolumeMeasurementsByModel,
  techTempPoints,
  hmiLayouts,
  hmiFieldsByModel,
  damperLayoutsByModel,
} from "./config.js";
import * as utils from "./utils.js";

const UIManager = (sandbox) => {
  // --- 模組私有變數 ---
  const dom = {};
  let currentDryerModel = "vt8";
  let fieldConfigurations = [];
  let selectedToCompareIds = [];
  let editingRecordId = null;
  let tempRawData = null;

  // --- 模組私有函式 ---

  const getCurrentRecordType = () => {
    const checkedRadio = document.querySelector(
      'input[name="recordType"]:checked'
    );
    return checkedRadio ? checkedRadio.value : "evaluationTeam";
  };

  const getCurrentDryerModel = () => {
    return dom.dryerModelSelect?.value.toLowerCase() || currentDryerModel;
  };

  const cacheDom = () => {
    const D = (id) => document.getElementById(id);
    Object.assign(dom, {
      allInputFieldsContainer: document.querySelector(".container"),
      messageBox: D("messageBox"),
      loadingOverlay: D("loadingOverlay"),
      setNowBtn: D("setNowBtn"),
      radioEvaluationTeam: D("radioEvaluationTeam"),
      radioConditionSetting: D("radioConditionSetting"),
      radioButtons: document.querySelectorAll('input[name="recordType"]'),
      dateTimeInput: D("dateTime"),
      remarkInput: D("remark"),
      dryerModelSelect: D("dryerModelSelect"),
      saveDataBtn: D("saveDataBtn"),
      updateDataBtn: D("updateDataBtn"),
      cancelEditBtn: D("cancelEditBtn"),
      clearDataBtn: D("clearDataBtn"),
      importCsvBtn: D("importCsvBtn"),
      exportCsvBtn: D("exportCsvBtn"),
      exportChartBtn: D("exportChartBtn"),
      exportRawChartButton: D("exportRawChartButton"),
      exportAirVolumeChartBtn: D("exportAirVolumeChartBtn"),
      exportTempCompareChartBtn: D("exportTempCompareChartBtn"),
      viewDamperLayoutBtn: D("viewDamperLayoutBtn"),
      airAndExternalGrid: D("evaluationTeam_airAndExternal_grid"),
      airVolumeGrid: D("airVolumeGrid"),
      techTempGrid: D("techTempGrid"),
      damperOpeningGrid: D("damperOpeningGrid"),
      hmiContainer: D("hmi-sections-container"),
      dataTableBody: D("dataTableBody"),
      dynamicTableHeadersRow: D("dynamicTableHeaders"),
      emptyStateMessage: D("emptyStateMessage"),
      paginationContainer: D("paginationContainer"),
      filterStartDate: D("filterStartDate"),
      filterEndDate: D("filterEndDate"),
      filterFieldSelect: D("filterFieldSelect"),
      filterValueMin: D("filterValueMin"),
      filterValueMax: D("filterValueMax"),
      filterRtoStatus: D("filterRtoStatus"),
      filterHeatingStatus: D("filterHeatingStatus"),
      filterRemarkKeyword: D("filterRemarkKeyword"),
      applyFiltersBtn: D("applyFiltersBtn"),
      resetFiltersBtn: D("resetFiltersBtn"),
      confirmModalOverlay: D("confirmModalOverlay"),
      confirmModalMessage: D("confirmModalMessage"),
      confirmYesBtn: D("confirmYesBtn"),
      confirmNoBtn: D("confirmNoBtn"),
      imageModalOverlay: D("imageModalOverlay"),
      imageModalClose: document.querySelector(".image-modal-close"),
      modalImage: D("modalImage"),
      modalCaption: D("modalCaption"),
      csvFileInput: D("csvFileInput"),
      rawCsvTextArea: D("rawCsvTextArea"),
      generateRawChartFromTextBtn: D("generateRawChartFromTextBtn"),
      rawChartErrorMessages: D("rawChartErrorMessages"),
      rawTemperatureChartContainer: D("rawTemperatureChartContainer"),
      historyCsvInput: D("historyCsvInputForMasterCreation"),
      masterJsonInput: D("masterJsonInputForLoad"),
      dailyJsonInput: D("dailyJsonInputForMerge"),
      rawDataStatusContainer: D("rawDataStatusContainer"),
      loadMasterDbBtn: D("loadMasterDbBtn"),
      createMasterDbBtn: D("createMasterDbBtn"),
      mergeToMasterBtn: D("mergeToMasterBtn"),
      exportForPowerBIBtn: D("exportForPowerBIBtn"),
      exportDailyJsonBtn: D("exportDailyJsonBtn"),
      toggleDataLabelsBtn: D("toggleDataLabelsBtn"),
    });
  };

  const updateRawDataStatus = (hasData) => {
    if (dom.rawDataStatusContainer) {
      if (hasData) {
        dom.rawDataStatusContainer.innerHTML = `
                  <span>✔️ 已貼上原始數據 (將隨下次儲存一同寫入)</span>
                  <button class="clear-raw-data-btn" title="清除已貼上的原始數據">清除</button>
              `;
        dom.rawDataStatusContainer.classList.add("visible");
      } else {
        dom.rawDataStatusContainer.innerHTML = "";
        dom.rawDataStatusContainer.classList.remove("visible");
        if (dom.rawCsvTextArea) dom.rawCsvTextArea.value = "";
      }
    }
  };

  const setDateTimeToNow = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - timezoneOffset);
    const formattedDateTime = localTime.toISOString().slice(0, 16);
    if (dom.dateTimeInput) {
      dom.dateTimeInput.value = formattedDateTime;
    }
  };

  const updateAirVolumeRow = (measureId) => {
    const measure = getAirVolumeMeasurementsByModel(currentDryerModel).find(
      (m) => m.id === measureId
    );
    if (!measure) return;
    const speedInput = document.getElementById(`air_speed_${measureId}`);
    const tempInput = document.getElementById(`air_temp_${measureId}`);
    const volumeOutput = document.getElementById(`air_volume_${measureId}`);
    if (
      measure.status === "normal" &&
      speedInput &&
      tempInput &&
      volumeOutput
    ) {
      const volume = utils.calculateAirVolume(
        tempInput.value,
        speedInput.value,
        measure.area
      );
      volumeOutput.textContent = isNaN(volume) ? "0.0" : volume.toFixed(1);
    }
  };

  const updateTechTempRow = (pointId) => {
    const inputs = Array.from({ length: 5 }, (_, i) =>
      document.getElementById(`techTemp_${pointId}_${i + 1}`)
    );
    const diffOutput = document.getElementById(`techTemp_${pointId}_diff`);
    if (inputs.every(Boolean) && diffOutput) {
      const validValues = inputs
        .map((input) => parseFloat(input.value))
        .filter((val) => !isNaN(val));
      if (validValues.length > 0) {
        diffOutput.value = (
          Math.max(...validValues) - Math.min(...validValues)
        ).toFixed(2);
      } else {
        diffOutput.value = "0.00";
      }
    }
  };

  const renderAirAndExternalInputs = (dryerModel) => {
    if (!dom.airAndExternalGrid) return;
    dom.airAndExternalGrid.innerHTML = "";
    fieldConfigurations = generateFieldConfigurations(dryerModel);
    const airAndExternalFields = fieldConfigurations
      .filter(
        (f) =>
          f.group === "airExternal" && f.recordTypes.includes("evaluationTeam")
      )
      .sort((a, b) => a.order - b.order);
    airAndExternalFields.forEach((fieldConfig) => {
      const formGroup = document.createElement("div");
      formGroup.className = "form-group";
      if (fieldConfig.elemType === "number") {
        formGroup.innerHTML = `<label for="${fieldConfig.id}">${
          fieldConfig.label
        }</label><input type="number" id="${
          fieldConfig.id
        }" class="styled-input" step="0.1" placeholder="${fieldConfig.label
          .replace(/<small>.*<\/small>/, "")
          .replace(/風量設定&机外顯示_/, "")
          .trim()}" data-field-name="${
          fieldConfig.label
        }"/><span class="error-message" id="error_${fieldConfig.id}"></span>`;
      }
      dom.airAndExternalGrid.appendChild(formGroup);
    });
  };

  const renderAirVolumeGrid = (dryerModel) => {
    const measurements = getAirVolumeMeasurementsByModel(dryerModel);
    const gridContainer = dom.airVolumeGrid;
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    const gridHeader = document.createElement("div");
    gridHeader.className = "grid-header-row";
    gridHeader.innerHTML = `<span>測量位置</span><span>風管(m)</span><span>測管深度(cm)</span><span>面積(㎡)</span><span>風速(m/s)</span><span>溫度(℃)</span><span>風量(Nm³/分)</span>`;
    gridContainer.appendChild(gridHeader);

    const groupedByFloor = measurements.reduce((acc, measure) => {
      const floor = measure.floor || "其他";
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(measure);
      return acc;
    }, {});

    const floorOrder = [
      "7F",
      "6F",
      "5F",
      "4F",
      "3F",
      "2F",
      "測定危險",
      "沒量測點",
      "其他",
    ];
    floorOrder.forEach((floor) => {
      if (groupedByFloor[floor]) {
        const floorHeader = document.createElement("h3");
        floorHeader.className = "section-header";
        floorHeader.textContent = floor;
        floorHeader.style.cssText =
          "margin-top: 20px; font-size: 1.1em; text-align: left; justify-content: flex-start; grid-column: 1 / -1;";
        gridContainer.appendChild(floorHeader);

        groupedByFloor[floor].forEach((measure) => {
          const row = document.createElement("div");
          row.className = "air-measurement-row";
          if (measure.status === "normal") {
            row.innerHTML = `<div class="location-cell"><span>${
              measure.label
            }</span><button class="icon-btn" title="${
              measure.imageUrl ? "查看實景圖" : "無實景圖片"
            }" data-image-src="${measure.imageUrl || ""}" data-image-caption="${
              measure.label
            }" ${
              !measure.imageUrl ? "disabled" : ""
            }><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button></div><span class="fixed-value">${
              measure.duct
            }</span><span class="fixed-value">${
              measure.probeDepth ? measure.probeDepth + " cm" : "N/A"
            }</span><span class="calculated-area">${measure.area.toFixed(
              3
            )}</span><div class="input-with-error"><input type="number" id="air_speed_${
              measure.id
            }" class="styled-input" step="0.01" placeholder="0.00"></div><div class="input-with-error"><input type="number" id="air_temp_${
              measure.id
            }" class="styled-input" step="0.1" placeholder="0.0"></div><span class="calculated-output" id="air_volume_${
              measure.id
            }">0.0</span>`;
          } else {
            const statusText =
              measure.status === "dangerous" ? "測定危険" : "沒量測點";
            row.innerHTML = `<div class="location-cell"><span>${measure.label}</span></div><span class="fixed-value">${measure.duct}</span><span class="fixed-value">N/A</span><span class="calculated-area">N/A</span><div class="input-with-error"><input type="text" value="${statusText}" class="styled-input status-text" disabled></div><div class="input-with-error"><input type="text" value="N/A" class="styled-input status-text" disabled></div><span class="calculated-output" id="air_volume_${measure.id}">0.0</span>`;
          }
          gridContainer.appendChild(row);
        });
      }
    });
  };

  const generateTechTempInputs = () => {
    if (!dom.techTempGrid) return;
    dom.techTempGrid.innerHTML = `<div class="record-label">紀錄-每分</div><div class="grid-header">1(右)</div><div class="grid-header">2</div><div class="grid-header">3(中)</div><div class="grid-header">4</div><div class="grid-header">5(左)</div><div class="grid-header">溫差</div>`;
    techTempPoints.forEach((point) => {
      const labelSpan = document.createElement("span");
      labelSpan.className = "grid-row-label";
      labelSpan.textContent = point.label.replace("技術溫測實溫_", "");
      dom.techTempGrid.appendChild(labelSpan);
      for (let i = 1; i <= 5; i++) {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "input-with-error";
        const fieldId = `techTemp_${point.id}_${i}`;
        inputWrapper.innerHTML = `<input type="number" id="${fieldId}" class="styled-input" step="0.1" placeholder="0.0" data-field-name="技術溫測實溫 ${point.id}.${i}"><span class="error-message" id="error_${fieldId}"></span>`;
        dom.techTempGrid.appendChild(inputWrapper);
      }
      const diffInputWrapper = document.createElement("div");
      diffInputWrapper.className = "input-with-error";
      diffInputWrapper.innerHTML = `<input type="text" id="techTemp_${point.id}_diff" class="styled-input" value="0.00" disabled>`;
      dom.techTempGrid.appendChild(diffInputWrapper);
    });
  };

  const generateDamperOpeningInputs = () => {
    if (!dom.damperOpeningGrid) return;
    dom.damperOpeningGrid.innerHTML = "";
    fieldConfigurations = generateFieldConfigurations(currentDryerModel);
    const damperFields = fieldConfigurations.filter(
      (f) => f.group === "damperOpening"
    );
    damperFields.forEach((fieldConfig) => {
      const formGroup = document.createElement("div");
      formGroup.className = "form-group";
      formGroup.innerHTML = `<label for="${fieldConfig.id}">${
        fieldConfig.label
      }</label><input type="number" id="${
        fieldConfig.id
      }" class="styled-input" step="0.1" placeholder="${
        fieldConfig.label.split(" ")[1] || ""
      }" data-field-name="${
        fieldConfig.label
      }"><span class="error-message" id="error_${fieldConfig.id}"></span>`;
      dom.damperOpeningGrid.appendChild(formGroup);
    });
  };

  const renderHmiSections = (dryerModel) => {
    if (!dom.hmiContainer) return;
    dom.hmiContainer.innerHTML = "";
    const layouts = hmiLayouts[dryerModel] || {};
    const fieldGroups = hmiFieldsByModel[dryerModel] || {};
    const sectionTitles = {
      monitor1: "監控主畫面 - 1",
      monitor2: "監控主畫面 - 2",
      pid1: "PID參數設定 - 1",
      pid2: "PID參數設定 - 2",
    };
    for (const sectionKey in layouts) {
      if (!layouts[sectionKey]) continue;
      const bgImage = layouts[sectionKey];
      const sectionWrapper = document.createElement("div");
      sectionWrapper.id = `conditionSetting_${sectionKey}_wrapper`;
      sectionWrapper.className = "record-section";
      sectionWrapper.dataset.type = "conditionSetting";
      let hmiHtml = `<h2 class="section-header accordion-toggle">${
        sectionTitles[sectionKey] || "HMI 區塊"
      }</h2><div class="accordion-content"><div class="hmi-layout-container"><img src="${bgImage}" alt="${
        sectionTitles[sectionKey]
      } HMI 佈局圖" class="hmi-background">`;
      const fields = fieldGroups[sectionKey] || [];
      fields.forEach((field) => {
        const pos = field.position || {};
        const styleString = `top: ${pos.top || "0%"}; left: ${
          pos.left || "0%"
        }; width: ${pos.width || "20%"}; height: ${pos.height || "15%"};`;
        hmiHtml += `<div class="hmi-input-field" style="${styleString}"><div class="form-group"><label for="${field.id}">${field.label}</label><input type="number" id="${field.id}" class="styled-input" step="0.1" data-field-name="${field.id}" /><span class="error-message" id="error_${field.id}"></span></div></div>`;
      });
      hmiHtml += `</div></div>`;
      sectionWrapper.innerHTML = hmiHtml;
      dom.hmiContainer.appendChild(sectionWrapper);
    }
  };

  const toggleSections = () => {
    const selectedType = getCurrentRecordType();
    document.body.classList.toggle(
      "theme-condition-setting",
      selectedType === "conditionSetting"
    );
    document
      .querySelectorAll(".record-section[data-type]")
      .forEach((section) => {
        section.style.display =
          section.dataset.type === selectedType ? "block" : "none";
      });
    if (dom.hmiContainer) {
      dom.hmiContainer.style.display =
        selectedType === "conditionSetting" ? "block" : "none";
    }
  };

  const showConfirmModal = ({ message, onConfirm, onCancel }) => {
    if (!dom.confirmModalOverlay) return;
    dom.confirmModalMessage.textContent = message;
    dom.confirmModalOverlay.classList.add("visible");
    const yesHandler = () => {
      dom.confirmModalOverlay.classList.remove("visible");
      onConfirm();
      dom.confirmYesBtn.removeEventListener("click", yesHandler);
      dom.confirmNoBtn.removeEventListener("click", noHandler);
    };
    const noHandler = () => {
      dom.confirmModalOverlay.classList.remove("visible");
      if (onCancel) onCancel();
      dom.confirmYesBtn.removeEventListener("click", yesHandler);
      dom.confirmNoBtn.removeEventListener("click", noHandler);
    };
    dom.confirmYesBtn.addEventListener("click", yesHandler);
    dom.confirmNoBtn.addEventListener("click", noHandler);
  };

  const showImageModal = ({ src, caption }) => {
    if (!dom.imageModalOverlay) return;
    dom.modalImage.src = src;
    dom.modalCaption.textContent = caption;
    dom.imageModalOverlay.classList.add("visible");
  };

  const validateInput = (inputElement) => {
    fieldConfigurations = generateFieldConfigurations(currentDryerModel);
    const fieldConfig = fieldConfigurations.find(
      (f) => f.id === inputElement.id
    );
    const errorElement = document.getElementById(`error_${inputElement.id}`);
    inputElement.classList.remove("invalid-input");
    if (errorElement) {
      errorElement.textContent = "";
      errorElement.classList.remove("show");
    }
    if (!fieldConfig) return true;
    if (fieldConfig.required && inputElement.value.trim() === "") {
      inputElement.classList.add("invalid-input");
      if (errorElement) {
        errorElement.textContent = `${fieldConfig.label.replace(
          /<small>.*<\/small>/,
          ""
        )} 不能為空。`;
        errorElement.classList.add("show");
      }
      return false;
    }
    if (
      fieldConfig.validation === "percentage" &&
      inputElement.value.trim() !== ""
    ) {
      const value = parseFloat(inputElement.value);
      if (isNaN(value) || value < 0 || value > 100) {
        inputElement.classList.add("invalid-input");
        if (errorElement) {
          errorElement.textContent = `請輸入 0 到 100 之間的數字。`;
          errorElement.classList.add("show");
        }
        return false;
      }
    }
    return true;
  };

  const toggleAccordion = (header) => {
    header.classList.toggle("active");
    let content = header.nextElementSibling;
    if (!content || !content.classList.contains("accordion-content")) {
      const parentWrapper = header.closest(".header-wrapper");
      if (parentWrapper) {
        content = parentWrapper.nextElementSibling;
      }
    }
    if (content && content.classList.contains("accordion-content")) {
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        content.style.paddingTop = null;
        content.style.paddingBottom = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        content.style.paddingTop = "20px";
        const parentSection = header.closest(".record-section");
        if (
          parentSection &&
          parentSection.id === "evaluationTeam_technicalWind"
        ) {
          content.style.paddingBottom = "40px";
        } else {
          content.style.paddingBottom = "20px";
        }
      }
    }
  };

  const handleCompareSelection = (recordId) => {
    const index = selectedToCompareIds.indexOf(recordId);
    if (index > -1) {
      selectedToCompareIds.splice(index, 1);
    } else {
      if (selectedToCompareIds.length >= 2) {
        selectedToCompareIds.shift();
      }
      selectedToCompareIds.push(recordId);
    }
    sandbox.publish("request-manual-data-update");
    if (selectedToCompareIds.length === 2) {
      sandbox.publish("request-compare-records", selectedToCompareIds);
    } else {
      sandbox.publish("request-clear-compare-chart");
    }
  };

  const populateFilterSelect = () => {
    const currentType = getCurrentRecordType();
    fieldConfigurations = generateFieldConfigurations(currentDryerModel);
    const numericFields = fieldConfigurations.filter(
      (f) =>
        f.recordTypes.includes(currentType) &&
        (f.elemType === "number" || f.isCalculated) &&
        f.inTable
    );
    if (dom.filterFieldSelect) {
      dom.filterFieldSelect.innerHTML =
        '<option value="">-- 請選擇欄位 --</option>';
      numericFields.forEach((field) => {
        const option = new Option(
          field.csvHeader || field.label,
          field.dataKey
        );
        dom.filterFieldSelect.add(option);
      });
    }
  };

  const renderPagination = ({ currentPage, totalPages }) => {
    if (!dom.paginationContainer) return;
    dom.paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;
    let paginationHtml = `<button class="pagination-button" data-page="${
      currentPage - 1
    }" ${currentPage === 1 ? "disabled" : ""}>&laquo; 上一頁</button>`;
    const pageRange = 2;
    let startPage = Math.max(1, currentPage - pageRange);
    let endPage = Math.min(totalPages, currentPage + pageRange);
    if (currentPage - pageRange > 1) {
      paginationHtml += `<button class="pagination-button" data-page="1">1</button>`;
      if (currentPage - pageRange > 2)
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button class="pagination-button ${
        i === currentPage ? "active" : ""
      }" data-page="${i}">${i}</button>`;
    }
    if (currentPage + pageRange < totalPages) {
      if (currentPage + pageRange < totalPages - 1)
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      paginationHtml += `<button class="pagination-button" data-page="${totalPages}">${totalPages}</button>`;
    }
    paginationHtml += `<button class="pagination-button" data-page="${
      currentPage + 1
    }" ${currentPage === totalPages ? "disabled" : ""}>下一頁 &raquo;</button>`;
    dom.paginationContainer.innerHTML = paginationHtml;
  };

  const renderTable = ({
    records,
    editingIndex,
    sortState,
    goldenBatchId,
    pagination,
  }) => {
    try {
      const currentRecordType = getCurrentRecordType();
      fieldConfigurations = generateFieldConfigurations(currentDryerModel);
      const tableHeaderConfigs = fieldConfigurations.filter(
        (f) => f.inTable && f.recordTypes.includes(currentRecordType)
      );
      const stickyColumnWidths = [50, 70, 90, 100, 180];
      let headerHtml = `<th class="sticky-col" style="left: 0; min-width: ${stickyColumnWidths[0]}px;">比較</th>`;
      let stickyOffset = stickyColumnWidths[0];

      tableHeaderConfigs.forEach((f, index) => {
        const isSortable = f.dataKey && f.id !== "recordTypeDisplay";
        const sortKey = isSortable ? `data-sort-key="${f.dataKey}"` : "";
        const sortClass = isSortable ? "sortable" : "";
        let sortIndicator = "";
        if (isSortable && sortState && sortState.key === f.dataKey) {
          sortIndicator = sortState.direction === "asc" ? " ▲" : " ▼";
        }
        const thContent = `${f.csvHeader || f.label}${sortIndicator}`;
        if (index < 4 && index < stickyColumnWidths.length - 1) {
          headerHtml += `<th class="sticky-col ${sortClass}" ${sortKey} style="left: ${stickyOffset}px; min-width: ${
            stickyColumnWidths[index + 1]
          }px;">${thContent}</th>`;
          stickyOffset += stickyColumnWidths[index + 1];
        } else {
          headerHtml += `<th class="${sortClass}" ${sortKey}>${thContent}</th>`;
        }
      });

      dom.dynamicTableHeadersRow.innerHTML = headerHtml + "<th>操作</th>";
      dom.dataTableBody.innerHTML = "";
      const hasRecords = records && records.length > 0;
      dom.emptyStateMessage.style.display = hasRecords ? "none" : "block";

      if (hasRecords) {
        records.forEach((record, index) => {
          const row = dom.dataTableBody.insertRow();
          const recordId = record.id;
          row.dataset.index = index;
          row.dataset.id = recordId;
          if (recordId === goldenBatchId) row.classList.add("golden-batch-row");
          if (index === editingIndex) row.classList.add("row-editing");
          if (selectedToCompareIds.includes(recordId))
            row.classList.add("compare-selected-row");
          const compareCell = row.insertCell();
          compareCell.className = "sticky-col";
          compareCell.style.left = "0px";
          compareCell.innerHTML = `<input type="checkbox" class="compare-checkbox" data-record-id="${recordId}" ${
            selectedToCompareIds.includes(recordId) ? "checked" : ""
          }>`;

          let cellOffset = stickyColumnWidths[0];
          tableHeaderConfigs.forEach((fieldConfig, colIndex) => {
            const td = row.insertCell();
            if (colIndex < 4 && colIndex < stickyColumnWidths.length - 1) {
              td.classList.add("sticky-col");
              td.style.left = `${cellOffset}px`;
              td.style.minWidth = `${stickyColumnWidths[colIndex + 1]}px`;
              cellOffset += stickyColumnWidths[colIndex + 1];
            }
            let valueToDisplay = utils.getNestedValue(
              record,
              fieldConfig.dataKey,
              ""
            );
            if (fieldConfig.dataKey === "recordType")
              valueToDisplay =
                record.recordType === "evaluationTeam"
                  ? "評價TEAM用"
                  : "條件設定用";
            else if (fieldConfig.dataKey === "rtoStatus")
              valueToDisplay =
                record.rtoStatus === "yes"
                  ? "有"
                  : record.rtoStatus === "no"
                  ? "無"
                  : "";
            else if (fieldConfig.dataKey === "heatingStatus")
              valueToDisplay =
                record.heatingStatus === "yes"
                  ? "有"
                  : record.heatingStatus === "no"
                  ? "無"
                  : "";
            else if (fieldConfig.dataKey === "dryerModel")
              valueToDisplay = record.dryerModel
                ? record.dryerModel.toUpperCase()
                : "";
            td.textContent = valueToDisplay;
          });

          const actionsTd = row.insertCell();
          actionsTd.className = "actions";
          const hasRawData =
            record.rawChartData &&
            record.rawChartData.data &&
            record.rawChartData.data.length > 0;
          const viewRawBtnHtml = hasRawData
            ? `<button class="button button-danger view-raw-btn" title="查看此紀錄的原始匯入數據" data-record-id="${recordId}"><span>查看原始數據</span></button>`
            : "";
          actionsTd.innerHTML = `<button class="button button-icon golden-batch-btn" title="設為黃金樣板" data-record-id="${recordId}">⭐</button> ${viewRawBtnHtml} <button class="button button-edit edit-btn" title="編輯" data-record-id="${recordId}"><span>編輯</span></button> <button class="button button-danger delete-btn" title="刪除" data-record-id="${recordId}"><span>刪除</span></button>`;
        });
      }
      if (pagination) renderPagination(pagination);
    } catch (error) {
      console.error("UIManager: renderTable 渲染時發生嚴重錯誤:", error);
    }
  };

  const showMessage = ({ text, type = "info" }) => {
    if (!dom.messageBox) return;
    dom.messageBox.textContent = text;
    dom.messageBox.className = `message-box visible ${type}`;
    setTimeout(() => dom.messageBox.classList.remove("visible"), 3000);
  };

  const clearForm = () => {
    if (dom.allInputFieldsContainer) {
      const forms = dom.allInputFieldsContainer.querySelectorAll("form");
      if (forms.length > 0) {
        forms.forEach((form) => form.reset());
      } else {
        dom.allInputFieldsContainer
          .querySelectorAll('input[type="number"], textarea')
          .forEach((el) => {
            if (!el.disabled) el.value = "";
          });
      }
    }
    document.querySelectorAll(".error-message").forEach((el) => {
      el.textContent = "";
      el.classList.remove("show");
    });
    document
      .querySelectorAll(".invalid-input")
      .forEach((el) => el.classList.remove("invalid-input"));

    setDateTimeToNow();
    if (dom.radioEvaluationTeam) dom.radioEvaluationTeam.checked = true;
    if (document.getElementById("rtoNo"))
      document.getElementById("rtoNo").checked = true;
    if (document.getElementById("heatingNo"))
      document.getElementById("heatingNo").checked = true;

    if (dom.updateDataBtn) dom.updateDataBtn.style.display = "none";
    if (dom.cancelEditBtn) dom.cancelEditBtn.style.display = "none";
    if (dom.saveDataBtn) dom.saveDataBtn.style.display = "inline-flex";

    tempRawData = null;
    updateRawDataStatus(false);

    editingRecordId = null;
    sandbox.publish("form-cleared");
    // ▼▼▼ 在 clearForm 函式的最後，加入以下程式碼 ▼▼▼
    if (dom.rawCsvTextArea) {
      dom.rawCsvTextArea.readOnly = false; // 恢復為可編輯狀態
      dom.rawCsvTextArea.style.backgroundColor = ""; // 移除背景色
    }
    tempRawData = null;
    updateRawDataStatus(false);

    editingRecordId = null;
    sandbox.publish("form-cleared");
  };

  const loadDataToForm = (record, isForEdit = false) => {
    clearForm();
    editingRecordId = isForEdit ? record.id : null;

    if (record.recordType === "evaluationTeam")
      dom.radioEvaluationTeam.checked = true;
    else if (record.recordType === "conditionSetting")
      dom.radioConditionSetting.checked = true;

    if (record.dryerModel) {
      dom.dryerModelSelect.value = record.dryerModel.toLowerCase();
      currentDryerModel = record.dryerModel.toLowerCase();
      renderAirAndExternalInputs(currentDryerModel);
      renderAirVolumeGrid(currentDryerModel);
      generateDamperOpeningInputs();
      renderHmiSections(currentDryerModel);
      populateFilterSelect();
    }

    fieldConfigurations = generateFieldConfigurations(currentDryerModel);

    fieldConfigurations.forEach((field) => {
      if (
        field.recordTypes.includes(record.recordType) &&
        !field.isCalculated &&
        !field.isDynamicInput &&
        field.elemType !== "radio"
      ) {
        const valueToSet = utils.getNestedValue(record, field.dataKey, null);
        const el = document.getElementById(field.id);
        if (el) {
          el.value = valueToSet ?? "";
        }
      }
    });

    if (record.rtoStatus) {
      const rtoRadio = document.getElementById(
        `rto${record.rtoStatus === "yes" ? "Yes" : "No"}`
      );
      if (rtoRadio) rtoRadio.checked = true;
    }
    if (record.heatingStatus) {
      const heatingRadio = document.getElementById(
        `heating${record.heatingStatus === "yes" ? "Yes" : "No"}`
      );
      if (heatingRadio) heatingRadio.checked = true;
    }

    const airMeasurements = getAirVolumeMeasurementsByModel(currentDryerModel);
    airMeasurements.forEach((measure) => {
      if (measure.status === "normal") {
        const speedVal = utils.getNestedValue(
          record,
          `airVolumes.${measure.id}.speed`,
          null
        );
        const tempVal = utils.getNestedValue(
          record,
          `airVolumes.${measure.id}.temp`,
          null
        );
        const volumeVal = utils.getNestedValue(
          record,
          `airVolumes.${measure.id}.volume`,
          null
        );

        const speedInput = document.getElementById(`air_speed_${measure.id}`);
        const tempInput = document.getElementById(`air_temp_${measure.id}`);
        const volumeOutput = document.getElementById(
          `air_volume_${measure.id}`
        );

        if (speedInput) speedInput.value = speedVal ?? "";
        if (tempInput) tempInput.value = tempVal ?? "";
        if (volumeOutput)
          volumeOutput.textContent =
            volumeVal !== null && !isNaN(volumeVal)
              ? volumeVal.toFixed(1)
              : "0.0";
      }
    });

    techTempPoints.forEach((point) => {
      const recordPointKey = `point${
        point.id.startsWith("T") ? point.id : parseInt(point.id)
      }`;
      for (let i = 1; i <= 5; i++) {
        const val = utils.getNestedValue(
          record,
          `actualTemps.${recordPointKey}.val${i}`,
          null
        );
        const input = document.getElementById(`techTemp_${point.id}_${i}`);
        if (input) input.value = val ?? "";
      }
      const diffVal = utils.getNestedValue(
        record,
        `actualTemps.${recordPointKey}.diff`,
        null
      );
      const diffOutput = document.getElementById(`techTemp_${point.id}_diff`);
      if (diffOutput)
        diffOutput.value =
          diffVal !== null && !isNaN(diffVal) ? diffVal.toFixed(2) : "0.00";
    });

    sandbox.publish("request-chart-preview", record);

    if (isForEdit) {
      dom.updateDataBtn.style.display = "inline-flex";
      dom.cancelEditBtn.style.display = "inline-flex";
      dom.saveDataBtn.style.display = "none";
    }

    if (record.rawChartData && record.rawChartData.data) {
      tempRawData = record.rawChartData;
      updateRawDataStatus(true);
      try {
        if (dom.rawCsvTextArea) {
          dom.rawCsvTextArea.value = Papa.unparse(record.rawChartData.data, {
            columns: record.rawChartData.meta?.fields,
          });
        }
      } catch (e) {
        console.error("將 rawChartData 轉回 CSV 字串時失敗:", e);
      }

      sandbox.publish("uiReadyForRawChart", { results: record.rawChartData });
    }
  };

  const getRecordDataFromForm = () => {
    const record = {
      id: editingRecordId || crypto.randomUUID(),
      recordType: getCurrentRecordType(),
      dryerModel: getCurrentDryerModel(),
      airVolumes: {},
      actualTemps: {},
      recorder1Data: {},
      recorder2Data: {},
      airExternalData: {},
      damperOpeningData: {},
      hmiData: {},
      rawChartData: tempRawData,
      isSynced: false,
    };

    fieldConfigurations = generateFieldConfigurations(currentDryerModel);

    fieldConfigurations.forEach((field) => {
      if (
        !field.isCalculated &&
        !field.isDynamicInput &&
        field.elemType !== "radio" &&
        field.id !== "recordTypeDisplay" &&
        field.id !== "dryerModelDisplay"
      ) {
        const el = document.getElementById(field.id);
        if (el) {
          let value = el.value.trim();
          if (field.elemType === "number") {
            const num = parseFloat(value);
            value = isNaN(num) ? null : num;
          } else if (value === "") {
            value = null;
          }
          utils.setNestedValue(record, field.dataKey, value);
        }
      }
    });

    record.rtoStatus = document.getElementById("rtoYes").checked
      ? "yes"
      : document.getElementById("rtoNo").checked
      ? "no"
      : null;
    record.heatingStatus = document.getElementById("heatingYes").checked
      ? "yes"
      : document.getElementById("heatingNo").checked
      ? "no"
      : null;

    if (record.recordType === "evaluationTeam") {
      const airMeasurements =
        getAirVolumeMeasurementsByModel(currentDryerModel);
      airMeasurements.forEach((measure) => {
        if (measure.status === "normal") {
          const speedInput = document.getElementById(`air_speed_${measure.id}`);
          const tempInput = document.getElementById(`air_temp_${measure.id}`);
          const volumeOutput = document.getElementById(
            `air_volume_${measure.id}`
          );

          record.airVolumes[measure.id] = {
            speed: speedInput
              ? isNaN(parseFloat(speedInput.value))
                ? null
                : parseFloat(speedInput.value)
              : null,
            temp: tempInput
              ? isNaN(parseFloat(tempInput.value))
                ? null
                : parseFloat(tempInput.value)
              : null,
            volume: volumeOutput
              ? isNaN(parseFloat(volumeOutput.textContent))
                ? null
                : parseFloat(volumeOutput.textContent)
              : null,
            status: measure.status,
          };
        } else {
          record.airVolumes[measure.id] = { status: measure.status };
        }
      });

      techTempPoints.forEach((point) => {
        const recordPointKey = `point${
          point.id.startsWith("T") ? point.id : parseInt(point.id)
        }`;
        record.actualTemps[recordPointKey] = {};
        let values = [];
        for (let i = 1; i <= 5; i++) {
          const input = document.getElementById(`techTemp_${point.id}_${i}`);
          const val = input
            ? isNaN(parseFloat(input.value))
              ? null
              : parseFloat(input.value)
            : null;
          record.actualTemps[recordPointKey][`val${i}`] = val;
          if (val !== null) values.push(val);
        }
        record.actualTemps[recordPointKey].diff =
          values.length > 0
            ? (Math.max(...values) - Math.min(...values)).toFixed(2)
            : null;
      });
    }

    if (record.recordType === "conditionSetting") {
      const damperFields = fieldConfigurations.filter(
        (f) => f.group === "damperOpening"
      );
      damperFields.forEach((field) => {
        const el = document.getElementById(field.id);
        if (el) {
          const value = parseFloat(el.value);
          utils.setNestedValue(
            record,
            field.dataKey,
            isNaN(value) ? null : value
          );
        }
      });

      const hmiFields = fieldConfigurations.filter((f) => f.isHmiField);
      hmiFields.forEach((field) => {
        const el = document.getElementById(field.id);
        if (el) {
          const value = parseFloat(el.value);
          utils.setNestedValue(
            record,
            field.dataKey,
            isNaN(value) ? null : value
          );
        }
      });
    }

    if (record.dateTime) {
      try {
        const d = new Date(record.dateTime);
        record.dateTime = d.toISOString().slice(0, 16);
      } catch (e) {
        console.warn("日期時間格式化失敗:", record.dateTime, e);
        record.dateTime = null;
      }
    }

    console.log("Collected Record Data:", record);
    return record;
  };
  // /js/modules/uiManager.js

  // ... 在其他私有函式旁邊 ...

  const displayHistoricalRawText = (rawChartData) => {
    if (dom.rawCsvTextArea) {
      if (rawChartData && rawChartData.data) {
        try {
          // 使用 Papa.unparse 將物件還原成 CSV 字串
          const text = Papa.unparse(rawChartData.data, {
            columns: rawChartData.meta?.fields, // 使用儲存的欄位順序
          });
          dom.rawCsvTextArea.value = text;
          dom.rawCsvTextArea.readOnly = true; // 設為唯讀
          dom.rawCsvTextArea.style.backgroundColor = "#f0f0f0"; // 給一個灰色背景提示
        } catch (e) {
          console.error("還原 Raw Data 文字時失敗:", e);
          dom.rawCsvTextArea.value = "無法還原此筆紀錄的原始文字。";
        }
      }
    }
  };
  const subscribeToEvents = () => {
    sandbox.subscribe("raw-data-parsed-for-charting", (payload) => {
      const { results } = payload;
      if (results && results.data && results.data.length > 0) {
        tempRawData = results;
        updateRawDataStatus(true);
      } else {
        tempRawData = null;
        updateRawDataStatus(false);
      }
    });

    sandbox.subscribe("form-cleared", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    sandbox.subscribe("request-validate-field", (data) => {
      if (data && data.element) validateInput(data.element);
    });

    sandbox.subscribe("toggle-raw-chart-export-button", (data) => {
      if (dom.exportRawChartButton)
        dom.exportRawChartButton.disabled = data.disabled;
    });

    sandbox.subscribe("request-set-active-record-type", (recordType) => {
      if (recordType === "evaluationTeam")
        dom.radioEvaluationTeam.checked = true;
      else if (recordType === "conditionSetting")
        dom.radioConditionSetting.checked = true;
      toggleSections();
      populateFilterSelect();
      setTimeout(() => sandbox.publish("request-record-type-change"), 0);
    });

    sandbox.subscribe("data-updated", renderTable);
    sandbox.subscribe("action-completed-clear-form", clearForm);
    sandbox.subscribe("load-data-to-form", (record) =>
      loadDataToForm(record, false)
    );
    sandbox.subscribe("load-data-to-form-for-edit", (record) =>
      loadDataToForm(record, true)
    );
    sandbox.subscribe("show-message", showMessage);
    sandbox.subscribe("request-confirm", showConfirmModal);
    sandbox.subscribe("show-image-modal", showImageModal);
    sandbox.subscribe("request-set-now", setDateTimeToNow);
    sandbox.subscribe("request-update-air-volume-row", updateAirVolumeRow);
    sandbox.subscribe("request-update-tech-temp-row", updateTechTempRow);
    sandbox.subscribe("compare-selection-changed", handleCompareSelection);

    sandbox.subscribe("request-toggle-sections", () => {
      toggleSections();
      populateFilterSelect();
      sandbox.publish("request-record-type-change");
    });

    sandbox.subscribe("request-view-switch", (data) => {
      if (data.recordType === "evaluationTeam")
        dom.radioEvaluationTeam.checked = true;
      else if (data.recordType === "conditionSetting")
        dom.radioConditionSetting.checked = true;
      const newDryerModel = data.dryerModel.toLowerCase();
      dom.dryerModelSelect.value = newDryerModel;
      currentDryerModel = newDryerModel;
      toggleSections();
      populateFilterSelect();
      sandbox.publish("request-change-dryer-model", newDryerModel);
      sandbox.publish("request-record-type-change");
    });

    sandbox.subscribe("request-change-dryer-model", (model) => {
      const newModel = model.toLowerCase();
      currentDryerModel = newModel;
      if (dom.viewDamperLayoutBtn) {
        const imagePath =
          damperLayoutsByModel[newModel] || "./img/damper-layout.jpg";
        dom.viewDamperLayoutBtn.dataset.imageSrc = imagePath;
      }
      renderAirAndExternalInputs(newModel);
      renderAirVolumeGrid(newModel);
      generateDamperOpeningInputs();
      renderHmiSections(newModel);
      populateFilterSelect();
      clearForm();
    });

    sandbox.subscribe("show-loader", () => {
      if (dom.loadingOverlay) dom.loadingOverlay.classList.add("visible");
    });
    sandbox.subscribe("hide-loader", () => {
      if (dom.loadingOverlay) dom.loadingOverlay.classList.remove("visible");
    });
    sandbox.subscribe("request-toggle-accordion", toggleAccordion);

    // ▼▼▼【新增】訂閱顯示歷史 Raw Data 文字的事件 ▼▼▼
    sandbox.subscribe("display-historical-raw-text", (payload) =>
      displayHistoricalRawText(payload.rawChartData)
    );
  };

  // ★★★ 核心修正：將 validateForm 移出 return 物件，成為私有函式 ★★★
  const validateForm = () => {
    fieldConfigurations = generateFieldConfigurations(currentDryerModel);
    let isValid = true;
    const currentType = getCurrentRecordType(); // 現在可以正確呼叫
    fieldConfigurations.forEach((field) => {
      if (field.recordTypes.includes(currentType)) {
        const el = document.getElementById(field.id);
        if (el && !el.disabled) {
          if (!validateInput(el)) isValid = false;
        }
      }
    });
    return isValid;
  };

  return {
    init() {
      console.log("UIManager: 模組初始化完成");
      cacheDom();

      const dryerModelOrder = ["vt1", "vt5", "vt6", "vt7", "vt8"];
      dom.dryerModelSelect.innerHTML = dryerModelOrder
        .map((m) => `<option value="${m}">${m.toUpperCase()}</option>`)
        .join("");
      dom.dryerModelSelect.value = "vt8";
      currentDryerModel = "vt8";

      if (dom.viewDamperLayoutBtn) {
        const initialModel = currentDryerModel;
        const imagePath =
          damperLayoutsByModel[initialModel] || "./img/damper-layout.jpg";
        dom.viewDamperLayoutBtn.dataset.imageSrc = imagePath;
      }

      fieldConfigurations = generateFieldConfigurations(currentDryerModel);

      renderAirAndExternalInputs(currentDryerModel);
      renderAirVolumeGrid(currentDryerModel);
      generateTechTempInputs();
      generateDamperOpeningInputs();
      renderHmiSections(currentDryerModel);
      populateFilterSelect();
      toggleSections();
      setDateTimeToNow();
      subscribeToEvents();

      if (dom.rawDataStatusContainer) {
        dom.rawDataStatusContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("clear-raw-data-btn")) {
            tempRawData = null;
            updateRawDataStatus(false);
            sandbox.publish("show-message", {
              text: "已清除貼上的原始數據。",
              type: "info",
            });
            sandbox.publish("form-cleared");
          }
        });
      }
    },

    getCurrentRecordType,
    getCurrentDryerModel,
    getRecordDataFromForm,
    getDomElements: () => dom,

    // ★★★ 核心修正：在 return 物件中引用私有函式 ★★★
    validateForm: validateForm,

    resetFilters: () => {
      if (!dom.filterStartDate) return;
      dom.filterStartDate.value = "";
      dom.filterEndDate.value = "";
      dom.filterFieldSelect.value = "";
      dom.filterValueMin.value = "";
      dom.filterValueMax.value = "";
      dom.filterRtoStatus.value = "all";
      dom.filterHeatingStatus.value = "all";
      dom.filterRemarkKeyword.value = "";
      sandbox.publish("request-apply-filters", {});
    },

    getFilters: () => ({
      startDate: dom.filterStartDate.value,
      endDate: dom.filterEndDate.value,
      field: dom.filterFieldSelect.value,
      min: dom.filterValueMin.value,
      max: dom.filterValueMax.value,
      rtoStatus: dom.filterRtoStatus.value,
      heatingStatus: dom.filterHeatingStatus.value,
      remark: dom.filterRemarkKeyword.value.trim(),
    }),

    getCurrentFieldConfigurations: () => fieldConfigurations,
  };
};

export default UIManager;

// /js/modules/uiManager.js

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
  const self = {
    dom: {},
    _currentDryerModel: "vt8",
    _fieldConfigurations: [],
    selectedToCompareIds: [],
    tempRawData: null,
    _editingRecordId: null,

    /**
     * 快取所有需要操作的 DOM 元素。
     */
    _cacheDom() {
      const D = (id) => document.getElementById(id);
      self.dom = {
        setNowBtn: D("setNowBtn"),
        radioEvaluationTeam: D("radioEvaluationTeam"),
        radioConditionSetting: D("radioConditionSetting"),
        radioButtons: document.querySelectorAll('input[name="recordType"]'),
        dateTimeInput: D("dateTime"),
        remarkInput: D("remark"),
        dryerModelSelect: D("dryerModelSelect"),
        airAndExternalGrid: D("evaluationTeam_airAndExternal_grid"),
        airVolumeGrid: D("airVolumeGrid"),
        techTempGrid: D("techTempGrid"),
        damperOpeningGrid: D("damperOpeningGrid"),
        saveDataBtn: D("saveDataBtn"),
        updateDataBtn: D("updateDataBtn"),
        cancelEditBtn: D("cancelEditBtn"),
        clearDataBtn: D("clearDataBtn"),
        dataTableBody: D("dataTableBody"),
        messageBox: D("messageBox"),
        confirmModalOverlay: D("confirmModalOverlay"),
        confirmModalMessage: D("confirmModalMessage"),
        confirmYesBtn: D("confirmYesBtn"),
        confirmNoBtn: D("confirmNoBtn"),
        dynamicTableHeadersRow: D("dynamicTableHeaders"),
        importCsvBtn: D("importCsvBtn"),
        csvFileInput: D("csvFileInput"),
        exportCsvBtn: D("exportCsvBtn"),
        exportChartBtn: D("exportChartBtn"),
        rawCsvFileInput: D("rawCsvFileInput"),
        exportRawChartButton: D("exportRawChartButton"),
        allInputFieldsContainer: document.querySelector(".container"),
        emptyStateMessage: D("emptyStateMessage"),
        imageModalOverlay: D("imageModalOverlay"),
        imageModalClose: document.querySelector(".image-modal-close"),
        modalImage: D("modalImage"),
        modalCaption: D("modalCaption"),
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
        hmiContainer: D("hmi-sections-container"),
        viewDamperLayoutBtn: D("viewDamperLayoutBtn"),
        loadingOverlay: D("loadingOverlay"),
        paginationContainer: D("paginationContainer"),
        loadMasterDbBtn: D("loadMasterDbBtn"),
        createMasterDbBtn: D("createMasterDbBtn"),
        mergeToMasterBtn: D("mergeToMasterBtn"),
        exportForPowerBIBtn: D("exportForPowerBIBtn"),
        exportDailyJsonBtn: D("exportDailyJsonBtn"),
        historyCsvInput: D("historyCsvInput"),
        masterJsonInput: D("masterJsonInput"),
        dailyJsonInput: D("dailyJsonInput"),
      };
    },

    _renderAirVolumeGrid(dryerModel) {
      const measurements = getAirVolumeMeasurementsByModel(dryerModel);
      const gridContainer = self.dom.airVolumeGrid;
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
          floorHeader.style.marginTop = "20px";
          floorHeader.style.fontSize = "1.1em";
          floorHeader.style.textAlign = "left";
          floorHeader.style.justifyContent = "flex-start";
          floorHeader.style.gridColumn = "1 / -1";
          gridContainer.appendChild(floorHeader);

          groupedByFloor[floor].forEach((measure) => {
            const row = document.createElement("div");
            row.className = "air-measurement-row";
            if (measure.status === "normal") {
              row.innerHTML = `<div class="location-cell"><span>${
                measure.label
              }</span><button class="icon-btn" title="${
                measure.imageUrl ? "查看實景圖" : "無實景圖片"
              }" data-image-src="${
                measure.imageUrl || ""
              }" data-image-caption="${measure.label}" ${
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
    },

    _populateFilterSelect() {
      const currentType = self.getCurrentRecordType();
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      const numericFields = self._fieldConfigurations.filter(
        (f) =>
          f.recordTypes.includes(currentType) &&
          (f.elemType === "number" || f.isCalculated) &&
          f.inTable
      );
      self.dom.filterFieldSelect.innerHTML =
        '<option value="">-- 請選擇欄位 --</option>';
      numericFields.forEach((field) => {
        const option = new Option(
          field.csvHeader || field.label,
          field.dataKey
        );
        self.dom.filterFieldSelect.add(option);
      });
    },

    _renderPagination({ currentPage, totalPages }) {
      if (!self.dom.paginationContainer) return;
      self.dom.paginationContainer.innerHTML = "";
      if (totalPages <= 1) return;
      let paginationHtml = "";
      paginationHtml += `<button class="pagination-button" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>&laquo; 上一頁</button>`;
      const pageRange = 2;
      let startPage = Math.max(1, currentPage - pageRange);
      let endPage = Math.min(totalPages, currentPage + pageRange);
      if (currentPage - pageRange > 1) {
        paginationHtml += `<button class="pagination-button" data-page="1">1</button>`;
        if (currentPage - pageRange > 2) {
          paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
      }
      for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-button ${
          i === currentPage ? "active" : ""
        }" data-page="${i}">${i}</button>`;
      }
      if (currentPage + pageRange < totalPages) {
        if (currentPage + pageRange < totalPages - 1) {
          paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-button" data-page="${totalPages}">${totalPages}</button>`;
      }
      paginationHtml += `<button class="pagination-button" data-page="${
        currentPage + 1
      }" ${
        currentPage === totalPages ? "disabled" : ""
      }>下一頁 &raquo;</button>`;
      self.dom.paginationContainer.innerHTML = paginationHtml;
    },

    _renderTable({
      records,
      editingIndex,
      sortState,
      goldenBatchId,
      pagination,
    }) {
      try {
        const currentRecordType = self.getCurrentRecordType();
        self._fieldConfigurations = generateFieldConfigurations(
          self._currentDryerModel
        );
        const tableHeaderConfigs = self._fieldConfigurations.filter(
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
        self.dom.dynamicTableHeadersRow.innerHTML =
          headerHtml + "<th>操作</th>";
        self.dom.dataTableBody.innerHTML = "";
        const hasRecords = records && records.length > 0;
        self.dom.emptyStateMessage.style.display = hasRecords
          ? "none"
          : "block";
        if (hasRecords) {
          records.forEach((record, index) => {
            const row = self.dom.dataTableBody.insertRow();
            const recordId = record.id;
            row.dataset.index = index;
            row.dataset.id = recordId;
            if (recordId === goldenBatchId)
              row.classList.add("golden-batch-row");
            if (index === editingIndex) row.classList.add("row-editing");
            if (self.selectedToCompareIds.includes(recordId))
              row.classList.add("compare-selected-row");
            const compareCell = row.insertCell();
            compareCell.className = "sticky-col";
            compareCell.style.left = "0px";
            compareCell.innerHTML = `<input type="checkbox" class="compare-checkbox" data-record-id="${recordId}" ${
              self.selectedToCompareIds.includes(recordId) ? "checked" : ""
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
              if (fieldConfig.dataKey === "recordType") {
                valueToDisplay =
                  record.recordType === "evaluationTeam"
                    ? "評價TEAM用"
                    : "條件設定用";
              } else if (fieldConfig.dataKey === "rtoStatus") {
                const rtoValue = utils.getNestedValue(record, "rtoStatus");
                valueToDisplay =
                  rtoValue === "yes" ? "有" : rtoValue === "no" ? "無" : "";
              } else if (fieldConfig.dataKey === "heatingStatus") {
                const heatingValue = utils.getNestedValue(
                  record,
                  "heatingStatus"
                );
                valueToDisplay =
                  heatingValue === "yes"
                    ? "有"
                    : heatingValue === "no"
                    ? "無"
                    : "";
              } else if (fieldConfig.dataKey === "dryerModel") {
                valueToDisplay = record.dryerModel
                  ? record.dryerModel.toUpperCase()
                  : "";
              }
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
        if (pagination) {
          self._renderPagination(pagination);
        }
      } catch (error) {
        console.error("UIManager: _renderTable 渲染時發生嚴重錯誤:", error);
      }
    },

    _handleCompareSelection(recordId) {
      const index = self.selectedToCompareIds.indexOf(recordId);
      if (index > -1) {
        self.selectedToCompareIds.splice(index, 1);
      } else {
        if (self.selectedToCompareIds.length >= 2) {
          self.selectedToCompareIds.shift();
        }
        self.selectedToCompareIds.push(recordId);
      }
      sandbox.publish("request-manual-data-update");
      if (self.selectedToCompareIds.length === 2) {
        sandbox.publish("request-compare-records", self.selectedToCompareIds);
      } else {
        sandbox.publish("request-clear-compare-chart");
      }
    },

    _setDateTimeToNow() {
      const now = new Date();
      const timezoneOffset = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - timezoneOffset);
      const formattedDateTime = localTime.toISOString().slice(0, 16);
      self.dom.dateTimeInput.value = formattedDateTime;
    },

    _updateAirVolumeRow(measureId) {
      const measure = getAirVolumeMeasurementsByModel(
        self._currentDryerModel
      ).find((m) => m.id === measureId);
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
    },

    _updateTechTempRow(pointId) {
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
    },

    _renderAirAndExternalInputs(dryerModel) {
      if (!self.dom.airAndExternalGrid) return;
      self.dom.airAndExternalGrid.innerHTML = "";
      self._fieldConfigurations = generateFieldConfigurations(dryerModel);
      const airAndExternalFields = self._fieldConfigurations
        .filter(
          (f) =>
            f.group === "airExternal" &&
            f.recordTypes.includes("evaluationTeam")
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
        self.dom.airAndExternalGrid.appendChild(formGroup);
      });
    },

    _generateTechTempInputs() {
      self.dom.techTempGrid.innerHTML = `<div class="record-label">紀錄-每分</div><div class="grid-header">1(右)</div><div class="grid-header">2</div><div class="grid-header">3(中)</div><div class="grid-header">4</div><div class="grid-header">5(左)</div><div class="grid-header">溫差</div>`;
      techTempPoints.forEach((point) => {
        const labelSpan = document.createElement("span");
        labelSpan.className = "grid-row-label";
        labelSpan.textContent = point.label.replace("技術溫測實溫_", "");
        self.dom.techTempGrid.appendChild(labelSpan);
        for (let i = 1; i <= 5; i++) {
          const inputWrapper = document.createElement("div");
          inputWrapper.className = "input-with-error";
          const fieldId = `techTemp_${point.id}_${i}`;
          inputWrapper.innerHTML = `<input type="number" id="${fieldId}" class="styled-input" step="0.1" placeholder="0.0" data-field-name="技術溫測實溫 ${point.id}.${i}"><span class="error-message" id="error_${fieldId}"></span>`;
          self.dom.techTempGrid.appendChild(inputWrapper);
        }
        const diffInputWrapper = document.createElement("div");
        diffInputWrapper.className = "input-with-error";
        diffInputWrapper.innerHTML = `<input type="text" id="techTemp_${point.id}_diff" class="styled-input" value="0.00" disabled>`;
        self.dom.techTempGrid.appendChild(diffInputWrapper);
      });
    },

    _generateDamperOpeningInputs() {
      self.dom.damperOpeningGrid.innerHTML = "";
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      const damperFields = self._fieldConfigurations.filter(
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
        self.dom.damperOpeningGrid.appendChild(formGroup);
      });
    },

    _renderHmiSections(dryerModel) {
      self.dom.hmiContainer.innerHTML = "";
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
        self.dom.hmiContainer.appendChild(sectionWrapper);
      }
    },

    _toggleSections() {
      const selectedType = self.getCurrentRecordType();
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
      if (self.dom.hmiContainer) {
        self.dom.hmiContainer.style.display =
          selectedType === "conditionSetting" ? "block" : "none";
      }
    },

    _showMessage({ text, type = "info" }) {
      self.dom.messageBox.textContent = text;
      self.dom.messageBox.className = `message-box visible ${type}`;
      setTimeout(() => self.dom.messageBox.classList.remove("visible"), 3000);
    },

    _showConfirmModal({ message, onConfirm, onCancel }) {
      self.dom.confirmModalMessage.textContent = message;
      self.dom.confirmModalOverlay.classList.add("visible");
      const yesHandler = () => {
        self.dom.confirmModalOverlay.classList.remove("visible");
        onConfirm();
        self.dom.confirmYesBtn.removeEventListener("click", yesHandler);
        self.dom.confirmNoBtn.removeEventListener("click", noHandler);
      };
      const noHandler = () => {
        self.dom.confirmModalOverlay.classList.remove("visible");
        if (onCancel) onCancel();
        self.dom.confirmYesBtn.removeEventListener("click", yesHandler);
        self.dom.confirmNoBtn.removeEventListener("click", noHandler);
      };
      self.dom.confirmYesBtn.addEventListener("click", yesHandler, {
        once: true,
      });
      self.dom.confirmNoBtn.addEventListener("click", noHandler, {
        once: true,
      });
    },

    _showImageModal({ src, caption }) {
      self.dom.modalImage.src = src;
      self.dom.modalCaption.textContent = caption;
      self.dom.imageModalOverlay.classList.add("visible");
    },

    _validateInput(inputElement) {
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      const fieldConfig = self._fieldConfigurations.find(
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
    },

    _toggleAccordion(header) {
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
    },

    _clearForm() {
      document
        .querySelectorAll(
          '#evaluationTeam_airAndExternal_grid input[type="number"], #evaluationTeam_airAndExternal_grid .error-message'
        )
        .forEach((el) => {
          if (el.tagName === "INPUT") {
            el.value = "";
            el.classList.remove("invalid-input");
          } else {
            el.textContent = "";
            el.classList.remove("show");
          }
        });
      document
        .querySelectorAll('input[type="number"], textarea')
        .forEach((el) => {
          if (
            !el.disabled &&
            !el.closest("#evaluationTeam_airAndExternal_grid")
          ) {
            el.value = "";
          }
        });
      document.querySelectorAll(".error-message").forEach((el) => {
        if (!el.closest("#evaluationTeam_airAndExternal_grid")) {
          el.textContent = "";
          el.classList.remove("show");
        }
      });
      document
        .querySelectorAll(".invalid-input")
        .forEach((el) => el.classList.remove("invalid-input"));
      self._setDateTimeToNow();
      const rtoNoRadio = document.getElementById("rtoNo");
      if (rtoNoRadio) rtoNoRadio.checked = true;
      const heatingNoRadio = document.getElementById("heatingNo");
      if (heatingNoRadio) heatingNoRadio.checked = true;
      self.dom.updateDataBtn.style.display = "none";
      self.dom.cancelEditBtn.style.display = "none";
      self.dom.saveDataBtn.style.display = "inline-flex";
      self.tempRawData = null;
      self._editingRecordId = null;
      sandbox.publish("form-cleared");
    },

    _loadDataToForm(record, isForEdit = false) {
      self._clearForm();
      if (isForEdit) {
        self._editingRecordId = record.id;
      }
      if (record.recordType === "evaluationTeam") {
        self.dom.radioEvaluationTeam.checked = true;
      } else if (record.recordType === "conditionSetting") {
        self.dom.radioConditionSetting.checked = true;
      }
      if (record.dryerModel) {
        self.dom.dryerModelSelect.value = record.dryerModel.toLowerCase();
        self._currentDryerModel = record.dryerModel.toLowerCase();
      }
      self._renderAirAndExternalInputs(self._currentDryerModel);
      self._renderAirVolumeGrid(self._currentDryerModel);
      self._generateDamperOpeningInputs();
      self._renderHmiSections(self._currentDryerModel);
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      self._toggleSections();
      self._populateFilterSelect();
      const rtoStatusRadio = document.querySelector(
        `input[name="rtoStatus"][value="${record.rtoStatus}"]`
      );
      if (rtoStatusRadio) rtoStatusRadio.checked = true;
      const heatingStatusRadio = document.querySelector(
        `input[name="heatingStatus"][value="${record.heatingStatus}"]`
      );
      if (heatingStatusRadio) heatingStatusRadio.checked = true;
      self._fieldConfigurations.forEach((field) => {
        if (
          field.recordTypes.includes(record.recordType) &&
          !field.isCalculated &&
          field.elemType !== "radio"
        ) {
          const valueToSet = utils.getNestedValue(record, field.dataKey, null);
          const el = document.getElementById(field.id);
          if (el) {
            el.value = valueToSet ?? "";
          }
        }
      });
      techTempPoints.forEach((p) => self._updateTechTempRow(p.id));
      getAirVolumeMeasurementsByModel(self._currentDryerModel).forEach((m) =>
        self._updateAirVolumeRow(m.id)
      );
      if (isForEdit) {
        self.dom.updateDataBtn.style.display = "inline-flex";
        self.dom.cancelEditBtn.style.display = "inline-flex";
        self.dom.saveDataBtn.style.display = "none";
      }
      if (record.rawChartData) {
        self.tempRawData = record.rawChartData;
        sandbox.publish("plot-raw-data-chart", record.rawChartData);
      }
      sandbox.publish("request-chart-preview", record);
    },

    init() {
      console.log("UIManager: 模組初始化完成");
      self._cacheDom();
      const dryerModelOrder = ["vt1", "vt5", "vt6", "vt7", "vt8"];
      self.dom.dryerModelSelect.innerHTML = dryerModelOrder
        .map((m) => `<option value="${m}">${m.toUpperCase()}</option>`)
        .join("");
      self.dom.dryerModelSelect.value = "vt8";
      self._currentDryerModel = "vt8";

      // ★★★ 關鍵修正：設定初始的 Damper 佈局圖路徑 ★★★
      if (self.dom.viewDamperLayoutBtn) {
        const initialModel = self._currentDryerModel;
        const imagePath =
          damperLayoutsByModel[initialModel] || "./img/damper-layout.jpg";
        self.dom.viewDamperLayoutBtn.dataset.imageSrc = imagePath;
      }

      self._renderAirAndExternalInputs(self._currentDryerModel);
      self._renderAirVolumeGrid(self._currentDryerModel);
      self._generateTechTempInputs();
      self._generateDamperOpeningInputs();
      self._renderHmiSections(self._currentDryerModel);
      self._populateFilterSelect();
      self._toggleSections();
      self._setDateTimeToNow();
      self._subscribeToEvents();
    },

    _subscribeToEvents() {
      sandbox.subscribe("request-validate-field", (data) => {
        if (data && data.element) self._validateInput(data.element);
      });
      sandbox.subscribe("toggle-raw-chart-export-button", (data) => {
        if (self.dom.exportRawChartButton)
          self.dom.exportRawChartButton.disabled = data.disabled;
      });
      sandbox.subscribe("request-set-active-record-type", (recordType) => {
        if (recordType === "evaluationTeam")
          self.dom.radioEvaluationTeam.checked = true;
        else if (recordType === "conditionSetting")
          self.dom.radioConditionSetting.checked = true;
        self._toggleSections();
        self._populateFilterSelect();
        setTimeout(() => sandbox.publish("request-record-type-change"), 0);
      });
      sandbox.subscribe("data-updated", (data) => self._renderTable(data));
      sandbox.subscribe("action-completed-clear-form", () => self._clearForm());
      sandbox.subscribe("load-data-to-form", (record) =>
        self._loadDataToForm(record, false)
      );
      sandbox.subscribe("load-data-to-form-for-edit", (record) =>
        self._loadDataToForm(record, true)
      );
      sandbox.subscribe("show-message", (data) => self._showMessage(data));
      sandbox.subscribe("request-confirm", (data) =>
        self._showConfirmModal(data)
      );
      sandbox.subscribe("show-image-modal", (data) =>
        self._showImageModal(data)
      );
      sandbox.subscribe("request-set-now", () => self._setDateTimeToNow());
      sandbox.subscribe("request-update-air-volume-row", (id) =>
        self._updateAirVolumeRow(id)
      );
      sandbox.subscribe("request-update-tech-temp-row", (id) =>
        self._updateTechTempRow(id)
      );
      sandbox.subscribe("compare-selection-changed", (id) =>
        self._handleCompareSelection(id)
      );
      sandbox.subscribe("raw-csv-data-parsed", (parsedResult) => {
        if (parsedResult && parsedResult.data && parsedResult.data.length > 0) {
          self.tempRawData = parsedResult;
          self._showMessage({ text: "原始數據已載入，待儲存。", type: "info" });
        } else {
          self.tempRawData = null;
        }
      });
      sandbox.subscribe("request-toggle-sections", () => {
        self._toggleSections();
        self._populateFilterSelect();
        sandbox.publish("request-record-type-change");
      });
      sandbox.subscribe("request-view-switch", (data) => {
        if (data.recordType === "evaluationTeam") {
          self.dom.radioEvaluationTeam.checked = true;
        } else if (data.recordType === "conditionSetting") {
          self.dom.radioConditionSetting.checked = true;
        }
        const newDryerModel = data.dryerModel.toLowerCase();
        self.dom.dryerModelSelect.value = newDryerModel;
        self._currentDryerModel = newDryerModel;
        self._toggleSections();
        self._populateFilterSelect();
        sandbox.publish("request-change-dryer-model", newDryerModel);
        sandbox.publish("request-record-type-change");
      });
      sandbox.subscribe("request-change-dryer-model", (model) => {
        const newModel = model.toLowerCase();
        self._currentDryerModel = newModel;
        if (self.dom.viewDamperLayoutBtn) {
          const imagePath =
            damperLayoutsByModel[newModel] || "./img/damper-layout.jpg";
          self.dom.viewDamperLayoutBtn.dataset.imageSrc = imagePath;
        }
        self._renderAirAndExternalInputs(newModel);
        self._renderAirVolumeGrid(newModel);
        self._generateDamperOpeningInputs();
        self._renderHmiSections(newModel);
        self._populateFilterSelect();
        self._clearForm();
      });
      sandbox.subscribe("show-loader", () => {
        if (self.dom.loadingOverlay)
          self.dom.loadingOverlay.classList.add("visible");
      });
      sandbox.subscribe("hide-loader", () => {
        if (self.dom.loadingOverlay)
          self.dom.loadingOverlay.classList.remove("visible");
      });
      sandbox.subscribe("request-toggle-accordion", (header) =>
        self._toggleAccordion(header)
      );
    },

    getCurrentRecordType() {
      const checkedRadio = document.querySelector(
        'input[name="recordType"]:checked'
      );
      return checkedRadio ? checkedRadio.value : "evaluationTeam";
    },

    getCurrentDryerModel() {
      if (self.dom.dryerModelSelect && self.dom.dryerModelSelect.value) {
        return self.dom.dryerModelSelect.value.toLowerCase();
      }
      return self._currentDryerModel;
    },

    getRecordDataFromForm() {
      const recordData = {
        id: self._editingRecordId || crypto.randomUUID(),
        recordType: self.getCurrentRecordType(),
        dryerModel: self._currentDryerModel.toLowerCase(),
        rtoStatus: document.querySelector('input[name="rtoStatus"]:checked')
          ?.value,
        heatingStatus: document.querySelector(
          'input[name="heatingStatus"]:checked'
        )?.value,
        airVolumes: {},
        actualTemps: {},
        hmiData: {},
        damperOpeningData: {},
      };
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      self._fieldConfigurations.forEach((field) => {
        if (
          field.recordTypes.includes(recordData.recordType) &&
          !field.isCalculated &&
          field.dataKey
        ) {
          const el = document.getElementById(field.id);
          if (el) {
            let value;
            if (el.type === "number") {
              value = el.value === "" ? null : parseFloat(el.value);
            } else {
              value = el.value;
            }
            utils.setNestedValue(recordData, field.dataKey, value);
          }
        }
      });
      const airMeasurements = getAirVolumeMeasurementsByModel(
        self._currentDryerModel
      );
      airMeasurements.forEach((measure) => {
        if (measure.status === "normal") {
          const speed = utils.getNestedValue(
            recordData,
            `airVolumes.${measure.id}.speed`
          );
          const temp = utils.getNestedValue(
            recordData,
            `airVolumes.${measure.id}.temp`
          );
          const volume = utils.calculateAirVolume(temp, speed, measure.area);
          if (!recordData.airVolumes[measure.id])
            recordData.airVolumes[measure.id] = {};
          recordData.airVolumes[measure.id].volume = isNaN(volume)
            ? null
            : volume;
        }
      });
      techTempPoints.forEach((point) => {
        const recordPointKey = utils.getActualTempRecordKey(point.id);
        const tempValues = [];
        for (let i = 1; i <= 5; i++) {
          const val = utils.getNestedValue(
            recordData,
            `actualTemps.${recordPointKey}.val${i}`
          );
          if (val !== null) tempValues.push(val);
        }
        if (!recordData.actualTemps[recordPointKey])
          recordData.actualTemps[recordPointKey] = {};
        if (tempValues.length > 0) {
          const diff = Math.max(...tempValues) - Math.min(...tempValues);
          recordData.actualTemps[recordPointKey].diff = parseFloat(
            diff.toFixed(2)
          );
        } else {
          recordData.actualTemps[recordPointKey].diff = null;
        }
      });
      if (self.tempRawData) {
        recordData.rawChartData = self.tempRawData;
      }
      return recordData;
    },

    validateForm() {
      self._fieldConfigurations = generateFieldConfigurations(
        self._currentDryerModel
      );
      let isValid = true;
      const currentType = self.getCurrentRecordType();
      self._fieldConfigurations.forEach((field) => {
        if (field.recordTypes.includes(currentType)) {
          const el = document.getElementById(field.id);
          if (el && !el.disabled) {
            if (!self._validateInput(el)) isValid = false;
          }
        }
      });
      return isValid;
    },

    getFilters() {
      return {
        startDate: self.dom.filterStartDate.value,
        endDate: self.dom.filterEndDate.value,
        field: self.dom.filterFieldSelect.value,
        min: self.dom.filterValueMin.value,
        max: self.dom.filterValueMax.value,
        rtoStatus: self.dom.filterRtoStatus.value,
        heatingStatus: self.dom.filterHeatingStatus.value,
        remark: self.dom.filterRemarkKeyword.value.trim(),
      };
    },

    resetFilters() {
      self.dom.filterStartDate.value = "";
      self.dom.filterEndDate.value = "";
      self.dom.filterFieldSelect.value = "";
      self.dom.filterValueMin.value = "";
      self.dom.filterValueMax.value = "";
      self.dom.filterRtoStatus.value = "all";
      self.dom.filterHeatingStatus.value = "all";
      self.dom.filterRemarkKeyword.value = "";
      sandbox.publish("request-apply-filters", {});
    },

    getDomElements: () => self.dom,
    getCurrentFieldConfigurations: () => self._fieldConfigurations,
  };

  return self;
};

export default UIManager;

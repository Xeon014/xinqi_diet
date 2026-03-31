const { previewWeightImport, confirmWeightImport } = require("../../services/body-metric");
const { formatDateTimeToMinute } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    step: "select",
    fileName: "",
    parsing: false,
    preview: null,
    displayRows: [],
    checkedRows: [],
    showOnlyErrors: false,
    selectedCount: 0,
    selectableCount: 0,
    errorCount: 0,
    duplicatePolicy: "SKIP",
    importing: false,
    result: null,
  },

  handleChooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["csv", "txt", "xlsx"],
      success: (res) => {
        const file = res.tempFiles[0];
        const filePath = file.path;
        const fileName = file.name;
        try {
          const fs = wx.getFileSystemManager();
          const buffer = fs.readFileSync(filePath);
          const base64 = wx.arrayBufferToBase64(buffer);
          if (!base64) {
            wx.showToast({ title: "文件内容为空", icon: "none" });
            return;
          }
          this.setData({ fileName, parsing: true });
          previewWeightImport(fileName, base64)
            .then((preview) => {
              const checkedRows = preview.rows
                ? preview.rows.map((row) => row.error == null)
                : [];
              this.applyPreviewState({
                step: "preview",
                parsing: false,
                preview,
                checkedRows,
                showOnlyErrors: false,
              });
            })
            .catch((error) => {
              this.setData({ parsing: false });
              wx.showToast({ title: pickErrorMessage(error), icon: "none" });
            });
        } catch (e) {
          wx.showToast({ title: "文件读取失败", icon: "none" });
        }
      },
    });
  },

  handleRowCheck(event) {
    const index = Number(event.currentTarget.dataset.originalIndex);
    const previewRow = this.data.preview && this.data.preview.rows
      ? this.data.preview.rows[index]
      : null;
    if (!previewRow || previewRow.error) {
      return;
    }
    const checkedRows = this.data.checkedRows.slice();
    checkedRows[index] = !checkedRows[index];
    this.applyPreviewState({ checkedRows });
  },

  handlePolicyChange(event) {
    const policy = event.currentTarget.dataset.policy;
    this.setData({ duplicatePolicy: policy });
  },

  handleSelectAllValid() {
    const previewRows = this.data.preview && this.data.preview.rows
      ? this.data.preview.rows
      : [];
    const checkedRows = previewRows.map((row) => row.error == null);
    this.applyPreviewState({ checkedRows });
  },

  handleClearAll() {
    const previewRows = this.data.preview && this.data.preview.rows
      ? this.data.preview.rows
      : [];
    const checkedRows = previewRows.map(() => false);
    this.applyPreviewState({ checkedRows });
  },

  handleToggleErrorFilter() {
    this.applyPreviewState({ showOnlyErrors: !this.data.showOnlyErrors });
  },

  handleConfirmImport() {
    const { duplicatePolicy } = this.data;
    const validRows = this.getSelectedRows();
    if (validRows.length === 0) {
      wx.showToast({ title: "没有可导入的数据", icon: "none" });
      return;
    }
    this.setData({ importing: true });
    confirmWeightImport(validRows, duplicatePolicy)
      .then((result) => {
        this.setData({ step: "result", importing: false, result });
      })
      .catch((error) => {
        this.setData({ importing: false });
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleImportAnother() {
    this.setData({
      step: "select",
      fileName: "",
      parsing: false,
      preview: null,
      displayRows: [],
      checkedRows: [],
      showOnlyErrors: false,
      selectedCount: 0,
      selectableCount: 0,
      errorCount: 0,
      duplicatePolicy: "SKIP",
      importing: false,
      result: null,
    });
  },

  handleViewHistory() {
    wx.navigateTo({ url: "/pages/metric-history/index?metricKey=WEIGHT" });
  },

  getSelectedRows() {
    const { preview, checkedRows } = this.data;
    if (!preview || !preview.rows) {
      return [];
    }

    const validRows = [];
    for (let i = 0; i < preview.rows.length; i++) {
      if (checkedRows[i] && preview.rows[i].parsedDate && preview.rows[i].parsedWeightKg != null) {
        validRows.push({
          measuredAt: preview.rows[i].parsedMeasuredAt,
          weightKg: preview.rows[i].parsedWeightKg,
        });
      }
    }
    return validRows;
  },

  applyPreviewState(nextState = {}) {
    const preview = Object.prototype.hasOwnProperty.call(nextState, "preview")
      ? nextState.preview
      : this.data.preview;
    const checkedRows = Object.prototype.hasOwnProperty.call(nextState, "checkedRows")
      ? nextState.checkedRows
      : this.data.checkedRows;
    const showOnlyErrors = Object.prototype.hasOwnProperty.call(nextState, "showOnlyErrors")
      ? nextState.showOnlyErrors
      : this.data.showOnlyErrors;

    if (!preview || !preview.rows) {
      this.setData(nextState);
      return;
    }

    const displayRows = [];
    let selectedCount = 0;
    let selectableCount = 0;
    let errorCount = 0;

    preview.rows.forEach((row, index) => {
      if (row.error) {
        errorCount++;
      } else {
        selectableCount++;
        if (checkedRows[index]) {
          selectedCount++;
        }
      }

      if (!showOnlyErrors || row.error) {
        displayRows.push({
          ...row,
          displayMeasuredAt: row.parsedMeasuredAt
            ? formatDateTimeToMinute(row.parsedMeasuredAt)
            : (row.parsedDate || row.rawDate || "-"),
          originalIndex: index,
        });
      }
    });

    this.setData({
      ...nextState,
      preview,
      checkedRows,
      showOnlyErrors,
      displayRows,
      selectedCount,
      selectableCount,
      errorCount,
    });
  },
});

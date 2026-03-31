const { previewWeightImport, confirmWeightImport } = require("../../services/body-metric");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    step: "select",
    fileName: "",
    parsing: false,
    preview: null,
    checkedRows: [],
    duplicatePolicy: "SKIP",
    importing: false,
    result: null,
  },

  handleChooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["csv", "txt"],
      success: (res) => {
        const file = res.tempFiles[0];
        const filePath = file.path;
        const fileName = file.name;
        try {
          const fs = wx.getFileSystemManager();
          const content = fs.readFileSync(filePath, "utf-8");
          if (!content || !content.trim()) {
            wx.showToast({ title: "文件内容为空", icon: "none" });
            return;
          }
          this.setData({ fileName, parsing: true });
          previewWeightImport(fileName, content)
            .then((preview) => {
              const checkedRows = preview.rows
                ? preview.rows.map((row) => row.error == null)
                : [];
              this.setData({
                step: "preview",
                parsing: false,
                preview,
                checkedRows,
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
    const index = event.currentTarget.dataset.index;
    const checkedRows = this.data.checkedRows.slice();
    checkedRows[index] = !checkedRows[index];
    this.setData({ checkedRows });
  },

  handlePolicyChange(event) {
    const policy = event.currentTarget.dataset.policy;
    this.setData({ duplicatePolicy: policy });
  },

  handleConfirmImport() {
    const { preview, checkedRows, duplicatePolicy } = this.data;
    const validRows = [];
    for (let i = 0; i < preview.rows.length; i++) {
      if (checkedRows[i] && preview.rows[i].parsedDate && preview.rows[i].parsedWeightKg != null) {
        validRows.push({
          date: preview.rows[i].parsedDate,
          weightKg: preview.rows[i].parsedWeightKg,
        });
      }
    }
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
      checkedRows: [],
      duplicatePolicy: "SKIP",
      importing: false,
      result: null,
    });
  },

  handleViewHistory() {
    wx.navigateTo({ url: "/pages/metric-history/index?metricKey=WEIGHT" });
  },
});

const { getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐"
};

function toInteger(value) {
  return Math.round(Number(value || 0));
}

function normalizeSummary(summary) {
  const records = (summary.records || []).map((record) => ({
    ...record,
    mealTypeLabel: MEAL_TYPE_LABELS[record.mealType] || record.mealType
  }));

  return {
    ...summary,
    targetCalories: toInteger(summary.targetCalories),
    consumedCalories: toInteger(summary.consumedCalories),
    remainingCalories: toInteger(summary.remainingCalories),
    records
  };
}

Page({
  data: {
    today: getToday(),
    summary: {
      targetCalories: 0,
      consumedCalories: 0,
      remainingCalories: 0,
      exceededTarget: false,
      records: []
    }
  },
  onShow() {
    const app = getApp();
    if (app.globalData.refreshHomeOnShow) {
      app.globalData.refreshHomeOnShow = false;
    }
    this.loadSummary();
  },
  onPullDownRefresh() {
    this.loadSummary(true);
  },
  loadSummary(stopPullDown = false) {
    getDailySummary(this.data.today)
      .then((summary) => {
        this.setData({ summary: normalizeSummary(summary) });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },
  handleCreate() {
    wx.switchTab({ url: "/pages/record-create/index" });
  },
  handleOpenProgress() {
    wx.navigateTo({ url: "/pages/progress/index" });
  }
});
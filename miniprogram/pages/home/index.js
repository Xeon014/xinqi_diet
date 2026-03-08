const { getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const MEAL_TYPE_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function buildMealCards(records) {
  const mealMap = records.reduce((result, record) => {
    const mealType = record.mealType;
    if (!result[mealType]) {
      result[mealType] = {
        mealType,
        mealTypeLabel: MEAL_TYPE_LABELS[mealType] || mealType,
        foodCount: 0,
        totalCalories: 0,
      };
    }

    result[mealType].foodCount += 1;
    result[mealType].totalCalories += Number(record.totalCalories || 0);
    return result;
  }, {});

  return MEAL_TYPE_ORDER
    .map((mealType) => mealMap[mealType])
    .filter(Boolean)
    .map((card) => ({
      ...card,
      totalCalories: toInteger(card.totalCalories),
    }));
}

function normalizeSummary(summary) {
  const records = (summary.records || []).map((record) => ({
    ...record,
    mealTypeLabel: MEAL_TYPE_LABELS[record.mealType] || record.mealType,
    totalCalories: toInteger(record.totalCalories),
  }));

  return {
    ...summary,
    targetCalories: toInteger(summary.targetCalories),
    consumedCalories: toInteger(summary.consumedCalories),
    remainingCalories: toInteger(summary.remainingCalories),
    records,
    mealCards: buildMealCards(records),
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
      records: [],
      mealCards: [],
    },
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
  },
});

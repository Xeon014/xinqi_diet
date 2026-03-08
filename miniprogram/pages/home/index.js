const { getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { getIntensityLabel } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function formatDietTitle(record) {
  const mealTypeLabel = MEAL_TYPE_LABELS[record.mealType] || "饮食";
  const quantity = toInteger(record.quantityInGram);
  return `${mealTypeLabel} ${record.foodName || "食物"} ${quantity}g`;
}

function formatExerciseTitle(record) {
  const duration = toInteger(record.durationMinutes);
  const intensity = getIntensityLabel(record.intensityLevel);
  return `${record.exerciseName || "运动"} ${duration}min ${intensity}`;
}

function normalizeRecord(record, today) {
  const isDiet = record.recordType === "DIET";
  const calories = toInteger(record.totalCalories);

  return {
    ...record,
    title: isDiet ? formatDietTitle(record) : formatExerciseTitle(record),
    calories,
    signedCalories: `${isDiet ? "+" : "-"}${calories} kcal`,
    isDiet,
    isExercise: !isDiet,
    recordDate: record.recordDate || today,
    recordKey: `${record.recordType || "UNKNOWN"}-${record.recordId || ""}-${record.createdAt || ""}`,
  };
}

function normalizeSummary(summary, today) {
  const records = (summary.records || []).map((record) => normalizeRecord(record, today));
  const netCalories = toInteger(summary.netCalories ?? summary.consumedCalories);
  const remainingCalories = toInteger(summary.remainingCalories);

  return {
    ...summary,
    targetCalories: toInteger(summary.targetCalories),
    dietCalories: toInteger(summary.dietCalories),
    exerciseCalories: toInteger(summary.exerciseCalories),
    netCalories,
    consumedCalories: netCalories,
    remainingCalories,
    remainingAbs: Math.abs(remainingCalories),
    records,
  };
}

Page({
  data: {
    today: getToday(),
    summary: {
      targetCalories: 0,
      dietCalories: 0,
      exerciseCalories: 0,
      netCalories: 0,
      consumedCalories: 0,
      remainingCalories: 0,
      remainingAbs: 0,
      exceededTarget: false,
      records: [],
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
        this.setData({ summary: normalizeSummary(summary, this.data.today) });
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

  handleOpenRecord(event) {
    const { recordType, mealType, recordDate } = event.currentTarget.dataset;
    if (recordType === "DIET") {
      wx.navigateTo({
        url: `/pages/meal-editor/index?mode=edit&mealType=${encodeURIComponent(mealType)}&recordDate=${encodeURIComponent(recordDate)}`,
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/exercise-editor/index?mode=edit&recordDate=${encodeURIComponent(recordDate)}`,
    });
  },
});

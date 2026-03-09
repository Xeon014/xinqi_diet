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

function getRecommendedMealType() {
  const hour = new Date().getHours();
  if (hour < 10) {
    return "BREAKFAST";
  }
  if (hour < 15) {
    return "LUNCH";
  }
  if (hour < 20) {
    return "DINNER";
  }
  return "SNACK";
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
    signedCalories: `${isDiet ? "+" : "-"}${calories} kcal`,
    isDiet,
    recordDate: record.recordDate || today,
    recordKey: `${record.recordType || "UNKNOWN"}-${record.recordId || ""}-${record.createdAt || ""}`,
  };
}

function normalizeSummary(summary, today) {
  const records = (summary.records || []).map((record) => normalizeRecord(record, today));
  const netCalories = toInteger(summary.netCalories ?? summary.consumedCalories);
  const remainingCalories = toInteger(summary.remainingCalories);
  const dailyInsight = summary.dailyInsight || {};

  return {
    ...summary,
    targetCalories: toInteger(summary.targetCalories),
    dietCalories: toInteger(summary.dietCalories),
    exerciseCalories: toInteger(summary.exerciseCalories),
    netCalories,
    remainingCalories,
    remainingAbs: Math.abs(remainingCalories),
    records,
    summaryText: dailyInsight.summaryText || "继续记录，保持节奏。",
  };
}

Page({
  data: {
    today: getToday(),
    recommendedMealType: getRecommendedMealType(),
    recommendedMealLabel: "",
    summary: {
      targetCalories: 0,
      dietCalories: 0,
      exerciseCalories: 0,
      netCalories: 0,
      remainingCalories: 0,
      remainingAbs: 0,
      exceededTarget: false,
      records: [],
      summaryText: "",
    },
  },

  onLoad() {
    const mealType = getRecommendedMealType();
    this.setData({
      recommendedMealType: mealType,
      recommendedMealLabel: MEAL_TYPE_LABELS[mealType] || "当前餐次",
    });
  },

  onShow() {
    const app = getApp();
    if (app.globalData.refreshHomeOnShow) {
      app.globalData.refreshHomeOnShow = false;
    }

    const mealType = getRecommendedMealType();
    this.setData({
      today: getToday(),
      recommendedMealType: mealType,
      recommendedMealLabel: MEAL_TYPE_LABELS[mealType] || "当前餐次",
    });

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

  handleGoRecommendedMeal() {
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${encodeURIComponent(this.data.recommendedMealType)}&recordDate=${encodeURIComponent(this.data.today)}`,
    });
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
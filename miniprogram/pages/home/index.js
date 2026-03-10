const { getDailySummary } = require("../../services/user");
const { addDays, getToday } = require("../../utils/date");
const { getIntensityLabel } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const RECORD_GROUPS = [
  { key: "BREAKFAST", label: "早餐", type: "DIET", mealType: "BREAKFAST" },
  { key: "LUNCH", label: "午餐", type: "DIET", mealType: "LUNCH" },
  { key: "DINNER", label: "晚餐", type: "DIET", mealType: "DINNER" },
  { key: "SNACK", label: "加餐", type: "DIET", mealType: "SNACK" },
  { key: "EXERCISE", label: "运动", type: "EXERCISE", mealType: "" },
];

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

function resolveDateLabel(recordDate) {
  const today = getToday();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (recordDate === today) {
    return "今天";
  }
  if (recordDate === yesterday) {
    return "昨天";
  }
  if (recordDate === tomorrow) {
    return "明天";
  }
  return recordDate;
}

function formatDietTitle(record) {
  const quantity = toInteger(record.quantityInGram);
  return `${record.foodName || "食物"} ${quantity}g`;
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

function buildRecordGroups(records) {
  const groupedRecords = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
    SNACK: [],
    EXERCISE: [],
  };

  (records || []).forEach((record) => {
    if (record.recordType === "DIET") {
      if (groupedRecords[record.mealType]) {
        groupedRecords[record.mealType].push(record);
      }
      return;
    }
    groupedRecords.EXERCISE.push(record);
  });

  return RECORD_GROUPS
    .map((group) => ({
      ...group,
      records: groupedRecords[group.key] || [],
    }))
    .filter((group) => group.records.length);
}

Page({
  data: {
    recordDate: getToday(),
    displayDateLabel: "今天",
    recommendedMealType: getRecommendedMealType(),
    recordGroups: [],
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
    this.refreshDateMeta();
  },

  onShow() {
    const app = getApp();
    if (app.globalData.refreshHomeOnShow) {
      app.globalData.refreshHomeOnShow = false;
    }

    this.refreshDateMeta();
    this.loadSummary();
  },

  onPullDownRefresh() {
    this.loadSummary(true);
  },

  refreshDateMeta() {
    this.setData({
      displayDateLabel: resolveDateLabel(this.data.recordDate),
      recommendedMealType: getRecommendedMealType(),
    });
  },

  handlePrevDay() {
    this.shiftDay(-1);
  },

  handleNextDay() {
    this.shiftDay(1);
  },

  shiftDay(offset) {
    this.setData(
      {
        recordDate: addDays(this.data.recordDate, offset),
      },
      () => {
        this.refreshDateMeta();
        this.loadSummary();
      }
    );
  },

  handleDateChange(event) {
    this.setData(
      {
        recordDate: event.detail.value,
      },
      () => {
        this.refreshDateMeta();
        this.loadSummary();
      }
    );
  },

  loadSummary(stopPullDown = false) {
    getDailySummary(this.data.recordDate)
      .then((summary) => {
        const normalized = normalizeSummary(summary, this.data.recordDate);
        this.setData({
          summary: normalized,
          recordGroups: buildRecordGroups(normalized.records),
        });
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

  handleQuickAddDiet() {
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${encodeURIComponent(this.data.recommendedMealType)}&recordDate=${encodeURIComponent(this.data.recordDate)}`,
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

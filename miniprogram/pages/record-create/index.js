const { getDailySummary } = require("../../services/user");
const { addDays, getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
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

const MEAL_TYPE_LABELS = {
  BREAKFAST: "\u65e9\u9910",
  LUNCH: "\u5348\u9910",
  DINNER: "\u665a\u9910",
  SNACK: "\u52a0\u9910",
};

function resolveDateLabel(recordDate) {
  const today = getToday();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (recordDate === today) {
    return "\u4eca\u5929";
  }
  if (recordDate === yesterday) {
    return "\u6628\u5929";
  }
  if (recordDate === tomorrow) {
    return "\u660e\u5929";
  }
  return recordDate;
}

function buildEmptySummary() {
  return {
    dietCalories: 0,
    exerciseCalories: 0,
    targetCalories: 0,
    remainingCalories: 0,
    exceededTarget: false,
  };
}

Page({
  data: {
    recordDate: getToday(),
    displayDateLabel: "\u4eca\u5929",
    recommendedMealType: getRecommendedMealType(),
    recommendedMealLabel: "\u5f53\u524d\u9910\u6b21",
    summary: buildEmptySummary(),
  },

  onLoad() {
    this.refreshDateMeta();
  },

  onShow() {
    this.refreshDateMeta();
    this.loadSummary();
  },

  onPullDownRefresh() {
    this.loadSummary(true);
  },

  refreshDateMeta() {
    const recommendedMealType = getRecommendedMealType();
    this.setData({
      displayDateLabel: resolveDateLabel(this.data.recordDate),
      recommendedMealType,
      recommendedMealLabel: MEAL_TYPE_LABELS[recommendedMealType] || "\u5f53\u524d\u9910\u6b21",
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
        this.setData({
          summary: {
            dietCalories: toInteger(summary.dietCalories),
            exerciseCalories: toInteger(summary.exerciseCalories),
            targetCalories: toInteger(summary.targetCalories),
            remainingCalories: Math.abs(toInteger(summary.remainingCalories)),
            exceededTarget: !!summary.exceededTarget,
          },
        });
      })
      .catch((error) => {
        this.setData({
          summary: buildEmptySummary(),
        });
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  handleOpenDietEditor() {
    wx.navigateTo({
      url: "/pages/meal-editor/index?mealType="
        + encodeURIComponent(this.data.recommendedMealType)
        + "&recordDate="
        + encodeURIComponent(this.data.recordDate),
    });
  },

  handleOpenExerciseEditor() {
    wx.navigateTo({
      url: "/pages/exercise-editor/index?recordDate=" + encodeURIComponent(this.data.recordDate),
    });
  },
});

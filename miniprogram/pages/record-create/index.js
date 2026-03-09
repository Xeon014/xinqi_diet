const { getDailySummary } = require("../../services/user");
const { addDays, getToday } = require("../../utils/date");

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
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

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

Page({
  data: {
    recordDate: getToday(),
    displayDateLabel: "今天",
    recommendedMealType: getRecommendedMealType(),
    recommendedMealLabel: "当前餐次",
    summary: {
      consumedCalories: 0,
      exerciseCalories: 0,
      targetCalories: 0,
      remainingCalories: 0,
      exceededTarget: false,
    },
  },

  onLoad() {
    this.refreshDateMeta();
  },

  onShow() {
    this.refreshDateMeta();
    this.loadSummary();
  },

  refreshDateMeta() {
    const recommendedMealType = getRecommendedMealType();
    this.setData({
      displayDateLabel: resolveDateLabel(this.data.recordDate),
      recommendedMealType,
      recommendedMealLabel: MEAL_TYPE_LABELS[recommendedMealType] || "当前餐次",
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

  loadSummary() {
    getDailySummary(this.data.recordDate)
      .then((summary) => {
        this.setData({
          summary: {
            consumedCalories: toInteger(summary.consumedCalories),
            exerciseCalories: toInteger(summary.exerciseCalories),
            targetCalories: toInteger(summary.targetCalories),
            remainingCalories: Math.abs(toInteger(summary.remainingCalories)),
            exceededTarget: !!summary.exceededTarget,
          },
        });
      })
      .catch(() => {
        this.setData({
          summary: {
            consumedCalories: 0,
            exerciseCalories: 0,
            targetCalories: 0,
            remainingCalories: 0,
            exceededTarget: false,
          },
        });
      });
  },

  handleOpenDietEditor() {
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${this.data.recommendedMealType}&recordDate=${this.data.recordDate}`,
    });
  },

  handleOpenExerciseEditor() {
    wx.navigateTo({
      url: `/pages/exercise-editor/index?recordDate=${this.data.recordDate}`,
    });
  },
});
const { getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPES = [
  { label: "早餐", value: "BREAKFAST" },
  { label: "午餐", value: "LUNCH" },
  { label: "晚餐", value: "DINNER" },
  { label: "加餐", value: "SNACK" },
];

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

Page({
  data: {
    recordDate: getToday(),
    mealTypes: MEAL_TYPES,
    recommendedMealType: getRecommendedMealType(),
    summary: {
      consumedCalories: 0,
      targetCalories: 0,
      remainingCalories: 0,
      exceededTarget: false,
    },
  },

  onShow() {
    this.loadSummary();
  },

  handleDateChange(event) {
    this.setData({
      recordDate: event.detail.value,
    }, () => {
      this.loadSummary();
    });
  },

  loadSummary() {
    getDailySummary(this.data.recordDate)
      .then((summary) => {
        this.setData({
          summary: {
            consumedCalories: toInteger(summary.consumedCalories),
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
            targetCalories: 0,
            remainingCalories: 0,
            exceededTarget: false,
          },
        });
      });
  },

  handleOpenDietEditor() {
    wx.showActionSheet({
      itemList: this.data.mealTypes.map((item) => item.label),
      success: (result) => {
        const selectedType = this.data.mealTypes[result.tapIndex];
        if (!selectedType) {
          return;
        }
        wx.navigateTo({
          url: `/pages/meal-editor/index?mealType=${selectedType.value}&recordDate=${this.data.recordDate}`,
        });
      },
    });
  },

  handleQuickMeal() {
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${this.data.recommendedMealType}&recordDate=${this.data.recordDate}`,
    });
  },

  handleOpenExerciseEditor() {
    wx.navigateTo({
      url: `/pages/exercise-editor/index?recordDate=${this.data.recordDate}`,
    });
  },

  handleMealTap(event) {
    const { mealType } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${mealType}&recordDate=${this.data.recordDate}`,
    });
  },
});

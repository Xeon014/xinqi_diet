const { getToday } = require("../../utils/date");

const MEAL_TYPES = [
  { label: "早餐", value: "BREAKFAST" },
  { label: "午餐", value: "LUNCH" },
  { label: "晚餐", value: "DINNER" },
  { label: "加餐", value: "SNACK" },
];

Page({
  data: {
    recordDate: getToday(),
    mealTypes: MEAL_TYPES,
  },

  handleDateChange(event) {
    this.setData({
      recordDate: event.detail.value,
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

  handleOpenExerciseEditor() {
    wx.navigateTo({
      url: `/pages/exercise-editor/index?recordDate=${this.data.recordDate}`,
    });
  },
});

const { getToday } = require("../../utils/date");

const MEAL_TYPES = [
  { label: "早餐", value: "BREAKFAST", note: "开始记录早餐" },
  { label: "午餐", value: "LUNCH", note: "开始记录午餐" },
  { label: "晚餐", value: "DINNER", note: "开始记录晚餐" },
  { label: "加餐", value: "SNACK", note: "零食和饮品" },
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

  handleOpenEditor(event) {
    const { mealType } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/meal-editor/index?mealType=${mealType}&recordDate=${this.data.recordDate}`,
    });
  },
});

const { getToday } = require("../../utils/date");

const MEAL_TYPES = [
  { label: "早餐", value: "BREAKFAST", note: "开始记录今天的第一餐" },
  { label: "午餐", value: "LUNCH", note: "补充中段能量" },
  { label: "晚餐", value: "DINNER", note: "记录晚间摄入" },
  { label: "加餐", value: "SNACK", note: "零食、水果或饮品" },
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
const { getToday } = require("../../utils/date");

const MEAL_TYPES = [
  { label: "\u65e9\u9910", value: "BREAKFAST", note: "\u5f00\u542f\u4eca\u5929\u7684\u7b2c\u4e00\u9910" },
  { label: "\u5348\u9910", value: "LUNCH", note: "\u8865\u5145\u5348\u95f4\u80fd\u91cf" },
  { label: "\u665a\u9910", value: "DINNER", note: "\u8bb0\u5f55\u665a\u95f4\u6444\u5165" },
  { label: "\u52a0\u9910", value: "SNACK", note: "\u96f6\u98df\u3001\u6c34\u679c\u6216\u996e\u54c1" },
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
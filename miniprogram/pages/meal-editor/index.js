const { createRecord } = require("../../services/record");
const { DEFAULT_USER_ID } = require("../../utils/constants");
const { getToday } = require("../../utils/date");
const { saveRecentFood } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

const MEAL_TYPE_LABELS = {
  BREAKFAST: "\u65e9\u9910",
  LUNCH: "\u5348\u9910",
  DINNER: "\u665a\u9910",
  SNACK: "\u52a0\u9910",
};

Page({
  data: {
    mealType: "BREAKFAST",
    mealLabel: "\u65e9\u9910",
    recordDate: getToday(),
    selectedFood: null,
    quantityInGram: "",
  },

  onLoad(options) {
    const mealType = options.mealType || "BREAKFAST";
    const recordDate = options.recordDate || getToday();
    this.setData({
      mealType,
      mealLabel: MEAL_TYPE_LABELS[mealType] || "\u65e9\u9910",
      recordDate,
    });
  },

  handleChooseFood() {
    wx.navigateTo({
      url: "/pages/food-search/index",
      success: (res) => {
        res.eventChannel.on("foodSelected", (food) => {
          this.setData({
            selectedFood: food,
          });
        });
      },
    });
  },

  handleQuantityInput(event) {
    this.setData({
      quantityInGram: event.detail.value,
    });
  },

  handleSubmit() {
    const { selectedFood, quantityInGram, mealType, recordDate } = this.data;
    const quantity = Number(quantityInGram);

    if (!selectedFood) {
      wx.showToast({
        title: "\u8bf7\u5148\u9009\u62e9\u98df\u7269",
        icon: "none",
      });
      return;
    }

    if (!quantity || quantity <= 0) {
      wx.showToast({
        title: "\u8bf7\u8f93\u5165\u6b63\u786e\u514b\u6570",
        icon: "none",
      });
      return;
    }

    createRecord({
      userId: DEFAULT_USER_ID,
      foodId: selectedFood.id,
      mealType,
      quantityInGram: quantity,
      recordDate,
    })
      .then(() => {
        saveRecentFood(DEFAULT_USER_ID, selectedFood);
        app.globalData.refreshHomeOnShow = true;
        wx.showToast({
          title: "\u8bb0\u5f55\u6210\u529f",
          icon: "success",
        });
        setTimeout(() => {
          wx.switchTab({
            url: "/pages/home/index",
          });
        }, 350);
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },
});
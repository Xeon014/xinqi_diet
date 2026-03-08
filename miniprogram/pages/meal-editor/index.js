const { createRecord } = require("../../services/record");
const { DEFAULT_USER_ID } = require("../../utils/constants");
const { getToday } = require("../../utils/date");
const { saveRecentFood } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function normalizeFood(food) {
  if (!food) {
    return null;
  }

  return {
    ...food,
    caloriesPer100g: toInteger(food.caloriesPer100g),
  };
}

Page({
  data: {
    mealType: "BREAKFAST",
    mealLabel: "早餐",
    recordDate: getToday(),
    selectedFood: null,
    quantityInGram: "",
  },

  onLoad(options) {
    const mealType = options.mealType || "BREAKFAST";
    const recordDate = options.recordDate || getToday();
    this.setData({
      mealType,
      mealLabel: MEAL_TYPE_LABELS[mealType] || "早餐",
      recordDate,
    });
  },

  handleChooseFood() {
    wx.navigateTo({
      url: "/pages/food-search/index",
      success: (res) => {
        res.eventChannel.on("foodSelected", (food) => {
          this.setData({
            selectedFood: normalizeFood(food),
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
        title: "请先选择食物",
        icon: "none",
      });
      return;
    }

    if (!quantity || quantity <= 0) {
      wx.showToast({
        title: "请输入正确克数",
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
          title: "记录成功",
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
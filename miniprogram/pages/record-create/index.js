const { createRecord } = require("../../services/record");
const { DEFAULT_USER_ID } = require("../../utils/constants");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

Page({
  data: {
    mealTypes: [
      { label: "早餐", value: "BREAKFAST" },
      { label: "午餐", value: "LUNCH" },
      { label: "晚餐", value: "DINNER" },
      { label: "加餐", value: "SNACK" },
    ],
    selectedMealType: "LUNCH",
    selectedFood: null,
    quantityInGram: "",
    recordDate: getToday(),
  },

  handleMealTypeTap(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({
      selectedMealType: value,
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

  handleDateChange(event) {
    this.setData({
      recordDate: event.detail.value,
    });
  },

  handleSubmit() {
    const quantity = Number(this.data.quantityInGram);
    if (!this.data.selectedFood) {
      wx.showToast({
        title: "请先选择食物",
        icon: "none",
      });
      return;
    }

    if (!quantity || quantity <= 0) {
      wx.showToast({
        title: "克数必须大于 0",
        icon: "none",
      });
      return;
    }

    createRecord({
      userId: DEFAULT_USER_ID,
      foodId: this.data.selectedFood.id,
      mealType: this.data.selectedMealType,
      quantityInGram: quantity,
      recordDate: this.data.recordDate,
    })
      .then(() => {
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
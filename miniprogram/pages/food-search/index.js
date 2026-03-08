const { searchFoods } = require("../../services/food");
const { DEFAULT_USER_ID } = require("../../utils/constants");
const { decorateFood, filterFoodsByCategory, FOOD_CATEGORIES } = require("../../utils/food");
const { getRecentFoods } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    keyword: "",
    categories: FOOD_CATEGORIES,
    selectedCategoryKey: "ALL",
    foods: [],
    recentFoods: [],
    recentDisplayFoods: [],
    displayedFoods: [],
    emptyTitle: "\u6682\u65e0\u98df\u7269",
    emptyDescription: "\u8bd5\u8bd5\u5207\u6362\u5206\u7c7b\u6216\u6dfb\u52a0\u81ea\u5b9a\u4e49\u98df\u7269\u3002",
  },

  onLoad() {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.loadFoods();
  },

  loadFoods() {
    searchFoods("")
      .then((data) => {
        const foods = (data.foods || []).map(decorateFood);
        const recentFoods = getRecentFoods(DEFAULT_USER_ID).map(decorateFood);
        this.setData(
          {
            foods,
            recentFoods,
          },
          () => {
            this.refreshDisplayedFoods();
          }
        );
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  handleInput(event) {
    this.setData(
      {
        keyword: event.detail.value,
      },
      () => {
        this.refreshDisplayedFoods();
      }
    );
  },

  handleCategoryTap(event) {
    this.setData(
      {
        selectedCategoryKey: event.currentTarget.dataset.key,
      },
      () => {
        this.refreshDisplayedFoods();
      }
    );
  },

  handleOpenCustomFood() {
    wx.navigateTo({
      url: "/pages/custom-food/index",
      success: (res) => {
        res.eventChannel.on("foodCreated", (food) => {
          if (this.openerEventChannel) {
            this.openerEventChannel.emit("foodSelected", decorateFood(food));
            wx.navigateBack({
              delta: 2,
            });
            return;
          }
          this.loadFoods();
        });
      },
    });
  },

  handleSelectFood(event) {
    const { index, source } = event.currentTarget.dataset;
    const food = source === "recent" ? this.data.recentDisplayFoods[index] : this.data.displayedFoods[index];
    if (this.openerEventChannel) {
      this.openerEventChannel.emit("foodSelected", food);
    }
    wx.navigateBack();
  },

  refreshDisplayedFoods() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const currentCategoryKey = this.data.selectedCategoryKey;

    const recentDisplayFoods = keyword
      ? []
      : filterFoodsByCategory(this.data.recentFoods, currentCategoryKey);

    const displayedFoods = filterFoodsByCategory(this.data.foods, currentCategoryKey)
      .filter((food) => food.name.toLowerCase().includes(keyword))
      .filter((food) => keyword || recentDisplayFoods.every((recentFood) => recentFood.id !== food.id));

    this.setData({
      recentDisplayFoods,
      displayedFoods,
      emptyTitle: keyword ? "\u6ca1\u6709\u627e\u5230\u98df\u7269" : "\u5f53\u524d\u5206\u7c7b\u6682\u65e0\u98df\u7269",
      emptyDescription: keyword
        ? "\u6362\u4e2a\u5173\u952e\u8bcd\u8bd5\u8bd5\uff0c\u6216\u4f7f\u7528\u81ea\u5b9a\u4e49\u98df\u7269\u3002"
        : "\u8bd5\u8bd5\u5207\u6362\u5206\u7c7b\uff0c\u6216\u6dfb\u52a0\u81ea\u5b9a\u4e49\u98df\u7269\u3002",
    });
  },
});
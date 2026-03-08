const { searchFoods } = require("../../services/food");
const { getCurrentUserId } = require("../../utils/auth");
const { decorateFood, filterFoodsByCategory, FOOD_CATEGORIES } = require("../../utils/food");
const { getRecentFoods } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function normalizeFood(food) {
  return {
    ...food,
    caloriesPer100g: toInteger(food.caloriesPer100g),
  };
}

Page({
  data: {
    keyword: "",
    categories: FOOD_CATEGORIES,
    selectedCategoryKey: "ALL",
    foods: [],
    recentFoods: [],
    recentDisplayFoods: [],
    displayedFoods: [],
    emptyTitle: "暂无食物",
    emptyDescription: "试试切换分类或添加自定义食物。",
  },

  onLoad() {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.loadFoods();
  },

  loadFoods() {
    searchFoods("")
      .then((data) => {
        const foods = (data.foods || []).map((food) => normalizeFood(decorateFood(food)));
        const userId = getCurrentUserId();
        const recentFoods = userId
          ? getRecentFoods(userId).map((food) => normalizeFood(decorateFood(food)))
          : [];
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
            this.openerEventChannel.emit("foodSelected", normalizeFood(decorateFood(food)));
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
      emptyTitle: keyword ? "没有找到食物" : "当前分类暂无食物",
      emptyDescription: keyword
        ? "换个关键词试试，或使用自定义食物。"
        : "试试切换分类，或添加自定义食物。",
    });
  },
});

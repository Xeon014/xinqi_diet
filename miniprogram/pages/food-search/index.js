const { searchFoods } = require("../../services/food");
const { getCurrentUserId } = require("../../utils/auth");
const { decorateFood, filterFoodsByCategory, FOOD_CATEGORIES } = require("../../utils/food");
const { getRecentFoods } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

const FILTER_KEYS = {
  RECENT: "RECENT",
  CUSTOM: "CUSTOM",
};

const SYSTEM_FILTERS = [
  { key: FILTER_KEYS.RECENT, label: "最近记录" },
  { key: FILTER_KEYS.CUSTOM, label: "自定义" },
];

const BUILTIN_CATEGORIES = FOOD_CATEGORIES.filter((item) => item.key !== "ALL");

function toInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function normalizeFood(food) {
  return {
    ...food,
    caloriesPer100g: toInteger(food.caloriesPer100g),
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
  };
}

function includesKeyword(food, keyword) {
  if (!keyword) {
    return true;
  }
  return String(food.name || "").toLowerCase().includes(keyword);
}

Page({
  data: {
    keyword: "",
    systemFilters: SYSTEM_FILTERS,
    builtinCategories: BUILTIN_CATEGORIES,
    selectedCategoryKey: FILTER_KEYS.RECENT,
    currentCategoryLabel: "最近记录",
    foods: [],
    recentFoods: [],
    displayedFoods: [],
    emptyTitle: "最近记录为空",
    emptyDescription: "先记录一次饮食，常用食物会出现在这里。",
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
    const { index } = event.currentTarget.dataset;
    const food = this.data.displayedFoods[index];
    if (!food) {
      return;
    }
    if (this.openerEventChannel) {
      this.openerEventChannel.emit("foodSelected", food);
    }
    wx.navigateBack();
  },

  getCategoryLabel(categoryKey) {
    const allFilters = [...this.data.systemFilters, ...this.data.builtinCategories];
    const matched = allFilters.find((item) => item.key === categoryKey);
    return matched ? matched.label : "食物列表";
  },

  buildRecentFoods(keyword) {
    return this.data.recentFoods
      .slice()
      .sort((a, b) => Number(b.usedAt || 0) - Number(a.usedAt || 0))
      .filter((food) => includesKeyword(food, keyword));
  },

  buildCustomFoods(keyword) {
    return this.data.foods
      .filter((food) => !food.isBuiltin)
      .filter((food) => includesKeyword(food, keyword));
  },

  buildBuiltinFoods(keyword, categoryKey) {
    return filterFoodsByCategory(this.data.foods, categoryKey).filter((food) => includesKeyword(food, keyword));
  },

  resolveEmptyState(categoryKey, keyword) {
    if (keyword) {
      return {
        emptyTitle: "没有找到食物",
        emptyDescription: "换个关键词试试，或使用自定义食物。",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT) {
      return {
        emptyTitle: "最近记录为空",
        emptyDescription: "先记录一次饮食，常用食物会出现在这里。",
      };
    }

    if (categoryKey === FILTER_KEYS.CUSTOM) {
      return {
        emptyTitle: "暂无自定义食物",
        emptyDescription: "可通过右上角“自定义食物”手动添加。",
      };
    }

    return {
      emptyTitle: "当前分类暂无食物",
      emptyDescription: "试试切换分类，或添加自定义食物。",
    };
  },

  refreshDisplayedFoods() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const currentCategoryKey = this.data.selectedCategoryKey;

    let displayedFoods = [];
    if (currentCategoryKey === FILTER_KEYS.RECENT) {
      displayedFoods = this.buildRecentFoods(keyword);
    } else if (currentCategoryKey === FILTER_KEYS.CUSTOM) {
      displayedFoods = this.buildCustomFoods(keyword);
    } else {
      displayedFoods = this.buildBuiltinFoods(keyword, currentCategoryKey);
    }

    const emptyState = this.resolveEmptyState(currentCategoryKey, keyword);
    this.setData({
      displayedFoods,
      currentCategoryLabel: this.getCategoryLabel(currentCategoryKey),
      emptyTitle: emptyState.emptyTitle,
      emptyDescription: emptyState.emptyDescription,
    });
  },
});

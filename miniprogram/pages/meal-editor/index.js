const { createRecordBatch } = require("../../services/record");
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

const DEFAULT_QUANTITY = 100;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function normalizeFood(food) {
  return {
    id: food.id,
    name: food.name,
    category: food.category,
    categoryLabel: food.categoryLabel,
    caloriesPer100g: toInteger(food.caloriesPer100g),
  };
}

function decorateItem(item) {
  const quantity = toNumber(item.quantityInGram);
  const totalCalories = quantity > 0 ? toInteger((toNumber(item.caloriesPer100g) * quantity) / 100) : 0;
  return {
    ...item,
    quantityInGram: item.quantityInGram,
    totalCalories,
  };
}

Page({
  data: {
    mealType: "BREAKFAST",
    mealLabel: "早餐",
    recordDate: getToday(),
    foodItems: [],
    mealTotalCalories: 0,
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
          this.addFoodToList(normalizeFood(food));
        });
      },
    });
  },

  addFoodToList(food) {
    const foodItems = [...this.data.foodItems];
    const targetIndex = foodItems.findIndex((item) => item.id === food.id);

    if (targetIndex >= 0) {
      const quantity = toNumber(foodItems[targetIndex].quantityInGram) + DEFAULT_QUANTITY;
      foodItems[targetIndex] = {
        ...foodItems[targetIndex],
        quantityInGram: String(quantity),
      };
      this.applyFoodItems(foodItems);
      wx.showToast({
        title: "已合并到清单",
        icon: "none",
      });
      return;
    }

    foodItems.push({
      ...food,
      quantityInGram: String(DEFAULT_QUANTITY),
      totalCalories: toInteger(food.caloriesPer100g),
    });
    this.applyFoodItems(foodItems);
  },

  handleQuantityInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const value = event.detail.value;
    const foodItems = [...this.data.foodItems];
    foodItems[index] = {
      ...foodItems[index],
      quantityInGram: value,
    };
    this.applyFoodItems(foodItems);
  },

  handleRemoveFood(event) {
    const index = Number(event.currentTarget.dataset.index);
    const foodItems = this.data.foodItems.filter((_, itemIndex) => itemIndex !== index);
    this.applyFoodItems(foodItems);
  },

  applyFoodItems(foodItems) {
    const normalized = foodItems.map(decorateItem);
    const mealTotalCalories = normalized.reduce((sum, item) => sum + item.totalCalories, 0);
    this.setData({
      foodItems: normalized,
      mealTotalCalories,
    });
  },

  validateItems() {
    if (!this.data.foodItems.length) {
      wx.showToast({
        title: "请先添加食物",
        icon: "none",
      });
      return false;
    }

    const invalidItem = this.data.foodItems.find((item) => toNumber(item.quantityInGram) <= 0);
    if (invalidItem) {
      wx.showToast({
        title: `请检查${invalidItem.name}的克数`,
        icon: "none",
      });
      return false;
    }

    return true;
  },

  handleSubmit() {
    if (!this.validateItems()) {
      return;
    }

    const { mealType, recordDate, foodItems } = this.data;
    const payload = {
      userId: DEFAULT_USER_ID,
      mealType,
      recordDate,
      items: foodItems.map((item) => ({
        foodId: item.id,
        quantityInGram: toNumber(item.quantityInGram),
      })),
    };

    createRecordBatch(payload)
      .then(() => {
        foodItems.forEach((item) => {
          saveRecentFood(DEFAULT_USER_ID, item);
        });

        app.globalData.refreshHomeOnShow = true;
        wx.showToast({
          title: "已完成",
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
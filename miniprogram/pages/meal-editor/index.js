const { createRecordBatch, deleteRecord, getRecords, updateRecord } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
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

function isEditMode(mode) {
  return mode === "edit";
}

function hasQuantityChanged(item) {
  if (!item.recordId) {
    return false;
  }

  const currentQuantity = toNumber(item.quantityInGram);
  const originQuantity = toNumber(item.originQuantityInGram);
  return Math.abs(currentQuantity - originQuantity) > 0.0001;
}

function normalizeFood(food) {
  return {
    id: food.id,
    recordId: null,
    name: food.name,
    category: food.category,
    categoryLabel: food.categoryLabel || food.category,
    caloriesPer100g: toInteger(food.caloriesPer100g),
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
    quantityInGram: String(DEFAULT_QUANTITY),
    originQuantityInGram: null,
  };
}

function normalizeRecord(record) {
  return {
    id: record.foodId,
    recordId: record.id,
    name: record.foodName,
    category: "",
    categoryLabel: "",
    caloriesPer100g: toInteger(record.caloriesPer100g),
    proteinPer100g: toInteger(record.proteinPer100g),
    carbsPer100g: toInteger(record.carbsPer100g),
    fatPer100g: toInteger(record.fatPer100g),
    quantityInGram: String(toNumber(record.quantityInGram)),
    originQuantityInGram: toNumber(record.quantityInGram),
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
    mode: "create",
    mealType: "BREAKFAST",
    mealLabel: "早餐",
    recordDate: getToday(),
    foodItems: [],
    deletedRecordIds: [],
    mealTotalCalories: 0,
  },

  onLoad(options) {
    const mealType = options.mealType || "BREAKFAST";
    const recordDate = options.recordDate || getToday();
    const mode = isEditMode(options.mode) ? "edit" : "create";

    this.setData({
      mode,
      mealType,
      mealLabel: MEAL_TYPE_LABELS[mealType] || "早餐",
      recordDate,
    });

    wx.setNavigationBarTitle({
      title: mode === "edit" ? "编辑餐次" : "添加餐次",
    });

    if (mode === "edit") {
      this.loadMealRecords();
    }
  },

  loadMealRecords() {
    const { mealType, recordDate } = this.data;
    getRecords({ date: recordDate, mealType })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        this.applyFoodItems(records.map(normalizeRecord));
        this.setData({ deletedRecordIds: [] });
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
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

    foodItems.push(food);
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
    const targetItem = this.data.foodItems[index];
    const foodItems = this.data.foodItems.filter((_, itemIndex) => itemIndex !== index);

    if (targetItem && targetItem.recordId) {
      const deletedRecordIds = [...this.data.deletedRecordIds];
      if (!deletedRecordIds.includes(targetItem.recordId)) {
        deletedRecordIds.push(targetItem.recordId);
      }
      this.setData({ deletedRecordIds });
    }

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

  hasPendingChanges() {
    if (this.data.deletedRecordIds.length > 0) {
      return true;
    }

    if (this.data.foodItems.some((item) => !item.recordId)) {
      return true;
    }

    return this.data.foodItems.some((item) => hasQuantityChanged(item));
  },

  validateItems() {
    const isEdit = this.data.mode === "edit";

    if (!this.data.foodItems.length) {
      if (isEdit && this.data.deletedRecordIds.length > 0) {
        return true;
      }

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

    if (isEdit && !this.hasPendingChanges()) {
      wx.showToast({
        title: "没有可保存的变更",
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

    if (this.data.mode === "edit") {
      this.submitEdit();
      return;
    }

    this.submitCreate();
  },

  submitCreate() {
    const { mealType, recordDate, foodItems } = this.data;
    const payload = {
      mealType,
      recordDate,
      items: foodItems.map((item) => ({
        foodId: item.id,
        quantityInGram: toNumber(item.quantityInGram),
      })),
    };

    createRecordBatch(payload)
      .then(() => {
        this.handleSubmitSuccess();
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  submitEdit() {
    const { mealType, recordDate, foodItems, deletedRecordIds } = this.data;

    const updateTasks = foodItems
      .filter((item) => item.recordId && hasQuantityChanged(item))
      .map((item) => updateRecord(item.recordId, {
        quantityInGram: toNumber(item.quantityInGram),
      }));

    const deleteTasks = deletedRecordIds.map((recordId) => deleteRecord(recordId));

    const newItems = foodItems.filter((item) => !item.recordId);
    const createTasks = newItems.length
      ? [createRecordBatch({
        mealType,
        recordDate,
        items: newItems.map((item) => ({
          foodId: item.id,
          quantityInGram: toNumber(item.quantityInGram),
        })),
      })]
      : [];

    Promise.all([...updateTasks, ...deleteTasks, ...createTasks])
      .then(() => {
        this.handleSubmitSuccess();
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  handleSubmitSuccess() {
    const userId = getCurrentUserId();
    if (userId) {
      this.data.foodItems.forEach((item) => {
        saveRecentFood(userId, item);
      });
    }

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
  },
});

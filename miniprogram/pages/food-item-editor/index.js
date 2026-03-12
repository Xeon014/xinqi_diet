const { createRecord, deleteRecord, getRecords, updateRecord } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { saveRecentFood } = require("../../utils/recent-foods");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();
const DEFAULT_QUANTITY = 100;
const DEFAULT_MEAL_TYPE = "BREAKFAST";
const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

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

function normalizeFoodPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (!payload.id) {
    return null;
  }
  return {
    id: payload.id,
    name: payload.name || "食物",
    category: payload.category || "",
    categoryLabel: payload.categoryLabel || payload.category || "",
    caloriesPer100g: toInteger(payload.caloriesPer100g),
    proteinPer100g: toInteger(payload.proteinPer100g),
    carbsPer100g: toInteger(payload.carbsPer100g),
    fatPer100g: toInteger(payload.fatPer100g),
  };
}

function parseFoodParam(rawFood) {
  if (!rawFood) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(rawFood));
    return normalizeFoodPayload(parsed);
  } catch (error) {
    return null;
  }
}

function buildFoodSearchUrl({ mealType, recordDate, source }) {
  return `/pages/food-search/index?mealType=${encodeURIComponent(mealType)}&recordDate=${encodeURIComponent(recordDate)}&source=${encodeURIComponent(source)}`;
}

function resolveTotalNutrients({ quantityInGram, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g }) {
  const quantity = Math.max(toNumber(quantityInGram), 0);
  return {
    totalCalories: toInteger((toNumber(caloriesPer100g) * quantity) / 100),
    totalProtein: toInteger((toNumber(proteinPer100g) * quantity) / 100),
    totalCarbs: toInteger((toNumber(carbsPer100g) * quantity) / 100),
    totalFat: toInteger((toNumber(fatPer100g) * quantity) / 100),
  };
}

Page({
  data: {
    mode: "create",
    source: "home",
    recordDate: getToday(),
    mealType: DEFAULT_MEAL_TYPE,
    mealTypeLabel: MEAL_TYPE_LABELS[DEFAULT_MEAL_TYPE],
    recordId: null,
    foodId: null,
    foodName: "",
    categoryLabel: "",
    caloriesPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    quantityInGram: String(DEFAULT_QUANTITY),
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    canDelete: false,
    loading: false,
  },

  onLoad(options = {}) {
    const mode = isEditMode(options.mode) ? "edit" : "create";
    const source = options.source || "home";
    const recordDate = options.recordDate || getToday();
    const mealType = options.mealType || DEFAULT_MEAL_TYPE;
    const recordId = options.recordId ? Number(options.recordId) : null;

    this.setData({
      mode,
      source,
      recordDate,
      mealType,
      mealTypeLabel: MEAL_TYPE_LABELS[mealType] || "餐次",
      recordId,
      canDelete: mode === "edit" && Number.isFinite(recordId) && recordId > 0,
    });

    if (mode === "edit") {
      this.loadRecord();
      return;
    }

    const food = parseFoodParam(options.food);
    if (!food) {
      wx.showToast({ title: "食物信息无效", icon: "none" });
      this.goHome();
      return;
    }

    this.applyFoodData(food, String(DEFAULT_QUANTITY));
  },

  applyFoodData(food, quantityInGram) {
    const totals = resolveTotalNutrients({
      quantityInGram,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
    });

    this.setData({
      foodId: food.id,
      foodName: food.name,
      categoryLabel: food.categoryLabel || food.category || "",
      caloriesPer100g: toInteger(food.caloriesPer100g),
      proteinPer100g: toInteger(food.proteinPer100g),
      carbsPer100g: toInteger(food.carbsPer100g),
      fatPer100g: toInteger(food.fatPer100g),
      quantityInGram,
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalCarbs: totals.totalCarbs,
      totalFat: totals.totalFat,
    });
  },

  loadRecord() {
    if (!this.data.recordId) {
      wx.showToast({ title: "记录不存在", icon: "none" });
      this.goHome();
      return;
    }

    getRecords({
      date: this.data.recordDate,
      mealType: this.data.mealType,
    })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        const targetRecord = records.find((item) => Number(item.id) === Number(this.data.recordId));
        if (!targetRecord) {
          wx.showToast({ title: "记录不存在或已删除", icon: "none" });
          this.goHome();
          return;
        }

        this.applyFoodData({
          id: targetRecord.foodId,
          name: targetRecord.foodName,
          category: "",
          categoryLabel: this.data.mealTypeLabel,
          caloriesPer100g: targetRecord.caloriesPer100g,
          proteinPer100g: targetRecord.proteinPer100g,
          carbsPer100g: targetRecord.carbsPer100g,
          fatPer100g: targetRecord.fatPer100g,
        }, String(toNumber(targetRecord.quantityInGram) || DEFAULT_QUANTITY));
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
        this.goHome();
      });
  },

  handleQuantityInput(event) {
    const quantityInGram = event.detail.value;
    const totals = resolveTotalNutrients({
      quantityInGram,
      caloriesPer100g: this.data.caloriesPer100g,
      proteinPer100g: this.data.proteinPer100g,
      carbsPer100g: this.data.carbsPer100g,
      fatPer100g: this.data.fatPer100g,
    });

    this.setData({
      quantityInGram,
      totalCalories: totals.totalCalories,
      totalProtein: totals.totalProtein,
      totalCarbs: totals.totalCarbs,
      totalFat: totals.totalFat,
    });
  },

  validateQuantity() {
    if (toNumber(this.data.quantityInGram) <= 0) {
      wx.showToast({ title: "请输入正确重量", icon: "none" });
      return false;
    }
    return true;
  },

  handleAddAndContinue() {
    this.saveRecord(true);
  },

  handleAdd() {
    this.saveRecord(false);
  },

  saveRecord(continueAdd) {
    if (this.data.loading) {
      return;
    }
    if (!this.validateQuantity()) {
      return;
    }

    const quantityInGram = toNumber(this.data.quantityInGram);
    const saveTask = this.data.mode === "edit"
      ? updateRecord(this.data.recordId, { quantityInGram })
      : createRecord({
        foodId: this.data.foodId,
        mealType: this.data.mealType,
        quantityInGram,
        recordDate: this.data.recordDate,
      });

    this.setData({ loading: true });
    saveTask
      .then(() => {
        const userId = getCurrentUserId();
        if (userId) {
          saveRecentFood(userId, {
            id: this.data.foodId,
            name: this.data.foodName,
            caloriesPer100g: this.data.caloriesPer100g,
            proteinPer100g: this.data.proteinPer100g,
            carbsPer100g: this.data.carbsPer100g,
            fatPer100g: this.data.fatPer100g,
            category: this.data.categoryLabel,
          });
        }

        app.globalData.refreshHomeOnShow = true;
        wx.showToast({ title: "已保存", icon: "success" });
        setTimeout(() => {
          if (continueAdd) {
            wx.redirectTo({
              url: buildFoodSearchUrl({
                mealType: this.data.mealType,
                recordDate: this.data.recordDate,
                source: this.data.source || "home",
              }),
            });
            return;
          }
          this.goHome();
        }, 320);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleDelete() {
    if (!this.data.canDelete || this.data.loading) {
      return;
    }

    wx.showModal({
      title: "删除食物记录",
      content: "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        this.setData({ loading: true });
        deleteRecord(this.data.recordId)
          .then(() => {
            app.globalData.refreshHomeOnShow = true;
            wx.showToast({ title: "已删除", icon: "success" });
            setTimeout(() => {
              this.goHome();
            }, 320);
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          })
          .finally(() => {
            this.setData({ loading: false });
          });
      },
    });
  },

  handleClose() {
    wx.navigateBack({
      fail: () => {
        this.goHome();
      },
    });
  },

  goHome() {
    wx.switchTab({ url: "/pages/home/index" });
  },
});

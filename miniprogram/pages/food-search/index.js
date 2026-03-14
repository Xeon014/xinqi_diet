const { searchFoods } = require("../../services/food");
const { getMealComboDetail, getMealComboList } = require("../../services/meal-combo");
const { createRecord, createRecordBatch, deleteRecord, getRecords, updateRecord } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { decorateFood, filterFoodsByCategory, FOOD_CATEGORIES, isBuiltinFood, isCustomFood } = require("../../utils/food");
const { getRecentFoods, saveRecentFood } = require("../../utils/recent-foods");
const {
  clearRecentFoodSearches,
  getRecentFoodSearches,
  saveRecentFoodSearch,
} = require("../../utils/recent-food-searches");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

const DEFAULT_QUANTITY = 100;
const FILTER_KEYS = {
  RECENT: "RECENT",
  RECENT_SEARCH: "RECENT_SEARCH",
  CUSTOM: "CUSTOM",
  COMBO: "COMBO",
};
const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};
const MEAL_TYPE_OPTIONS = Object.keys(MEAL_TYPE_LABELS).map((key) => ({
  key,
  label: MEAL_TYPE_LABELS[key],
}));
const EDITOR_TYPES = {
  FOOD: "FOOD",
  COMBO: "COMBO",
};

function syncNavigationTitle(pageMode) {
  wx.setNavigationBarTitle({
    title: pageMode === "edit" ? "编辑饮食" : "添加食物",
  });
}

function buildSystemFilters(canUseComboFilter) {
  const filters = [
    { key: FILTER_KEYS.RECENT, label: "最近记录" },
    { key: FILTER_KEYS.RECENT_SEARCH, label: "最近搜索" },
    { key: FILTER_KEYS.CUSTOM, label: "自定义" },
  ];

  if (canUseComboFilter) {
    filters.push({ key: FILTER_KEYS.COMBO, label: "套餐" });
  }

  return filters;
}

const BUILTIN_CATEGORIES = FOOD_CATEGORIES.filter((item) => item.key !== "ALL");

function getMealTypeLabel(mealType) {
  return MEAL_TYPE_LABELS[mealType] || "餐次";
}

function getMealTypeIndex(mealType) {
  const index = MEAL_TYPE_OPTIONS.findIndex((item) => item.key === mealType);
  return index >= 0 ? index : 0;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
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

function includesComboKeyword(combo, keyword) {
  if (!keyword) {
    return true;
  }
  const normalizedKeyword = keyword.toLowerCase();
  return String(combo.name || "").toLowerCase().includes(normalizedKeyword)
    || String(combo.description || "").toLowerCase().includes(normalizedKeyword);
}

function getKeywordFromConfirmEvent(event, fallbackKeyword) {
  if (event && event.detail && typeof event.detail.value === "string") {
    return event.detail.value;
  }
  return fallbackKeyword;
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

function buildComboSummary(items = []) {
  return items.reduce(
    (result, item) => {
      const quantityInGram = Math.max(toNumber(item.quantityInGram), 0);
      result.totalCalories += toInteger((toNumber(item.caloriesPer100g) * quantityInGram) / 100);
      result.foodCount += 1;
      return result;
    },
    { totalCalories: 0, foodCount: 0 }
  );
}

function decorateCombo(combo) {
  const summary = buildComboSummary(combo.items || []);
  return {
    ...combo,
    totalCalories: summary.totalCalories,
    foodCount: summary.foodCount,
  };
}

function normalizeComboEditorItem(item) {
  return {
    foodId: item.foodId,
    foodName: item.foodName || "食物",
    quantityInGram: String(toNumber(item.quantityInGram) || DEFAULT_QUANTITY),
    caloriesPer100g: toInteger(item.caloriesPer100g),
    proteinPer100g: toInteger(item.proteinPer100g),
    carbsPer100g: toInteger(item.carbsPer100g),
    fatPer100g: toInteger(item.fatPer100g),
    category: item.category || "",
  };
}

Page({
  data: {
    keyword: "",
    isSearching: false,
    showRecentSearchList: false,
    showFoodSection: false,
    showComboSection: false,
    showCustomCreateAction: false,
    canUseComboFilter: false,
    systemFilters: buildSystemFilters(false),
    builtinCategories: BUILTIN_CATEGORIES,
    selectedCategoryKey: FILTER_KEYS.RECENT,
    currentCategoryLabel: "最近记录",
    foods: [],
    combos: [],
    recentFoods: [],
    recentSearches: [],
    displayedFoods: [],
    displayedCombos: [],
    emptyTitle: "最近记录为空",
    emptyDescription: "先记录一次饮食，常用食物会出现在这里。",
    recordDate: getToday(),
    mealType: "BREAKFAST",
    mealTypeLabel: MEAL_TYPE_LABELS.BREAKFAST,
    source: "",
    enableDirectEdit: false,
    pageMode: "create",
    pageRecordId: null,
    mealTypeOptions: MEAL_TYPE_OPTIONS,
    editorVisible: false,
    editorType: EDITOR_TYPES.FOOD,
    editorMode: "create",
    editorLoading: false,
    editorCanDelete: false,
    editorRecordId: null,
    editorMealType: "BREAKFAST",
    editorMealTypeIndex: 0,
    editorMealTypeLabel: MEAL_TYPE_LABELS.BREAKFAST,
    editorRecordDate: getToday(),
    editorFoodId: null,
    editorFoodName: "",
    editorCategoryLabel: "",
    editorComboId: null,
    editorComboName: "",
    editorComboItems: [],
    editorCaloriesPer100g: 0,
    editorProteinPer100g: 0,
    editorCarbsPer100g: 0,
    editorFatPer100g: 0,
    editorQuantityInGram: String(DEFAULT_QUANTITY),
    editorTotalCalories: 0,
    editorTotalProtein: 0,
    editorTotalCarbs: 0,
    editorTotalFat: 0,
  },

  onLoad(options = {}) {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.userId = getCurrentUserId();

    const recordDate = options.recordDate || getToday();
    const mealType = options.mealType || "BREAKFAST";
    const source = options.source || "";
    const pageMode = options.mode === "edit" ? "edit" : "create";
    const parsedRecordId = Number(options.recordId);
    const pageRecordId = Number.isFinite(parsedRecordId) && parsedRecordId > 0 ? parsedRecordId : null;
    const enableDirectEdit = Boolean(source) || pageMode === "edit";
    const canUseComboFilter = enableDirectEdit && pageMode === "create";

    syncNavigationTitle(pageMode);

    this.setData(
      {
        recordDate,
        mealType,
        mealTypeLabel: MEAL_TYPE_LABELS[mealType] || "餐次",
        source,
        enableDirectEdit,
        pageMode,
        pageRecordId,
        canUseComboFilter,
        systemFilters: buildSystemFilters(canUseComboFilter),
      },
      () => {
        this.loadRecentSearches();
        this.loadFoods();
        if (canUseComboFilter) {
          this.loadCombos();
        }

        if (pageMode === "edit") {
          if (!pageRecordId) {
            wx.showToast({ title: "记录不存在", icon: "none" });
            this.goHome();
            return;
          }
          this.openEditorByRecordId(pageRecordId);
        }
      }
    );
  },

  onShow() {
    if (this.data.canUseComboFilter) {
      this.loadCombos();
    }
  },

  loadFoods() {
    searchFoods("")
      .then((data) => {
        const foods = (data.foods || []).map((food) => normalizeFood(decorateFood(food)));
        const recentFoods = this.userId
          ? getRecentFoods(this.userId).map((food) => normalizeFood(decorateFood(food)))
          : [];

        this.setData(
          {
            foods,
            recentFoods,
          },
          () => {
            this.refreshView();
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

  loadCombos() {
    getMealComboList()
      .then((result) => {
        this.setData({ combos: (result.combos || []).map(decorateCombo) }, () => {
          this.refreshView();
        });
      })
      .catch(() => {
        this.setData({ combos: [] }, () => {
          this.refreshView();
        });
      });
  },

  loadRecentSearches() {
    this.setData(
      {
        recentSearches: getRecentFoodSearches(this.userId),
      },
      () => {
        this.refreshView();
      }
    );
  },

  handleInput(event) {
    const keyword = String(event.detail.value || "");
    this.setData(
      {
        keyword,
        isSearching: Boolean(keyword.trim()),
      },
      () => {
        this.refreshView();
      }
    );
  },

  handleSearchConfirm(event) {
    const keyword = getKeywordFromConfirmEvent(event, this.data.keyword).trim();

    this.setData(
      {
        keyword,
        isSearching: Boolean(keyword),
      },
      () => {
        if (keyword && this.userId) {
          saveRecentFoodSearch(this.userId, keyword);
          this.loadRecentSearches();
          return;
        }
        this.refreshView();
      }
    );
  },

  handleCategoryTap(event) {
    this.setData(
      {
        selectedCategoryKey: event.currentTarget.dataset.key,
      },
      () => {
        this.refreshView();
      }
    );
  },

  handleTapRecentSearch(event) {
    const keyword = String(event.currentTarget.dataset.keyword || "").trim();
    if (!keyword) {
      return;
    }

    this.setData(
      {
        keyword,
        isSearching: true,
      },
      () => {
        if (this.userId) {
          saveRecentFoodSearch(this.userId, keyword);
          this.loadRecentSearches();
          return;
        }
        this.refreshView();
      }
    );
  },

  handleClearRecentSearches() {
    clearRecentFoodSearches(this.userId);
    this.setData({ recentSearches: [] }, () => {
      this.refreshView();
    });
  },

  handleOpenCustomFood() {
    wx.navigateTo({
      url: "/pages/custom-food/index?mode=create&from=selector",
      success: (res) => {
        res.eventChannel.on("foodCreated", (food) => {
          const normalizedFood = normalizeFood(decorateFood(food));

          if (this.data.enableDirectEdit) {
            const nextFoods = [
              normalizedFood,
              ...this.data.foods.filter((item) => Number(item.id) !== Number(normalizedFood.id)),
            ];
            this.setData({ foods: nextFoods }, () => {
              this.refreshView();
              this.openFoodEditor(normalizedFood);
            });
            return;
          }

          if (this.openerEventChannel) {
            this.openerEventChannel.emit("foodSelected", normalizedFood);
            setTimeout(() => {
              wx.navigateBack();
            }, 320);
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

    if (this.data.enableDirectEdit) {
      this.openFoodEditor(food);
      return;
    }

    if (this.openerEventChannel) {
      this.openerEventChannel.emit("foodSelected", food);
      wx.navigateBack();
      return;
    }

    wx.navigateBack();
  },

  handleSelectCombo(event) {
    const index = Number(event.currentTarget.dataset.index);
    const combo = this.data.displayedCombos[index];
    if (!combo || !this.data.canUseComboFilter) {
      return;
    }

    getMealComboDetail(combo.id)
      .then((detail) => {
        const items = Array.isArray(detail.items) ? detail.items.map(normalizeComboEditorItem) : [];
        if (!items.length) {
          wx.showToast({ title: "该套餐暂无食物", icon: "none" });
          return;
        }
        this.openComboEditor(detail, items);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  openFoodEditor(food) {
    const normalizedFood = normalizeFood(food);
    this.applyEditorFoodData(normalizedFood, String(DEFAULT_QUANTITY), {
      mode: "create",
      recordId: null,
      canDelete: false,
      mealType: this.data.mealType,
      recordDate: this.data.recordDate,
    });
  },

  openComboEditor(combo, items) {
    const summary = buildComboSummary(items);
    this.setData({
      editorVisible: true,
      editorType: EDITOR_TYPES.COMBO,
      editorMode: "create",
      editorCanDelete: false,
      editorRecordId: null,
      editorLoading: false,
      editorMealType: this.data.mealType,
      editorMealTypeIndex: getMealTypeIndex(this.data.mealType),
      editorMealTypeLabel: getMealTypeLabel(this.data.mealType),
      editorRecordDate: this.data.recordDate,
      editorComboId: combo.id,
      editorComboName: combo.name || "套餐",
      editorComboItems: items,
      editorFoodId: null,
      editorFoodName: "",
      editorCategoryLabel: "",
      editorCaloriesPer100g: 0,
      editorProteinPer100g: 0,
      editorCarbsPer100g: 0,
      editorFatPer100g: 0,
      editorQuantityInGram: String(DEFAULT_QUANTITY),
      editorTotalCalories: summary.totalCalories,
      editorTotalProtein: 0,
      editorTotalCarbs: 0,
      editorTotalFat: 0,
    });
  },

  openEditorByRecordId(recordId) {
    this.setData({
      editorVisible: true,
      editorMode: "edit",
      editorCanDelete: false,
      editorRecordId: recordId,
      editorLoading: true,
    });

    getRecords({
      date: this.data.recordDate,
      mealType: this.data.mealType,
    })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        const targetRecord = records.find((item) => Number(item.id) === Number(recordId));
        if (!targetRecord) {
          wx.showToast({ title: "记录不存在或已删除", icon: "none" });
          this.goHome();
          return;
        }

        this.applyEditorFoodData(
          {
            id: targetRecord.foodId,
            name: targetRecord.foodName,
            category: "",
            categoryLabel: "",
            caloriesPer100g: targetRecord.caloriesPer100g,
            proteinPer100g: targetRecord.proteinPer100g,
            carbsPer100g: targetRecord.carbsPer100g,
            fatPer100g: targetRecord.fatPer100g,
          },
          String(toNumber(targetRecord.quantityInGram) || DEFAULT_QUANTITY),
          {
            mode: "edit",
            recordId: Number(targetRecord.id),
            canDelete: true,
            mealType: targetRecord.mealType,
            recordDate: targetRecord.recordDate,
          }
        );
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
        this.goHome();
      })
      .finally(() => {
        this.setData({ editorLoading: false });
      });
  },

  applyEditorFoodData(food, quantityInGram, options = {}) {
    const normalizedFood = normalizeFood(food);
    const nextQuantity = String(quantityInGram || DEFAULT_QUANTITY);
    const editorMealType = options.mealType || this.data.mealType;
    const totals = resolveTotalNutrients({
      quantityInGram: nextQuantity,
      caloriesPer100g: normalizedFood.caloriesPer100g,
      proteinPer100g: normalizedFood.proteinPer100g,
      carbsPer100g: normalizedFood.carbsPer100g,
      fatPer100g: normalizedFood.fatPer100g,
    });

    this.setData({
      editorVisible: true,
      editorType: EDITOR_TYPES.FOOD,
      editorMode: options.mode || "create",
      editorCanDelete: Boolean(options.canDelete),
      editorRecordId: options.recordId || null,
      editorLoading: false,
      editorMealType,
      editorMealTypeIndex: getMealTypeIndex(editorMealType),
      editorMealTypeLabel: getMealTypeLabel(editorMealType),
      editorRecordDate: options.recordDate || this.data.recordDate,
      editorFoodId: normalizedFood.id,
      editorFoodName: normalizedFood.name || "食物",
      editorCategoryLabel: normalizedFood.categoryLabel || normalizedFood.category || "",
      editorComboId: null,
      editorComboName: "",
      editorComboItems: [],
      editorCaloriesPer100g: toInteger(normalizedFood.caloriesPer100g),
      editorProteinPer100g: toInteger(normalizedFood.proteinPer100g),
      editorCarbsPer100g: toInteger(normalizedFood.carbsPer100g),
      editorFatPer100g: toInteger(normalizedFood.fatPer100g),
      editorQuantityInGram: nextQuantity,
      editorTotalCalories: totals.totalCalories,
      editorTotalProtein: totals.totalProtein,
      editorTotalCarbs: totals.totalCarbs,
      editorTotalFat: totals.totalFat,
    });
  },

  handleEditorMealTypeChange(event) {
    if (this.data.editorLoading) {
      return;
    }

    const index = Number(event.detail.value);
    const option = this.data.mealTypeOptions[index];
    if (!option || option.key === this.data.editorMealType) {
      return;
    }

    this.setData({
      editorMealType: option.key,
      editorMealTypeIndex: index,
      editorMealTypeLabel: option.label,
    });
  },

  handleEditorDateChange(event) {
    if (this.data.editorLoading) {
      return;
    }

    const editorRecordDate = event.detail.value;
    if (!editorRecordDate) {
      return;
    }

    this.setData({ editorRecordDate });
  },

  handleEditorQuantityInput(event) {
    const editorQuantityInGram = event.detail.value;
    const totals = resolveTotalNutrients({
      quantityInGram: editorQuantityInGram,
      caloriesPer100g: this.data.editorCaloriesPer100g,
      proteinPer100g: this.data.editorProteinPer100g,
      carbsPer100g: this.data.editorCarbsPer100g,
      fatPer100g: this.data.editorFatPer100g,
    });

    this.setData({
      editorQuantityInGram,
      editorTotalCalories: totals.totalCalories,
      editorTotalProtein: totals.totalProtein,
      editorTotalCarbs: totals.totalCarbs,
      editorTotalFat: totals.totalFat,
    });
  },

  handleComboItemQuantityInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    const editorComboItems = this.data.editorComboItems.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }
      return {
        ...item,
        quantityInGram: event.detail.value,
      };
    });
    const summary = buildComboSummary(editorComboItems);

    this.setData({
      editorComboItems,
      editorTotalCalories: summary.totalCalories,
    });
  },

  validateEditorQuantity() {
    if (toNumber(this.data.editorQuantityInGram) <= 0) {
      wx.showToast({ title: "请输入正确重量", icon: "none" });
      return false;
    }
    return true;
  },

  validateComboEditor() {
    if (!this.data.editorComboItems.length) {
      wx.showToast({ title: "该套餐暂无食物", icon: "none" });
      return false;
    }

    const invalidItem = this.data.editorComboItems.find((item) => toNumber(item.quantityInGram) <= 0);
    if (invalidItem) {
      wx.showToast({ title: `请检查 ${invalidItem.foodName} 的克数`, icon: "none" });
      return false;
    }
    return true;
  },

  validateEditor() {
    if (!this.data.editorMealType || !this.data.editorRecordDate) {
      wx.showToast({ title: "请先选择餐次和日期", icon: "none" });
      return false;
    }

    if (this.data.editorType === EDITOR_TYPES.COMBO) {
      return this.validateComboEditor();
    }

    return this.validateEditorQuantity();
  },

  saveRecentFoods(items) {
    if (!this.userId) {
      return;
    }

    items.forEach((item) => {
      saveRecentFood(this.userId, {
        id: item.foodId,
        name: item.foodName,
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        category: item.category || "",
      });
    });
  },

  syncHomeAfterSave(recordDate) {
    app.globalData.refreshHomeOnShow = true;
    if (this.data.source === "home") {
      app.globalData.pendingHomeRecordDate = recordDate;
    }
  },

  handleEditorSubmit() {
    if (this.data.editorLoading) {
      return;
    }
    if (!this.validateEditor()) {
      return;
    }

    const saveTask = this.data.editorType === EDITOR_TYPES.COMBO
      ? createRecordBatch({
        mealType: this.data.editorMealType,
        recordDate: this.data.editorRecordDate,
        items: this.data.editorComboItems.map((item) => ({
          foodId: item.foodId,
          quantityInGram: toNumber(item.quantityInGram),
        })),
      })
      : (() => {
        const quantityInGram = toNumber(this.data.editorQuantityInGram);
        return this.data.editorMode === "edit"
          ? updateRecord(this.data.editorRecordId, {
            quantityInGram,
            mealType: this.data.editorMealType,
            recordDate: this.data.editorRecordDate,
          })
          : createRecord({
            foodId: this.data.editorFoodId,
            mealType: this.data.editorMealType,
            quantityInGram,
            recordDate: this.data.editorRecordDate,
          });
      })();

    this.setData({ editorLoading: true });
    saveTask
      .then(() => {
        if (this.data.editorType === EDITOR_TYPES.COMBO) {
          this.saveRecentFoods(this.data.editorComboItems);
        } else {
          this.saveRecentFoods([{
            foodId: this.data.editorFoodId,
            foodName: this.data.editorFoodName,
            caloriesPer100g: this.data.editorCaloriesPer100g,
            proteinPer100g: this.data.editorProteinPer100g,
            carbsPer100g: this.data.editorCarbsPer100g,
            fatPer100g: this.data.editorFatPer100g,
            category: this.data.editorCategoryLabel,
          }]);
        }

        this.syncHomeAfterSave(this.data.editorRecordDate);
        wx.showToast({
          title: this.data.editorType === EDITOR_TYPES.COMBO ? "套餐已添加" : "已保存",
          icon: "success",
        });
        setTimeout(() => {
          if (this.data.editorType === EDITOR_TYPES.COMBO || this.data.editorMode === "edit" || this.data.enableDirectEdit) {
            this.goHome();
            return;
          }
          this.closeEditor();
        }, 320);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ editorLoading: false });
      });
  },

  handleEditorDelete() {
    if (this.data.editorType !== EDITOR_TYPES.FOOD || !this.data.editorCanDelete || this.data.editorLoading) {
      return;
    }

    wx.showModal({
      title: "删除食物记录",
      content: "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        this.setData({ editorLoading: true });
        deleteRecord(this.data.editorRecordId)
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
            this.setData({ editorLoading: false });
          });
      },
    });
  },

  handleEditorClose() {
    if (this.data.editorLoading) {
      return;
    }

    if (this.data.editorMode === "edit") {
      this.goHome();
      return;
    }

    this.closeEditor();
  },

  closeEditor() {
    this.setData({
      editorVisible: false,
      editorType: EDITOR_TYPES.FOOD,
      editorMode: "create",
      editorCanDelete: false,
      editorRecordId: null,
      editorLoading: false,
      editorMealType: this.data.mealType,
      editorMealTypeIndex: getMealTypeIndex(this.data.mealType),
      editorMealTypeLabel: getMealTypeLabel(this.data.mealType),
      editorRecordDate: this.data.recordDate,
      editorFoodId: null,
      editorFoodName: "",
      editorCategoryLabel: "",
      editorComboId: null,
      editorComboName: "",
      editorComboItems: [],
      editorCaloriesPer100g: 0,
      editorProteinPer100g: 0,
      editorCarbsPer100g: 0,
      editorFatPer100g: 0,
      editorQuantityInGram: String(DEFAULT_QUANTITY),
      editorTotalCalories: 0,
      editorTotalProtein: 0,
      editorTotalCarbs: 0,
      editorTotalFat: 0,
    });
  },

  noop() {
  },

  goHome() {
    wx.switchTab({ url: "/pages/home/index" });
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
      .filter((food) => isCustomFood(food))
      .filter((food) => includesKeyword(food, keyword));
  },

  buildBuiltinFoods(keyword, categoryKey) {
    return filterFoodsByCategory(this.data.foods, categoryKey)
      .filter((food) => isBuiltinFood(food))
      .filter((food) => includesKeyword(food, keyword));
  },

  buildAllFoods(keyword) {
    return this.data.foods.filter((food) => includesKeyword(food, keyword));
  },

  buildCombos(keyword) {
    return this.data.combos.filter((combo) => includesComboKeyword(combo, keyword));
  },

  resolveEmptyState({ categoryKey, isSearching }) {
    if (isSearching) {
      return {
        emptyTitle: "没有找到食物",
        emptyDescription: "换个关键词试试",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT) {
      return {
        emptyTitle: "最近记录为空",
        emptyDescription: "先记录一次饮食，常用食物会出现在这里。",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT_SEARCH) {
      return {
        emptyTitle: "暂无最近搜索",
        emptyDescription: "先搜索一次食物，这里会保留关键词。",
      };
    }

    if (categoryKey === FILTER_KEYS.CUSTOM) {
      return {
        emptyTitle: "暂无自定义食物",
        emptyDescription: "可在右上角添加自定义食物。",
      };
    }

    if (categoryKey === FILTER_KEYS.COMBO) {
      return {
        emptyTitle: "暂无自定义套餐",
        emptyDescription: "先去自定义套餐里创建常用套餐。",
      };
    }

    return {
      emptyTitle: "当前分类暂无食物",
      emptyDescription: "试试切换分类，或添加自定义食物。",
    };
  },

  refreshView() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const isSearching = Boolean(keyword);
    const currentCategoryKey = this.data.selectedCategoryKey;

    let displayedFoods = [];
    let displayedCombos = [];
    let showRecentSearchList = false;
    let showCustomCreateAction = false;
    let currentCategoryLabel = this.getCategoryLabel(currentCategoryKey);

    if (isSearching) {
      displayedFoods = this.buildAllFoods(keyword);
      currentCategoryLabel = "搜索结果";
    } else if (currentCategoryKey === FILTER_KEYS.RECENT) {
      displayedFoods = this.buildRecentFoods(keyword);
    } else if (currentCategoryKey === FILTER_KEYS.RECENT_SEARCH) {
      showRecentSearchList = true;
    } else if (currentCategoryKey === FILTER_KEYS.CUSTOM) {
      displayedFoods = this.buildCustomFoods(keyword);
      showCustomCreateAction = true;
    } else if (currentCategoryKey === FILTER_KEYS.COMBO && this.data.canUseComboFilter) {
      displayedCombos = this.buildCombos(keyword);
    } else {
      displayedFoods = this.buildBuiltinFoods(keyword, currentCategoryKey);
    }

    const emptyState = this.resolveEmptyState({
      categoryKey: currentCategoryKey,
      isSearching,
    });

    this.setData({
      isSearching,
      displayedFoods,
      displayedCombos,
      showRecentSearchList,
      showFoodSection: displayedFoods.length > 0 || showCustomCreateAction,
      showComboSection: displayedCombos.length > 0,
      showCustomCreateAction,
      currentCategoryLabel,
      emptyTitle: emptyState.emptyTitle,
      emptyDescription: emptyState.emptyDescription,
    });
  },
});

const { searchFoods } = require("../../services/food");
const { getMealComboDetail, getMealComboList } = require("../../services/meal-combo");
const { createRecord, createRecordBatch, deleteRecord, getRecords, updateRecord } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
const { CALORIE_UNIT_LABELS, MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS, QUANTITY_UNIT_LABELS } = require("../../utils/constants");
const { getToday } = require("../../utils/date");
const { decorateFood, FOOD_CATEGORIES, isCustomFood } = require("../../utils/food");
const { getRecentFoods, saveRecentFood } = require("../../utils/recent-foods");
const {
  clearRecentFoodSearches,
  getRecentFoodSearches,
  saveRecentFoodSearch,
} = require("../../utils/recent-food-searches");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

const DEFAULT_QUANTITY = 100;
const DEFAULT_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 240;

const FILTER_KEYS = {
  RECENT: "RECENT",
  RECENT_SEARCH: "RECENT_SEARCH",
  CUSTOM: "CUSTOM",
  COMBO: "COMBO",
};

const EDITOR_TYPES = {
  FOOD: "FOOD",
  COMBO: "COMBO",
};

const BUILTIN_CATEGORIES = FOOD_CATEGORIES.filter((item) => item.key !== "ALL");

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
    filters.push({ key: FILTER_KEYS.COMBO, label: "自定义套餐" });
  }

  return filters;
}

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

function normalizeCalorieUnit(rawUnit) {
  const normalized = String(rawUnit || "KCAL").toUpperCase();
  return CALORIE_UNIT_LABELS[normalized] ? normalized : "KCAL";
}

function normalizeQuantityUnit(rawUnit) {
  const normalized = String(rawUnit || "G").toUpperCase();
  return QUANTITY_UNIT_LABELS[normalized] ? normalized : "G";
}

function convertCaloriesFromKcal(caloriesPer100Kcal, calorieUnit) {
  if (calorieUnit === "KJ") {
    return toNumber(caloriesPer100Kcal) * 4.184;
  }
  return toNumber(caloriesPer100Kcal);
}

function normalizeFood(food) {
  const calorieUnit = normalizeCalorieUnit(food.calorieUnit);
  const quantityUnit = normalizeQuantityUnit(food.quantityUnit);
  const caloriesPer100g = toNumber(food.caloriesPer100g);
  const displayCaloriesPer100 = food.displayCaloriesPer100 == null
    ? convertCaloriesFromKcal(caloriesPer100g, calorieUnit)
    : toNumber(food.displayCaloriesPer100);
  return {
    ...food,
    caloriesPer100g,
    displayCaloriesPer100: toInteger(displayCaloriesPer100),
    calorieUnit,
    calorieUnitLabel: CALORIE_UNIT_LABELS[calorieUnit] || "kcal",
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
    quantityUnit,
    quantityUnitLabel: QUANTITY_UNIT_LABELS[quantityUnit] || "g",
    imageUrl: typeof food.imageUrl === "string" ? food.imageUrl : "",
  };
}

function mergeFoods(currentFoods, nextFoods) {
  const foodMap = new Map();
  currentFoods.forEach((food) => {
    foodMap.set(Number(food.id), food);
  });
  nextFoods.forEach((food) => {
    foodMap.set(Number(food.id), food);
  });
  return Array.from(foodMap.values());
}

function resolveTotalNutrients({ quantityInGram, displayCaloriesPer100, proteinPer100g, carbsPer100g, fatPer100g }) {
  const quantity = Math.max(toNumber(quantityInGram), 0);
  return {
    totalCalories: toInteger((toNumber(displayCaloriesPer100) * quantity) / 100),
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
  const normalized = normalizeFood(item);
  return {
    foodId: normalized.foodId,
    foodName: normalized.foodName || normalized.name || "食物",
    quantityInGram: String(toNumber(normalized.quantityInGram) || DEFAULT_QUANTITY),
    caloriesPer100g: toNumber(normalized.caloriesPer100g),
    displayCaloriesPer100: toInteger(normalized.displayCaloriesPer100),
    calorieUnit: normalized.calorieUnit,
    calorieUnitLabel: normalized.calorieUnitLabel,
    proteinPer100g: toInteger(normalized.proteinPer100g),
    carbsPer100g: toInteger(normalized.carbsPer100g),
    fatPer100g: toInteger(normalized.fatPer100g),
    quantityUnit: normalized.quantityUnit,
    quantityUnitLabel: normalized.quantityUnitLabel,
    category: normalized.category || "",
    imageUrl: normalized.imageUrl || "",
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
    builtinFoods: [],
    customFoods: [],
    combos: [],
    recentFoods: [],
    recentSearches: [],
    displayedFoods: [],
    displayedCombos: [],
    emptyTitle: "最近记录为空",
    emptyDescription: "先记录一次饮食，最近记录的食物会出现在这里。",
    recordDate: getToday(),
    mealType: "BREAKFAST",
    mealTypeLabel: MEAL_TYPE_LABELS.BREAKFAST,
    source: "",
    enableDirectEdit: false,
    pageMode: "create",
    pageRecordId: null,
    mealTypeOptions: MEAL_TYPE_OPTIONS,
    builtinPage: 1,
    builtinSize: DEFAULT_PAGE_SIZE,
    builtinTotal: 0,
    builtinHasMore: false,
    builtinLoading: false,
    builtinLoadingMore: false,
    builtinStatusText: "",
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
    editorFoodImageUrl: "",
    editorCategoryLabel: "",
    editorComboId: null,
    editorComboName: "",
    editorComboItems: [],
    editorCaloriesPer100g: 0,
    editorCaloriesPer100Display: 0,
    editorCalorieUnit: "KCAL",
    editorCalorieUnitLabel: "kcal",
    editorProteinPer100g: 0,
    editorCarbsPer100g: 0,
    editorFatPer100g: 0,
    editorQuantityInGram: String(DEFAULT_QUANTITY),
    editorQuantityUnit: "G",
    editorQuantityUnitLabel: "g",
    editorTotalCalories: 0,
    editorTotalProtein: 0,
    editorTotalCarbs: 0,
    editorTotalFat: 0,
  },

  onLoad(options = {}) {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.userId = getCurrentUserId();
    this.searchTimer = null;
    this.foodRequestId = 0;

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
        this.loadRecentFoods();
        this.loadRecentSearches();
        this.loadCustomFoods();
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
          return;
        }

        this.refreshView();
      }
    );
  },

  onShow() {
    this.loadRecentFoods();
    if (this.data.canUseComboFilter) {
      this.loadCombos();
    }
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  },

  onReachBottom() {
    if (!this.shouldUseRemoteFoodSource()) {
      return;
    }
    if (!this.data.builtinHasMore || this.data.builtinLoading || this.data.builtinLoadingMore) {
      return;
    }
    this.fetchBuiltinFoods({ reset: false });
  },

  loadRecentFoods() {
    const recentFoods = this.userId
      ? getRecentFoods(this.userId).map((food) => normalizeFood(decorateFood(food)))
      : [];
    this.setData({ recentFoods }, () => {
      this.refreshView();
    });
  },

  loadCustomFoods() {
    searchFoods("", { scope: "CUSTOM", page: 1, size: 500 })
      .then((result) => {
        const customFoods = (result.foods || []).map((food) => normalizeFood(decorateFood(food)));
        this.setData({ customFoods }, () => {
          this.refreshView();
        });
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

  shouldUseRemoteFoodSource() {
    if (this.data.keyword.trim()) {
      return true;
    }
    const categoryKey = this.data.selectedCategoryKey;
    return BUILTIN_CATEGORIES.some((item) => item.key === categoryKey);
  },

  buildRemoteFoodQuery(page) {
    const keyword = this.data.keyword.trim();
    if (keyword) {
      return {
        keyword,
        page,
        size: this.data.builtinSize,
      };
    }

    const categoryKey = this.data.selectedCategoryKey;
    if (!BUILTIN_CATEGORIES.some((item) => item.key === categoryKey)) {
      return null;
    }

    return {
      category: categoryKey,
      page,
      size: this.data.builtinSize,
    };
  },

  scheduleBuiltinFetch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    if (!this.shouldUseRemoteFoodSource()) {
      this.setData({
        builtinFoods: [],
        builtinPage: 1,
        builtinTotal: 0,
        builtinHasMore: false,
        builtinLoading: false,
        builtinLoadingMore: false,
        builtinStatusText: "",
      }, () => {
        this.refreshView();
      });
      return;
    }

    this.setData({ builtinLoading: true }, () => {
      this.refreshView();
    });

    this.searchTimer = setTimeout(() => {
      this.fetchBuiltinFoods({ reset: true });
    }, SEARCH_DEBOUNCE_MS);
  },
  fetchBuiltinFoods({ reset }) {
    const nextPage = reset ? 1 : this.data.builtinPage + 1;
    const query = this.buildRemoteFoodQuery(nextPage);
    if (!query) {
      this.setData({
        builtinFoods: [],
        builtinPage: 1,
        builtinTotal: 0,
        builtinHasMore: false,
        builtinLoading: false,
        builtinLoadingMore: false,
      }, () => {
        this.refreshView();
      });
      return;
    }

    const requestId = this.foodRequestId + 1;
    this.foodRequestId = requestId;

    this.setData({
      builtinLoading: reset,
      builtinLoadingMore: !reset,
    }, () => {
      this.refreshView();
    });

    searchFoods(query.keyword || "", {
      category: query.category,
      page: query.page,
      size: query.size,
    })
      .then((result) => {
        if (requestId !== this.foodRequestId) {
          return;
        }

        const nextFoods = (result.foods || []).map((food) => normalizeFood(decorateFood(food)));
        const builtinFoods = reset ? nextFoods : mergeFoods(this.data.builtinFoods, nextFoods);
        const builtinTotal = toNumber(result.total);
        const builtinHasMore = builtinFoods.length < builtinTotal && nextFoods.length > 0;

        this.setData({
          builtinFoods,
          builtinPage: query.page,
          builtinTotal,
          builtinHasMore,
          builtinLoading: false,
          builtinLoadingMore: false,
        }, () => {
          this.refreshView();
        });
      })
      .catch((error) => {
        if (requestId !== this.foodRequestId) {
          return;
        }
        this.setData({
          builtinLoading: false,
          builtinLoadingMore: false,
        }, () => {
          this.refreshView();
        });
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  handleInput(event) {
    const keyword = String(event.detail.value || "");
    this.setData(
      {
        keyword,
        isSearching: Boolean(keyword.trim()),
      },
      () => {
        if (keyword.trim()) {
          this.scheduleBuiltinFetch();
          return;
        }

        if (this.shouldUseRemoteFoodSource()) {
          this.fetchBuiltinFoods({ reset: true });
          return;
        }

        this.refreshView();
      }
    );
  },

  handleSearchConfirm(event) {
    const keyword = String((event && event.detail && event.detail.value) || this.data.keyword || "").trim();

    this.setData(
      {
        keyword,
        isSearching: Boolean(keyword),
      },
      () => {
        if (keyword && this.userId) {
          saveRecentFoodSearch(this.userId, keyword);
          this.loadRecentSearches();
        }

        if (keyword || this.shouldUseRemoteFoodSource()) {
          this.fetchBuiltinFoods({ reset: true });
          return;
        }

        this.refreshView();
      }
    );
  },

  handleCategoryTap(event) {
    const selectedCategoryKey = event.currentTarget.dataset.key;
    this.setData(
      {
        selectedCategoryKey,
      },
      () => {
        if (this.shouldUseRemoteFoodSource()) {
          this.fetchBuiltinFoods({ reset: true });
          return;
        }
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
        }
        this.fetchBuiltinFoods({ reset: true });
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
          const customFoods = [
            normalizedFood,
            ...this.data.customFoods.filter((item) => Number(item.id) !== Number(normalizedFood.id)),
          ];

          this.setData({ customFoods }, () => {
            this.refreshView();
          });

          if (this.data.enableDirectEdit) {
            this.openFoodEditor(normalizedFood);
            return;
          }

          if (this.openerEventChannel) {
            this.openerEventChannel.emit("foodSelected", normalizedFood);
            setTimeout(() => {
              wx.navigateBack();
            }, 320);
          }
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
          wx.showToast({ title: "该套餐暂时没有食物", icon: "none" });
          return;
        }
        this.openComboEditor(detail, items);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleFoodImageError(event) {
    const foodId = Number(event.currentTarget.dataset.id);
    if (!Number.isFinite(foodId)) {
      return;
    }
    this.clearFoodImage(foodId);
  },

  handleEditorImageError() {
    this.setData({ editorFoodImageUrl: "" });
  },

  clearFoodImage(foodId) {
    const clearImage = (foods) => foods.map((food) => (
      Number(food.id) === foodId
        ? { ...food, imageUrl: "" }
        : food
    ));

    this.setData({
      builtinFoods: clearImage(this.data.builtinFoods),
      customFoods: clearImage(this.data.customFoods),
      recentFoods: clearImage(this.data.recentFoods),
      displayedFoods: clearImage(this.data.displayedFoods),
      editorFoodImageUrl: Number(this.data.editorFoodId) === foodId ? "" : this.data.editorFoodImageUrl,
    }, () => {
      this.refreshView();
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
      editorComboName: combo.name || "自定义套餐",
      editorComboItems: items,
      editorFoodId: null,
      editorFoodName: "",
      editorFoodImageUrl: "",
      editorCategoryLabel: "",
      editorCaloriesPer100g: 0,
      editorCaloriesPer100Display: 0,
      editorCalorieUnit: "KCAL",
      editorCalorieUnitLabel: "kcal",
      editorProteinPer100g: 0,
      editorCarbsPer100g: 0,
      editorFatPer100g: 0,
      editorQuantityInGram: String(DEFAULT_QUANTITY),
      editorQuantityUnit: "G",
      editorQuantityUnitLabel: "g",
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
            calorieUnit: targetRecord.calorieUnit,
            proteinPer100g: targetRecord.proteinPer100g,
            carbsPer100g: targetRecord.carbsPer100g,
            fatPer100g: targetRecord.fatPer100g,
            quantityUnit: targetRecord.quantityUnit,
            imageUrl: "",
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
      displayCaloriesPer100: normalizedFood.displayCaloriesPer100,
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
      editorFoodImageUrl: normalizedFood.imageUrl || "",
      editorCategoryLabel: normalizedFood.categoryLabel || normalizedFood.category || "",
      editorComboId: null,
      editorComboName: "",
      editorComboItems: [],
      editorCaloriesPer100g: toNumber(normalizedFood.caloriesPer100g),
      editorCaloriesPer100Display: toInteger(normalizedFood.displayCaloriesPer100),
      editorCalorieUnit: normalizedFood.calorieUnit || "KCAL",
      editorCalorieUnitLabel: normalizedFood.calorieUnitLabel || "kcal",
      editorProteinPer100g: toInteger(normalizedFood.proteinPer100g),
      editorCarbsPer100g: toInteger(normalizedFood.carbsPer100g),
      editorFatPer100g: toInteger(normalizedFood.fatPer100g),
      editorQuantityInGram: nextQuantity,
      editorQuantityUnit: normalizedFood.quantityUnit || "G",
      editorQuantityUnitLabel: normalizedFood.quantityUnitLabel || "g",
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
      displayCaloriesPer100: this.data.editorCaloriesPer100Display,
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
      wx.showToast({ title: "请输入正确数量", icon: "none" });
      return false;
    }
    return true;
  },

  validateComboEditor() {
    if (!this.data.editorComboItems.length) {
      wx.showToast({ title: "该套餐暂时没有食物", icon: "none" });
      return false;
    }

    const invalidItem = this.data.editorComboItems.find((item) => toNumber(item.quantityInGram) <= 0);
    if (invalidItem) {
      wx.showToast({ title: `请检查 ${invalidItem.foodName} 的数量`, icon: "none" });
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
        calorieUnit: item.calorieUnit,
        displayCaloriesPer100: item.displayCaloriesPer100,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        quantityUnit: item.quantityUnit,
        category: item.category || "",
        imageUrl: item.imageUrl || "",
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
            calorieUnit: this.data.editorCalorieUnit,
            displayCaloriesPer100: this.data.editorCaloriesPer100Display,
            proteinPer100g: this.data.editorProteinPer100g,
            carbsPer100g: this.data.editorCarbsPer100g,
            fatPer100g: this.data.editorFatPer100g,
            quantityUnit: this.data.editorQuantityUnit,
            category: this.data.editorCategoryLabel,
            imageUrl: this.data.editorFoodImageUrl,
          }]);
        }

        this.loadRecentFoods();
        this.syncHomeAfterSave(this.data.editorRecordDate);
        wx.showToast({
          title: this.data.editorType === EDITOR_TYPES.COMBO ? "自定义套餐已添加" : "已保存",
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
      editorFoodImageUrl: "",
      editorCategoryLabel: "",
      editorComboId: null,
      editorComboName: "",
      editorComboItems: [],
      editorCaloriesPer100g: 0,
      editorCaloriesPer100Display: 0,
      editorCalorieUnit: "KCAL",
      editorCalorieUnitLabel: "kcal",
      editorProteinPer100g: 0,
      editorCarbsPer100g: 0,
      editorFatPer100g: 0,
      editorQuantityInGram: String(DEFAULT_QUANTITY),
      editorQuantityUnit: "G",
      editorQuantityUnitLabel: "g",
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

  buildRecentFoods() {
    return this.data.recentFoods
      .slice()
      .sort((a, b) => Number(b.usedAt || 0) - Number(a.usedAt || 0));
  },

  buildCustomFoods() {
    return this.data.customFoods.filter((food) => isCustomFood(food));
  },

  buildCombos() {
    return this.data.combos;
  },

  resolveEmptyState({ categoryKey, isSearching }) {
    if (isSearching) {
      return {
        emptyTitle: "没有找到食物",
        emptyDescription: "换个关键词试试。",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT) {
      return {
        emptyTitle: "最近记录为空",
        emptyDescription: "先记录一次饮食，最近记录的食物会出现在这里。",
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
        emptyDescription: "可以在右上角添加自定义食物。",
      };
    }

    if (categoryKey === FILTER_KEYS.COMBO) {
      return {
        emptyTitle: "暂无自定义套餐",
        emptyDescription: "先去自定义套餐里创建一个套餐。",
      };
    }

    return {
      emptyTitle: "当前分类暂无食物",
      emptyDescription: "试试切换分类，或稍后再搜索。",
    };
  },

  refreshView() {
    const keyword = this.data.keyword.trim();
    const isSearching = Boolean(keyword);
    const currentCategoryKey = this.data.selectedCategoryKey;
    const usesRemoteFoods = this.shouldUseRemoteFoodSource();

    let displayedFoods = [];
    let displayedCombos = [];
    let showRecentSearchList = false;
    let showCustomCreateAction = false;
    let currentCategoryLabel = this.getCategoryLabel(currentCategoryKey);
    let builtinStatusText = "";

    if (isSearching) {
      displayedFoods = this.data.builtinFoods;
      currentCategoryLabel = "搜索结果";
    } else if (currentCategoryKey === FILTER_KEYS.RECENT) {
      displayedFoods = this.buildRecentFoods();
    } else if (currentCategoryKey === FILTER_KEYS.RECENT_SEARCH) {
      showRecentSearchList = true;
    } else if (currentCategoryKey === FILTER_KEYS.CUSTOM) {
      displayedFoods = this.buildCustomFoods();
      showCustomCreateAction = true;
    } else if (currentCategoryKey === FILTER_KEYS.COMBO && this.data.canUseComboFilter) {
      displayedCombos = this.buildCombos();
    } else {
      displayedFoods = this.data.builtinFoods;
    }

    if (usesRemoteFoods) {
      if (this.data.builtinLoading && !displayedFoods.length) {
        builtinStatusText = "加载中...";
      } else if (this.data.builtinLoadingMore) {
        builtinStatusText = "正在加载更多...";
      } else if (displayedFoods.length && this.data.builtinHasMore) {
        builtinStatusText = "上拉加载更多";
      } else if (displayedFoods.length) {
        builtinStatusText = `共 ${this.data.builtinTotal} 条`;
      }
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
      showFoodSection: displayedFoods.length > 0 || showCustomCreateAction || Boolean(builtinStatusText),
      showComboSection: displayedCombos.length > 0,
      showCustomCreateAction,
      currentCategoryLabel,
      emptyTitle: emptyState.emptyTitle,
      emptyDescription: emptyState.emptyDescription,
      builtinStatusText,
    });
  },
});
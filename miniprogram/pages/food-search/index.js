const { searchFoods } = require("../../services/food");
const { getMealComboDetail, getMealComboList } = require("../../services/meal-combo");
const { createRecord, createRecordBatch, deleteRecord, getRecords, updateRecord } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
const { MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS } = require("../../utils/constants");
const { getToday } = require("../../utils/date");
const { decorateFood, isCustomFood } = require("../../utils/food");
const {
  BUILTIN_CATEGORIES,
  DEFAULT_PAGE_SIZE,
  DEFAULT_QUANTITY,
  DELETE_ACTION_WIDTH,
  EDITOR_TYPES,
  FILTER_KEYS,
  SEARCH_DEBOUNCE_MS,
  SWIPE_ACTIVATE_DISTANCE,
  SWIPE_OPEN_THRESHOLD,
  applyRecentFoodSwipeState,
  buildSystemFilters,
  createClosedEditorState,
  createComboEditorState,
  createFoodEditorState,
  decorateCombo,
  getMealTypeIndex,
  getMealTypeLabel,
  mergeFoods,
  normalizeComboEditorItem,
  normalizeFood,
  resolveTotalNutrients,
  toNumber,
} = require("../../utils/food-search");
const { getRecentFoods, removeRecentFood, saveRecentFood } = require("../../utils/recent-foods");
const {
  clearRecentFoodSearches,
  getRecentFoodSearches,
  saveRecentFoodSearch,
} = require("../../utils/recent-food-searches");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();

function syncNavigationTitle(pageMode) {
  wx.setNavigationBarTitle({
    title: pageMode === "edit" ? "编辑饮食" : "添加食物",
  });
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
    enableRecentFoodSwipe: false,
    swipedRecentFoodId: null,
    swipingRecentFoodId: null,
    recentFoodSwipeOffsetX: 0,
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
    this.recentFoodSwipeStartX = null;
    this.recentFoodSwipeStartY = null;
    this.recentFoodSwipeBaseOffsetX = 0;
    this.recentFoodSwipeMode = "";

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
    this.closeRecentFoodSwipeActions();
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

    this.closeRecentFoodSwipeActions();
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

  handleRecentFoodTouchStart(event) {
    if (!this.data.enableRecentFoodSwipe) {
      return;
    }
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch) {
      return;
    }
    const nextOpenedId = this.data.swipedRecentFoodId === id ? id : null;
    this.recentFoodSwipeStartX = touch.clientX;
    this.recentFoodSwipeStartY = touch.clientY;
    this.recentFoodSwipeBaseOffsetX = this.data.swipedRecentFoodId === id ? DELETE_ACTION_WIDTH : 0;
    this.recentFoodSwipeMode = "";
    this.setData({
      swipingRecentFoodId: id,
      recentFoodSwipeOffsetX: this.recentFoodSwipeBaseOffsetX,
      swipedRecentFoodId: nextOpenedId,
      displayedFoods: applyRecentFoodSwipeState(this.data.displayedFoods, nextOpenedId, id, this.recentFoodSwipeBaseOffsetX),
    });
  },

  handleRecentFoodTouchMove(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!this.data.enableRecentFoodSwipe || !Number.isFinite(id) || !touch) {
      return;
    }
    if (this.data.swipingRecentFoodId !== id || !Number.isFinite(this.recentFoodSwipeStartX)) {
      return;
    }
    const deltaX = this.recentFoodSwipeStartX - touch.clientX;
    const deltaY = Math.abs((this.recentFoodSwipeStartY || 0) - touch.clientY);
    if (!this.recentFoodSwipeMode) {
      if (Math.abs(deltaX) < SWIPE_ACTIVATE_DISTANCE && deltaY < SWIPE_ACTIVATE_DISTANCE) {
        return;
      }
      this.recentFoodSwipeMode = Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
    }
    if (this.recentFoodSwipeMode !== "horizontal") {
      return;
    }
    const nextOffsetX = clampSwipeOffset(this.recentFoodSwipeBaseOffsetX + deltaX);
    this.setData({
      recentFoodSwipeOffsetX: nextOffsetX,
      displayedFoods: applyRecentFoodSwipeState(this.data.displayedFoods, this.data.swipedRecentFoodId, id, nextOffsetX),
    });
  },

  handleRecentFoodTouchEnd(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!this.data.enableRecentFoodSwipe || !Number.isFinite(id) || this.data.swipingRecentFoodId !== id) {
      return;
    }
    if (this.recentFoodSwipeMode !== "horizontal") {
      this.resetRecentFoodSwipeGesture();
      this.setData({
        swipingRecentFoodId: null,
        recentFoodSwipeOffsetX: 0,
        displayedFoods: applyRecentFoodSwipeState(this.data.displayedFoods, this.data.swipedRecentFoodId, null, 0),
      });
      return;
    }
    this.finishRecentFoodSwipe(id, this.data.recentFoodSwipeOffsetX >= SWIPE_OPEN_THRESHOLD);
  },

  handleRecentFoodContentTap(event) {
    if (this.data.swipedRecentFoodId != null) {
      this.closeRecentFoodSwipeActions();
      return;
    }
    this.handleSelectFood(event);
  },

  handleRecentFoodListBackgroundTap() {
    this.closeRecentFoodSwipeActions();
  },

  handleDeleteRecentFood(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!this.userId || !Number.isFinite(id)) {
      return;
    }
    removeRecentFood(this.userId, id);
    this.closeRecentFoodSwipeActions();
    this.loadRecentFoods();
    wx.showToast({ title: "已移除", icon: "success" });
  },

  resetRecentFoodSwipeGesture() {
    this.recentFoodSwipeStartX = null;
    this.recentFoodSwipeStartY = null;
    this.recentFoodSwipeBaseOffsetX = 0;
    this.recentFoodSwipeMode = "";
  },

  finishRecentFoodSwipe(id, shouldOpen) {
    this.resetRecentFoodSwipeGesture();
    this.setData({
      swipedRecentFoodId: shouldOpen ? id : null,
      swipingRecentFoodId: null,
      recentFoodSwipeOffsetX: 0,
      displayedFoods: applyRecentFoodSwipeState(this.data.displayedFoods, shouldOpen ? id : null, null, 0),
    });
  },

  closeRecentFoodSwipeActions() {
    if (this.data.swipedRecentFoodId == null && this.data.swipingRecentFoodId == null) {
      return;
    }
    this.resetRecentFoodSwipeGesture();
    this.setData({
      swipedRecentFoodId: null,
      swipingRecentFoodId: null,
      recentFoodSwipeOffsetX: 0,
      displayedFoods: applyRecentFoodSwipeState(this.data.displayedFoods, null, null, 0),
    });
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
    this.setData(createComboEditorState(combo, items, {
      mealType: this.data.mealType,
      recordDate: this.data.recordDate,
    }));
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
    this.setData(createFoodEditorState(food, quantityInGram, {
      mode: options.mode || "create",
      canDelete: Boolean(options.canDelete),
      recordId: options.recordId || null,
      mealType: options.mealType || this.data.mealType,
      recordDate: options.recordDate || this.data.recordDate,
    }));
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
      }, { loadingMode: "none" })
      : (() => {
        const quantityInGram = toNumber(this.data.editorQuantityInGram);
        return this.data.editorMode === "edit"
          ? updateRecord(this.data.editorRecordId, {
            quantityInGram,
            mealType: this.data.editorMealType,
            recordDate: this.data.editorRecordDate,
          }, { loadingMode: "none" })
          : createRecord({
            foodId: this.data.editorFoodId,
            mealType: this.data.editorMealType,
            quantityInGram,
            recordDate: this.data.editorRecordDate,
          }, { loadingMode: "none" });
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
        deleteRecord(this.data.editorRecordId, { loadingMode: "none" })
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
    this.setData(createClosedEditorState({
      mealType: this.data.mealType,
      recordDate: this.data.recordDate,
    }));
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
    const enableRecentFoodSwipe = !isSearching && currentCategoryKey === FILTER_KEYS.RECENT;

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

    const nextSwipedRecentFoodId = enableRecentFoodSwipe
      && displayedFoods.some((item) => Number(item.id) === Number(this.data.swipedRecentFoodId))
      ? this.data.swipedRecentFoodId
      : null;
    const nextSwipingRecentFoodId = enableRecentFoodSwipe
      && displayedFoods.some((item) => Number(item.id) === Number(this.data.swipingRecentFoodId))
      ? this.data.swipingRecentFoodId
      : null;
    const nextRecentFoodSwipeOffsetX = enableRecentFoodSwipe && nextSwipingRecentFoodId != null
      ? this.data.recentFoodSwipeOffsetX
      : 0;
    if (enableRecentFoodSwipe) {
      displayedFoods = applyRecentFoodSwipeState(
        displayedFoods,
        nextSwipedRecentFoodId,
        nextSwipingRecentFoodId,
        nextRecentFoodSwipeOffsetX
      );
    }

    this.setData({
      isSearching,
      displayedFoods,
      displayedCombos,
      enableRecentFoodSwipe,
      swipedRecentFoodId: nextSwipedRecentFoodId,
      swipingRecentFoodId: nextSwipingRecentFoodId,
      recentFoodSwipeOffsetX: nextRecentFoodSwipeOffsetX,
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

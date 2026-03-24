const { createFood, deleteFood, searchFoods, updateFood } = require("../../services/food");
const { CALORIE_UNIT_LABELS, QUANTITY_UNIT_LABELS } = require("../../utils/constants");
const { FOOD_CREATION_CATEGORIES, decorateFood } = require("../../utils/food");
const { pickErrorMessage } = require("../../utils/request");

const DELETE_ACTION_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = 42;
const SWIPE_ACTIVATE_DISTANCE = 8;

function buildEmptyForm() {
  return {
    id: null,
    name: "",
    caloriesPer100g: "",
    calorieUnit: "KCAL",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
    quantityUnit: "G",
  };
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
    caloriesPer100g: toNumber(food.caloriesPer100g),
    displayCaloriesPer100: toInteger(food.displayCaloriesPer100 ?? food.caloriesPer100g),
    calorieUnit: food.calorieUnit || "KCAL",
    calorieUnitLabel: CALORIE_UNIT_LABELS[food.calorieUnit || "KCAL"] || "kcal",
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
    quantityUnit: food.quantityUnit || "G",
    quantityUnitLabel: QUANTITY_UNIT_LABELS[food.quantityUnit || "G"] || "g",
  };
}

function clampSwipeOffset(offsetX) {
  if (!Number.isFinite(offsetX) || offsetX < 0) {
    return 0;
  }
  if (offsetX > DELETE_ACTION_WIDTH) {
    return DELETE_ACTION_WIDTH;
  }
  return offsetX;
}

function applySwipeState(items, swipedId, swipingId, swipeOffsetX) {
  return (items || []).map((item) => {
    const isSwiping = Number(item.id) === swipingId;
    const isOpened = Number(item.id) === swipedId;
    const offsetX = isSwiping
      ? clampSwipeOffset(swipeOffsetX)
      : (isOpened ? DELETE_ACTION_WIDTH : 0);
    return Object.assign({}, item, {
      swipeOffsetX: offsetX,
      swipeContentStyle: `transform: translateX(-${offsetX}px);transition:${isSwiping ? "none" : "transform 180ms ease"};`,
    });
  });
}

Page({
  data: {
    categories: FOOD_CREATION_CATEGORIES,
    calorieUnits: [
      { key: "KCAL", label: "kcal" },
      { key: "KJ", label: "kJ" },
    ],
    quantityUnits: [
      { key: "G", label: "克(g)" },
      { key: "ML", label: "毫升(ml)" },
    ],
    foods: [],
    displayedFoods: [],
    keyword: "",
    loading: false,
    saving: false,
    swipedFoodId: null,
    swipingFoodId: null,
    swipeOffsetX: 0,
    sheetVisible: false,
    launchedFromSelector: false,
    editMode: "create",
    selectedCategoryKey: "STAPLE",
    editForm: buildEmptyForm(),
  },

  onLoad(options = {}) {
    this.openerEventChannel = this.getOpenerEventChannel();
    const launchedFromSelector = options.from === "selector";
    const shouldOpenCreate = options.mode === "create";

    this.setData({ launchedFromSelector }, () => {
      if (shouldOpenCreate) {
        this.handleStartCreate();
      }
    });
  },

  onShow() {
    this.loadFoods();
  },

  loadFoods() {
    this.setData({ loading: true });
    searchFoods("", { scope: "CUSTOM", page: 1, size: 500 })
      .then((result) => {
        const foods = (result.foods || []).map((item) => normalizeFood(decorateFood(item)));
        this.setData({ foods }, () => {
          this.refreshDisplayedFoods();
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  refreshDisplayedFoods() {
    const keyword = String(this.data.keyword || "").trim().toLowerCase();
    const displayedFoods = this.data.foods.filter((item) => {
      if (!keyword) {
        return true;
      }
      return String(item.name || "").toLowerCase().includes(keyword);
    });
    this.setData({
      displayedFoods: applySwipeState(displayedFoods, null, null, 0),
      swipedFoodId: null,
      swipingFoodId: null,
      swipeOffsetX: 0,
    });
  },

  handleKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => {
      this.refreshDisplayedFoods();
    });
  },

  handleStartCreate() {
    this.closeSwipeActions();
    this.setData({
      sheetVisible: true,
      editMode: "create",
      selectedCategoryKey: "STAPLE",
      editForm: buildEmptyForm(),
    });
  },

  handleEdit(event) {
    this.closeSwipeActions();
    const foodId = Number(event.currentTarget.dataset.id);
    const target = this.data.foods.find((item) => Number(item.id) === foodId);
    if (!target) {
      return;
    }

    this.setData({
      sheetVisible: true,
      editMode: "edit",
      selectedCategoryKey: target.categoryKey || "OTHER",
      editForm: {
        id: target.id,
        name: target.name || "",
        caloriesPer100g: String(toInteger(target.displayCaloriesPer100)),
        calorieUnit: target.calorieUnit || "KCAL",
        proteinPer100g: String(toInteger(target.proteinPer100g)),
        carbsPer100g: String(toInteger(target.carbsPer100g)),
        fatPer100g: String(toInteger(target.fatPer100g)),
        quantityUnit: target.quantityUnit || "G",
      },
    });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [`editForm.${field}`]: event.detail.value });
  },

  handleCategoryTap(event) {
    this.setData({ selectedCategoryKey: event.currentTarget.dataset.key });
  },

  handleCalorieUnitTap(event) {
    this.setData({ "editForm.calorieUnit": event.currentTarget.dataset.key });
  },

  handleQuantityUnitTap(event) {
    this.setData({ "editForm.quantityUnit": event.currentTarget.dataset.key });
  },

  noop() {},

  handleFoodTouchStart(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch) {
      return;
    }
    const nextOpenedId = this.data.swipedFoodId === id ? id : null;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeBaseOffsetX = this.data.swipedFoodId === id ? DELETE_ACTION_WIDTH : 0;
    this.swipeMode = "";
    this.setData({
      swipingFoodId: id,
      swipeOffsetX: this.swipeBaseOffsetX,
      swipedFoodId: nextOpenedId,
      displayedFoods: applySwipeState(this.data.displayedFoods, nextOpenedId, id, this.swipeBaseOffsetX),
    });
  },

  handleFoodTouchMove(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch || this.data.swipingFoodId !== id || !Number.isFinite(this.swipeStartX)) {
      return;
    }
    const deltaX = this.swipeStartX - touch.clientX;
    const deltaY = Math.abs((this.swipeStartY || 0) - touch.clientY);
    if (!this.swipeMode) {
      if (Math.abs(deltaX) < SWIPE_ACTIVATE_DISTANCE && deltaY < SWIPE_ACTIVATE_DISTANCE) {
        return;
      }
      this.swipeMode = Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
    }
    if (this.swipeMode !== "horizontal") {
      return;
    }
    const nextOffsetX = clampSwipeOffset(this.swipeBaseOffsetX + deltaX);
    this.setData({
      swipeOffsetX: nextOffsetX,
      displayedFoods: applySwipeState(this.data.displayedFoods, this.data.swipedFoodId, id, nextOffsetX),
    });
  },

  handleFoodTouchEnd(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!Number.isFinite(id) || this.data.swipingFoodId !== id) {
      return;
    }
    if (this.swipeMode !== "horizontal") {
      this.resetSwipeGesture();
      this.setData({
        swipingFoodId: null,
        swipeOffsetX: 0,
        displayedFoods: applySwipeState(this.data.displayedFoods, this.data.swipedFoodId, null, 0),
      });
      return;
    }
    this.finishSwipe(id, this.data.swipeOffsetX >= SWIPE_OPEN_THRESHOLD);
  },

  resetSwipeGesture() {
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeBaseOffsetX = 0;
    this.swipeMode = "";
  },

  finishSwipe(id, shouldOpen) {
    this.resetSwipeGesture();
    this.setData({
      swipedFoodId: shouldOpen ? id : null,
      swipingFoodId: null,
      swipeOffsetX: 0,
      displayedFoods: applySwipeState(this.data.displayedFoods, shouldOpen ? id : null, null, 0),
    });
  },

  closeSwipeActions() {
    if (this.data.swipedFoodId == null && this.data.swipingFoodId == null) {
      return;
    }
    this.resetSwipeGesture();
    this.setData({
      swipedFoodId: null,
      swipingFoodId: null,
      swipeOffsetX: 0,
      displayedFoods: applySwipeState(this.data.displayedFoods, null, null, 0),
    });
  },

  handleSwipeContentTap() {
    if (this.data.swipedFoodId != null) {
      this.closeSwipeActions();
    }
  },

  handleListBackgroundTap() {
    this.closeSwipeActions();
  },

  closeSheet() {
    this.setData({
      sheetVisible: false,
      editMode: "create",
      selectedCategoryKey: "STAPLE",
      editForm: buildEmptyForm(),
    });
  },

  handleCancelEdit() {
    if (this.data.launchedFromSelector && this.data.editMode === "create") {
      wx.navigateBack();
      return;
    }
    this.closeSheet();
  },

  validateForm() {
    const { editForm } = this.data;
    const caloriesPer100g = Number(editForm.caloriesPer100g);
    const proteinPer100g = Number(editForm.proteinPer100g || 0);
    const carbsPer100g = Number(editForm.carbsPer100g || 0);
    const fatPer100g = Number(editForm.fatPer100g || 0);

    if (!String(editForm.name || "").trim()) {
      wx.showToast({ title: "请输入食物名称", icon: "none" });
      return null;
    }
    if (!caloriesPer100g || caloriesPer100g <= 0) {
      wx.showToast({ title: "请输入正确热量", icon: "none" });
      return null;
    }
    if (proteinPer100g < 0 || carbsPer100g < 0 || fatPer100g < 0) {
      wx.showToast({ title: "营养数据不能为负数", icon: "none" });
      return null;
    }

    const selectedCategory = this.data.categories.find((item) => item.key === this.data.selectedCategoryKey);
    return {
      name: String(editForm.name || "").trim(),
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      category: selectedCategory ? selectedCategory.label : "其他",
      calorieUnit: editForm.calorieUnit || "KCAL",
      quantityUnit: editForm.quantityUnit || "G",
    };
  },

  handleSubmit() {
    this.closeSwipeActions();
    if (this.data.saving) {
      return;
    }

    const payload = this.validateForm();
    if (!payload) {
      return;
    }

    const task = this.data.editMode === "edit"
      ? updateFood(this.data.editForm.id, payload)
      : createFood(payload);

    this.setData({ saving: true });
    task
      .then((food) => {
        const normalizedFood = normalizeFood(decorateFood(food));
        wx.showToast({ title: this.data.editMode === "edit" ? "已保存" : "创建成功", icon: "success" });

        if (this.data.editMode === "create" && this.data.launchedFromSelector && this.openerEventChannel) {
          this.openerEventChannel.emit("foodCreated", normalizedFood);
          setTimeout(() => {
            wx.navigateBack();
          }, 280);
          return;
        }

        this.closeSheet();
        this.loadFoods();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  },

  handleDelete(event) {
    this.closeSwipeActions();
    if (this.data.saving) {
      return;
    }
    const foodId = Number(event.currentTarget.dataset.id || this.data.editForm.id);
    const target = this.data.foods.find((item) => Number(item.id) === foodId);
    if (!target) {
      return;
    }

    wx.showModal({
      title: "删除自定义食物",
      content: `确认删除“${target.name}”吗？`,
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ saving: true });
        deleteFood(foodId)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.closeSheet();
            this.loadFoods();
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          })
          .finally(() => {
            this.setData({ saving: false });
          });
      },
    });
  },
});

const { createFood, deleteFood, searchFoods, updateFood } = require("../../services/food");
const { FOOD_CREATION_CATEGORIES, decorateFood } = require("../../utils/food");
const { pickErrorMessage } = require("../../utils/request");

function buildEmptyForm() {
  return {
    id: null,
    name: "",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
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
    caloriesPer100g: toInteger(food.caloriesPer100g),
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
  };
}

Page({
  data: {
    categories: FOOD_CREATION_CATEGORIES,
    foods: [],
    displayedFoods: [],
    keyword: "",
    loading: false,
    saving: false,
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
    searchFoods("", { scope: "CUSTOM" })
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
    this.setData({ displayedFoods });
  },

  handleKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => {
      this.refreshDisplayedFoods();
    });
  },

  handleStartCreate() {
    this.setData({
      sheetVisible: true,
      editMode: "create",
      selectedCategoryKey: "STAPLE",
      editForm: buildEmptyForm(),
    });
  },

  handleEdit(event) {
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
        caloriesPer100g: String(toInteger(target.caloriesPer100g)),
        proteinPer100g: String(toInteger(target.proteinPer100g)),
        carbsPer100g: String(toInteger(target.carbsPer100g)),
        fatPer100g: String(toInteger(target.fatPer100g)),
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

  noop() {},

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
    };
  },

  handleSubmit() {
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
    const foodId = Number(event.currentTarget.dataset.id || this.data.editForm.id);
    const target = this.data.foods.find((item) => Number(item.id) === foodId);
    if (!target) {
      return;
    }

    wx.showModal({
      title: "删除食物",
      content: `确认删除“${target.name}”吗？`,
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        deleteFood(foodId)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.closeSheet();
            this.loadFoods();
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          });
      },
    });
  },
});

const { createMealCombo, deleteMealCombo, getMealComboDetail, getMealComboList, updateMealCombo } = require("../../services/meal-combo");
const { CALORIE_UNIT_LABELS, QUANTITY_UNIT_LABELS } = require("../../utils/constants");
const { pickErrorMessage } = require("../../utils/request");

function buildEmptyForm() {
  return {
    id: null,
    name: "",
    description: "",
    items: [],
  };
}

function buildEmptySummary() {
  return {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    foodCount: 0,
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function toMacro(value) {
  return Math.round(toNumber(value) * 10) / 10;
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

function buildItemTotal(per100g, quantityInGram) {
  return toInteger((toNumber(per100g) * toNumber(quantityInGram)) / 100);
}

function normalizeItem(item) {
  const quantityInGram = toNumber(item.quantityInGram);
  const calorieUnit = normalizeCalorieUnit(item.calorieUnit);
  const quantityUnit = normalizeQuantityUnit(item.quantityUnit);
  const caloriesPer100g = toNumber(item.caloriesPer100g);
  return {
    foodId: item.foodId,
    foodName: item.foodName,
    caloriesPer100g,
    calorieUnit,
    calorieUnitLabel: CALORIE_UNIT_LABELS[calorieUnit] || "kcal",
    proteinPer100g: toNumber(item.proteinPer100g),
    carbsPer100g: toNumber(item.carbsPer100g),
    fatPer100g: toNumber(item.fatPer100g),
    caloriesPer100gDisplay: toInteger(item.displayCaloriesPer100 ?? convertCaloriesFromKcal(caloriesPer100g, calorieUnit)),
    quantityUnit,
    quantityUnitLabel: QUANTITY_UNIT_LABELS[quantityUnit] || "g",
    quantityInGram: String(quantityInGram),
    totalCalories: buildItemTotal(caloriesPer100g, quantityInGram),
  };
}

function buildSummary(items = []) {
  return items.reduce(
    (result, item) => {
      const quantityInGram = toNumber(item.quantityInGram);
      result.totalCalories += buildItemTotal(item.caloriesPer100g, quantityInGram);
      result.totalProtein += (toNumber(item.proteinPer100g) * quantityInGram) / 100;
      result.totalCarbs += (toNumber(item.carbsPer100g) * quantityInGram) / 100;
      result.totalFat += (toNumber(item.fatPer100g) * quantityInGram) / 100;
      result.foodCount += 1;
      return result;
    },
    buildEmptySummary()
  );
}

function decorateCombo(combo) {
  const items = (combo.items || []).map(normalizeItem);
  const summary = buildSummary(items);
  return {
    ...combo,
    items,
    totalCalories: summary.totalCalories,
    totalProtein: toMacro(summary.totalProtein),
    totalCarbs: toMacro(summary.totalCarbs),
    totalFat: toMacro(summary.totalFat),
    foodCount: summary.foodCount,
  };
}

function syncNavigationTitle(editing, editMode) {
  let title = "自定义套餐";
  if (editing) {
    title = editMode === "edit" ? "编辑自定义套餐" : "新建自定义套餐";
  }
  wx.setNavigationBarTitle({ title });
}

Page({
  data: {
    combos: [],
    editing: false,
    editMode: "create",
    editForm: buildEmptyForm(),
    editSummary: buildEmptySummary(),
  },

  onLoad(options = {}) {
    syncNavigationTitle(false, "create");
    if (options.mode === "create") {
      this.handleStartCreate();
    }
  },

  onShow() {
    if (!this.data.editing) {
      this.loadCombos();
    }
  },

  loadCombos() {
    getMealComboList()
      .then((result) => {
        const combos = (result.combos || []).map(decorateCombo);
        this.setData({ combos });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  startEditing(mode, form) {
    const items = (form.items || []).map(normalizeItem);
    const summary = buildSummary(items);
    this.setData({
      editing: true,
      editMode: mode,
      editForm: {
        ...buildEmptyForm(),
        ...form,
        items,
      },
      editSummary: {
        totalCalories: summary.totalCalories,
        totalProtein: toMacro(summary.totalProtein),
        totalCarbs: toMacro(summary.totalCarbs),
        totalFat: toMacro(summary.totalFat),
        foodCount: summary.foodCount,
      },
    }, () => {
      syncNavigationTitle(true, mode);
    });
  },

  updateEditItems(items) {
    const summary = buildSummary(items);
    this.setData({
      "editForm.items": items,
      editSummary: {
        totalCalories: summary.totalCalories,
        totalProtein: toMacro(summary.totalProtein),
        totalCarbs: toMacro(summary.totalCarbs),
        totalFat: toMacro(summary.totalFat),
        foodCount: summary.foodCount,
      },
    });
  },

  handleStartCreate() {
    this.startEditing("create", buildEmptyForm());
  },

  handleEdit(event) {
    const comboId = Number(event.currentTarget.dataset.id);
    getMealComboDetail(comboId)
      .then((combo) => {
        this.startEditing("edit", {
          id: combo.id,
          name: combo.name || "",
          description: combo.description || "",
          items: combo.items || [],
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleDelete(event) {
    const comboId = Number(event.currentTarget.dataset.id || this.data.editForm.id);
    const target = this.data.combos.find((item) => Number(item.id) === comboId);
    wx.showModal({
      title: "删除自定义套餐",
      content: target ? `确认删除“${target.name}”吗？` : "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        deleteMealCombo(comboId)
          .then(() => {
            wx.showToast({ title: "删除成功", icon: "success" });
            this.handleCancelEdit(false);
            this.loadCombos();
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          });
      },
    });
  },

  handleEditName(event) {
    this.setData({ "editForm.name": event.detail.value });
  },

  handleAddFood() {
    wx.navigateTo({
      url: "/pages/food-search/index",
      success: (res) => {
        res.eventChannel.on("foodSelected", (food) => {
          this.addFood(food);
        });
      },
    });
  },

  addFood(food) {
    const items = [...this.data.editForm.items];
    const targetIndex = items.findIndex((item) => item.foodId === food.id);
    if (targetIndex >= 0) {
      const nextQuantity = toNumber(items[targetIndex].quantityInGram) + 100;
      items[targetIndex] = {
        ...items[targetIndex],
        quantityInGram: String(nextQuantity),
        totalCalories: buildItemTotal(items[targetIndex].caloriesPer100g, nextQuantity),
      };
    } else {
      items.push(normalizeItem({
        foodId: food.id,
        foodName: food.name,
        caloriesPer100g: food.caloriesPer100g,
        calorieUnit: food.calorieUnit,
        displayCaloriesPer100: food.displayCaloriesPer100,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        quantityUnit: food.quantityUnit,
        quantityInGram: 100,
      }));
    }
    this.updateEditItems(items);
  },

  handleQuantityInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const value = event.detail.value;
    const items = [...this.data.editForm.items];
    const quantity = toNumber(value);
    items[index] = {
      ...items[index],
      quantityInGram: value,
      totalCalories: buildItemTotal(items[index].caloriesPer100g, quantity),
    };
    this.updateEditItems(items);
  },

  handleRemoveFood(event) {
    const index = Number(event.currentTarget.dataset.index);
    const items = this.data.editForm.items.filter((_, itemIndex) => itemIndex !== index);
    this.updateEditItems(items);
  },

  handleCancelEdit(shouldReload = true) {
    this.setData({
      editing: false,
      editMode: "create",
      editForm: buildEmptyForm(),
      editSummary: buildEmptySummary(),
    }, () => {
      syncNavigationTitle(false, "create");
      if (shouldReload) {
        this.loadCombos();
      }
    });
  },

  handleSaveEdit() {
    const { id, name, description, items } = this.data.editForm;
    const comboName = String(name || "").trim();

    if (!comboName) {
      wx.showToast({ title: "请输入自定义套餐名称", icon: "none" });
      return;
    }
    if (!items.length) {
      wx.showToast({ title: "请至少保留一种食物", icon: "none" });
      return;
    }

    const invalidItem = items.find((item) => toNumber(item.quantityInGram) <= 0);
    if (invalidItem) {
      wx.showToast({ title: `请检查 ${invalidItem.foodName} 的数量`, icon: "none" });
      return;
    }

    const payload = {
      name: comboName,
      description,
      items: items.map((item) => ({
        foodId: item.foodId,
        quantityInGram: toNumber(item.quantityInGram),
      })),
    };

    const task = id ? updateMealCombo(id, payload) : createMealCombo(payload);
    task
      .then(() => {
        wx.showToast({ title: id ? "保存成功" : "创建成功", icon: "success" });
        this.handleCancelEdit();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },
});

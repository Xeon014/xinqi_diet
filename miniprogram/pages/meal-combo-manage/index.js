const { deleteMealCombo, getMealComboDetail, getMealComboList, updateMealCombo } = require("../../services/meal-combo");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPES = [
  { value: "BREAKFAST", label: "早餐" },
  { value: "LUNCH", label: "午餐" },
  { value: "DINNER", label: "晚餐" },
  { value: "SNACK", label: "加餐" },
];

const MEAL_TYPE_LABELS = MEAL_TYPES.reduce((result, item) => {
  result[item.value] = item.label;
  return result;
}, {});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function normalizeItem(item) {
  const quantityInGram = toNumber(item.quantityInGram);
  return {
    foodId: item.foodId,
    foodName: item.foodName,
    caloriesPer100g: toInteger(item.caloriesPer100g),
    proteinPer100g: toInteger(item.proteinPer100g),
    carbsPer100g: toInteger(item.carbsPer100g),
    fatPer100g: toInteger(item.fatPer100g),
    quantityInGram: String(quantityInGram),
    totalCalories: toInteger((toNumber(item.caloriesPer100g) * quantityInGram) / 100),
  };
}

Page({
  data: {
    combos: [],
    mealTypeLabels: MEAL_TYPE_LABELS,
    mealTypes: MEAL_TYPES,
    editing: false,
    editForm: {
      id: null,
      name: "",
      description: "",
      mealType: "BREAKFAST",
      items: [],
    },
  },

  onShow() {
    if (!this.data.editing) {
      this.loadCombos();
    }
  },

  loadCombos() {
    getMealComboList()
      .then((result) => {
        this.setData({ combos: result.combos || [] });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleEdit(event) {
    const comboId = Number(event.currentTarget.dataset.id);
    getMealComboDetail(comboId)
      .then((combo) => {
        this.setData({
          editing: true,
          editForm: {
            id: combo.id,
            name: combo.name || "",
            description: combo.description || "",
            mealType: combo.mealType || "BREAKFAST",
            items: (combo.items || []).map(normalizeItem),
          },
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleDelete(event) {
    const comboId = Number(event.currentTarget.dataset.id);
    wx.showModal({
      title: "删除套餐",
      content: "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        deleteMealCombo(comboId)
          .then(() => {
            wx.showToast({ title: "删除成功", icon: "success" });
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

  handleMealTypeTap(event) {
    this.setData({ "editForm.mealType": event.currentTarget.dataset.mealType });
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
      items[targetIndex].quantityInGram = String(nextQuantity);
      items[targetIndex].totalCalories = toInteger((toNumber(items[targetIndex].caloriesPer100g) * nextQuantity) / 100);
    } else {
      items.push(normalizeItem({
        foodId: food.id,
        foodName: food.name,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        quantityInGram: 100,
      }));
    }
    this.setData({ "editForm.items": items });
  },

  handleQuantityInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const value = event.detail.value;
    const items = [...this.data.editForm.items];
    const quantity = toNumber(value);
    items[index] = {
      ...items[index],
      quantityInGram: value,
      totalCalories: toInteger((toNumber(items[index].caloriesPer100g) * quantity) / 100),
    };
    this.setData({ "editForm.items": items });
  },

  handleRemoveFood(event) {
    const index = Number(event.currentTarget.dataset.index);
    const items = this.data.editForm.items.filter((_, itemIndex) => itemIndex !== index);
    this.setData({ "editForm.items": items });
  },

  handleCancelEdit() {
    this.setData({
      editing: false,
      editForm: {
        id: null,
        name: "",
        description: "",
        mealType: "BREAKFAST",
        items: [],
      },
    });
    this.loadCombos();
  },

  handleSaveEdit() {
    const { id, name, description, mealType, items } = this.data.editForm;
    const comboName = (name || "").trim();

    if (!comboName) {
      wx.showToast({ title: "请输入套餐名称", icon: "none" });
      return;
    }

    if (!items.length) {
      wx.showToast({ title: "请至少保留一种食物", icon: "none" });
      return;
    }

    const invalidItem = items.find((item) => toNumber(item.quantityInGram) <= 0);
    if (invalidItem) {
      wx.showToast({ title: `请检查 ${invalidItem.foodName} 的克数`, icon: "none" });
      return;
    }

    updateMealCombo(id, {
      name: comboName,
      description,
      mealType,
      items: items.map((item) => ({
        foodId: item.foodId,
        quantityInGram: toNumber(item.quantityInGram),
      })),
    })
      .then(() => {
        wx.showToast({ title: "保存成功", icon: "success" });
        this.handleCancelEdit();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },
});

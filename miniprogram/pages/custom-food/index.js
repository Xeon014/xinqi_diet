const { createFood } = require("../../services/food");
const { FOOD_CREATION_CATEGORIES } = require("../../utils/food");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    categories: FOOD_CREATION_CATEGORIES,
    selectedCategoryKey: "STAPLE",
    form: {
      name: "",
      caloriesPer100g: "",
      proteinPer100g: "",
      carbsPer100g: "",
      fatPer100g: "",
    },
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },

  handleCategoryTap(event) {
    this.setData({
      selectedCategoryKey: event.currentTarget.dataset.key,
    });
  },

  handleSubmit() {
    const { form, selectedCategoryKey, categories } = this.data;
    const selectedCategory = categories.find((item) => item.key === selectedCategoryKey);
    const caloriesPer100g = Number(form.caloriesPer100g);
    const proteinPer100g = Number(form.proteinPer100g);
    const carbsPer100g = Number(form.carbsPer100g);
    const fatPer100g = Number(form.fatPer100g);

    if (!form.name.trim()) {
      wx.showToast({ title: "请输入食物名称", icon: "none" });
      return;
    }
    if (!caloriesPer100g || caloriesPer100g <= 0) {
      wx.showToast({ title: "请输入正确热量", icon: "none" });
      return;
    }
    if (proteinPer100g < 0 || carbsPer100g < 0 || fatPer100g < 0) {
      wx.showToast({ title: "营养数据不能为负数", icon: "none" });
      return;
    }

    createFood({
      name: form.name.trim(),
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      category: selectedCategory.label,
    })
      .then((food) => {
        wx.showToast({
          title: "创建成功",
          icon: "success",
        });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit("foodCreated", food);
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },
});
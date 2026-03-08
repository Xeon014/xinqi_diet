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
      wx.showToast({ title: "\u8bf7\u8f93\u5165\u98df\u7269\u540d\u79f0", icon: "none" });
      return;
    }
    if (!caloriesPer100g || caloriesPer100g <= 0) {
      wx.showToast({ title: "\u8bf7\u8f93\u5165\u6b63\u786e\u70ed\u91cf", icon: "none" });
      return;
    }
    if (proteinPer100g < 0 || carbsPer100g < 0 || fatPer100g < 0) {
      wx.showToast({ title: "\u8425\u517b\u6570\u636e\u4e0d\u80fd\u4e3a\u8d1f\u6570", icon: "none" });
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
          title: "\u521b\u5efa\u6210\u529f",
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
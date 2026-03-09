const { createExercise } = require("../../services/exercise");
const { EXERCISE_CATEGORIES } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const CREATION_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.key !== "ALL");

Page({
  data: {
    categories: CREATION_CATEGORIES,
    selectedCategoryKey: "CARDIO",
    form: {
      name: "",
      metValue: "",
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
    const { form, selectedCategoryKey } = this.data;
    const metValue = Number(form.metValue);

    if (!form.name.trim()) {
      wx.showToast({ title: "请输入运动名称", icon: "none" });
      return;
    }

    if (!metValue || metValue <= 0) {
      wx.showToast({ title: "请输入正确 MET 值", icon: "none" });
      return;
    }

    createExercise({
      name: form.name.trim(),
      metValue,
      category: selectedCategoryKey,
    })
      .then((exercise) => {
        wx.showToast({ title: "创建成功", icon: "success" });
        const eventChannel = this.getOpenerEventChannel();
        eventChannel.emit("exerciseCreated", exercise);
        setTimeout(() => {
          wx.navigateBack();
        }, 300);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },
});

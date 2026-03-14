const { createExercise, deleteExercise, searchExercises, updateExercise } = require("../../services/exercise");
const { EXERCISE_CATEGORIES, decorateExercise } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const CREATION_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.key !== "ALL");

function buildEmptyForm() {
  return {
    id: null,
    name: "",
    metValue: "",
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

Page({
  data: {
    categories: CREATION_CATEGORIES,
    exercises: [],
    displayedExercises: [],
    keyword: "",
    loading: false,
    saving: false,
    sheetVisible: false,
    launchedFromSelector: false,
    editMode: "create",
    selectedCategoryKey: "CARDIO",
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
    this.loadExercises();
  },

  loadExercises() {
    this.setData({ loading: true });
    searchExercises({ scope: "CUSTOM" })
      .then((result) => {
        const exercises = (result.exercises || []).map((item) => ({
          ...decorateExercise(item),
          metValue: toNumber(item.metValue),
        }));
        this.setData({ exercises }, () => {
          this.refreshDisplayedExercises();
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  refreshDisplayedExercises() {
    const keyword = String(this.data.keyword || "").trim().toLowerCase();
    const displayedExercises = this.data.exercises.filter((item) => {
      if (!keyword) {
        return true;
      }
      const name = String(item.name || "").toLowerCase();
      const aliases = String(item.aliases || "").toLowerCase();
      return name.includes(keyword) || aliases.includes(keyword);
    });
    this.setData({ displayedExercises });
  },

  handleKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleStartCreate() {
    this.setData({
      sheetVisible: true,
      editMode: "create",
      selectedCategoryKey: "CARDIO",
      editForm: buildEmptyForm(),
    });
  },

  handleEdit(event) {
    const exerciseId = Number(event.currentTarget.dataset.id);
    const target = this.data.exercises.find((item) => Number(item.id) === exerciseId);
    if (!target) {
      return;
    }

    this.setData({
      sheetVisible: true,
      editMode: "edit",
      selectedCategoryKey: target.category || "OTHER",
      editForm: {
        id: target.id,
        name: target.name || "",
        metValue: String(toNumber(target.metValue)),
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
      selectedCategoryKey: "CARDIO",
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
    const metValue = Number(this.data.editForm.metValue);
    if (!String(this.data.editForm.name || "").trim()) {
      wx.showToast({ title: "请输入运动名称", icon: "none" });
      return null;
    }
    if (!metValue || metValue <= 0) {
      wx.showToast({ title: "请输入正确 MET 值", icon: "none" });
      return null;
    }

    return {
      name: String(this.data.editForm.name || "").trim(),
      metValue,
      category: this.data.selectedCategoryKey,
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
      ? updateExercise(this.data.editForm.id, payload)
      : createExercise(payload);

    this.setData({ saving: true });
    task
      .then((exercise) => {
        const normalizedExercise = {
          ...decorateExercise(exercise),
          metValue: toNumber(exercise.metValue),
        };
        wx.showToast({ title: this.data.editMode === "edit" ? "已保存" : "创建成功", icon: "success" });

        if (this.data.editMode === "create" && this.data.launchedFromSelector && this.openerEventChannel) {
          this.openerEventChannel.emit("exerciseCreated", normalizedExercise);
          setTimeout(() => {
            wx.navigateBack();
          }, 280);
          return;
        }

        this.closeSheet();
        this.loadExercises();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  },

  handleDelete(event) {
    const exerciseId = Number(event.currentTarget.dataset.id || this.data.editForm.id);
    const target = this.data.exercises.find((item) => Number(item.id) === exerciseId);
    if (!target) {
      return;
    }

    wx.showModal({
      title: "删除运动",
      content: `确认删除“${target.name}”吗？`,
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        deleteExercise(exerciseId)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.closeSheet();
            this.loadExercises();
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          });
      },
    });
  },
});

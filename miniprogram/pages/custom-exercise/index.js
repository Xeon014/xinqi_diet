const { createExercise, deleteExercise, searchExercises, updateExercise } = require("../../services/exercise");
const { EXERCISE_CATEGORIES, decorateExercise } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const CREATION_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.key !== "ALL");
const DELETE_ACTION_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = 42;
const SWIPE_ACTIVATE_DISTANCE = 8;

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
    categories: CREATION_CATEGORIES,
    exercises: [],
    displayedExercises: [],
    keyword: "",
    loading: false,
    saving: false,
    swipedExerciseId: null,
    swipingExerciseId: null,
    swipeOffsetX: 0,
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
    this.setData({
      displayedExercises: applySwipeState(displayedExercises, null, null, 0),
      swipedExerciseId: null,
      swipingExerciseId: null,
      swipeOffsetX: 0,
    });
  },

  handleKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleStartCreate() {
    this.closeSwipeActions();
    this.setData({
      sheetVisible: true,
      editMode: "create",
      selectedCategoryKey: "CARDIO",
      editForm: buildEmptyForm(),
    });
  },

  handleEdit(event) {
    this.closeSwipeActions();
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

  handleExerciseTouchStart(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch) {
      return;
    }
    const nextOpenedId = this.data.swipedExerciseId === id ? id : null;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeBaseOffsetX = this.data.swipedExerciseId === id ? DELETE_ACTION_WIDTH : 0;
    this.swipeMode = "";
    this.setData({
      swipingExerciseId: id,
      swipeOffsetX: this.swipeBaseOffsetX,
      swipedExerciseId: nextOpenedId,
      displayedExercises: applySwipeState(this.data.displayedExercises, nextOpenedId, id, this.swipeBaseOffsetX),
    });
  },

  handleExerciseTouchMove(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch || this.data.swipingExerciseId !== id || !Number.isFinite(this.swipeStartX)) {
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
      displayedExercises: applySwipeState(this.data.displayedExercises, this.data.swipedExerciseId, id, nextOffsetX),
    });
  },

  handleExerciseTouchEnd(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!Number.isFinite(id) || this.data.swipingExerciseId !== id) {
      return;
    }
    if (this.swipeMode !== "horizontal") {
      this.resetSwipeGesture();
      this.setData({
        swipingExerciseId: null,
        swipeOffsetX: 0,
        displayedExercises: applySwipeState(this.data.displayedExercises, this.data.swipedExerciseId, null, 0),
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
      swipedExerciseId: shouldOpen ? id : null,
      swipingExerciseId: null,
      swipeOffsetX: 0,
      displayedExercises: applySwipeState(this.data.displayedExercises, shouldOpen ? id : null, null, 0),
    });
  },

  closeSwipeActions() {
    if (this.data.swipedExerciseId == null && this.data.swipingExerciseId == null) {
      return;
    }
    this.resetSwipeGesture();
    this.setData({
      swipedExerciseId: null,
      swipingExerciseId: null,
      swipeOffsetX: 0,
      displayedExercises: applySwipeState(this.data.displayedExercises, null, null, 0),
    });
  },

  handleSwipeContentTap() {
    if (this.data.swipedExerciseId != null) {
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
    this.closeSwipeActions();
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
    this.closeSwipeActions();
    if (this.data.saving) {
      return;
    }
    const exerciseId = Number(event.currentTarget.dataset.id || this.data.editForm.id);
    const target = this.data.exercises.find((item) => Number(item.id) === exerciseId);
    if (!target) {
      return;
    }

    wx.showModal({
      title: "删除自定义运动",
      content: `确认删除“${target.name}”吗？`,
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ saving: true });
        deleteExercise(exerciseId)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
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
    });
  },
});

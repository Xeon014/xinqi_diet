const {
  createExerciseRecord,
  deleteExerciseRecord,
  getExerciseRecords,
  updateExerciseRecord,
} = require("../../services/exercise-record");
const { getToday } = require("../../utils/date");
const { INTENSITY_OPTIONS, getExerciseCategoryLabel, getIntensityLabel } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();
const DEFAULT_DURATION_MINUTES = 30;
const PREVIEW_WEIGHT_KG = 60;
const INTENSITY_FACTOR_MAP = {
  LOW: 0.8,
  MEDIUM: 1,
  HIGH: 1.2,
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function resolveIntensityFactor(intensity) {
  return INTENSITY_FACTOR_MAP[intensity] || 1;
}

function estimateCalories(metValue, durationMinutes, intensityLevel, weightKgSnapshot) {
  const duration = Math.max(toNumber(durationMinutes), 0);
  const weight = toNumber(weightKgSnapshot) > 0 ? toNumber(weightKgSnapshot) : PREVIEW_WEIGHT_KG;
  return (toNumber(metValue) * weight * duration / 60) * resolveIntensityFactor(intensityLevel);
}

function normalizeExercise(exercise) {
  return {
    id: exercise.id,
    recordId: null,
    name: exercise.name,
    categoryLabel: exercise.categoryLabel,
    metValue: toNumber(exercise.metValue),
    durationMinutes: String(DEFAULT_DURATION_MINUTES),
    intensityLevel: "MEDIUM",
    originDurationMinutes: null,
    originIntensityLevel: null,
    weightKgSnapshot: PREVIEW_WEIGHT_KG,
  };
}

function normalizeRecord(record) {
  return {
    id: record.exerciseId,
    recordId: record.id,
    name: record.exerciseName,
    categoryLabel: getExerciseCategoryLabel(record.category),
    metValue: toNumber(record.metValue),
    durationMinutes: String(record.durationMinutes || DEFAULT_DURATION_MINUTES),
    intensityLevel: record.intensityLevel || "MEDIUM",
    originDurationMinutes: toNumber(record.durationMinutes),
    originIntensityLevel: record.intensityLevel || "MEDIUM",
    weightKgSnapshot: toNumber(record.weightKgSnapshot) || PREVIEW_WEIGHT_KG,
  };
}

function hasItemChanged(item) {
  if (!item.recordId) {
    return false;
  }
  return toNumber(item.durationMinutes) !== toNumber(item.originDurationMinutes)
    || item.intensityLevel !== item.originIntensityLevel;
}

function decorateItem(item) {
  const durationMinutes = Math.max(toNumber(item.durationMinutes), 0);
  const totalCalories = estimateCalories(item.metValue, durationMinutes, item.intensityLevel, item.weightKgSnapshot);
  return {
    ...item,
    durationMinutes: item.durationMinutes,
    intensityLabel: getIntensityLabel(item.intensityLevel),
    totalCalories: toInteger(totalCalories),
  };
}

function resolveDateFromEvent(event) {
  if (!event || !event.detail) {
    return "";
  }
  return event.detail.recordDate || event.detail.value || "";
}

function buildMealEditorUrl({ mode, recordDate, mealType }) {
  return `/pages/meal-editor/index?mode=${encodeURIComponent(mode)}&recordDate=${encodeURIComponent(recordDate)}&mealType=${encodeURIComponent(mealType)}`;
}

Page({
  data: {
    mode: "create",
    mealType: "BREAKFAST",
    recordDate: getToday(),
    intensityOptions: INTENSITY_OPTIONS,
    exerciseItems: [],
    deletedRecordIds: [],
    totalBurnedCalories: 0,
  },

  onLoad(options) {
    const recordDate = options.recordDate || getToday();
    const mode = options.mode === "edit" ? "edit" : "create";
    const mealType = options.mealType || "BREAKFAST";

    this.setData({ mode, mealType, recordDate });

    wx.setNavigationBarTitle({
      title: mode === "edit" ? "编辑运动" : "记录运动",
    });

    if (mode === "edit") {
      this.loadExerciseRecords();
    }
  },

  loadExerciseRecords() {
    getExerciseRecords({ date: this.data.recordDate })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        this.applyExerciseItems(records.map(normalizeRecord));
        this.setData({ deletedRecordIds: [] });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleModeSwitch(event) {
    const nextMode = event.detail.mode;
    if (nextMode !== "DIET") {
      return;
    }

    const navigate = () => {
      wx.redirectTo({
        url: buildMealEditorUrl({
          mode: this.data.mode,
          recordDate: this.data.recordDate,
          mealType: this.data.mealType,
        }),
      });
    };

    if (this.hasPendingChanges()) {
      wx.showModal({
        title: "切换到饮食",
        content: "当前修改尚未保存，切换后会丢失，是否继续？",
        success: (result) => {
          if (result.confirm) {
            navigate();
          }
        },
      });
      return;
    }

    navigate();
  },

  handleDateChange(event) {
    const nextDate = resolveDateFromEvent(event);
    if (!nextDate || nextDate === this.data.recordDate) {
      return;
    }

    const switchDate = () => {
      this.setData({ recordDate: nextDate }, () => {
        if (this.data.mode === "edit") {
          this.loadExerciseRecords();
        }
      });
    };

    if (this.data.mode === "edit" && this.hasPendingChanges()) {
      wx.showModal({
        title: "切换日期",
        content: "当前修改尚未保存，切换后会丢失，是否继续？",
        success: (result) => {
          if (result.confirm) {
            switchDate();
          }
        },
      });
      return;
    }

    switchDate();
  },

  handleChooseExercise() {
    wx.navigateTo({
      url: "/pages/exercise-search/index",
      success: (res) => {
        res.eventChannel.on("exerciseSelected", (exercise) => {
          this.addExercise(normalizeExercise(exercise));
        });
      },
    });
  },

  addExercise(exercise) {
    const exerciseItems = [...this.data.exerciseItems];
    const targetIndex = exerciseItems.findIndex((item) => item.id === exercise.id);

    if (targetIndex >= 0) {
      const currentDuration = toNumber(exerciseItems[targetIndex].durationMinutes);
      exerciseItems[targetIndex] = {
        ...exerciseItems[targetIndex],
        durationMinutes: String(currentDuration + DEFAULT_DURATION_MINUTES),
      };
      this.applyExerciseItems(exerciseItems);
      wx.showToast({ title: "已合并到列表", icon: "none" });
      return;
    }

    exerciseItems.push(exercise);
    this.applyExerciseItems(exerciseItems);
  },

  handleDurationInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const exerciseItems = [...this.data.exerciseItems];
    exerciseItems[index] = {
      ...exerciseItems[index],
      durationMinutes: event.detail.value,
    };
    this.applyExerciseItems(exerciseItems);
  },

  handleIntensityChange(event) {
    const index = Number(event.currentTarget.dataset.index);
    const selectedIndex = Number(event.detail.value);
    const option = this.data.intensityOptions[selectedIndex];
    if (!option) {
      return;
    }

    const exerciseItems = [...this.data.exerciseItems];
    exerciseItems[index] = {
      ...exerciseItems[index],
      intensityLevel: option.value,
    };
    this.applyExerciseItems(exerciseItems);
  },

  handleRemoveExercise(event) {
    const index = Number(event.currentTarget.dataset.index);
    const targetItem = this.data.exerciseItems[index];
    const exerciseItems = this.data.exerciseItems.filter((_, itemIndex) => itemIndex !== index);

    if (targetItem && targetItem.recordId) {
      const deletedRecordIds = [...this.data.deletedRecordIds];
      if (!deletedRecordIds.includes(targetItem.recordId)) {
        deletedRecordIds.push(targetItem.recordId);
      }
      this.setData({ deletedRecordIds });
    }

    this.applyExerciseItems(exerciseItems);
  },

  applyExerciseItems(exerciseItems) {
    const normalizedItems = exerciseItems.map(decorateItem);
    const totalBurnedCalories = normalizedItems.reduce((sum, item) => sum + toNumber(item.totalCalories), 0);
    this.setData({
      exerciseItems: normalizedItems,
      totalBurnedCalories: toInteger(totalBurnedCalories),
    });
  },

  hasPendingChanges() {
    if (this.data.deletedRecordIds.length > 0) {
      return true;
    }

    if (this.data.exerciseItems.some((item) => !item.recordId)) {
      return true;
    }

    return this.data.exerciseItems.some((item) => hasItemChanged(item));
  },

  validateItems() {
    const isEdit = this.data.mode === "edit";

    if (!this.data.exerciseItems.length) {
      if (isEdit && this.data.deletedRecordIds.length > 0) {
        return true;
      }
      wx.showToast({ title: "请先添加运动", icon: "none" });
      return false;
    }

    const invalidItem = this.data.exerciseItems.find((item) => toNumber(item.durationMinutes) <= 0);
    if (invalidItem) {
      wx.showToast({ title: `请检查 ${invalidItem.name} 的时长`, icon: "none" });
      return false;
    }

    if (isEdit && !this.hasPendingChanges()) {
      wx.showToast({ title: "没有可保存的变更", icon: "none" });
      return false;
    }

    return true;
  },

  handleSubmit() {
    if (!this.validateItems()) {
      return;
    }

    if (this.data.mode === "edit") {
      this.submitEdit();
      return;
    }

    this.submitCreate();
  },

  submitCreate() {
    const tasks = this.data.exerciseItems.map((item) => createExerciseRecord({
      exerciseId: item.id,
      durationMinutes: toNumber(item.durationMinutes),
      intensityLevel: item.intensityLevel,
      recordDate: this.data.recordDate,
    }));

    Promise.all(tasks)
      .then(() => {
        this.handleSubmitSuccess();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  submitEdit() {
    const { exerciseItems, deletedRecordIds, recordDate } = this.data;

    const updateTasks = exerciseItems
      .filter((item) => item.recordId && hasItemChanged(item))
      .map((item) => updateExerciseRecord(item.recordId, {
        durationMinutes: toNumber(item.durationMinutes),
        intensityLevel: item.intensityLevel,
      }));

    const deleteTasks = deletedRecordIds.map((recordId) => deleteExerciseRecord(recordId));

    const createTasks = exerciseItems
      .filter((item) => !item.recordId)
      .map((item) => createExerciseRecord({
        exerciseId: item.id,
        durationMinutes: toNumber(item.durationMinutes),
        intensityLevel: item.intensityLevel,
        recordDate,
      }));

    Promise.all([...updateTasks, ...deleteTasks, ...createTasks])
      .then(() => {
        this.handleSubmitSuccess();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleSubmitSuccess() {
    app.globalData.refreshHomeOnShow = true;
    wx.showToast({ title: "已完成", icon: "success" });
    setTimeout(() => {
      wx.switchTab({ url: "/pages/home/index" });
    }, 350);
  },
});

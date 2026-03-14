const {
  createExerciseRecord,
  deleteExerciseRecord,
  getExerciseRecords,
  updateExerciseRecord,
} = require("../../services/exercise-record");
const { searchExercises } = require("../../services/exercise");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const {
  clearRecentExerciseSearches,
  getRecentExerciseSearches,
  saveRecentExerciseSearch,
} = require("../../utils/recent-exercise-searches");
const { getRecentExercises, saveRecentExercise } = require("../../utils/recent-exercises");
const {
  EXERCISE_CATEGORIES,
  INTENSITY_OPTIONS,
  decorateExercise,
  filterExercisesByCategory,
  getExerciseCategoryLabel,
  isBuiltinExercise,
  isCustomExercise,
} = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();
const FILTER_KEYS = {
  RECENT: "RECENT",
  RECENT_SEARCH: "RECENT_SEARCH",
  CUSTOM: "CUSTOM",
};

const SYSTEM_FILTERS = [
  { key: FILTER_KEYS.RECENT, label: "最近运动" },
  { key: FILTER_KEYS.RECENT_SEARCH, label: "最近搜索" },
  { key: FILTER_KEYS.CUSTOM, label: "自定义" },
];

const BUILTIN_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.key !== "ALL");
const DEFAULT_DURATION_MINUTES = 30;
const PREVIEW_WEIGHT_KG = 60;
const INTENSITY_FACTOR_MAP = {
  LOW: 0.8,
  MEDIUM: 1,
  HIGH: 1.2,
};

function syncNavigationTitle(pageMode) {
  wx.setNavigationBarTitle({
    title: pageMode === "edit" ? "编辑运动" : "添加运动",
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
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
    name: exercise.name,
    category: exercise.category,
    categoryLabel: exercise.categoryLabel,
    aliases: exercise.aliases,
    metValue: toNumber(exercise.metValue),
    durationMinutes: String(DEFAULT_DURATION_MINUTES),
    intensityLevel: "MEDIUM",
    weightKgSnapshot: PREVIEW_WEIGHT_KG,
  };
}

function normalizeRecord(record) {
  return {
    id: record.exerciseId,
    recordId: record.id,
    name: record.exerciseName,
    category: record.category,
    categoryLabel: record.categoryLabel || getExerciseCategoryLabel(record.category),
    aliases: "",
    metValue: toNumber(record.metValue),
    durationMinutes: String(record.durationMinutes || DEFAULT_DURATION_MINUTES),
    intensityLevel: record.intensityLevel || "MEDIUM",
    weightKgSnapshot: toNumber(record.weightKgSnapshot) || PREVIEW_WEIGHT_KG,
  };
}

function includesKeyword(exercise, keyword) {
  if (!keyword) {
    return true;
  }
  const normalizedKeyword = keyword.toLowerCase();
  return String(exercise.name || "").toLowerCase().includes(normalizedKeyword)
    || String(exercise.aliases || "").toLowerCase().includes(normalizedKeyword);
}

function getKeywordFromConfirmEvent(event, fallbackKeyword) {
  if (event && event.detail && typeof event.detail.value === "string") {
    return event.detail.value;
  }
  return fallbackKeyword;
}

Page({
  data: {
    recordDate: getToday(),
    source: "",
    enableDirectEdit: false,
    pageMode: "create",
    pageRecordId: null,
    keyword: "",
    isSearching: false,
    showRecentSearchList: false,
    showExerciseSection: false,
    showCustomCreateAction: false,
    systemFilters: SYSTEM_FILTERS,
    builtinCategories: BUILTIN_CATEGORIES,
    selectedCategoryKey: FILTER_KEYS.RECENT,
    currentCategoryLabel: "最近运动",
    exercises: [],
    recentExercises: [],
    recentSearches: [],
    displayedExercises: [],
    emptyTitle: "最近运动为空",
    emptyDescription: "完成一次运动记录后会出现在这里。",
    intensityOptions: INTENSITY_OPTIONS,
    editorVisible: false,
    editorMode: "create",
    editorLoading: false,
    editorCanDelete: false,
    editorRecordId: null,
    editorRecordDate: getToday(),
    editorExerciseId: null,
    editorExerciseName: "",
    editorCategory: "",
    editorCategoryLabel: "",
    editorAliases: "",
    editorMetValue: 0,
    editorDurationMinutes: String(DEFAULT_DURATION_MINUTES),
    editorIntensityLevel: "MEDIUM",
    editorWeightKgSnapshot: PREVIEW_WEIGHT_KG,
    editorTotalCalories: 0,
  },

  onLoad(options = {}) {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.userId = getCurrentUserId();
    const recordDate = options.recordDate || getToday();
    const source = options.source || "";
    const pageMode = options.mode === "edit" ? "edit" : "create";
    const parsedRecordId = Number(options.recordId);
    const pageRecordId = Number.isFinite(parsedRecordId) && parsedRecordId > 0 ? parsedRecordId : null;
    const enableDirectEdit = Boolean(source) || pageMode === "edit";

    syncNavigationTitle(pageMode);

    this.setData({
      recordDate,
      source,
      enableDirectEdit,
      pageMode,
      pageRecordId,
    }, () => {
      this.loadRecentSearches();
      this.loadExercises();

      if (pageMode === "edit") {
        if (!pageRecordId) {
          wx.showToast({ title: "记录不存在", icon: "none" });
          this.goHome();
          return;
        }
        this.openEditorByRecordId(pageRecordId);
      }
    });
  },

  loadExercises() {
    searchExercises()
      .then((result) => {
        const exercises = (result.exercises || []).map((item) => ({
          ...decorateExercise(item),
          metValue: toNumber(item.metValue),
        }));
        const recentExercises = this.userId
          ? getRecentExercises(this.userId).map((item) => ({
            ...decorateExercise(item),
            metValue: toNumber(item.metValue),
          }))
          : [];

        this.setData({ exercises, recentExercises }, () => {
          this.refreshDisplayedExercises();
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  loadRecentSearches() {
    this.setData({ recentSearches: getRecentExerciseSearches(this.userId) }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleOpenCustomExercise() {
    wx.navigateTo({
      url: "/pages/custom-exercise/index?mode=create&from=selector",
      success: (res) => {
        res.eventChannel.on("exerciseCreated", (exercise) => {
          const normalizedExercise = {
            ...decorateExercise(exercise),
            metValue: toNumber(exercise.metValue),
          };

          if (this.data.enableDirectEdit) {
            const nextExercises = [
              normalizedExercise,
              ...this.data.exercises.filter((item) => Number(item.id) !== Number(normalizedExercise.id)),
            ];
            this.setData({ exercises: nextExercises }, () => {
              this.refreshDisplayedExercises();
              this.openExerciseEditor(normalizedExercise);
            });
            return;
          }

          if (this.openerEventChannel) {
            this.openerEventChannel.emit("exerciseSelected", normalizedExercise);
            setTimeout(() => {
              wx.navigateBack();
            }, 320);
            return;
          }
          this.loadExercises();
        });
      },
    });
  },

  handleInput(event) {
    const keyword = String(event.detail.value || "");
    this.setData({ keyword, isSearching: Boolean(keyword.trim()) }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleSearchConfirm(event) {
    const keyword = getKeywordFromConfirmEvent(event, this.data.keyword).trim();
    this.setData({ keyword, isSearching: Boolean(keyword) }, () => {
      if (keyword && this.userId) {
        saveRecentExerciseSearch(this.userId, keyword);
        this.loadRecentSearches();
        return;
      }
      this.refreshDisplayedExercises();
    });
  },

  handleCategoryTap(event) {
    this.setData({ selectedCategoryKey: event.currentTarget.dataset.key }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleTapRecentSearch(event) {
    const keyword = String(event.currentTarget.dataset.keyword || "").trim();
    if (!keyword) {
      return;
    }

    this.setData({ keyword, isSearching: true }, () => {
      if (this.userId) {
        saveRecentExerciseSearch(this.userId, keyword);
        this.loadRecentSearches();
        return;
      }
      this.refreshDisplayedExercises();
    });
  },

  handleClearRecentSearches() {
    clearRecentExerciseSearches(this.userId);
    this.setData({ recentSearches: [] }, () => {
      this.refreshDisplayedExercises();
    });
  },

  refreshDisplayedExercises() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const isSearching = Boolean(keyword);
    const selectedCategoryKey = this.data.selectedCategoryKey;

    let displayedExercises = [];
    let showRecentSearchList = false;
    let showCustomCreateAction = false;
    let currentCategoryLabel = this.getCategoryLabel(selectedCategoryKey);

    if (isSearching) {
      displayedExercises = this.buildAllExercises(keyword);
      currentCategoryLabel = "搜索结果";
    } else if (selectedCategoryKey === FILTER_KEYS.RECENT) {
      displayedExercises = this.buildRecentExercises(keyword);
    } else if (selectedCategoryKey === FILTER_KEYS.RECENT_SEARCH) {
      showRecentSearchList = true;
    } else if (selectedCategoryKey === FILTER_KEYS.CUSTOM) {
      displayedExercises = this.buildCustomExercises(keyword);
      showCustomCreateAction = true;
    } else {
      displayedExercises = this.buildBuiltinExercises(keyword, selectedCategoryKey);
    }

    const emptyState = this.resolveEmptyState({ categoryKey: selectedCategoryKey, isSearching });

    this.setData({
      isSearching,
      displayedExercises,
      showRecentSearchList,
      showExerciseSection: displayedExercises.length > 0 || showCustomCreateAction,
      showCustomCreateAction,
      currentCategoryLabel,
      emptyTitle: emptyState.emptyTitle,
      emptyDescription: emptyState.emptyDescription,
    });
  },

  getCategoryLabel(categoryKey) {
    const allFilters = [...this.data.systemFilters, ...this.data.builtinCategories];
    const matched = allFilters.find((item) => item.key === categoryKey);
    return matched ? matched.label : "运动列表";
  },

  buildRecentExercises(keyword) {
    return this.data.recentExercises
      .slice()
      .sort((a, b) => Number(b.usedAt || 0) - Number(a.usedAt || 0))
      .filter((item) => includesKeyword(item, keyword));
  },

  buildCustomExercises(keyword) {
    return this.data.exercises
      .filter((item) => isCustomExercise(item))
      .filter((item) => includesKeyword(item, keyword));
  },

  buildBuiltinExercises(keyword, categoryKey) {
    return filterExercisesByCategory(this.data.exercises, categoryKey)
      .filter((item) => isBuiltinExercise(item))
      .filter((item) => includesKeyword(item, keyword));
  },

  buildAllExercises(keyword) {
    return this.data.exercises.filter((item) => includesKeyword(item, keyword));
  },

  resolveEmptyState({ categoryKey, isSearching }) {
    if (isSearching) {
      return {
        emptyTitle: "暂无运动项目",
        emptyDescription: "换个关键词试试",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT) {
      return {
        emptyTitle: "最近运动为空",
        emptyDescription: "完成一次运动记录后会出现在这里。",
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT_SEARCH) {
      return {
        emptyTitle: "暂无最近搜索",
        emptyDescription: "先搜索一次运动，这里会保留关键词。",
      };
    }

    if (categoryKey === FILTER_KEYS.CUSTOM) {
      return {
        emptyTitle: "暂无自定义运动",
        emptyDescription: "可在右上角添加自定义运动。",
      };
    }

    return {
      emptyTitle: "当前分类暂无运动",
      emptyDescription: "试试切换分类，或添加自定义运动。",
    };
  },

  handleSelectExercise(event) {
    const index = Number(event.currentTarget.dataset.index);
    const exercise = this.data.displayedExercises[index];
    if (!exercise) {
      return;
    }
    if (this.data.enableDirectEdit) {
      this.openExerciseEditor(exercise);
      return;
    }
    if (this.openerEventChannel) {
      this.openerEventChannel.emit("exerciseSelected", exercise);
    }
    wx.navigateBack();
  },

  openExerciseEditor(exercise) {
    this.applyEditorExerciseData(normalizeExercise(exercise), {
      mode: "create",
      recordId: null,
      canDelete: false,
    });
  },

  openEditorByRecordId(recordId) {
    this.setData({
      editorVisible: true,
      editorMode: "edit",
      editorCanDelete: false,
      editorRecordId: recordId,
      editorLoading: true,
    });

    getExerciseRecords({ date: this.data.recordDate })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        const targetRecord = records.find((item) => Number(item.id) === Number(recordId));
        if (!targetRecord) {
          wx.showToast({ title: "记录不存在或已删除", icon: "none" });
          this.goHome();
          return;
        }

        this.applyEditorExerciseData(normalizeRecord(targetRecord), {
          mode: "edit",
          recordId: Number(targetRecord.id),
          canDelete: true,
          recordDate: targetRecord.recordDate,
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
        this.goHome();
      })
      .finally(() => {
        this.setData({ editorLoading: false });
      });
  },

  applyEditorExerciseData(exercise, options = {}) {
    const durationMinutes = String(exercise.durationMinutes || DEFAULT_DURATION_MINUTES);
    const intensityLevel = exercise.intensityLevel || "MEDIUM";
    const totalCalories = estimateCalories(
      exercise.metValue,
      durationMinutes,
      intensityLevel,
      exercise.weightKgSnapshot
    );

    this.setData({
      editorVisible: true,
      editorMode: options.mode || "create",
      editorCanDelete: Boolean(options.canDelete),
      editorRecordId: options.recordId || null,
      editorRecordDate: options.recordDate || this.data.recordDate,
      editorExerciseId: exercise.id,
      editorExerciseName: exercise.name || "运动",
      editorCategory: exercise.category || "",
      editorCategoryLabel: exercise.categoryLabel || "",
      editorAliases: exercise.aliases || "",
      editorMetValue: toNumber(exercise.metValue),
      editorDurationMinutes: durationMinutes,
      editorIntensityLevel: intensityLevel,
      editorWeightKgSnapshot: toNumber(exercise.weightKgSnapshot) || PREVIEW_WEIGHT_KG,
      editorTotalCalories: toInteger(totalCalories),
    });
  },

  handleEditorDateChange(event) {
    if (this.data.editorLoading) {
      return;
    }

    const editorRecordDate = event.detail.value;
    if (!editorRecordDate) {
      return;
    }

    this.setData({ editorRecordDate });
  },

  handleEditorDurationInput(event) {
    const editorDurationMinutes = event.detail.value;
    this.setData({
      editorDurationMinutes,
      editorTotalCalories: toInteger(estimateCalories(
        this.data.editorMetValue,
        editorDurationMinutes,
        this.data.editorIntensityLevel,
        this.data.editorWeightKgSnapshot
      )),
    });
  },

  handleEditorIntensityChange(event) {
    const selectedIndex = Number(event.detail.value);
    const option = this.data.intensityOptions[selectedIndex];
    if (!option) {
      return;
    }

    this.setData({
      editorIntensityLevel: option.value,
      editorTotalCalories: toInteger(estimateCalories(
        this.data.editorMetValue,
        this.data.editorDurationMinutes,
        option.value,
        this.data.editorWeightKgSnapshot
      )),
    });
  },

  validateEditor() {
    if (!this.data.editorExerciseId) {
      wx.showToast({ title: "请选择运动", icon: "none" });
      return false;
    }
    if (!this.data.editorRecordDate) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return false;
    }
    if (toNumber(this.data.editorDurationMinutes) <= 0) {
      wx.showToast({ title: "请输入正确时长", icon: "none" });
      return false;
    }
    return true;
  },

  syncHomeAfterSave(recordDate) {
    app.globalData.refreshHomeOnShow = true;
    if (this.data.source === "home") {
      app.globalData.pendingHomeRecordDate = recordDate;
    }
  },

  handleEditorSubmit() {
    if (this.data.editorLoading) {
      return;
    }
    if (!this.validateEditor()) {
      return;
    }

    const durationMinutes = toNumber(this.data.editorDurationMinutes);
    const task = this.data.editorMode === "edit"
      ? updateExerciseRecord(this.data.editorRecordId, {
        durationMinutes,
        intensityLevel: this.data.editorIntensityLevel,
        recordDate: this.data.editorRecordDate,
      })
      : createExerciseRecord({
        exerciseId: this.data.editorExerciseId,
        durationMinutes,
        intensityLevel: this.data.editorIntensityLevel,
        recordDate: this.data.editorRecordDate,
      });

    this.setData({ editorLoading: true });
    task
      .then(() => {
        if (this.userId) {
          saveRecentExercise(this.userId, {
            id: this.data.editorExerciseId,
            name: this.data.editorExerciseName,
            metValue: this.data.editorMetValue,
            category: this.data.editorCategory,
            aliases: this.data.editorAliases,
          });
        }

        this.syncHomeAfterSave(this.data.editorRecordDate);
        wx.showToast({ title: "已保存", icon: "success" });
        setTimeout(() => {
          this.goHome();
        }, 320);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ editorLoading: false });
      });
  },

  handleEditorDelete() {
    if (!this.data.editorCanDelete || this.data.editorLoading) {
      return;
    }

    wx.showModal({
      title: "删除运动记录",
      content: "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        this.setData({ editorLoading: true });
        deleteExerciseRecord(this.data.editorRecordId)
          .then(() => {
            app.globalData.refreshHomeOnShow = true;
            wx.showToast({ title: "已删除", icon: "success" });
            setTimeout(() => {
              this.goHome();
            }, 320);
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          })
          .finally(() => {
            this.setData({ editorLoading: false });
          });
      },
    });
  },

  handleEditorClose() {
    if (this.data.editorLoading) {
      return;
    }

    if (this.data.editorMode === "edit") {
      this.goHome();
      return;
    }

    this.closeEditor();
  },

  closeEditor() {
    this.setData({
      editorVisible: false,
      editorMode: "create",
      editorCanDelete: false,
      editorRecordId: null,
      editorLoading: false,
      editorRecordDate: this.data.recordDate,
      editorExerciseId: null,
      editorExerciseName: "",
      editorCategory: "",
      editorCategoryLabel: "",
      editorAliases: "",
      editorMetValue: 0,
      editorDurationMinutes: String(DEFAULT_DURATION_MINUTES),
      editorIntensityLevel: "MEDIUM",
      editorWeightKgSnapshot: PREVIEW_WEIGHT_KG,
      editorTotalCalories: 0,
    });
  },

  noop() {
  },

  goHome() {
    wx.switchTab({ url: "/pages/home/index" });
  },
});

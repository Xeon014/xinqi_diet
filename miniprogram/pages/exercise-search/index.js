const {
  createExerciseRecord,
  deleteExerciseRecord,
  getExerciseRecordDetail,
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
const { getRecentExercises, removeRecentExercise, saveRecentExercise } = require("../../utils/recent-exercises");
const {
  EXERCISE_CATEGORIES,
  INTENSITY_OPTIONS,
  decorateExercise,
  filterExercisesByCategory,
  getExerciseCategoryLabel,
  getIntensityLabel,
  isBuiltinExercise,
  isCustomExercise,
} = require("../../utils/exercise");
const { APP_COPY } = require("../../utils/constants");
const { pickErrorMessage } = require("../../utils/request");

const app = getApp();
const EXERCISE_SEARCH_COPY = APP_COPY.exerciseSearch;
const FILTER_KEYS = {
  RECENT: "RECENT",
  RECENT_SEARCH: "RECENT_SEARCH",
  CUSTOM: "CUSTOM",
};

const SYSTEM_FILTERS = [
  { key: FILTER_KEYS.RECENT, label: "最近运动" },
  { key: FILTER_KEYS.RECENT_SEARCH, label: "最近搜索" },
  { key: FILTER_KEYS.CUSTOM, label: "自定义运动" },
];

const BUILTIN_CATEGORIES = EXERCISE_CATEGORIES.filter((item) => item.key !== "ALL");
const DEFAULT_DURATION_MINUTES = 30;
const PREVIEW_WEIGHT_KG = 60;
const DELETE_ACTION_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = 42;
const SWIPE_ACTIVATE_DISTANCE = 8;
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

function resolveRecentExerciseDuration(exercise) {
  const duration = toNumber(exercise && exercise.lastUsedDurationMinutes);
  return duration > 0 ? String(duration) : String(DEFAULT_DURATION_MINUTES);
}

function resolveRecentExerciseIntensity(exercise) {
  return exercise && exercise.lastUsedIntensityLevel ? exercise.lastUsedIntensityLevel : "MEDIUM";
}

function buildRecentExerciseMeta(exercise) {
  const duration = toNumber(exercise && exercise.lastUsedDurationMinutes);
  const intensityLabel = exercise && exercise.lastUsedIntensityLevel ? getIntensityLabel(exercise.lastUsedIntensityLevel) : "";
  const durationLabel = duration > 0 ? `${Math.round(duration)}min` : "";

  if (durationLabel && intensityLabel) {
    return `上次 ${durationLabel} · ${intensityLabel}`;
  }
  if (durationLabel) {
    return `上次 ${durationLabel}`;
  }
  if (intensityLabel) {
    return `上次 ${intensityLabel}`;
  }
  return exercise && exercise.categoryLabel ? exercise.categoryLabel : "";
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

function clampSwipeOffset(offsetX, maxWidth = DELETE_ACTION_WIDTH) {
  if (!Number.isFinite(offsetX) || offsetX < 0) {
    return 0;
  }
  if (offsetX > maxWidth) {
    return maxWidth;
  }
  return offsetX;
}

function applyRecentExerciseSwipeState(items, swipedExerciseId, swipingExerciseId, swipeOffsetX, actionWidth = DELETE_ACTION_WIDTH) {
  return (items || []).map((item) => {
    const isSwiping = Number(item.id) === swipingExerciseId;
    const isOpened = Number(item.id) === swipedExerciseId;
    const offsetX = isSwiping
      ? clampSwipeOffset(swipeOffsetX, actionWidth)
      : (isOpened ? actionWidth : 0);
    return Object.assign({}, item, {
      swipeOffsetX: offsetX,
      swipeContentStyle: `transform: translateX(-${offsetX}px);transition:${isSwiping ? "none" : "transform 180ms ease"};`,
    });
  });
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
    showHistoryEntry: false,
    systemFilters: SYSTEM_FILTERS,
    builtinCategories: BUILTIN_CATEGORIES,
    selectedCategoryKey: FILTER_KEYS.RECENT,
    currentCategoryLabel: "最近运动",
    exercises: [],
    recentExercises: [],
    recentSearches: [],
    displayedExercises: [],
    enableRecentExerciseSwipe: false,
    swipedRecentExerciseId: null,
    swipingRecentExerciseId: null,
    recentExerciseSwipeOffsetX: 0,
    emptyTitle: EXERCISE_SEARCH_COPY.recentEmptyTitle,
    emptyDescription: EXERCISE_SEARCH_COPY.recentEmptyDescription,
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
    this.recentExerciseSwipeStartX = null;
    this.recentExerciseSwipeStartY = null;
    this.recentExerciseSwipeBaseOffsetX = 0;
    this.recentExerciseSwipeMode = "";
    const recordDate = options.recordDate || getToday();
    const source = options.source || "";
    const pageMode = options.mode === "edit" ? "edit" : (options.mode === "copy" ? "copy" : "create");
    const parsedRecordId = Number(options.recordId);
    const pageRecordId = Number.isFinite(parsedRecordId) && parsedRecordId > 0 ? parsedRecordId : null;
    const enableDirectEdit = Boolean(source) || pageMode === "edit" || pageMode === "copy";

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

      if (pageMode === "edit" || pageMode === "copy") {
        if (!pageRecordId) {
          wx.showToast({ title: "记录不存在", icon: "none" });
          this.goHome();
          return;
        }
        if (pageMode === "edit") {
          this.openEditorByRecordId(pageRecordId);
          return;
        }
        this.openCopyEditorByRecordId(pageRecordId);
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
    this.closeRecentExerciseSwipeActions();
    this.setData({ selectedCategoryKey: event.currentTarget.dataset.key }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleTapRecentSearch(event) {
    const keyword = String(event.currentTarget.dataset.keyword || "").trim();
    if (!keyword) {
      return;
    }

    this.closeRecentExerciseSwipeActions();
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

  handleRecentExerciseTouchStart(event) {
    if (!this.data.enableRecentExerciseSwipe) {
      return;
    }
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch) {
      return;
    }
    const nextOpenedId = this.data.swipedRecentExerciseId === id ? id : null;
    const actionWidth = this.getRecentExerciseActionWidth();
    this.recentExerciseSwipeStartX = touch.clientX;
    this.recentExerciseSwipeStartY = touch.clientY;
    this.recentExerciseSwipeBaseOffsetX = this.data.swipedRecentExerciseId === id ? actionWidth : 0;
    this.recentExerciseSwipeMode = "";
    this.setData({
      swipingRecentExerciseId: id,
      recentExerciseSwipeOffsetX: this.recentExerciseSwipeBaseOffsetX,
      swipedRecentExerciseId: nextOpenedId,
      displayedExercises: applyRecentExerciseSwipeState(
        this.data.displayedExercises,
        nextOpenedId,
        id,
        this.recentExerciseSwipeBaseOffsetX,
        actionWidth
      ),
    });
  },

  handleRecentExerciseTouchMove(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!this.data.enableRecentExerciseSwipe || !Number.isFinite(id) || !touch) {
      return;
    }
    if (this.data.swipingRecentExerciseId !== id || !Number.isFinite(this.recentExerciseSwipeStartX)) {
      return;
    }
    const deltaX = this.recentExerciseSwipeStartX - touch.clientX;
    const deltaY = Math.abs((this.recentExerciseSwipeStartY || 0) - touch.clientY);
    if (!this.recentExerciseSwipeMode) {
      if (Math.abs(deltaX) < SWIPE_ACTIVATE_DISTANCE && deltaY < SWIPE_ACTIVATE_DISTANCE) {
        return;
      }
      this.recentExerciseSwipeMode = Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
    }
    if (this.recentExerciseSwipeMode !== "horizontal") {
      return;
    }
    const actionWidth = this.getRecentExerciseActionWidth();
    const nextOffsetX = clampSwipeOffset(this.recentExerciseSwipeBaseOffsetX + deltaX, actionWidth);
    this.setData({
      recentExerciseSwipeOffsetX: nextOffsetX,
      displayedExercises: applyRecentExerciseSwipeState(
        this.data.displayedExercises,
        this.data.swipedRecentExerciseId,
        id,
        nextOffsetX,
        actionWidth
      ),
    });
  },

  handleRecentExerciseTouchEnd(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!this.data.enableRecentExerciseSwipe || !Number.isFinite(id) || this.data.swipingRecentExerciseId !== id) {
      return;
    }
    if (this.recentExerciseSwipeMode !== "horizontal") {
      this.resetRecentExerciseSwipeGesture();
      this.setData({
        swipingRecentExerciseId: null,
        recentExerciseSwipeOffsetX: 0,
        displayedExercises: applyRecentExerciseSwipeState(
          this.data.displayedExercises,
          this.data.swipedRecentExerciseId,
          null,
          0,
          this.getRecentExerciseActionWidth()
        ),
      });
      return;
    }
    this.finishRecentExerciseSwipe(
      id,
      this.data.recentExerciseSwipeOffsetX >= SWIPE_OPEN_THRESHOLD
    );
  },

  handleRecentExerciseContentTap(event) {
    if (this.data.swipedRecentExerciseId != null) {
      this.closeRecentExerciseSwipeActions();
      return;
    }
    this.handleSelectExercise(event);
  },

  handleRecentExerciseListBackgroundTap() {
    this.closeRecentExerciseSwipeActions();
  },

  handleDeleteRecentExercise(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!this.userId || !Number.isFinite(id)) {
      return;
    }
    removeRecentExercise(this.userId, id);
    this.closeRecentExerciseSwipeActions();
    this.loadExercises();
    wx.showToast({ title: "已移除", icon: "success" });
  },

  resetRecentExerciseSwipeGesture() {
    this.recentExerciseSwipeStartX = null;
    this.recentExerciseSwipeStartY = null;
    this.recentExerciseSwipeBaseOffsetX = 0;
    this.recentExerciseSwipeMode = "";
  },

  finishRecentExerciseSwipe(id, shouldOpen) {
    this.resetRecentExerciseSwipeGesture();
    this.setData({
      swipedRecentExerciseId: shouldOpen ? id : null,
      swipingRecentExerciseId: null,
      recentExerciseSwipeOffsetX: 0,
      displayedExercises: applyRecentExerciseSwipeState(
        this.data.displayedExercises,
        shouldOpen ? id : null,
        null,
        0,
        this.getRecentExerciseActionWidth()
      ),
    });
  },

  closeRecentExerciseSwipeActions() {
    if (this.data.swipedRecentExerciseId == null && this.data.swipingRecentExerciseId == null) {
      return;
    }
    this.resetRecentExerciseSwipeGesture();
    this.setData({
      swipedRecentExerciseId: null,
      swipingRecentExerciseId: null,
      recentExerciseSwipeOffsetX: 0,
      displayedExercises: applyRecentExerciseSwipeState(
        this.data.displayedExercises,
        null,
        null,
        0,
        this.getRecentExerciseActionWidth()
      ),
    });
  },

  refreshDisplayedExercises() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const isSearching = Boolean(keyword);
    const selectedCategoryKey = this.data.selectedCategoryKey;
    const enableRecentExerciseSwipe = !isSearching && selectedCategoryKey === FILTER_KEYS.RECENT;
    const showHistoryEntry = this.data.enableDirectEdit && selectedCategoryKey === FILTER_KEYS.RECENT;

    let displayedExercises = [];
    let showRecentSearchList = false;
    let showCustomCreateAction = false;
    let currentCategoryLabel = this.getCategoryLabel(selectedCategoryKey);

    if (isSearching) {
      displayedExercises = this.buildAllExercises(keyword);
      currentCategoryLabel = "搜索结果";
    } else if (selectedCategoryKey === FILTER_KEYS.RECENT) {
      displayedExercises = this.buildRecentExercises(keyword).map((item) => ({
        ...item,
        recentMetaText: buildRecentExerciseMeta(item),
      }));
    } else if (selectedCategoryKey === FILTER_KEYS.RECENT_SEARCH) {
      showRecentSearchList = true;
    } else if (selectedCategoryKey === FILTER_KEYS.CUSTOM) {
      displayedExercises = this.buildCustomExercises(keyword);
      showCustomCreateAction = true;
    } else {
      displayedExercises = this.buildBuiltinExercises(keyword, selectedCategoryKey);
    }

    const emptyState = this.resolveEmptyState({ categoryKey: selectedCategoryKey, isSearching });

    const nextSwipedRecentExerciseId = enableRecentExerciseSwipe
      && displayedExercises.some((item) => Number(item.id) === Number(this.data.swipedRecentExerciseId))
      ? this.data.swipedRecentExerciseId
      : null;
    const nextSwipingRecentExerciseId = enableRecentExerciseSwipe
      && displayedExercises.some((item) => Number(item.id) === Number(this.data.swipingRecentExerciseId))
      ? this.data.swipingRecentExerciseId
      : null;
    const nextRecentExerciseSwipeOffsetX = enableRecentExerciseSwipe && nextSwipingRecentExerciseId != null
      ? this.data.recentExerciseSwipeOffsetX
      : 0;
    if (enableRecentExerciseSwipe) {
      const actionWidth = this.getRecentExerciseActionWidth();
      displayedExercises = applyRecentExerciseSwipeState(
        displayedExercises,
        nextSwipedRecentExerciseId,
        nextSwipingRecentExerciseId,
        nextRecentExerciseSwipeOffsetX,
        actionWidth
      );
    }

    this.setData({
      isSearching,
      displayedExercises,
      enableRecentExerciseSwipe,
      swipedRecentExerciseId: nextSwipedRecentExerciseId,
      swipingRecentExerciseId: nextSwipingRecentExerciseId,
      recentExerciseSwipeOffsetX: nextRecentExerciseSwipeOffsetX,
      showRecentSearchList,
      showExerciseSection: displayedExercises.length > 0 || showCustomCreateAction || showHistoryEntry,
      showHistoryEntry,
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

  getRecentExerciseActionWidth() {
    return DELETE_ACTION_WIDTH;
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
        emptyTitle: EXERCISE_SEARCH_COPY.searchEmptyTitle,
        emptyDescription: EXERCISE_SEARCH_COPY.searchEmptyDescription,
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT) {
      return {
        emptyTitle: EXERCISE_SEARCH_COPY.recentEmptyTitle,
        emptyDescription: EXERCISE_SEARCH_COPY.recentEmptyDescription,
      };
    }

    if (categoryKey === FILTER_KEYS.RECENT_SEARCH) {
      return {
        emptyTitle: EXERCISE_SEARCH_COPY.recentSearchEmptyTitle,
        emptyDescription: EXERCISE_SEARCH_COPY.recentSearchEmptyDescription,
      };
    }

    if (categoryKey === FILTER_KEYS.CUSTOM) {
      return {
        emptyTitle: EXERCISE_SEARCH_COPY.customEmptyTitle,
        emptyDescription: EXERCISE_SEARCH_COPY.customEmptyDescription,
      };
    }

    return {
      emptyTitle: EXERCISE_SEARCH_COPY.categoryEmptyTitle,
      emptyDescription: EXERCISE_SEARCH_COPY.categoryEmptyDescription,
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
    this.applyEditorExerciseData({
      ...normalizeExercise(exercise),
      durationMinutes: resolveRecentExerciseDuration(exercise),
      intensityLevel: resolveRecentExerciseIntensity(exercise),
    }, {
      mode: "create",
      recordId: null,
      canDelete: false,
    });
  },

  openExerciseEditorFromRecord(record, options = {}) {
    if (!record || !record.exerciseId) {
      wx.showToast({ title: "记录不存在或已删除", icon: "none" });
      return;
    }

    this.applyEditorExerciseData(normalizeRecord(record), options);
  },

  openEditorByRecordId(recordId) {
    this.setData({
      editorVisible: true,
      editorMode: "edit",
      editorCanDelete: false,
      editorRecordId: recordId,
      editorLoading: true,
    });

    getExerciseRecordDetail(recordId)
      .then((record) => {
        this.openExerciseEditorFromRecord(record, {
          mode: "edit",
          recordId: Number(record.id),
          canDelete: true,
          recordDate: record.recordDate,
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

  openCopyEditorByRecordId(recordId) {
    this.setData({
      editorVisible: true,
      editorMode: "create",
      editorCanDelete: false,
      editorRecordId: null,
      editorLoading: true,
    });

    getExerciseRecordDetail(recordId)
      .then((record) => {
        this.openExerciseEditorFromRecord(record, {
          mode: "create",
          recordId: null,
          canDelete: false,
          recordDate: this.data.recordDate,
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

  handleOpenHistory() {
    if (!this.data.enableDirectEdit) {
      return;
    }

    wx.navigateTo({
      url: `/pages/exercise-history/index?targetDate=${encodeURIComponent(this.data.recordDate)}`,
      success: (res) => {
        res.eventChannel.on("exerciseHistorySelected", (record) => {
          this.openExerciseEditorFromRecord(record, {
            mode: "create",
            recordId: null,
            canDelete: false,
            recordDate: this.data.recordDate,
          });
        });
      },
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
      }, { loadingMode: "none" })
      : createExerciseRecord({
        exerciseId: this.data.editorExerciseId,
        durationMinutes,
        intensityLevel: this.data.editorIntensityLevel,
        recordDate: this.data.editorRecordDate,
      }, { loadingMode: "none" });

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
            lastUsedDurationMinutes: durationMinutes,
            lastUsedIntensityLevel: this.data.editorIntensityLevel,
            lastUsedAt: Date.now(),
          });
        }

        this.syncHomeAfterSave(this.data.editorRecordDate);
        wx.showToast({ title: "已保存", icon: "success" });
        if (this.data.source === "home") {
          setTimeout(() => {
            this.goHome();
          }, 320);
        } else {
          this.loadExercises();
        }
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
        deleteExerciseRecord(this.data.editorRecordId, { loadingMode: "none" })
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

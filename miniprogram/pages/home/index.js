const { getDailySummary } = require("../../services/user");
const { getDailyHealthDiary } = require("../../services/health-diary");
const { createBodyMetricRecord, getDailyBodyMetricSnapshot } = require("../../services/body-metric");
const { deleteRecord, getRecords } = require("../../services/record");
const { deleteExerciseRecord } = require("../../services/exercise-record");
const { getCurrentUserId } = require("../../utils/auth");
const {
  APP_COPY,
  MEAL_TYPE_LABELS,
  QUANTITY_UNIT_LABELS,
  getRecommendedMealType: getRecommendedMealTypeByTime,
} = require("../../utils/constants");
const { addDays, combineDateAndTime, getCurrentMinute, getToday } = require("../../utils/date");
const { getIntensityLabel } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const ACTION_BUTTON_WIDTH = 84;
const DELETE_ACTION_WIDTH = ACTION_BUTTON_WIDTH * 2;
const SWIPE_OPEN_THRESHOLD = ACTION_BUTTON_WIDTH;
const SWIPE_ACTIVATE_DISTANCE = 8;

const DIET_GROUPS = [
  { key: "BREAKFAST", label: MEAL_TYPE_LABELS.BREAKFAST, type: "DIET", mealType: "BREAKFAST" },
  { key: "MORNING_SNACK", label: MEAL_TYPE_LABELS.MORNING_SNACK, type: "DIET", mealType: "MORNING_SNACK" },
  { key: "LUNCH", label: MEAL_TYPE_LABELS.LUNCH, type: "DIET", mealType: "LUNCH" },
  { key: "AFTERNOON_SNACK", label: MEAL_TYPE_LABELS.AFTERNOON_SNACK, type: "DIET", mealType: "AFTERNOON_SNACK" },
  { key: "DINNER", label: MEAL_TYPE_LABELS.DINNER, type: "DIET", mealType: "DINNER" },
  { key: "LATE_NIGHT_SNACK", label: MEAL_TYPE_LABELS.LATE_NIGHT_SNACK, type: "DIET", mealType: "LATE_NIGHT_SNACK" },
  { key: "OTHER", label: MEAL_TYPE_LABELS.OTHER, type: "DIET", mealType: "OTHER" },
];

const EXERCISE_GROUP = { key: "EXERCISE", label: "运动", type: "EXERCISE", mealType: "" };

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function getRecommendedMealType() {
  return getRecommendedMealTypeByTime(new Date());
}

function resolveDateLabel(recordDate) {
  const today = getToday();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (recordDate === today) {
    return "今天";
  }
  if (recordDate === yesterday) {
    return "昨天";
  }
  if (recordDate === tomorrow) {
    return "明天";
  }
  return recordDate;
}

function formatDietTitle(record) {
  const quantity = toInteger(record.quantityInGram);
  const quantityUnit = QUANTITY_UNIT_LABELS[String(record.quantityUnit || "G").toUpperCase()] || "g";
  return `${record.foodName || "食物"} ${quantity}${quantityUnit}`;
}

function formatExerciseTitle(record) {
  const duration = toInteger(record.durationMinutes);
  const intensity = getIntensityLabel(record.intensityLevel);
  return `${record.exerciseName || "运动"} ${duration}min ${intensity}`;
}

function normalizeRecord(record, today) {
  const isDiet = record.recordType === "DIET";
  const calories = toInteger(record.totalCalories);

  return {
    ...record,
    title: isDiet ? formatDietTitle(record) : formatExerciseTitle(record),
    signedCalories: `${isDiet ? "+" : "-"}${calories} kcal`,
    isDiet,
    recordDate: record.recordDate || today,
    recordKey: `${record.recordType || "UNKNOWN"}-${record.recordId || ""}-${record.createdAt || ""}`,
  };
}

function normalizeSummary(summary, today) {
  const records = (summary.records || []).map((record) => normalizeRecord(record, today));
  const netCalories = toInteger(summary.netCalories ?? summary.consumedCalories);
  const hasTarget = summary.targetCalories != null;
  const remainingCalories = hasTarget && summary.remainingCalories != null ? toInteger(summary.remainingCalories) : null;
  const dailyInsight = summary.dailyInsight || {};

  return {
    ...summary,
    targetCalories: hasTarget ? toInteger(summary.targetCalories) : null,
    dietCalories: toInteger(summary.dietCalories),
    exerciseCalories: toInteger(summary.exerciseCalories),
    netCalories,
    hasTarget,
    remainingCalories,
    remainingAbs: remainingCalories == null ? null : Math.abs(remainingCalories),
    exceededTarget: hasTarget && Boolean(summary.exceededTarget),
    records,
    summaryText: dailyInsight.summaryText || "",
  };
}

function normalizeDiary(diary) {
  if (!diary) {
    return null;
  }
  const content = String(diary.content || "").trim();
  const imageFileIds = Array.isArray(diary.imageFileIds)
    ? diary.imageFileIds.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
    : [];
  const contentPreview = content.length > 48 ? `${content.slice(0, 48)}...` : content;

  return {
    ...diary,
    content,
    contentPreview,
    imageFileIds,
    hasContent: content.length > 0,
    hasImages: imageFileIds.length > 0,
  };
}

function formatWeightValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "待记录";
  }
  return number.toFixed(1);
}

function normalizeDailyWeight(snapshot) {
  const items = Array.isArray(snapshot && snapshot.items) ? snapshot.items : [];
  const weightItem = items.find((item) => item && item.metricKey === "WEIGHT");
  const hasWeight = weightItem && weightItem.latestValue != null;

  return {
    hasRecord: Boolean(hasWeight),
    title: hasWeight ? `体重 ${formatWeightValue(weightItem.latestValue)}kg` : "",
  };
}

function buildRecordGroups(records) {
  const groupedRecords = DIET_GROUPS.reduce((result, group) => {
    result[group.key] = [];
    return result;
  }, { EXERCISE: [] });

  (records || []).forEach((record) => {
    if (record.recordType === "DIET") {
      if (groupedRecords[record.mealType]) {
        groupedRecords[record.mealType].push(record);
      }
      return;
    }
    groupedRecords.EXERCISE.push(record);
  });

  return [
    ...DIET_GROUPS.map((group) => ({
      ...group,
      records: groupedRecords[group.key] || [],
      totalCalories: toInteger((groupedRecords[group.key] || []).reduce((sum, record) => sum + toNumber(record.totalCalories), 0)),
    })),
    {
      ...EXERCISE_GROUP,
      records: groupedRecords.EXERCISE,
      totalCalories: toInteger((groupedRecords.EXERCISE || []).reduce((sum, record) => sum + toNumber(record.totalCalories), 0)),
    },
  ].filter((group) => group.records.length > 0);
}

function buildRecommendedMealPrompt(recordDate, recommendedMealType, records) {
  const hiddenPrompt = {
    visible: false,
    title: "",
    actionText: "",
    mealType: "",
  };

  if (recordDate !== getToday() || !recommendedMealType) {
    return hiddenPrompt;
  }

  const hasRecommendedMealRecord = (records || []).some((record) => (
    record.recordType === "DIET" && record.mealType === recommendedMealType
  ));
  if (hasRecommendedMealRecord) {
    return hiddenPrompt;
  }

  const mealLabel = MEAL_TYPE_LABELS[recommendedMealType] || "当前餐次";
  return {
    visible: true,
    title: mealLabel,
    actionText: "去记录",
    mealType: recommendedMealType,
  };
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

function applySwipeStateToGroups(groups, swipedRecordKey, swipingRecordKey, swipeOffsetX) {
  return (groups || []).map((group) => ({
    ...group,
    records: (group.records || []).map((record) => {
      const isSwiping = record.recordKey === swipingRecordKey;
      const isOpened = record.recordKey === swipedRecordKey;
      const offsetX = isSwiping
        ? clampSwipeOffset(swipeOffsetX)
        : (isOpened ? DELETE_ACTION_WIDTH : 0);
      return {
        ...record,
        swipeOffsetX: offsetX,
        swipeContentStyle: `transform: translateX(-${offsetX}px);transition:${isSwiping ? "none" : "transform 180ms ease"};`,
      };
    }),
  }));
}

function buildFoodSearchUrl({ recordDate, mealType, source, mode, recordId }) {
  const params = [
    `recordDate=${encodeURIComponent(recordDate)}`,
    `mealType=${encodeURIComponent(mealType)}`,
    `source=${encodeURIComponent(source)}`,
  ];
  if (mode) {
    params.push(`mode=${encodeURIComponent(mode)}`);
  }
  if (recordId != null) {
    params.push(`recordId=${encodeURIComponent(recordId)}`);
  }
  return `/pages/food-search/index?${params.join("&")}`;
}

function buildExerciseSearchUrl({ recordDate, source, mode, recordId }) {
  const params = [
    `recordDate=${encodeURIComponent(recordDate)}`,
    `source=${encodeURIComponent(source)}`,
  ];
  if (mode) {
    params.push(`mode=${encodeURIComponent(mode)}`);
  }
  if (recordId != null) {
    params.push(`recordId=${encodeURIComponent(recordId)}`);
  }
  return `/pages/exercise-search/index?${params.join("&")}`;
}

function resolveMealNutrition(records) {
  return (records || []).reduce((acc, record) => {
    const quantity = toNumber(record.quantityInGram);
    const ratio = quantity > 0 ? quantity / 100 : 0;
    const totalCalories = toNumber(record.totalCalories);

    return {
      totalCalories: acc.totalCalories + totalCalories,
      totalProtein: acc.totalProtein + (toNumber(record.proteinPer100g) * ratio),
      totalCarbs: acc.totalCarbs + (toNumber(record.carbsPer100g) * ratio),
      totalFat: acc.totalFat + (toNumber(record.fatPer100g) * ratio),
    };
  }, {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  });
}

Page({
  data: {
    recordDate: getToday(),
    displayDateLabel: "今天",
    recommendedMealType: getRecommendedMealType(),
    recordGroups: [],
    collapsedMealGroups: {},
    swipedRecordKey: null,
    swipingRecordKey: null,
    swipeOffsetX: 0,
    recommendedMealPrompt: {
      visible: false,
      title: "",
      actionText: "",
      mealType: "",
    },
    summary: {
      targetCalories: null,
      dietCalories: 0,
      exerciseCalories: 0,
      netCalories: 0,
      hasTarget: false,
      remainingCalories: null,
      remainingAbs: null,
      exceededTarget: false,
      records: [],
      summaryText: "",
    },
    healthDiary: null,
    mealNutritionVisible: false,
    mealNutritionLoading: false,
    selectedMealLabel: "早餐",
    mealNutrition: {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
    weightEditorVisible: false,
    weightEditorLoading: false,
    weightEditorDate: getToday(),
    weightEditorTime: getCurrentMinute(),
    weightValue: "",
    quickMenuVisible: false,
    homeCopy: APP_COPY.home,
    dailyWeight: {
      hasRecord: false,
      title: "",
    },
  },

  onLoad() {
    this.userId = getCurrentUserId();
    this.refreshDateMeta();
  },

  onShow() {
    this.userId = getCurrentUserId();
    const app = getApp();
    const pendingHomeRecordDate = app.globalData.pendingHomeRecordDate || "";
    app.globalData.pendingHomeRecordDate = "";
    if (app.globalData.refreshHomeOnShow) {
      app.globalData.refreshHomeOnShow = false;
    }

    const continueShowFlow = () => {
      this.refreshDateMeta();
      this.maybeOpenOnboarding()
        .then((opened) => {
          if (!opened) {
            this.loadSummary();
          }
        })
        .catch(() => {
          this.loadSummary();
        });
    };

    if (pendingHomeRecordDate && pendingHomeRecordDate !== this.data.recordDate) {
      this.setData({ recordDate: pendingHomeRecordDate }, continueShowFlow);
      return;
    }

    continueShowFlow();
  },

  onPullDownRefresh() {
    this.loadSummary(true);
  },

  refreshDateMeta() {
    this.setData({
      displayDateLabel: resolveDateLabel(this.data.recordDate),
      recommendedMealType: getRecommendedMealType(),
    });
  },

  handlePrevDay() {
    this.shiftDay(-1);
  },

  handleNextDay() {
    this.shiftDay(1);
  },

  shiftDay(offset) {
    this.setData(
      {
        recordDate: addDays(this.data.recordDate, offset),
      },
      () => {
        this.refreshDateMeta();
        this.loadSummary();
      }
    );
  },

  handleDateChange(event) {
    this.setData(
      {
        recordDate: event.detail.value,
      },
      () => {
        this.refreshDateMeta();
        this.loadSummary();
      }
    );
  },

  handleBackToToday() {
    const today = getToday();
    if (this.data.recordDate === today) {
      return;
    }
    this.setData(
      {
        recordDate: today,
      },
      () => {
        this.refreshDateMeta();
        this.loadSummary();
      }
    );
  },

  maybeOpenOnboarding() {
    const app = getApp();
    if (!app || typeof app.ensureLogin !== "function" || typeof app.isOnboardingPending !== "function") {
      return Promise.resolve(false);
    }
    if (this.openingOnboarding) {
      return Promise.resolve(true);
    }

    return app.ensureLogin()
      .then((authResult) => {
        const userId = (authResult && authResult.userId) || getCurrentUserId();
        if (!userId || !app.isOnboardingPending(userId)) {
          return false;
        }
        this.openingOnboarding = true;
        wx.navigateTo({
          url: "/pages/onboarding-profile/index",
          complete: () => {
            this.openingOnboarding = false;
          },
        });
        return true;
      })
      .catch(() => false);
  },

  loadSummary(stopPullDown = false) {
    Promise.all([
      getDailySummary(this.data.recordDate),
      getDailyHealthDiary(this.data.recordDate),
      getDailyBodyMetricSnapshot(this.data.recordDate).catch(() => null),
    ])
      .then(([summary, diary, dailyWeightSnapshot]) => {
        const normalized = normalizeSummary(summary, this.data.recordDate);
        const recordGroups = applySwipeStateToGroups(
          this.decorateRecordGroups(buildRecordGroups(normalized.records)),
          null,
          null,
          0
        );
        const recommendedMealPrompt = buildRecommendedMealPrompt(
          this.data.recordDate,
          this.data.recommendedMealType,
          normalized.records
        );
        this.setData({
          summary: normalized,
          recordGroups,
          swipedRecordKey: null,
          swipingRecordKey: null,
          swipeOffsetX: 0,
          recommendedMealPrompt,
          healthDiary: normalizeDiary(diary),
          dailyWeight: normalizeDailyWeight(dailyWeightSnapshot),
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  handleOpenHealthDiary() {
    wx.navigateTo({
      url: `/pages/health-diary-editor/index?recordDate=${encodeURIComponent(this.data.recordDate)}`,
    });
  },

  handleQuickEntry() {
    this.setData({
      quickMenuVisible: true,
    });
  },

  handleCloseQuickMenu() {
    this.setData({
      quickMenuVisible: false,
    });
  },

  handleQuickMenuAction(event) {
    const { action } = event.currentTarget.dataset;
    this.setData({
      quickMenuVisible: false,
    });

    if (action === "weight") {
      this.handleOpenWeightEditor();
      return;
    }
    if (action === "diet") {
      this.handleQuickAddDiet();
      return;
    }
    if (action === "exercise") {
      this.handleQuickAddExercise();
      return;
    }
    if (action === "diary") {
      this.handleOpenHealthDiary();
    }
  },

  handleQuickAddDiet() {
    wx.navigateTo({
      url: buildFoodSearchUrl({
        mealType: this.data.recommendedMealType,
        recordDate: this.data.recordDate,
        source: "home",
      }),
    });
  },

  handleQuickAddExercise() {
    wx.navigateTo({
      url: buildExerciseSearchUrl({
        recordDate: this.data.recordDate,
        source: "home",
        mode: "create",
      }),
    });
  },

  handleQuickAddMeal(event) {
    this.closeSwipeActions();
    const { mealType } = event.currentTarget.dataset;
    if (!mealType) {
      return;
    }
    wx.navigateTo({
      url: buildFoodSearchUrl({
        mealType,
        recordDate: this.data.recordDate,
        source: "home",
      }),
    });
  },

  handleOpenRecommendedMealPrompt() {
    this.closeSwipeActions();
    const mealType = this.data.recommendedMealPrompt.mealType;
    if (!mealType) {
      return;
    }
    wx.navigateTo({
      url: buildFoodSearchUrl({
        mealType,
        recordDate: this.data.recordDate,
        source: "home",
      }),
    });
  },

  handleOpenMealNutrition(event) {
    this.closeSwipeActions();
    const { mealType } = event.currentTarget.dataset;
    if (!mealType) {
      return;
    }

    this.setData({
      mealNutritionVisible: true,
      mealNutritionLoading: true,
      selectedMealLabel: MEAL_TYPE_LABELS[mealType] || "餐次",
      mealNutrition: {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      },
    });

    getRecords({
      date: this.data.recordDate,
      mealType,
    })
      .then((result) => {
        const records = Array.isArray(result.records) ? result.records : [];
        const nutrition = resolveMealNutrition(records);
        this.setData({
          mealNutrition: {
            totalCalories: toInteger(nutrition.totalCalories),
            totalProtein: toInteger(nutrition.totalProtein),
            totalCarbs: toInteger(nutrition.totalCarbs),
            totalFat: toInteger(nutrition.totalFat),
          },
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ mealNutritionLoading: false });
      });
  },

  decorateRecordGroups(groups) {
    const collapsedMealGroups = this.data.collapsedMealGroups || {};
    return (groups || []).map((group) => ({
      ...group,
      collapsed: group.type === "DIET" ? Boolean(collapsedMealGroups[group.key]) : false,
      totalCaloriesLabel: `${toInteger(group.totalCalories)} kcal`,
    }));
  },

  handleToggleMealGroup(event) {
    const { mealType } = event.currentTarget.dataset;
    if (!mealType) {
      return;
    }

    const collapsedMealGroups = {
      ...(this.data.collapsedMealGroups || {}),
      [mealType]: !Boolean((this.data.collapsedMealGroups || {})[mealType]),
    };

    this.closeSwipeActions();
    this.setData({
      collapsedMealGroups,
      recordGroups: this.decorateRecordGroups(this.data.recordGroups),
    });
  },

  handleCloseMealNutrition() {
    this.setData({
      mealNutritionVisible: false,
      mealNutritionLoading: false,
    });
  },

  handleOpenWeightEditor() {
    this.closeSwipeActions();
    this.setData({
      weightEditorVisible: true,
      weightEditorLoading: false,
      weightEditorDate: this.data.recordDate,
      weightEditorTime: getCurrentMinute(),
      weightValue: "",
    });
  },

  handleRecordTouchStart(event) {
    const { recordKey } = event.currentTarget.dataset;
    const touch = event.touches && event.touches[0];
    if (!recordKey || !touch) {
      return;
    }
    const nextOpenedKey = this.data.swipedRecordKey === recordKey ? recordKey : null;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeBaseOffsetX = this.data.swipedRecordKey === recordKey ? DELETE_ACTION_WIDTH : 0;
    this.swipeMode = "";
    this.setData({
      swipingRecordKey: recordKey,
      swipeOffsetX: this.swipeBaseOffsetX,
      swipedRecordKey: nextOpenedKey,
      recordGroups: applySwipeStateToGroups(this.data.recordGroups, nextOpenedKey, recordKey, this.swipeBaseOffsetX),
    });
  },

  handleRecordTouchMove(event) {
    const { recordKey } = event.currentTarget.dataset;
    const touch = event.touches && event.touches[0];
    if (!recordKey || !touch || this.data.swipingRecordKey !== recordKey || !Number.isFinite(this.swipeStartX)) {
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
      recordGroups: applySwipeStateToGroups(this.data.recordGroups, this.data.swipedRecordKey, recordKey, nextOffsetX),
    });
  },

  handleRecordTouchEnd(event) {
    const { recordKey } = event.currentTarget.dataset;
    if (!recordKey || this.data.swipingRecordKey !== recordKey) {
      return;
    }
    if (this.swipeMode !== "horizontal") {
      this.resetSwipeGesture();
      this.setData({
        swipingRecordKey: null,
        swipeOffsetX: 0,
        recordGroups: applySwipeStateToGroups(this.data.recordGroups, this.data.swipedRecordKey, null, 0),
      });
      return;
    }
    this.finishSwipe(recordKey, this.data.swipeOffsetX >= SWIPE_OPEN_THRESHOLD);
  },

  resetSwipeGesture() {
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeBaseOffsetX = 0;
    this.swipeMode = "";
  },

  finishSwipe(recordKey, shouldOpen) {
    this.resetSwipeGesture();
    this.setData({
      swipedRecordKey: shouldOpen ? recordKey : null,
      swipingRecordKey: null,
      swipeOffsetX: 0,
      recordGroups: applySwipeStateToGroups(this.data.recordGroups, shouldOpen ? recordKey : null, null, 0),
    });
  },

  closeSwipeActions() {
    if (this.data.swipedRecordKey == null && this.data.swipingRecordKey == null) {
      return;
    }
    this.resetSwipeGesture();
    this.setData({
      swipedRecordKey: null,
      swipingRecordKey: null,
      swipeOffsetX: 0,
      recordGroups: applySwipeStateToGroups(this.data.recordGroups, null, null, 0),
    });
  },

  handleRecordListTap() {
    this.closeSwipeActions();
  },

  handleRecordTap(event) {
    if (this.data.swipedRecordKey != null) {
      this.closeSwipeActions();
      return;
    }
    this.handleOpenRecord(event);
  },

  handleRepeatHomeRecord(event) {
    const { recordType, recordId, mealType } = event.currentTarget.dataset;
    if (!recordType || recordId == null) {
      return;
    }

    this.closeSwipeActions();
    if (recordType === "DIET") {
      wx.navigateTo({
        url: buildFoodSearchUrl({
          mode: "copy",
          recordId,
          mealType,
          recordDate: this.data.recordDate,
          source: "home",
        }),
      });
      return;
    }

    wx.navigateTo({
      url: buildExerciseSearchUrl({
        recordDate: this.data.recordDate,
        source: "home",
        mode: "copy",
        recordId,
      }),
    });
  },

  handleDeleteHomeRecord(event) {
    const { recordType, recordId } = event.currentTarget.dataset;
    if (!recordType || recordId == null) {
      return;
    }
    const modalTitle = recordType === "DIET" ? "删除食物记录" : "删除运动记录";
    wx.showModal({
      title: modalTitle,
      content: "删除后不可恢复，是否继续？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        const task = recordType === "DIET"
          ? deleteRecord(recordId)
          : deleteExerciseRecord(recordId);
        task
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadSummary();
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          });
      },
    });
  },

  handleCloseWeightEditor() {

    if (this.data.weightEditorLoading) {
      return;
    }
    this.setData({
      weightEditorVisible: false,
      weightEditorDate: this.data.recordDate,
      weightEditorTime: getCurrentMinute(),
      weightValue: "",
    });
  },

  handleWeightDateChange(event) {
    this.setData({
      weightEditorDate: event.detail.value,
    });
  },

  handleWeightInput(event) {
    this.setData({
      weightValue: event.detail.value,
    });
  },

  handleWeightTimeChange(event) {
    this.setData({
      weightEditorTime: event.detail.value,
    });
  },

  handleSubmitWeight() {
    if (this.data.weightEditorLoading) {
      return;
    }
    const metricValue = toNumber(this.data.weightValue);
    if (metricValue <= 0) {
      wx.showToast({ title: "请输入正确体重", icon: "none" });
      return;
    }

    this.setData({ weightEditorLoading: true });
    createBodyMetricRecord({
      metricType: "WEIGHT",
      metricValue,
      unit: "KG",
      recordDate: this.data.weightEditorDate,
      measuredAt: combineDateAndTime(this.data.weightEditorDate, this.data.weightEditorTime),
    })
      .then(() => {
        const nextRecordDate = this.data.weightEditorDate;
        wx.showToast({ title: "已保存", icon: "success" });
        this.setData({
          weightEditorVisible: false,
          weightEditorDate: nextRecordDate,
          weightEditorTime: getCurrentMinute(),
          weightValue: "",
          recordDate: nextRecordDate,
        }, () => {
          this.refreshDateMeta();
          this.loadSummary();
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ weightEditorLoading: false });
      });
  },

  handleOpenRecord(event) {
    this.closeSwipeActions();
    const { recordType, mealType, recordDate, recordId } = event.currentTarget.dataset;
    if (recordType === "DIET") {
      wx.navigateTo({
        url: buildFoodSearchUrl({
          mode: "edit",
          recordId,
          mealType,
          recordDate,
          source: "home",
        }),
      });
      return;
    }

    wx.navigateTo({
      url: buildExerciseSearchUrl({
        recordDate,
        source: "home",
        mode: "edit",
        recordId,
      }),
    });
  },

  noop() {
  },
});

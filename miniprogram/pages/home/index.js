const { getDailySummary } = require("../../services/user");
const { getDailyHealthDiary } = require("../../services/health-diary");
const { createBodyMetricRecord } = require("../../services/body-metric");
const { getRecords } = require("../../services/record");
const { getCurrentUserId } = require("../../utils/auth");
const { addDays, getToday } = require("../../utils/date");
const { getIntensityLabel } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const DIET_GROUPS = [
  { key: "BREAKFAST", label: "早餐", type: "DIET", mealType: "BREAKFAST" },
  { key: "LUNCH", label: "午餐", type: "DIET", mealType: "LUNCH" },
  { key: "DINNER", label: "晚餐", type: "DIET", mealType: "DINNER" },
  { key: "SNACK", label: "加餐", type: "DIET", mealType: "SNACK" },
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
  const hour = new Date().getHours();
  if (hour < 10) {
    return "BREAKFAST";
  }
  if (hour < 15) {
    return "LUNCH";
  }
  if (hour < 20) {
    return "DINNER";
  }
  return "SNACK";
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
  return `${record.foodName || "食物"} ${quantity}g`;
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

function buildRecordGroups(records) {
  const groupedRecords = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
    SNACK: [],
    EXERCISE: [],
  };

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
    })),
    {
      ...EXERCISE_GROUP,
      records: groupedRecords.EXERCISE,
    },
  ].filter((group) => group.records.length > 0);
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
    weightValue: "",
    quickMenuVisible: false,
  },

  onLoad() {
    this.refreshDateMeta();
  },

  onShow() {
    const app = getApp();
    if (app.globalData.refreshHomeOnShow) {
      app.globalData.refreshHomeOnShow = false;
    }

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
    ])
      .then(([summary, diary]) => {
        const normalized = normalizeSummary(summary, this.data.recordDate);
        this.setData({
          summary: normalized,
          recordGroups: buildRecordGroups(normalized.records),
          healthDiary: normalizeDiary(diary),
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

  handleOpenMealNutrition(event) {
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

  handleCloseMealNutrition() {
    this.setData({
      mealNutritionVisible: false,
      mealNutritionLoading: false,
    });
  },

  handleOpenWeightEditor() {
    this.setData({
      weightEditorVisible: true,
      weightEditorLoading: false,
      weightValue: "",
    });
  },

  handleCloseWeightEditor() {
    if (this.data.weightEditorLoading) {
      return;
    }
    this.setData({
      weightEditorVisible: false,
      weightValue: "",
    });
  },

  handleWeightInput(event) {
    this.setData({
      weightValue: event.detail.value,
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
      recordDate: this.data.recordDate,
    })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        this.setData({
          weightEditorVisible: false,
          weightValue: "",
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

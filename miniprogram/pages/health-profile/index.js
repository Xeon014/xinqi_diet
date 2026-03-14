const { getCurrentUser, updateProfile } = require("../../services/user");
const { pickErrorMessage } = require("../../utils/request");

const MAX_GOAL_DELTA = 1000;
const MIN_GOAL_DELTA = -1000;

const GOAL_MODE_OPTIONS = [
  { label: "减脂", value: "LOSE", defaultDelta: -300 },
  { label: "维持", value: "MAINTAIN", defaultDelta: 0 },
  { label: "增重", value: "GAIN", defaultDelta: 300 },
];

function toInteger(value) {
  return Math.round(Number(value || 0));
}

function toOneDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return number.toFixed(1);
}

function toPositiveNumber(rawValue) {
  const text = String(rawValue == null ? "" : rawValue).trim();
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function toSignedNumber(rawValue) {
  const text = String(rawValue == null ? "" : rawValue).trim();
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function parseAge(birthDate) {
  if (!birthDate) {
    return null;
  }
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > today.getTime()) {
    return null;
  }

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age < 0 ? null : age;
}

function calculateFormulaBmr(profile) {
  if (!profile || !profile.gender || !profile.birthDate) {
    return null;
  }
  const height = toPositiveNumber(profile.height);
  const currentWeight = toPositiveNumber(profile.currentWeight);
  const age = parseAge(profile.birthDate);
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(currentWeight) || currentWeight <= 0 || age == null) {
    return null;
  }
  const base = (currentWeight * 10) + (height * 6.25) - (age * 5);
  const offset = profile.gender === "MALE" ? 5 : -161;
  return toInteger(base + offset);
}

function calculateEstimatedBaseCalories(profile) {
  const effectiveBmr = profile && profile.bmr != null ? Number(profile.bmr) : null;
  if (!Number.isFinite(effectiveBmr) || effectiveBmr <= 0) {
    return null;
  }
  return toInteger(effectiveBmr / 0.7);
}

function formatGoalMode(mode) {
  if (mode === "LOSE") {
    return "减脂";
  }
  if (mode === "GAIN") {
    return "增重";
  }
  return "维持";
}

function formatSignedInteger(value) {
  const number = toInteger(value);
  if (number > 0) {
    return `+${number}`;
  }
  return String(number);
}

function getMissingBmrFields(profile) {
  const missingFields = [];
  if (!profile || !profile.gender) {
    missingFields.push("性别");
  }
  if (!profile || !profile.birthDate) {
    missingFields.push("生日");
  }
  if (toPositiveNumber(profile && profile.height) == null) {
    missingFields.push("身高");
  }
  if (toPositiveNumber(profile && profile.currentWeight) == null) {
    missingFields.push("当前体重");
  }
  return missingFields;
}

function createSettings(profile) {
  return {
    currentWeight: profile.currentWeight == null ? "" : String(profile.currentWeight),
    targetWeight: profile.targetWeight == null ? "" : String(profile.targetWeight),
  };
}

function buildMetrics(profile) {
  const bmrEstimate = calculateFormulaBmr(profile);
  const baseCaloriesEstimate = calculateEstimatedBaseCalories(profile);
  const missingBmrFields = getMissingBmrFields(profile);
  const goalMode = profile.goalMode || "MAINTAIN";
  const goalCalorieDelta = profile.goalCalorieDelta == null ? 0 : toInteger(profile.goalCalorieDelta);

  return {
    currentWeightLabel: profile.currentWeight == null ? "--" : String(profile.currentWeight),
    bmiLabel: toOneDecimal(profile.bmi),
    bmrLabel: profile.bmr == null ? "--" : String(toInteger(profile.bmr)),
    baseCaloriesLabel: profile.tdee == null ? "--" : String(toInteger(profile.tdee)),
    targetCaloriesLabel: profile.dailyCalorieTarget == null ? "--" : String(toInteger(profile.dailyCalorieTarget)),
    goalMode,
    goalModeLabel: formatGoalMode(goalMode),
    goalDeltaLabel: formatSignedInteger(goalCalorieDelta),
    bmrEstimate: bmrEstimate == null ? "--" : String(bmrEstimate),
    baseCaloriesEstimate: baseCaloriesEstimate == null ? "--" : String(baseCaloriesEstimate),
    bmrEstimateAvailable: bmrEstimate != null,
    baseCaloriesEstimateAvailable: baseCaloriesEstimate != null,
    bmrHint: bmrEstimate == null ? `请先完善${missingBmrFields.join("、")}` : "可直接填入智能预估值",
    baseCaloriesHint: baseCaloriesEstimate == null ? "请先完善基础代谢" : "按无运动情况下的日常消耗预估",
    goalHint: "目标热量 = 基础日消耗 + 差值，负数减脂，正数增重",
  };
}

function calculateTargetPreview(baseCaloriesLabel, goalCalorieDelta) {
  const baseCalories = toPositiveNumber(baseCaloriesLabel);
  const delta = toSignedNumber(goalCalorieDelta);
  if (baseCalories == null || !Number.isFinite(baseCalories) || delta == null || !Number.isFinite(delta)) {
    return "--";
  }
  return String(toInteger(baseCalories + delta));
}

function createEmptySheet() {
  return {
    visible: false,
    type: "",
    title: "",
    fieldLabel: "",
    currentValue: "--",
    inputValue: "",
    smartValue: "--",
    smartAvailable: false,
    hint: "",
    modeValue: "MAINTAIN",
    targetPreview: "--",
    saving: false,
  };
}

Page({
  data: {
    profile: null,
    metrics: {
      currentWeightLabel: "--",
      bmiLabel: "--",
      bmrLabel: "--",
      baseCaloriesLabel: "--",
      targetCaloriesLabel: "--",
      goalMode: "MAINTAIN",
      goalModeLabel: "维持",
      goalDeltaLabel: "0",
      bmrEstimate: "--",
      baseCaloriesEstimate: "--",
      bmrEstimateAvailable: false,
      baseCaloriesEstimateAvailable: false,
      bmrHint: "",
      baseCaloriesHint: "",
      goalHint: "",
    },
    settings: {
      currentWeight: "",
      targetWeight: "",
    },
    goalModeOptions: GOAL_MODE_OPTIONS,
    sheet: createEmptySheet(),
  },

  onShow() {
    this.resetPageScroll();
    this.loadPageData();
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  loadPageData(stopPullDown = false) {
    getCurrentUser()
      .then((profile) => {
        this.setData(this.buildProfileViewData(profile));
        this.resetPageScroll();
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

  buildProfileViewData(profile, preserveSettings = false) {
    return {
      profile,
      metrics: buildMetrics(profile),
      settings: preserveSettings ? { ...this.data.settings } : createSettings(profile),
      sheet: createEmptySheet(),
    };
  },

  resetPageScroll() {
    wx.nextTick(() => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`settings.${field}`]: event.detail.value });
  },

  openSheet(type) {
    const { metrics, profile } = this.data;
    if (type === "BMR") {
      this.setData({
        sheet: {
          visible: true,
          type,
          title: "基础代谢设置",
          fieldLabel: "基础代谢 (kcal/天)",
          currentValue: metrics.bmrLabel,
          inputValue: metrics.bmrLabel === "--" ? "" : metrics.bmrLabel,
          smartValue: metrics.bmrEstimate,
          smartAvailable: metrics.bmrEstimateAvailable,
          hint: metrics.bmrHint,
          modeValue: "MAINTAIN",
          targetPreview: "--",
          saving: false,
        },
      });
      return;
    }

    if (type === "BASE") {
      this.setData({
        sheet: {
          visible: true,
          type,
          title: "基础日消耗设置",
          fieldLabel: "基础日消耗 (kcal/天)",
          currentValue: metrics.baseCaloriesLabel,
          inputValue: metrics.baseCaloriesLabel === "--" ? "" : metrics.baseCaloriesLabel,
          smartValue: metrics.baseCaloriesEstimate,
          smartAvailable: metrics.baseCaloriesEstimateAvailable,
          hint: metrics.baseCaloriesHint,
          modeValue: "MAINTAIN",
          targetPreview: "--",
          saving: false,
        },
      });
      return;
    }

    const goalMode = profile.goalMode || "MAINTAIN";
    const goalCalorieDelta = profile.goalCalorieDelta == null ? 0 : toInteger(profile.goalCalorieDelta);
    this.setData({
      sheet: {
        visible: true,
        type,
        title: "目标热量设置",
        fieldLabel: "热量差值 (kcal/天)",
        currentValue: metrics.targetCaloriesLabel,
        inputValue: String(goalCalorieDelta),
        smartValue: "--",
        smartAvailable: false,
        hint: metrics.goalHint,
        modeValue: goalMode,
        targetPreview: calculateTargetPreview(metrics.baseCaloriesLabel, goalCalorieDelta),
        saving: false,
      },
    });
  },

  handleOpenBmrSheet() {
    this.openSheet("BMR");
  },

  handleOpenBaseSheet() {
    this.openSheet("BASE");
  },

  handleOpenGoalSheet() {
    this.openSheet("GOAL");
  },

  handleCloseSheet() {
    if (this.data.sheet.saving) {
      return;
    }
    this.setData({ sheet: createEmptySheet() });
  },

  handleSheetInput(event) {
    const inputValue = event.detail.value;
    if (this.data.sheet.type === "GOAL") {
      this.setData({
        "sheet.inputValue": inputValue,
        "sheet.targetPreview": calculateTargetPreview(this.data.metrics.baseCaloriesLabel, inputValue),
      });
      return;
    }
    this.setData({ "sheet.inputValue": inputValue });
  },

  handleGoalModeSelect(event) {
    if (this.data.sheet.type !== "GOAL") {
      return;
    }
    const { value } = event.currentTarget.dataset;
    const option = GOAL_MODE_OPTIONS.find((item) => item.value === value) || GOAL_MODE_OPTIONS[1];
    this.setData({
      "sheet.modeValue": option.value,
      "sheet.inputValue": String(option.defaultDelta),
      "sheet.targetPreview": calculateTargetPreview(this.data.metrics.baseCaloriesLabel, option.defaultDelta),
    });
  },

  handleUseSmartValue() {
    if (!this.data.sheet.smartAvailable) {
      wx.showToast({ title: this.data.sheet.hint || "当前无法预估", icon: "none" });
      return;
    }
    this.setData({ "sheet.inputValue": this.data.sheet.smartValue });
  },

  handleSaveSheet() {
    const { sheet, metrics } = this.data;
    if (sheet.saving || !sheet.visible) {
      return;
    }

    let payload = null;
    let successTitle = "";

    if (sheet.type === "GOAL") {
      const goalCalorieDelta = toSignedNumber(sheet.inputValue);
      if (!sheet.modeValue) {
        wx.showToast({ title: "请选择目标模式", icon: "none" });
        return;
      }
      if (goalCalorieDelta == null || !Number.isFinite(goalCalorieDelta) || goalCalorieDelta < MIN_GOAL_DELTA || goalCalorieDelta > MAX_GOAL_DELTA) {
        wx.showToast({ title: "请输入-1000到1000的热量差值", icon: "none" });
        return;
      }
      payload = {
        goalMode: sheet.modeValue,
        goalCalorieDelta: toInteger(goalCalorieDelta),
      };
      successTitle = "目标热量已更新";
    } else {
      const numberValue = toPositiveNumber(sheet.inputValue);
      if (numberValue == null || !Number.isFinite(numberValue) || numberValue <= 0) {
        wx.showToast({
          title: sheet.type === "BMR" ? "请输入正确基础代谢" : "请输入正确基础日消耗",
          icon: "none",
        });
        return;
      }

      const roundedValue = toInteger(numberValue);
      const currentValue = sheet.type === "BMR"
        ? toPositiveNumber(metrics.bmrLabel)
        : toPositiveNumber(metrics.baseCaloriesLabel);
      if (currentValue != null && roundedValue === toInteger(currentValue)) {
        this.setData({ sheet: createEmptySheet() });
        return;
      }

      payload = sheet.type === "BMR"
        ? { customBmr: roundedValue }
        : { customTdee: roundedValue };
      successTitle = sheet.type === "BMR" ? "基础代谢已更新" : "基础日消耗已更新";
    }

    this.setData({ "sheet.saving": true });
    updateProfile(payload)
      .then((updatedProfile) => {
        this.setData({
          ...this.buildProfileViewData(updatedProfile, true),
          sheet: createEmptySheet(),
        });
        wx.showToast({ title: successTitle, icon: "success" });
      })
      .catch((error) => {
        this.setData({ "sheet.saving": false });
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleSave() {
    const { settings } = this.data;
    const payload = {};

    const currentWeight = toPositiveNumber(settings.currentWeight);
    if (currentWeight != null && (!Number.isFinite(currentWeight) || currentWeight <= 0)) {
      wx.showToast({ title: "请输入正确当前体重", icon: "none" });
      return;
    }
    if (currentWeight != null) {
      payload.currentWeight = currentWeight;
    }

    const targetWeight = toPositiveNumber(settings.targetWeight);
    if (targetWeight != null && (!Number.isFinite(targetWeight) || targetWeight <= 0)) {
      wx.showToast({ title: "请输入正确目标体重", icon: "none" });
      return;
    }
    if (targetWeight != null) {
      payload.targetWeight = targetWeight;
    }

    if (!Object.keys(payload).length) {
      wx.showToast({ title: "没有可保存的修改", icon: "none" });
      return;
    }

    updateProfile(payload)
      .then(() => {
        wx.showToast({ title: "保存成功", icon: "success" });
        setTimeout(() => {
          wx.navigateBack();
        }, 350);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  noop() {},
});

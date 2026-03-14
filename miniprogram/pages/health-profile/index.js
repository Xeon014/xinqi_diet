const { getCurrentUser, updateProfile } = require("../../services/user");
const { pickErrorMessage } = require("../../utils/request");

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
  const baseCaloriesReference = profile.tdee == null ? baseCaloriesEstimate : toInteger(profile.tdee);
  const targetCalories = profile.dailyCalorieTarget == null ? null : toInteger(profile.dailyCalorieTarget);

  return {
    currentWeightLabel: profile.currentWeight == null ? "--" : String(profile.currentWeight),
    bmiLabel: toOneDecimal(profile.bmi),
    bmrLabel: profile.bmr == null ? "--" : String(toInteger(profile.bmr)),
    targetCaloriesLabel: targetCalories == null ? "--" : String(targetCalories),
    targetCaloriesHint: targetCalories == null ? "未设置" : `当前 ${targetCalories} kcal/天`,
    bmrEstimate: bmrEstimate == null ? "--" : String(bmrEstimate),
    bmrEstimateAvailable: bmrEstimate != null,
    bmrHint: bmrEstimate == null ? `请先完善${missingBmrFields.join("、")}` : "可直接填入智能预估值",
    baseCaloriesHint: baseCaloriesReference == null
      ? "暂无法预估基础日消耗，请先完善基础代谢"
      : `预估基础日消耗约 ${baseCaloriesReference} kcal/天`,
  };
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
      targetCaloriesLabel: "--",
      targetCaloriesHint: "未设置",
      bmrEstimate: "--",
      bmrEstimateAvailable: false,
      bmrHint: "",
      baseCaloriesHint: "",
    },
    settings: {
      currentWeight: "",
      targetWeight: "",
    },
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
    const { metrics } = this.data;
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
          saving: false,
        },
      });
      return;
    }

    this.setData({
      sheet: {
        visible: true,
        type,
        title: "目标热量设置",
        fieldLabel: "目标热量 (kcal/天)",
        currentValue: metrics.targetCaloriesLabel,
        inputValue: metrics.targetCaloriesLabel === "--" ? "" : metrics.targetCaloriesLabel,
        smartValue: "--",
        smartAvailable: false,
        hint: metrics.baseCaloriesHint,
        saving: false,
      },
    });
  },

  handleOpenBmrSheet() {
    this.openSheet("BMR");
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
    this.setData({ "sheet.inputValue": event.detail.value });
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
      const targetCalories = toPositiveNumber(sheet.inputValue);
      if (targetCalories == null || !Number.isFinite(targetCalories) || targetCalories <= 0) {
        wx.showToast({ title: "请输入正确目标热量", icon: "none" });
        return;
      }

      const roundedValue = toInteger(targetCalories);
      const currentValue = toPositiveNumber(metrics.targetCaloriesLabel);
      if (currentValue != null && roundedValue === toInteger(currentValue)) {
        this.setData({ sheet: createEmptySheet() });
        return;
      }

      payload = { dailyCalorieTarget: roundedValue };
      successTitle = "目标热量已更新";
    } else {
      const numberValue = toPositiveNumber(sheet.inputValue);
      if (numberValue == null || !Number.isFinite(numberValue) || numberValue <= 0) {
        wx.showToast({ title: "请输入正确基础代谢", icon: "none" });
        return;
      }

      const roundedValue = toInteger(numberValue);
      const currentValue = toPositiveNumber(metrics.bmrLabel);
      if (currentValue != null && roundedValue === toInteger(currentValue)) {
        this.setData({ sheet: createEmptySheet() });
        return;
      }

      payload = { customBmr: roundedValue };
      successTitle = "基础代谢已更新";
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

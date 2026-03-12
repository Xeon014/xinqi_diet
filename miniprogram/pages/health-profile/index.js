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
  const birth = new Date(birthDate + "T00:00:00");
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

function calculateEstimatedTdee(profile) {
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
  const tdeeEstimate = calculateEstimatedTdee(profile);
  const missingBmrFields = getMissingBmrFields(profile);

  return {
    currentWeightLabel: profile.currentWeight == null ? "--" : String(profile.currentWeight),
    bmiLabel: toOneDecimal(profile.bmi),
    bmrLabel: profile.bmr == null ? "--" : String(toInteger(profile.bmr)),
    tdeeLabel: profile.tdee == null ? "--" : String(toInteger(profile.tdee)),
    bmrEstimate: bmrEstimate == null ? "--" : String(bmrEstimate),
    tdeeEstimate: tdeeEstimate == null ? "--" : String(tdeeEstimate),
    bmrEstimateAvailable: bmrEstimate != null,
    tdeeEstimateAvailable: tdeeEstimate != null,
    bmrHint: bmrEstimate == null ? "请先完善" + missingBmrFields.join("、") : "可直接填入智能预估值",
    tdeeHint: tdeeEstimate == null ? "请先完善基础代谢" : "按无运动情况下的日常消耗预估"
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
      tdeeLabel: "--",
      bmrEstimate: "--",
      tdeeEstimate: "--",
      bmrEstimateAvailable: false,
      tdeeEstimateAvailable: false,
      bmrHint: "",
      tdeeHint: ""
    },
    settings: {
      currentWeight: "",
      targetWeight: "",
    },
    sheet: createEmptySheet()
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
      sheet: createEmptySheet()
    };
  },

  resetPageScroll() {
    wx.nextTick(() => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ ["settings." + field]: event.detail.value });
  },

  openSheet(type) {
    const metrics = this.data.metrics;
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
        }
      });
      return;
    }

    this.setData({
      sheet: {
        visible: true,
        type,
        title: "每日消耗热量设置",
        fieldLabel: "每日消耗热量 (kcal/天)",
        currentValue: metrics.tdeeLabel,
        inputValue: metrics.tdeeLabel === "--" ? "" : metrics.tdeeLabel,
        smartValue: metrics.tdeeEstimate,
        smartAvailable: metrics.tdeeEstimateAvailable,
        hint: metrics.tdeeHint,
        saving: false,
      }
    });
  },

  handleOpenBmrSheet() {
    this.openSheet("BMR");
  },

  handleOpenTdeeSheet() {
    this.openSheet("TDEE");
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
    const sheet = this.data.sheet;
    const metrics = this.data.metrics;
    if (sheet.saving || !sheet.visible) {
      return;
    }

    const numberValue = toPositiveNumber(sheet.inputValue);
    if (numberValue == null || !Number.isFinite(numberValue) || numberValue <= 0) {
      wx.showToast({
        title: sheet.type === "BMR" ? "请输入正确基础代谢" : "请输入正确每日消耗热量",
        icon: "none"
      });
      return;
    }

    const roundedValue = toInteger(numberValue);
    const currentValue = sheet.type === "BMR" ? toPositiveNumber(metrics.bmrLabel) : toPositiveNumber(metrics.tdeeLabel);
    if (currentValue != null && roundedValue === toInteger(currentValue)) {
      this.setData({ sheet: createEmptySheet() });
      return;
    }

    const payload = sheet.type === "BMR"
      ? { customBmr: roundedValue }
      : { customTdee: roundedValue };

    this.setData({ "sheet.saving": true });
    updateProfile(payload)
      .then((updatedProfile) => {
        this.setData({
          ...this.buildProfileViewData(updatedProfile, true),
          sheet: createEmptySheet()
        });
        wx.showToast({
          title: sheet.type === "BMR" ? "基础代谢已更新" : "每日消耗热量已更新",
          icon: "success"
        });
      })
      .catch((error) => {
        this.setData({ "sheet.saving": false });
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleSave() {
    const settings = this.data.settings;
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

  noop() {}
});

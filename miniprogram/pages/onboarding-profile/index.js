const { updateProfile } = require("../../services/user");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MAX_GOAL_DELTA = 1000;
const MIN_GOAL_DELTA = -1000;

const STEPS = [
  { key: "gender", title: "选择性别", description: "用于健康指标计算。", required: true },
  { key: "birthDate", title: "填写生日", description: "用于年龄与代谢计算。", required: true },
  { key: "height", title: "填写身高", description: "单位 cm。", required: true },
  { key: "currentWeight", title: "填写体重", description: "单位 kg。", required: true },
  { key: "bmr", title: "基础代谢 BMR", description: "静息状态下身体每天消耗的热量。", required: true },
  { key: "baseCalories", title: "基础日消耗", description: "按无运动情况下的日常消耗预估。", required: true },
  { key: "goal", title: "目标热量", description: "在基础日消耗上设置减脂、维持或增重差值。", required: true },
];

const GENDER_OPTIONS = [
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" },
];

const GOAL_MODE_OPTIONS = [
  { label: "减脂", value: "LOSE", defaultDelta: -300 },
  { label: "维持", value: "MAINTAIN", defaultDelta: 0 },
  { label: "增重", value: "GAIN", defaultDelta: 300 },
];

function toInteger(value) {
  return Math.round(Number(value || 0));
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

function calculateFormulaBmr(form) {
  if (!form || !form.gender || !form.birthDate) {
    return null;
  }
  const height = toPositiveNumber(form.height);
  const weight = toPositiveNumber(form.currentWeight);
  const age = parseAge(form.birthDate);
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0 || age == null) {
    return null;
  }
  const base = (weight * 10) + (height * 6.25) - (age * 5);
  const offset = form.gender === "MALE" ? 5 : -161;
  return toInteger(base + offset);
}

function calculateBaseCalories(bmr) {
  if (bmr == null) {
    return null;
  }
  return toInteger(bmr / 0.7);
}

function calculateTargetCalories(baseCalories, goalCalorieDelta) {
  if (baseCalories == null || goalCalorieDelta == null || !Number.isFinite(goalCalorieDelta)) {
    return null;
  }
  return toInteger(baseCalories + goalCalorieDelta);
}

function getGoalModeOption(value) {
  return GOAL_MODE_OPTIONS.find((option) => option.value === value) || GOAL_MODE_OPTIONS[1];
}

Page({
  data: {
    maxBirthDate: getToday(),
    steps: STEPS,
    currentStep: 0,
    genderOptions: GENDER_OPTIONS,
    goalModeOptions: GOAL_MODE_OPTIONS,
    submitting: false,
    formulaBmrPreview: "--",
    baseCaloriesPreview: "--",
    targetCaloriesPreview: "--",
    birthDateColumns: [[], [], []],
    birthDateColumnIndex: [0, 0, 0],
    birthDateDisplay: "",
    form: {
      birthDate: "",
      goalMode: "MAINTAIN",
      goalCalorieDelta: "0",
    },
  },

  onLoad() {
    this.initBirthDateColumns();
    this.refreshFormulaMeta();
  },

  refreshFormulaMeta() {
    const { form } = this.data;
    const formulaBmr = calculateFormulaBmr(form);
    const customBmr = toPositiveNumber(form.bmr);
    const effectiveBmr = customBmr != null && Number.isFinite(customBmr) && customBmr > 0 ? customBmr : formulaBmr;
    const recommendedBaseCalories = calculateBaseCalories(effectiveBmr);
    const customBaseCalories = toPositiveNumber(form.baseCalories);
    const effectiveBaseCalories = customBaseCalories != null && Number.isFinite(customBaseCalories) && customBaseCalories > 0
      ? customBaseCalories
      : recommendedBaseCalories;
    const goalCalorieDelta = toSignedNumber(form.goalCalorieDelta);
    const targetCalories = calculateTargetCalories(effectiveBaseCalories, goalCalorieDelta);

    this.setData({
      formulaBmrPreview: formulaBmr == null ? "--" : String(formulaBmr),
      baseCaloriesPreview: recommendedBaseCalories == null ? "--" : String(recommendedBaseCalories),
      targetCaloriesPreview: targetCalories == null ? "--" : String(targetCalories),
    });
  },

  initBirthDateColumns() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = [];
    for (let y = 1940; y <= currentYear; y++) {
      years.push(String(y));
    }
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(String(m));
    }
    const days = [];
    for (let d = 1; d <= 31; d++) {
      days.push(String(d));
    }
    const defaultYearIndex = Math.max(0, years.indexOf(String(currentYear - 25)));

    this.setData({
      "birthDateColumns[0]": years,
      "birthDateColumns[1]": months,
      "birthDateColumns[2]": days,
      birthDateColumnIndex: [defaultYearIndex, 0, 0],
    });

    this.updateBirthDateDays(defaultYearIndex, 0);
  },

  updateBirthDateDays(yearIndex, monthIndex) {
    const years = this.data.birthDateColumns[0];
    const months = this.data.birthDateColumns[1];
    if (!years.length || !months.length) {
      return;
    }

    const year = parseInt(years[yearIndex] || years[0], 10);
    const month = parseInt(months[monthIndex] || months[0], 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(String(d));
    }

    this.setData({ "birthDateColumns[2]": days });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [`form.${field}`]: event.detail.value }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleGenderSelect(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({ "form.gender": value }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleGoalModeSelect(event) {
    const { value } = event.currentTarget.dataset;
    const option = getGoalModeOption(value);
    this.setData({
      "form.goalMode": option.value,
      "form.goalCalorieDelta": String(option.defaultDelta),
    }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleBirthDateColumnChange(event) {
    const { column, value } = event.detail;
    const newIndex = [...this.data.birthDateColumnIndex];
    newIndex[column] = value;
    this.setData({ birthDateColumnIndex: newIndex });

    if (column === 0 || column === 1) {
      this.updateBirthDateDays(newIndex[0], newIndex[1]);
    }
  },

  handleBirthDateConfirm(event) {
    const { value } = event.detail;
    const [yearIdx, monthIdx, dayIdx] = value;
    const years = this.data.birthDateColumns[0];
    const months = this.data.birthDateColumns[1];
    const days = this.data.birthDateColumns[2];
    if (!years.length || !months.length || !days.length) {
      return;
    }

    const year = years[yearIdx] || years[0];
    const month = months[monthIdx] || months[0];
    const day = days[dayIdx] || days[0];
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const display = `${year}年${month}月${day}日`;

    this.setData({
      "form.birthDate": dateStr,
      birthDateDisplay: display,
      birthDateColumnIndex: value,
    }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleUseRecommendedBmr() {
    const bmr = calculateFormulaBmr(this.data.form);
    if (bmr == null) {
      wx.showToast({ title: "无法计算推荐值", icon: "none" });
      return;
    }
    this.setData({ "form.bmr": String(bmr) }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleUseRecommendedBaseCalories() {
    const recommendedBaseCalories = calculateBaseCalories(
      toPositiveNumber(this.data.form.bmr) || calculateFormulaBmr(this.data.form)
    );
    if (recommendedBaseCalories == null) {
      wx.showToast({ title: "无法计算推荐值", icon: "none" });
      return;
    }
    this.setData({ "form.baseCalories": String(recommendedBaseCalories) }, () => {
      this.refreshFormulaMeta();
    });
  },

  handlePrevStep() {
    if (this.data.submitting || this.data.currentStep <= 0) {
      return;
    }
    this.setData({ currentStep: this.data.currentStep - 1 });
  },

  handleNextStep() {
    if (this.data.submitting) {
      return;
    }
    if (!this.validateCurrentStep()) {
      return;
    }
    if (this.data.currentStep < this.data.steps.length - 1) {
      this.setData({ currentStep: this.data.currentStep + 1 });
      return;
    }
    this.handleComplete();
  },

  validateCurrentStep() {
    const { form } = this.data;
    const stepKey = this.data.steps[this.data.currentStep].key;

    switch (stepKey) {
      case "gender": {
        if (!form.gender) {
          wx.showToast({ title: "请选择性别", icon: "none" });
          return false;
        }
        break;
      }
      case "birthDate": {
        if (!form.birthDate) {
          wx.showToast({ title: "请选择生日", icon: "none" });
          return false;
        }
        break;
      }
      case "height": {
        const height = toPositiveNumber(form.height);
        if (height == null || !Number.isFinite(height) || height < 50) {
          wx.showToast({ title: "请输入正确身高", icon: "none" });
          return false;
        }
        break;
      }
      case "currentWeight": {
        const weight = toPositiveNumber(form.currentWeight);
        if (weight == null || !Number.isFinite(weight) || weight <= 0) {
          wx.showToast({ title: "请输入正确体重", icon: "none" });
          return false;
        }
        break;
      }
      case "bmr": {
        const bmr = toPositiveNumber(form.bmr);
        if (bmr == null || !Number.isFinite(bmr) || bmr <= 0) {
          wx.showToast({ title: "请输入基础代谢", icon: "none" });
          return false;
        }
        break;
      }
      case "baseCalories": {
        const baseCalories = toPositiveNumber(form.baseCalories);
        if (baseCalories == null || !Number.isFinite(baseCalories) || baseCalories <= 0) {
          wx.showToast({ title: "请输入基础日消耗", icon: "none" });
          return false;
        }
        break;
      }
      case "goal": {
        const goalCalorieDelta = toSignedNumber(form.goalCalorieDelta);
        if (!form.goalMode) {
          wx.showToast({ title: "请选择目标模式", icon: "none" });
          return false;
        }
        if (goalCalorieDelta == null || !Number.isFinite(goalCalorieDelta) || goalCalorieDelta < MIN_GOAL_DELTA || goalCalorieDelta > MAX_GOAL_DELTA) {
          wx.showToast({ title: "请输入-1000到1000的热量差值", icon: "none" });
          return false;
        }
        break;
      }
    }
    return true;
  },

  handleComplete() {
    if (this.data.submitting) {
      return;
    }
    if (!this.validateCurrentStep()) {
      return;
    }

    const payload = this.buildPayload();
    this.setData({ submitting: true });
    updateProfile(payload)
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        setTimeout(() => {
          this.finishOnboarding();
        }, 260);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  buildPayload() {
    const { form } = this.data;
    const payload = {
      goalMode: form.goalMode || "MAINTAIN",
    };

    if (form.gender) {
      payload.gender = form.gender;
    }
    if (form.birthDate) {
      payload.birthDate = form.birthDate;
    }

    const height = toPositiveNumber(form.height);
    if (height != null && Number.isFinite(height) && height >= 50) {
      payload.height = height;
    }

    const currentWeight = toPositiveNumber(form.currentWeight);
    if (currentWeight != null && Number.isFinite(currentWeight) && currentWeight > 0) {
      payload.currentWeight = currentWeight;
    }

    const bmr = toPositiveNumber(form.bmr);
    if (bmr != null && Number.isFinite(bmr) && bmr > 0) {
      payload.customBmr = toInteger(bmr);
    }

    const baseCalories = toPositiveNumber(form.baseCalories);
    if (baseCalories != null && Number.isFinite(baseCalories) && baseCalories > 0) {
      payload.customTdee = toInteger(baseCalories);
    }

    const goalCalorieDelta = toSignedNumber(form.goalCalorieDelta);
    if (goalCalorieDelta != null && Number.isFinite(goalCalorieDelta)) {
      payload.goalCalorieDelta = toInteger(goalCalorieDelta);
    }

    return payload;
  },

  finishOnboarding() {
    const app = getApp();
    const userId = getCurrentUserId();
    if (app && typeof app.completeOnboarding === "function") {
      app.completeOnboarding(userId);
    }
    wx.switchTab({ url: "/pages/home/index" });
  },
});

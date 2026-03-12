const { updateProfile } = require("../../services/user");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MAX_NICKNAME_LENGTH = 20;

const STEPS = [
  { key: "gender", title: "选择性别", description: "用于健康指标计算。", required: true },
  { key: "birthDate", title: "填写生日", description: "用于年龄与代谢计算。", required: true },
  { key: "height", title: "填写身高", description: "单位 cm。", required: true },
  { key: "currentWeight", title: "填写体重", description: "单位 kg。", required: true },
  { key: "activityLevel", title: "活动水平", description: "用于计算每日消耗。", required: true },
  { key: "bmr", title: "基础代谢 BMR", description: "", required: true },
  { key: "targetCalories", title: "每日目标热量", description: "", required: true },
];

const GENDER_OPTIONS = [
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" },
];

const ACTIVITY_LEVEL_OPTIONS = [
  { label: "久坐", subLabel: "几乎不运动", value: "SEDENTARY" },
  { label: "轻度", subLabel: "每周运动1-3天", value: "LIGHT" },
  { label: "中度", subLabel: "每周运动3-5天", value: "MODERATE" },
  { label: "重度", subLabel: "每周运动6-7天", value: "ACTIVE" },
  { label: "极重度", subLabel: "体力劳动/高强度训练", value: "VERY_ACTIVE" },
];

const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.20,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.90,
};

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

function calculateTdee(bmr, activityLevel) {
  if (bmr == null || !activityLevel) {
    return null;
  }
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!multiplier) {
    return null;
  }
  return toInteger(bmr * multiplier);
}

Page({
  data: {
    maxBirthDate: getToday(),
    steps: STEPS,
    currentStep: 0,
    genderOptions: GENDER_OPTIONS,
    activityLevelOptions: ACTIVITY_LEVEL_OPTIONS,
    submitting: false,
    formulaBmrPreview: "--",
    tdeePreview: "--",
    // 出生日期多列选择器
    birthDateColumns: [[], [], []],
    birthDateColumnIndex: [0, 0, 0],
    birthDateDisplay: "",
    form: {
      birthDate: "",
      targetCalories: "",
    },
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "完善资料" });
    this.initBirthDateColumns();
    this.refreshFormulaMeta();
  },

  refreshFormulaMeta() {
    const formulaBmr = calculateFormulaBmr(this.data.form);
    const bmrValue = toPositiveNumber(this.data.form.bmr);
    const tdee = calculateTdee(bmrValue != null ? bmrValue : formulaBmr, this.data.form.activityLevel);
    this.setData({
      formulaBmrPreview: formulaBmr == null ? "--" : String(formulaBmr),
      tdeePreview: tdee == null ? "--" : String(tdee),
    });
  },

  initBirthDateColumns() {
    const today = new Date();
    const currentYear = today.getFullYear();

    // 年份：1940 到当前年
    const years = [];
    for (let y = 1940; y <= currentYear; y++) {
      years.push(String(y));
    }

    // 月份：1-12
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(String(m));
    }

    // 日期：1-31（会根据年月动态调整）
    const days = [];
    for (let d = 1; d <= 31; d++) {
      days.push(String(d));
    }

    // 默认选中25岁（当前年-25）
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
    if (!years.length || !months.length) return;

    const year = parseInt(years[yearIndex] || years[0], 10);
    const month = parseInt(months[monthIndex] || months[0], 10);

    // 计算该月有多少天
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

  handleBirthDateColumnChange(event) {
    const { column, value } = event.detail;
    const newIndex = [...this.data.birthDateColumnIndex];
    newIndex[column] = value;
    this.setData({ birthDateColumnIndex: newIndex });

    // 年或月变化时，更新日期列
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

    if (!years.length || !months.length || !days.length) return;

    const year = years[yearIdx] || years[0];
    const month = months[monthIdx] || months[0];
    const day = days[dayIdx] || days[0];

    // 格式化为 YYYY-MM-DD
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // 显示文本：YYYY年M月D日
    const display = `${year}年${month}月${day}日`;

    this.setData({
      "form.birthDate": dateStr,
      birthDateDisplay: display,
      birthDateColumnIndex: value,
    }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleActivityLevelSelect(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({ "form.activityLevel": value }, () => {
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

  handleUseRecommendedTdee() {
    const bmrValue = toPositiveNumber(this.data.form.bmr);
    const formulaBmr = calculateFormulaBmr(this.data.form);
    const tdee = calculateTdee(bmrValue != null ? bmrValue : formulaBmr, this.data.form.activityLevel);
    if (tdee == null) {
      wx.showToast({ title: "无法计算推荐值", icon: "none" });
      return;
    }
    this.setData({ "form.targetCalories": String(tdee) });
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
      case "gender":
        if (!form.gender) {
          wx.showToast({ title: "请选择性别", icon: "none" });
          return false;
        }
        break;
      case "birthDate":
        if (!form.birthDate) {
          wx.showToast({ title: "请选择生日", icon: "none" });
          return false;
        }
        break;
      case "height":
        const height = toPositiveNumber(form.height);
        if (height == null || !Number.isFinite(height) || height < 50) {
          wx.showToast({ title: "请输入正确身高", icon: "none" });
          return false;
        }
        break;
      case "currentWeight":
        const weight = toPositiveNumber(form.currentWeight);
        if (weight == null || !Number.isFinite(weight) || weight <= 0) {
          wx.showToast({ title: "请输入正确体重", icon: "none" });
          return false;
        }
        break;
      case "activityLevel":
        if (!form.activityLevel) {
          wx.showToast({ title: "请选择活动水平", icon: "none" });
          return false;
        }
        break;
      case "bmr":
        const bmr = toPositiveNumber(form.bmr);
        if (bmr == null || !Number.isFinite(bmr) || bmr <= 0) {
          wx.showToast({ title: "请输入基础代谢", icon: "none" });
          return false;
        }
        break;
      case "targetCalories":
        const targetCalories = toPositiveNumber(form.targetCalories);
        if (targetCalories == null || !Number.isFinite(targetCalories) || targetCalories <= 0) {
          wx.showToast({ title: "请输入目标热量", icon: "none" });
          return false;
        }
        break;
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
    if (payload == null) {
      return;
    }

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
    const payload = {};

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

    if (form.activityLevel) {
      payload.activityLevel = form.activityLevel;
    }

    const bmr = toPositiveNumber(form.bmr);
    if (bmr != null && Number.isFinite(bmr) && bmr > 0) {
      payload.customBmr = toInteger(bmr);
    }

    const targetCalories = toPositiveNumber(form.targetCalories);
    if (targetCalories != null && Number.isFinite(targetCalories) && targetCalories > 0) {
      payload.dailyCalorieTarget = toInteger(targetCalories);
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

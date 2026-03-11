const { updateProfile } = require("../../services/user");
const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MAX_NICKNAME_LENGTH = 20;

const STEPS = [
  { key: "name", title: "设置昵称", description: "可先留空，后续随时再改。" },
  { key: "gender", title: "选择性别", description: "用于健康指标计算，可跳过。" },
  { key: "birthDate", title: "填写生日", description: "用于年龄与代谢计算，可跳过。" },
  { key: "height", title: "填写身高", description: "单位 cm，可跳过。" },
  { key: "currentWeight", title: "填写体重", description: "单位 kg，可跳过。" },
  { key: "bmr", title: "基础代谢 BMR", description: "可公式计算，也可手动填写。" },
];

const GENDER_OPTIONS = [
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" },
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

Page({
  data: {
    maxBirthDate: getToday(),
    steps: STEPS,
    currentStep: 0,
    genderOptions: GENDER_OPTIONS,
    submitting: false,
    formulaAvailable: false,
    formulaBmrPreview: "--",
    form: {
      name: "",
      gender: "",
      birthDate: "",
      height: "",
      currentWeight: "",
      bmrMode: "FORMULA",
      customBmr: "",
    },
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "完善资料" });
    this.refreshFormulaMeta();
  },

  refreshFormulaMeta() {
    const formulaBmr = calculateFormulaBmr(this.data.form);
    this.setData({
      formulaBmrPreview: formulaBmr == null ? "--" : String(formulaBmr),
      formulaAvailable: formulaBmr != null,
    });
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

  handleBirthDateChange(event) {
    this.setData({ "form.birthDate": event.detail.value }, () => {
      this.refreshFormulaMeta();
    });
  },

  handleBmrModeChange(event) {
    const { mode } = event.currentTarget.dataset;
    if (mode === "FORMULA" && !this.data.formulaAvailable) {
      wx.showToast({ title: "请先填写性别、生日、身高和体重", icon: "none" });
      return;
    }
    this.setData({ "form.bmrMode": mode });
  },

  handlePrevStep() {
    if (this.data.submitting || this.data.currentStep <= 0) {
      return;
    }
    this.setData({ currentStep: this.data.currentStep - 1 });
  },

  handleSkipCurrent() {
    if (this.data.submitting) {
      return;
    }
    if (this.data.currentStep >= this.data.steps.length - 1) {
      this.handleComplete();
      return;
    }
    this.setData({ currentStep: this.data.currentStep + 1 });
  },

  handleSkipAll() {
    if (this.data.submitting) {
      return;
    }
    wx.showModal({
      title: "全部跳过",
      content: "你可以稍后在“我的-个人信息”里继续完善。",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.finishOnboarding();
      },
    });
  },

  handleNextStep() {
    if (this.data.submitting) {
      return;
    }
    if (this.data.currentStep < this.data.steps.length - 1) {
      this.setData({ currentStep: this.data.currentStep + 1 });
      return;
    }
    this.handleComplete();
  },

  handleComplete() {
    if (this.data.submitting) {
      return;
    }
    const payload = this.buildPayload();
    if (payload == null) {
      return;
    }
    if (!Object.keys(payload).length) {
      this.finishOnboarding();
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
    const { form, formulaAvailable } = this.data;
    const payload = {};
    const name = String(form.name || "").trim();

    if (name.length > MAX_NICKNAME_LENGTH) {
      wx.showToast({ title: "昵称最多 20 个字符", icon: "none" });
      return null;
    }
    if (name) {
      payload.name = name;
    }

    if (form.gender) {
      payload.gender = form.gender;
    }
    if (form.birthDate) {
      payload.birthDate = form.birthDate;
    }

    const height = toPositiveNumber(form.height);
    if (height != null && (!Number.isFinite(height) || height < 50)) {
      wx.showToast({ title: "请输入正确身高", icon: "none" });
      return null;
    }
    if (height != null) {
      payload.height = height;
    }

    const currentWeight = toPositiveNumber(form.currentWeight);
    if (currentWeight != null && (!Number.isFinite(currentWeight) || currentWeight <= 0)) {
      wx.showToast({ title: "请输入正确体重", icon: "none" });
      return null;
    }
    if (currentWeight != null) {
      payload.currentWeight = currentWeight;
    }

    if (form.bmrMode === "MANUAL") {
      const customBmr = toPositiveNumber(form.customBmr);
      if (customBmr != null && (!Number.isFinite(customBmr) || customBmr <= 0)) {
        wx.showToast({ title: "请输入正确基础代谢", icon: "none" });
        return null;
      }
      if (customBmr != null) {
        payload.customBmr = toInteger(customBmr);
      }
    } else if (formulaAvailable) {
      payload.useFormulaBmr = true;
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

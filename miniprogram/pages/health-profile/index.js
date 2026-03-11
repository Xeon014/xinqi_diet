const { getCurrentUser, getDailySummary, updateProfile } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const ACTIVITY_OPTIONS = [
  { label: "未设置", value: "" },
  { label: "久坐办公", value: "SEDENTARY" },
  { label: "轻量活动", value: "LIGHT" },
  { label: "中等活动", value: "MODERATE" },
  { label: "高频训练", value: "ACTIVE" },
  { label: "高强度体力", value: "VERY_ACTIVE" }
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

function normalizeProfile(profile) {
  return {
    ...profile,
    bmi: toOneDecimal(profile.bmi),
    bmr: profile.bmr == null ? "--" : toInteger(profile.bmr),
    tdee: profile.tdee == null ? "--" : toInteger(profile.tdee),
    currentWeight: profile.currentWeight == null ? "--" : profile.currentWeight
  };
}

function normalizeSummary(summary) {
  const hasTarget = summary.targetCalories != null;
  return {
    ...summary,
    consumedCalories: toInteger(summary.consumedCalories),
    hasTarget,
    remainingCalories: hasTarget && summary.remainingCalories != null ? toInteger(summary.remainingCalories) : null,
    targetCalories: hasTarget ? toInteger(summary.targetCalories) : null,
    exceededTarget: hasTarget && Boolean(summary.exceededTarget)
  };
}

Page({
  data: {
    today: getToday(),
    profile: null,
    summary: null,
    activityOptions: ACTIVITY_OPTIONS,
    activityIndex: 0,
    settings: {
      dailyCalorieTarget: "",
      activityLevel: ""
    }
  },
  onShow() {
    this.resetPageScroll();
    this.loadPageData();
  },
  onPullDownRefresh() {
    this.loadPageData(true);
  },
  loadPageData(stopPullDown = false) {
    Promise.all([getCurrentUser(), getDailySummary(this.data.today)])
      .then(([profile, summary]) => {
        this.setData({
          profile: normalizeProfile(profile),
          summary: normalizeSummary(summary),
          activityIndex: this.findActivityIndex(profile.activityLevel),
          settings: {
            dailyCalorieTarget: profile.dailyCalorieTarget == null ? "" : String(profile.dailyCalorieTarget),
            activityLevel: profile.activityLevel
          }
        });
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
  resetPageScroll() {
    wx.nextTick(() => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    });
  },
  findActivityIndex(value) {
    const index = ACTIVITY_OPTIONS.findIndex((item) => item.value === value);
    return index >= 0 ? index : 0;
  },
  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [`settings.${field}`]: event.detail.value });
  },
  handleActivityChange(event) {
    const activityIndex = Number(event.detail.value);
    this.setData({
      activityIndex,
      "settings.activityLevel": ACTIVITY_OPTIONS[activityIndex].value
    });
  },
  handleSave() {
    const { settings } = this.data;
    const payload = {};
    const targetInput = String(settings.dailyCalorieTarget || "").trim();

    if (settings.activityLevel) {
      payload.activityLevel = settings.activityLevel;
    }

    if (targetInput) {
      const dailyCalorieTarget = Number(targetInput);
      if (!dailyCalorieTarget || dailyCalorieTarget <= 0) {
        wx.showToast({ title: "请输入正确目标热量", icon: "none" });
        return;
      }
      payload.dailyCalorieTarget = dailyCalorieTarget;
    }

    if (!Object.keys(payload).length) {
      wx.showToast({ title: "未修改可保存项", icon: "none" });
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
  }
});

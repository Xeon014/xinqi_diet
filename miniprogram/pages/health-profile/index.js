const { getCurrentUser, getDailySummary, updateProfile } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const ACTIVITY_OPTIONS = [
  { label: "久坐办公", value: "SEDENTARY" },
  { label: "轻量活动", value: "LIGHT" },
  { label: "中等活动", value: "MODERATE" },
  { label: "高频训练", value: "ACTIVE" },
  { label: "高强度体力", value: "VERY_ACTIVE" },
];

function toInteger(value) {
  return Math.round(Number(value || 0));
}

function normalizeProfile(profile) {
  return {
    ...profile,
    bmr: toInteger(profile.bmr),
    tdee: toInteger(profile.tdee),
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
      activityLevel: "LIGHT",
    },
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
          summary,
          activityIndex: this.findActivityIndex(profile.activityLevel),
          settings: {
            dailyCalorieTarget: profile.dailyCalorieTarget == null ? "" : String(profile.dailyCalorieTarget),
            activityLevel: profile.activityLevel,
          },
        });
        this.resetPageScroll();
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      })
      .finally(() => {
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  resetPageScroll() {
    wx.nextTick(() => {
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 0,
      });
    });
  },

  findActivityIndex(value) {
    const index = ACTIVITY_OPTIONS.findIndex((item) => item.value === value);
    return index >= 0 ? index : 0;
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`settings.${field}`]: event.detail.value,
    });
  },

  handleActivityChange(event) {
    const activityIndex = Number(event.detail.value);
    this.setData({
      activityIndex,
      "settings.activityLevel": ACTIVITY_OPTIONS[activityIndex].value,
    });
  },

  handleSave() {
    const { profile, settings } = this.data;
    const dailyCalorieTarget = Number(settings.dailyCalorieTarget);

    if (!dailyCalorieTarget || dailyCalorieTarget <= 0) {
      wx.showToast({ title: "请输入正确目标热量", icon: "none" });
      return;
    }

    updateProfile({
      name: profile.name,
      gender: profile.gender,
      birthDate: profile.birthDate,
      height: Number(profile.height),
      activityLevel: settings.activityLevel,
      dailyCalorieTarget,
      currentWeight: Number(profile.currentWeight),
      targetWeight: Number(profile.targetWeight),
      customBmr: Number(profile.customBmr || profile.bmr),
    })
      .then(() => {
        wx.showToast({
          title: "保存成功",
          icon: "success",
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 350);
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },
});
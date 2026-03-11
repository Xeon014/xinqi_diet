const { getCurrentUser } = require("../../services/user");
const { pickErrorMessage } = require("../../utils/request");

const TOOL_ENTRIES = [
  {
    key: "custom-food",
    title: "自定义食物",
  },
  {
    key: "custom-combo",
    title: "自定义套餐",
  },
  {
    key: "custom-exercise",
    title: "自定义运动",
  },
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

function buildProfileTitle(name) {
  const trimmedName = String(name || "").trim();
  return trimmedName || "我的资料";
}

function buildProfileSub(profile) {
  const currentWeight = profile.currentWeight == null ? "--" : `${profile.currentWeight} kg`;
  const targetWeight = profile.targetWeight == null ? "--" : `${profile.targetWeight} kg`;
  return `当前 ${currentWeight} · 目标 ${targetWeight}`;
}

Page({
  data: {
    profile: null,
    heroTitle: "我的资料",
    heroSubtitle: "",
    bmiLabel: "0.0",
    bmrLabel: "0 kcal/天",
    toolEntries: TOOL_ENTRIES,
  },

  onShow() {
    this.loadPageData();
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  loadPageData(stopPullDown = false) {
    getCurrentUser()
      .then((profile) => {
        this.setData({
          profile,
          heroTitle: buildProfileTitle(profile.name),
          heroSubtitle: buildProfileSub(profile),
          bmiLabel: toOneDecimal(profile.bmi),
          bmrLabel: profile.bmr == null ? "--" : `${toInteger(profile.bmr)} kcal/天`,
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

  handleOpenPersonalInfo() {
    wx.navigateTo({ url: "/pages/personal-info/index" });
  },

  handleOpenHealthProfile() {
    wx.navigateTo({ url: "/pages/health-profile/index" });
  },

  handleOpenTool(event) {
    const { key } = event.currentTarget.dataset;
    if (key === "custom-food") {
      wx.navigateTo({ url: "/pages/food-search/index" });
      return;
    }
    if (key === "custom-combo") {
      wx.navigateTo({ url: "/pages/meal-combo-manage/index" });
      return;
    }
    if (key === "custom-exercise") {
      wx.navigateTo({ url: "/pages/exercise-search/index" });
    }
  },
});

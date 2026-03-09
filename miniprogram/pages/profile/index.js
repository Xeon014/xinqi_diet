const { getCurrentUser, getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const TOOL_ENTRIES = [
  {
    key: "custom-food",
    title: "自定义食物",
    desc: "维护常吃食物，记录时可快速复用",
  },
  {
    key: "custom-combo",
    title: "自定义套餐",
    desc: "管理食物组合，支持编辑与删除",
  },
  {
    key: "custom-exercise",
    title: "自定义运动",
    desc: "补充常用运动项目，记录更高效",
  },
];

function toInteger(value) {
  return Math.round(Number(value || 0));
}

function toOneDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0.0";
  }
  return number.toFixed(1);
}

function buildTodayStatus(summary) {
  const remaining = Math.abs(toInteger(summary.remainingCalories));
  return summary.exceededTarget ? `今日已超 ${remaining} kcal` : `今日剩余 ${remaining} kcal`;
}

function buildProfileSub(profile) {
  return `当前 ${profile.currentWeight} kg · 目标 ${profile.targetWeight} kg`;
}

function getNameInitial(name) {
  if (!name) {
    return "我";
  }
  return String(name).trim().slice(0, 1) || "我";
}

Page({
  data: {
    today: getToday(),
    profile: null,
    summary: null,
    heroSubtitle: "",
    todayStatus: "",
    bmiLabel: "0.0",
    intakeLabel: "0 / 0",
    nameInitial: "我",
    toolEntries: TOOL_ENTRIES,
  },

  onShow() {
    this.loadPageData();
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  loadPageData(stopPullDown = false) {
    Promise.all([getCurrentUser(), getDailySummary(this.data.today)])
      .then(([profile, summary]) => {
        this.setData({
          profile,
          summary,
          heroSubtitle: buildProfileSub(profile),
          todayStatus: buildTodayStatus(summary),
          bmiLabel: toOneDecimal(profile.bmi),
          intakeLabel: `${toInteger(summary.consumedCalories)} / ${toInteger(summary.targetCalories)} kcal`,
          nameInitial: getNameInitial(profile.name),
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
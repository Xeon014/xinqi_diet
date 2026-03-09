const { getCurrentUser, getDailySummary } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const GENDER_LABELS = {
  FEMALE: "女",
  MALE: "男"
};

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

function buildOverview(profile, summary) {
  return [
    { label: "当前体重", value: `${profile.currentWeight} kg`, tone: "green" },
    { label: "BMI", value: toOneDecimal(profile.bmi), tone: "sand" },
    { label: "今日摄入", value: `${toInteger(summary.consumedCalories)} / ${toInteger(summary.targetCalories)}`, tone: "teal" },
    { label: "基础代谢(BMR)", value: `${toInteger(profile.bmr)} kcal/天`, tone: "orange" }
  ];
}

function buildPersonalTags(profile) {
  return [
    GENDER_LABELS[profile.gender] || "未设置",
    profile.age != null ? `${profile.age} 岁` : "年龄未算出",
    profile.height != null ? `${profile.height} cm` : "身高未设置"
  ];
}

function buildHealthTags(profile, summary) {
  const remaining = Number(summary.remainingCalories || 0);
  const remainingLabel = summary.exceededTarget ? `超 ${Math.abs(Math.round(remaining))} kcal` : `剩 ${Math.round(remaining)} kcal`;

  return [
    `今日 ${toInteger(summary.consumedCalories)} kcal`,
    remainingLabel,
    `基础代谢 ${toInteger(profile.bmr)}`
  ];
}

function buildPersonalNote(profile) {
  return `当前 ${profile.currentWeight} kg / 目标 ${profile.targetWeight} kg`;
}

function buildHealthNote(summary) {
  return `蛋白 ${summary.proteinIntake}g / 碳水 ${summary.carbsIntake}g / 脂肪 ${summary.fatIntake}g`;
}

Page({
  data: {
    today: getToday(),
    profile: null,
    summary: null,
    overviewCards: [],
    personalTags: [],
    healthTags: [],
    personalNote: "",
    healthNote: ""
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
          overviewCards: buildOverview(profile, summary),
          personalTags: buildPersonalTags(profile),
          healthTags: buildHealthTags(profile, summary),
          personalNote: buildPersonalNote(profile),
          healthNote: buildHealthNote(summary)
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
  }
});

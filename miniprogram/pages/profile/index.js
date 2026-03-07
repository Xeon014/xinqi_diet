const { getCurrentUser, updateProfile } = require("../../services/user");
const { pickErrorMessage } = require("../../utils/request");

const GENDER_OPTIONS = [
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" },
];

const ACTIVITY_OPTIONS = [
  { label: "久坐办公", value: "SEDENTARY" },
  { label: "轻量活动", value: "LIGHT" },
  { label: "中等活动", value: "MODERATE" },
  { label: "高频训练", value: "ACTIVE" },
  { label: "高强度体力", value: "VERY_ACTIVE" },
];

Page({
  data: {
    genderOptions: GENDER_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    genderIndex: 0,
    activityIndex: 1,
    profile: {
      name: "",
      gender: "FEMALE",
      age: "",
      height: "",
      activityLevel: "LIGHT",
      dailyCalorieTarget: "",
      currentWeight: "",
      targetWeight: "",
      bmr: 0,
      tdee: 0,
    },
  },

  onShow() {
    this.loadProfile();
  },

  onPullDownRefresh() {
    this.loadProfile(true);
  },

  loadProfile(stopPullDown = false) {
    getCurrentUser()
      .then((profile) => {
        this.setData({
          genderIndex: this.findOptionIndex(GENDER_OPTIONS, profile.gender),
          activityIndex: this.findOptionIndex(ACTIVITY_OPTIONS, profile.activityLevel),
          profile: {
            name: profile.name,
            gender: profile.gender,
            age: String(profile.age),
            height: String(profile.height),
            activityLevel: profile.activityLevel,
            dailyCalorieTarget: String(profile.dailyCalorieTarget),
            currentWeight: String(profile.currentWeight),
            targetWeight: String(profile.targetWeight),
            bmr: profile.bmr,
            tdee: profile.tdee,
          },
        });
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

  findOptionIndex(options, value) {
    const index = options.findIndex((item) => item.value === value);
    return index >= 0 ? index : 0;
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`profile.${field}`]: event.detail.value,
    });
  },

  handleGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      "profile.gender": GENDER_OPTIONS[genderIndex].value,
    });
  },

  handleActivityChange(event) {
    const activityIndex = Number(event.detail.value);
    this.setData({
      activityIndex,
      "profile.activityLevel": ACTIVITY_OPTIONS[activityIndex].value,
    });
  },

  handleSave() {
    const { name, gender, age, height, activityLevel, dailyCalorieTarget, currentWeight, targetWeight } = this.data.profile;
    if (!name.trim()) {
      wx.showToast({ title: "姓名不能为空", icon: "none" });
      return;
    }

    if (!age || Number(age) <= 0) {
      wx.showToast({ title: "请输入正确年龄", icon: "none" });
      return;
    }

    if (!height || Number(height) < 50) {
      wx.showToast({ title: "请输入正确身高", icon: "none" });
      return;
    }

    updateProfile({
      name: name.trim(),
      gender,
      age: Number(age),
      height: Number(height),
      activityLevel,
      dailyCalorieTarget: Number(dailyCalorieTarget),
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
    })
      .then((profile) => {
        wx.showToast({
          title: "保存成功",
          icon: "success",
        });
        this.setData({
          profile: {
            ...this.data.profile,
            bmr: profile.bmr,
            tdee: profile.tdee,
          },
        });
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },
});
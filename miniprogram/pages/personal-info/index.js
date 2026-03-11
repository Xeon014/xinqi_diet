const { getCurrentUser, updateProfile } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const DEFAULT_WECHAT_NAME = "微信用户";
const NICKNAME_PROMPTED_PREFIX = "nickname_prompted_";
const MAX_NICKNAME_LENGTH = 20;

const GENDER_OPTIONS = [
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" }
];

function toInteger(value) {
  return Math.round(Number(value || 0));
}

Page({
  data: {
    maxBirthDate: getToday(),
    genderOptions: GENDER_OPTIONS,
    genderIndex: 0,
    profile: null,
    form: {
      name: "",
      gender: "FEMALE",
      birthDate: "",
      height: "",
      currentWeight: "",
      targetWeight: "",
      customBmr: ""
    }
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
          profile,
          genderIndex: this.findOptionIndex(profile.gender),
          form: {
            name: profile.name || "",
            gender: profile.gender,
            birthDate: profile.birthDate || "",
            height: profile.height == null ? "" : String(profile.height),
            currentWeight: profile.currentWeight == null ? "" : String(profile.currentWeight),
            targetWeight: profile.targetWeight == null ? "" : String(profile.targetWeight),
            customBmr: String(profile.customBmr || toInteger(profile.bmr))
          }
        });
        this.maybePromptNickname(profile);
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
  findOptionIndex(value) {
    const index = GENDER_OPTIONS.findIndex((item) => item.value === value);
    return index >= 0 ? index : 0;
  },
  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [`form.${field}`]: event.detail.value });
  },
  handleGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      "form.gender": GENDER_OPTIONS[genderIndex].value
    });
  },
  handleBirthDateChange(event) {
    this.setData({ "form.birthDate": event.detail.value });
  },
  maybePromptNickname(profile) {
    const userId = profile && profile.id != null ? profile.id : "unknown";
    if (!profile || profile.name !== DEFAULT_WECHAT_NAME) {
      return;
    }
    const storageKey = `${NICKNAME_PROMPTED_PREFIX}${userId}`;
    const prompted = wx.getStorageSync(storageKey);
    if (prompted) {
      return;
    }
    wx.showToast({ title: "建议先设置昵称", icon: "none" });
    wx.setStorageSync(storageKey, true);
  },
  handleSave() {
    const { profile, form } = this.data;
    const name = String(form.name || "").trim();
    const height = Number(form.height);
    const currentWeight = Number(form.currentWeight);
    const targetWeight = Number(form.targetWeight);
    const customBmr = Number(form.customBmr);

    if (!name) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (name.length > MAX_NICKNAME_LENGTH) {
      wx.showToast({ title: "昵称最多 20 个字符", icon: "none" });
      return;
    }
    if (!form.birthDate) {
      wx.showToast({ title: "请选择生日", icon: "none" });
      return;
    }
    if (!height || height < 50) {
      wx.showToast({ title: "请输入正确身高", icon: "none" });
      return;
    }
    if (!currentWeight || currentWeight <= 0) {
      wx.showToast({ title: "请输入正确当前体重", icon: "none" });
      return;
    }
    if (!targetWeight || targetWeight <= 0) {
      wx.showToast({ title: "请输入正确目标体重", icon: "none" });
      return;
    }
    if (!customBmr || customBmr <= 0) {
      wx.showToast({ title: "请输入正确基础代谢", icon: "none" });
      return;
    }

    updateProfile({
      name,
      gender: form.gender,
      birthDate: form.birthDate,
      height,
      activityLevel: profile.activityLevel,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      currentWeight,
      targetWeight,
      customBmr
    })
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

const { getCurrentUser, updateProfile } = require("../../services/user");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    profile: {
      name: "",
      email: "",
      dailyCalorieTarget: "",
      currentWeight: "",
      targetWeight: "",
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
          profile: {
            name: profile.name,
            email: profile.email,
            dailyCalorieTarget: String(profile.dailyCalorieTarget),
            currentWeight: String(profile.currentWeight),
            targetWeight: String(profile.targetWeight),
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

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [`profile.${field}`]: event.detail.value,
    });
  },

  handleSave() {
    const { name, email, dailyCalorieTarget, currentWeight, targetWeight } = this.data.profile;
    if (!name.trim()) {
      wx.showToast({ title: "姓名不能为空", icon: "none" });
      return;
    }
    if (!/.+@.+\..+/.test(email)) {
      wx.showToast({ title: "邮箱格式不正确", icon: "none" });
      return;
    }

    updateProfile({
      name: name.trim(),
      dailyCalorieTarget: Number(dailyCalorieTarget),
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
    })
      .then(() => {
        wx.showToast({
          title: "保存成功",
          icon: "success",
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
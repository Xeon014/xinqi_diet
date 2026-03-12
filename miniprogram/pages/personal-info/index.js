const { getCurrentUser, updateProfile } = require("../../services/user");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const MAX_NICKNAME_LENGTH = 20;

const GENDER_OPTIONS = [
  { label: "未设置", value: "" },
  { label: "女", value: "FEMALE" },
  { label: "男", value: "MALE" }
];

function toPositiveNumber(rawValue) {
  const text = String(rawValue == null ? "" : rawValue).trim();
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

Page({
  data: {
    maxBirthDate: getToday(),
    genderOptions: GENDER_OPTIONS,
    genderIndex: 0,
    profile: null,
    form: {
      name: "",
      gender: "",
      birthDate: "",
      height: "",
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
        const form = {
          name: profile.name || "",
          gender: profile.gender || "",
          birthDate: profile.birthDate || "",
          height: profile.height == null ? "" : String(profile.height),
        };
        this.setData({
          profile,
          genderIndex: this.findOptionIndex(form.gender),
          form,
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

  findOptionIndex(value) {
    const index = GENDER_OPTIONS.findIndex((item) => item.value === value);
    return index >= 0 ? index : 0;
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ ["form." + field]: event.detail.value });
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

  handleSave() {
    const form = this.data.form;
    const payload = {};
    const name = String(form.name || "").trim();

    if (name.length > MAX_NICKNAME_LENGTH) {
      wx.showToast({ title: "昵称最多 20 个字", icon: "none" });
      return;
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
      return;
    }
    if (height != null) {
      payload.height = height;
    }

    if (!Object.keys(payload).length) {
      wx.showToast({ title: "没有可保存的修改", icon: "none" });
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

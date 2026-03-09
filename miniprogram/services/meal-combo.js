const { getCurrentUserId } = require("../utils/auth");
const { request } = require("../utils/request");

function withUserId(executor) {
  const userId = getCurrentUserId();
  if (!userId) {
    return Promise.reject(new Error("当前用户未登录"));
  }
  return executor(userId);
}

function createMealCombo(payload) {
  return withUserId((userId) => request({
    url: "/api/meal-combos",
    method: "POST",
    data: {
      ...payload,
      userId,
    },
    loadingTitle: "保存中",
  }));
}

function updateMealCombo(comboId, payload) {
  return withUserId((userId) => request({
    url: `/api/meal-combos/${comboId}?userId=${userId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  }));
}

function deleteMealCombo(comboId) {
  return withUserId((userId) => request({
    url: `/api/meal-combos/${comboId}?userId=${userId}`,
    method: "DELETE",
    loadingTitle: "删除中",
  }));
}

function getMealComboList() {
  return withUserId((userId) => request({
    url: `/api/meal-combos?userId=${userId}`,
    showLoading: false,
  }));
}

function getMealComboDetail(comboId) {
  return withUserId((userId) => request({
    url: `/api/meal-combos/${comboId}?userId=${userId}`,
    showLoading: false,
  }));
}

module.exports = {
  createMealCombo,
  updateMealCombo,
  deleteMealCombo,
  getMealComboList,
  getMealComboDetail,
};

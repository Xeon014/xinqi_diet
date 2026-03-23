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
  return withUserId(() => request({
    url: "/api/meal-combos",
    method: "POST",
    data: payload,
    loadingTitle: "保存中",
  }));
}

function updateMealCombo(comboId, payload) {
  return withUserId(() => request({
    url: `/api/meal-combos/${comboId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  }));
}

function deleteMealCombo(comboId) {
  return withUserId(() => request({
    url: `/api/meal-combos/${comboId}`,
    method: "DELETE",
    loadingTitle: "删除中",
  }));
}

function getMealComboList() {
  return withUserId(() => request({
    url: "/api/meal-combos",
    showLoading: false,
  }));
}

function getMealComboDetail(comboId) {
  return withUserId(() => request({
    url: `/api/meal-combos/${comboId}`,
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

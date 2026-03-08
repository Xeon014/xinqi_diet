const { getCurrentUserId } = require("../utils/auth");
const { request } = require("../utils/request");

function requireUserId() {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("当前用户未登录");
  }
  return userId;
}

function getCurrentUser() {
  const userId = requireUserId();
  return request({
    url: `/api/users/${userId}`,
  });
}

function getDailySummary(date) {
  const userId = requireUserId();
  return request({
    url: `/api/users/${userId}/daily-summary?date=${date}`,
  });
}

function getProgress({ startDate, endDate }) {
  const userId = requireUserId();
  return request({
    url: `/api/users/${userId}/progress?startDate=${startDate}&endDate=${endDate}`,
  });
}

function updateProfile(payload) {
  const userId = requireUserId();
  return request({
    url: `/api/users/${userId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

module.exports = {
  getCurrentUser,
  getDailySummary,
  getProgress,
  updateProfile,
};

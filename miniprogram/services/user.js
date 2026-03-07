const { DEFAULT_USER_ID } = require("../utils/constants");
const { request } = require("../utils/request");

function getCurrentUser() {
  return request({
    url: `/api/users/${DEFAULT_USER_ID}`,
  });
}

function getDailySummary(date) {
  return request({
    url: `/api/users/${DEFAULT_USER_ID}/daily-summary?date=${date}`,
  });
}

function getProgress({ startDate, endDate }) {
  return request({
    url: `/api/users/${DEFAULT_USER_ID}/progress?startDate=${startDate}&endDate=${endDate}`,
  });
}

function updateProfile(payload) {
  return request({
    url: `/api/users/${DEFAULT_USER_ID}`,
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
const { getCurrentUserId } = require("../utils/auth");
const { request } = require("../utils/request");

function withUserId(executor) {
  const app = getApp();
  const ensureLogin = app && typeof app.ensureLogin === "function"
    ? app.ensureLogin.bind(app)
    : () => Promise.resolve();

  return ensureLogin().then(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      return Promise.reject(new Error("???????"));
    }
    return executor(userId);
  });
}

function getCurrentUser() {
  return withUserId((userId) => request({
    url: "/api/users/" + userId,
  }));
}

function getDailySummary(date) {
  return withUserId((userId) => request({
    url: "/api/users/" + userId + "/daily-summary?date=" + date,
  }));
}

function getProgress({ startDate, endDate }) {
  return withUserId((userId) => request({
    url: "/api/users/" + userId + "/progress?startDate=" + startDate + "&endDate=" + endDate,
  }));
}

function updateProfile(payload) {
  return withUserId((userId) => request({
    url: "/api/users/" + userId,
    method: "PUT",
    data: payload,
    loadingTitle: "???",
  }));
}

function previewGoalPlan(payload) {
  return withUserId((userId) => request({
    url: "/api/users/" + userId + "/goal-plan-preview",
    method: "POST",
    data: payload,
    showLoading: false,
  }));
}

module.exports = {
  getCurrentUser,
  getDailySummary,
  getProgress,
  updateProfile,
  previewGoalPlan,
};

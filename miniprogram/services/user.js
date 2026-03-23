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
      if (app && typeof app.handleAuthFailure === "function") {
        app.handleAuthFailure();
      }
      return Promise.reject({
        statusCode: 401,
        code: "TOKEN_MISSING",
        message: "登录已失效，请重试",
      });
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

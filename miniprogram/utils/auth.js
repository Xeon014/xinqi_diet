const { AUTH_TOKEN_KEY, CLIENT_USER_KEY, USER_ID_KEY } = require("./constants");

function getAccessToken() {
  return wx.getStorageSync(AUTH_TOKEN_KEY) || "";
}

function getCurrentUserId() {
  const userId = wx.getStorageSync(USER_ID_KEY);
  return userId ? Number(userId) : null;
}

function setAuthInfo({ accessToken, userId }) {
  wx.setStorageSync(AUTH_TOKEN_KEY, accessToken || "");
  wx.setStorageSync(USER_ID_KEY, userId || "");
}

function clearAuthInfo() {
  wx.removeStorageSync(AUTH_TOKEN_KEY);
  wx.removeStorageSync(USER_ID_KEY);
}

function getClientUserKey() {
  let key = wx.getStorageSync(CLIENT_USER_KEY);
  if (key) {
    return key;
  }

  key = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  wx.setStorageSync(CLIENT_USER_KEY, key);
  return key;
}

module.exports = {
  clearAuthInfo,
  getAccessToken,
  getClientUserKey,
  getCurrentUserId,
  setAuthInfo,
};

const { getAccessToken } = require("./auth");
const { BASE_URL } = require("./constants");

function pickErrorMessage(error) {
  if (error && error.data && Array.isArray(error.data.details) && error.data.details.length > 0) {
    return error.data.details[0];
  }
  if (error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

function doRequest({ url, method = "GET", data, showLoading = true, loadingTitle = "加载中" }) {
  if (showLoading) {
    wx.showLoading({
      title: loadingTitle,
      mask: true,
    });
  }

  return new Promise((resolve, reject) => {
    const accessToken = getAccessToken();
    const header = {
      "content-type": "application/json",
    };
    if (accessToken) {
      header.Authorization = `Bearer ${accessToken}`;
    }

    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res) => {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && body.code === "SUCCESS") {
          resolve(body.data);
          return;
        }

        reject({
          statusCode: res.statusCode,
          ...body,
        });
      },
      fail: (error) => {
        reject({
          message: error.errMsg || "网络异常",
        });
      },
      complete: () => {
        if (showLoading) {
          wx.hideLoading();
        }
      },
    });
  });
}

function request(options) {
  const app = getApp();
  const ensureLogin = app && typeof app.ensureLogin === "function"
    ? app.ensureLogin.bind(app)
    : () => Promise.resolve();

  return ensureLogin()
    .then(() => doRequest(options))
    .catch((error) => {
      if (error && error.statusCode === 401 && !options.__retried) {
        return ensureLogin(true).then(() => doRequest({ ...options, __retried: true }));
      }
      return Promise.reject(error);
    });
}

module.exports = {
  pickErrorMessage,
  request,
};

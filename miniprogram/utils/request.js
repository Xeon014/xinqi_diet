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

function request({ url, method = "GET", data, showLoading = true, loadingTitle = "加载中" }) {
  if (showLoading) {
    wx.showLoading({
      title: loadingTitle,
      mask: true,
    });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        "content-type": "application/json",
      },
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

module.exports = {
  pickErrorMessage,
  request,
};
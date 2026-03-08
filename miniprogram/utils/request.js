const { BASE_URL } = require("./constants");

function pickErrorMessage(error) {
  if (error && error.data && Array.isArray(error.data.details) && error.data.details.length > 0) {
    return error.data.details[0];
  }
  if (error && error.message) {
    return error.message;
  }
  return "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5";
}

function request({ url, method = "GET", data, showLoading = true, loadingTitle = "\u52a0\u8f7d\u4e2d" }) {
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
          message: error.errMsg || "\u7f51\u7edc\u5f02\u5e38",
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
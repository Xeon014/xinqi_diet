const { BASE_URL } = require("../utils/constants");

function loginByWechatCode({ code, clientUserKey }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/api/auth/wechat/login`,
      method: "POST",
      data: {
        code,
        clientUserKey,
      },
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
    });
  });
}

module.exports = {
  loginByWechatCode,
};

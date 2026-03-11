const { requestWithoutLogin } = require("../utils/request");

function loginByWechatCode({ code, clientUserKey }) {
  return requestWithoutLogin({
    url: "/api/auth/wechat/login",
    method: "POST",
    data: {
      code,
      clientUserKey,
    },
    showLoading: false,
  });
}

module.exports = {
  loginByWechatCode,
};

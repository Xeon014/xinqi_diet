const { loginByWechatCode } = require("./services/auth");
const { clearAuthInfo, getAccessToken, getClientUserKey, getCurrentUserId, setAuthInfo } = require("./utils/auth");

App({
  globalData: {
    refreshHomeOnShow: false,
  },

  onLaunch() {
    this.ensureLogin();
  },

  ensureLogin(forceRefresh = false) {
    const existingToken = getAccessToken();
    const existingUserId = getCurrentUserId();
    if (!forceRefresh && existingToken && existingUserId) {
      return Promise.resolve({
        accessToken: existingToken,
        userId: existingUserId,
      });
    }

    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = new Promise((resolve, reject) => {
      wx.login({
        success: (loginResult) => {
          const code = loginResult && loginResult.code;
          if (!code) {
            reject(new Error("微信登录失败：未获取到 code"));
            return;
          }

          loginByWechatCode({
            code,
            clientUserKey: getClientUserKey(),
          })
            .then((authResult) => {
              setAuthInfo(authResult);
              resolve(authResult);
            })
            .catch((error) => {
              clearAuthInfo();
              reject(error);
            });
        },
        fail: (error) => {
          clearAuthInfo();
          reject(error);
        },
      });
    }).finally(() => {
      this.loginPromise = null;
    });

    return this.loginPromise;
  },
});

const { loginByWechatCode } = require("./services/auth");
const { clearAuthInfo, getAccessToken, getClientUserKey, getCurrentUserId, setAuthInfo } = require("./utils/auth");
const { CLOUD_ENV_ID, CLOUD_SERVICE, RUNTIME_ENV_VERSION, USE_CLOUD_CONTAINER } = require("./utils/constants");

App({
  globalData: {
    refreshHomeOnShow: false,
  },

  onLaunch() {
    this.initCloudRuntime();
    this.ensureLogin();
  },

  initCloudRuntime() {
    if (!USE_CLOUD_CONTAINER) {
      return;
    }

    if (!wx.cloud || typeof wx.cloud.init !== "function") {
      console.error("当前微信基础库不支持 wx.cloud，无法使用云托管调用");
      return;
    }

    const cloudInitOptions = {
      traceUser: true,
    };
    if (CLOUD_ENV_ID) {
      cloudInitOptions.env = CLOUD_ENV_ID;
    }
    wx.cloud.init(cloudInitOptions);

    if (!CLOUD_SERVICE) {
      console.warn("未配置 cloudService，wx.cloud.callContainer 将无法路由到云托管服务");
    }

    console.info(`云托管调用已启用，当前环境：${RUNTIME_ENV_VERSION}`);
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

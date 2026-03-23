const { loginByWechatCode } = require("./services/auth");
const { clearAuthInfo, getAccessToken, getClientUserKey, getCurrentUserId, setAuthInfo } = require("./utils/auth");
const {
  BASE_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  RUNTIME_ENV_VERSION,
  STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY,
  USE_CLOUD_CONTAINER,
} = require("./utils/constants");

const ONBOARDING_PENDING_PREFIX = "onboarding_pending_";

App({
  globalData: {
    refreshHomeOnShow: false,
    pendingHomeRecordDate: "",
    onboardingPendingUserId: null,
  },

  onLaunch() {
    this.ensureStorageSchema();
    this.initCloudRuntime();
    this.ensureLogin();
  },

  ensureStorageSchema() {
    const currentVersion = Number(wx.getStorageSync(STORAGE_SCHEMA_VERSION_KEY) || 0);
    if (currentVersion === STORAGE_SCHEMA_VERSION) {
      return;
    }

    wx.clearStorageSync();
    wx.setStorageSync(STORAGE_SCHEMA_VERSION_KEY, STORAGE_SCHEMA_VERSION);
    this.globalData.onboardingPendingUserId = null;
    console.info(`本地缓存结构已升级到版本 ${STORAGE_SCHEMA_VERSION}，已执行一次性全量清理`);
  },

  initCloudRuntime() {
    if (!USE_CLOUD_CONTAINER) {
      console.info(`当前使用本地 HTTP 请求，环境：${RUNTIME_ENV_VERSION}，baseUrl：${BASE_URL}`);
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

    console.info(`云托管调用已启用，当前环境：${RUNTIME_ENV_VERSION}，service：${CLOUD_SERVICE}`);
  },

  ensureLogin(forceRefresh = false) {
    const existingToken = getAccessToken();
    const existingUserId = getCurrentUserId();
    if (!forceRefresh && existingToken && existingUserId) {
      this.syncOnboardingState(existingUserId);
      return Promise.resolve({
        accessToken: existingToken,
        userId: existingUserId,
        isNewUser: false,
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
              if (authResult && authResult.userId) {
                if (authResult.isNewUser) {
                  this.markOnboardingPending(authResult.userId);
                } else {
                  this.syncOnboardingState(authResult.userId);
                }
              }
              resolve(authResult);
            })
            .catch((error) => {
              clearAuthInfo();
              this.globalData.onboardingPendingUserId = null;
              reject(error);
            });
        },
        fail: (error) => {
          clearAuthInfo();
          this.globalData.onboardingPendingUserId = null;
          reject(error);
        },
      });
    }).finally(() => {
      this.loginPromise = null;
    });

    return this.loginPromise;
  },

  handleAuthFailure() {
    clearAuthInfo();
    this.globalData.onboardingPendingUserId = null;
  },

  isOnboardingPending(userId) {
    return this.globalData.onboardingPendingUserId != null
      && Number(this.globalData.onboardingPendingUserId) === Number(userId);
  },

  completeOnboarding(userId) {
    if (!userId) {
      return;
    }
    wx.removeStorageSync(this.getOnboardingPendingKey(userId));
    this.globalData.onboardingPendingUserId = null;
  },

  markOnboardingPending(userId) {
    if (!userId) {
      return;
    }
    wx.setStorageSync(this.getOnboardingPendingKey(userId), true);
    this.globalData.onboardingPendingUserId = Number(userId);
  },

  syncOnboardingState(userId) {
    if (!userId) {
      this.globalData.onboardingPendingUserId = null;
      return;
    }
    const pending = wx.getStorageSync(this.getOnboardingPendingKey(userId));
    this.globalData.onboardingPendingUserId = pending ? Number(userId) : null;
  },

  getOnboardingPendingKey(userId) {
    return `${ONBOARDING_PENDING_PREFIX}${userId}`;
  },
});

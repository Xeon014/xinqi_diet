const { getAccessToken } = require("./auth");
const {
  BASE_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER,
} = require("./constants");

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_INVALID",
  "TOKEN_EXPIRED",
  "UNAUTHORIZED",
]);

const DEFAULT_LOADING_DELAY = 250;
const LOADING_MODE_NONE = "none";
const LOADING_MODE_AUTO = "auto";
const LOADING_MODE_NAV = "nav";
const LOADING_MODE_TOAST = "toast";
const LOADING_MODE_MODAL = "modal";

const loadingState = {
  nextTaskId: 0,
  nav: {
    visible: false,
    tasks: new Set(),
  },
  overlay: {
    visible: false,
    title: "",
    mask: false,
    tasks: new Map(),
  },
};

function pickErrorMessage(error) {
  if (error && error.data && Array.isArray(error.data.details) && error.data.details.length > 0) {
    return error.data.details[0];
  }
  if (error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

function resolveCloudConfig() {
  if (!CLOUD_SERVICE) {
    return {
      ok: false,
      message: "未配置云托管服务名 cloudService",
    };
  }
  return {
    ok: true,
    config: CLOUD_ENV_ID ? { env: CLOUD_ENV_ID } : undefined,
  };
}

function requestByCloudContainer({ url, method, data, header, complete }) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.callContainer !== "function") {
      reject({
        message: "当前基础库不支持 wx.cloud.callContainer",
      });
      return;
    }

    const cloudConfig = resolveCloudConfig();
    if (!cloudConfig.ok) {
      reject({
        message: cloudConfig.message,
      });
      return;
    }

    const callOptions = {
      path: url,
      method,
      data,
      header: {
        ...header,
        "X-WX-SERVICE": CLOUD_SERVICE,
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
      complete,
    };
    if (cloudConfig.config) {
      callOptions.config = cloudConfig.config;
    }
    wx.cloud.callContainer(callOptions);
  });
}

function requestByHttp({ url, method, data, header, complete }) {
  return new Promise((resolve, reject) => {
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
      complete,
    });
  });
}

function syncNavigationLoading() {
  if (loadingState.nav.tasks.size > 0) {
    if (!loadingState.nav.visible) {
      wx.showNavigationBarLoading();
      loadingState.nav.visible = true;
    }
    return;
  }

  if (loadingState.nav.visible) {
    wx.hideNavigationBarLoading();
    loadingState.nav.visible = false;
  }
}

function syncOverlayLoading() {
  const tasks = Array.from(loadingState.overlay.tasks.values());
  if (!tasks.length) {
    if (loadingState.overlay.visible) {
      wx.hideLoading();
      loadingState.overlay.visible = false;
      loadingState.overlay.title = "";
      loadingState.overlay.mask = false;
    }
    return;
  }

  const currentTask = tasks[tasks.length - 1];
  const nextTitle = currentTask.title || "加载中";
  const nextMask = tasks.some((task) => task.mask);
  if (
    !loadingState.overlay.visible
    || loadingState.overlay.title !== nextTitle
    || loadingState.overlay.mask !== nextMask
  ) {
    wx.showLoading({
      title: nextTitle,
      mask: nextMask,
    });
    loadingState.overlay.visible = true;
    loadingState.overlay.title = nextTitle;
    loadingState.overlay.mask = nextMask;
  }
}

function resolveLoadingMode({ method = "GET", showLoading, loadingMode }) {
  if (showLoading === false) {
    return LOADING_MODE_NONE;
  }
  if (
    loadingMode === LOADING_MODE_NAV
    || loadingMode === LOADING_MODE_TOAST
    || loadingMode === LOADING_MODE_MODAL
    || loadingMode === LOADING_MODE_NONE
  ) {
    return loadingMode;
  }

  const requestMethod = String(method || "GET").toUpperCase();
  if (loadingMode === LOADING_MODE_AUTO || !loadingMode) {
    return requestMethod === "GET" ? LOADING_MODE_NAV : LOADING_MODE_TOAST;
  }

  return requestMethod === "GET" ? LOADING_MODE_NAV : LOADING_MODE_TOAST;
}

function startLoadingTask({ method, showLoading, loadingMode, loadingDelay, loadingTitle }) {
  const mode = resolveLoadingMode({ method, showLoading, loadingMode });
  if (mode === LOADING_MODE_NONE) {
    return () => {};
  }

  const delay = Number.isFinite(loadingDelay) && loadingDelay >= 0
    ? loadingDelay
    : DEFAULT_LOADING_DELAY;
  const taskId = ++loadingState.nextTaskId;
  let stopped = false;
  let visible = false;
  const timer = setTimeout(() => {
    if (stopped) {
      return;
    }

    visible = true;
    if (mode === LOADING_MODE_NAV) {
      loadingState.nav.tasks.add(taskId);
      syncNavigationLoading();
      return;
    }

    loadingState.overlay.tasks.set(taskId, {
      title: loadingTitle || "加载中",
      mask: mode === LOADING_MODE_MODAL,
    });
    syncOverlayLoading();
  }, delay);

  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    clearTimeout(timer);
    if (!visible) {
      return;
    }

    if (mode === LOADING_MODE_NAV) {
      loadingState.nav.tasks.delete(taskId);
      syncNavigationLoading();
      return;
    }

    loadingState.overlay.tasks.delete(taskId);
    syncOverlayLoading();
  };
}

function doRequest({
  url,
  method = "GET",
  data,
  showLoading = true,
  loadingTitle = "加载中",
  loadingMode = LOADING_MODE_AUTO,
  loadingDelay = DEFAULT_LOADING_DELAY,
}) {
  const stopLoading = startLoadingTask({
    method,
    showLoading,
    loadingMode,
    loadingDelay,
    loadingTitle,
  });
  const accessToken = getAccessToken();
  const header = {
    "content-type": "application/json",
  };
  if (accessToken) {
    header.Authorization = `Bearer ${accessToken}`;
  }

  const complete = () => {
    stopLoading();
  };

  if (USE_CLOUD_CONTAINER) {
    return requestByCloudContainer({
      url,
      method,
      data,
      header,
      complete,
    }).finally(stopLoading);
  }

  // 直连域名方案保留为兜底，默认不启用。
  return requestByHttp({
    url,
    method,
    data,
    header,
    complete,
  }).finally(stopLoading);
}

function requestWithoutLogin(options) {
  return doRequest(options);
}

function isAuthError(error) {
  return !!(error && (error.statusCode === 401 || AUTH_ERROR_CODES.has(error.code)));
}

function normalizeAuthError(error) {
  const code = error && error.code ? error.code : "TOKEN_INVALID";
  let message = "登录已失效，请重试";
  if (code === "TOKEN_MISSING") {
    message = "请先登录";
  } else if (code !== "TOKEN_INVALID" && code !== "TOKEN_EXPIRED") {
    message = (error && error.message) || message;
  }

  return {
    ...error,
    statusCode: 401,
    code,
    message,
  };
}

function normalizeReloginError(error) {
  if (isAuthError(error)) {
    return normalizeAuthError(error);
  }
  return {
    ...error,
    statusCode: 401,
    code: "LOGIN_REFRESH_FAILED",
    message: "登录失败，请重试",
  };
}

function clearAuthState() {
  const app = getApp();
  if (app && typeof app.handleAuthFailure === "function") {
    app.handleAuthFailure();
  }
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
        return ensureLogin(true)
          .then(() => doRequest({ ...options, __retried: true }))
          .catch((retryError) => {
            const normalizedRetryError = normalizeReloginError(retryError);
            clearAuthState();
            return Promise.reject(normalizedRetryError);
          });
      }
      if (isAuthError(error)) {
        const normalizedError = normalizeAuthError(error);
        clearAuthState();
        return Promise.reject(normalizedError);
      }
      return Promise.reject(error);
    });
}

module.exports = {
  pickErrorMessage,
  request,
  requestWithoutLogin,
};

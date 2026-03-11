const { getAccessToken } = require("./auth");
const {
  BASE_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER,
} = require("./constants");

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

function doRequest({ url, method = "GET", data, showLoading = true, loadingTitle = "加载中" }) {
  if (showLoading) {
    wx.showLoading({
      title: loadingTitle,
      mask: true,
    });
  }

  const accessToken = getAccessToken();
  const header = {
    "content-type": "application/json",
  };
  if (accessToken) {
    header.Authorization = `Bearer ${accessToken}`;
  }

  const complete = () => {
    if (showLoading) {
      wx.hideLoading();
    }
  };

  if (USE_CLOUD_CONTAINER) {
    return requestByCloudContainer({
      url,
      method,
      data,
      header,
      complete,
    });
  }

  // 直连域名方案保留为兜底，默认不启用。
  return requestByHttp({
    url,
    method,
    data,
    header,
    complete,
  });
}

function requestWithoutLogin(options) {
  return doRequest(options);
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
  requestWithoutLogin,
};

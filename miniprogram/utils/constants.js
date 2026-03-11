const BASE_URL_MAP = {
  develop: "http://127.0.0.1:8080",
  trial: "https://diet-api-trial.example.com",
  release: "https://diet-api.example.com",
};

const CLOUD_CONTAINER_MAP = {
  develop: {
    envId: "prod-0gtze2g30e64915d",
    service: "xinqi-diet",
  },
  trial: {
    envId: "prod-0gtze2g30e64915d",
    service: "xinqi-diet",
  },
  release: {
    envId: "prod-0gtze2g30e64915d",
    service: "xinqi-diet",
  },
};

const USE_CLOUD_CONTAINER = true;

function normalizeBaseUrl(url) {
  if (typeof url !== "string") {
    return "";
  }
  return url.trim().replace(/\/+$/, "");
}

function getExtConfig() {
  if (typeof wx !== "undefined" && typeof wx.getExtConfigSync === "function") {
    return wx.getExtConfigSync() || {};
  }
  return {};
}

function resolveEnvVersion() {
  let envVersion = "develop";
  if (typeof wx !== "undefined" && typeof wx.getAccountInfoSync === "function") {
    try {
      const accountInfo = wx.getAccountInfoSync();
      envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion
        ? accountInfo.miniProgram.envVersion
        : "develop";
    } catch (error) {
      envVersion = "develop";
    }
  }
  return envVersion;
}

function resolveBaseUrl(extConfig, envVersion) {
  const extBaseUrl = normalizeBaseUrl(extConfig.baseUrl);
  if (extBaseUrl) {
    return extBaseUrl;
  }
  return BASE_URL_MAP[envVersion] || BASE_URL_MAP.develop;
}

function resolveCloudEnvId(extConfig, envVersion) {
  if (typeof extConfig.cloudEnvId === "string" && extConfig.cloudEnvId.trim()) {
    return extConfig.cloudEnvId.trim();
  }
  const envConfig = CLOUD_CONTAINER_MAP[envVersion] || CLOUD_CONTAINER_MAP.develop;
  return envConfig.envId;
}

function resolveCloudService(extConfig, envVersion) {
  if (typeof extConfig.cloudService === "string" && extConfig.cloudService.trim()) {
    return extConfig.cloudService.trim();
  }
  const envConfig = CLOUD_CONTAINER_MAP[envVersion] || CLOUD_CONTAINER_MAP.develop;
  return envConfig.service;
}

const EXT_CONFIG = getExtConfig();
const RUNTIME_ENV_VERSION = resolveEnvVersion();
const RUNTIME_CONFIG = {
  baseUrl: resolveBaseUrl(EXT_CONFIG, RUNTIME_ENV_VERSION),
  cloudEnvId: resolveCloudEnvId(EXT_CONFIG, RUNTIME_ENV_VERSION),
  cloudService: resolveCloudService(EXT_CONFIG, RUNTIME_ENV_VERSION),
};
const BASE_URL = RUNTIME_CONFIG.baseUrl;
const CLOUD_ENV_ID = RUNTIME_CONFIG.cloudEnvId;
const CLOUD_SERVICE = RUNTIME_CONFIG.cloudService;
const AUTH_TOKEN_KEY = "xinqi_access_token";
const USER_ID_KEY = "xinqi_user_id";
const CLIENT_USER_KEY = "xinqi_client_user_key";

module.exports = {
  AUTH_TOKEN_KEY,
  BASE_URL,
  BASE_URL_MAP,
  CLOUD_CONTAINER_MAP,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  CLIENT_USER_KEY,
  RUNTIME_ENV_VERSION,
  USE_CLOUD_CONTAINER,
  USER_ID_KEY,
};

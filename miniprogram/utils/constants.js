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

function resolveBaseUrl(envVersion) {
  return BASE_URL_MAP[envVersion] || BASE_URL_MAP.develop;
}

function resolveCloudEnvId(envVersion) {
  const envConfig = CLOUD_CONTAINER_MAP[envVersion] || CLOUD_CONTAINER_MAP.develop;
  return envConfig.envId;
}

function resolveCloudService(envVersion) {
  const envConfig = CLOUD_CONTAINER_MAP[envVersion] || CLOUD_CONTAINER_MAP.develop;
  return envConfig.service;
}

function resolveUseCloudContainer(envVersion) {
  return envVersion !== "develop";
}

const RUNTIME_ENV_VERSION = resolveEnvVersion();
const RUNTIME_CONFIG = {
  baseUrl: resolveBaseUrl(RUNTIME_ENV_VERSION),
  cloudEnvId: resolveCloudEnvId(RUNTIME_ENV_VERSION),
  cloudService: resolveCloudService(RUNTIME_ENV_VERSION),
  useCloudContainer: resolveUseCloudContainer(RUNTIME_ENV_VERSION),
};
const BASE_URL = RUNTIME_CONFIG.baseUrl;
const CLOUD_ENV_ID = RUNTIME_CONFIG.cloudEnvId;
const CLOUD_SERVICE = RUNTIME_CONFIG.cloudService;
const USE_CLOUD_CONTAINER = RUNTIME_CONFIG.useCloudContainer;
const AUTH_TOKEN_KEY = "xinqi_access_token";
const USER_ID_KEY = "xinqi_user_id";
const CLIENT_USER_KEY = "xinqi_client_user_key";
const STORAGE_SCHEMA_VERSION_KEY = "xinqi_storage_schema_version";
const STORAGE_SCHEMA_VERSION = 2;
const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  MORNING_SNACK: "上午加餐",
  LUNCH: "午餐",
  AFTERNOON_SNACK: "下午加餐",
  DINNER: "晚餐",
  LATE_NIGHT_SNACK: "夜宵",
  OTHER: "其他",
};
const MEAL_TYPE_OPTIONS = Object.keys(MEAL_TYPE_LABELS).map((key) => ({
  key,
  label: MEAL_TYPE_LABELS[key],
}));
const CALORIE_UNIT_LABELS = {
  KCAL: "kcal",
  KJ: "kJ",
};
const QUANTITY_UNIT_LABELS = {
  G: "g",
  ML: "ml",
};
const RECOMMENDED_MEAL_WINDOWS = [
  { startMinute: 0, endMinute: 419, mealType: "LATE_NIGHT_SNACK" },
  { startMinute: 420, endMinute: 569, mealType: "BREAKFAST" },
  { startMinute: 570, endMinute: 689, mealType: "MORNING_SNACK" },
  { startMinute: 690, endMinute: 869, mealType: "LUNCH" },
  { startMinute: 870, endMinute: 1049, mealType: "AFTERNOON_SNACK" },
  { startMinute: 1050, endMinute: 1259, mealType: "DINNER" },
  { startMinute: 1260, endMinute: 1439, mealType: "LATE_NIGHT_SNACK" },
];

function getRecommendedMealType(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const matchedWindow = RECOMMENDED_MEAL_WINDOWS.find(
    (window) => totalMinutes >= window.startMinute && totalMinutes <= window.endMinute
  );
  return matchedWindow ? matchedWindow.mealType : "LATE_NIGHT_SNACK";
}

module.exports = {
  AUTH_TOKEN_KEY,
  BASE_URL,
  BASE_URL_MAP,
  CALORIE_UNIT_LABELS,
  CLOUD_CONTAINER_MAP,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  CLIENT_USER_KEY,
  getRecommendedMealType,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_OPTIONS,
  QUANTITY_UNIT_LABELS,
  RUNTIME_ENV_VERSION,
  STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY,
  USE_CLOUD_CONTAINER,
  USER_ID_KEY,
};

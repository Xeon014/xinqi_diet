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
  { startMinute: 300, endMinute: 659, mealType: "BREAKFAST" },
  { startMinute: 660, endMinute: 959, mealType: "LUNCH" },
  { startMinute: 960, endMinute: 1259, mealType: "DINNER" },
  { startMinute: 1260, endMinute: 1439, mealType: "LATE_NIGHT_SNACK" },
  { startMinute: 0, endMinute: 299, mealType: "LATE_NIGHT_SNACK" },
];
const APP_COPY = {
  emptyState: {
    defaultTitle: "暂无内容",
    defaultDescription: "这里还没有内容",
  },
  home: {
    emptyTitle: "今天还没有记录",
    emptyDescription: "右下角可添加饮食、运动和体重",
    diaryEmpty: "写下今天的状态",
    quickMenuTitle: "添加记录",
    quickMenuLabels: {
      weight: "体重",
      diet: "饮食",
      exercise: "运动",
      diary: "日记",
    },
  },
  foodSearch: {
    searchEmptyTitle: "没有找到食物",
    searchEmptyDescription: "可以换个关键词试试",
    recentEmptyTitle: "还没有饮食记录",
    recentEmptyDescription: "记录过的食物会显示在这里",
    recentSearchEmptyTitle: "还没有搜索记录",
    recentSearchEmptyDescription: "搜索过的关键词会保留在这里",
    customEmptyTitle: "还没有自定义食物",
    customEmptyDescription: "可在右上角添加",
    comboEmptyTitle: "还没有自定义套餐",
    comboEmptyDescription: "可在套餐里新建",
    categoryEmptyTitle: "这一类还没有食物",
    categoryEmptyDescription: "可以换个关键词或分类看看",
  },
  exerciseSearch: {
    searchEmptyTitle: "没有找到运动",
    searchEmptyDescription: "可以换个关键词试试",
    recentEmptyTitle: "还没有运动记录",
    recentEmptyDescription: "记录过的运动会显示在这里",
    recentSearchEmptyTitle: "还没有搜索记录",
    recentSearchEmptyDescription: "搜索过的关键词会保留在这里",
    customEmptyTitle: "还没有自定义运动",
    customEmptyDescription: "可在右上角添加",
    categoryEmptyTitle: "这一类还没有运动",
    categoryEmptyDescription: "可以换个分类看看",
  },
  profile: {
    emptyTitle: "还没有资料",
    emptyDescription: "资料准备好后会显示在这里",
  },
  metricHistory: {
    emptyButton: "添加记录",
  },
};

function getRecommendedMealType(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const matchedWindow = RECOMMENDED_MEAL_WINDOWS.find(
    (window) => totalMinutes >= window.startMinute && totalMinutes <= window.endMinute
  );
  return matchedWindow ? matchedWindow.mealType : "LATE_NIGHT_SNACK";
}

module.exports = {
  AUTH_TOKEN_KEY,
  APP_COPY,
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

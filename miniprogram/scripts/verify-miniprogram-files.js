const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_JSON_PATH = path.join(PROJECT_ROOT, "app.json");
const REQUIRED_PAGE_EXTENSIONS = [".js", ".json", ".wxml", ".wxss"];
const FORBIDDEN_REGISTERED_PAGES = new Set([
  "pages/food-item-editor/index",
]);

function fail(message) {
  console.error(`校验失败: ${message}`);
  process.exitCode = 1;
}

function ensureFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    fail(`${description}不存在: ${path.relative(PROJECT_ROOT, filePath)}`);
    return false;
  }
  return true;
}

function readAppConfig() {
  if (!ensureFileExists(APP_JSON_PATH, "app.json")) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(APP_JSON_PATH, "utf8"));
  } catch (error) {
    fail(`app.json 解析失败: ${error.message}`);
    return null;
  }
}

function verifyPageFiles(pages) {
  pages.forEach((pagePath) => {
    if (FORBIDDEN_REGISTERED_PAGES.has(pagePath)) {
      fail(`历史页面不应继续注册到 app.json: ${pagePath}`);
    }

    REQUIRED_PAGE_EXTENSIONS.forEach((extension) => {
      ensureFileExists(
        path.join(PROJECT_ROOT, `${pagePath}${extension}`),
        `页面文件 ${pagePath}${extension}`
      );
    });
  });
}

function verifyKeyFiles() {
  ensureFileExists(
    path.join(PROJECT_ROOT, "utils/constants.js"),
    "运行时配置文件 utils/constants.js"
  );
}

function main() {
  const appConfig = readAppConfig();
  if (!appConfig) {
    return;
  }

  const pages = Array.isArray(appConfig.pages) ? appConfig.pages : [];
  if (!pages.length) {
    fail("app.json 未声明 pages");
    return;
  }

  verifyPageFiles(pages);
  verifyKeyFiles();

  if (process.exitCode) {
    return;
  }

  console.log(`小程序文件校验通过，共检查 ${pages.length} 个页面`);
}

main();

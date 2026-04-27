const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_JSON_PATH = path.join(PROJECT_ROOT, "app.json");
const REQUIRED_PAGE_EXTENSIONS = [".js", ".json", ".wxml", ".wxss"];
const FORBIDDEN_REGISTERED_PAGES = new Set([
  "pages/food-item-editor/index",
]);
const MODAL_BUTTON_TEXT_MAX_LENGTH = 4;

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

function readTextFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function verifyModalButtonTexts() {
  const sourceRoots = ["pages", "components"].map((dir) => path.join(PROJECT_ROOT, dir));
  const files = [];
  sourceRoots.forEach((sourceRoot) => collectFiles(sourceRoot, ".js", files));

  files.forEach((filePath) => {
    const content = readTextFile(filePath);
    const buttonTextPattern = /\b(confirmText|cancelText)\s*:\s*["']([^"']*)["']/g;
    let match;
    while ((match = buttonTextPattern.exec(content)) !== null) {
      const text = match[2];
      if (Array.from(text).length > MODAL_BUTTON_TEXT_MAX_LENGTH) {
        fail(`${path.relative(PROJECT_ROOT, filePath)} 中 ${match[1]}="${text}" 超过 ${MODAL_BUTTON_TEXT_MAX_LENGTH} 个字`);
      }
    }
  });
}

function collectFiles(dirPath, extension, result) {
  if (!fs.existsSync(dirPath)) {
    return result;
  }
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, extension, result);
      return;
    }
    if (entry.isFile() && entry.name.endsWith(extension)) {
      result.push(entryPath);
    }
  });
  return result;
}

function verifyProjectConfig() {
  const projectConfigPath = path.join(PROJECT_ROOT, "project.config.json");
  if (!ensureFileExists(projectConfigPath, "project.config.json")) {
    return;
  }
  let projectConfig;
  try {
    projectConfig = JSON.parse(readTextFile(projectConfigPath));
  } catch (error) {
    fail(`project.config.json 解析失败: ${error.message}`);
    return;
  }
  if (projectConfig.setting && projectConfig.setting.uploadWithSourceMap !== false) {
    fail("project.config.json 中 setting.uploadWithSourceMap 必须为 false");
  }
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
  verifyModalButtonTexts();
  verifyProjectConfig();

  if (process.exitCode) {
    return;
  }

  console.log(`小程序文件校验通过，共检查 ${pages.length} 个页面`);
}

main();

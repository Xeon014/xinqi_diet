const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IGNORED_DIRS = new Set([
  ".codex",
  ".git",
  ".idea",
  ".m2",
  "backend/target",
  "node_modules",
  "target",
]);
const TEXT_EXTENSIONS = new Set([
  ".java",
  ".js",
  ".json",
  ".md",
  ".sql",
  ".wxml",
  ".wxss",
  ".yml",
  ".yaml",
]);
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

function toRelativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function shouldSkipDirectory(dirPath) {
  const relativePath = toRelativePath(dirPath);
  return IGNORED_DIRS.has(relativePath) || IGNORED_DIRS.has(path.basename(dirPath));
}

function collectFiles(dirPath, result = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entryPath)) {
        collectFiles(entryPath, result);
      }
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      result.push(entryPath);
    }
  }
  return result;
}

function findProblems(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const problems = [];
  if (/\?{4,}/.test(content)) {
    problems.push("包含连续问号占位，疑似中文乱码");
  }
  if (content.includes(REPLACEMENT_CHAR)) {
    problems.push("包含 Unicode 替换字符，疑似编码损坏");
  }
  return problems;
}

function main() {
  const violations = collectFiles(PROJECT_ROOT)
    .flatMap((filePath) => findProblems(filePath)
      .map((problem) => `${toRelativePath(filePath)}: ${problem}`));

  if (violations.length > 0) {
    console.error("文本内容校验失败:");
    violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
  }

  console.log("文本内容校验通过");
}

main();

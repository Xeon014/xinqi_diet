const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MINI_PROGRAM_DIR = path.join(ROOT, "miniprogram");

const TARGET_EXT = new Set([".js", ".json", ".wxml", ".wxss"]);
const MOJIBAKE_TOKENS = ["锛", "鈥", "閺", "娑", "鐠", "妫", "鍔", "鏉", "濞", "缁", "闂", "妤", "缂", "閻", "娴", "璁", "", ""];

const failures = [];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }
  return files;
}

function toRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, "/");
}

function fail(file, message) {
  failures.push({ file: toRel(file), message });
}

const allFiles = walk(MINI_PROGRAM_DIR).filter((abs) => TARGET_EXT.has(path.extname(abs)));

for (const file of allFiles) {
  const text = fs.readFileSync(file, "utf8");

  if (text.includes("\uFFFD") || text.includes("�")) {
    fail(file, "contains replacement character U+FFFD (encoding corruption)");
  }

  if (/[\uE000-\uF8FF]/.test(text)) {
    fail(file, "contains private-use unicode chars (likely mojibake)");
  }

  const tokenHit = MOJIBAKE_TOKENS.find((token) => text.includes(token));
  if (tokenHit) {
    fail(file, `contains suspicious mojibake token: ${tokenHit}`);
  }

  if (path.extname(file) === ".json") {
    try {
      JSON.parse(text);
    } catch (err) {
      fail(file, `invalid JSON: ${err.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[verify-miniprogram] FAILED");
  for (const item of failures) {
    console.error(`- ${item.file}: ${item.message}`);
  }
  process.exit(1);
}

console.log("[verify-miniprogram] OK");

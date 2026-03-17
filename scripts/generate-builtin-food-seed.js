const fs = require("fs");
const path = require("path");

const RAW_PATH = path.join(__dirname, "data", "builtin-food-raw.tsv");
const OUTPUT_PATH = path.join(__dirname, "..", "src", "main", "resources", "builtin_food_seed.sql");

const CATEGORY_LABELS = {
  STAPLE: "主食",
  PROTEIN: "肉蛋奶",
  VEGETABLE_FRUIT: "蔬果",
  BEAN: "豆制品",
  DRINK: "饮品",
  SNACK: "零食",
  OTHER: "其他",
};

const SOURCE_LABELS = {
  CN: "CURATED_CN",
  GLOBAL: "CURATED_GLOBAL",
};

const HIDDEN_SOURCES = ["CURATED_CN", "CURATED_GLOBAL"];

const FORBIDDEN_SYNTHETIC_SUFFIX = /（(?:蒸|煮|轻食|家常|便当|高纤|经典|清爽|即饮|冰饮|热饮|轻乳|高蛋白|低糖|无添加)）/;

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function parseNumber(rawValue, fieldName, name) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`字段 ${fieldName} 不是有效数字: ${name}`);
  }
  return Number(value.toFixed(2));
}

function parseTsv(content) {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const lines = normalizedContent
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("原始食物数据为空");
  }

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line, index) => {
    const cells = line.split("\t");
    if (cells.length !== headers.length) {
      throw new Error(`第 ${index + 2} 行列数不匹配`);
    }

    return headers.reduce((result, header, headerIndex) => {
      result[header] = cells[headerIndex];
      return result;
    }, {});
  });
}

function normalizeAliases(rawAliases, name) {
  const aliases = new Set([name]);
  String(rawAliases || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((alias) => aliases.add(alias));
  return Array.from(aliases).join(",");
}

function normalizeEntries(records) {
  const categoryCounters = new Map();
  const seenNames = new Set();

  return records.map((record, index) => {
    const name = String(record.name || "").trim();
    if (!name) {
      throw new Error(`第 ${index + 2} 行缺少名称`);
    }
    if (FORBIDDEN_SYNTHETIC_SUFFIX.test(name)) {
      throw new Error(`发现疑似规则后缀词条: ${name}`);
    }
    if (seenNames.has(name)) {
      throw new Error(`发现重复词条: ${name}`);
    }
    seenNames.add(name);

    const categoryKey = String(record.categoryKey || "").trim().toUpperCase();
    const category = CATEGORY_LABELS[categoryKey];
    if (!category) {
      throw new Error(`未知分类: ${name} -> ${record.categoryKey}`);
    }

    const sourceCode = String(record.source || "").trim().toUpperCase();
    const source = SOURCE_LABELS[sourceCode];
    if (!source) {
      throw new Error(`未知来源: ${name} -> ${record.source}`);
    }

    const quantityUnit = String(record.quantityUnit || "G").trim().toUpperCase();
    if (!["G", "ML"].includes(quantityUnit)) {
      throw new Error(`未知计量单位: ${name} -> ${quantityUnit}`);
    }

    const imageUrl = String(record.imageUrl || "").trim();
    if (imageUrl) {
      if (!/^https:\/\//.test(imageUrl)) {
        throw new Error(`图片地址必须为 HTTPS: ${name}`);
      }
      if (imageUrl.includes("placehold.co")) {
        throw new Error(`禁止占位图地址: ${name}`);
      }
    }

    const sortOrder = (categoryCounters.get(categoryKey) || 0) + 1;
    categoryCounters.set(categoryKey, sortOrder);

    return {
      name,
      category,
      categoryKey,
      caloriesPer100g: parseNumber(record.calories, "calories", name),
      proteinPer100g: parseNumber(record.protein, "protein", name),
      carbsPer100g: parseNumber(record.carbs, "carbs", name),
      fatPer100g: parseNumber(record.fat, "fat", name),
      quantityUnit,
      source,
      sourceRef: `CURATED-${categoryKey}-${String(sortOrder).padStart(3, "0")}`,
      aliases: normalizeAliases(record.aliases, name),
      imageUrl: imageUrl || null,
      sortOrder,
    };
  });
}

function formatSqlValue(value) {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return `'${escapeSql(value)}'`;
}

function buildUpdateSql(entry) {
  return [
    "UPDATE food",
    `SET calories_per_100g = ${formatSqlValue(entry.caloriesPer100g)},`,
    "    calorie_unit = 'KCAL',",
    `    protein_per_100g = ${formatSqlValue(entry.proteinPer100g)},`,
    `    carbs_per_100g = ${formatSqlValue(entry.carbsPer100g)},`,
    `    fat_per_100g = ${formatSqlValue(entry.fatPer100g)},`,
    `    quantity_unit = ${formatSqlValue(entry.quantityUnit)},`,
    `    category = ${formatSqlValue(entry.category)},`,
    `    source = ${formatSqlValue(entry.source)},`,
    `    source_ref = ${formatSqlValue(entry.sourceRef)},`,
    `    aliases = ${formatSqlValue(entry.aliases)},`,
    `    image_url = ${formatSqlValue(entry.imageUrl)},`,
    "    is_builtin = 1,",
    `    sort_order = ${formatSqlValue(entry.sortOrder)}`,
    `WHERE is_builtin = 1 AND name = ${formatSqlValue(entry.name)};`,
  ].join("\n");
}

function buildInsertSql(entry) {
  const columns = [
    "name",
    "calories_per_100g",
    "calorie_unit",
    "protein_per_100g",
    "carbs_per_100g",
    "fat_per_100g",
    "quantity_unit",
    "category",
    "source",
    "source_ref",
    "aliases",
    "image_url",
    "is_builtin",
    "sort_order",
    "created_at",
  ];

  const values = [
    formatSqlValue(entry.name),
    formatSqlValue(entry.caloriesPer100g),
    "'KCAL'",
    formatSqlValue(entry.proteinPer100g),
    formatSqlValue(entry.carbsPer100g),
    formatSqlValue(entry.fatPer100g),
    formatSqlValue(entry.quantityUnit),
    formatSqlValue(entry.category),
    formatSqlValue(entry.source),
    formatSqlValue(entry.sourceRef),
    formatSqlValue(entry.aliases),
    formatSqlValue(entry.imageUrl),
    "1",
    formatSqlValue(entry.sortOrder),
    "NOW()",
  ];

  return [
    `INSERT INTO food (${columns.join(", ")})`,
    `SELECT ${values.join(", ")}`,
    "FROM DUAL",
    `WHERE NOT EXISTS (SELECT 1 FROM food WHERE is_builtin = 1 AND name = ${formatSqlValue(entry.name)});`,
  ].join("\n");
}

function buildSql(entries) {
  const lines = [
    "-- builtin food seed generated by scripts/generate-builtin-food-seed.js",
    "-- source: offline curated real foods table",
    "-- behavior: hide previous curated rows, then upsert current catalog by builtin name",
    "",
    `UPDATE food SET source = 'LEGACY_BUILTIN' WHERE is_builtin = 1 AND source IN (${HIDDEN_SOURCES.map((item) => `'${item}'`).join(", ")});`,
    "",
  ];

  entries.forEach((entry) => {
    lines.push(buildUpdateSql(entry));
    lines.push("");
    lines.push(buildInsertSql(entry));
    lines.push("");
  });

  return `${lines.join("\n").trim()}\n`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const rawContent = fs.readFileSync(RAW_PATH, "utf8");
  const records = parseTsv(rawContent);
  const entries = normalizeEntries(records);
  const sql = buildSql(entries);

  if (checkOnly) {
    console.log(`Catalog OK: ${entries.length} entries`);
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, sql, "utf8");
  console.log(`Generated ${entries.length} builtin foods to ${OUTPUT_PATH}`);
}

main();

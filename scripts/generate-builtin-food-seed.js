const fs = require("fs");
const path = require("path");

const RAW_NUTRITION_PATH = path.join(__dirname, "data", "food_nutrition.csv");
const SELECTION_PATH = path.join(__dirname, "data", "builtin-food-selection.tsv");
const MANUAL_PATH = path.join(__dirname, "data", "builtin-food-manual.tsv");
const SQL_DIR = path.join(__dirname, "sql");
const ARCHIVE_DIR = path.join(SQL_DIR, "archive");
const BOOTSTRAP_SQL_PATH = path.join(SQL_DIR, "bootstrap-builtin-foods-latest.sql");
const SYNC_SQL_PATH = path.join(SQL_DIR, "sync-builtin-foods-latest.sql");
const UTF8_BOM = "\uFEFF";

const CATEGORY_LABELS = {
  STAPLE: "\u4e3b\u98df",
  PROTEIN: "\u8089\u86cb\u5976",
  VEGETABLE_FRUIT: "\u852c\u679c",
  BEAN: "\u8c46\u5236\u54c1",
  DRINK: "\u996e\u54c1",
  SNACK: "\u96f6\u98df",
  OTHER: "\u5176\u4ed6",
};

const CATEGORY_ORDER = [
  "STAPLE",
  "PROTEIN",
  "VEGETABLE_FRUIT",
  "BEAN",
  "DRINK",
  "SNACK",
  "OTHER",
];

const VALID_QUANTITY_UNITS = new Set(["G", "ML"]);
const VALID_IMAGE_PREFIX = "https://";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function formatSqlValue(value) {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return `'${escapeSql(value)}'`;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (inQuotes) {
      if (char === "\"") {
        if (content[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((line) => line.some((cell) => String(cell).trim() !== ""));
}

function parseDelimitedTable(content, delimiter, fileLabel) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error(`${fileLabel} is empty`);
  }

  const headers = lines[0].split(delimiter);
  return lines.slice(1).map((line, index) => {
    const cells = line.split(delimiter);
    if (cells.length !== headers.length) {
      throw new Error(`${fileLabel} line ${index + 2} column count mismatch`);
    }
    return headers.reduce((result, header, headerIndex) => {
      result[header] = cells[headerIndex];
      return result;
    }, {});
  });
}

function parseNutritionRows() {
  const rows = parseCsv(readText(RAW_NUTRITION_PATH));
  if (rows.length < 2) {
    throw new Error("food_nutrition.csv has no data");
  }

  const headers = rows[0];
  return rows.slice(1).map((row) => headers.reduce((result, header, index) => {
    result[header] = row[index] ?? "";
    return result;
  }, {}));
}

function parseSelectionRows() {
  return parseDelimitedTable(readText(SELECTION_PATH), "\t", "builtin-food-selection.tsv");
}

function parseManualRows() {
  return parseDelimitedTable(readText(MANUAL_PATH), "\t", "builtin-food-manual.tsv");
}

function parseRequiredNumber(rawValue, fieldName, rowLabel) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`${rowLabel} has invalid ${fieldName}`);
  }
  return Number(value.toFixed(2));
}

function parsePositiveInt(rawValue, fieldName, rowLabel) {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${rowLabel} has invalid ${fieldName}`);
  }
  return value;
}

function validateQuantityUnit(rawValue, rowLabel) {
  const quantityUnit = String(rawValue || "").trim().toUpperCase();
  if (!VALID_QUANTITY_UNITS.has(quantityUnit)) {
    throw new Error(`${rowLabel} has invalid quantityUnit`);
  }
  return quantityUnit;
}

function validateCategory(categoryKey, rowLabel) {
  const normalizedCategoryKey = String(categoryKey || "").trim().toUpperCase();
  const categoryLabel = CATEGORY_LABELS[normalizedCategoryKey];
  if (!categoryLabel) {
    throw new Error(`${rowLabel} has invalid categoryKey`);
  }
  return { categoryKey: normalizedCategoryKey, categoryLabel };
}

function validateImageUrl(imageUrl, rowLabel) {
  const normalizedImageUrl = String(imageUrl || "").trim();
  if (!normalizedImageUrl) {
    return null;
  }
  if (!normalizedImageUrl.startsWith(VALID_IMAGE_PREFIX)) {
    throw new Error(`${rowLabel} imageUrl must be HTTPS`);
  }
  return normalizedImageUrl;
}

function normalizeAliases(rawAliases, name) {
  const aliases = new Set([String(name || "").trim()]);
  String(rawAliases || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((alias) => aliases.add(alias));
  return Array.from(aliases).join(",");
}

function validateSourceRef(sourceRef, rowLabel) {
  const normalized = String(sourceRef || "").trim();
  if (!normalized) {
    throw new Error(`${rowLabel} missing sourceRef`);
  }
  return normalized;
}

function buildSelectionEntries(nutritionRows, selectionRows) {
  const nutritionByCode = new Map();
  nutritionRows.forEach((row) => {
    nutritionByCode.set(String(row.food_code).trim(), row);
  });

  return selectionRows.map((row) => {
    const foodCode = String(row.foodCode || "").trim();
    if (!foodCode) {
      throw new Error("selection row missing foodCode");
    }

    const nutrition = nutritionByCode.get(foodCode);
    if (!nutrition) {
      throw new Error(`selection foodCode not found in nutrition csv: ${foodCode}`);
    }

    const canonicalName = String(row.canonicalName || "").trim();
    if (!canonicalName) {
      throw new Error(`selection ${foodCode} missing canonicalName`);
    }

    const { categoryKey, categoryLabel } = validateCategory(row.categoryKey, `selection ${foodCode}`);
    const sortOrder = parsePositiveInt(row.sortOrder, "sortOrder", `selection ${foodCode}`);
    const quantityUnit = validateQuantityUnit(row.quantityUnit, `selection ${foodCode}`);
    const imageUrl = validateImageUrl(row.imageUrl, `selection ${foodCode}`);

    return {
      name: canonicalName,
      caloriesPer100g: parseRequiredNumber(nutrition.energy_kcal, "energy_kcal", `food_code=${foodCode}`),
      proteinPer100g: parseRequiredNumber(nutrition.protein_g, "protein_g", `food_code=${foodCode}`),
      carbsPer100g: parseRequiredNumber(nutrition.carbohydrate_g, "carbohydrate_g", `food_code=${foodCode}`),
      fatPer100g: parseRequiredNumber(nutrition.fat_g, "fat_g", `food_code=${foodCode}`),
      quantityUnit,
      categoryKey,
      categoryLabel,
      source: "CURATED_CN",
      sourceRef: `CN_FCT:${foodCode}`,
      aliases: normalizeAliases(row.aliases, canonicalName),
      imageUrl,
      sortOrder,
    };
  });
}

function buildManualEntries(manualRows) {
  return manualRows.map((row) => {
    const name = String(row.name || "").trim();
    if (!name) {
      throw new Error("manual row missing name");
    }

    const rowLabel = `manual ${name}`;
    const { categoryKey, categoryLabel } = validateCategory(row.categoryKey, rowLabel);
    const sortOrder = parsePositiveInt(row.sortOrder, "sortOrder", rowLabel);
    const quantityUnit = validateQuantityUnit(row.quantityUnit, rowLabel);
    const imageUrl = validateImageUrl(row.imageUrl, rowLabel);

    return {
      name,
      caloriesPer100g: parseRequiredNumber(row.calories, "calories", rowLabel),
      proteinPer100g: parseRequiredNumber(row.protein, "protein", rowLabel),
      carbsPer100g: parseRequiredNumber(row.carbs, "carbs", rowLabel),
      fatPer100g: parseRequiredNumber(row.fat, "fat", rowLabel),
      quantityUnit,
      categoryKey,
      categoryLabel,
      source: "CURATED_MANUAL",
      sourceRef: validateSourceRef(row.sourceRef, rowLabel),
      aliases: normalizeAliases(row.aliases, name),
      imageUrl,
      sortOrder,
    };
  });
}

function validateEntries(entries) {
  const nameSet = new Set();
  const sourceRefSet = new Set();
  const categorySortSet = new Set();

  entries.forEach((entry) => {
    if (nameSet.has(entry.name)) {
      throw new Error(`duplicate name generated: ${entry.name}`);
    }
    nameSet.add(entry.name);

    if (sourceRefSet.has(entry.sourceRef)) {
      throw new Error(`duplicate source_ref generated: ${entry.sourceRef}`);
    }
    sourceRefSet.add(entry.sourceRef);

    const categorySortKey = `${entry.categoryKey}:${entry.sortOrder}`;
    if (categorySortSet.has(categorySortKey)) {
      throw new Error(`duplicate sortOrder in category: ${categorySortKey}`);
    }
    categorySortSet.add(categorySortKey);
  });
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.categoryKey !== right.categoryKey) {
      return CATEGORY_ORDER.indexOf(left.categoryKey) - CATEGORY_ORDER.indexOf(right.categoryKey);
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.sourceRef.localeCompare(right.sourceRef);
  });
}

function buildInsertSql(entry) {
  const columns = [
    "user_id",
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
    "NULL",
    formatSqlValue(entry.name),
    formatSqlValue(entry.caloriesPer100g),
    "'KCAL'",
    formatSqlValue(entry.proteinPer100g),
    formatSqlValue(entry.carbsPer100g),
    formatSqlValue(entry.fatPer100g),
    formatSqlValue(entry.quantityUnit),
    formatSqlValue(entry.categoryLabel),
    formatSqlValue(entry.source),
    formatSqlValue(entry.sourceRef),
    formatSqlValue(entry.aliases),
    formatSqlValue(entry.imageUrl),
    "1",
    formatSqlValue(entry.sortOrder),
    "NOW()",
  ];

  return `INSERT INTO food (${columns.join(", ")}) VALUES (${values.join(", ")});`;
}

function buildUpdateSql(entry) {
  return [
    "UPDATE food",
    "SET user_id = NULL,",
    `    name = ${formatSqlValue(entry.name)},`,
    `    calories_per_100g = ${formatSqlValue(entry.caloriesPer100g)},`,
    "    calorie_unit = 'KCAL',",
    `    protein_per_100g = ${formatSqlValue(entry.proteinPer100g)},`,
    `    carbs_per_100g = ${formatSqlValue(entry.carbsPer100g)},`,
    `    fat_per_100g = ${formatSqlValue(entry.fatPer100g)},`,
    `    quantity_unit = ${formatSqlValue(entry.quantityUnit)},`,
    `    category = ${formatSqlValue(entry.categoryLabel)},`,
    `    source = ${formatSqlValue(entry.source)},`,
    `    aliases = ${formatSqlValue(entry.aliases)},`,
    `    image_url = ${formatSqlValue(entry.imageUrl)},`,
    "    is_builtin = 1,",
    `    sort_order = ${formatSqlValue(entry.sortOrder)}`,
    `WHERE source_ref = ${formatSqlValue(entry.sourceRef)};`,
  ].join("\n");
}

function buildInsertIfMissingSql(entry) {
  const columns = [
    "user_id",
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
    "NULL",
    formatSqlValue(entry.name),
    formatSqlValue(entry.caloriesPer100g),
    "'KCAL'",
    formatSqlValue(entry.proteinPer100g),
    formatSqlValue(entry.carbsPer100g),
    formatSqlValue(entry.fatPer100g),
    formatSqlValue(entry.quantityUnit),
    formatSqlValue(entry.categoryLabel),
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
    `WHERE NOT EXISTS (SELECT 1 FROM food WHERE source_ref = ${formatSqlValue(entry.sourceRef)});`,
  ].join("\n");
}

function buildBootstrapSql(entries) {
  const lines = [
    "-- builtin foods bootstrap sql generated by scripts/generate-builtin-food-seed.js",
    "-- use only before production launch or in a resettable environment",
    "",
    "START TRANSACTION;",
    "DELETE FROM food WHERE is_builtin = 1;",
    "",
  ];

  entries.forEach((entry) => {
    lines.push(buildInsertSql(entry));
  });

  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function buildSyncSql(entries) {
  const lines = [
    "-- builtin foods sync sql generated by scripts/generate-builtin-food-seed.js",
    "-- post-launch maintenance: update existing rows by source_ref and insert new rows only",
    "-- no builtin food row will be deleted by this script",
    "",
    "START TRANSACTION;",
    "",
  ];

  entries.forEach((entry) => {
    lines.push(buildUpdateSql(entry));
    lines.push("");
    lines.push(buildInsertIfMissingSql(entry));
    lines.push("");
  });

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function buildSummary(entries) {
  const counts = entries.reduce((result, entry) => {
    result.total += 1;
    result.bySource[entry.source] = (result.bySource[entry.source] || 0) + 1;
    result.byCategory[entry.categoryLabel] = (result.byCategory[entry.categoryLabel] || 0) + 1;
    return result;
  }, { total: 0, bySource: {}, byCategory: {} });

  console.log(`Catalog OK: ${counts.total} entries`);
  Object.entries(counts.bySource).forEach(([source, count]) => {
    console.log(`  source ${source}: ${count}`);
  });
  Object.entries(counts.byCategory).forEach(([category, count]) => {
    console.log(`  category ${category}: ${count}`);
  });
}

function writeUtf8Bom(filePath, content) {
  fs.writeFileSync(filePath, `${UTF8_BOM}${content}`, "utf8");
}

function archiveFile(targetPath, archivePrefix, content) {
  const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const archivePath = path.join(ARCHIVE_DIR, `${archivePrefix}-${dateText}.sql`);
  writeUtf8Bom(archivePath, content);
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const archiveEnabled = process.argv.includes("--archive");

  const nutritionRows = parseNutritionRows();
  const selectionEntries = buildSelectionEntries(nutritionRows, parseSelectionRows());
  const manualEntries = buildManualEntries(parseManualRows());
  const entries = sortEntries([...selectionEntries, ...manualEntries]);

  validateEntries(entries);
  buildSummary(entries);

  if (checkOnly) {
    return;
  }

  ensureDir(SQL_DIR);
  ensureDir(ARCHIVE_DIR);

  const bootstrapSql = buildBootstrapSql(entries);
  const syncSql = buildSyncSql(entries);

  writeUtf8Bom(BOOTSTRAP_SQL_PATH, bootstrapSql);
  writeUtf8Bom(SYNC_SQL_PATH, syncSql);

  if (archiveEnabled) {
    archiveFile(BOOTSTRAP_SQL_PATH, "bootstrap-builtin-foods", bootstrapSql);
    archiveFile(SYNC_SQL_PATH, "sync-builtin-foods", syncSql);
  }

  console.log(`Generated bootstrap SQL to ${BOOTSTRAP_SQL_PATH}`);
  console.log(`Generated sync SQL to ${SYNC_SQL_PATH}`);
}

main();

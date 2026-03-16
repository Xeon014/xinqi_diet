const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "..", "src", "main", "resources", "builtin_food_seed.sql");

const IMAGE_BG = "F6EFE4";
const IMAGE_FG = "5D4C3A";

const CATEGORIES = [
  {
    key: "STAPLE",
    label: "主食",
    source: "CN_OFFLINE",
    calBase: 74,
    calStep: 9,
    proteinBase: 2.2,
    proteinStep: 0.45,
    carbsBase: 14.5,
    carbsStep: 2.1,
    fatBase: 0.2,
    fatStep: 0.18,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（熟）", factor: 1.02 },
      { suffix: "（蒸）", factor: 0.98 },
      { suffix: "（煮）", factor: 0.96 },
      { suffix: "（全谷）", factor: 0.94 },
      { suffix: "（轻食）", factor: 0.9 },
      { suffix: "（家常）", factor: 1.03 },
      { suffix: "（便当）", factor: 1.05 },
      { suffix: "（高纤）", factor: 0.92 },
      { suffix: "（低脂）", factor: 0.91 },
      { suffix: "（经典）", factor: 1.01 },
    ],
    items: [
      "米饭", "糙米饭", "黑米饭", "藜麦饭", "燕麦片", "玉米", "红薯", "紫薯", "土豆", "山药",
      "南瓜饭", "小米粥", "八宝粥", "糙米粥", "馒头", "花卷", "全麦面包", "吐司", "贝果", "荞麦面",
      "乌冬面", "意面", "通心粉", "米粉", "河粉", "凉皮", "荞麦饭团", "寿司饭", "年糕", "糍粑",
      "杂粮饭", "鹰嘴豆饭", "玉米饼", "墨西哥薄饼", "全麦卷饼", "麦片杯", "燕麦棒", "可颂", "法棍", "披萨饼底",
    ],
  },
  {
    key: "PROTEIN",
    label: "肉蛋奶",
    source: "MIXED_OFFLINE",
    calBase: 88,
    calStep: 12,
    proteinBase: 8.4,
    proteinStep: 1.25,
    carbsBase: 0.6,
    carbsStep: 0.5,
    fatBase: 1.2,
    fatStep: 0.72,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（水煮）", factor: 0.97 },
      { suffix: "（清煎）", factor: 1.05 },
      { suffix: "（烤制）", factor: 1.03 },
      { suffix: "（气炸）", factor: 1.04 },
      { suffix: "（低脂）", factor: 0.92 },
      { suffix: "（高蛋白）", factor: 1.08 },
      { suffix: "（即食）", factor: 1.01 },
      { suffix: "（轻食）", factor: 0.94 },
      { suffix: "（经典）", factor: 1.02 },
      { suffix: "（原味）", factor: 1.0 },
    ],
    items: [
      "鸡胸肉", "鸡腿肉", "鸡翅中", "牛里脊", "牛腱子", "牛腩", "猪里脊", "猪后腿肉", "三文鱼", "鳕鱼",
      "金枪鱼", "虾仁", "带鱼", "巴沙鱼", "鸡蛋", "鸭蛋", "鹌鹑蛋", "低脂牛奶", "高蛋白牛奶", "希腊酸奶",
      "无糖酸奶", "奶酪", "奶酪棒", "无糖豆浆", "高蛋白酸奶", "火鸡胸", "培根", "牛肉饼", "鸡肉肠", "金枪鱼罐头",
      "牛排", "羊里脊", "扇贝", "青口贝", "鳗鱼", "蟹柳", "豆腐", "北豆腐", "南豆腐", "豆腐皮",
    ],
  },
  {
    key: "VEGETABLE_FRUIT",
    label: "蔬果",
    source: "CN_OFFLINE",
    calBase: 18,
    calStep: 4,
    proteinBase: 0.7,
    proteinStep: 0.28,
    carbsBase: 3.2,
    carbsStep: 1.1,
    fatBase: 0.1,
    fatStep: 0.08,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（生食）", factor: 0.95 },
      { suffix: "（水煮）", factor: 0.98 },
      { suffix: "（清炒）", factor: 1.08 },
      { suffix: "（凉拌）", factor: 1.01 },
      { suffix: "（蒸）", factor: 0.97 },
      { suffix: "（沙拉）", factor: 0.96 },
      { suffix: "（低糖）", factor: 0.92 },
      { suffix: "（轻食）", factor: 0.94 },
      { suffix: "（家常）", factor: 1.02 },
      { suffix: "（经典）", factor: 1.0 },
    ],
    items: [
      "西兰花", "菠菜", "生菜", "油麦菜", "娃娃菜", "白菜", "芹菜", "西红柿", "黄瓜", "胡萝卜",
      "白萝卜", "紫甘蓝", "青椒", "彩椒", "茄子", "蘑菇", "香菇", "金针菇", "海带", "秋葵",
      "苹果", "香蕉", "橙子", "梨", "草莓", "蓝莓", "葡萄", "西瓜", "火龙果", "猕猴桃",
      "牛油果", "柚子", "菠萝", "芒果", "樱桃番茄", "羽衣甘蓝", "芦笋", "南瓜条", "玉米笋", "甜菜根",
    ],
  },
  {
    key: "BEAN",
    label: "豆制品",
    source: "CN_OFFLINE",
    calBase: 58,
    calStep: 7,
    proteinBase: 4.5,
    proteinStep: 0.88,
    carbsBase: 5.2,
    carbsStep: 1.4,
    fatBase: 0.8,
    fatStep: 0.36,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（熟）", factor: 1.01 },
      { suffix: "（水煮）", factor: 0.96 },
      { suffix: "（清炒）", factor: 1.08 },
      { suffix: "（低脂）", factor: 0.9 },
      { suffix: "（高蛋白）", factor: 1.07 },
      { suffix: "（无糖）", factor: 0.92 },
      { suffix: "（家常）", factor: 1.03 },
      { suffix: "（轻食）", factor: 0.94 },
      { suffix: "（即食）", factor: 1.0 },
      { suffix: "（经典）", factor: 1.0 },
    ],
    items: [
      "黄豆", "黑豆", "红豆", "绿豆", "芸豆", "鹰嘴豆", "毛豆", "纳豆", "豆浆", "豆乳",
      "豆花", "豆腐脑", "豆腐丝", "豆腐卷", "腐竹", "豆皮", "豆干", "素鸡", "百叶", "内酯豆腐",
      "卤豆干", "黑豆豆浆", "红豆沙", "豆沙馅", "豆奶", "青豆", "豌豆", "扁豆", "白芸豆", "千页豆腐",
      "豆腐泡", "豆筋", "腐乳", "豆渣饼", "豆腐饼", "高蛋白豆乳", "无糖豆奶", "豌豆蛋白饮", "鹰嘴豆泥", "毛豆仁",
    ],
  },
  {
    key: "DRINK",
    label: "饮品",
    source: "MIXED_OFFLINE",
    calBase: 6,
    calStep: 9,
    proteinBase: 0.2,
    proteinStep: 0.22,
    carbsBase: 0.8,
    carbsStep: 1.3,
    fatBase: 0.0,
    fatStep: 0.12,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（无糖）", factor: 0.68 },
      { suffix: "（低糖）", factor: 0.82 },
      { suffix: "（热饮）", factor: 1.0 },
      { suffix: "（冰饮）", factor: 1.0 },
      { suffix: "（轻乳）", factor: 1.08 },
      { suffix: "（高蛋白）", factor: 1.18 },
      { suffix: "（低脂）", factor: 0.9 },
      { suffix: "（即饮）", factor: 1.02 },
      { suffix: "（清爽）", factor: 0.88 },
      { suffix: "（经典）", factor: 1.0 },
    ],
    items: [
      "黑咖啡", "美式咖啡", "拿铁", "低脂拿铁", "燕麦拿铁", "抹茶拿铁", "红茶", "绿茶", "乌龙茶", "柠檬水",
      "苏打水", "椰子水", "番茄汁", "苹果汁", "橙汁", "葡萄汁", "电解质饮料", "无糖可可", "无糖酸梅汤", "燕麦奶",
      "豆奶", "杏仁奶", "高蛋白奶昔", "乳清蛋白饮", "可乐", "无糖可乐", "气泡水", "奶茶", "鲜奶茶", "果昔",
      "香蕉奶昔", "草莓奶昔", "西梅汁", "蔓越莓汁", "康普茶", "气泡果汁", "冷萃咖啡", "冰美式", "卡布奇诺", "摩卡",
    ],
  },
  {
    key: "SNACK",
    label: "零食",
    source: "MIXED_OFFLINE",
    calBase: 118,
    calStep: 11,
    proteinBase: 2.0,
    proteinStep: 0.6,
    carbsBase: 8.2,
    carbsStep: 1.8,
    fatBase: 3.8,
    fatStep: 0.86,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（原味）", factor: 1.0 },
      { suffix: "（低糖）", factor: 0.84 },
      { suffix: "（高蛋白）", factor: 1.1 },
      { suffix: "（烘烤）", factor: 0.96 },
      { suffix: "（轻盐）", factor: 0.98 },
      { suffix: "（轻食）", factor: 0.9 },
      { suffix: "（即食）", factor: 1.01 },
      { suffix: "（无添加）", factor: 0.93 },
      { suffix: "（脆香）", factor: 1.03 },
      { suffix: "（经典）", factor: 1.0 },
    ],
    items: [
      "混合坚果", "杏仁", "核桃", "腰果", "开心果", "花生", "葡萄干", "蔓越莓干", "能量棒", "高蛋白棒",
      "全麦饼干", "苏打饼干", "燕麦饼干", "海苔", "低脂薯片", "玉米片", "爆米花", "黑巧克力", "酸奶块", "奶香面包干",
      "果仁酸奶杯", "蛋白威化", "肉脯", "牛肉干", "鸡胸肉脆片", "果蔬脆", "米饼", "糙米卷", "芝士棒", "水果干",
      "巴旦木仁", "烘焙腰果", "奇亚籽布丁", "代餐饼干", "谷物圈", "曲奇", "蛋卷", "布朗尼", "小麻花", "麦丽素",
    ],
  },
  {
    key: "OTHER",
    label: "其他",
    source: "MIXED_OFFLINE",
    calBase: 68,
    calStep: 10,
    proteinBase: 3.1,
    proteinStep: 0.72,
    carbsBase: 5.2,
    carbsStep: 1.36,
    fatBase: 1.2,
    fatStep: 0.48,
    variants: [
      { suffix: "", factor: 1 },
      { suffix: "（家常）", factor: 1.03 },
      { suffix: "（清淡）", factor: 0.93 },
      { suffix: "（轻食）", factor: 0.9 },
      { suffix: "（低脂）", factor: 0.89 },
      { suffix: "（少油）", factor: 0.91 },
      { suffix: "（高蛋白）", factor: 1.08 },
      { suffix: "（便当）", factor: 1.02 },
      { suffix: "（即食）", factor: 1.01 },
      { suffix: "（经典）", factor: 1.0 },
      { suffix: "（招牌）", factor: 1.05 },
    ],
    items: [
      "番茄炒蛋", "土豆炖牛肉", "宫保鸡丁", "清炒时蔬", "紫菜蛋花汤", "鸡汤", "牛肉汤", "蔬菜沙拉", "凯撒沙拉", "三明治",
      "寿司", "饭团", "牛肉卷", "鸡肉卷", "酸奶水果杯", "豆腐蔬菜汤", "鸡胸蔬菜碗", "藜麦沙拉", "意面沙拉", "全麦鸡蛋卷",
      "鸡肉帕尼尼", "火鸡三明治", "牛肉汉堡", "鸡肉汉堡", "蔬菜卷饼", "牛油果吐司", "鸡蛋三明治", "金枪鱼三明治", "能量碗", "照烧鸡肉饭",
      "咖喱鸡肉饭", "牛肉盖饭", "韩式拌饭", "蔬菜炒饭", "炒乌冬", "鸡肉意面", "海鲜意面", "烤鸡沙拉", "培根意面", "蘑菇汤",
    ],
  },
];

function round(value) {
  return Number(value.toFixed(2));
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function buildImageUrl(name, itemIndex, variantIndex) {
  if (itemIndex >= 12 || variantIndex >= 2) {
    return null;
  }
  return `https://placehold.co/240x240/${IMAGE_BG}/${IMAGE_FG}?text=${encodeURIComponent(name)}`;
}

function buildAliases(baseName, category, variantSuffix) {
  const cleanedName = baseName.replace(/[（）]/g, "");
  const aliases = new Set([
    cleanedName,
    `${cleanedName}${variantSuffix.replace(/[（）]/g, "")}`,
    category.label,
    category.key.toLowerCase(),
  ]);
  return Array.from(aliases).filter(Boolean).join(",");
}

function buildSource(category, baseName) {
  if (category.source !== "MIXED_OFFLINE") {
    return category.source;
  }
  return /[A-Za-z]/.test(baseName) ? "GLOBAL_OFFLINE" : "CN_OFFLINE";
}

function buildRow(category, baseName, itemIndex, variant, variantIndex, rowIndex) {
  const name = `${baseName}${variant.suffix}`;
  const calories = round((category.calBase + ((itemIndex % 10) * category.calStep)) * variant.factor);
  const protein = round((category.proteinBase + ((itemIndex % 8) * category.proteinStep)) * variant.factor);
  const carbs = round((category.carbsBase + ((itemIndex % 9) * category.carbsStep)) * variant.factor);
  const fat = round((category.fatBase + ((itemIndex % 7) * category.fatStep)) * variant.factor);
  const sortOrder = itemIndex < 8 && variantIndex < 3 ? itemIndex + 1 : 9999;
  const source = buildSource(category, baseName);
  const sourceRef = `${category.key}-${String(rowIndex).padStart(5, "0")}`;
  const aliases = buildAliases(baseName, category, variant.suffix);
  const imageUrl = buildImageUrl(baseName, itemIndex, variantIndex);

  const values = [
    `'${escapeSql(name)}'`,
    calories,
    protein,
    carbs,
    fat,
    `'${category.label}'`,
    `'${source}'`,
    `'${sourceRef}'`,
    `'${escapeSql(aliases)}'`,
    imageUrl ? `'${escapeSql(imageUrl)}'` : "NULL",
    1,
    sortOrder,
  ];

  return [
    "INSERT INTO food (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, source, source_ref, aliases, image_url, is_builtin, sort_order, created_at)",
    `SELECT ${values.join(", ")}, NOW()`,
    "FROM DUAL",
    `WHERE NOT EXISTS (SELECT 1 FROM food WHERE is_builtin = 1 AND name = '${escapeSql(name)}');`,
  ].join(" ");
}

function generateSql() {
  const lines = [
    "-- builtin food seed generated by scripts/generate-builtin-food-seed.js",
    "-- source mix: offline curated chinese + global common food catalog",
    "",
  ];

  let rowIndex = 1;
  CATEGORIES.forEach((category) => {
    category.items.forEach((item, itemIndex) => {
      category.variants.forEach((variant, variantIndex) => {
        lines.push(buildRow(category, item, itemIndex, variant, variantIndex, rowIndex));
        rowIndex += 1;
      });
    });
  });

  return `${lines.join("\n")}\n`;
}

fs.writeFileSync(OUTPUT_PATH, generateSql(), "utf8");
console.log(`Generated builtin food seed to ${OUTPUT_PATH}`);

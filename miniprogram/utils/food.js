const { CALORIE_UNIT_LABELS, QUANTITY_UNIT_LABELS } = require("./constants");

const FOOD_CATEGORIES = [
  { key: "ALL", label: "\u5168\u90e8" },
  { key: "STAPLE", label: "\u4e3b\u98df" },
  { key: "PROTEIN", label: "\u8089\u86cb\u5976" },
  { key: "VEGETABLE_FRUIT", label: "\u852c\u679c" },
  { key: "BEAN", label: "\u8c46\u5236\u54c1" },
  { key: "DRINK", label: "\u996e\u54c1" },
  { key: "SNACK", label: "\u96f6\u98df" },
  { key: "OTHER", label: "\u5176\u4ed6" },
];

const CATEGORY_MATCHERS = {
  STAPLE: ["\u4e3b\u98df", "\u7c73", "\u996d", "\u9762", "\u7ca5", "\u7c89", "\u71d5\u9ea6", "\u9762\u5305", "\u9985\u5934", "\u7ea2\u85af", "\u571f\u8c46"],
  PROTEIN: ["\u8089", "\u9e21", "\u725b", "\u732a", "\u9c7c", "\u867e", "\u86cb", "\u5976", "\u9178\u5976", "\u9ad8\u86cb\u767d"],
  VEGETABLE_FRUIT: ["\u852c", "\u83dc", "\u679c", "\u897f\u5170\u82b1", "\u756a\u8304", "\u9ec4\u74dc", "\u82f9\u679c", "\u9999\u8549"],
  BEAN: ["\u8c46", "\u8c46\u8150", "\u8c46\u6d46", "\u8c46\u76ae"],
  DRINK: ["\u996e", "\u5976\u8336", "\u5496\u5561", "\u8336", "\u679c\u6c41", "\u53ef\u4e50", "\u6c7d\u6c34"],
  SNACK: ["\u96f6", "\u997c\u5e72", "\u751c\u70b9", "\u86cb\u7cd5", "\u85af\u7247", "\u5de7\u514b\u529b", "\u575a\u679c"],
};

const CATEGORY_LABEL_MAP = FOOD_CATEGORIES.reduce((result, item) => {
  result[item.key] = item.label;
  return result;
}, {});

function normalizeCalorieUnit(rawUnit) {
  const unit = String(rawUnit || "KCAL").toUpperCase();
  return CALORIE_UNIT_LABELS[unit] ? unit : "KCAL";
}

function normalizeQuantityUnit(rawUnit) {
  const unit = String(rawUnit || "G").toUpperCase();
  return QUANTITY_UNIT_LABELS[unit] ? unit : "G";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeFoodCategoryKey(rawCategory) {
  const categoryText = String(rawCategory || "").trim();
  if (!categoryText) {
    return "OTHER";
  }

  const matchedItem = FOOD_CATEGORIES.find((item) => item.label === categoryText);
  if (matchedItem && matchedItem.key !== "ALL") {
    return matchedItem.key;
  }

  const matchedKey = Object.keys(CATEGORY_MATCHERS).find((key) =>
    CATEGORY_MATCHERS[key].some((keyword) => categoryText.includes(keyword))
  );
  return matchedKey || "OTHER";
}

function getFoodCategoryLabel(rawCategory) {
  return CATEGORY_LABEL_MAP[normalizeFoodCategoryKey(rawCategory)];
}

function decorateFood(food) {
  const hasExplicitBuiltinFlag = (food.isBuiltin !== undefined && food.isBuiltin !== null)
    || (food.builtin !== undefined && food.builtin !== null);
  const isBuiltin = hasExplicitBuiltinFlag
    ? Boolean(food.isBuiltin ?? food.builtin)
    : food.userId === null || food.userId === undefined;
  const calorieUnit = normalizeCalorieUnit(food.calorieUnit);
  const quantityUnit = normalizeQuantityUnit(food.quantityUnit);
  return {
    ...food,
    isBuiltin,
    imageUrl: typeof food.imageUrl === "string" ? food.imageUrl.trim() : "",
    calorieUnit,
    calorieUnitLabel: CALORIE_UNIT_LABELS[calorieUnit],
    quantityUnit,
    quantityUnitLabel: QUANTITY_UNIT_LABELS[quantityUnit],
    displayCaloriesPer100: toNumber(food.displayCaloriesPer100 ?? food.caloriesPer100g),
    category: food.category || getFoodCategoryLabel(food.category),
    categoryKey: normalizeFoodCategoryKey(food.category),
    categoryLabel: getFoodCategoryLabel(food.category),
  };
}

function isBuiltinFood(food) {
  if (!food) {
    return false;
  }
  if (food.isBuiltin !== undefined && food.isBuiltin !== null) {
    return Boolean(food.isBuiltin);
  }
  if (food.builtin !== undefined && food.builtin !== null) {
    return Boolean(food.builtin);
  }
  return food.userId === null || food.userId === undefined;
}

function isCustomFood(food) {
  if (!food) {
    return false;
  }
  return !isBuiltinFood(food) && food.userId !== null && food.userId !== undefined;
}

function filterFoodsByCategory(foods, categoryKey) {
  if (categoryKey === "ALL") {
    return foods;
  }
  return foods.filter((food) => normalizeFoodCategoryKey(food.category) === categoryKey);
}

const FOOD_CREATION_CATEGORIES = FOOD_CATEGORIES.filter((item) => item.key !== "ALL");

module.exports = {
  FOOD_CATEGORIES,
  FOOD_CREATION_CATEGORIES,
  decorateFood,
  filterFoodsByCategory,
  getFoodCategoryLabel,
  isBuiltinFood,
  isCustomFood,
  normalizeCalorieUnit,
  normalizeFoodCategoryKey,
  normalizeQuantityUnit,
};

const {
  CALORIE_UNIT_LABELS,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_OPTIONS,
  QUANTITY_UNIT_LABELS,
} = require("./constants");
const { FOOD_CATEGORIES } = require("./food");

const DEFAULT_QUANTITY = 100;
const DEFAULT_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 240;
const DELETE_ACTION_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = 42;
const SWIPE_ACTIVATE_DISTANCE = 8;

const FILTER_KEYS = {
  RECENT: "RECENT",
  RECENT_SEARCH: "RECENT_SEARCH",
  CUSTOM: "CUSTOM",
  COMBO: "COMBO",
};

const EDITOR_TYPES = {
  FOOD: "FOOD",
  COMBO: "COMBO",
};

const BUILTIN_CATEGORIES = FOOD_CATEGORIES.filter((item) => item.key !== "ALL");

function buildSystemFilters(canUseComboFilter) {
  const filters = [
    { key: FILTER_KEYS.RECENT, label: "最近记录" },
    { key: FILTER_KEYS.RECENT_SEARCH, label: "最近搜索" },
    { key: FILTER_KEYS.CUSTOM, label: "自定义" },
  ];

  if (canUseComboFilter) {
    filters.push({ key: FILTER_KEYS.COMBO, label: "自定义套餐" });
  }

  return filters;
}

function getMealTypeLabel(mealType) {
  return MEAL_TYPE_LABELS[mealType] || "餐次";
}

function getMealTypeIndex(mealType) {
  const index = MEAL_TYPE_OPTIONS.findIndex((item) => item.key === mealType);
  return index >= 0 ? index : 0;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function normalizeCalorieUnit(rawUnit) {
  const normalized = String(rawUnit || "KCAL").toUpperCase();
  return CALORIE_UNIT_LABELS[normalized] ? normalized : "KCAL";
}

function normalizeQuantityUnit(rawUnit) {
  const normalized = String(rawUnit || "G").toUpperCase();
  return QUANTITY_UNIT_LABELS[normalized] ? normalized : "G";
}

function convertCaloriesFromKcal(caloriesPer100Kcal, calorieUnit) {
  if (calorieUnit === "KJ") {
    return toNumber(caloriesPer100Kcal) * 4.184;
  }
  return toNumber(caloriesPer100Kcal);
}

function normalizeFood(food) {
  const calorieUnit = normalizeCalorieUnit(food.calorieUnit);
  const quantityUnit = normalizeQuantityUnit(food.quantityUnit);
  const caloriesPer100g = toNumber(food.caloriesPer100g);
  const displayCaloriesPer100 = food.displayCaloriesPer100 == null
    ? convertCaloriesFromKcal(caloriesPer100g, calorieUnit)
    : toNumber(food.displayCaloriesPer100);
  return {
    ...food,
    caloriesPer100g,
    displayCaloriesPer100: toInteger(displayCaloriesPer100),
    calorieUnit,
    calorieUnitLabel: CALORIE_UNIT_LABELS[calorieUnit] || "kcal",
    proteinPer100g: toInteger(food.proteinPer100g),
    carbsPer100g: toInteger(food.carbsPer100g),
    fatPer100g: toInteger(food.fatPer100g),
    quantityUnit,
    quantityUnitLabel: QUANTITY_UNIT_LABELS[quantityUnit] || "g",
    imageUrl: typeof food.imageUrl === "string" ? food.imageUrl : "",
  };
}

function mergeFoods(currentFoods, nextFoods) {
  const foodMap = new Map();
  currentFoods.forEach((food) => {
    foodMap.set(Number(food.id), food);
  });
  nextFoods.forEach((food) => {
    foodMap.set(Number(food.id), food);
  });
  return Array.from(foodMap.values());
}

function resolveTotalNutrients({ quantityInGram, displayCaloriesPer100, proteinPer100g, carbsPer100g, fatPer100g }) {
  const quantity = Math.max(toNumber(quantityInGram), 0);
  return {
    totalCalories: toInteger((toNumber(displayCaloriesPer100) * quantity) / 100),
    totalProtein: toInteger((toNumber(proteinPer100g) * quantity) / 100),
    totalCarbs: toInteger((toNumber(carbsPer100g) * quantity) / 100),
    totalFat: toInteger((toNumber(fatPer100g) * quantity) / 100),
  };
}

function buildComboSummary(items = []) {
  return items.reduce(
    (result, item) => {
      const quantityInGram = Math.max(toNumber(item.quantityInGram), 0);
      result.totalCalories += toInteger((toNumber(item.caloriesPer100g) * quantityInGram) / 100);
      result.foodCount += 1;
      return result;
    },
    { totalCalories: 0, foodCount: 0 }
  );
}

function decorateCombo(combo) {
  const summary = buildComboSummary(combo.items || []);
  return {
    ...combo,
    totalCalories: summary.totalCalories,
    foodCount: summary.foodCount,
  };
}

function normalizeComboEditorItem(item) {
  const normalized = normalizeFood(item);
  return {
    foodId: normalized.foodId,
    foodName: normalized.foodName || normalized.name || "食物",
    quantityInGram: String(toNumber(normalized.quantityInGram) || DEFAULT_QUANTITY),
    caloriesPer100g: toNumber(normalized.caloriesPer100g),
    displayCaloriesPer100: toInteger(normalized.displayCaloriesPer100),
    calorieUnit: normalized.calorieUnit,
    calorieUnitLabel: normalized.calorieUnitLabel,
    proteinPer100g: toInteger(normalized.proteinPer100g),
    carbsPer100g: toInteger(normalized.carbsPer100g),
    fatPer100g: toInteger(normalized.fatPer100g),
    quantityUnit: normalized.quantityUnit,
    quantityUnitLabel: normalized.quantityUnitLabel,
    category: normalized.category || "",
    imageUrl: normalized.imageUrl || "",
  };
}

function clampSwipeOffset(offsetX, maxWidth = DELETE_ACTION_WIDTH) {
  if (!Number.isFinite(offsetX) || offsetX < 0) {
    return 0;
  }
  if (offsetX > maxWidth) {
    return maxWidth;
  }
  return offsetX;
}

function applyRecentFoodSwipeState(items, swipedFoodId, swipingFoodId, swipeOffsetX, actionWidth = DELETE_ACTION_WIDTH) {
  return (items || []).map((item) => {
    const isSwiping = Number(item.id) === swipingFoodId;
    const isOpened = Number(item.id) === swipedFoodId;
    const offsetX = isSwiping
      ? clampSwipeOffset(swipeOffsetX, actionWidth)
      : (isOpened ? actionWidth : 0);
    return Object.assign({}, item, {
      swipeOffsetX: offsetX,
      swipeContentStyle: `transform: translateX(-${offsetX}px);transition:${isSwiping ? "none" : "transform 180ms ease"};`,
    });
  });
}

function createFoodEditorState(food, quantityInGram, options = {}) {
  const normalizedFood = normalizeFood(food);
  const nextQuantity = String(quantityInGram || DEFAULT_QUANTITY);
  const editorMealType = options.mealType || "BREAKFAST";
  const totals = resolveTotalNutrients({
    quantityInGram: nextQuantity,
    displayCaloriesPer100: normalizedFood.displayCaloriesPer100,
    proteinPer100g: normalizedFood.proteinPer100g,
    carbsPer100g: normalizedFood.carbsPer100g,
    fatPer100g: normalizedFood.fatPer100g,
  });

  return {
    editorVisible: true,
    editorType: EDITOR_TYPES.FOOD,
    editorMode: options.mode || "create",
    editorCanDelete: Boolean(options.canDelete),
    editorRecordId: options.recordId || null,
    editorLoading: false,
    editorMealType,
    editorMealTypeIndex: getMealTypeIndex(editorMealType),
    editorMealTypeLabel: getMealTypeLabel(editorMealType),
    editorRecordDate: options.recordDate || "",
    editorFoodId: normalizedFood.id,
    editorFoodName: normalizedFood.name || "食物",
    editorFoodImageUrl: normalizedFood.imageUrl || "",
    editorCategoryLabel: normalizedFood.categoryLabel || normalizedFood.category || "",
    editorComboId: null,
    editorComboName: "",
    editorComboItems: [],
    editorCaloriesPer100g: toNumber(normalizedFood.caloriesPer100g),
    editorCaloriesPer100Display: toInteger(normalizedFood.displayCaloriesPer100),
    editorCalorieUnit: normalizedFood.calorieUnit || "KCAL",
    editorCalorieUnitLabel: normalizedFood.calorieUnitLabel || "kcal",
    editorProteinPer100g: toInteger(normalizedFood.proteinPer100g),
    editorCarbsPer100g: toInteger(normalizedFood.carbsPer100g),
    editorFatPer100g: toInteger(normalizedFood.fatPer100g),
    editorQuantityInGram: nextQuantity,
    editorQuantityUnit: normalizedFood.quantityUnit || "G",
    editorQuantityUnitLabel: normalizedFood.quantityUnitLabel || "g",
    editorTotalCalories: totals.totalCalories,
    editorTotalProtein: totals.totalProtein,
    editorTotalCarbs: totals.totalCarbs,
    editorTotalFat: totals.totalFat,
  };
}

function createComboEditorState(combo, items, options = {}) {
  const summary = buildComboSummary(items);
  const editorMealType = options.mealType || "BREAKFAST";

  return {
    editorVisible: true,
    editorType: EDITOR_TYPES.COMBO,
    editorMode: "create",
    editorCanDelete: false,
    editorRecordId: null,
    editorLoading: false,
    editorMealType,
    editorMealTypeIndex: getMealTypeIndex(editorMealType),
    editorMealTypeLabel: getMealTypeLabel(editorMealType),
    editorRecordDate: options.recordDate || "",
    editorComboId: combo.id,
    editorComboName: combo.name || "自定义套餐",
    editorComboItems: items,
    editorFoodId: null,
    editorFoodName: "",
    editorFoodImageUrl: "",
    editorCategoryLabel: "",
    editorCaloriesPer100g: 0,
    editorCaloriesPer100Display: 0,
    editorCalorieUnit: "KCAL",
    editorCalorieUnitLabel: "kcal",
    editorProteinPer100g: 0,
    editorCarbsPer100g: 0,
    editorFatPer100g: 0,
    editorQuantityInGram: String(DEFAULT_QUANTITY),
    editorQuantityUnit: "G",
    editorQuantityUnitLabel: "g",
    editorTotalCalories: summary.totalCalories,
    editorTotalProtein: 0,
    editorTotalCarbs: 0,
    editorTotalFat: 0,
  };
}

function createClosedEditorState(options = {}) {
  const editorMealType = options.mealType || "BREAKFAST";

  return {
    editorVisible: false,
    editorType: EDITOR_TYPES.FOOD,
    editorMode: "create",
    editorCanDelete: false,
    editorRecordId: null,
    editorLoading: false,
    editorMealType,
    editorMealTypeIndex: getMealTypeIndex(editorMealType),
    editorMealTypeLabel: getMealTypeLabel(editorMealType),
    editorRecordDate: options.recordDate || "",
    editorFoodId: null,
    editorFoodName: "",
    editorFoodImageUrl: "",
    editorCategoryLabel: "",
    editorComboId: null,
    editorComboName: "",
    editorComboItems: [],
    editorCaloriesPer100g: 0,
    editorCaloriesPer100Display: 0,
    editorCalorieUnit: "KCAL",
    editorCalorieUnitLabel: "kcal",
    editorProteinPer100g: 0,
    editorCarbsPer100g: 0,
    editorFatPer100g: 0,
    editorQuantityInGram: String(DEFAULT_QUANTITY),
    editorQuantityUnit: "G",
    editorQuantityUnitLabel: "g",
    editorTotalCalories: 0,
    editorTotalProtein: 0,
    editorTotalCarbs: 0,
    editorTotalFat: 0,
  };
}

module.exports = {
  BUILTIN_CATEGORIES,
  DEFAULT_PAGE_SIZE,
  DEFAULT_QUANTITY,
  DELETE_ACTION_WIDTH,
  EDITOR_TYPES,
  FILTER_KEYS,
  SEARCH_DEBOUNCE_MS,
  SWIPE_ACTIVATE_DISTANCE,
  SWIPE_OPEN_THRESHOLD,
  applyRecentFoodSwipeState,
  buildComboSummary,
  buildSystemFilters,
  clampSwipeOffset,
  createClosedEditorState,
  createComboEditorState,
  createFoodEditorState,
  decorateCombo,
  getMealTypeIndex,
  getMealTypeLabel,
  mergeFoods,
  normalizeComboEditorItem,
  normalizeFood,
  resolveTotalNutrients,
  toInteger,
  toNumber,
};

const EXERCISE_CATEGORIES = [
  { key: "ALL", label: "全部" },
  { key: "CARDIO", label: "有氧" },
  { key: "STRENGTH", label: "力量" },
  { key: "BALL", label: "球类" },
  { key: "FLEXIBILITY", label: "柔韧" },
  { key: "DAILY", label: "日常" },
  { key: "OTHER", label: "其他" },
];

const CATEGORY_LABEL_MAP = EXERCISE_CATEGORIES.reduce((result, item) => {
  result[item.key] = item.label;
  return result;
}, {});

const INTENSITY_OPTIONS = [
  { value: "LOW", label: "低强度" },
  { value: "MEDIUM", label: "中强度" },
  { value: "HIGH", label: "高强度" },
];

const INTENSITY_LABEL_MAP = INTENSITY_OPTIONS.reduce((result, item) => {
  result[item.value] = item.label;
  return result;
}, {});

function getExerciseCategoryLabel(category) {
  return CATEGORY_LABEL_MAP[category] || CATEGORY_LABEL_MAP.OTHER;
}

function getIntensityLabel(intensity) {
  return INTENSITY_LABEL_MAP[intensity] || "中强度";
}

function decorateExercise(exercise) {
  const hasExplicitBuiltinFlag = (exercise.isBuiltin !== undefined && exercise.isBuiltin !== null)
    || (exercise.builtin !== undefined && exercise.builtin !== null);
  const isBuiltin = hasExplicitBuiltinFlag
    ? Boolean(exercise.isBuiltin ?? exercise.builtin)
    : exercise.userId === null || exercise.userId === undefined;
  return {
    ...exercise,
    isBuiltin,
    categoryLabel: getExerciseCategoryLabel(exercise.category),
  };
}

function isBuiltinExercise(exercise) {
  if (!exercise) {
    return false;
  }
  if (exercise.isBuiltin !== undefined && exercise.isBuiltin !== null) {
    return Boolean(exercise.isBuiltin);
  }
  if (exercise.builtin !== undefined && exercise.builtin !== null) {
    return Boolean(exercise.builtin);
  }
  return exercise.userId === null || exercise.userId === undefined;
}

function isCustomExercise(exercise) {
  if (!exercise) {
    return false;
  }
  return !isBuiltinExercise(exercise) && exercise.userId !== null && exercise.userId !== undefined;
}

function filterExercisesByCategory(exercises, category) {
  if (!category || category === "ALL") {
    return exercises;
  }
  return exercises.filter((exercise) => exercise.category === category);
}

module.exports = {
  EXERCISE_CATEGORIES,
  INTENSITY_OPTIONS,
  decorateExercise,
  filterExercisesByCategory,
  getExerciseCategoryLabel,
  getIntensityLabel,
  isBuiltinExercise,
  isCustomExercise,
};

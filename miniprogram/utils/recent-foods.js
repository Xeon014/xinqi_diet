const MAX_RECENT_FOODS = 12;

function getStorageKey(userId) {
  return `recent_foods_${userId}`;
}

function pickFoodSnapshot(food) {
  return {
    id: food.id,
    name: food.name,
    caloriesPer100g: food.caloriesPer100g,
    displayCaloriesPer100: food.displayCaloriesPer100,
    calorieUnit: food.calorieUnit,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    quantityUnit: food.quantityUnit,
    category: food.category,
    imageUrl: food.imageUrl,
    usedAt: Date.now(),
  };
}

function getRecentFoods(userId) {
  try {
    const result = wx.getStorageSync(getStorageKey(userId));
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

function saveRecentFood(userId, food) {
  const nextList = [
    pickFoodSnapshot(food),
    ...getRecentFoods(userId).filter((item) => item.id !== food.id),
  ].slice(0, MAX_RECENT_FOODS);

  wx.setStorageSync(getStorageKey(userId), nextList);
}

function removeRecentFood(userId, foodId) {
  if (!userId) {
    return;
  }

  const nextList = getRecentFoods(userId).filter((item) => Number(item.id) !== Number(foodId));
  wx.setStorageSync(getStorageKey(userId), nextList);
}

module.exports = {
  getRecentFoods,
  removeRecentFood,
  saveRecentFood,
};

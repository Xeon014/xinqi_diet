const MAX_RECENT_SEARCHES = 10;

function getStorageKey(userId) {
  return `recent_food_searches_${userId}`;
}

function normalizeKeyword(keyword) {
  return String(keyword || "").trim();
}

function getRecentFoodSearches(userId) {
  if (!userId) {
    return [];
  }

  try {
    const result = wx.getStorageSync(getStorageKey(userId));
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

function saveRecentFoodSearch(userId, keyword) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!userId || !normalizedKeyword) {
    return;
  }

  const nextList = [
    normalizedKeyword,
    ...getRecentFoodSearches(userId).filter((item) => item !== normalizedKeyword),
  ].slice(0, MAX_RECENT_SEARCHES);

  wx.setStorageSync(getStorageKey(userId), nextList);
}

function clearRecentFoodSearches(userId) {
  if (!userId) {
    return;
  }

  wx.removeStorageSync(getStorageKey(userId));
}

module.exports = {
  clearRecentFoodSearches,
  getRecentFoodSearches,
  saveRecentFoodSearch,
};

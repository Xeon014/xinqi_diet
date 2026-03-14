const MAX_RECENT_SEARCHES = 10;

function getStorageKey(userId) {
  return `recent_exercise_searches_${userId}`;
}

function getRecentExerciseSearches(userId) {
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

function saveRecentExerciseSearch(userId, keyword) {
  const normalizedKeyword = String(keyword || "").trim();
  if (!userId || !normalizedKeyword) {
    return;
  }

  const nextList = [
    normalizedKeyword,
    ...getRecentExerciseSearches(userId).filter((item) => item !== normalizedKeyword),
  ].slice(0, MAX_RECENT_SEARCHES);

  wx.setStorageSync(getStorageKey(userId), nextList);
}

function clearRecentExerciseSearches(userId) {
  if (!userId) {
    return;
  }

  try {
    wx.removeStorageSync(getStorageKey(userId));
  } catch (error) {
  }
}

module.exports = {
  clearRecentExerciseSearches,
  getRecentExerciseSearches,
  saveRecentExerciseSearch,
};

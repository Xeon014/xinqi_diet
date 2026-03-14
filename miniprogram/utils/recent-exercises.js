const MAX_RECENT_EXERCISES = 12;

function getStorageKey(userId) {
  return `recent_exercises_${userId}`;
}

function pickExerciseSnapshot(exercise) {
  return {
    id: exercise.id,
    name: exercise.name,
    metValue: exercise.metValue,
    category: exercise.category,
    aliases: exercise.aliases,
    usedAt: Date.now(),
  };
}

function getRecentExercises(userId) {
  try {
    const result = wx.getStorageSync(getStorageKey(userId));
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

function saveRecentExercise(userId, exercise) {
  const nextList = [
    pickExerciseSnapshot(exercise),
    ...getRecentExercises(userId).filter((item) => item.id !== exercise.id),
  ].slice(0, MAX_RECENT_EXERCISES);

  wx.setStorageSync(getStorageKey(userId), nextList);
}

module.exports = {
  getRecentExercises,
  saveRecentExercise,
};

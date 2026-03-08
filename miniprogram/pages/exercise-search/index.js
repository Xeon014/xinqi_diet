const { searchExercises } = require("../../services/exercise");
const { EXERCISE_CATEGORIES, decorateExercise, filterExercisesByCategory } = require("../../utils/exercise");
const { pickErrorMessage } = require("../../utils/request");

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function includesKeyword(exercise, keyword) {
  if (!keyword) {
    return true;
  }
  const normalizedKeyword = keyword.toLowerCase();
  return String(exercise.name || "").toLowerCase().includes(normalizedKeyword)
    || String(exercise.aliases || "").toLowerCase().includes(normalizedKeyword);
}

Page({
  data: {
    keyword: "",
    categories: EXERCISE_CATEGORIES,
    selectedCategory: "ALL",
    exercises: [],
    displayedExercises: [],
  },

  onLoad() {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.loadExercises();
  },

  loadExercises() {
    searchExercises()
      .then((result) => {
        const exercises = (result.exercises || []).map((item) => ({
          ...decorateExercise(item),
          metValue: toNumber(item.metValue),
        }));

        this.setData({ exercises }, () => {
          this.refreshDisplayedExercises();
        });
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  handleInput(event) {
    this.setData({ keyword: event.detail.value }, () => {
      this.refreshDisplayedExercises();
    });
  },

  handleCategoryTap(event) {
    this.setData({ selectedCategory: event.currentTarget.dataset.key }, () => {
      this.refreshDisplayedExercises();
    });
  },

  refreshDisplayedExercises() {
    const keyword = this.data.keyword.trim();
    const selectedCategory = this.data.selectedCategory;
    const displayedExercises = filterExercisesByCategory(this.data.exercises, selectedCategory)
      .filter((exercise) => includesKeyword(exercise, keyword));

    this.setData({ displayedExercises });
  },

  handleSelectExercise(event) {
    const index = Number(event.currentTarget.dataset.index);
    const exercise = this.data.displayedExercises[index];
    if (!exercise) {
      return;
    }
    if (this.openerEventChannel) {
      this.openerEventChannel.emit("exerciseSelected", exercise);
    }
    wx.navigateBack();
  },
});
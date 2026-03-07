const { searchFoods } = require("../../services/food");
const { pickErrorMessage } = require("../../utils/request");

Page({
  data: {
    keyword: "",
    foods: [],
    hasSearched: false,
  },

  onLoad() {
    this.loadFoods("");
  },

  handleInput(event) {
    this.setData({
      keyword: event.detail.value,
    });
  },

  handleSearch() {
    this.loadFoods(this.data.keyword);
  },

  loadFoods(keyword) {
    searchFoods(keyword)
      .then((data) => {
        this.setData({
          foods: data.foods || [],
          hasSearched: true,
        });
      })
      .catch((error) => {
        wx.showToast({
          title: pickErrorMessage(error),
          icon: "none",
        });
      });
  },

  handleSelectFood(event) {
    const { index } = event.currentTarget.dataset;
    const food = this.data.foods[index];
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.emit("foodSelected", food);
    wx.navigateBack();
  },
});
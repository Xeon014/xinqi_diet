const { request } = require("../utils/request");

function searchFoods(keyword = "") {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return request({
    url: `/api/foods${query}`,
    showLoading: false,
  });
}

function createFood(payload) {
  return request({
    url: "/api/foods",
    method: "POST",
    data: payload,
    loadingTitle: "\u4fdd\u5b58\u4e2d",
  });
}

module.exports = {
  createFood,
  searchFoods,
};
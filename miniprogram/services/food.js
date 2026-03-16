const { request } = require("../utils/request");

function searchFoods(keyword = "", options = {}) {
  const params = [];
  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  if (options.category) {
    params.push(`category=${encodeURIComponent(options.category)}`);
  }
  if (options.scope) {
    params.push(`scope=${encodeURIComponent(options.scope)}`);
  }
  if (options.page) {
    params.push(`page=${encodeURIComponent(options.page)}`);
  }
  if (options.size) {
    params.push(`size=${encodeURIComponent(options.size)}`);
  }
  const query = params.length ? `?${params.join("&")}` : "";
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

function updateFood(foodId, payload) {
  return request({
    url: `/api/foods/${foodId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

function deleteFood(foodId) {
  return request({
    url: `/api/foods/${foodId}`,
    method: "DELETE",
    loadingTitle: "删除中",
  });
}

module.exports = {
  createFood,
  deleteFood,
  searchFoods,
  updateFood,
};

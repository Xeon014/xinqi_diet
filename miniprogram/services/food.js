const { request } = require("../utils/request");

function searchFoods(keyword = "") {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return request({
    url: `/api/foods${query}`,
    showLoading: false,
  });
}

module.exports = {
  searchFoods,
};
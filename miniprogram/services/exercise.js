const { request } = require("../utils/request");

function searchExercises({ keyword = "", category = "" } = {}) {
  const params = [];
  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  if (category) {
    params.push(`category=${encodeURIComponent(category)}`);
  }

  const query = params.length ? `?${params.join("&")}` : "";
  return request({
    url: `/api/exercises${query}`,
    showLoading: false,
  });
}

module.exports = {
  searchExercises,
};
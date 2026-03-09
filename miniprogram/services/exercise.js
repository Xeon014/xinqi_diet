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

function createExercise(payload) {
  return request({
    url: "/api/exercises",
    method: "POST",
    data: payload,
    loadingTitle: "保存中",
  });
}

module.exports = {
  searchExercises,
  createExercise,
};

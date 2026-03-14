const { request } = require("../utils/request");

function searchExercises({ keyword = "", category = "", scope = "" } = {}) {
  const params = [];
  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  if (category) {
    params.push(`category=${encodeURIComponent(category)}`);
  }
  if (scope) {
    params.push(`scope=${encodeURIComponent(scope)}`);
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

function updateExercise(exerciseId, payload) {
  return request({
    url: `/api/exercises/${exerciseId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

function deleteExercise(exerciseId) {
  return request({
    url: `/api/exercises/${exerciseId}`,
    method: "DELETE",
    loadingTitle: "删除中",
  });
}

module.exports = {
  createExercise,
  deleteExercise,
  searchExercises,
  updateExercise,
};

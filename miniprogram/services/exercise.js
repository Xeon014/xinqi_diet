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

function createExercise(payload, requestOptions = {}) {
  return request({
    url: "/api/exercises",
    method: "POST",
    data: payload,
    loadingTitle: "保存中",
    loadingMode: "none",
    ...requestOptions,
  });
}

function updateExercise(exerciseId, payload, requestOptions = {}) {
  return request({
    url: `/api/exercises/${exerciseId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
    loadingMode: "none",
    ...requestOptions,
  });
}

function deleteExercise(exerciseId, requestOptions = {}) {
  return request({
    url: `/api/exercises/${exerciseId}`,
    method: "DELETE",
    loadingTitle: "删除中",
    loadingMode: "none",
    ...requestOptions,
  });
}

module.exports = {
  createExercise,
  deleteExercise,
  searchExercises,
  updateExercise,
};

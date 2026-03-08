const { request } = require("../utils/request");

function createExerciseRecord(payload) {
  return request({
    url: "/api/exercise-records",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
  });
}

function getExerciseRecords({ date }) {
  return request({
    url: `/api/exercise-records?date=${encodeURIComponent(date)}`,
    showLoading: false,
  });
}

function updateExerciseRecord(recordId, payload) {
  return request({
    url: `/api/exercise-records/${recordId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

function deleteExerciseRecord(recordId) {
  return request({
    url: `/api/exercise-records/${recordId}`,
    method: "DELETE",
    loadingTitle: "保存中",
  });
}

module.exports = {
  createExerciseRecord,
  deleteExerciseRecord,
  getExerciseRecords,
  updateExerciseRecord,
};
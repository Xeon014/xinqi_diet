const { request } = require("../utils/request");

function createExerciseRecord(payload, requestOptions = {}) {
  return request({
    url: "/api/exercise-records",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
    ...requestOptions,
  });
}

function getExerciseRecords({ date }) {
  return request({
    url: `/api/exercise-records?date=${encodeURIComponent(date)}`,
    showLoading: false,
  });
}

function getExerciseRecordDetail(recordId) {
  return request({
    url: `/api/exercise-records/${recordId}`,
    showLoading: false,
  });
}

function getExerciseRecordHistory({
  cursorRecordDate,
  cursorCreatedAt,
  cursorId,
  pageSize,
}) {
  const params = [];
  if (cursorRecordDate) {
    params.push(`cursorRecordDate=${encodeURIComponent(cursorRecordDate)}`);
  }
  if (cursorCreatedAt) {
    params.push(`cursorCreatedAt=${encodeURIComponent(cursorCreatedAt)}`);
  }
  if (cursorId != null) {
    params.push(`cursorId=${encodeURIComponent(cursorId)}`);
  }
  if (pageSize != null) {
    params.push(`pageSize=${encodeURIComponent(pageSize)}`);
  }

  const query = params.length ? `?${params.join("&")}` : "";
  return request({
    url: `/api/exercise-records/history${query}`,
    showLoading: false,
  });
}

function updateExerciseRecord(recordId, payload, requestOptions = {}) {
  return request({
    url: `/api/exercise-records/${recordId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
    ...requestOptions,
  });
}

function deleteExerciseRecord(recordId, requestOptions = {}) {
  return request({
    url: `/api/exercise-records/${recordId}`,
    method: "DELETE",
    loadingTitle: "保存中",
    ...requestOptions,
  });
}

module.exports = {
  createExerciseRecord,
  deleteExerciseRecord,
  getExerciseRecords,
  getExerciseRecordDetail,
  getExerciseRecordHistory,
  updateExerciseRecord,
};

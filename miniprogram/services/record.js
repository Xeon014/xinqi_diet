const { request } = require("../utils/request");

function createRecord(payload, requestOptions = {}) {
  return request({
    url: "/api/records",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
    ...requestOptions,
  });
}

function createRecordBatch(payload, requestOptions = {}) {
  return request({
    url: "/api/records/batch",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
    ...requestOptions,
  });
}

function getRecords({ date, mealType }) {
  const params = [];
  params.push(`date=${encodeURIComponent(date)}`);
  if (mealType) {
    params.push(`mealType=${encodeURIComponent(mealType)}`);
  }

  return request({
    url: `/api/records?${params.join("&")}`,
    showLoading: false,
  });
}

function getRecordDetail(recordId) {
  return request({
    url: `/api/records/${recordId}`,
    showLoading: false,
  });
}

function getRecordHistory({
  mealType,
  cursorRecordDate,
  cursorCreatedAt,
  cursorId,
  pageSize,
}) {
  const params = [];
  if (mealType) {
    params.push(`mealType=${encodeURIComponent(mealType)}`);
  }
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
    url: `/api/records/history${query}`,
    showLoading: false,
  });
}

function updateRecord(recordId, payload, requestOptions = {}) {
  return request({
    url: `/api/records/${recordId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
    ...requestOptions,
  });
}

function deleteRecord(recordId, requestOptions = {}) {
  return request({
    url: `/api/records/${recordId}`,
    method: "DELETE",
    loadingTitle: "保存中",
    ...requestOptions,
  });
}

module.exports = {
  createRecord,
  createRecordBatch,
  getRecords,
  getRecordDetail,
  getRecordHistory,
  updateRecord,
  deleteRecord,
};

const { getCurrentUserId } = require("../utils/auth");
const { request } = require("../utils/request");

function createRecord(payload) {
  return request({
    url: "/api/records",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
  });
}

function createRecordBatch(payload) {
  return request({
    url: "/api/records/batch",
    method: "POST",
    data: payload,
    loadingTitle: "提交中",
  });
}

function getRecords({ date, mealType }) {
  const userId = getCurrentUserId();
  const params = [];
  if (userId) {
    params.push(`userId=${userId}`);
  }
  params.push(`date=${encodeURIComponent(date)}`);
  if (mealType) {
    params.push(`mealType=${encodeURIComponent(mealType)}`);
  }

  return request({
    url: `/api/records?${params.join("&")}`,
    showLoading: false,
  });
}

function updateRecord(recordId, payload) {
  return request({
    url: `/api/records/${recordId}`,
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

function deleteRecord(recordId) {
  return request({
    url: `/api/records/${recordId}`,
    method: "DELETE",
    loadingTitle: "保存中",
  });
}

module.exports = {
  createRecord,
  createRecordBatch,
  getRecords,
  updateRecord,
  deleteRecord,
};

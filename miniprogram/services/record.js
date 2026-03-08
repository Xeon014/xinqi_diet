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

function getRecords(date) {
  const userId = getCurrentUserId();
  const query = userId ? `?userId=${userId}&date=${date}` : `?date=${date}`;
  return request({
    url: `/api/records${query}`,
    showLoading: false,
  });
}

module.exports = {
  createRecord,
  createRecordBatch,
  getRecords,
};

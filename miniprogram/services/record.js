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

function getRecords(userId, date) {
  return request({
    url: `/api/records?userId=${userId}&date=${date}`,
    showLoading: false,
  });
}

module.exports = {
  createRecord,
  createRecordBatch,
  getRecords,
};
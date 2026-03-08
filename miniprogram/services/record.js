const { request } = require("../utils/request");

function createRecord(payload) {
  return request({
    url: "/api/records",
    method: "POST",
    data: payload,
    loadingTitle: "\u63d0\u4ea4\u4e2d",
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
  getRecords,
};
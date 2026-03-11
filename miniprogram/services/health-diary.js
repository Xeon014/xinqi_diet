const { request } = require("../utils/request");

function getDailyHealthDiary(date) {
  return request({
    url: `/api/health-diaries/daily?date=${encodeURIComponent(date)}`,
    showLoading: false,
  });
}

function upsertDailyHealthDiary(payload) {
  return request({
    url: "/api/health-diaries/daily",
    method: "PUT",
    data: payload,
    loadingTitle: "保存中",
  });
}

function deleteDailyHealthDiary(date) {
  return request({
    url: `/api/health-diaries/daily?date=${encodeURIComponent(date)}`,
    method: "DELETE",
    loadingTitle: "删除中",
  });
}

module.exports = {
  getDailyHealthDiary,
  upsertDailyHealthDiary,
  deleteDailyHealthDiary,
};

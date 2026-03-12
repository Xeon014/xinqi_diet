const { request } = require("../utils/request");

function createBodyMetricRecord(payload) {
  return request({
    url: "/api/body-metrics",
    method: "POST",
    data: payload,
    loadingTitle: "保存中",
  });
}

module.exports = {
  createBodyMetricRecord,
};

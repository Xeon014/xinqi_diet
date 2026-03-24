const { request } = require("../utils/request");

function createBodyMetricRecord(payload, requestOptions = {}) {
  return request({
    url: "/api/body-metrics",
    method: "POST",
    data: payload,
    loadingTitle: "保存中...",
    loadingMode: "none",
    ...requestOptions,
  });
}

function getBodyMetricSnapshot() {
  return request({
    url: "/api/body-metrics/snapshot",
    showLoading: false,
  });
}

function getDailyBodyMetricSnapshot(date) {
  return request({
    url: "/api/body-metrics/daily?date=" + encodeURIComponent(date),
    showLoading: false,
  });
}

function getBodyMetricTrend(params) {
  const query = [
    `metricKey=${encodeURIComponent(params.metricKey)}`,
    `rangeType=${encodeURIComponent(params.rangeType)}`,
  ];
  if (params.cursorDate) {
    query.push(`cursorDate=${encodeURIComponent(params.cursorDate)}`);
  }
  if (params.cursorId != null) {
    query.push(`cursorId=${encodeURIComponent(params.cursorId)}`);
  }
  if (params.pageSize != null) {
    query.push(`pageSize=${encodeURIComponent(params.pageSize)}`);
  }
  return request({
    url: `/api/body-metrics/trend?${query.join("&")}`,
    showLoading: false,
  });
}

function getBodyMetricHistory(params) {
  const query = [
    `metricKey=${encodeURIComponent(params.metricKey)}`,
  ];
  if (params.cursorDate) {
    query.push(`cursorDate=${encodeURIComponent(params.cursorDate)}`);
  }
  if (params.cursorId != null) {
    query.push(`cursorId=${encodeURIComponent(params.cursorId)}`);
  }
  if (params.pageSize != null) {
    query.push(`pageSize=${encodeURIComponent(params.pageSize)}`);
  }
  return request({
    url: `/api/body-metrics/history?${query.join("&")}`,
    showLoading: false,
  });
}

function deleteBodyMetricRecord(id, requestOptions = {}) {
  return request({
    url: `/api/body-metrics/${encodeURIComponent(id)}`,
    method: "DELETE",
    loadingTitle: "删除中...",
    loadingMode: "none",
    ...requestOptions,
  });
}

module.exports = {
  createBodyMetricRecord,
  getBodyMetricSnapshot,
  getDailyBodyMetricSnapshot,
  getBodyMetricTrend,
  getBodyMetricHistory,
  deleteBodyMetricRecord,
};

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
  if (params.cursorMeasuredAt) {
    query.push(`cursorMeasuredAt=${encodeURIComponent(params.cursorMeasuredAt)}`);
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
  if (params.cursorMeasuredAt) {
    query.push(`cursorMeasuredAt=${encodeURIComponent(params.cursorMeasuredAt)}`);
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

function previewWeightImport(fileName, fileBase64) {
  return request({
    url: "/api/body-metrics/import/preview",
    method: "POST",
    data: { fileName, fileBase64 },
    loadingTitle: "解析中...",
  });
}

function confirmWeightImport(rows, duplicatePolicy) {
  return request({
    url: "/api/body-metrics/import/confirm",
    method: "POST",
    data: { rows, duplicatePolicy },
    loadingTitle: "导入中...",
  });
}

module.exports = {
  createBodyMetricRecord,
  getBodyMetricSnapshot,
  getDailyBodyMetricSnapshot,
  getBodyMetricTrend,
  getBodyMetricHistory,
  deleteBodyMetricRecord,
  previewWeightImport,
  confirmWeightImport,
};

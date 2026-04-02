const { createBodyMetricRecord, getBodyMetricSnapshot, getBodyMetricTrend } = require("../../services/body-metric");
const { combineDateAndTime, extractTimePart, getCurrentMinute, getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const RANGE_OPTIONS = [
  { key: "MONTH", label: "月" },
  { key: "YEAR", label: "年" },
  { key: "ALL", label: "所有时间" },
];

const METRIC_OPTIONS = [
  { key: "WEIGHT", label: "体重", unit: "kg", saveUnit: "KG", canCreate: true },
  { key: "BMI", label: "BMI", unit: "", saveUnit: "", canCreate: false },
  { key: "CHEST_CIRCUMFERENCE", label: "胸围", unit: "cm", saveUnit: "CM", canCreate: true },
  { key: "WAIST_CIRCUMFERENCE", label: "腰围", unit: "cm", saveUnit: "CM", canCreate: true },
  { key: "HIP_CIRCUMFERENCE", label: "臀围", unit: "cm", saveUnit: "CM", canCreate: true },
  { key: "THIGH_CIRCUMFERENCE", label: "大腿围", unit: "cm", saveUnit: "CM", canCreate: true },
];

const METRIC_MAP = METRIC_OPTIONS.reduce((result, item) => {
  result[item.key] = item;
  return result;
}, {});

const DEFAULT_METRIC_KEY = "WEIGHT";
const DEFAULT_RANGE_KEY = "MONTH";
const ALL_PAGE_SIZE = 240;

const CHART_CONTENT_WIDTH_RPX = 658;
const CHART_HORIZONTAL_PADDING_RPX = 28;
const CHART_TOP_PADDING_RPX = 36;
const CHART_DRAW_HEIGHT_RPX = 248;
const CHART_DATE_ROW_TOP_RPX = 330;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function toOneDecimal(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return number.toFixed(1);
}

function toAxisLabel(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return String(Math.round(number));
}

function resolveBmiEvaluation(value) {
  const bmi = toNumber(value);
  if (!Number.isFinite(bmi) || bmi <= 0) {
    return "待记录";
  }
  if (bmi < 18.5) {
    return "偏瘦";
  }
  if (bmi < 24) {
    return "正常";
  }
  if (bmi < 28) {
    return "超重";
  }
  return "肥胖";
}

function formatDateLabel(dateText, rangeType) {
  const text = String(dateText || "");
  if (!text || text.length < 7) {
    return "--";
  }
  if (rangeType === "YEAR" || rangeType === "ALL") {
    return text.slice(0, 7);
  }
  return text.slice(5);
}

function aggregateTrendPointsByMonth(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const latestByMonth = {};
  const monthOrder = [];
  points.forEach((item) => {
    if (!item || !item.date) {
      return;
    }
    const monthKey = item.date.slice(0, 7);
    if (!latestByMonth[monthKey]) {
      monthOrder.push(monthKey);
    }
    latestByMonth[monthKey] = item;
  });

  return monthOrder.map((monthKey) => latestByMonth[monthKey]);
}

function normalizeSnapshot(items) {
  const map = {};
  METRIC_OPTIONS.forEach((metric) => {
    map[metric.key] = {
      valueLabel: "待记录",
      dateLabel: "--",
      rawValue: null,
      rawDate: "",
      rawMeasuredAt: "",
    };
  });

  (items || []).forEach((item) => {
    const key = item && item.metricKey;
    if (!key || !map[key]) {
      return;
    }
    const hasValue = item.latestValue != null;
    map[key] = {
      valueLabel: hasValue ? toOneDecimal(item.latestValue) : "待记录",
      dateLabel: hasValue ? (item.latestRecordDate || "--") : "--",
      rawValue: hasValue ? Number(item.latestValue) : null,
      rawDate: item.latestRecordDate || "",
      rawMeasuredAt: item.latestMeasuredAt || "",
    };
  });

  return map;
}

function normalizeTrendPoints(points) {
  return (points || [])
    .map((item) => ({
      date: item && item.date ? item.date : "",
      value: item && item.value != null ? Number(item.value) : NaN,
    }))
    .filter((item) => item.date && Number.isFinite(item.value))
    .sort((a, b) => {
      if (a.date === b.date) {
        return 0;
      }
      return a.date > b.date ? 1 : -1;
    });
}

function mergeTrendPoints(basePoints, incomingPoints) {
  const map = {};
  (basePoints || []).forEach((item) => {
    map[item.date] = item;
  });
  (incomingPoints || []).forEach((item) => {
    map[item.date] = item;
  });
  return Object.keys(map)
    .map((date) => map[date])
    .sort((a, b) => {
      if (a.date === b.date) {
        return 0;
      }
      return a.date > b.date ? 1 : -1;
    });
}

function findSelectedTrendPoint(points, preferredSelectedDate) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  if (preferredSelectedDate) {
    const selectedPoint = points.find((item) => item.date === preferredSelectedDate);
    if (selectedPoint) {
      return selectedPoint;
    }
  }

  return points[points.length - 1];
}

function buildChartModel(points, rangeType, preferredSelectedDate) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      chartPoints: [],
      chartSegments: [],
      axisMinLabel: "--",
      axisMidLabel: "--",
      axisMaxLabel: "--",
      selectedPointDate: "",
    };
  }

  const values = points.map((item) => item.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }
  const roundedMin = Math.max(0, Math.floor(minValue));
  const roundedMax = Math.ceil(maxValue);
  const axisRange = Math.max(2, Math.ceil((roundedMax - roundedMin) / 2) * 2);
  const axisMin = roundedMin;
  const axisMax = axisMin + axisRange;
  const axisMid = axisMin + (axisRange / 2);
  const range = axisMax - axisMin;
  const chartDrawWidthRpx = Math.max(CHART_CONTENT_WIDTH_RPX - (CHART_HORIZONTAL_PADDING_RPX * 2), 0);

  const latestPoint = points[points.length - 1];
  const hasPreferredSelection = Boolean(
    preferredSelectedDate && points.some((item) => item.date === preferredSelectedDate)
  );
  const selectedPointDate = hasPreferredSelection ? preferredSelectedDate : latestPoint.date;

  const labelStep = points.length <= 6 ? 1 : Math.ceil(points.length / 6);
  const chartPoints = points.map((item, index) => {
    const x = points.length === 1
      ? CHART_CONTENT_WIDTH_RPX / 2
      : CHART_HORIZONTAL_PADDING_RPX + ((chartDrawWidthRpx * index) / (points.length - 1));
    const ratio = range <= 0 ? 0.5 : (item.value - axisMin) / range;
    const y = CHART_TOP_PADDING_RPX + ((1 - ratio) * CHART_DRAW_HEIGHT_RPX);
    const isSelected = item.date === selectedPointDate;
    const shouldShowDate = (rangeType === "YEAR" || rangeType === "ALL")
      ? (index === 0 || index === points.length - 1)
      : (index === 0 || index === points.length - 1 || index % labelStep === 0);
    return {
      index,
      x,
      y,
      date: item.date,
      dateLabel: formatDateLabel(item.date, rangeType),
      displayValue: toOneDecimal(item.value),
      isSelected,
      showDateLabel: shouldShowDate,
      pointStyle: `left:${x}rpx;top:${y}rpx;`,
      dateStyle: `left:${x}rpx;top:${CHART_DATE_ROW_TOP_RPX}rpx;`,
    };
  });

  const chartSegments = [];
  for (let index = 1; index < chartPoints.length; index += 1) {
    const from = chartPoints[index - 1];
    const to = chartPoints[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt((dx * dx) + (dy * dy));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    chartSegments.push({
      style: `left:${from.x}rpx;top:${from.y}rpx;width:${length}rpx;transform:rotate(${angle}deg);`,
    });
  }

  return {
    chartPoints,
    chartSegments,
    axisMinLabel: toAxisLabel(axisMin),
    axisMidLabel: toAxisLabel(axisMid),
    axisMaxLabel: toAxisLabel(axisMax),
    selectedPointDate,
  };
}

function buildMetricCards(snapshotMap, selectedMetricKey) {
  return METRIC_OPTIONS.map((metric) => {
    const snapshot = snapshotMap[metric.key] || {};
    const hasValue = snapshot.rawValue != null;
    const isCircumference = metric.key.indexOf("_CIRCUMFERENCE") > -1;
    let actionType = "history";
    if (metric.key === "BMI") {
      actionType = "none";
    } else if (!hasValue && metric.canCreate) {
      actionType = "record";
    }

    let metaLabel = metric.key === "BMI"
      ? resolveBmiEvaluation(snapshot.rawValue)
      : (snapshot.dateLabel || "--");
    if (metric.key === "WEIGHT" && hasValue) {
      const timeText = extractTimePart(snapshot.rawMeasuredAt);
      metaLabel = timeText
        ? `${snapshot.dateLabel || "--"} ${timeText}`
        : (snapshot.dateLabel || "--");
    }

    return {
      ...metric,
      valueLabel: snapshot.valueLabel || "待记录",
      dateLabel: snapshot.dateLabel || "--",
      metaLabel,
      hasValue,
      isCircumference,
      active: metric.key === selectedMetricKey,
      actionType,
    };
  });
}

function buildEmptyMetricText(metricKey) {
  const metric = METRIC_MAP[metricKey] || METRIC_MAP[DEFAULT_METRIC_KEY];
  return `${metric.label} 待记录`;
}

function buildCurrentMetricHeader(metricKey, chartPoints, preferredSelectedDate) {
  const metric = METRIC_MAP[metricKey] || METRIC_MAP[DEFAULT_METRIC_KEY];
  const selectedPoint = findSelectedTrendPoint(chartPoints, preferredSelectedDate);
  if (!selectedPoint) {
    return {
      currentLatestText: buildEmptyMetricText(metricKey),
      currentLatestMetaText: "",
    };
  }

  const unit = metric.unit ? ` ${metric.unit}` : "";
  return {
    currentLatestText: `${metric.label} ${selectedPoint.displayValue}${unit}`,
    currentLatestMetaText: selectedPoint.date || "",
  };
}

function buildMetricHistoryUrl(metricKey) {
  const metric = METRIC_MAP[metricKey] || METRIC_MAP[DEFAULT_METRIC_KEY];
  return `/pages/metric-history/index?metricKey=${encodeURIComponent(metric.key)}&metricLabel=${encodeURIComponent(metric.label)}&unit=${encodeURIComponent(metric.unit || "")}`;
}

Page({
  data: {
    rangeOptions: RANGE_OPTIONS,
    metricOptions: METRIC_OPTIONS,
    selectedRange: DEFAULT_RANGE_KEY,
    selectedMetric: DEFAULT_METRIC_KEY,
    currentLatestText: "体重 待记录",
    currentLatestMetaText: "",
    currentMetricCanCreate: true,
    trendLoading: false,
    snapshotLoading: false,
    trendPointsRaw: [],
    chartPoints: [],
    chartSegments: [],
    axisMinLabel: "--",
    axisMidLabel: "--",
    axisMaxLabel: "--",
    selectedPointDate: "",
    hasMore: false,
    nextCursorMeasuredAt: "",
    nextCursorId: null,
    snapshotMap: {},
    metricCards: buildMetricCards({}, DEFAULT_METRIC_KEY),
    metricEditorVisible: false,
    metricEditorLoading: false,
    metricEditorMetricKey: "",
    metricEditorMetricLabel: "",
    metricEditorUnit: "",
    metricEditorValue: "",
    metricEditorDate: getToday(),
    metricEditorTime: getCurrentMinute(),
    metricEditorShowTime: true,
  },

  onShow() {
    this.loadPageData();
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  loadPageData(stopPullDown = false) {
    const headerState = buildCurrentMetricHeader(this.data.selectedMetric, [], "");
    this.setData({
      trendLoading: true,
      snapshotLoading: true,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      trendPointsRaw: [],
      chartPoints: [],
      chartSegments: [],
      axisMinLabel: "--",
      axisMidLabel: "--",
      axisMaxLabel: "--",
      selectedPointDate: "",
      hasMore: false,
      nextCursorMeasuredAt: "",
      nextCursorId: null,
    });

    Promise.all([
      getBodyMetricSnapshot(),
      this.fetchTrend({ append: false }),
    ])
      .then(([snapshot, trend]) => {
        const snapshotMap = normalizeSnapshot(snapshot.items || []);
        this.applySnapshotData(snapshotMap);
        this.applyTrendData(trend, false);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({
          trendLoading: false,
          snapshotLoading: false,
        });
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  fetchTrend({ append }) {
    const requestData = {
      metricKey: this.data.selectedMetric,
      rangeType: this.data.selectedRange,
    };
    if (this.data.selectedRange === "ALL") {
      requestData.pageSize = ALL_PAGE_SIZE;
      return this.fetchAllTrendPages(requestData, append ? {
        cursorMeasuredAt: this.data.nextCursorMeasuredAt,
        cursorId: this.data.nextCursorId,
      } : null);
    }
    return getBodyMetricTrend(requestData);
  },

  fetchAllTrendPages(baseRequestData, cursor) {
    const requestData = {
      ...baseRequestData,
    };
    if (cursor && cursor.cursorMeasuredAt && cursor.cursorId != null) {
      requestData.cursorMeasuredAt = cursor.cursorMeasuredAt;
      requestData.cursorId = cursor.cursorId;
    }

    return getBodyMetricTrend(requestData).then((response) => {
      const points = Array.isArray(response && response.points) ? response.points : [];
      if (!response || !response.hasMore || !response.nextCursorMeasuredAt || response.nextCursorId == null) {
        return {
          ...response,
          points,
          hasMore: false,
          nextCursorMeasuredAt: "",
          nextCursorId: null,
        };
      }

      return this.fetchAllTrendPages(baseRequestData, {
        cursorMeasuredAt: response.nextCursorMeasuredAt,
        cursorId: response.nextCursorId,
      }).then((nextResponse) => ({
        ...nextResponse,
        points: points.concat(Array.isArray(nextResponse && nextResponse.points) ? nextResponse.points : []),
        hasMore: false,
        nextCursorMeasuredAt: "",
        nextCursorId: null,
      }));
    });
  },

  applySnapshotData(snapshotMap) {
    const headerState = buildCurrentMetricHeader(
      this.data.selectedMetric,
      this.data.chartPoints,
      this.data.selectedPointDate
    );
    this.setData({
      snapshotMap,
      metricCards: buildMetricCards(snapshotMap, this.data.selectedMetric),
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      currentMetricCanCreate: Boolean((METRIC_MAP[this.data.selectedMetric] || {}).canCreate),
    });
  },

  applyTrendData(response, append) {
    const incomingPoints = normalizeTrendPoints(response && response.points);
    const mergedPoints = append
      ? mergeTrendPoints(this.data.trendPointsRaw, incomingPoints)
      : incomingPoints;
    const pointsForChart = mergedPoints;
    const chartModel = buildChartModel(pointsForChart, this.data.selectedRange, this.data.selectedPointDate);
    const headerState = buildCurrentMetricHeader(
      this.data.selectedMetric,
      chartModel.chartPoints,
      chartModel.selectedPointDate
    );

    this.setData({
      trendPointsRaw: mergedPoints,
      chartPoints: chartModel.chartPoints,
      chartSegments: chartModel.chartSegments,
      axisMinLabel: chartModel.axisMinLabel,
      axisMidLabel: chartModel.axisMidLabel,
      axisMaxLabel: chartModel.axisMaxLabel,
      selectedPointDate: chartModel.selectedPointDate,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      hasMore: false,
      nextCursorMeasuredAt: "",
      nextCursorId: null,
    });
  },

  refreshMetricHeader() {
    const headerState = buildCurrentMetricHeader(
      this.data.selectedMetric,
      this.data.chartPoints,
      this.data.selectedPointDate
    );
    this.setData({
      metricCards: buildMetricCards(this.data.snapshotMap, this.data.selectedMetric),
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      currentMetricCanCreate: Boolean((METRIC_MAP[this.data.selectedMetric] || {}).canCreate),
    });
  },

  syncSelectedMetricOnly(metricKey) {
    if (!metricKey || metricKey === this.data.selectedMetric) {
      return;
    }
    const headerState = buildCurrentMetricHeader(metricKey, [], "");
    this.setData({
      selectedMetric: metricKey,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      trendPointsRaw: [],
      chartPoints: [],
      chartSegments: [],
      axisMinLabel: "--",
      axisMidLabel: "--",
      axisMaxLabel: "--",
      selectedPointDate: "",
      hasMore: false,
      nextCursorMeasuredAt: "",
      nextCursorId: null,
    }, () => {
      this.refreshMetricHeader();
    });
  },

  handleSelectRange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.selectedRange || this.data.trendLoading) {
      return;
    }
    const headerState = buildCurrentMetricHeader(this.data.selectedMetric, [], "");
    this.setData({
      selectedRange: key,
      trendLoading: true,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      trendPointsRaw: [],
      chartPoints: [],
      chartSegments: [],
      axisMinLabel: "--",
      axisMidLabel: "--",
      axisMaxLabel: "--",
      selectedPointDate: "",
      hasMore: false,
      nextCursorMeasuredAt: "",
      nextCursorId: null,
    });

    this.fetchTrend({ append: false })
      .then((response) => {
        this.applyTrendData(response, false);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ trendLoading: false });
      });
  },

  handleSelectMetric(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.selectedMetric || this.data.trendLoading) {
      return;
    }

    const headerState = buildCurrentMetricHeader(key, [], "");
    this.setData({
      selectedMetric: key,
      trendLoading: true,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
      trendPointsRaw: [],
      chartPoints: [],
      chartSegments: [],
      axisMinLabel: "--",
      axisMidLabel: "--",
      axisMaxLabel: "--",
      selectedPointDate: "",
      hasMore: false,
      nextCursorMeasuredAt: "",
      nextCursorId: null,
    }, () => {
      this.refreshMetricHeader();
      this.fetchTrend({ append: false })
        .then((response) => {
          this.applyTrendData(response, false);
        })
        .catch((error) => {
          wx.showToast({ title: pickErrorMessage(error), icon: "none" });
        })
        .finally(() => {
          this.setData({ trendLoading: false });
        });
    });
  },

  handleMetricAction(event) {
    const { key, action } = event.currentTarget.dataset;
    if (!key || !action) {
      return;
    }

    if (action === "record") {
      this.syncSelectedMetricOnly(key);
      this.openMetricEditor(key);
      return;
    }

    this.syncSelectedMetricOnly(key);
    wx.navigateTo({
      url: buildMetricHistoryUrl(key),
    });
  },

  handleOpenCurrentMetricEditor() {
    this.openMetricEditor(this.data.selectedMetric);
  },

  openMetricEditor(metricKey) {
    const metric = METRIC_MAP[metricKey];
    if (!metric || !metric.canCreate) {
      wx.showToast({ title: "该指标不支持直接记录", icon: "none" });
      return;
    }
    this.setData({
      metricEditorVisible: true,
      metricEditorLoading: false,
      metricEditorMetricKey: metric.key,
      metricEditorMetricLabel: metric.label,
      metricEditorUnit: metric.unit,
      metricEditorValue: "",
      metricEditorDate: getToday(),
      metricEditorTime: getCurrentMinute(),
      metricEditorShowTime: metric.key === "WEIGHT",
    });
  },

  handleCloseMetricEditor() {
    if (this.data.metricEditorLoading) {
      return;
    }
    this.setData({
      metricEditorVisible: false,
      metricEditorValue: "",
    });
  },

  handleMetricEditorInput(event) {
    this.setData({ metricEditorValue: event.detail.value });
  },

  handleMetricEditorDateChange(event) {
    this.setData({
      metricEditorDate: event.detail.value,
    });
  },

  handleMetricEditorTimeChange(event) {
    this.setData({
      metricEditorTime: event.detail.value,
    });
  },

  handleSubmitMetricEditor() {
    if (this.data.metricEditorLoading) {
      return;
    }

    const metricValue = toNumber(this.data.metricEditorValue);
    if (!Number.isFinite(metricValue) || metricValue <= 0) {
      wx.showToast({ title: "请输入正确数值", icon: "none" });
      return;
    }

    const metricKey = this.data.metricEditorMetricKey;
    const metric = METRIC_MAP[metricKey];
    if (!metric || !metric.canCreate) {
      wx.showToast({ title: "该指标不支持直接记录", icon: "none" });
      return;
    }

    this.setData({ metricEditorLoading: true });
    const payload = {
      metricType: metric.key,
      metricValue,
      unit: metric.saveUnit,
      recordDate: this.data.metricEditorDate,
    };
    if (metric.key === "WEIGHT") {
      payload.measuredAt = combineDateAndTime(this.data.metricEditorDate, this.data.metricEditorTime);
    }
    createBodyMetricRecord(payload)
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        this.setData({
          metricEditorVisible: false,
          metricEditorValue: "",
          metricEditorTime: getCurrentMinute(),
        });
        this.loadPageData();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ metricEditorLoading: false });
      });
  },

  handleSelectChartPoint(event) {
    const { date } = event.currentTarget.dataset;
    if (!date || date === this.data.selectedPointDate) {
      return;
    }
    const nextChartPoints = (this.data.chartPoints || []).map((item) => ({
      ...item,
      isSelected: item.date === date,
    }));
    const headerState = buildCurrentMetricHeader(this.data.selectedMetric, nextChartPoints, date);
    this.setData({
      selectedPointDate: date,
      chartPoints: nextChartPoints,
      currentLatestText: headerState.currentLatestText,
      currentLatestMetaText: headerState.currentLatestMetaText,
    });
  },

  noop() {
  },
});

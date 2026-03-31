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
const ALL_PAGE_SIZE = 120;

const MIN_CHART_WIDTH_RPX = 640;
const CHART_POINT_GAP_RPX = 108;
const CHART_HORIZONTAL_PADDING_RPX = 44;
const CHART_TOP_PADDING_RPX = 36;
const CHART_DRAW_HEIGHT_RPX = 248;
const CHART_DATE_ROW_TOP_RPX = 330;
const POINT_WRAP_HALF_HEIGHT_RPX = 54;
const VALUE_LABEL_TOP_OFFSET_RPX = 40;
const VALUE_LABEL_SAFE_GAP_RPX = 8;

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
  if (!text || text.length < 10) {
    return "--";
  }
  if (rangeType === "ALL" || rangeType === "YEAR") {
    return `${text.slice(5, 7)}月`;
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

function buildChartModel(points, rangeType, preferredSelectedDate) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      chartPoints: [],
      chartSegments: [],
      chartWidthRpx: MIN_CHART_WIDTH_RPX,
      axisMinLabel: "--",
      axisMaxLabel: "--",
      latestPointViewId: "",
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
  const padding = Math.max((maxValue - minValue) * 0.15, 0.5);
  const axisMin = Math.max(0, minValue - padding);
  const axisMax = maxValue + padding;
  const range = axisMax - axisMin;
  const chartWidthRpx = Math.max(
    MIN_CHART_WIDTH_RPX,
    CHART_HORIZONTAL_PADDING_RPX * 2 + ((points.length - 1) * CHART_POINT_GAP_RPX)
  );

  const latestPoint = points[points.length - 1];
  const hasPreferredSelection = Boolean(
    preferredSelectedDate && points.some((item) => item.date === preferredSelectedDate)
  );
  const selectedPointDate = hasPreferredSelection ? preferredSelectedDate : latestPoint.date;

  const labelStep = points.length <= 6 ? 1 : Math.ceil(points.length / 6);
  const chartPoints = points.map((item, index) => {
    const x = CHART_HORIZONTAL_PADDING_RPX + (index * CHART_POINT_GAP_RPX);
    const ratio = range <= 0 ? 0.5 : (item.value - axisMin) / range;
    const y = CHART_TOP_PADDING_RPX + ((1 - ratio) * CHART_DRAW_HEIGHT_RPX);
    const isLatest = index === points.length - 1;
    const isSelected = item.date === selectedPointDate;
    const shouldShowDate = index === 0 || isLatest || index % labelStep === 0;
    const valueBelow = y <= (POINT_WRAP_HALF_HEIGHT_RPX + VALUE_LABEL_TOP_OFFSET_RPX + VALUE_LABEL_SAFE_GAP_RPX);
    return {
      index,
      x,
      y,
      date: item.date,
      dateLabel: formatDateLabel(item.date, rangeType),
      displayValue: toOneDecimal(item.value),
      isLatest,
      isSelected,
      valueBelow,
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
    chartWidthRpx,
    axisMinLabel: toOneDecimal(axisMin),
    axisMaxLabel: toOneDecimal(axisMax),
    latestPointViewId: `trend-point-${chartPoints[chartPoints.length - 1].index}`,
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

function buildLatestText(snapshotMap, metricKey) {
  const metric = METRIC_MAP[metricKey] || METRIC_MAP[DEFAULT_METRIC_KEY];
  const snapshot = snapshotMap[metricKey] || {};
  if (snapshot.rawValue != null) {
    const unit = metric.unit ? ` ${metric.unit}` : "";
    return `${metric.label} ${toOneDecimal(snapshot.rawValue)}${unit}`;
  }
  return `${metric.label} 待记录`;
}

function buildRangeText(points, rangeType) {
  if (!Array.isArray(points) || points.length === 0) {
    return "";
  }
  if (rangeType !== "YEAR" && rangeType !== "ALL") {
    return "";
  }
  const startDate = points[0] && points[0].date ? points[0].date : "";
  const endDate = points[points.length - 1] && points[points.length - 1].date ? points[points.length - 1].date : "";
  if (!startDate || !endDate) {
    return "";
  }
  return startDate === endDate ? `范围 ${startDate}` : `范围 ${startDate} - ${endDate}`;
}

function buildLatestMetaText(snapshotMap, metricKey, rangeType, trendPoints) {
  const rangeText = buildRangeText(trendPoints, rangeType);
  return rangeText;
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
    chartWidthRpx: MIN_CHART_WIDTH_RPX,
    axisMinLabel: "--",
    axisMaxLabel: "--",
    latestPointViewId: "",
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
    this.setData({
      trendLoading: true,
      snapshotLoading: true,
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
      if (append) {
        requestData.cursorMeasuredAt = this.data.nextCursorMeasuredAt;
        requestData.cursorId = this.data.nextCursorId;
      }
    }
    return getBodyMetricTrend(requestData);
  },

  applySnapshotData(snapshotMap) {
    this.setData({
      snapshotMap,
      metricCards: buildMetricCards(snapshotMap, this.data.selectedMetric),
      currentLatestText: buildLatestText(snapshotMap, this.data.selectedMetric),
      currentLatestMetaText: buildLatestMetaText(
        snapshotMap,
        this.data.selectedMetric,
        this.data.selectedRange,
        this.data.trendPointsRaw
      ),
      currentMetricCanCreate: Boolean((METRIC_MAP[this.data.selectedMetric] || {}).canCreate),
    });
  },

  applyTrendData(response, append) {
    const incomingPoints = normalizeTrendPoints(response && response.points);
    const mergedPoints = append
      ? mergeTrendPoints(this.data.trendPointsRaw, incomingPoints)
      : incomingPoints;
    const pointsForChart = (this.data.selectedRange === "ALL" || this.data.selectedRange === "YEAR")
      ? aggregateTrendPointsByMonth(mergedPoints)
      : mergedPoints;
    const chartModel = buildChartModel(pointsForChart, this.data.selectedRange, this.data.selectedPointDate);

    this.setData({
      trendPointsRaw: mergedPoints,
      chartPoints: chartModel.chartPoints,
      chartSegments: chartModel.chartSegments,
      chartWidthRpx: chartModel.chartWidthRpx,
      axisMinLabel: chartModel.axisMinLabel,
      axisMaxLabel: chartModel.axisMaxLabel,
      latestPointViewId: chartModel.latestPointViewId,
      selectedPointDate: chartModel.selectedPointDate,
      hasMore: this.data.selectedRange === "ALL" ? Boolean(response && response.hasMore) : false,
      nextCursorMeasuredAt: response && response.nextCursorMeasuredAt ? response.nextCursorMeasuredAt : "",
      nextCursorId: response && response.nextCursorId != null ? response.nextCursorId : null,
      currentLatestMetaText: buildLatestMetaText(
        this.data.snapshotMap,
        this.data.selectedMetric,
        this.data.selectedRange,
        mergedPoints
      ),
    });
  },

  refreshMetricHeader() {
    this.setData({
      metricCards: buildMetricCards(this.data.snapshotMap, this.data.selectedMetric),
      currentLatestText: buildLatestText(this.data.snapshotMap, this.data.selectedMetric),
      currentLatestMetaText: buildLatestMetaText(
        this.data.snapshotMap,
        this.data.selectedMetric,
        this.data.selectedRange,
        this.data.trendPointsRaw
      ),
      currentMetricCanCreate: Boolean((METRIC_MAP[this.data.selectedMetric] || {}).canCreate),
    });
  },

  syncSelectedMetricOnly(metricKey) {
    if (!metricKey || metricKey === this.data.selectedMetric) {
      return;
    }
    this.setData({
      selectedMetric: metricKey,
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
    this.setData({
      selectedRange: key,
      trendLoading: true,
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

    this.setData({
      selectedMetric: key,
      trendLoading: true,
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

  handleLoadMore() {
    if (this.data.selectedRange !== "ALL" || !this.data.hasMore || this.data.trendLoading) {
      return;
    }

    this.setData({ trendLoading: true });
    this.fetchTrend({ append: true })
      .then((response) => {
        this.applyTrendData(response, true);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ trendLoading: false });
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
    this.setData({
      selectedPointDate: date,
      chartPoints: nextChartPoints,
    });
  },

  noop() {
  },
});

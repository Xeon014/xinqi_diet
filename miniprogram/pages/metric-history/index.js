const { createBodyMetricRecord, getBodyMetricHistory } = require("../../services/body-metric");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const ALL_PAGE_SIZE = 120;

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

function formatTime(dateTimeText) {
  const text = String(dateTimeText || "").trim();
  if (!text) {
    return "--";
  }
  const match = text.replace("T", " ").match(/(\d{2}:\d{2})/);
  return match ? match[1] : "--";
}

function normalizeRecords(records, fallbackUnit) {
  return (records || [])
    .map((item) => ({
      id: item && item.id != null ? Number(item.id) : NaN,
      date: item && item.recordDate ? item.recordDate : "",
      time: formatTime(item && item.createdAt),
      value: item && item.metricValue != null ? Number(item.metricValue) : NaN,
      unit: fallbackUnit,
    }))
    .filter((item) => Number.isFinite(item.id) && item.date && Number.isFinite(item.value))
    .map((item) => ({
      ...item,
      valueLabel: toOneDecimal(item.value),
    }));
}

function mergeHistory(existingList, incomingList) {
  const merged = [];
  const seen = new Set();
  [...(existingList || []), ...(incomingList || [])].forEach((item) => {
    if (!item || !Number.isFinite(item.id) || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    merged.push(item);
  });
  return merged;
}

Page({
  data: {
    metricKey: "WEIGHT",
    metricLabel: "体重",
    metricUnit: "kg",
    canCreate: true,
    loading: false,
    hasMore: false,
    nextCursorDate: "",
    nextCursorId: null,
    records: [],
    editorVisible: false,
    editorLoading: false,
    editorValue: "",
    editorDate: getToday(),
  },

  onLoad(options) {
    const metricKey = options && options.metricKey ? options.metricKey : "WEIGHT";
    const metric = METRIC_MAP[metricKey] || METRIC_MAP.WEIGHT;
    const metricLabel = options && options.metricLabel ? decodeURIComponent(options.metricLabel) : metric.label;
    const metricUnit = options && options.unit != null ? decodeURIComponent(options.unit) : metric.unit;

    this.setData({
      metricKey: metric.key,
      metricLabel,
      metricUnit,
      canCreate: metric.canCreate,
    }, () => {
      wx.setNavigationBarTitle({ title: `${this.data.metricLabel}记录` });
      this.loadList(false);
    });
  },

  onPullDownRefresh() {
    this.loadList(true);
  },

  loadList(stopPullDown) {
    this.setData({
      loading: true,
      hasMore: false,
      nextCursorDate: "",
      nextCursorId: null,
    });

    getBodyMetricHistory({
      metricKey: this.data.metricKey,
      pageSize: ALL_PAGE_SIZE,
    })
      .then((response) => {
        const responseUnit = response && response.unit ? String(response.unit) : "";
        const list = normalizeRecords(response && response.records, responseUnit || this.data.metricUnit);
        this.setData({
          records: list,
          hasMore: Boolean(response && response.hasMore),
          nextCursorDate: response && response.nextCursorDate ? response.nextCursorDate : "",
          nextCursorId: response && response.nextCursorId != null ? response.nextCursorId : null,
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ loading: false });
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  handleLoadMore() {
    if (!this.data.hasMore || this.data.loading) {
      return;
    }

    this.setData({ loading: true });
    getBodyMetricHistory({
      metricKey: this.data.metricKey,
      pageSize: ALL_PAGE_SIZE,
      cursorDate: this.data.nextCursorDate,
      cursorId: this.data.nextCursorId,
    })
      .then((response) => {
        const responseUnit = response && response.unit ? String(response.unit) : "";
        const incoming = normalizeRecords(response && response.records, responseUnit || this.data.metricUnit);
        this.setData({
          records: mergeHistory(this.data.records, incoming),
          hasMore: Boolean(response && response.hasMore),
          nextCursorDate: response && response.nextCursorDate ? response.nextCursorDate : "",
          nextCursorId: response && response.nextCursorId != null ? response.nextCursorId : null,
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  handleOpenEditor() {
    if (!this.data.canCreate) {
      wx.showToast({ title: "该指标不支持直接记录", icon: "none" });
      return;
    }
    this.setData({
      editorVisible: true,
      editorLoading: false,
      editorValue: "",
      editorDate: getToday(),
    });
  },

  handleCloseEditor() {
    if (this.data.editorLoading) {
      return;
    }
    this.setData({
      editorVisible: false,
      editorValue: "",
    });
  },

  handleEditorInput(event) {
    this.setData({ editorValue: event.detail.value });
  },

  handleEditorDateChange(event) {
    this.setData({
      editorDate: event.detail.value,
    });
  },

  handleSubmitEditor() {
    if (this.data.editorLoading) {
      return;
    }

    const metric = METRIC_MAP[this.data.metricKey];
    if (!metric || !metric.canCreate) {
      wx.showToast({ title: "该指标不支持直接记录", icon: "none" });
      return;
    }

    const metricValue = toNumber(this.data.editorValue);
    if (!Number.isFinite(metricValue) || metricValue <= 0) {
      wx.showToast({ title: "请输入正确数值", icon: "none" });
      return;
    }

    this.setData({ editorLoading: true });
    createBodyMetricRecord({
      metricType: this.data.metricKey,
      metricValue,
      unit: metric.saveUnit,
      recordDate: this.data.editorDate,
    })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        this.setData({
          editorVisible: false,
          editorValue: "",
        });
        this.loadList(false);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({ editorLoading: false });
      });
  },

  noop() {
  },
});

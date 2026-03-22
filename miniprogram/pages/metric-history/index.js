const { createBodyMetricRecord, deleteBodyMetricRecord, getBodyMetricHistory } = require("../../services/body-metric");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

const ALL_PAGE_SIZE = 120;
const DELETE_ACTION_WIDTH = 84;
const SWIPE_OPEN_THRESHOLD = 42;
const SWIPE_ACTIVATE_DISTANCE = 8;

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
      offsetX: 0,
      contentStyle: "transform: translateX(0);",
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

function clampSwipeOffset(offsetX) {
  if (!Number.isFinite(offsetX) || offsetX < 0) {
    return 0;
  }
  if (offsetX > DELETE_ACTION_WIDTH) {
    return DELETE_ACTION_WIDTH;
  }
  return offsetX;
}

function applySwipeState(records, swipedRecordId, swipingRecordId, swipeOffsetX) {
  return (records || []).map((item) => {
    const isSwiping = item.id === swipingRecordId;
    const isOpened = item.id === swipedRecordId;
    const offsetX = isSwiping
      ? clampSwipeOffset(swipeOffsetX)
      : (isOpened ? DELETE_ACTION_WIDTH : 0);
    return Object.assign({}, item, {
      offsetX,
      contentStyle: `transform: translateX(-${offsetX}px);transition:${isSwiping ? "none" : "transform 180ms ease"};`,
    });
  });
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
    swipedRecordId: null,
    swipingRecordId: null,
    swipeOffsetX: 0,
    deletingRecordId: null,
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
      swipedRecordId: null,
      swipingRecordId: null,
      swipeOffsetX: 0,
    });

    getBodyMetricHistory({
      metricKey: this.data.metricKey,
      pageSize: ALL_PAGE_SIZE,
    })
      .then((response) => {
        const responseUnit = response && response.unit ? String(response.unit) : "";
        const list = normalizeRecords(response && response.records, responseUnit || this.data.metricUnit);
        this.setData({
          records: applySwipeState(list, null, null, 0),
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
        const merged = mergeHistory(this.data.records, incoming).map((item) => Object.assign({}, item, {
          offsetX: 0,
          contentStyle: "transform: translateX(0);",
        }));
        this.setData({
          records: applySwipeState(merged, null, null, 0),
          hasMore: Boolean(response && response.hasMore),
          nextCursorDate: response && response.nextCursorDate ? response.nextCursorDate : "",
          nextCursorId: response && response.nextCursorId != null ? response.nextCursorId : null,
          swipedRecordId: null,
          swipingRecordId: null,
          swipeOffsetX: 0,
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
    this.closeSwipeActions();
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

  handleRecordTouchStart(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch) {
      return;
    }
    const currentOpenedId = this.data.swipedRecordId;
    const nextOpenedId = currentOpenedId === id ? id : null;
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeBaseOffsetX = this.data.swipedRecordId === id ? DELETE_ACTION_WIDTH : 0;
    this.swipeMode = "";
    this.setData({
      swipingRecordId: id,
      swipeOffsetX: this.swipeBaseOffsetX,
      swipedRecordId: nextOpenedId,
      records: applySwipeState(this.data.records, nextOpenedId, id, this.swipeBaseOffsetX),
    });
  },

  handleRecordTouchMove(event) {
    const id = Number(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!Number.isFinite(id) || !touch || this.data.swipingRecordId !== id || !Number.isFinite(this.swipeStartX)) {
      return;
    }
    const deltaX = this.swipeStartX - touch.clientX;
    const deltaY = Math.abs((this.swipeStartY || 0) - touch.clientY);
    if (!this.swipeMode) {
      if (Math.abs(deltaX) < SWIPE_ACTIVATE_DISTANCE && deltaY < SWIPE_ACTIVATE_DISTANCE) {
        return;
      }
      this.swipeMode = Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
    }
    if (this.swipeMode !== "horizontal") {
      return;
    }
    const nextOffsetX = clampSwipeOffset(this.swipeBaseOffsetX + deltaX);
    this.setData({
      swipeOffsetX: nextOffsetX,
      records: applySwipeState(this.data.records, this.data.swipedRecordId, id, nextOffsetX),
    });
  },

  handleRecordTouchEnd(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!Number.isFinite(id) || this.data.swipingRecordId !== id) {
      return;
    }
    if (this.swipeMode !== "horizontal") {
      this.swipeStartX = null;
      this.swipeStartY = null;
      this.swipeBaseOffsetX = 0;
      this.swipeMode = "";
      this.setData({
        swipingRecordId: null,
        swipeOffsetX: 0,
        records: applySwipeState(this.data.records, this.data.swipedRecordId, null, 0),
      });
      return;
    }
    const shouldOpen = this.data.swipeOffsetX >= SWIPE_OPEN_THRESHOLD;
    this.finishSwipe(id, shouldOpen);
  },

  finishSwipe(id, shouldOpen) {
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeBaseOffsetX = 0;
    this.swipeMode = "";
    this.setData({
      swipedRecordId: shouldOpen ? id : null,
      swipingRecordId: null,
      swipeOffsetX: 0,
      records: applySwipeState(this.data.records, shouldOpen ? id : null, null, 0),
    });
  },

  closeSwipeActions() {
    if (this.data.swipedRecordId == null && this.data.swipingRecordId == null) {
      return;
    }
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeBaseOffsetX = 0;
    this.swipeMode = "";
    this.setData({
      swipedRecordId: null,
      swipingRecordId: null,
      swipeOffsetX: 0,
      records: applySwipeState(this.data.records, null, null, 0),
    });
  },

  handleItemTap() {
    if (this.data.swipedRecordId != null) {
      this.closeSwipeActions();
    }
  },

  handleBackgroundTap() {
    this.closeSwipeActions();
  },

  handleDeleteRecord(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (!Number.isFinite(id) || this.data.deletingRecordId != null) {
      return;
    }

    wx.showModal({
      title: "删除记录",
      content: "删除后不可恢复。",
      confirmText: "删除",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.setData({ deletingRecordId: id });
        deleteBodyMetricRecord(id)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.closeSwipeActions();
            this.loadList(false);
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          })
          .finally(() => {
            this.setData({ deletingRecordId: null });
          });
      },
    });
  },

  handleSubmitEditor() {
    this.closeSwipeActions();
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

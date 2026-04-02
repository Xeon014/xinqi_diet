const { getRecordHistory } = require("../../services/record");
const { MEAL_TYPE_LABELS } = require("../../utils/constants");
const { pickErrorMessage } = require("../../utils/request");

const PAGE_SIZE = 30;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildMeta(record) {
  const quantity = Math.round(toNumber(record && record.quantityInGram));
  const mealTypeLabel = MEAL_TYPE_LABELS[record && record.mealType] || "餐次";
  const quantityLabel = quantity > 0 ? `${quantity}${String(record && record.quantityUnit || "g").toLowerCase()}` : "";

  if (quantityLabel) {
    return `${quantityLabel} · ${mealTypeLabel}`;
  }
  return mealTypeLabel;
}

function groupRecords(records) {
  const groups = [];
  (records || []).forEach((record) => {
    const groupDate = record && record.recordDate ? record.recordDate : "";
    if (!groupDate) {
      return;
    }

    const prevGroup = groups[groups.length - 1];
    if (!prevGroup || prevGroup.date !== groupDate) {
      groups.push({
        date: groupDate,
        items: [],
      });
    }

    groups[groups.length - 1].items.push({
      ...record,
      metaText: buildMeta(record),
    });
  });
  return groups;
}

Page({
  data: {
    targetDate: "",
    targetMealType: "",
    targetMealTypeLabel: "",
    records: [],
    groups: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    nextCursorRecordDate: "",
    nextCursorCreatedAt: "",
    nextCursorId: null,
  },

  onLoad(options = {}) {
    this.openerEventChannel = this.getOpenerEventChannel();
    this.setData({
      targetDate: options.targetDate || "",
      targetMealType: options.targetMealType || "",
      targetMealTypeLabel: MEAL_TYPE_LABELS[options.targetMealType] || "餐次",
    }, () => {
      this.loadList({ reset: true });
    });
  },

  onPullDownRefresh() {
    this.loadList({ reset: true, stopPullDown: true });
  },

  loadList({ reset, stopPullDown } = {}) {
    if (this.data.loading || this.data.loadingMore) {
      return;
    }

    const requestPayload = {
      mealType: this.data.targetMealType,
      pageSize: PAGE_SIZE,
    };
    if (!reset) {
      requestPayload.cursorRecordDate = this.data.nextCursorRecordDate;
      requestPayload.cursorCreatedAt = this.data.nextCursorCreatedAt;
      requestPayload.cursorId = this.data.nextCursorId;
    }

    this.setData(reset ? {
      loading: true,
      loadingMore: false,
    } : {
      loadingMore: true,
    });

    getRecordHistory(requestPayload)
      .then((result) => {
        const incoming = Array.isArray(result && result.records) ? result.records : [];
        const records = reset ? incoming : [...this.data.records, ...incoming];
        this.setData({
          records,
          groups: groupRecords(records),
          hasMore: Boolean(result && result.hasMore),
          nextCursorRecordDate: result && result.nextCursorRecordDate ? result.nextCursorRecordDate : "",
          nextCursorCreatedAt: result && result.nextCursorCreatedAt ? result.nextCursorCreatedAt : "",
          nextCursorId: result && result.nextCursorId != null ? result.nextCursorId : null,
        });
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      })
      .finally(() => {
        this.setData({
          loading: false,
          loadingMore: false,
        });
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  handleSelectRecord(event) {
    const groupIndex = Number(event.currentTarget.dataset.groupIndex);
    const itemIndex = Number(event.currentTarget.dataset.itemIndex);
    const group = this.data.groups[groupIndex];
    const record = group && group.items ? group.items[itemIndex] : null;
    if (!record) {
      return;
    }

    if (this.openerEventChannel) {
      this.openerEventChannel.emit("foodHistorySelected", record);
    }
    wx.navigateBack();
  },

  handleLoadMore() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) {
      return;
    }
    this.loadList({ reset: false });
  },
});

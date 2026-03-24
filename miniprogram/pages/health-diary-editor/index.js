const { getCurrentUserId } = require("../../utils/auth");
const { getToday } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");
const {
  getDailyHealthDiary,
  upsertDailyHealthDiary,
  deleteDailyHealthDiary,
} = require("../../services/health-diary");

const MAX_IMAGE_COUNT = 9;
const MAX_CONTENT_LENGTH = 500;

function normalizeDiary(diary) {
  if (!diary) {
    return {
      id: null,
      content: "",
      imageFileIds: [],
      exists: false,
    };
  }
  const imageFileIds = Array.isArray(diary.imageFileIds)
    ? diary.imageFileIds.filter((item) => typeof item === "string" && item.trim()).slice(0, MAX_IMAGE_COUNT)
    : [];
  return {
    id: diary.id || null,
    content: diary.content || "",
    imageFileIds,
    exists: true,
  };
}

function resolveFileExt(filePath) {
  if (typeof filePath !== "string") {
    return ".jpg";
  }
  const match = filePath.match(/\.[a-zA-Z0-9]+$/);
  if (!match) {
    return ".jpg";
  }
  const ext = match[0].toLowerCase();
  if (ext.length > 8) {
    return ".jpg";
  }
  return ext;
}

function buildCloudPath(recordDate, filePath, index) {
  const userId = getCurrentUserId() || "unknown";
  const ext = resolveFileExt(filePath);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `health-diary/${userId}/${recordDate}/${timestamp}-${index}-${random}${ext}`;
}

function syncNavigationTitle(diaryExists) {
  wx.setNavigationBarTitle({
    title: diaryExists ? "编辑日记" : "写日记",
  });
}

Page({
  data: {
    recordDate: getToday(),
    content: "",
    contentLength: 0,
    imageFileIds: [],
    diaryExists: false,
  },

  onLoad(options) {
    const recordDate = options.recordDate || getToday();
    syncNavigationTitle(false);
    this.setData({ recordDate }, () => {
      this.loadDiary();
    });
  },

  loadDiary() {
    getDailyHealthDiary(this.data.recordDate)
      .then((diary) => {
        const normalized = normalizeDiary(diary);
        this.setData({
          content: normalized.content,
          contentLength: normalized.content.length,
          imageFileIds: normalized.imageFileIds,
          diaryExists: normalized.exists,
        });
        syncNavigationTitle(normalized.exists);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleContentInput(event) {
    const value = String(event.detail.value || "");
    this.setData({
      content: value,
      contentLength: value.length,
    });
  },

  handleChooseImage() {
    const remainCount = MAX_IMAGE_COUNT - this.data.imageFileIds.length;
    if (remainCount <= 0) {
      wx.showToast({ title: "最多上传 9 张", icon: "none" });
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const tempFilePaths = Array.isArray(result.tempFilePaths) ? result.tempFilePaths : [];
        if (!tempFilePaths.length) {
          return;
        }
        wx.showLoading({
          title: "上传中",
          mask: false,
        });
        Promise.all(tempFilePaths.map((filePath, index) => this.uploadImage(filePath, index)))
          .then((fileIds) => {
            this.setData({
              imageFileIds: [...this.data.imageFileIds, ...fileIds],
            });
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: "none" });
          })
          .finally(() => {
            wx.hideLoading();
          });
      },
    });
  },

  uploadImage(filePath, index) {
    if (!wx.cloud || typeof wx.cloud.uploadFile !== "function") {
      return Promise.reject(new Error("当前基础库不支持云存储上传"));
    }
    return wx.cloud.uploadFile({
      cloudPath: buildCloudPath(this.data.recordDate, filePath, index),
      filePath,
    }).then((result) => {
      if (!result || !result.fileID) {
        throw new Error("上传失败，请重试");
      }
      return result.fileID;
    });
  },

  handlePreviewImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const urls = this.data.imageFileIds;
    if (!Number.isInteger(index) || index < 0 || index >= urls.length) {
      return;
    }
    wx.previewImage({
      current: urls[index],
      urls,
    });
  },

  handleRemoveImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.imageFileIds.length) {
      return;
    }
    const nextImages = [...this.data.imageFileIds];
    nextImages.splice(index, 1);
    this.setData({ imageFileIds: nextImages });
  },

  handleSave() {
    const content = String(this.data.content || "").trim();
    const imageFileIds = this.data.imageFileIds;
    if (!content && imageFileIds.length === 0) {
      wx.showToast({ title: "请填写文字或上传图片", icon: "none" });
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      wx.showToast({ title: "文字最多 500 字", icon: "none" });
      return;
    }

    upsertDailyHealthDiary({
      recordDate: this.data.recordDate,
      content,
      imageFileIds,
    })
      .then((result) => this.cleanFiles(result && result.removedImageFileIds).then(() => result))
      .then(() => {
        const app = getApp();
        app.globalData.refreshHomeOnShow = true;
        wx.showToast({ title: "保存成功", icon: "success" });
        setTimeout(() => {
          wx.navigateBack();
        }, 360);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  handleDelete() {
    if (!this.data.diaryExists) {
      wx.showToast({ title: "当天暂无日记", icon: "none" });
      return;
    }

    wx.showModal({
      title: "删除日记",
      content: "确认删除当天日记吗？",
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.confirmDelete();
      },
    });
  },

  confirmDelete() {
    deleteDailyHealthDiary(this.data.recordDate)
      .then((result) => this.cleanFiles(result && result.removedImageFileIds).then(() => result))
      .then((result) => {
        if (!result || !result.deleted) {
          wx.showToast({ title: "当天暂无日记", icon: "none" });
          return;
        }
        const app = getApp();
        app.globalData.refreshHomeOnShow = true;
        wx.showToast({ title: "删除成功", icon: "success" });
        setTimeout(() => {
          wx.navigateBack();
        }, 360);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },

  cleanFiles(fileIds) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return Promise.resolve();
    }
    if (!wx.cloud || typeof wx.cloud.deleteFile !== "function") {
      return Promise.resolve();
    }
    return wx.cloud.deleteFile({
      fileList: fileIds,
    }).catch(() => {
      wx.showToast({ title: "旧图清理失败", icon: "none" });
    });
  },
});

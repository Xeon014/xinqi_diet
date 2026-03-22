Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    title: {
      type: String,
      value: "记录体重",
    },
    date: {
      type: String,
      value: "",
    },
    dateEditable: {
      type: Boolean,
      value: true,
    },
    dateLabel: {
      type: String,
      value: "日期：",
    },
    value: {
      type: String,
      value: "",
    },
    placeholder: {
      type: String,
      value: "请输入数值",
    },
    unit: {
      type: String,
      value: "",
    },
    submitText: {
      type: String,
      value: "保存",
    },
    loadingText: {
      type: String,
      value: "保存中...",
    },
  },

  data: {
    keyboardHeight: 0,
  },

  observers: {
    visible(visible) {
      if (!visible && this.data.keyboardHeight !== 0) {
        this.setData({ keyboardHeight: 0 });
      }
    },
  },

  lifetimes: {
    attached() {
      if (typeof wx.onKeyboardHeightChange === "function") {
        this.keyboardHeightChangeHandler = ({ height = 0 } = {}) => {
          if (!this.properties.visible) {
            return;
          }
          this.setData({ keyboardHeight: Math.max(0, height) });
        };
        wx.onKeyboardHeightChange(this.keyboardHeightChangeHandler);
      }
    },

    detached() {
      if (this.keyboardHeightChangeHandler && typeof wx.offKeyboardHeightChange === "function") {
        wx.offKeyboardHeightChange(this.keyboardHeightChangeHandler);
      }
    },
  },

  methods: {
    handleClose() {
      this.triggerEvent("close");
    },

    handleInput(event) {
      this.triggerEvent("input", event.detail);
    },

    handleDateChange(event) {
      this.triggerEvent("datechange", event.detail);
    },

    handleSubmit() {
      this.triggerEvent("submit");
    },

    handleInputBlur() {
      if (this.data.keyboardHeight !== 0) {
        this.setData({ keyboardHeight: 0 });
      }
    },

    noop() {
    },
  },
});

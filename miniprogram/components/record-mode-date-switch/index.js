Component({
  options: {
    styleIsolation: "shared",
  },

  properties: {
    activeMode: {
      type: String,
      value: "DIET",
    },
    recordDate: {
      type: String,
      value: "",
    },
    dietLabel: {
      type: String,
      value: "饮食",
    },
    exerciseLabel: {
      type: String,
      value: "运动",
    },
  },

  methods: {
    handleModeTap(event) {
      const { mode } = event.currentTarget.dataset;
      if (!mode || mode === this.data.activeMode) {
        return;
      }
      this.triggerEvent("modechange", { mode });
    },

    handleDateChange(event) {
      const recordDate = event.detail.value;
      this.triggerEvent("datechange", { recordDate });
    },
  },
});

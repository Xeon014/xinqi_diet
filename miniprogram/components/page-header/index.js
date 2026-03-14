Component({
  properties: {
    scene: {
      type: String,
      value: "default",
    },
    title: {
      type: String,
      value: "",
    },
    subtitle: {
      type: String,
      value: "",
    },
    showBack: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
  },

  lifetimes: {
    attached() {
      this.resolveNavigationMetrics();
    },
  },

  methods: {
    resolveNavigationMetrics() {
      const systemInfo = typeof wx.getWindowInfo === "function"
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      let navBarHeight = 44;

      if (typeof wx.getMenuButtonBoundingClientRect === "function") {
        const menuRect = wx.getMenuButtonBoundingClientRect();
        if (menuRect && menuRect.height) {
          navBarHeight = menuRect.height + ((menuRect.top - statusBarHeight) * 2);
        }
      }

      this.setData({
        statusBarHeight,
        navBarHeight,
      });
    },

    handleBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
        return;
      }
      wx.switchTab({
        url: "/pages/home/index",
      });
    },
  },
});

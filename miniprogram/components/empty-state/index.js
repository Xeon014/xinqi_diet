const { APP_COPY } = require("../../utils/constants");

Component({
  properties: {
    showIcon: {
      type: Boolean,
      value: true,
    },
    title: {
      type: String,
      value: APP_COPY.emptyState.defaultTitle,
    },
    description: {
      type: String,
      value: APP_COPY.emptyState.defaultDescription,
    },
  },
});

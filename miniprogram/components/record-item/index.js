Component({
  properties: {
    record: {
      type: Object,
      value: {}
    }
  },
  data: {
    displayCalories: 0
  },
  observers: {
    record: function (record) {
      this.setData({
        displayCalories: Math.round(Number((record && record.totalCalories) || 0))
      });
    }
  }
});
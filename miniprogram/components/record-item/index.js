Component({
  properties: {
    record: {
      type: Object,
      value: {}
    }
  },
  data: {
    displayCalories: 0,
    displayQuantity: 0,
    quantityUnitLabel: "g",
  },
  observers: {
    record: function (record) {
      const quantityUnit = String((record && record.quantityUnit) || "G").toUpperCase();
      this.setData({
        displayCalories: Math.round(Number((record && record.totalCalories) || 0)),
        displayQuantity: Math.round(Number((record && record.quantityInGram) || 0)),
        quantityUnitLabel: quantityUnit === "ML" ? "ml" : "g",
      });
    }
  }
});

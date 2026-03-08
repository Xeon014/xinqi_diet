Component({
  properties: {
    title: { type: String, value: "" },
    subtitle: { type: String, value: "" },
    targetCalories: { type: Number, value: 0 },
    consumedCalories: { type: Number, value: 0 },
    remainingCalories: { type: Number, value: 0 },
    exceededTarget: { type: Boolean, value: false }
  },
  data: {
    displayTargetCalories: 0,
    displayConsumedCalories: 0,
    displayRemainingCalories: 0
  },
  observers: {
    "targetCalories, consumedCalories, remainingCalories": function (targetCalories, consumedCalories, remainingCalories) {
      this.setData({
        displayTargetCalories: Math.round(Number(targetCalories || 0)),
        displayConsumedCalories: Math.round(Number(consumedCalories || 0)),
        displayRemainingCalories: Math.round(Number(remainingCalories || 0))
      });
    }
  }
});
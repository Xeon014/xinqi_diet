Component({
  properties: {
    title: {
      type: String,
      value: "",
    },
    subtitle: {
      type: String,
      value: "",
    },
    targetCalories: {
      type: Number,
      value: 0,
    },
    consumedCalories: {
      type: Number,
      value: 0,
    },
    remainingCalories: {
      type: Number,
      value: 0,
    },
    exceededTarget: {
      type: Boolean,
      value: false,
    },
  },
});
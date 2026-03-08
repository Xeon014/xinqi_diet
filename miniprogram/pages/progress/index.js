const { getProgress } = require("../../services/user");
const { getRangeDays } = require("../../utils/date");
const { pickErrorMessage } = require("../../utils/request");

function toInteger(value) {
  return Math.round(Number(value || 0));
}

Page({
  data: {
    rangeDays: 7,
    summary: null
  },
  onLoad() {
    this.loadProgress(7);
  },
  handleSwitchRange(event) {
    const { days } = event.currentTarget.dataset;
    if (Number(days) === this.data.rangeDays) {
      return;
    }
    this.loadProgress(Number(days));
  },
  loadProgress(days) {
    const range = getRangeDays(days);
    getProgress(range)
      .then((summary) => {
        const normalizedTrend = (summary.trend || []).map((item) => ({
          ...item,
          consumedCalories: toInteger(item.consumedCalories),
          calorieGap: toInteger(item.calorieGap)
        }));

        this.setData({
          rangeDays: days,
          summary: {
            ...summary,
            averageCalories: toInteger(summary.averageCalories),
            totalCalories: toInteger(summary.totalCalories),
            averageCalorieGap: toInteger(summary.averageCalorieGap),
            trend: normalizedTrend
          }
        });
        this.drawChart(normalizedTrend);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: "none" });
      });
  },
  drawChart(trend) {
    const ctx = wx.createCanvasContext("trendCanvas", this);
    const width = 690;
    const height = 360;
    const padding = 40;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const values = trend.map((item) => Number(item.consumedCalories || 0));
    const maxValue = Math.max(...values, 1);

    ctx.clearRect(0, 0, width, height);
    ctx.setFillStyle("#fffdf8");
    ctx.fillRect(0, 0, width, height);

    ctx.setStrokeStyle("rgba(93, 76, 58, 0.12)");
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.setFillStyle("#8f8373");
    ctx.setFontSize(20);
    ctx.fillText(`${toInteger(maxValue)} kcal`, padding, padding - 12);

    if (!trend.length) {
      ctx.draw();
      return;
    }

    ctx.setStrokeStyle("#1f6f5f");
    ctx.setLineWidth(4);
    ctx.beginPath();

    trend.forEach((item, index) => {
      const x = padding + (chartWidth * index) / Math.max(trend.length - 1, 1);
      const y = height - padding - (chartHeight * Number(item.consumedCalories || 0)) / maxValue;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    trend.forEach((item, index) => {
      const x = padding + (chartWidth * index) / Math.max(trend.length - 1, 1);
      const y = height - padding - (chartHeight * Number(item.consumedCalories || 0)) / maxValue;
      ctx.setFillStyle("#1f6f5f");
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      if (index === 0 || index === trend.length - 1 || index === Math.floor(trend.length / 2)) {
        ctx.setFillStyle("#8f8373");
        ctx.setFontSize(18);
        ctx.fillText(item.date.slice(5), x - 20, height - padding + 24);
      }
    });

    ctx.draw();
  }
});
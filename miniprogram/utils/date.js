function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
}

function getToday() {
  return formatDate(new Date());
}

function getCurrentMinute() {
  const now = new Date();
  now.setSeconds(0, 0);
  return formatTime(now);
}

function addDays(dateText, offset) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
}

function combineDateAndTime(dateText, timeText) {
  const resolvedDate = String(dateText || "").trim();
  const resolvedTime = /^\d{2}:\d{2}$/.test(String(timeText || "").trim())
    ? String(timeText).trim()
    : "00:00";
  if (!resolvedDate) {
    return "";
  }
  return `${resolvedDate}T${resolvedTime}:00`;
}

function extractDatePart(dateTimeText) {
  const text = String(dateTimeText || "").trim().replace(" ", "T");
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function extractTimePart(dateTimeText) {
  const text = String(dateTimeText || "").trim().replace(" ", "T");
  const match = text.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function formatDateTimeToMinute(dateTimeText) {
  const datePart = extractDatePart(dateTimeText);
  const timePart = extractTimePart(dateTimeText);
  if (datePart && timePart) {
    return `${datePart} ${timePart}`;
  }
  return String(dateTimeText || "").trim();
}

function getRangeDays(days) {
  const endDate = getToday();
  const startDate = addDays(endDate, -(days - 1));
  return {
    startDate,
    endDate,
  };
}

module.exports = {
  addDays,
  combineDateAndTime,
  extractDatePart,
  extractTimePart,
  formatDate,
  formatDateTimeToMinute,
  getCurrentMinute,
  getRangeDays,
  getToday,
};

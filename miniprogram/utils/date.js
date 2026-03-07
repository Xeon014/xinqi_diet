function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDate(new Date());
}

function addDays(dateText, offset) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
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
  formatDate,
  getRangeDays,
  getToday,
};
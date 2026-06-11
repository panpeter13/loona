function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDate(input) {
  const text = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function isValidDate(dateString) {
  const date = new Date(dateString);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateString
  );
}

function getCycleDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

module.exports = {
  getToday,
  addDays,
  parseDate,
  isValidDate,
  getCycleDays,
};

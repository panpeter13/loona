const DAY_MS = 86400000;

function parseDateOnly(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getToday(timeZone = process.env.APP_TIMEZONE || "Asia/Seoul") {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return getToday("Asia/Seoul");
  }
}

function addDays(dateString, days) {
  return new Date(parseDateOnly(dateString) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
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
  return Math.floor((parseDateOnly(endDate) - parseDateOnly(startDate)) / DAY_MS) + 1;
}

function isFutureDate(dateString, timeZone) {
  return dateString > getToday(timeZone);
}

module.exports = {
  isFutureDate,
  getToday,
  addDays,
  parseDate,
  isValidDate,
  getCycleDays,
};

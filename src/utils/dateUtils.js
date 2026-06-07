// src/utils/dateUtils.js

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
  if (!match) return null;

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

/**
 * Вычисляет прогноз на основе последней записи,
 * сдвигая дату вперед, если прошлый прогноз уже в прошлом.
 */
function calculatePredictions(lastPeriodStart, cycleLength, periodLength) {
  const today = getToday();
  let nextPeriodStart = addDays(lastPeriodStart, cycleLength);

  // Исправление бага: сдвигаем прогноз в будущее, если дата уже прошла
  while (nextPeriodStart < today) {
    nextPeriodStart = addDays(nextPeriodStart, cycleLength);
  }

  const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  return {
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertileStart,
    fertileEnd,
  };
}

module.exports = {
  getToday,
  addDays,
  parseDate,
  isValidDate,
  getCycleDays,
  calculatePredictions,
};

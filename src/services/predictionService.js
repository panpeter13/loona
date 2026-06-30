const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

const MIN_CYCLE_LENGTH = 21;
const MAX_CYCLE_LENGTH = 45;

function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function calculateCycleLengths(cycles) {
  const sortedCycles = [...cycles]
    .filter((cycle) => cycle.period_start)
    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start));

  const lengths = [];

  for (let i = 0; i < sortedCycles.length - 1; i++) {
    const currentStart = sortedCycles[i].period_start;
    const nextStart = sortedCycles[i + 1].period_start;

    const length = daysBetween(currentStart, nextStart);
    lengths.push(length);
  }

  return lengths;
}

function filterOutliers(lengths) {
  return lengths.filter(
    (length) => length >= MIN_CYCLE_LENGTH && length <= MAX_CYCLE_LENGTH,
  );
}

function calculateAverage(numbers, fallback) {
  if (!numbers.length) return fallback;

  const sum = numbers.reduce((acc, number) => acc + number, 0);
  return Math.round(sum / numbers.length);
}

function calculateAveragePeriodLength(
  cycles,
  fallback = DEFAULT_PERIOD_LENGTH,
) {
  const periodLengths = cycles
    .filter((cycle) => cycle.period_start && cycle.period_end)
    .map((cycle) => daysBetween(cycle.period_start, cycle.period_end) + 1)
    .filter((length) => length >= 1 && length <= 10);

  return calculateAverage(periodLengths, fallback);
}

function getConfidence(cyclesUsed) {
  if (cyclesUsed === 0) return "низкая";
  if (cyclesUsed < 3) return "средняя";

  return "высокая";
}

function predictCycle(cycles, user = {}) {
  if (!cycles || cycles.length === 0) {
    return null;
  }

  const sortedCycles = [...cycles]
    .filter((cycle) => cycle.period_start)
    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start));

  if (!sortedCycles.length) {
    return null;
  }

  const lastCycle = sortedCycles[sortedCycles.length - 1];

  const cycleLengths = calculateCycleLengths(sortedCycles);
  const validCycleLengths = filterOutliers(cycleLengths);

  const averageCycleLength = calculateAverage(
    validCycleLengths,
    user.cycle_length || DEFAULT_CYCLE_LENGTH,
  );

  const averagePeriodLength = calculateAveragePeriodLength(
    sortedCycles,
    user.period_length || DEFAULT_PERIOD_LENGTH,
  );

  const nextPeriodStart = addDays(lastCycle.period_start, averageCycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, averagePeriodLength - 1);

  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertileWindowStart = addDays(ovulationDate, -5);
  const fertileWindowEnd = addDays(ovulationDate, 1);

  return {
    lastPeriodStart: lastCycle.period_start,
    lastPeriodEnd: lastCycle.period_end,
    averageCycleLength,
    averagePeriodLength,
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    cyclesUsed: validCycleLengths.length,
    confidence: getConfidence(validCycleLengths.length),
  };
}

module.exports = {
  predictCycle,
  calculateCycleLengths,
  filterOutliers,
  calculateAveragePeriodLength,
};

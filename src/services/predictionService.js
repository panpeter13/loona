const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const MIN_CYCLE_LENGTH = 15;
const MAX_CYCLE_LENGTH = 60;
const MAX_HISTORY_INTERVALS = 12;

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDateOnly(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  return Math.round((parseDateOnly(endDate) - parseDateOnly(startDate)) / 86400000);
}

function addDays(dateString, days) {
  return formatDateOnly(parseDateOnly(dateString) + days * 86400000);
}

function median(numbers, fallback) {
  if (!numbers.length) return fallback;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value);
}

function standardDeviation(numbers) {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance = numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length;
  return Math.sqrt(variance);
}

function calculateCycleLengths(cycles) {
  const sortedCycles = [...cycles]
    .filter((cycle) => cycle.period_start)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));

  return sortedCycles.slice(1).map((cycle, index) => ({
    days: daysBetween(sortedCycles[index].period_start, cycle.period_start),
    from: sortedCycles[index].period_start,
    to: cycle.period_start,
  }));
}

function filterOutliers(lengths) {
  return lengths.filter((length) => {
    const value = typeof length === "number" ? length : length.days;
    return value >= MIN_CYCLE_LENGTH && value <= MAX_CYCLE_LENGTH;
  });
}

function calculateAveragePeriodLength(cycles, fallback = DEFAULT_PERIOD_LENGTH) {
  const periodLengths = cycles
    .filter((cycle) => cycle.period_start && cycle.period_end)
    .map((cycle) => daysBetween(cycle.period_start, cycle.period_end) + 1)
    .filter((length) => length >= 1 && length <= 14)
    .slice(-MAX_HISTORY_INTERVALS);

  return median(periodLengths, fallback);
}

function getConfidence(cyclesUsed, variabilityDays, hasPossibleMissingEntries) {
  if (cyclesUsed === 0) return "preliminary";
  if (hasPossibleMissingEntries) return "limited";
  if (cyclesUsed < 3) return "low";
  if (variabilityDays > 4) return "limited";
  if (cyclesUsed < 6) return "medium";
  return "improved";
}

function getUncertaintyDays(cyclesUsed, variabilityDays) {
  if (cyclesUsed === 0) return 4;
  if (cyclesUsed < 3) return Math.max(3, Math.ceil(variabilityDays));
  return Math.min(10, Math.max(2, Math.ceil(variabilityDays * 1.5)));
}

function predictCycle(cycles, user = {}) {
  if (!cycles?.length) return null;

  const sortedCycles = [...cycles]
    .filter((cycle) => cycle.period_start)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  if (!sortedCycles.length) return null;

  const lastCycle = sortedCycles[sortedCycles.length - 1];
  const allIntervals = calculateCycleLengths(sortedCycles);
  const validIntervals = filterOutliers(allIntervals).slice(-MAX_HISTORY_INTERVALS);
  const validLengths = validIntervals.map((item) => item.days);
  const possibleMissingEntries = allIntervals.filter((item) => item.days > MAX_CYCLE_LENGTH);

  const typicalCycleLength = median(
    validLengths,
    user.cycle_length || DEFAULT_CYCLE_LENGTH,
  );
  const typicalPeriodLength = calculateAveragePeriodLength(
    sortedCycles,
    user.period_length || DEFAULT_PERIOD_LENGTH,
  );
  const variabilityDays = Number(standardDeviation(validLengths).toFixed(1));
  const uncertaintyDays = getUncertaintyDays(validLengths.length, variabilityDays);

  const nextPeriodStart = addDays(lastCycle.period_start, typicalCycleLength);
  const nextPeriodStartRangeStart = addDays(nextPeriodStart, -uncertaintyDays);
  const nextPeriodStartRangeEnd = addDays(nextPeriodStart, uncertaintyDays);
  const nextPeriodEnd = addDays(nextPeriodStart, typicalPeriodLength - 1);
  const nextPeriodEndRangeStart = addDays(nextPeriodStartRangeStart, typicalPeriodLength - 1);
  const nextPeriodEndRangeEnd = addDays(nextPeriodStartRangeEnd, typicalPeriodLength - 1);

  const canEstimateOvulation = validLengths.length >= 3 && variabilityDays <= 4;
  const ovulationDate = canEstimateOvulation ? addDays(nextPeriodStart, -14) : null;
  const ovulationWindowStart = canEstimateOvulation
    ? addDays(nextPeriodStartRangeStart, -16)
    : null;
  const ovulationWindowEnd = canEstimateOvulation
    ? addDays(nextPeriodStartRangeEnd, -12)
    : null;
  const fertileWindowStart = canEstimateOvulation ? addDays(ovulationWindowStart, -5) : null;
  const fertileWindowEnd = canEstimateOvulation ? addDays(ovulationWindowEnd, 1) : null;

  return {
    lastPeriodStart: lastCycle.period_start,
    lastPeriodEnd: lastCycle.period_end,
    averageCycleLength: typicalCycleLength,
    averagePeriodLength: typicalPeriodLength,
    nextPeriodStart,
    nextPeriodStartRangeStart,
    nextPeriodStartRangeEnd,
    nextPeriodEnd,
    nextPeriodEndRangeStart,
    nextPeriodEndRangeEnd,
    ovulationDate,
    ovulationWindowStart,
    ovulationWindowEnd,
    fertileWindowStart,
    fertileWindowEnd,
    cyclesUsed: validLengths.length,
    variabilityDays,
    uncertaintyDays,
    isVariable: variabilityDays > 4,
    possibleMissingEntries: possibleMissingEntries.length,
    confidence: getConfidence(
      validLengths.length,
      variabilityDays,
      possibleMissingEntries.length > 0,
    ),
  };
}

module.exports = {
  predictCycle,
  calculateCycleLengths,
  filterOutliers,
  calculateAveragePeriodLength,
  daysBetween,
  addDays,
  median,
  standardDeviation,
};

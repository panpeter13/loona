const assert = require("node:assert/strict");
const { predictCycle, calculateCycleLengths } = require("./src/services/predictionService");

function starts(...dates) {
  return dates.map((period_start) => ({ period_start, period_end: null }));
}

const preliminary = predictCycle(starts("2026-07-01"), { cycle_length: 28, period_length: 5 });
assert.equal(preliminary.confidence, "preliminary");
assert.equal(preliminary.recordedCycles, 1);
assert.equal(preliminary.nextPeriodStart, "2026-07-29");
assert.equal(preliminary.nextPeriodStartRangeStart, "2026-07-25");
assert.equal(preliminary.ovulationDate, null);

const stable = predictCycle(
  starts("2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26", "2026-04-23", "2026-05-21", "2026-06-18"),
  {},
);
assert.equal(stable.averageCycleLength, 28);
assert.equal(stable.recordedCycles, 7);
assert.equal(stable.confidence, "improved");
assert.equal(stable.isVariable, false);
assert.ok(stable.ovulationWindowStart);

const variable = predictCycle(
  starts("2026-01-01", "2026-01-23", "2026-02-27", "2026-03-24", "2026-05-05"),
  {},
);
assert.equal(variable.confidence, "limited");
assert.equal(variable.isVariable, true);
assert.equal(variable.ovulationDate, null);

const skipped = predictCycle(starts("2026-01-01", "2026-01-29", "2026-04-01"), {});
assert.equal(skipped.possibleMissingEntries, 1);
assert.equal(skipped.confidence, "limited");

assert.deepEqual(
  calculateCycleLengths(starts("2026-02-01", "2026-01-01", "2026-03-01")).map((x) => x.days),
  [31, 28],
);

console.log("Prediction engine OK");

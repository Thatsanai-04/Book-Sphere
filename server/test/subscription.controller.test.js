const test = require("node:test");
const assert = require("node:assert/strict");
const { daysRemainingFor } = require("../src/controllers/subscription.controller");

test("calculates remaining trial days rounded up", () => {
  const now = new Date("2026-09-17T10:00:00.000Z");
  const trialEndDate = new Date("2026-09-24T09:00:00.000Z");
  assert.equal(daysRemainingFor(trialEndDate, now), 7);
});

test("returns zero days for an expired or missing trial", () => {
  const now = new Date("2026-09-17T10:00:00.000Z");
  assert.equal(daysRemainingFor(new Date("2026-09-16T10:00:00.000Z"), now), 0);
  assert.equal(daysRemainingFor(null, now), 0);
});

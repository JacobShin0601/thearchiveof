import assert from 'node:assert/strict';
import test from 'node:test';
import { APLD_THEREAFTER_RENT, APLD_TOTAL_CONTRACTED_RENT, apldCampuses, apldContractedMw, apldContractedRent, apldPlannedMw, apldScenarios, calculateApldScenario, solveApldAdditionalMw } from '../src/data/apld-valuation.ts';

test('APLD contracted capacity distinguishes contract and planned MW', () => {
  assert.equal(apldContractedMw, 1_410);
  assert.equal(apldPlannedMw, 1_510);
  assert.equal(apldCampuses.length, 5);
});
test('APLD disclosed minimum rent reconciles', () => {
  const roundedSchedule = apldContractedRent.reduce((sum, row) => sum + row.rent, APLD_THEREAFTER_RENT);
  // Component line items are rounded to $0.1M while the reported total is $35.731B.
  assert.ok(Math.abs(roundedSchedule - APLD_TOTAL_CONTRACTED_RENT) <= 0.1);
});
test('APLD scenario is monotonic in the primary drivers', () => {
  const base = calculateApldScenario(apldScenarios.base);
  assert.ok(calculateApldScenario({ ...apldScenarios.base, noiMargin: .89 }).fairValue > base.fairValue);
  assert.ok(calculateApldScenario({ ...apldScenarios.base, residualCapexPerMw: 13 }).fairValue < base.fairValue);
  assert.ok(calculateApldScenario({ ...apldScenarios.base, discountRate: .11 }).fairValue < base.fairValue);
});
test('APLD reverse solver round-trips a reachable price', () => {
  const assumed = { ...apldScenarios.base, additionalMw: 500 };
  const price = calculateApldScenario(assumed).fairValue;
  const solved = solveApldAdditionalMw({ targetPrice: price, assumptions: apldScenarios.base });
  assert.ok(solved !== null && Math.abs(solved - 500) < .001);
});

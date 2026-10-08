import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateHiiFcfCrossCheck,
  calculateHiiValuation,
  hiiBaseScenario,
  hiiDiscountYears,
  hiiFcfCrossCheck,
  hiiMarginBenchmarks,
  hiiMarginSensitivity,
  hiiMosPrices,
  hiiScenarios,
} from '../src/data/hii-valuation.ts';

test('HII scenario model reproduces the article values', () => {
  assert.equal(hiiScenarios.length, 3);
  assert.ok(Math.abs(hiiDiscountYears - 4.23) < 0.001);
  assert.ok(Math.abs(hiiBaseScenario.totalSegmentRevenue - 16.7716) < 0.001);
  assert.ok(Math.abs(hiiBaseScenario.eps - 26.6314) < 0.001);
  assert.ok(Math.abs(hiiBaseScenario.presentValue - 284.7235) < 0.01);
  assert.ok(Math.abs(hiiFcfCrossCheck.presentValue - 290.1268) < 0.01);
});

test('HII margin normalization and margin sensitivity are internally consistent', () => {
  assert.ok(hiiMarginBenchmarks.preCovid2015To2019 > 0.09);
  assert.ok(hiiMarginBenchmarks.recovery2021To2023 > 0.075);
  assert.ok(hiiMarginBenchmarks.recent2024To2025 < 0.06);

  const six = hiiMarginSensitivity.find((row) => row.margin === 0.06);
  const nine = hiiMarginSensitivity.find((row) => row.margin === 0.09);
  assert.ok(six && nine);
  assert.ok(Math.abs(nine.operatingIncome / six.operatingIncome - 1.5) < 1e-12);
});

test('HII margin-of-safety prices descend from base present value', () => {
  assert.deepEqual(
    hiiMosPrices.map((row) => Math.round(row.price)),
    [256, 242, 228, 214, 199],
  );
});

test('HII interactive calculator responds monotonically to margin and required return', () => {
  const assumptions = {
    shipbuildingGrowth: 0.06,
    shipbuildingMargin: 0.075,
    missionGrowth: 0.05,
    missionMargin: 0.065,
    exitPe: 16,
  };
  const base = calculateHiiValuation(assumptions);
  const higherMargin = calculateHiiValuation({ ...assumptions, shipbuildingMargin: 0.09 });
  const higherRequiredReturn = calculateHiiValuation({ ...assumptions, requiredReturn: 0.14 });
  assert.ok(higherMargin.eps > base.eps);
  assert.ok(higherMargin.presentValue > base.presentValue);
  assert.ok(higherRequiredReturn.presentValue < base.presentValue);
});

test('HII FCF cross-check uses the selected share count and discount rate', () => {
  const base = calculateHiiFcfCrossCheck({ totalRevenue: 16.7716, fcfMargin: 0.06, multiple: 17 });
  const fewerShares = calculateHiiFcfCrossCheck({ totalRevenue: 16.7716, fcfMargin: 0.06, multiple: 17, dilutedShares: 37 });
  const higherRequiredReturn = calculateHiiFcfCrossCheck({ totalRevenue: 16.7716, fcfMargin: 0.06, multiple: 17, requiredReturn: 0.14 });
  assert.ok(fewerShares.presentValue > base.presentValue);
  assert.ok(higherRequiredReturn.presentValue < base.presentValue);
});

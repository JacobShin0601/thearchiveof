import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STERLING_CURRENT_PRICE,
  calculateSterlingValuation,
  solveSterlingEInfrastructureGrowth,
  sterlingBaseScenario,
  sterlingDiscountYears,
  sterlingImpliedBaseGrowth,
  sterlingScenarios,
} from '../src/data/sterling-valuation.ts';

test('Sterling scenario model reproduces the article values', () => {
  assert.equal(sterlingScenarios.length, 3);
  assert.ok(Math.abs(sterlingDiscountYears - 4.2327) < 0.001);
  assert.deepEqual(
    sterlingScenarios.map((scenario) => Math.round(scenario.totalRevenue * 100) / 100),
    [5.5, 7.45, 8.63],
  );
  assert.deepEqual(
    sterlingScenarios.map((scenario) => Math.round(scenario.adjustedEps * 100) / 100),
    [22.15, 35.41, 44.1],
  );
  assert.deepEqual(
    sterlingScenarios.map((scenario) => Math.round(scenario.presentValue)),
    [266, 568, 825],
  );
});

test('Sterling base case matches the article earnings bridge', () => {
  assert.ok(Math.abs(sterlingBaseScenario.eInfrastructureRevenue - 6.365952) < 1e-6);
  assert.ok(Math.abs(sterlingBaseScenario.adjustedEbitda - 1.602566) < 1e-6);
  assert.ok(Math.abs(sterlingBaseScenario.futurePrice - 849.8766) < 0.001);
});

test('Sterling reverse solver recovers the growth implied by current price', () => {
  assert.ok(Math.abs(sterlingImpliedBaseGrowth - 0.197484) < 1e-6);
  const result = calculateSterlingValuation({
    eInfrastructureGrowth: sterlingImpliedBaseGrowth,
    otherGrowth: 0.02,
    ebitdaMargin: 0.215,
    exitPe: 24,
  });
  assert.ok(Math.abs(result.presentValue - STERLING_CURRENT_PRICE) < 1e-8);
});

test('Sterling valuation rises with growth and falls with required return', () => {
  const assumptions = {
    eInfrastructureGrowth: 0.20,
    otherGrowth: 0.02,
    ebitdaMargin: 0.215,
    exitPe: 24,
  };
  const base = calculateSterlingValuation(assumptions);
  const higherGrowth = calculateSterlingValuation({ ...assumptions, eInfrastructureGrowth: 0.25 });
  const higherRequiredReturn = calculateSterlingValuation({ ...assumptions, requiredReturn: 0.14 });
  assert.ok(higherGrowth.presentValue > base.presentValue);
  assert.ok(higherRequiredReturn.presentValue < base.presentValue);
});

test('Sterling reverse solver reports an unreachable target', () => {
  const growth = solveSterlingEInfrastructureGrowth({
    targetPresentValue: 10_000,
    assumptions: { otherGrowth: 0.02, ebitdaMargin: 0.215, exitPe: 24 },
  });
  assert.equal(growth, null);
});

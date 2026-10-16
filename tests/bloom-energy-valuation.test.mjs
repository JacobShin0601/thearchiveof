import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOOM_CURRENT_PRICE, bloomBaseScenario, bloomScenarios, calculateBloomDcf, solveBloomDeliveryScale } from '../src/data/bloom-energy-valuation.ts';

test('Bloom revenue bridge adds to total revenue', () => {
  const result = calculateBloomDcf(bloomScenarios.base);
  for (const row of result.projections) {
    assert.equal(row.revenue, row.productRevenue + row.installationRevenue + row.serviceRevenue + row.electricityRevenue);
  }
});

test('Bloom FCFF bridge is internally consistent', () => {
  const result = calculateBloomDcf(bloomScenarios.base);
  for (const row of result.projections) {
    assert.equal(row.fcff, row.nopat + row.depreciation - row.capex - row.changeInNwc);
  }
});

test('Bloom valuation responds monotonically to core drivers', () => {
  const base = calculateBloomDcf(bloomScenarios.base);
  assert.ok(calculateBloomDcf({ ...bloomScenarios.base, productGrossMargin: .32 }).fairValuePerShare > base.fairValuePerShare);
  assert.ok(calculateBloomDcf({ ...bloomScenarios.base, discountRate: .11 }).fairValuePerShare < base.fairValuePerShare);
  assert.ok(calculateBloomDcf({ ...bloomScenarios.base, dilutedShares: 250 }).fairValuePerShare < base.fairValuePerShare);
});

test('Bloom reverse delivery solver round-trips a reachable valuation', () => {
  const scenario = { ...bloomScenarios.base, deliveredGw: [2.04, 2.4, 2.76, 3.12] as const };
  const price = calculateBloomDcf(scenario).fairValuePerShare;
  const solved = solveBloomDeliveryScale({ targetPrice: price, assumptions: bloomScenarios.base });
  assert.ok(solved !== null);
  assert.ok(Math.abs(solved.scale - 1.2) < .0001);
});

test('Bloom model rejects terminal growth at or above the discount rate', () => {
  assert.throws(() => calculateBloomDcf({ ...bloomScenarios.base, terminalGrowth: bloomScenarios.base.discountRate }));
  assert.ok(bloomBaseScenario.fairValuePerShare < BLOOM_CURRENT_PRICE);
});

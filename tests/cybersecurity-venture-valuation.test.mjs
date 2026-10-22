import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCybersecurityVenture, cybersecurityVentureScenarios } from '../src/data/cybersecurity-venture-valuation.ts';

test('productization raises the base-case gross margin and terminal value', () => {
  const base = cybersecurityVentureScenarios.gateway.base;
  const moreProduct = calculateCybersecurityVenture({ ...base, productRevenueMix: .85, servicesRevenuePerCustomer: .8 });
  const result = calculateCybersecurityVenture(base);
  assert.ok(moreProduct.blendedGrossMargin > result.blendedGrossMargin);
});

test('higher entry price reduces return without changing the operating result', () => {
  const base = cybersecurityVentureScenarios.bas.base;
  const cheap = calculateCybersecurityVenture(base);
  const expensive = calculateCybersecurityVenture({ ...base, entryPreMoney: 2400 });
  assert.equal(expensive.terminalRevenue, cheap.terminalRevenue);
  assert.ok(expensive.exitProceeds < cheap.exitProceeds);
});

test('negative equity value has no hidden positive return and flags an infeasible target', () => {
  const result = calculateCybersecurityVenture({ ...cybersecurityVentureScenarios.bas.bear, netDebt: 1e9 });
  assert.equal(result.exitProceeds, 0);
  assert.equal(result.moic, null);
  assert.equal(result.targetIsFeasible, false);
  assert.ok(result.maximumPreMoney < 0);
});

test('invalid ownership and zero investment fail loudly', () => {
  assert.throws(() => calculateCybersecurityVenture({ ...cybersecurityVentureScenarios.gateway.base, investment: 0 }), /investment/);
  assert.throws(() => calculateCybersecurityVenture({ ...cybersecurityVentureScenarios.gateway.base, cumulativeDilution: 1.01 }), /cumulativeDilution/);
});

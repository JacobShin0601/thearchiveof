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

test('separates revenue and EBITDA exit lenses and does not invent an EBITDA multiple while loss-making', () => {
  const profitable = calculateCybersecurityVenture(cybersecurityVentureScenarios.gateway.bull);
  assert.ok(profitable.exitEnterpriseValueFromEbitda !== null);
  assert.ok(profitable.impliedExitEbitdaMultiple !== null);
  assert.equal(profitable.exitEnterpriseValue, profitable.terminalRevenue * profitable.exitRevenueMultiple);

  const lossMaking = calculateCybersecurityVenture({ ...cybersecurityVentureScenarios.bas.bear, operatingExpenseRatio: 2 });
  assert.ok(lossMaking.ebitda < 0);
  assert.equal(lossMaking.exitEnterpriseValueFromEbitda, null);
  assert.equal(lossMaking.impliedExitEbitdaMultiple, null);
});

test('partner distribution cost reduces EBITDA without changing gross profit', () => {
  const base = cybersecurityVentureScenarios.gateway.base;
  const direct = calculateCybersecurityVenture({ ...base, partnerCommissionRate: 0 });
  const channel = calculateCybersecurityVenture({ ...base, partnerCommissionRate: .2 });
  assert.equal(channel.grossProfit, direct.grossProfit);
  assert.ok(channel.partnerDistributionCost > 0);
  assert.ok(channel.ebitda < direct.ebitda);
});

test('exit revenue keeps separate annual customer cohorts rather than treating year-one customers as one terminal pool', () => {
  const result = calculateCybersecurityVenture({ ...cybersecurityVentureScenarios.gateway.base, yearsToExit: 3, annualCustomerGrowth: .5, retentionAndExpansion: 1 });
  assert.equal(result.exitYearNewCustomers, 54);
  assert.equal(result.terminalCustomers, 114);
  assert.equal(result.customerCohortRevenueUnits, 114);
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

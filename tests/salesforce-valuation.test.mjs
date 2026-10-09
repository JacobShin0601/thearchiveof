import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SALESFORCE_CURRENT_PRICE,
  calculateSalesforceAdvancedDcf,
  calculateSalesforceDcf,
  projectShareCount,
  salesforceBaseScenario,
  salesforceImpliedGrowth,
  salesforceScenarios,
  solveSalesforceImpliedGrowth,
} from '../src/data/salesforce-valuation.ts';

test('Salesforce DCF reproduces the article scenarios', () => {
  assert.deepEqual(
    salesforceScenarios.map((scenario) => Math.round(scenario.fairValuePerShare)),
    [207, 302, 459],
  );
  assert.ok(Math.abs(salesforceBaseScenario.fairValuePerShare - 301.83) < 0.02);
});

test('fair value rises with FCF growth and falls with the discount rate', () => {
  const base = calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: 0.10, terminalGrowth: 0.025 });
  const moreFcf = calculateSalesforceDcf({ fcfGrowth: 0.09, discountRate: 0.10, terminalGrowth: 0.025 });
  const higherDiscount = calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: 0.12, terminalGrowth: 0.025 });
  assert.ok(moreFcf.fairValuePerShare > base.fairValuePerShare);
  assert.ok(higherDiscount.fairValuePerShare < base.fairValuePerShare);
});

test('more shares reduce per-share value while leaving aggregate equity value unchanged', () => {
  const base = calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: 0.10, terminalGrowth: 0.025, shares: 823 });
  const diluted = calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: 0.10, terminalGrowth: 0.025, shares: 900 });
  assert.equal(diluted.equityValue, base.equityValue);
  assert.ok(diluted.fairValuePerShare < base.fairValuePerShare);
});

test('the model rejects a terminal growth rate at or above the discount rate', () => {
  assert.throws(
    () => calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: 0.025, terminalGrowth: 0.025 }),
    /discountRate must be greater/,
  );
});

test('reverse DCF solves the current market price', () => {
  const result = calculateSalesforceDcf({
    fcfGrowth: salesforceImpliedGrowth,
    discountRate: 0.10,
    terminalGrowth: 0.025,
  });
  assert.ok(Math.abs(result.fairValuePerShare - SALESFORCE_CURRENT_PRICE) < 1e-8);
  assert.ok(Math.abs(salesforceImpliedGrowth) < 0.0001);
});

test('upside and margin of safety use the same fair value', () => {
  assert.ok(Math.abs(salesforceBaseScenario.upside - (301.83 / 224.56 - 1)) < 0.0001);
  assert.ok(Math.abs(salesforceBaseScenario.marginOfSafety - (1 - 224.56 / 301.83)) < 0.0001);
});

test('SBC adjustment is applied once and is not also treated as dilution', () => {
  const adjusted = calculateSalesforceDcf({
    fcfGrowth: 0.07,
    discountRate: 0.10,
    terminalGrowth: 0.025,
    sbcAdjustmentRatio: 1,
  });
  assert.equal(adjusted.adjustedStartingFcf, 15.048 - 3.526);
  assert.equal(adjusted.shares, 823);
  assert.ok(adjusted.fairValuePerShare < salesforceBaseScenario.fairValuePerShare);
});

test('advanced AI bridge adds net economics once, not to an already AI-inclusive growth rate', () => {
  const advanced = calculateSalesforceAdvancedDcf({
    legacyFcfGrowth: 0.04,
    yearFiveIncrementalAiRevenue: 5,
    aiContributionMargin: 0.55,
    crmCannibalizationRate: 0.15,
    discountRate: 0.10,
    terminalGrowth: 0.025,
  });
  assert.ok(Math.abs(advanced.aiBridge.netFcfContribution - 2.3375) < 1e-10);
  assert.ok(Math.abs(advanced.projections.at(-1).aiContribution - 2.3375) < 1e-10);
  assert.equal('fcfGrowth' in advanced, false);
});

test('share-count bridge does not change the DCF equity value', () => {
  const futureShares = projectShareCount({ annualShareChange: -0.02 });
  assert.ok(futureShares < 823);
  assert.equal(salesforceBaseScenario.shares, 823);
});

test('missing or invalid market inputs fail loudly', () => {
  assert.throws(
    () => solveSalesforceImpliedGrowth({ targetPrice: Number.NaN, discountRate: 0.10, terminalGrowth: 0.025 }),
    /targetPrice must be finite/,
  );
  assert.throws(
    () => calculateSalesforceDcf({ fcfGrowth: 0.07, discountRate: Number.NaN, terminalGrowth: 0.025 }),
    /discountRate must be finite/,
  );
});

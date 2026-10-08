import {
  SALESFORCE_CURRENT_PRICE,
  salesforceMosPrices,
  salesforceSbcImpliedGrowth,
  salesforceScenarios,
} from '../src/data/salesforce-valuation.ts';

console.log(JSON.stringify({
  currentPrice: SALESFORCE_CURRENT_PRICE,
  scenarios: salesforceScenarios.map(({ name, yearFiveFcf, fairValuePerShare, upside, terminalValueShare }) => ({
    name,
    yearFiveFcf,
    fairValuePerShare,
    upside,
    terminalValueShare,
  })),
  marketImpliedGrowthBySbcAdjustment: salesforceSbcImpliedGrowth,
  marginOfSafetyPrices: salesforceMosPrices,
}, null, 2));

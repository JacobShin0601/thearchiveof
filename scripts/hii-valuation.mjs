import {
  HII_CURRENT_PRICE,
  hiiBaseScenario,
  hiiDiscountFactor,
  hiiDiscountYears,
  hiiFcfCrossCheck,
  hiiMarginBenchmarks,
  hiiMosPrices,
  hiiScenarios,
} from '../src/data/hii-valuation.ts';

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const usd = (value) => `$${value.toFixed(2)}`;

console.table(
  hiiScenarios.map((scenario) => ({
    scenario: scenario.name,
    revenue2030: `$${scenario.totalSegmentRevenue.toFixed(2)}B`,
    segmentOperatingIncome: `$${scenario.segmentOperatingIncome.toFixed(2)}B`,
    eps2030: usd(scenario.eps),
    exitPE: `${scenario.exitPe.toFixed(1)}x`,
    price2030: usd(scenario.futurePrice),
    presentValue: usd(scenario.presentValue),
  })),
);

console.table(
  hiiMosPrices.map((row) => ({
    marginOfSafety: pct(row.marginOfSafety),
    price: usd(row.price),
  })),
);

console.log({
  currentPrice: usd(HII_CURRENT_PRICE),
  discountYears: hiiDiscountYears.toFixed(4),
  discountFactor: hiiDiscountFactor.toFixed(4),
  basePresentValue: usd(hiiBaseScenario.presentValue),
  baseFcfPresentValue: usd(hiiFcfCrossCheck.presentValue),
  preCovidShipbuildingMargin: pct(hiiMarginBenchmarks.preCovid2015To2019),
  recoveryShipbuildingMargin: pct(hiiMarginBenchmarks.recovery2021To2023),
  recentShipbuildingMargin: pct(hiiMarginBenchmarks.recent2024To2025),
});

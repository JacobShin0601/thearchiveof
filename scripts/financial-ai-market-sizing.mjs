// Reproduces the explicitly assumed knowledge-work AI SAM in the research dossier.
const verticals = [
  ['Investment banking', [80, 120, 180], [4, 8, 15]],
  ['Private equity', [60, 100, 140], [3, 7, 12]],
  ['Asset management/public equities/HF', [120, 200, 280], [3, 6, 12]],
  ['Credit', [60, 100, 150], [2, 5, 10]],
  ['Wealth', [150, 275, 400], [1, 2, 5]],
  ['Corporate development/strategy/IR', [100, 175, 250], [1, 3, 6]],
];
const totals = [0, 1, 2].map((scenario) =>
  verticals.reduce((sum, [, seats, spend]) => sum + seats[scenario] * spend[scenario] / 1000, 0),
);
const vendorUsdBasket = 4.916 + 2.321748 + 0.8306 + 0.6718;
console.log(JSON.stringify({
  unit: 'USD billions per year',
  sam: { low: totals[0], base: totals[1], high: totals[2] },
  vendorRevenueBasketUsdExcludingLseg: vendorUsdBasket,
  lsegDataAnalyticsGbpBillions: 3.978,
}, null, 2));

export const HII_PUBLISH_DATE = '2026-10-07';
export const HII_DATA_THROUGH = '2026-10-06';
export const HII_CURRENT_PRICE = 263.75;

export const hiiHistoricalShipbuilding = [
  { year: 2015, ingallsRevenue: 2188, ingallsIncome: 379, newportRevenue: 4298, newportIncome: 401 },
  { year: 2016, ingallsRevenue: 2389, ingallsIncome: 321, newportRevenue: 4089, newportIncome: 386 },
  { year: 2017, ingallsRevenue: 2420, ingallsIncome: 313, newportRevenue: 4164, newportIncome: 354 },
  { year: 2018, ingallsRevenue: 2607, ingallsIncome: 313, newportRevenue: 4796, newportIncome: 330 },
  { year: 2019, ingallsRevenue: 2555, ingallsIncome: 235, newportRevenue: 5231, newportIncome: 410 },
  { year: 2020, ingallsRevenue: 2678, ingallsIncome: 281, newportRevenue: 5571, newportIncome: 233 },
  { year: 2021, ingallsRevenue: 2528, ingallsIncome: 281, newportRevenue: 5663, newportIncome: 352 },
  { year: 2022, ingallsRevenue: 2570, ingallsIncome: 292, newportRevenue: 5852, newportIncome: 357 },
  { year: 2023, ingallsRevenue: 2752, ingallsIncome: 362, newportRevenue: 6133, newportIncome: 379 },
  { year: 2024, ingallsRevenue: 2767, ingallsIncome: 211, newportRevenue: 5969, newportIncome: 246 },
  { year: 2025, ingallsRevenue: 3078, ingallsIncome: 233, newportRevenue: 6507, newportIncome: 331 },
].map((row) => ({
  ...row,
  ingallsMargin: row.ingallsIncome / row.ingallsRevenue,
  newportMargin: row.newportIncome / row.newportRevenue,
  combinedMargin:
    (row.ingallsIncome + row.newportIncome) /
    (row.ingallsRevenue + row.newportRevenue),
}));

export const hiiMarginHistory = [
  ...hiiHistoricalShipbuilding,
  {
    year: 2026,
    ingallsRevenue: null,
    ingallsIncome: null,
    newportRevenue: null,
    newportIncome: null,
    ingallsMargin: null,
    newportMargin: null,
    combinedMargin: 0.0625,
    estimate: true,
  },
];

function weightedMargin(from: number, to: number) {
  const rows = hiiHistoricalShipbuilding.filter((row) => row.year >= from && row.year <= to);
  const income = rows.reduce(
    (sum, row) => sum + row.ingallsIncome + row.newportIncome,
    0,
  );
  const revenue = rows.reduce(
    (sum, row) => sum + row.ingallsRevenue + row.newportRevenue,
    0,
  );
  return income / revenue;
}

export const hiiMarginBenchmarks = {
  preCovid2015To2019: weightedMargin(2015, 2019),
  recovery2021To2023: weightedMargin(2021, 2023),
  recent2024To2025: weightedMargin(2024, 2025),
  base2030: 0.075,
};

export const hiiEacHistory = [
  { year: 2021, netAdjustment: 115 },
  { year: 2022, netAdjustment: 113 },
  { year: 2023, netAdjustment: 118 },
  { year: 2024, netAdjustment: -126 },
  { year: 2025, netAdjustment: -28 },
];

export const hiiFcfHistory = [
  { year: 2015, revenue: 7020, cfo: 861, fcf: 673 },
  { year: 2016, revenue: 7068, cfo: 822, fcf: 537 },
  { year: 2017, revenue: 7441, cfo: 814, fcf: 453 },
  { year: 2018, revenue: 8176, cfo: 914, fcf: 512 },
  { year: 2019, revenue: 8899, cfo: 896, fcf: 460 },
  { year: 2020, revenue: 9361, cfo: 1093, fcf: 757 },
  { year: 2021, revenue: 9524, cfo: 760, fcf: 449 },
  { year: 2022, revenue: 10676, cfo: 766, fcf: 494 },
  { year: 2023, revenue: 11454, cfo: 970, fcf: 692 },
  { year: 2024, revenue: 11535, cfo: 393, fcf: 40 },
  { year: 2025, revenue: 12484, cfo: 1196, fcf: 800 },
].map((row) => ({ ...row, fcfMargin: row.fcf / row.revenue }));

export const hiiBacklog = {
  asOf: '2026-06-30',
  funded: 34_594,
  unfunded: 22_728,
  total: 57_322,
  segments: [
    { name: 'Ingalls', funded: 16_883, unfunded: 2_470, total: 19_353 },
    { name: 'Newport News', funded: 15_849, unfunded: 16_639, total: 32_488 },
    { name: 'Mission Technologies', funded: 1_862, unfunded: 3_619, total: 5_481 },
  ],
  conversion: [
    { period: 'Through 2027', periodKo: '2027년까지', share: 0.35 },
    { period: '2028–2029', periodKo: '2028–2029', share: 0.35 },
    { period: 'After 2029', periodKo: '2029년 이후', share: 0.30 },
  ],
};

export const hiiContractMix2025 = [
  { type: 'Cost-type', typeKo: '원가보상형', share: 0.50 },
  { type: 'Fixed-price incentive', typeKo: '고정가격 인센티브', share: 0.46 },
  { type: 'Firm fixed-price', typeKo: '확정 고정가격', share: 0.03 },
  { type: 'Time and materials', typeKo: '시간·재료비', share: 0.01 },
];

export const hiiModelInputs = {
  baseYear: 2026,
  targetYear: 2030,
  shipbuildingRevenue: 10.3,
  missionRevenue: 3.1,
  nonSegmentItems: -0.064,
  interestExpense: 0.105,
  nonOperatingRetirementBenefit: 0.213,
  taxRate: 0.17,
  dilutedShares: 39.4,
  requiredReturn: 0.10,
  publishDate: HII_PUBLISH_DATE,
  targetDate: '2030-12-31',
};

export interface HiiValuationAssumptions {
  shipbuildingGrowth: number;
  shipbuildingMargin: number;
  missionGrowth: number;
  missionMargin: number;
  exitPe: number;
  requiredReturn?: number;
  dilutedShares?: number;
  nonSegmentItems?: number;
  interestExpense?: number;
  nonOperatingRetirementBenefit?: number;
  taxRate?: number;
}

export const hiiScenarioInputs = [
  {
    name: 'Bear',
    shipbuildingGrowth: 0.03,
    shipbuildingMargin: 0.06,
    missionGrowth: 0.03,
    missionMargin: 0.05,
    exitPe: 12.5,
  },
  {
    name: 'Base',
    shipbuildingGrowth: 0.06,
    shipbuildingMargin: 0.075,
    missionGrowth: 0.05,
    missionMargin: 0.065,
    exitPe: 16,
  },
  {
    name: 'Bull',
    shipbuildingGrowth: 0.08,
    shipbuildingMargin: 0.09,
    missionGrowth: 0.07,
    missionMargin: 0.08,
    exitPe: 18.5,
  },
];

const MS_PER_DAY = 86_400_000;
const discountYears =
  (Date.parse(`${hiiModelInputs.targetDate}T00:00:00Z`) -
    Date.parse(`${hiiModelInputs.publishDate}T00:00:00Z`)) /
  MS_PER_DAY /
  365.25;

export const hiiDiscountYears = discountYears;
export const hiiDiscountFactor = (1 + hiiModelInputs.requiredReturn) ** discountYears;

export function calculateHiiValuation(assumptions: HiiValuationAssumptions) {
  const years = hiiModelInputs.targetYear - hiiModelInputs.baseYear;
  const shipbuildingRevenue =
    hiiModelInputs.shipbuildingRevenue * (1 + assumptions.shipbuildingGrowth) ** years;
  const missionRevenue =
    hiiModelInputs.missionRevenue * (1 + assumptions.missionGrowth) ** years;
  const shipbuildingIncome = shipbuildingRevenue * assumptions.shipbuildingMargin;
  const missionIncome = missionRevenue * assumptions.missionMargin;
  const segmentOperatingIncome = shipbuildingIncome + missionIncome;
  const pretaxIncome =
    segmentOperatingIncome +
    (assumptions.nonSegmentItems ?? hiiModelInputs.nonSegmentItems) -
    (assumptions.interestExpense ?? hiiModelInputs.interestExpense) +
    (assumptions.nonOperatingRetirementBenefit ??
      hiiModelInputs.nonOperatingRetirementBenefit);
  const netIncome = pretaxIncome * (1 - (assumptions.taxRate ?? hiiModelInputs.taxRate));
  const dilutedShares = assumptions.dilutedShares ?? hiiModelInputs.dilutedShares;
  const eps = (netIncome * 1000) / dilutedShares;
  const futurePrice = eps * assumptions.exitPe;
  const requiredReturn = assumptions.requiredReturn ?? hiiModelInputs.requiredReturn;
  const discountFactor = (1 + requiredReturn) ** discountYears;
  const presentValue = futurePrice / discountFactor;

  return {
    ...assumptions,
    requiredReturn,
    dilutedShares,
    shipbuildingRevenue,
    missionRevenue,
    totalSegmentRevenue: shipbuildingRevenue + missionRevenue,
    shipbuildingIncome,
    missionIncome,
    segmentOperatingIncome,
    pretaxIncome,
    netIncome,
    eps,
    futurePrice,
    discountFactor,
    presentValue,
  };
}

export function calculateHiiFcfCrossCheck({
  totalRevenue,
  fcfMargin,
  multiple,
  dilutedShares = hiiModelInputs.dilutedShares,
  requiredReturn = hiiModelInputs.requiredReturn,
}: {
  totalRevenue: number;
  fcfMargin: number;
  multiple: number;
  dilutedShares?: number;
  requiredReturn?: number;
}) {
  const fcf = totalRevenue * fcfMargin;
  const equityValue = fcf * multiple;
  const futurePrice = (equityValue * 1000) / dilutedShares;
  const presentValue = futurePrice / (1 + requiredReturn) ** discountYears;
  return { fcf, equityValue, futurePrice, presentValue };
}

export const hiiScenarios = hiiScenarioInputs.map((scenario) => ({
  ...scenario,
  ...calculateHiiValuation(scenario),
}));

export const hiiBaseScenario = hiiScenarios.find((scenario) => scenario.name === 'Base')!;

export const hiiMarginSensitivity = [0.06, 0.07, 0.075, 0.08, 0.09].map((margin) => ({
  margin,
  operatingIncome: hiiBaseScenario.shipbuildingRevenue * margin,
}));

export const hiiMosPrices = [0.10, 0.15, 0.20, 0.25, 0.30].map((marginOfSafety) => ({
  marginOfSafety,
  price: hiiBaseScenario.presentValue * (1 - marginOfSafety),
}));

const baseFcfMargin = 0.06;
const baseFcfMultiple = 17;
const baseFcfResult = calculateHiiFcfCrossCheck({
  totalRevenue: hiiBaseScenario.totalSegmentRevenue,
  fcfMargin: baseFcfMargin,
  multiple: baseFcfMultiple,
});

export const hiiFcfCrossCheck = {
  fcfMargin: baseFcfMargin,
  multiple: baseFcfMultiple,
  ...baseFcfResult,
};

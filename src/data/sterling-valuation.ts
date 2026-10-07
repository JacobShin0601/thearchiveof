export const STERLING_PUBLISH_DATE = '2026-10-07';
export const STERLING_DATA_THROUGH = '2026-10-06';
export const STERLING_CURRENT_PRICE = 563.69;

export const sterlingModelInputs = {
  baseYear: 2026,
  targetYear: 2030,
  eInfrastructureRevenue: 3.07,
  otherRevenue: 1.005,
  depreciationRate: 0.018,
  taxRate: 0.25,
  netInterestIncome: 0,
  dilutedShares: 31.1,
  requiredReturn: 0.10,
  publishDate: STERLING_PUBLISH_DATE,
  targetDate: '2030-12-31',
};

export interface SterlingValuationAssumptions {
  eInfrastructureGrowth: number;
  otherGrowth: number;
  ebitdaMargin: number;
  exitPe: number;
  depreciationRate?: number;
  taxRate?: number;
  netInterestIncome?: number;
  dilutedShares?: number;
  requiredReturn?: number;
}

const MS_PER_DAY = 86_400_000;
export const sterlingDiscountYears =
  (Date.parse(`${sterlingModelInputs.targetDate}T00:00:00Z`) -
    Date.parse(`${sterlingModelInputs.publishDate}T00:00:00Z`)) /
  MS_PER_DAY /
  365.25;

export function calculateSterlingValuation(assumptions: SterlingValuationAssumptions) {
  const years = sterlingModelInputs.targetYear - sterlingModelInputs.baseYear;
  const eInfrastructureRevenue =
    sterlingModelInputs.eInfrastructureRevenue *
    (1 + assumptions.eInfrastructureGrowth) ** years;
  const otherRevenue =
    sterlingModelInputs.otherRevenue * (1 + assumptions.otherGrowth) ** years;
  const totalRevenue = eInfrastructureRevenue + otherRevenue;
  const adjustedEbitda = totalRevenue * assumptions.ebitdaMargin;
  const depreciation =
    totalRevenue * (assumptions.depreciationRate ?? sterlingModelInputs.depreciationRate);
  const adjustedPretaxIncome =
    adjustedEbitda -
    depreciation +
    (assumptions.netInterestIncome ?? sterlingModelInputs.netInterestIncome);
  const adjustedNetIncome =
    adjustedPretaxIncome * (1 - (assumptions.taxRate ?? sterlingModelInputs.taxRate));
  const dilutedShares = assumptions.dilutedShares ?? sterlingModelInputs.dilutedShares;
  const adjustedEps = (adjustedNetIncome * 1000) / dilutedShares;
  const futurePrice = adjustedEps * assumptions.exitPe;
  const requiredReturn = assumptions.requiredReturn ?? sterlingModelInputs.requiredReturn;
  const discountFactor = (1 + requiredReturn) ** sterlingDiscountYears;
  const presentValue = futurePrice / discountFactor;

  return {
    ...assumptions,
    dilutedShares,
    requiredReturn,
    eInfrastructureRevenue,
    otherRevenue,
    totalRevenue,
    adjustedEbitda,
    depreciation,
    adjustedPretaxIncome,
    adjustedNetIncome,
    adjustedEps,
    futurePrice,
    discountFactor,
    presentValue,
  };
}

export const sterlingScenarioInputs = [
  {
    name: 'Bear',
    eInfrastructureGrowth: 0.10,
    otherGrowth: 0,
    ebitdaMargin: 0.185,
    exitPe: 18,
  },
  {
    name: 'Base',
    eInfrastructureGrowth: 0.20,
    otherGrowth: 0.02,
    ebitdaMargin: 0.215,
    exitPe: 24,
  },
  {
    name: 'Bull',
    eInfrastructureGrowth: 0.25,
    otherGrowth: 0.03,
    ebitdaMargin: 0.23,
    exitPe: 28,
  },
];

export const sterlingScenarios = sterlingScenarioInputs.map((scenario) => ({
  ...scenario,
  ...calculateSterlingValuation(scenario),
}));

export const sterlingBaseScenario = sterlingScenarios.find(
  (scenario) => scenario.name === 'Base',
)!;

export function solveSterlingEInfrastructureGrowth({
  targetPresentValue,
  assumptions,
  minimumGrowth = -0.20,
  maximumGrowth = 1,
}: {
  targetPresentValue: number;
  assumptions: Omit<SterlingValuationAssumptions, 'eInfrastructureGrowth'>;
  minimumGrowth?: number;
  maximumGrowth?: number;
}) {
  const valueAt = (growth: number) =>
    calculateSterlingValuation({ ...assumptions, eInfrastructureGrowth: growth })
      .presentValue;
  const minimumValue = valueAt(minimumGrowth);
  const maximumValue = valueAt(maximumGrowth);
  if (
    !Number.isFinite(targetPresentValue) ||
    targetPresentValue < minimumValue ||
    targetPresentValue > maximumValue
  ) {
    return null;
  }

  let low = minimumGrowth;
  let high = maximumGrowth;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    if (valueAt(middle) < targetPresentValue) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export const sterlingImpliedBaseGrowth = solveSterlingEInfrastructureGrowth({
  targetPresentValue: STERLING_CURRENT_PRICE,
  assumptions: {
    otherGrowth: 0.02,
    ebitdaMargin: 0.215,
    exitPe: 24,
  },
})!;

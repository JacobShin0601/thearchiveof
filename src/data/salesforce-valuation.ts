export const SALESFORCE_AS_OF_DATE = '2026-10-08';
export const SALESFORCE_PRICE_DATE = '2026-10-07';
export const SALESFORCE_CURRENT_PRICE = 224.56;

export const salesforceReportedData = {
  fy26Fcf: 14.4,
  fy27FcfGrowthMidpoint: 0.045,
  fy27EstimatedFcf: 15.048,
  sharesOutstanding: 823,
  fy27H1Sbc: 1.763,
  annualizedSbc: 3.526,
  cashAndMarketableSecurities: 11.403,
  strategicInvestments: 11.324,
  totalDebt: 39.288,
  fy27H1OperatingCashFlow: 7.970,
  fy27H1CapitalExpenditure: 0.316,
  fy27H1Repurchases: 27.332,
  fy27H1Dividends: 0.729,
} as const;

export interface SalesforceDcfInputs {
  startingFcf?: number;
  fcfGrowth: number;
  discountRate: number;
  terminalGrowth: number;
  forecastYears?: number;
  shares?: number;
  sbcAdjustmentRatio?: number;
}

export interface SalesforceAdvancedDcfInputs
  extends Omit<SalesforceDcfInputs, 'fcfGrowth'> {
  legacyFcfGrowth: number;
  yearFiveIncrementalAiRevenue: number;
  aiContributionMargin: number;
  crmCannibalizationRate: number;
}

export interface SalesforceProjectionRow {
  year: number;
  fcf: number;
  presentValue: number;
  legacyFcf?: number;
  aiContribution?: number;
}

function finite(name: string, value: number) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function validateCommon({
  startingFcf,
  discountRate,
  terminalGrowth,
  forecastYears,
  shares,
  sbcAdjustmentRatio,
}: Required<Omit<SalesforceDcfInputs, 'fcfGrowth'>>) {
  finite('startingFcf', startingFcf);
  finite('discountRate', discountRate);
  finite('terminalGrowth', terminalGrowth);
  finite('shares', shares);
  finite('sbcAdjustmentRatio', sbcAdjustmentRatio);
  if (startingFcf <= 0) throw new RangeError('startingFcf must be positive');
  if (discountRate <= terminalGrowth) {
    throw new RangeError('discountRate must be greater than terminalGrowth');
  }
  if (!Number.isInteger(forecastYears) || forecastYears < 1 || forecastYears > 30) {
    throw new RangeError('forecastYears must be an integer between 1 and 30');
  }
  if (shares <= 0) throw new RangeError('shares must be positive');
  if (sbcAdjustmentRatio < 0 || sbcAdjustmentRatio > 1) {
    throw new RangeError('sbcAdjustmentRatio must be between 0 and 1');
  }
}

function commonInputs(inputs: Omit<SalesforceDcfInputs, 'fcfGrowth'>) {
  return {
    startingFcf: inputs.startingFcf ?? salesforceReportedData.fy27EstimatedFcf,
    discountRate: inputs.discountRate,
    terminalGrowth: inputs.terminalGrowth,
    forecastYears: inputs.forecastYears ?? 5,
    shares: inputs.shares ?? salesforceReportedData.sharesOutstanding,
    sbcAdjustmentRatio: inputs.sbcAdjustmentRatio ?? 0,
  };
}

function finishDcf({
  projections,
  discountRate,
  terminalGrowth,
  shares,
  adjustedStartingFcf,
  startingFcf,
  sbcAdjustment,
}: {
  projections: SalesforceProjectionRow[];
  discountRate: number;
  terminalGrowth: number;
  shares: number;
  adjustedStartingFcf: number;
  startingFcf: number;
  sbcAdjustment: number;
}) {
  const last = projections.at(-1)!;
  const terminalValue = (last.fcf * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const presentValueOfTerminal = terminalValue / (1 + discountRate) ** projections.length;
  const presentValueOfForecast = projections.reduce((sum, row) => sum + row.presentValue, 0);
  const equityValue = presentValueOfForecast + presentValueOfTerminal;
  const fairValuePerShare = (equityValue * 1000) / shares;
  return {
    startingFcf,
    adjustedStartingFcf,
    sbcAdjustment,
    projections,
    terminalValue,
    presentValueOfTerminal,
    presentValueOfForecast,
    terminalValueShare: presentValueOfTerminal / equityValue,
    equityValue,
    fairValuePerShare,
    upside: fairValuePerShare / SALESFORCE_CURRENT_PRICE - 1,
    marginOfSafety: 1 - SALESFORCE_CURRENT_PRICE / fairValuePerShare,
    yearFiveFcf: last.fcf,
  };
}

export function calculateSalesforceDcf(inputs: SalesforceDcfInputs) {
  const common = commonInputs(inputs);
  validateCommon(common);
  finite('fcfGrowth', inputs.fcfGrowth);
  if (inputs.fcfGrowth <= -1) throw new RangeError('fcfGrowth must be greater than -100%');

  const sbcAdjustment = salesforceReportedData.annualizedSbc * common.sbcAdjustmentRatio;
  const adjustedStartingFcf = common.startingFcf - sbcAdjustment;
  if (adjustedStartingFcf <= 0) throw new RangeError('SBC-adjusted starting FCF must be positive');

  const projections = Array.from({ length: common.forecastYears }, (_, index) => {
    const year = index + 1;
    const fcf = adjustedStartingFcf * (1 + inputs.fcfGrowth) ** year;
    return { year, fcf, presentValue: fcf / (1 + common.discountRate) ** year };
  });

  return {
    ...inputs,
    ...common,
    ...finishDcf({
      projections,
      discountRate: common.discountRate,
      terminalGrowth: common.terminalGrowth,
      shares: common.shares,
      adjustedStartingFcf,
      startingFcf: common.startingFcf,
      sbcAdjustment,
    }),
  };
}

export function calculateAiEconomicBridge({
  grossIncrementalRevenue,
  contributionMargin,
  cannibalizationRate,
}: {
  grossIncrementalRevenue: number;
  contributionMargin: number;
  cannibalizationRate: number;
}) {
  [grossIncrementalRevenue, contributionMargin, cannibalizationRate].forEach((value, index) =>
    finite(['grossIncrementalRevenue', 'contributionMargin', 'cannibalizationRate'][index], value),
  );
  if (grossIncrementalRevenue < 0) throw new RangeError('grossIncrementalRevenue cannot be negative');
  if (contributionMargin < 0 || contributionMargin > 1) {
    throw new RangeError('contributionMargin must be between 0 and 1');
  }
  if (cannibalizationRate < 0 || cannibalizationRate > 1) {
    throw new RangeError('cannibalizationRate must be between 0 and 1');
  }
  const lostRevenue = grossIncrementalRevenue * cannibalizationRate;
  const netIncrementalRevenue = grossIncrementalRevenue - lostRevenue;
  const netFcfContribution = netIncrementalRevenue * contributionMargin;
  return { grossIncrementalRevenue, lostRevenue, netIncrementalRevenue, netFcfContribution };
}

export function calculateSalesforceAdvancedDcf(inputs: SalesforceAdvancedDcfInputs) {
  const common = commonInputs(inputs);
  validateCommon(common);
  finite('legacyFcfGrowth', inputs.legacyFcfGrowth);
  if (inputs.legacyFcfGrowth <= -1) throw new RangeError('legacyFcfGrowth must be greater than -100%');
  const bridge = calculateAiEconomicBridge({
    grossIncrementalRevenue: inputs.yearFiveIncrementalAiRevenue,
    contributionMargin: inputs.aiContributionMargin,
    cannibalizationRate: inputs.crmCannibalizationRate,
  });
  const sbcAdjustment = salesforceReportedData.annualizedSbc * common.sbcAdjustmentRatio;
  const adjustedStartingFcf = common.startingFcf - sbcAdjustment;
  if (adjustedStartingFcf <= 0) throw new RangeError('SBC-adjusted starting FCF must be positive');

  const projections = Array.from({ length: common.forecastYears }, (_, index) => {
    const year = index + 1;
    const legacyFcf = adjustedStartingFcf * (1 + inputs.legacyFcfGrowth) ** year;
    const aiContribution = bridge.netFcfContribution * (year / common.forecastYears);
    const fcf = legacyFcf + aiContribution;
    return {
      year,
      fcf,
      legacyFcf,
      aiContribution,
      presentValue: fcf / (1 + common.discountRate) ** year,
    };
  });
  return {
    ...inputs,
    ...common,
    aiBridge: bridge,
    ...finishDcf({
      projections,
      discountRate: common.discountRate,
      terminalGrowth: common.terminalGrowth,
      shares: common.shares,
      adjustedStartingFcf,
      startingFcf: common.startingFcf,
      sbcAdjustment,
    }),
  };
}

export function solveSalesforceImpliedGrowth({
  targetPrice,
  discountRate,
  terminalGrowth,
  shares = salesforceReportedData.sharesOutstanding,
  startingFcf = salesforceReportedData.fy27EstimatedFcf,
  sbcAdjustmentRatio = 0,
  minimumGrowth = -0.25,
  maximumGrowth = 0.5,
}: {
  targetPrice: number;
  discountRate: number;
  terminalGrowth: number;
  shares?: number;
  startingFcf?: number;
  sbcAdjustmentRatio?: number;
  minimumGrowth?: number;
  maximumGrowth?: number;
}) {
  finite('targetPrice', targetPrice);
  if (targetPrice <= 0) throw new RangeError('targetPrice must be positive');
  const valueAt = (fcfGrowth: number) =>
    calculateSalesforceDcf({
      fcfGrowth,
      discountRate,
      terminalGrowth,
      shares,
      startingFcf,
      sbcAdjustmentRatio,
    }).fairValuePerShare;
  if (targetPrice < valueAt(minimumGrowth) || targetPrice > valueAt(maximumGrowth)) return null;
  let low = minimumGrowth;
  let high = maximumGrowth;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2;
    if (valueAt(middle) < targetPrice) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function projectShareCount({
  annualShareChange,
  years = 5,
  startingShares = salesforceReportedData.sharesOutstanding,
}: {
  annualShareChange: number;
  years?: number;
  startingShares?: number;
}) {
  finite('annualShareChange', annualShareChange);
  if (annualShareChange <= -1) throw new RangeError('annualShareChange must be greater than -100%');
  if (startingShares <= 0) throw new RangeError('startingShares must be positive');
  return startingShares * (1 + annualShareChange) ** years;
}

export const salesforceScenarioInputs = [
  { name: 'Bear', fcfGrowth: 0.02, discountRate: 0.11, terminalGrowth: 0.02 },
  { name: 'Base', fcfGrowth: 0.07, discountRate: 0.10, terminalGrowth: 0.025 },
  { name: 'Bull', fcfGrowth: 0.12, discountRate: 0.09, terminalGrowth: 0.03 },
] as const;

export const salesforceScenarios = salesforceScenarioInputs.map((scenario) => ({
  ...scenario,
  ...calculateSalesforceDcf(scenario),
}));

export const salesforceBaseScenario = salesforceScenarios[1];
export const salesforceImpliedGrowth = solveSalesforceImpliedGrowth({
  targetPrice: SALESFORCE_CURRENT_PRICE,
  discountRate: 0.10,
  terminalGrowth: 0.025,
})!;

export const salesforceSbcImpliedGrowth = [0, 0.25, 0.5, 1].map((sbcAdjustmentRatio) => ({
  sbcAdjustmentRatio,
  impliedGrowth: solveSalesforceImpliedGrowth({
    targetPrice: SALESFORCE_CURRENT_PRICE,
    discountRate: 0.10,
    terminalGrowth: 0.025,
    sbcAdjustmentRatio,
  })!,
}));

export const salesforceMosPrices = [0.10, 0.15, 0.20, 0.25, 0.30].map((margin) => ({
  margin,
  price: salesforceBaseScenario.fairValuePerShare * (1 - margin),
}));

export interface SalesforceQuarterlyGrowthRow {
  period: string;
  revenueGrowth: number;
  crpoGrowth: number;
  estimatedExInformaticaGrowth?: number;
}

export const salesforceQuarterlyGrowth: readonly SalesforceQuarterlyGrowthRow[] = [
  { period: 'FY25 Q1', revenueGrowth: 0.11, crpoGrowth: 0.10 },
  { period: 'FY25 Q2', revenueGrowth: 0.08, crpoGrowth: 0.10 },
  { period: 'FY25 Q3', revenueGrowth: 0.08, crpoGrowth: 0.10 },
  { period: 'FY25 Q4', revenueGrowth: 0.08, crpoGrowth: 0.09 },
  { period: 'FY26 Q1', revenueGrowth: 0.08, crpoGrowth: 0.12 },
  { period: 'FY26 Q2', revenueGrowth: 0.10, crpoGrowth: 0.11 },
  { period: 'FY26 Q3', revenueGrowth: 0.09, crpoGrowth: 0.11 },
  { period: 'FY26 Q4', revenueGrowth: 0.12, crpoGrowth: 0.16, estimatedExInformaticaGrowth: 0.08 },
  { period: 'FY27 Q1', revenueGrowth: 0.13, crpoGrowth: 0.14, estimatedExInformaticaGrowth: 0.0875 },
  { period: 'FY27 Q2', revenueGrowth: 0.11, crpoGrowth: 0.14, estimatedExInformaticaGrowth: 0.0638 },
];

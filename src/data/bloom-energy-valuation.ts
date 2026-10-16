export const BLOOM_PRICE_DATE = '2026-10-15';
export const BLOOM_CURRENT_PRICE = 236.30;

/**
 * USD millions unless otherwise stated. Reported Q2 FY2026 values come from
 * Bloom's 10-Q/A and Q2 release; 2027–30 values are author assumptions.
 */
export const bloomReported = {
  fy2026RevenueGuidanceMidpoint: 4_050,
  q2Revenue: 1_065.4,
  q2RevenueGrowth: 1.655,
  h1OperatingCashFlow: 300.042,
  h1PpeCapex: 77.823,
  h1DeferredRevenueAndDepositsIncrease: 301.232,
  h1AccountsPayableIncrease: 100.422,
  cashAndRestrictedCash: 2_688.508,
  convertibleDebtPrincipal: 2_674.78,
  dilutedShares: 235.0,
} as const;

export type BloomScenarioName = 'bear' | 'base' | 'bull';

export interface BloomAssumptions {
  deliveredGw: readonly [number, number, number, number];
  equipmentRevenuePerMw: number;
  installationRevenueRatio: number;
  openingInstalledGw: number;
  serviceAttachRate: number;
  serviceRevenuePerMw: number;
  electricityRevenue: readonly [number, number, number, number];
  productGrossMargin: number;
  installationGrossMargin: number;
  serviceGrossMargin: number;
  electricityGrossMargin: number;
  operatingExpenseRatio: number;
  taxRate: number;
  depreciationRate: number;
  capexRate: number;
  netWorkingCapitalRate: number;
  discountRate: number;
  terminalGrowth: number;
  dilutedShares: number;
  netDebt: number;
}

export const bloomScenarios: Record<BloomScenarioName, BloomAssumptions> = {
  bear: {
    deliveredGw: [1.35, 1.45, 1.55, 1.65],
    equipmentRevenuePerMw: 2.10,
    installationRevenueRatio: 0.14,
    openingInstalledGw: 3.0,
    serviceAttachRate: 0.85,
    serviceRevenuePerMw: 0.14,
    electricityRevenue: [80, 80, 85, 90],
    productGrossMargin: 0.27,
    installationGrossMargin: 0.08,
    serviceGrossMargin: 0.24,
    electricityGrossMargin: 0.18,
    operatingExpenseRatio: 0.18,
    taxRate: 0.21,
    depreciationRate: 0.03,
    capexRate: 0.035,
    netWorkingCapitalRate: 0.07,
    discountRate: 0.11,
    terminalGrowth: 0.02,
    dilutedShares: 235,
    netDebt: -13.7,
  },
  base: {
    deliveredGw: [1.70, 2.00, 2.30, 2.60],
    equipmentRevenuePerMw: 2.10,
    installationRevenueRatio: 0.12,
    openingInstalledGw: 3.0,
    serviceAttachRate: 0.90,
    serviceRevenuePerMw: 0.145,
    electricityRevenue: [80, 85, 90, 100],
    productGrossMargin: 0.34,
    installationGrossMargin: 0.15,
    serviceGrossMargin: 0.32,
    electricityGrossMargin: 0.20,
    operatingExpenseRatio: 0.13,
    taxRate: 0.21,
    depreciationRate: 0.03,
    capexRate: 0.035,
    netWorkingCapitalRate: 0.07,
    discountRate: 0.095,
    terminalGrowth: 0.025,
    dilutedShares: 235,
    netDebt: -13.7,
  },
  bull: {
    deliveredGw: [2.00, 2.65, 3.35, 4.00],
    equipmentRevenuePerMw: 2.20,
    installationRevenueRatio: 0.10,
    openingInstalledGw: 3.0,
    serviceAttachRate: 0.95,
    serviceRevenuePerMw: 0.155,
    electricityRevenue: [90, 100, 115, 130],
    productGrossMargin: 0.42,
    installationGrossMargin: 0.20,
    serviceGrossMargin: 0.40,
    electricityGrossMargin: 0.25,
    operatingExpenseRatio: 0.10,
    taxRate: 0.21,
    depreciationRate: 0.03,
    capexRate: 0.035,
    netWorkingCapitalRate: 0.07,
    discountRate: 0.085,
    terminalGrowth: 0.03,
    dilutedShares: 245,
    netDebt: -13.7,
  },
};

const YEARS = [2027, 2028, 2029, 2030] as const;

export function scaleBloomDeliveredGw(
  deliveredGw: BloomAssumptions['deliveredGw'],
  scale: number,
): BloomAssumptions['deliveredGw'] {
  return [deliveredGw[0] * scale, deliveredGw[1] * scale, deliveredGw[2] * scale, deliveredGw[3] * scale];
}

function finite(name: string, value: number) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export function assertBloomInputs(inputs: BloomAssumptions) {
  const ratios = [
    'installationRevenueRatio', 'serviceAttachRate', 'productGrossMargin', 'installationGrossMargin',
    'serviceGrossMargin', 'electricityGrossMargin', 'operatingExpenseRatio', 'taxRate',
    'depreciationRate', 'capexRate', 'netWorkingCapitalRate',
  ] as const;
  for (const key of ratios) {
    finite(key, inputs[key]);
    if (inputs[key] < 0 || inputs[key] > 1) throw new RangeError(`${key} must be between 0 and 1`);
  }
  for (const value of inputs.deliveredGw) if (!Number.isFinite(value) || value < 0 || value > 25) throw new RangeError('Delivered GW must be between 0 and 25');
  if (inputs.equipmentRevenuePerMw <= 0 || inputs.equipmentRevenuePerMw > 10) throw new RangeError('Equipment revenue per MW must be positive and plausible');
  if (inputs.serviceRevenuePerMw < 0 || inputs.serviceRevenuePerMw > 2) throw new RangeError('Service revenue per MW must be between 0 and 2');
  if (inputs.openingInstalledGw < 0 || inputs.openingInstalledGw > 30) throw new RangeError('Opening installed GW must be between 0 and 30');
  if (inputs.discountRate <= 0 || inputs.discountRate > 0.3) throw new RangeError('Discount rate must be between 0% and 30%');
  if (inputs.terminalGrowth < -0.05 || inputs.terminalGrowth >= inputs.discountRate) throw new RangeError('Terminal growth must be below the discount rate');
  if (inputs.dilutedShares <= 0 || inputs.dilutedShares > 1_000) throw new RangeError('Diluted shares must be positive');
}

export function calculateBloomDcf(inputs: BloomAssumptions) {
  assertBloomInputs(inputs);
  let installedGw = inputs.openingInstalledGw;
  let priorRevenue: number = bloomReported.fy2026RevenueGuidanceMidpoint;
  const projections = YEARS.map((year, index) => {
    const deliveredGw = inputs.deliveredGw[index];
    const deliveredMw = deliveredGw * 1_000;
    const productRevenue = deliveredMw * inputs.equipmentRevenuePerMw;
    const installationRevenue = productRevenue * inputs.installationRevenueRatio;
    const averageInstalledGw = installedGw + deliveredGw / 2;
    const serviceRevenue = averageInstalledGw * 1_000 * inputs.serviceAttachRate * inputs.serviceRevenuePerMw;
    const electricityRevenue = inputs.electricityRevenue[index];
    const revenue = productRevenue + installationRevenue + serviceRevenue + electricityRevenue;
    const grossProfit = productRevenue * inputs.productGrossMargin
      + installationRevenue * inputs.installationGrossMargin
      + serviceRevenue * inputs.serviceGrossMargin
      + electricityRevenue * inputs.electricityGrossMargin;
    const ebit = grossProfit - revenue * inputs.operatingExpenseRatio;
    const nopat = ebit * (1 - inputs.taxRate);
    const depreciation = revenue * inputs.depreciationRate;
    const capex = revenue * inputs.capexRate;
    const changeInNwc = Math.max(0, revenue - priorRevenue) * inputs.netWorkingCapitalRate;
    const fcff = nopat + depreciation - capex - changeInNwc;
    const presentValue = fcff / (1 + inputs.discountRate) ** (index + 1);
    installedGw += deliveredGw;
    priorRevenue = revenue;
    return { year, deliveredGw, averageInstalledGw, productRevenue, installationRevenue, serviceRevenue, electricityRevenue, revenue, grossProfit, ebit, nopat, depreciation, capex, changeInNwc, fcff, presentValue };
  });
  const final = projections.at(-1)!;
  const terminalValue = final.fcff * (1 + inputs.terminalGrowth) / (inputs.discountRate - inputs.terminalGrowth);
  const pvForecast = projections.reduce((sum, row) => sum + row.presentValue, 0);
  const pvTerminal = terminalValue / (1 + inputs.discountRate) ** projections.length;
  const enterpriseValue = pvForecast + pvTerminal;
  const equityValue = enterpriseValue - inputs.netDebt;
  const fairValuePerShare = equityValue / inputs.dilutedShares;
  return { ...inputs, projections, terminalValue, pvForecast, pvTerminal, enterpriseValue, equityValue, fairValuePerShare, upside: fairValuePerShare / BLOOM_CURRENT_PRICE - 1, marginOfSafety: 1 - BLOOM_CURRENT_PRICE / fairValuePerShare };
}

export function solveBloomDeliveryScale({ targetPrice, assumptions }: { targetPrice: number; assumptions: BloomAssumptions }) {
  finite('targetPrice', targetPrice);
  if (targetPrice <= 0) throw new RangeError('Target price must be positive');
  const at = (scale: number) => calculateBloomDcf({ ...assumptions, deliveredGw: scaleBloomDeliveredGw(assumptions.deliveredGw, scale) }).fairValuePerShare;
  if (targetPrice < at(0.2) || targetPrice > at(5)) return null;
  let low = 0.2; let high = 5;
  for (let i = 0; i < 100; i += 1) {
    const middle = (low + high) / 2;
    if (at(middle) < targetPrice) low = middle; else high = middle;
  }
  const scale = (low + high) / 2;
  return { scale, deliveredGw2030: assumptions.deliveredGw[3] * scale, fairValuePerShare: at(scale) };
}

export const bloomScenarioResults = (Object.keys(bloomScenarios) as BloomScenarioName[]).map((name) => ({ name, ...calculateBloomDcf(bloomScenarios[name]) }));
export const bloomBaseScenario = bloomScenarioResults.find((scenario) => scenario.name === 'base')!;
export const bloomImpliedDelivery = solveBloomDeliveryScale({ targetPrice: BLOOM_CURRENT_PRICE, assumptions: bloomScenarios.base });
export const bloomMosPrices = [0.2, 0.25, 0.3].map((margin) => ({ margin, price: bloomBaseScenario.fairValuePerShare * (1 - margin) }));

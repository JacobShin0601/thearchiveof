export const CLOVE_VALUATION_BASE_YEAR = 2027;
export const CLOVE_VALUATION_TARGET_YEAR = 2031;

export interface ClobeValuationAssumptions {
  entryPreMoney: number;
  investment: number;
  cumulativeDilution: number;
  revenue2027: number;
  revenueGrowth: number;
  operatingMargin: number;
  taxRate: number;
  exitPe: number;
  requiredIrr: number;
  yearsToExit: number;
}

export function calculateClobeValuation(assumptions: ClobeValuationAssumptions) {
  const yearsOfGrowth = CLOVE_VALUATION_TARGET_YEAR - CLOVE_VALUATION_BASE_YEAR;
  const revenue2031 = assumptions.revenue2027 * (1 + assumptions.revenueGrowth) ** yearsOfGrowth;
  const operatingIncome2031 = revenue2031 * assumptions.operatingMargin;
  const netIncome2031 = operatingIncome2031 * (1 - assumptions.taxRate);
  const exitEquityValue = netIncome2031 * assumptions.exitPe;
  const postMoney = assumptions.entryPreMoney + assumptions.investment;
  const ownershipAtEntry = assumptions.investment / postMoney;
  const ownershipAtExit = ownershipAtEntry * (1 - assumptions.cumulativeDilution);
  const exitProceeds = exitEquityValue * ownershipAtExit;
  const moic = exitProceeds / assumptions.investment;
  const irr = moic > 0 ? moic ** (1 / assumptions.yearsToExit) - 1 : -1;
  const requiredProceeds = assumptions.investment * (1 + assumptions.requiredIrr) ** assumptions.yearsToExit;
  const maximumPostMoney = (exitEquityValue * assumptions.investment * (1 - assumptions.cumulativeDilution)) / requiredProceeds;
  const maximumPreMoney = maximumPostMoney - assumptions.investment;

  return {
    ...assumptions,
    revenue2031,
    operatingIncome2031,
    netIncome2031,
    exitEquityValue,
    postMoney,
    ownershipAtEntry,
    ownershipAtExit,
    exitProceeds,
    moic,
    irr,
    requiredProceeds,
    maximumPostMoney,
    maximumPreMoney,
  };
}

export const clobeScenarios = {
  bear: {
    entryPreMoney: 2_000,
    investment: 200,
    cumulativeDilution: 0.20,
    revenue2027: 400,
    revenueGrowth: 0.225,
    operatingMargin: 0.12,
    taxRate: 0.25,
    exitPe: 12,
    requiredIrr: 0.30,
    yearsToExit: 4,
  },
  base: {
    entryPreMoney: 2_000,
    investment: 200,
    cumulativeDilution: 0.20,
    revenue2027: 800,
    revenueGrowth: 0.355,
    operatingMargin: 0.30,
    taxRate: 0.25,
    exitPe: 18,
    requiredIrr: 0.30,
    yearsToExit: 4,
  },
  bull: {
    entryPreMoney: 2_000,
    investment: 200,
    cumulativeDilution: 0.20,
    revenue2027: 1_200,
    revenueGrowth: 0.351,
    operatingMargin: 0.45,
    taxRate: 0.25,
    exitPe: 22,
    requiredIrr: 0.30,
    yearsToExit: 4,
  },
} satisfies Record<string, ClobeValuationAssumptions>;

export const clobeBaseScenario = calculateClobeValuation(clobeScenarios.base);

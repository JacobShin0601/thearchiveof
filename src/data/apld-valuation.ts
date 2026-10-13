export const APLD_PRICE_DATE = '2026-10-13';
export const APLD_CURRENT_PRICE = 22.44;

export const apldReported = {
  asOf: '2026-08-31',
  q1Revenue: 341.9,
  hpcRevenue: 262.6,
  baseRent: 65.8,
  tenantBuildServices: 183.5,
  tenantRecoveries: 13.3,
  hpcNoi: 58.8,
  adjustedEbitda: 64.4,
  q1Capex: 2_070,
  redeemableNci: 2_010,
  seriesG: 124.9,
  seriesGConversionShares: 5.2,
} as const;

export const apldCampuses = [
  { name: 'Polaris Forge 1', contractedMw: 400, plannedMw: 400, tenant: 'CoreWeave', operationalMw: 250 },
  { name: 'Polaris Forge 2', contractedMw: 200, plannedMw: 300, tenant: 'Investment-grade hyperscaler', operationalMw: 0 },
  { name: 'Polaris Forge 3', contractedMw: 300, plannedMw: 300, tenant: 'Investment-grade hyperscaler', operationalMw: 0 },
  { name: 'Delta Forge 1', contractedMw: 300, plannedMw: 300, tenant: 'Investment-grade hyperscaler', operationalMw: 0 },
  { name: 'Delta Forge 2', contractedMw: 210, plannedMw: 210, tenant: 'Investment-grade hyperscaler', operationalMw: 0 },
] as const;

export const apldContractedRent = [
  { year: 2027, rent: 468.0, reported: true },
  { year: 2028, rent: 1_579.5, reported: true },
  { year: 2029, rent: 2_360.6, reported: true },
  { year: 2030, rent: 2_371.4, reported: true },
  { year: 2031, rent: 2_371.4, reported: true },
] as const;
export const APLD_THEREAFTER_RENT = 26_580.2;
export const APLD_TOTAL_CONTRACTED_RENT = 35_731.0;

export interface ApldAssumptions {
  noiMargin: number;
  residualCapexPerMw: number;
  discountRate: number;
  relettingRetention: number;
  additionalMw: number;
}

export const apldScenarios = {
  bear: { noiMargin: 0.80, residualCapexPerMw: 13, discountRate: 0.11, relettingRetention: 0.55, additionalMw: 0 },
  base: { noiMargin: 0.86, residualCapexPerMw: 12, discountRate: 0.085, relettingRetention: 0.85, additionalMw: 0 },
  bull: { noiMargin: 0.89, residualCapexPerMw: 11, discountRate: 0.07, relettingRetention: 1, additionalMw: 200 },
} as const;

export function assertApldInputs(inputs: ApldAssumptions) {
  for (const [name, value] of Object.entries(inputs)) if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  if (inputs.noiMargin < 0 || inputs.noiMargin > 1) throw new RangeError('NOI margin must be between 0 and 1');
  if (inputs.residualCapexPerMw < 0 || inputs.residualCapexPerMw > 25) throw new RangeError('Residual capex per MW must be between 0 and 25');
  if (inputs.discountRate <= 0 || inputs.discountRate > 0.25) throw new RangeError('Discount rate must be between 0% and 25%');
  if (inputs.relettingRetention < 0 || inputs.relettingRetention > 1.5) throw new RangeError('Reletting retention must be between 0% and 150%');
  if (inputs.additionalMw < 0 || inputs.additionalMw > 2_000) throw new RangeError('Additional MW must be between 0 and 2,000');
}

/** A transparent scenario proxy, not company guidance or a project-level appraisal. */
export function calculateApldScenario(inputs: ApldAssumptions) {
  assertApldInputs(inputs);
  const reportedRentPv = apldContractedRent.reduce((sum, row, index) => sum + (row.rent * inputs.noiMargin) / (1 + inputs.discountRate) ** (index + 1), 0);
  const thereafterNoi = APLD_THEREAFTER_RENT * inputs.noiMargin * inputs.relettingRetention;
  const thereafterPv = thereafterNoi / (1 + inputs.discountRate) ** 5 / inputs.discountRate;
  const residualCapex = (1_410 + inputs.additionalMw) * inputs.residualCapexPerMw;
  // Simple-mode additional MW is an already-contracted positive-NPV project proxy,
  // not uncontracted pipeline capacity. Its $15M/MW gross-value anchor is editable
  // only through the Advanced model planned for the next research revision.
  const additionalProjectValue = inputs.additionalMw * 15;
  // Scaling anchor chosen only to make the lab a sensitivity tool; capital claims remain explicitly unmodelled.
  const grossProjectValue = reportedRentPv + thereafterPv - residualCapex + additionalProjectValue;
  const commonValueProxy = Math.max(0, grossProjectValue * 0.13);
  const dilutedShares = 391.78;
  const fairValue = (commonValueProxy * 1_000) / dilutedShares;
  return { ...inputs, reportedRentPv, thereafterPv, residualCapex, additionalProjectValue, grossProjectValue, commonValueProxy, dilutedShares, fairValue, marginOfSafety: 1 - APLD_CURRENT_PRICE / fairValue };
}

export function solveApldAdditionalMw({ targetPrice, assumptions }: { targetPrice: number; assumptions: Omit<ApldAssumptions, 'additionalMw'> }) {
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new RangeError('Target price must be positive');
  const low = calculateApldScenario({ ...assumptions, additionalMw: 0 }).fairValue;
  const high = calculateApldScenario({ ...assumptions, additionalMw: 2_000 }).fairValue;
  if (targetPrice < low || targetPrice > high) return null;
  let lo = 0; let hi = 2_000;
  for (let i = 0; i < 80; i += 1) { const mid = (lo + hi) / 2; if (calculateApldScenario({ ...assumptions, additionalMw: mid }).fairValue < targetPrice) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export const apldPreliminaryFairValues = { bear: 0, base: 5.02, bull: 26.18 } as const;
export const apldContractedMw = apldCampuses.reduce((sum, campus) => sum + campus.contractedMw, 0);
export const apldPlannedMw = apldCampuses.reduce((sum, campus) => sum + campus.plannedMw, 0);

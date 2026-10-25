export type VentureArchetype = 'gateway' | 'bas';

export interface CybersecurityVentureAssumptions {
  archetype: VentureArchetype;
  investment: number;
  entryPreMoney: number;
  cumulativeDilution: number;
  yearsToExit: number;
  targetIrr: number;
  netDebt: number;
  exitRevenueMultiple: number;
  exitEbitdaMultiple: number;
  newCustomers: number;
  annualCustomerGrowth: number;
  retentionAndExpansion: number;
  subscriptionAcv: number;
  servicesRevenuePerCustomer: number;
  productRevenueMix: number;
  platformFixedCost: number;
  deliveryCostPerCustomer: number;
  partnerCommissionRate: number;
  grossMarginOnProduct: number;
  grossMarginOnServices: number;
  operatingExpenseRatio: number;
}

export interface CybersecurityVentureResult extends CybersecurityVentureAssumptions {
  terminalCustomers: number;
  exitYearNewCustomers: number;
  customerCohortRevenueUnits: number;
  subscriptionRevenue: number;
  servicesRevenue: number;
  terminalRevenue: number;
  blendedGrossMargin: number;
  grossProfit: number;
  ebitda: number;
  partnerDistributionCost: number;
  exitEnterpriseValue: number;
  exitEnterpriseValueFromEbitda: number | null;
  impliedExitEbitdaMultiple: number | null;
  exitEquityValue: number;
  ownershipAtEntry: number;
  ownershipAtExit: number;
  exitProceeds: number;
  moic: number | null;
  irr: number | null;
  maximumPostMoney: number;
  maximumPreMoney: number;
  targetIsFeasible: boolean;
}

const finite = (name: string, value: number) => {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
};

export function calculateCybersecurityVenture(
  assumptions: CybersecurityVentureAssumptions,
): CybersecurityVentureResult {
  Object.entries(assumptions).forEach(([name, value]) => {
    if (typeof value === 'number') finite(name, value);
  });
  if (assumptions.investment <= 0) throw new Error('investment must be greater than zero');
  if (assumptions.entryPreMoney < 0) throw new Error('entryPreMoney cannot be negative');
  if (assumptions.cumulativeDilution < 0 || assumptions.cumulativeDilution > 1) throw new Error('cumulativeDilution must be between 0 and 1');
  if (assumptions.yearsToExit <= 0) throw new Error('yearsToExit must be greater than zero');
  if (assumptions.targetIrr <= -1) throw new Error('targetIrr must be greater than -100%');

  const { yearsToExit, annualCustomerGrowth, retentionAndExpansion } = assumptions;
  const cohortYears = Math.floor(yearsToExit);
  const customerCohorts = Array.from({ length: cohortYears }, (_, year) => {
    const acquired = assumptions.newCustomers * ((1 + annualCustomerGrowth) ** year);
    const revenueRetention = retentionAndExpansion ** Math.max(0, cohortYears - 1 - year);
    return { acquired, revenueUnits: acquired * revenueRetention };
  });
  const terminalCustomers = Math.max(0, customerCohorts.reduce((sum, cohort) => sum + cohort.acquired, 0));
  const exitYearNewCustomers = customerCohorts.at(-1)?.acquired ?? 0;
  const customerCohortRevenueUnits = customerCohorts.reduce((sum, cohort) => sum + cohort.revenueUnits, 0);
  const terminalRevenue = customerCohortRevenueUnits * (assumptions.subscriptionAcv + assumptions.servicesRevenuePerCustomer);
  const subscriptionRevenue = terminalRevenue * assumptions.productRevenueMix;
  const servicesRevenue = terminalRevenue - subscriptionRevenue;
  const productGrossProfit = subscriptionRevenue * assumptions.grossMarginOnProduct;
  const serviceGrossProfit = servicesRevenue * assumptions.grossMarginOnServices;
  const grossProfit = productGrossProfit + serviceGrossProfit - assumptions.platformFixedCost - terminalCustomers * assumptions.deliveryCostPerCustomer;
  const blendedGrossMargin = terminalRevenue > 0 ? grossProfit / terminalRevenue : 0;
  const partnerDistributionCost = terminalRevenue * assumptions.partnerCommissionRate;
  const ebitda = grossProfit - terminalRevenue * assumptions.operatingExpenseRatio - partnerDistributionCost;
  const exitEnterpriseValue = terminalRevenue * assumptions.exitRevenueMultiple;
  const exitEnterpriseValueFromEbitda = ebitda > 0 ? ebitda * assumptions.exitEbitdaMultiple : null;
  const impliedExitEbitdaMultiple = ebitda > 0 ? exitEnterpriseValue / ebitda : null;
  const exitEquityValue = exitEnterpriseValue - assumptions.netDebt;
  const postMoney = assumptions.entryPreMoney + assumptions.investment;
  const ownershipAtEntry = assumptions.investment / postMoney;
  const ownershipAtExit = ownershipAtEntry * (1 - assumptions.cumulativeDilution);
  const exitProceeds = Math.max(0, exitEquityValue) * ownershipAtExit;
  const moic = exitProceeds > 0 ? exitProceeds / assumptions.investment : null;
  const irr = moic && moic > 0 ? moic ** (1 / yearsToExit) - 1 : null;
  const maximumPostMoney = exitEquityValue > 0
    ? exitEquityValue * (1 - assumptions.cumulativeDilution) / ((1 + assumptions.targetIrr) ** yearsToExit)
    : 0;
  const maximumPreMoney = maximumPostMoney - assumptions.investment;

  return { ...assumptions, terminalCustomers, exitYearNewCustomers, customerCohortRevenueUnits, subscriptionRevenue, servicesRevenue, terminalRevenue, blendedGrossMargin, grossProfit, partnerDistributionCost, ebitda, exitEnterpriseValue, exitEnterpriseValueFromEbitda, impliedExitEbitdaMultiple, exitEquityValue, ownershipAtEntry, ownershipAtExit, exitProceeds, moic, irr, maximumPostMoney, maximumPreMoney, targetIsFeasible: maximumPreMoney >= 0 };
}

export const cybersecurityVentureScenarios: Record<VentureArchetype, Record<'bear' | 'base' | 'bull', CybersecurityVentureAssumptions>> = {
  gateway: {
    bear: { archetype: 'gateway', investment: 200, entryPreMoney: 1200, cumulativeDilution: .35, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 3, exitEbitdaMultiple: 12, newCustomers: 18, annualCustomerGrowth: .20, retentionAndExpansion: .92, subscriptionAcv: 3.5, servicesRevenuePerCustomer: 2.5, productRevenueMix: .45, platformFixedCost: 20, deliveryCostPerCustomer: .9, partnerCommissionRate: .12, grossMarginOnProduct: .72, grossMarginOnServices: .35, operatingExpenseRatio: .55 },
    base: { archetype: 'gateway', investment: 200, entryPreMoney: 1200, cumulativeDilution: .30, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 6, exitEbitdaMultiple: 18, newCustomers: 24, annualCustomerGrowth: .35, retentionAndExpansion: 1.04, subscriptionAcv: 4.5, servicesRevenuePerCustomer: 1.7, productRevenueMix: .70, platformFixedCost: 24, deliveryCostPerCustomer: .45, partnerCommissionRate: .10, grossMarginOnProduct: .80, grossMarginOnServices: .42, operatingExpenseRatio: .42 },
    bull: { archetype: 'gateway', investment: 200, entryPreMoney: 1200, cumulativeDilution: .25, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 10, exitEbitdaMultiple: 24, newCustomers: 30, annualCustomerGrowth: .48, retentionAndExpansion: 1.10, subscriptionAcv: 5.5, servicesRevenuePerCustomer: 1, productRevenueMix: .85, platformFixedCost: 28, deliveryCostPerCustomer: .25, partnerCommissionRate: .08, grossMarginOnProduct: .84, grossMarginOnServices: .45, operatingExpenseRatio: .34 },
  },
  bas: {
    bear: { archetype: 'bas', investment: 200, entryPreMoney: 900, cumulativeDilution: .35, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 3, exitEbitdaMultiple: 12, newCustomers: 14, annualCustomerGrowth: .18, retentionAndExpansion: .90, subscriptionAcv: 2.8, servicesRevenuePerCustomer: 4.2, productRevenueMix: .35, platformFixedCost: 16, deliveryCostPerCustomer: 1.8, partnerCommissionRate: .18, grossMarginOnProduct: .72, grossMarginOnServices: .30, operatingExpenseRatio: .56 },
    base: { archetype: 'bas', investment: 200, entryPreMoney: 900, cumulativeDilution: .30, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 5, exitEbitdaMultiple: 16, newCustomers: 20, annualCustomerGrowth: .35, retentionAndExpansion: 1.03, subscriptionAcv: 3.8, servicesRevenuePerCustomer: 2.2, productRevenueMix: .65, platformFixedCost: 20, deliveryCostPerCustomer: .8, partnerCommissionRate: .15, grossMarginOnProduct: .78, grossMarginOnServices: .38, operatingExpenseRatio: .44 },
    bull: { archetype: 'bas', investment: 200, entryPreMoney: 900, cumulativeDilution: .25, yearsToExit: 5, targetIrr: .30, netDebt: 0, exitRevenueMultiple: 8, exitEbitdaMultiple: 22, newCustomers: 26, annualCustomerGrowth: .45, retentionAndExpansion: 1.08, subscriptionAcv: 4.5, servicesRevenuePerCustomer: 1.3, productRevenueMix: .80, platformFixedCost: 24, deliveryCostPerCustomer: .45, partnerCommissionRate: .12, grossMarginOnProduct: .83, grossMarginOnServices: .42, operatingExpenseRatio: .36 },
  },
};

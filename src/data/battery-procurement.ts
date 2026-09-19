/** Fictional, discrete procurement scenarios; never real company data. */
export const scenarios = [
  { name: 'A', costIndex: 100, carbonIndex: 100, recycledContent: 20, supplyRisk: 'Medium' },
  { name: 'B', costIndex: 102, carbonIndex: 85, recycledContent: 30, supplyRisk: 'Medium' },
  { name: 'C', costIndex: 104, carbonIndex: 75, recycledContent: 40, supplyRisk: 'Low' },
  { name: 'D', costIndex: 108, carbonIndex: 90, recycledContent: 25, supplyRisk: 'High' },
  { name: 'E', costIndex: 106, carbonIndex: 70, recycledContent: 45, supplyRisk: 'Medium' },
] as const;
export const efficientScenarios = scenarios.filter(a => !scenarios.some(b =>
  b.costIndex <= a.costIndex && b.carbonIndex <= a.carbonIndex &&
  (b.costIndex < a.costIndex || b.carbonIndex < a.carbonIndex)));
// Re-solve over the SAME finite candidate set; no interpolation or hidden candidates.
export const requirementSweep = [100, 90, 80, 75, 70].map(target => {
  const best = [...scenarios].filter(s => s.carbonIndex <= target)
    .sort((a,b) => a.costIndex - b.costIndex || a.carbonIndex - b.carbonIndex)[0];
  return { target, best };
});

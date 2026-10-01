export function poissonPmf(mean: number, k: number) {
  if (!Number.isFinite(mean) || mean < 0 || !Number.isInteger(k) || k < 0) return 0;
  let probability = Math.exp(-mean);
  for (let i = 1; i <= k; i += 1) probability *= mean / i;
  return probability;
}

export function poissonCdf(mean: number, k: number) {
  if (!Number.isFinite(mean) || mean < 0 || k < 0) return 0;
  const limit = Math.floor(k);
  let probability = Math.exp(-mean);
  let total = probability;
  for (let i = 1; i <= limit; i += 1) {
    probability *= mean / i;
    total += probability;
  }
  return Math.min(1, Math.max(0, total));
}

export function stockoutProbability(mean: number, inventory: number) {
  return Math.max(0, 1 - poissonCdf(mean, Math.max(0, Math.floor(inventory))));
}

export function expectedShortage(mean: number, inventory: number) {
  const q = Math.max(0, Math.floor(inventory));
  const stockout = stockoutProbability(mean, q);
  return Math.max(0, mean * (1 - poissonCdf(mean, q - 1)) - q * stockout);
}

export function expectedLeftover(mean: number, inventory: number) {
  const q = Math.max(0, Math.floor(inventory));
  return Math.max(0, q - mean + expectedShortage(mean, q));
}

export function expectedMismatchCost(mean: number, inventory: number, underageCost: number, overageCost: number) {
  return Math.max(0, underageCost) * expectedShortage(mean, inventory)
    + Math.max(0, overageCost) * expectedLeftover(mean, inventory);
}

export function poissonQuantile(mean: number, probability: number) {
  const target = Math.min(0.99999, Math.max(0.00001, probability));
  const ceiling = Math.max(20, Math.ceil(mean + 12 * Math.sqrt(Math.max(mean, 1)) + 20));
  for (let q = 0; q <= ceiling; q += 1) {
    if (poissonCdf(mean, q) >= target) return q;
  }
  return ceiling;
}

export function costOptimalInventory(mean: number, underageCost: number, overageCost: number) {
  const cu = Math.max(0, underageCost);
  const co = Math.max(0, overageCost);
  if (cu + co === 0) return Math.max(0, Math.round(mean));
  return poissonQuantile(mean, cu / (cu + co));
}

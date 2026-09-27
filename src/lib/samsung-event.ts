/** Historical close series returned by the aikstockdata API: [YYYYMMDD, close, volume?]. */
export type PriceSeries = [string, number, number?][];

export const ANNOUNCEMENT_DATE = '20260707';
export const BASE_DATE = '20260706';

export function surprisePercent(actual: number, expected: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected <= 0) return NaN;
  return (actual / expected - 1) * 100;
}

export function difference(a: number, b: number): number {
  return a - b;
}

/** Return from the first displayed close to the event-eve close. */
export function preEventReturn(rebasedStart: number): number {
  const startFactor = 1 + rebasedStart / 100;
  return startFactor > 0 ? (1 / startFactor - 1) * 100 : NaN;
}

export function eventRows(samsung: PriceSeries, hynix: PriceSeries, kospi: PriceSeries, halfWindow: number) {
  const sam = new Map(samsung.map(([date, close]) => [date, close]));
  const hyn = new Map(hynix.map(([date, close]) => [date, close]));
  const idx = new Map(kospi.map(([date, close]) => [date, close]));
  const dates = [...sam.keys()].filter((date) => hyn.has(date) && idx.has(date)).sort();
  const event = dates.indexOf(ANNOUNCEMENT_DATE);
  if (event < 0 || dates[event - 1] !== BASE_DATE || ![5, 10, 60].includes(halfWindow)) return [];
  const baseSam = sam.get(BASE_DATE)!;
  const baseHyn = hyn.get(BASE_DATE)!;
  const baseIdx = idx.get(BASE_DATE)!;
  if (![baseSam, baseHyn, baseIdx].every((price) => Number.isFinite(price) && price > 0)) return [];
  const afterWindow = halfWindow === 60 ? 10 : halfWindow;
  return dates.slice(Math.max(0, event - halfWindow), event + afterWindow + 1).map((date) => ({
    date,
    samsung: ((sam.get(date)! / baseSam) - 1) * 100,
    hynix: ((hyn.get(date)! / baseHyn) - 1) * 100,
    kospi: ((idx.get(date)! / baseIdx) - 1) * 100,
  }));
}

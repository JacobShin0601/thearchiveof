import { SERIES } from '../data/series.ts';

export function seriesDefinition(name: string) {
  return SERIES.find((series) => series.name === name);
}

export function isCatalogTopLevelSeries(name: string): boolean {
  const definition = seriesDefinition(name);
  if (!definition) return true;
  return !('catalogTopLevel' in definition && definition.catalogTopLevel === false);
}

export function catalogTopLevelSeriesNames<T extends string>(names: Iterable<T>): T[] {
  return [...names].filter((name) => isCatalogTopLevelSeries(name));
}

export function sortSeriesNames<T extends string>(names: T[]) {
  const order = new Map<string, number>(SERIES.map((series, index) => [series.name, index]));
  return names.sort((a, b) => {
    const rankDifference = (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER);
    return rankDifference || a.localeCompare(b);
  });
}

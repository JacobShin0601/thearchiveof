import type { SeriesMode } from '../data/series.ts';
import { AI_VALUE_CHAIN_SERIES, SERIES } from '../data/series.ts';

export { AI_VALUE_CHAIN_SERIES };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function seriesDefinition(name: string) {
  return SERIES.find((series) => series.name === name);
}

export function seriesSlug(name: string): string {
  const definition = seriesDefinition(name);
  return definition?.slug ?? slugify(name);
}

export function seriesDisplayTitle(name: string, language: 'ko' | 'en'): string {
  const definition = seriesDefinition(name);
  if (definition?.title) return definition.title[language];
  return name;
}

export function seriesHomeBlurb(name: string, language: 'ko' | 'en'): string | undefined {
  const definition = seriesDefinition(name);
  return definition?.homeBlurb?.[language] ?? definition?.description[language];
}

export function seriesDescription(name: string, language: 'ko' | 'en'): string {
  const definition = seriesDefinition(name);
  return definition?.description[language] ?? '';
}

export function seriesMode(name: string): SeriesMode {
  return seriesDefinition(name)?.mode ?? 'learning-path';
}

export function seriesEyebrowSuffix(name: string, language: 'ko' | 'en'): string {
  if (seriesMode(name) === 'research-series') {
    return language === 'ko' ? 'Investment Research' : 'Investment Research';
  }
  return language === 'ko' ? 'Learning path' : 'Learning path';
}

export function resolveSeriesNameFromSlug(slug: string): string | undefined {
  for (const entry of SERIES) {
    if (seriesSlug(entry.name) === slug) return entry.name;
  }
  return undefined;
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

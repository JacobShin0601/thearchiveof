import type { CollectionEntry } from 'astro:content';

export const AGENT_ENGINEERING_SERIES = 'Agent Engineering';

export const SERIES_PART_IDS = ['design', 'execution', 'state', 'delivery'] as const;
export type SeriesPartId = (typeof SERIES_PART_IDS)[number];

export type LocalizedCopy = { ko: string; en: string };

export const SERIES_PART_ORDER: Record<string, readonly SeriesPartId[]> = {
  [AGENT_ENGINEERING_SERIES]: ['design', 'execution', 'state', 'delivery'],
};

export const SERIES_PART_META: Record<
  SeriesPartId,
  { index: number; title: LocalizedCopy; description: LocalizedCopy }
> = {
  design: {
    index: 1,
    title: { ko: '설계와 제어 흐름', en: 'Design and control flow' },
    description: {
      ko: '에이전트 패턴과 제어 흐름의 기본 설계',
      en: 'Agent patterns and the shape of control flow',
    },
  },
  execution: {
    index: 2,
    title: { ko: '실행과 동시성', en: 'Execution and concurrency' },
    description: {
      ko: '비동기, 스레드, 워커로 실행을 분리하는 방법',
      en: 'Async, threads, and workers for reliable execution',
    },
  },
  state: {
    index: 3,
    title: { ko: '상태와 내구성', en: 'State and durability' },
    description: {
      ko: '상태 저장, 이벤트, 내구성의 경계',
      en: 'Where state lives and how it differs from events',
    },
  },
  delivery: {
    index: 4,
    title: { ko: '전달과 런타임 경계', en: 'Delivery and runtime boundaries' },
    description: {
      ko: '스트리밍과 runtime 경계를 넘는 전달 계층',
      en: 'Streaming APIs and runtime boundaries',
    },
  },
};

export function seriesUsesParts(seriesName: string | undefined): seriesName is string {
  return Boolean(seriesName && seriesName in SERIES_PART_ORDER);
}

export function partIdsForSeries(seriesName: string): SeriesPartId[] {
  return [...(SERIES_PART_ORDER[seriesName] ?? [])];
}

export function partMeta(partId: SeriesPartId) {
  return SERIES_PART_META[partId];
}

export function partIndexInSeries(seriesName: string, partId: SeriesPartId): number {
  const order = SERIES_PART_ORDER[seriesName];
  if (!order) return 0;
  const idx = order.indexOf(partId);
  return idx >= 0 ? idx + 1 : 0;
}

export function partCountForSeries(seriesName: string): number {
  return SERIES_PART_ORDER[seriesName]?.length ?? 0;
}

export function nextPartId(seriesName: string, partId: SeriesPartId): SeriesPartId | undefined {
  const order = SERIES_PART_ORDER[seriesName];
  if (!order) return undefined;
  const idx = order.indexOf(partId);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : undefined;
}

export function postsInPart(
  posts: CollectionEntry<'posts'>[],
  partId: SeriesPartId,
): CollectionEntry<'posts'>[] {
  return posts
    .filter((post) => post.data.seriesPart === partId)
    .sort((a, b) => (a.data.seriesOrder ?? 999) - (b.data.seriesOrder ?? 999));
}

export function progressLabel(options: {
  seriesName: string;
  partId: SeriesPartId;
  seriesOrder: number;
  totalInSeries: number;
  language: 'ko' | 'en';
}): { visible: string; aria: string } {
  const { seriesName, partId, seriesOrder, totalInSeries, language } = options;
  const part = partMeta(partId);
  const partNum = partIndexInSeries(seriesName, partId);
  const partTotal = partCountForSeries(seriesName);
  const title = part.title[language];
  const seriesUpper = seriesName.toUpperCase();

  if (language === 'ko') {
    const visible = `${seriesUpper} · ${partNum}/${partTotal} ${title} · 시리즈 ${seriesOrder}/${totalInSeries}`;
    const aria = `${seriesName} 시리즈, ${partTotal}개 학습 단계 중 ${partNum}번째 ${title}, 전체 ${totalInSeries}편 중 ${seriesOrder}번째 글`;
    return { visible, aria };
  }

  const visible = `${seriesUpper} · ${partNum}/${partTotal} ${title} · Series ${seriesOrder}/${totalInSeries}`;
  const aria = `${seriesName} series, stage ${partNum} of ${partTotal}: ${title}, article ${seriesOrder} of ${totalInSeries}`;
  return { visible, aria };
}

export function nextStageBridgeLabel(
  seriesName: string,
  nextPartIdValue: SeriesPartId,
  language: 'ko' | 'en',
): string {
  const title = partMeta(nextPartIdValue).title[language];
  return language === 'ko' ? `다음: ${title}` : `Next: ${title}`;
}

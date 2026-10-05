import type { CollectionEntry } from 'astro:content';

export const AGENT_ENGINEERING_SERIES = 'Agent Engineering';
export const INTERNAL_LLM_SERVING_SERIES = 'Internal LLM Serving';

export const SERIES_PART_IDS = ['design', 'execution', 'state', 'safety', 'delivery'] as const;
export type SeriesPartId = (typeof SERIES_PART_IDS)[number];

export type LocalizedCopy = { ko: string; en: string };

export const SERIES_APPLIED_TRACK_DETAIL: Record<
  string,
  {
    parentSeries: string;
    parentSlug: string;
    trackSlug: string;
    trackTitle: LocalizedCopy;
    sectionDek: LocalizedCopy;
  }
> = {
  [INTERNAL_LLM_SERVING_SERIES]: {
    parentSeries: AGENT_ENGINEERING_SERIES,
    parentSlug: 'agent-engineering',
    trackSlug: 'vllm-serving',
    trackTitle: { ko: 'Inference Serving · vLLM', en: 'Inference Serving · vLLM' },
    sectionDek: {
      ko: '내부 GPU에서 vLLM으로 서빙하는 이유, 튜닝, 성능 진단까지 이어지는 선택형 실전 경로',
      en: 'A focused path on internal vLLM serving, tuning under GPU limits, and troubleshooting slowdowns',
    },
  },
};

export const AGENT_ENGINEERING_APPLIED_TRACKS = [INTERNAL_LLM_SERVING_SERIES] as const;

export const SERIES_PART_ORDER: Record<string, readonly SeriesPartId[]> = {
  [AGENT_ENGINEERING_SERIES]: ['design', 'execution', 'state', 'safety', 'delivery'],
};

export const SERIES_PART_META: Record<
  SeriesPartId,
  { index: number; title: LocalizedCopy; description: LocalizedCopy }
> = {
  design: {
    index: 1,
    title: { ko: '설계와 전체 구조', en: 'Design and overall structure' },
    description: {
      ko: '에이전트의 제어 패턴과 이를 실행할 backend의 전체 책임 경계를 먼저 그립니다.',
      en: 'Agent control patterns and the backend’s overall boundaries of responsibility before execution details.',
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
  safety: {
    index: 4,
    title: { ko: '안전한 실행과 복구', en: 'Safe Execution and Recovery' },
    description: {
      ko: '승인, 멱등성, 재시도와 부수 효과의 경계',
      en: 'Approval, idempotency, retries, and side-effect boundaries',
    },
  },
  delivery: {
    index: 5,
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

  if (language === 'ko') {
    const visible = `${partTotal}개 학습 단계 중 ${partNum}번째 · ${title} · 전체 ${totalInSeries}편 중 ${seriesOrder}번째 글`;
    const aria = `${seriesName} 시리즈, ${partTotal}개 학습 단계 중 ${partNum}번째 ${title}, 전체 ${totalInSeries}편 중 ${seriesOrder}번째 글`;
    return { visible, aria };
  }

  const visible = `Stage ${partNum} of ${partTotal} · ${title} · Article ${seriesOrder} of ${totalInSeries}`;
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

export function isAppliedTrackDetailSeries(seriesName: string | undefined): seriesName is string {
  return Boolean(seriesName && seriesName in SERIES_APPLIED_TRACK_DETAIL);
}

export function appliedTrackDetailMeta(detailSeriesName: string) {
  return SERIES_APPLIED_TRACK_DETAIL[detailSeriesName];
}

const INFERENCE_SERVING_TRACK_LABEL = 'Inference Serving';

export function trackProgressLabel(options: {
  detailSeriesName: string;
  seriesOrder: number;
  totalInTrack: number;
  language: 'ko' | 'en';
}): { visible: string; aria: string } {
  const { detailSeriesName, seriesOrder, totalInTrack, language } = options;
  const { parentSeries } = appliedTrackDetailMeta(detailSeriesName);
  const visible = `${parentSeries} / ${INFERENCE_SERVING_TRACK_LABEL} · ${seriesOrder} of ${totalInTrack}`;

  if (language === 'ko') {
    const aria = `${parentSeries} 시리즈, Inference Serving 트랙, ${totalInTrack}편 중 ${seriesOrder}편째`;
    return { visible, aria };
  }

  const aria = `${parentSeries} series, Inference Serving track, article ${seriesOrder} of ${totalInTrack}`;
  return { visible, aria };
}

export function appliedTrackPath(detailSeriesName: string, language: 'ko' | 'en' = 'ko'): string {
  const meta = SERIES_APPLIED_TRACK_DETAIL[detailSeriesName];
  const prefix = language === 'en' ? '/en' : '';
  if (!meta) return `${prefix}/series/${detailSeriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`;
  return `${prefix}/series/${meta.parentSlug}/${meta.trackSlug}/`;
}

export function resolveAppliedTrackDetailSeries(parentSlug: string, trackSlug: string): string | undefined {
  for (const [detailSeriesName, meta] of Object.entries(SERIES_APPLIED_TRACK_DETAIL)) {
    if (meta.parentSlug === parentSlug && meta.trackSlug === trackSlug) return detailSeriesName;
  }
  return undefined;
}

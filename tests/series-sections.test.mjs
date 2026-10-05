import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_ENGINEERING_SERIES,
  INTERNAL_LLM_SERVING_SERIES,
  nextPartId,
  partIdsForSeries,
  postsInPart,
  progressLabel,
  seriesUsesParts,
  trackProgressLabel,
  appliedTrackPath,
} from '../src/lib/series-sections.ts';
import {
  AI_VALUE_CHAIN_SERIES,
  catalogTopLevelSeriesNames,
  isCatalogTopLevelSeries,
  seriesDisplayTitle,
  seriesMode,
  seriesSlug,
} from '../src/lib/series-catalog.ts';

test('Agent Engineering uses five learning stages', () => {
  assert.equal(seriesUsesParts(AGENT_ENGINEERING_SERIES), true);
  assert.equal(seriesUsesParts('Enterprise AX'), false);
  assert.deepEqual(partIdsForSeries(AGENT_ENGINEERING_SERIES), [
    'design',
    'execution',
    'state',
    'safety',
    'delivery',
  ]);
});

test('next stage bridge follows registry order', () => {
  assert.equal(nextPartId(AGENT_ENGINEERING_SERIES, 'design'), 'execution');
  assert.equal(nextPartId(AGENT_ENGINEERING_SERIES, 'state'), 'safety');
  assert.equal(nextPartId(AGENT_ENGINEERING_SERIES, 'delivery'), undefined);
});

test('postsInPart keeps seriesOrder', () => {
  const posts = [
    { id: 'a', data: { seriesPart: 'execution', seriesOrder: 3 } },
    { id: 'b', data: { seriesPart: 'execution', seriesOrder: 2 } },
  ];
  const ordered = postsInPart(posts, 'execution');
  assert.deepEqual(ordered.map((post) => post.id), ['b', 'a']);
});

test('Internal LLM Serving is hidden from top-level series catalogs', () => {
  assert.equal(isCatalogTopLevelSeries('Agent Engineering'), true);
  assert.equal(isCatalogTopLevelSeries(INTERNAL_LLM_SERVING_SERIES), false);
  assert.deepEqual(
    catalogTopLevelSeriesNames(['Optimization', INTERNAL_LLM_SERVING_SERIES, 'Agent Engineering']),
    ['Optimization', 'Agent Engineering'],
  );
});

test('applied track detail pages nest under the parent series slug', () => {
  assert.equal(appliedTrackPath(INTERNAL_LLM_SERVING_SERIES), '/series/agent-engineering/vllm-serving/');
  assert.equal(appliedTrackPath(INTERNAL_LLM_SERVING_SERIES, 'en'), '/en/series/agent-engineering/vllm-serving/');
});

test('applied track progress label references parent series', () => {
  const { visible, aria } = trackProgressLabel({
    detailSeriesName: INTERNAL_LLM_SERVING_SERIES,
    seriesOrder: 1,
    totalInTrack: 3,
    language: 'en',
  });
  assert.equal(visible, 'Agent Engineering / Inference Serving · 1 of 3');
  assert.match(aria, /article 1 of 3/);
});

test('AI Value Chain uses research mode and stable slug', () => {
  assert.equal(seriesSlug(AI_VALUE_CHAIN_SERIES), 'ai-value-chain');
  assert.equal(seriesMode(AI_VALUE_CHAIN_SERIES), 'research-series');
  assert.equal(seriesDisplayTitle(AI_VALUE_CHAIN_SERIES, 'ko'), 'AI 밸류체인: 기술과 투자');
  assert.equal(seriesDisplayTitle(AI_VALUE_CHAIN_SERIES, 'en'), 'Investing Across the AI Stack');
});

test('progress label includes stage and article index', () => {
  const { visible, aria } = progressLabel({
    seriesName: AGENT_ENGINEERING_SERIES,
    partId: 'execution',
    seriesOrder: 3,
    totalInSeries: 10,
    language: 'ko',
  });
  assert.match(visible, /5개 학습 단계 중 2번째/);
  assert.match(visible, /전체 10편 중 3번째 글/);
  assert.match(aria, /3번째/);
});

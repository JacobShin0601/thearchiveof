import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGENT_ENGINEERING_SERIES,
  nextPartId,
  partIdsForSeries,
  postsInPart,
  progressLabel,
  seriesUsesParts,
} from '../src/lib/series-sections.ts';

test('Agent Engineering uses four learning stages', () => {
  assert.equal(seriesUsesParts(AGENT_ENGINEERING_SERIES), true);
  assert.equal(seriesUsesParts('Enterprise AX'), false);
  assert.deepEqual(partIdsForSeries(AGENT_ENGINEERING_SERIES), [
    'design',
    'execution',
    'state',
    'delivery',
  ]);
});

test('next stage bridge follows registry order', () => {
  assert.equal(nextPartId(AGENT_ENGINEERING_SERIES, 'design'), 'execution');
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

test('progress label includes stage and article index', () => {
  const { visible, aria } = progressLabel({
    seriesName: AGENT_ENGINEERING_SERIES,
    partId: 'execution',
    seriesOrder: 3,
    totalInSeries: 9,
    language: 'ko',
  });
  assert.match(visible, /2\/4/);
  assert.match(visible, /시리즈 3\/9/);
  assert.match(aria, /3번째/);
});

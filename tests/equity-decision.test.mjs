import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';
import {
  chartLine,
  closesFromAikstockdata,
  closesFromYahooChart,
  decisionReading,
  equityChartLayout,
  formatChange,
  mergeCloses,
  prepareEquityDecision,
  priceChange,
  priceDirection,
  utcDateFromUnix,
} from '../src/lib/equity-decision.ts';

const decisionDirectory = new URL('../src/data/equity-decisions/', import.meta.url);
const decisionFiles = readdirSync(decisionDirectory).filter((name) => name.endsWith('.json'));
const decision = JSON.parse(readFileSync(new URL('../src/data/equity-decisions/strl-2026-10-06.json', import.meta.url), 'utf8'));

function sample(closes) {
  return {
    id: 'sample-2026-10-06',
    ticker: 'STRL',
    name: { ko: '샘플', en: 'Sample' },
    venue: 'NASDAQ',
    currency: 'USD',
    stance: 'sell',
    decisionDate: '2026-10-06',
    decisionClose: 100,
    priceField: 'adjclose',
    feed: { kind: 'yahoo', symbol: 'STRL' },
    source: { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/STRL/history/' },
    closes,
  };
}

describe('listed equity decisions', () => {
  it('accepts every decision file and pins the filename to the id', () => {
    assert.ok(decisionFiles.length > 0);
    for (const name of decisionFiles) {
      const record = JSON.parse(readFileSync(join(decisionDirectory.pathname, name), 'utf8'));
      const prepared = prepareEquityDecision(record);
      assert.equal(prepared.id, basename(name, '.json'));
    }
  });

  it('keeps the published STRL sale pinned to the essay close', () => {
    const prepared = prepareEquityDecision(decision);
    assert.equal(prepared.id, 'strl-2026-10-06');
    assert.equal(prepared.stance, 'sell');
    assert.equal(prepared.decisionClose, 564);
    assert.equal(prepared.closes[0].date, '2026-10-06');
    assert.equal(prepared.closes[0].close, 564);
    assert.ok(prepared.closes.every((row, index) => index === 0 || row.date > prepared.closes[index - 1].date));
  });

  it('does not call a missing later close a 0% return', () => {
    const prepared = prepareEquityDecision(sample([{ date: '2026-10-06', close: 100 }]));
    assert.equal(prepared.priceChange, null);
    assert.equal(prepared.observationsAfterDecision, 0);
    assert.match(priceDirection(prepared, 'ko'), /아직 없다/);
  });

  it('measures the share price, and a sale does not flip the sign', () => {
    const prepared = prepareEquityDecision(sample([
      { date: '2026-10-06', close: 100 },
      { date: '2026-10-07', close: 90 },
    ]));
    assert.equal(prepared.priceChange, priceChange(100, 90));
    assert.equal(formatChange(prepared.priceChange), '−10.00%');
    const fell = decisionReading('sell', prepared.priceChange, 'ko');
    assert.equal(fell.label, '피한 하락');
    assert.match(fell.sentence, /피한 하락/);
    assert.doesNotMatch(fell.sentence, /수익/);
    const rose = decisionReading('sell', 0.03, 'ko');
    assert.equal(rose.label, '놓친 상승');
    assert.match(rose.sentence, /놓친 상승/);
    assert.equal(decisionReading('buy', 0.03, 'ko').label, '매수 이후 상승');
    assert.equal(decisionReading('buy', -0.03, 'ko').label, '매수 이후 하락');
    assert.equal(priceDirection(prepared, 'ko'), fell.sentence);
  });

  it('rejects a series that rewrites the decision close or starts early', () => {
    assert.throws(() => prepareEquityDecision(sample([
      { date: '2026-10-06', close: 101 },
    ])), /decisionClose/);
    assert.throws(() => prepareEquityDecision(sample([
      { date: '2026-10-05', close: 100 },
      { date: '2026-10-06', close: 100 },
    ])), /before the decision/);
  });

  it('overlays newer closes and keeps the published decision close', () => {
    const merged = mergeCloses(
      [{ date: '2026-10-06', close: 100 }],
      [
        { date: '2026-10-05', close: 80 },
        { date: '2026-10-06', close: 111 },
        { date: '2026-10-07', close: 90 },
      ],
      '2026-10-06',
      100,
    );
    assert.deepEqual(merged, [
      { date: '2026-10-06', close: 100 },
      { date: '2026-10-07', close: 90 },
    ]);
  });

  it('uses the session price only after the US close, when the daily bar is still empty', () => {
    const payload = {
      chart: {
        result: [{
          timestamp: [Date.parse('2026-10-07T13:30:00Z') / 1000],
          indicators: { adjclose: [{ adjclose: [null] }] },
          meta: {
            regularMarketPrice: 534.130004,
            regularMarketTime: Date.parse('2026-10-07T20:00:00Z') / 1000,
            exchangeTimezoneName: 'America/New_York',
          },
        }],
      },
    };
    assert.deepEqual(closesFromYahooChart(payload, 'adjclose'), [{ date: '2026-10-07', close: 534.13 }]);
    payload.chart.result[0].meta.regularMarketTime = Date.parse('2026-10-07T18:00:00Z') / 1000;
    assert.deepEqual(closesFromYahooChart(payload, 'adjclose'), []);
  });

  it('reads Yahoo timestamps as UTC dates and Korean history rows', () => {
    const yahoo = closesFromYahooChart({
      chart: {
        result: [{
          timestamp: [Date.parse('2026-10-06T20:00:00Z') / 1000],
          indicators: { adjclose: [{ adjclose: [564] }], quote: [{ close: [560] }] },
        }],
      },
    }, 'adjclose');
    assert.equal(utcDateFromUnix(Date.parse('2026-10-06T20:00:00Z') / 1000), '2026-10-06');
    assert.deepEqual(yahoo, [{ date: '2026-10-06', close: 564 }]);
    assert.deepEqual(closesFromAikstockdata([['20261007', 296000, 1]]), [{ date: '2026-10-07', close: 296000 }]);
  });

  it('draws a later higher close above an earlier one', () => {
    const layout = equityChartLayout([
      { date: '2026-10-06', close: 100 },
      { date: '2026-10-07', close: 110 },
    ], 100);
    assert.ok(layout.points[1].y < layout.points[0].y);
    assert.equal(layout.points[0].change, 0);
    assert.ok(Math.abs(layout.points[1].change - 0.1) < 1e-12);
    assert.match(chartLine(layout.points), /^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    const alone = equityChartLayout([{ date: '2026-10-06', close: 100 }], 100);
    assert.equal(alone.points[0].change, null);
  });
});

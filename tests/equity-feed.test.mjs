import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { onRequest } from '../functions/api/equity-decisions/[id].js';
import { closesFromYahooPayload, dropOpenSession } from '../functions/lib/equity-feed.js';
import { closesFromYahooChart } from '../src/lib/equity-decision.ts';

const duringSession = new Date('2026-10-07T18:00:00Z');
const afterClose = new Date('2026-10-07T20:30:00Z');

describe('equity price feed', () => {
  it('keeps yesterday when today\'s US session is still open', () => {
    const closes = [
      { date: '2026-10-06', close: 564 },
      { date: '2026-10-07', close: 540 },
    ];
    assert.deepEqual(dropOpenSession(closes, 'us', duringSession), [{ date: '2026-10-06', close: 564 }]);
    assert.deepEqual(dropOpenSession(closes, 'us', afterClose), closes);
  });

  it('reads the same Yahoo bars as the decision library', () => {
    const payload = {
      chart: {
        result: [{
          timestamp: [Date.parse('2026-10-06T13:30:00Z') / 1000, Date.parse('2026-10-07T13:30:00Z') / 1000],
          indicators: { adjclose: [{ adjclose: [563.690002, null] }] },
          meta: {
            regularMarketPrice: 534.130004,
            regularMarketTime: Date.parse('2026-10-07T20:00:00Z') / 1000,
            exchangeTimezoneName: 'America/New_York',
          },
        }],
      },
    };
    assert.deepEqual(closesFromYahooPayload(payload, 'adjclose'), closesFromYahooChart(payload, 'adjclose'));
  });

  it('serves an allowlisted decision and refuses any other id', async () => {
    const original = globalThis.fetch;
    let feedCalls = 0;
    globalThis.fetch = async () => {
      feedCalls += 1;
      return new Response(JSON.stringify({
      chart: {
        result: [{
          timestamp: [Date.parse('2024-01-02T14:30:00Z') / 1000, Date.parse('2024-01-03T14:30:00Z') / 1000],
          indicators: { adjclose: [{ adjclose: [563.69, 534.13] }] },
        }],
      },
    }));
    };
    try {
      const ok = await onRequest({
        request: new Request('https://thearchiveof.com/api/equity-decisions/strl-2026-10-06', {
          headers: {
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
          },
        }),
        params: { id: 'strl-2026-10-06' },
      });
      assert.equal(ok.status, 200);
      assert.match(ok.headers.get('cache-control'), /s-maxage=3600/);
      const body = await ok.json();
      assert.equal(body.ok, true);
      assert.ok(body.closes.some((row) => row.date === '2024-01-03' && row.close === 534.13));
      const missing = await onRequest({
        request: new Request('https://thearchiveof.com/api/equity-decisions/not-a-decision', {
          headers: {
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
          },
        }),
        params: { id: 'not-a-decision' },
      });
      assert.equal(missing.status, 404);
      const bot = await onRequest({
        request: new Request('https://thearchiveof.com/api/equity-decisions/strl-2026-10-06'),
        params: { id: 'strl-2026-10-06' },
      });
      assert.equal(bot.status, 403);
      assert.equal(feedCalls, 1);
    } finally {
      globalThis.fetch = original;
    }
  });
});

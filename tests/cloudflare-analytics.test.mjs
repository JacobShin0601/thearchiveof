import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  attachReferrerDay,
  classifyCrawler,
  completeUtcDays,
  dayQuery,
  interpretReferrerFailure,
  normalizeDayResponse,
  referrerQuery,
  renderAnalyticsSql,
  scopedZoneId,
} from '../scripts/lib/cloudflare-analytics.mjs';

describe('Cloudflare analytics collector', () => {
  it('selects only complete UTC days', () => {
    const days = completeUtcDays(2, new Date('2026-10-09T18:22:00Z'));
    assert.deepEqual(days.map(({ day }) => day), ['2026-10-07', '2026-10-08']);
    assert.equal(days[1].end, '2026-10-09T00:00:00.000Z');
  });

  it('builds zone queries without embedding credentials', () => {
    const query = dayQuery({
      zoneId: 'a'.repeat(32),
      hostname: 'thearchiveof.com',
      start: '2026-10-08T00:00:00.000Z',
      end: '2026-10-09T00:00:00.000Z',
    });
    assert.match(query, /httpRequestsAdaptiveGroups/);
    assert.match(query, /clientRequestPath/);
    assert.match(query, /userAgent/);
    assert.match(query, /edgeResponseStatus/);
    assert.match(query, /clientCountryName/);
    assert.doesNotMatch(query, /Bearer/);
    assert.match(referrerQuery({
      zoneId: 'a'.repeat(32),
      hostname: 'thearchiveof.com',
      start: '2026-10-08T00:00:00.000Z',
      end: '2026-10-09T00:00:00.000Z',
    }), /clientRefererHost/);
  });

  it('classifies known crawlers and drops unknown agents', () => {
    assert.equal(classifyCrawler('Mozilla/5.0 GPTBot/1.0')?.key, 'gptbot');
    assert.equal(classifyCrawler('ClaudeBot/1.0')?.category, 'training');
    assert.equal(classifyCrawler('Mozilla/5.0 Chrome/120'), null);
  });

  it('normalizes strategy aggregates and never writes raw user agents', () => {
    const entry = normalizeDayResponse('2026-10-08', 'thearchiveof.com', {
      data: { viewer: { zones: [{
        totals: [{ count: 120, sum: { visits: 30, edgeResponseBytes: 2048 } }],
        paths: [{ count: 20, sum: { visits: 10 }, dimensions: { clientRequestPath: "/it's-good/" } }],
        statuses: [{ count: 80, dimensions: { edgeResponseStatus: 200 } }, { count: 5, dimensions: { edgeResponseStatus: 404 } }],
        countries: [{ count: 40, sum: { visits: 12 }, dimensions: { clientCountryName: 'US' } }],
        userAgents: [
          { count: 15, sum: { edgeResponseBytes: 900 }, dimensions: { userAgent: 'GPTBot/1.2' } },
          { count: 9, sum: { edgeResponseBytes: 100 }, dimensions: { userAgent: 'MysteryBot/9' } },
        ],
        crawlerPaths: [{ count: 7, dimensions: { clientRequestPath: '/investing/markets/example/', userAgent: 'GPTBot/1.2' } }],
        crawlerStatuses: [{ count: 15, dimensions: { edgeResponseStatus: 200 } }],
        errorPaths: [{ count: 5, dimensions: { clientRequestPath: '/missing/' } }],
      }] } },
    });
    const withReferrers = attachReferrerDay(entry, {
      data: { viewer: { zones: [{
        referrers: [{ count: 4, sum: { visits: 3 }, dimensions: { clientRefererHost: 'www.chatgpt.com' } }],
        referrerPaths: [{ count: 4, sum: { visits: 3 }, dimensions: { clientRefererHost: 'chatgpt.com', clientRequestPath: '/investing/markets/example/' } }],
      }] } },
    });
    const sql = renderAnalyticsSql({
      days: [withReferrers],
      hostname: 'thearchiveof.com',
      refreshedAt: '2026-10-09T00:10:00.000Z',
      capability: { key: 'clientRefererHost', available: 1, detail: 'ok', checkedAt: '2026-10-09T00:10:00.000Z' },
    });
    assert.match(sql, /analytics_crawler_daily/);
    assert.match(sql, /'gptbot'/);
    assert.match(sql, /'chatgpt'/);
    assert.match(sql, /analytics_capability/);
    assert.match(sql, /\/it''s-good\//);
    assert.doesNotMatch(sql, /GPTBot\/1\.2|MysteryBot|BEGIN TRANSACTION|COMMIT;|undefined|NaN/);
    assert.equal(withReferrers.crawlers[0].crawler, 'gptbot');
    assert.equal(withReferrers.referrers[0].source, 'chatgpt');
  });

  it('records referrer capability when the plan blocks the dimension', () => {
    const capability = interpretReferrerFailure(new Error('unauthorized field clientRefererHost'), '2026-10-09T00:00:00.000Z');
    assert.equal(capability.available, 0);
    assert.match(capability.detail, /unavailable|plan|token/i);
  });

  it('rejects GraphQL errors rather than writing zeroes', () => {
    assert.throws(
      () => normalizeDayResponse('2026-10-08', 'thearchiveof.com', { errors: [{ message: 'forbidden' }] }),
      /forbidden/,
    );
  });

  it('discovers one scoped zone and rejects ambiguous tokens', () => {
    assert.equal(scopedZoneId({
      data: { viewer: { zones: [{ zoneTag: 'a'.repeat(32) }] } },
    }), 'a'.repeat(32));
    assert.throws(
      () => scopedZoneId({ data: { viewer: { zones: [] } } }),
      /exactly one zone/,
    );
    assert.throws(
      () => scopedZoneId({ data: { viewer: { zones: [
        { zoneTag: 'a'.repeat(32) }, { zoneTag: 'b'.repeat(32) },
      ] } } }),
      /received 2/,
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { onRequest } from '../functions/api/ops/analytics.js';
import {
  analyticsWindow,
  articleImpact,
  buildArticleRows,
  buildDataQuality,
  buildStrategyCandidates,
  lookupArticle,
  metricWithCoverage,
  safeAnalyticsPath,
  summarizeTrafficSignals,
} from '../functions/lib/analytics-dashboard.js';

function fakeAnalyticsD1({
  referrersAvailable = true,
  currentCoverageDays = 1,
  previousCoverageDays = 1,
} = {}) {
  return {
    prepare(sql) {
      return {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          if (sql.includes('analytics_sync_state')) {
            return {
              source: 'cloudflare-zone-analytics',
              refreshed_at: '2026-10-09T02:20:00.000Z',
              range_start: '2026-09-01',
              range_end: '2026-10-09',
              schema_version: 3,
            };
          }
          if (sql.includes('analytics_capability')) {
            return referrersAvailable
              ? {
                key: 'clientRefererHost',
                available: 1,
                detail: 'Referrer host dimensions are available.',
                checked_at: '2026-10-09T02:20:00.000Z',
              }
              : {
                key: 'clientRefererHost',
                available: 0,
                detail: 'Referrer host dimensions are unavailable for this Cloudflare plan or token scope.',
                checked_at: '2026-10-09T02:20:00.000Z',
              };
          }
          if (sql.includes('COUNT(DISTINCT day)')) {
            const start = this.args[0];
            const isCurrent = start >= '2026-09-09';
            return { days: isCurrent ? currentCoverageDays : previousCoverageDays };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM analytics_daily') && sql.includes('GROUP BY day')) {
            return {
              results: [
                { day: '2026-09-05', requests: 50, visits: 5, bytes: 500 },
                { day: '2026-10-05', requests: 100, visits: 10, bytes: 1000 },
              ],
            };
          }
          if (sql.includes('FROM analytics_path_daily')) {
            return {
              results: [
                { path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 40, visits: 8 },
                { path: '/assets/app.js', requests: 90, visits: 0 },
              ],
            };
          }
          if (sql.includes('FROM analytics_country_daily')) {
            return { results: [{ country: 'US', requests: 30, visits: 7 }] };
          }
          if (sql.includes('FROM analytics_status_daily')) {
            return {
              results: [
                { bucket: '2xx', requests: 90 },
                { bucket: '4xx', requests: 10 },
              ],
            };
          }
          if (sql.includes('FROM analytics_crawler_daily')) {
            return {
              results: [
                { crawler: 'gptbot', category: 'training', operator: 'OpenAI', requests: 12, bytes: 4000 },
              ],
            };
          }
          if (sql.includes('FROM analytics_crawler_path_daily')) {
            return {
              results: [
                { path: '/investing/markets/sterling-infrastructure-fair-value/', crawler: 'gptbot', requests: 12 },
              ],
            };
          }
          if (sql.includes('FROM analytics_crawler_status_daily')) {
            return { results: [{ bucket: '2xx', requests: 12 }] };
          }
          if (sql.includes('FROM analytics_referrer_daily')) {
            return referrersAvailable
              ? { results: [{ source: 'chatgpt', requests: 3, visits: 2 }] }
              : { results: [] };
          }
          if (sql.includes('FROM analytics_referrer_path_daily')) {
            return referrersAvailable
              ? {
                results: [{
                  source: 'chatgpt',
                  path: '/investing/markets/sterling-infrastructure-fair-value/',
                  requests: 3,
                  visits: 2,
                }],
              }
              : { results: [] };
          }
          if (sql.includes('FROM analytics_error_path_daily')) {
            return {
              results: [{ path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 1 }],
            };
          }
          if (sql.includes('FROM article_reactions')) {
            return {
              results: [{ article: 'sterling-infrastructure-fair-value', active_useful: 10 }],
            };
          }
          if (sql.includes('FROM interaction_events')) {
            return {
              results: [
                { event: 'reaction_added', article: 'sterling-infrastructure-fair-value', total: 1 },
                { event: 'language_switch', article: 'sterling-infrastructure-fair-value', total: 3 },
              ],
            };
          }
          return { results: [] };
        },
      };
    },
  };
}

function context({
  token = 'read-secret',
  deploy = 'preview',
  days = 30,
  referrersAvailable = true,
  currentCoverageDays = 1,
  previousCoverageDays = 1,
} = {}) {
  return {
    request: new Request(`https://develop.thearchiveof.pages.dev/api/ops/analytics?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    env: {
      DEPLOY_ENV: deploy,
      ANALYTICS_READ_TOKEN: 'read-secret',
      DB: fakeAnalyticsD1({ referrersAvailable, currentCoverageDays, previousCoverageDays }),
    },
  };
}

describe('analytics dashboard API', () => {
  it('is unavailable in production even with a valid token', async () => {
    const response = await onRequest(context({ deploy: 'production' }));
    assert.equal(response.status, 404);
  });

  it('requires the independent read token', async () => {
    const response = await onRequest(context({ token: '' }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate'), /Bearer/);
  });

  it('hides growth rates when coverage is incomplete', async () => {
    const response = await onRequest(context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, 3);
    assert.equal(body.dataQuality.comparisonComplete, false);
    assert.equal(body.overview.visits.change, null);
    assert.equal(body.overview.visits.changeUnavailableReason, 'insufficient_coverage');
    assert.equal(body.signals.zone.visits, 10);
    assert.equal(body.strategy.articles[0].allTimeActiveUseful, 10);
    assert.equal(body.strategy.articles[0].periodUsefulAdded, 1);
    assert.equal(body.strategy.articles[0].impact.periodUsefulAddRate, 1 / 8);
    assert.match(body.metadata.privacy, /no raw IP/i);
  });

  it('returns growth rates only when both windows are fully covered', async () => {
    const response = await onRequest(context({
      currentCoverageDays: 30,
      previousCoverageDays: 30,
    }));
    const body = await response.json();
    assert.equal(body.dataQuality.comparisonComplete, true);
    assert.equal(body.overview.visits.change, 1);
    assert.equal(body.overview.visits.changeUnavailableReason, null);
  });

  it('exposes an empty referrer state when the capability is unavailable', async () => {
    const response = await onRequest(context({ referrersAvailable: false }));
    const body = await response.json();
    assert.equal(body.aiReferral.available, false);
    assert.match(body.aiReferral.unavailableReason, /unavailable|plan|token/i);
    assert.deepEqual(body.aiReferral.sources, []);
  });

  it('rejects unsupported windows', async () => {
    const response = await onRequest(context({ days: 14 }));
    assert.equal(response.status, 400);
  });
});

describe('analytics helpers', () => {
  it('uses equal current and previous windows', () => {
    assert.deepEqual(analyticsWindow('2026-10-09', 7), {
      currentStart: '2026-10-02',
      currentEnd: '2026-10-09',
      previousStart: '2026-09-25',
      previousEnd: '2026-10-02',
    });
  });

  it('keeps content paths and rejects API, ops, and static asset paths', () => {
    assert.equal(safeAnalyticsPath('/investing/markets/example/'), true);
    assert.equal(safeAnalyticsPath('/api/events'), false);
    assert.equal(safeAnalyticsPath('/ops/analytics/'), false);
    assert.equal(safeAnalyticsPath('/_astro/app.js'), false);
  });

  it('separates all-time Useful from period impact numerators', () => {
    const articles = buildArticleRows({
      pathRows: [
        { path: '/investing/markets/sterling-infrastructure-fair-value/', visits: 5, requests: 10 },
      ],
      crawlerPathRows: [],
      referrerPathRows: [],
      usefulRows: [{ article: 'sterling-infrastructure-fair-value', count: 10 }],
      eventRows: [
        { event: 'reaction_added', article: 'sterling-infrastructure-fair-value', count: 1 },
        { event: 'code_run', article: 'sterling-infrastructure-fair-value', count: 2 },
      ],
      errorPathRows: [],
      today: new Date('2026-10-09T00:00:00Z'),
    });
    assert.equal(articles[0].allTimeActiveUseful, 10);
    assert.equal(articles[0].periodUsefulAdded, 1);
    assert.equal(articles[0].impact.score, articleImpact(articles[0]).score);
    assert.equal(articles[0].impact.score, 1 * 3 + 2 * 2);
    assert.equal(articles[0].impact.periodUsefulAddRate, 0.2);
  });

  it('blocks incomplete comparisons in metric helpers', () => {
    const incomplete = buildDataQuality({
      requestedDays: 90,
      currentCoverageDays: 90,
      previousCoverageDays: 30,
    });
    assert.equal(incomplete.comparisonComplete, false);
    assert.deepEqual(metricWithCoverage(100, 50, incomplete), {
      current: 100,
      previous: 50,
      change: null,
      changeUnavailableReason: 'insufficient_coverage',
    });
  });

  it('labels Zone visits and builds strategy candidates', () => {
    const article = lookupArticle('/investing/markets/sterling-infrastructure-fair-value/');
    assert.equal(article?.key, 'sterling-infrastructure-fair-value');
    const articles = buildArticleRows({
      pathRows: [
        { path: '/investing/markets/sterling-infrastructure-fair-value/', visits: 1, requests: 4 },
        { path: '/en/investing/markets/sterling-infrastructure-fair-value/', visits: 40, requests: 80 },
      ],
      crawlerPathRows: [
        { path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 30 },
      ],
      referrerPathRows: [],
      usefulRows: [],
      eventRows: [],
      errorPathRows: [],
      today: new Date('2026-10-09T00:00:00Z'),
    });
    const candidates = buildStrategyCandidates(articles, {
      previousAiReferrerByTopic: new Map(),
      smallSampleThreshold: 20,
    });
    assert.ok(candidates.some((row) => row.type === 'citation_discovery'));
    assert.ok(candidates.some((row) => row.type === 'distribution_gap'));
    assert.ok(candidates.some((row) => row.type === 'translation_gap'));
    assert.deepEqual(summarizeTrafficSignals([
      { category: 'search', requests: 8, bytes: 100 },
      { category: 'training', requests: 5, bytes: 50 },
      { category: 'user-fetch', requests: 2, bytes: 20 },
      { category: 'agent', requests: 1, bytes: 10 },
    ], 40), {
      zone: {
        visits: 40,
        label: 'Zone visits',
        note: 'Cloudflare Zone visits are not unique humans or page views; pair with period Useful and Lab events.',
      },
      search: { requests: 8, bytes: 100 },
      ai: { requests: 8, bytes: 80, training: 5, userFetch: 2, agent: 1 },
    });
  });
});

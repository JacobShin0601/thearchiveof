import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { onRequest } from '../functions/api/ops/analytics.js';
import {
  analyticsWindow,
  articleImpact,
  buildArticleRows,
  buildStrategyCandidates,
  lookupArticle,
  safeAnalyticsPath,
  summarizeTrafficSignals,
} from '../functions/lib/analytics-dashboard.js';

function fakeAnalyticsD1({ referrersAvailable = true } = {}) {
  return {
    prepare(sql) {
      return {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes('analytics_sync_state')) return {
            source: 'cloudflare-zone-analytics',
            refreshed_at: '2026-10-09T02:20:00.000Z',
            range_start: '2026-09-01',
            range_end: '2026-10-09',
            schema_version: 2,
          };
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
          return null;
        },
        async all() {
          if (sql.includes('FROM analytics_daily')) return { results: [
            { day: '2026-09-05', requests: 50, visits: 5, bytes: 500 },
            { day: '2026-10-05', requests: 100, visits: 10, bytes: 1000 },
          ] };
          if (sql.includes('FROM analytics_path_daily')) return { results: [
            { path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 40, visits: 8 },
            { path: '/assets/app.js', requests: 90, visits: 0 },
          ] };
          if (sql.includes('FROM analytics_country_daily')) return { results: [
            { country: 'US', requests: 30, visits: 7 },
          ] };
          if (sql.includes('FROM analytics_status_daily')) return { results: [
            { bucket: '2xx', requests: 90 },
            { bucket: '4xx', requests: 10 },
          ] };
          if (sql.includes('FROM analytics_crawler_daily')) return { results: [
            { crawler: 'gptbot', category: 'training', operator: 'OpenAI', requests: 12, bytes: 4000 },
          ] };
          if (sql.includes('FROM analytics_crawler_path_daily')) return { results: [
            { path: '/investing/markets/sterling-infrastructure-fair-value/', crawler: 'gptbot', requests: 12 },
          ] };
          if (sql.includes('FROM analytics_crawler_status_daily')) return { results: [
            { bucket: '2xx', requests: 12 },
          ] };
          if (sql.includes('FROM analytics_referrer_daily')) {
            return referrersAvailable
              ? { results: [{ source: 'chatgpt', requests: 3, visits: 2 }] }
              : { results: [] };
          }
          if (sql.includes('FROM analytics_referrer_path_daily')) {
            return referrersAvailable
              ? { results: [{ source: 'chatgpt', path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 3, visits: 2 }] }
              : { results: [] };
          }
          if (sql.includes('FROM analytics_error_path_daily')) return { results: [
            { path: '/investing/markets/sterling-infrastructure-fair-value/', requests: 1 },
          ] };
          if (sql.includes('FROM article_reactions')) return { results: [
            { article: 'sterling-infrastructure-fair-value', active_useful: 2 },
          ] };
          if (sql.includes('FROM interaction_events')) return { results: [
            { event: 'language_switch', article: 'sterling-infrastructure-fair-value', total: 3 },
          ] };
          return { results: [] };
        },
      };
    },
  };
}

function context({ token = 'read-secret', deploy = 'preview', days = 30, referrersAvailable = true } = {}) {
  return {
    request: new Request(`https://develop.thearchiveof.pages.dev/api/ops/analytics?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    env: {
      DEPLOY_ENV: deploy,
      ANALYTICS_READ_TOKEN: 'read-secret',
      DB: fakeAnalyticsD1({ referrersAvailable }),
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

  it('returns strategy aggregates and joins article metadata', async () => {
    const response = await onRequest(context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, 2);
    assert.deepEqual(body.overview.visits, { current: 10, previous: 5, change: 1 });
    assert.equal(body.readers.topArticles[0].key, 'sterling-infrastructure-fair-value');
    assert.equal(body.aiCrawl.crawlers[0].crawler, 'gptbot');
    assert.equal(body.signals.human.visits, 10);
    assert.equal(body.signals.ai.training, 12);
    assert.equal(body.signals.search.requests, 0);
    assert.equal(body.aiReferral.available, true);
    assert.equal(body.aiReferral.sources[0].source, 'chatgpt');
    assert.ok(body.strategy.articles[0].impact);
    assert.ok(Array.isArray(body.strategy.candidates));
    assert.match(body.metadata.privacy, /no raw IP/i);
    assert.doesNotMatch(JSON.stringify(body), /GPTBot\/|Mozilla\//);
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
      currentStart: '2026-10-02', currentEnd: '2026-10-09',
      previousStart: '2026-09-25', previousEnd: '2026-10-02',
    });
  });

  it('keeps content paths and rejects API, ops, and static asset paths', () => {
    assert.equal(safeAnalyticsPath('/investing/markets/example/'), true);
    assert.equal(safeAnalyticsPath('/api/events'), false);
    assert.equal(safeAnalyticsPath('/ops/analytics/'), false);
    assert.equal(safeAnalyticsPath('/_astro/app.js'), false);
  });

  it('looks up generated article metadata and builds small-sample candidates', () => {
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
    assert.ok(candidates.some((row) => row.type === 'citation_discovery' && row.smallSample === false));
    assert.equal(articles[0].impact.score, articleImpact(articles[0]).score);
    assert.deepEqual(summarizeTrafficSignals([
      { category: 'search', requests: 8, bytes: 100 },
      { category: 'training', requests: 5, bytes: 50 },
      { category: 'user-fetch', requests: 2, bytes: 20 },
      { category: 'agent', requests: 1, bytes: 10 },
    ], 40), {
      human: {
        visits: 40,
        note: 'Cloudflare visits are not a pure human count; pair with Useful and Lab events.',
      },
      search: { requests: 8, bytes: 100 },
      ai: { requests: 8, bytes: 80, training: 5, userFetch: 2, agent: 1 },
    });
  });
});

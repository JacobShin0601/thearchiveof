import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { onRequest } from '../functions/api/ops/analytics.js';
import { analyticsWindow, safeAnalyticsPath } from '../functions/lib/analytics-dashboard.js';

function fakeAnalyticsD1() {
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
            schema_version: 1,
          };
          return null;
        },
        async all() {
          if (sql.includes('FROM analytics_daily')) return { results: [
            { day: '2026-09-05', requests: 50, visits: 5, bytes: 500 },
            { day: '2026-10-05', requests: 100, visits: 10, bytes: 1000 },
          ] };
          if (sql.includes('FROM analytics_path_daily')) return { results: [
            { path: '/investing/markets/example/', requests: 40, visits: 8 },
            { path: '/assets/app.js', requests: 90, visits: 0 },
          ] };
          if (sql.includes('FROM article_reactions')) return { results: [
            { article: 'example', active_useful: 2 },
          ] };
          if (sql.includes('FROM interaction_events')) return { results: [
            { event: 'reaction_added', article: 'example', total: 3 },
          ] };
          return { results: [] };
        },
      };
    },
  };
}

function context({ token = 'read-secret', deploy = 'preview', days = 30 } = {}) {
  return {
    request: new Request(`https://develop.thearchiveof.pages.dev/api/ops/analytics?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    env: {
      DEPLOY_ENV: deploy,
      ANALYTICS_READ_TOKEN: 'read-secret',
      DB: fakeAnalyticsD1(),
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

  it('returns a versioned, aggregate payload and filters asset paths', async () => {
    const response = await onRequest(context());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, 1);
    assert.deepEqual(body.overview.visits, { current: 10, previous: 5, change: 1 });
    assert.deepEqual(body.topPaths.map((row) => row.path), ['/investing/markets/example/']);
    assert.equal(body.engagement.activeUseful[0].count, 2);
    assert.match(body.metadata.privacy, /no raw IP/i);
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
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  completeUtcDays,
  dayQuery,
  normalizeDayResponse,
  renderAnalyticsSql,
} from '../scripts/lib/cloudflare-analytics.mjs';

describe('Cloudflare analytics collector', () => {
  it('selects only complete UTC days', () => {
    const days = completeUtcDays(2, new Date('2026-10-09T18:22:00Z'));
    assert.deepEqual(days.map(({ day }) => day), ['2026-10-07', '2026-10-08']);
    assert.equal(days[1].end, '2026-10-09T00:00:00.000Z');
  });

  it('builds a zone query without embedding credentials', () => {
    const query = dayQuery({
      zoneId: 'a'.repeat(32),
      hostname: 'thearchiveof.com',
      start: '2026-10-08T00:00:00.000Z',
      end: '2026-10-09T00:00:00.000Z',
    });
    assert.match(query, /httpRequestsAdaptiveGroups/);
    assert.match(query, /clientRequestPath/);
    assert.doesNotMatch(query, /Bearer/);
  });

  it('normalizes totals and paths and renders idempotent SQL', () => {
    const entry = normalizeDayResponse('2026-10-08', 'thearchiveof.com', {
      data: { viewer: { zones: [{
        totals: [{ count: 120, sum: { visits: 30, edgeResponseBytes: 2048 } }],
        paths: [{ count: 20, sum: { visits: 10 }, dimensions: { clientRequestPath: "/it's-good/" } }],
      }] } },
    });
    const sql = renderAnalyticsSql({
      days: [entry],
      hostname: 'thearchiveof.com',
      refreshedAt: '2026-10-09T00:10:00.000Z',
    });
    assert.match(sql, /ON CONFLICT\(day, hostname\) DO UPDATE/);
    assert.match(sql, /\/it''s-good\//);
    assert.match(sql, /'2026-10-09'/);
    assert.doesNotMatch(sql, /undefined|NaN/);
  });

  it('rejects GraphQL errors rather than writing zeroes', () => {
    assert.throws(
      () => normalizeDayResponse('2026-10-08', 'thearchiveof.com', { errors: [{ message: 'forbidden' }] }),
      /forbidden/,
    );
  });
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { onRequest } from '../functions/api/equity-decisions/[id].js';
import { EQUITY_DAILY_REFRESH_CAP, takeEquityRefresh } from '../functions/lib/equity-budget.js';

const chartHeaders = {
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
};

function sqliteD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0003_equity_refresh_day.sql', import.meta.url), 'utf8'));
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...params) {
          return {
            async first() {
              return statement.get(...params) ?? null;
            },
          };
        },
      };
    },
  };
}

describe('equity refresh budget', () => {
  it('stops on the UTC day after the free request cap', async () => {
    const db = sqliteD1();
    const now = new Date('2026-10-08T15:00:00Z');
    await db.prepare(
      'INSERT INTO equity_refresh_day (day, hits) VALUES (?, ?) RETURNING hits',
    ).bind('2026-10-08', EQUITY_DAILY_REFRESH_CAP).first();
    assert.equal(await takeEquityRefresh(db, now), false);
    assert.equal(await takeEquityRefresh(db, new Date('2026-10-09T00:00:00Z')), true);
  });

  it('counts one slot per call until the cap', async () => {
    const db = sqliteD1();
    const now = new Date('2026-10-08T01:00:00Z');
    assert.equal(await takeEquityRefresh(db, now), true);
    assert.equal(await takeEquityRefresh(db, now), true);
    const row = await db.prepare('SELECT hits FROM equity_refresh_day WHERE day = ?').bind('2026-10-08').first();
    assert.equal(row.hits, 2);
  });

  it('serves only the decision close once the cap is reached', async () => {
    const original = globalThis.fetch;
    let feedCalls = 0;
    globalThis.fetch = async () => {
      feedCalls += 1;
      return new Response('{}');
    };
    const db = {
      prepare() {
        return { bind() { return { async first() { return { hits: EQUITY_DAILY_REFRESH_CAP }; } }; } };
      },
    };
    try {
      const response = await onRequest({
        request: new Request('https://thearchiveof.com/api/equity-decisions/strl-2026-10-06', { headers: chartHeaders }),
        params: { id: 'strl-2026-10-06' },
        env: { DB: db },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), {
        ok: true,
        id: 'strl-2026-10-06',
        refresh: 'paused',
        closes: [{ date: '2026-10-06', close: 564 }],
      });
      assert.equal(feedCalls, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('leaves the feed off when the counter cannot be read', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('feed should stay closed');
    };
    const db = {
      prepare() {
        return { bind() { return { async first() { throw new Error('no such table'); } }; } };
      },
    };
    try {
      const response = await onRequest({
        request: new Request('https://thearchiveof.com/api/equity-decisions/strl-2026-10-06', { headers: chartHeaders }),
        params: { id: 'strl-2026-10-06' },
        env: { DB: db },
      });
      assert.equal(response.status, 503);
    } finally {
      globalThis.fetch = original;
    }
  });
});

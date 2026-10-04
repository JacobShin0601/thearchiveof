import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { onRequest as handleReactions } from '../functions/api/articles/[slug]/reactions.js';
import { onRequest as handleEvents } from '../functions/api/events.js';

function fakeD1(counts = {}) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          if (sql.includes('COUNT(*)')) return { count: counts[this.args[0]] ?? 0 };
          return null;
        },
        async run() {
          writes.push({ sql, args: this.args });
          return { success: true };
        },
      };
      return statement;
    },
  };
}

function reactionRequest(slug, { method = 'GET', userAgent = 'Mozilla/5.0' } = {}) {
  const headers = { 'User-Agent': userAgent };
  if (method !== 'GET') headers.Origin = 'https://thearchiveof.com';
  return {
    request: new Request(`https://thearchiveof.com/api/articles/${slug}/reactions`, {
      method,
      headers,
    }),
    env: { DB: fakeD1({ [slug]: 2 }) },
    params: { slug },
  };
}

describe('reaction Function contract', () => {
  for (const slug of [
    'ax-should-start-narrow',
    'vllm-tuning-limited-gpus',
    'what-is-optimization-dinner-with-friends',
  ]) {
    it(`returns 200 for ${slug}`, async () => {
      const response = await handleReactions(reactionRequest(slug));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        reaction: 'useful',
        count: 2,
        viewerReacted: false,
      });
    });
  }

  it('returns the same result to a crawler user agent', async () => {
    const context = reactionRequest('ax-should-start-narrow', {
      userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    });
    const response = await handleReactions(context);
    assert.equal(response.status, 200);
  });

  it('returns 404 for a well-formed article key that does not exist', async () => {
    const response = await handleReactions({
      request: new Request('https://thearchiveof.com/api/articles/does-not-exist/reactions'),
      env: {},
      params: { slug: 'does-not-exist' },
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { ok: false, error: 'article_not_found' });
  });

  it('returns 400 for a malformed article key', async () => {
    const response = await handleReactions({
      request: new Request('https://thearchiveof.com/api/articles/bad/reactions'),
      env: {},
      params: { slug: '../bad' },
    });
    assert.equal(response.status, 400);
  });

  it('returns 405 for an unsupported method', async () => {
    const response = await handleReactions(reactionRequest('ax-should-start-narrow', { method: 'PUT' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), null);
  });

  it('returns 503 when the required D1 binding is absent', async () => {
    const response = await handleReactions({
      request: new Request('https://thearchiveof.com/api/articles/ax-should-start-narrow/reactions'),
      env: {},
      params: { slug: 'ax-should-start-narrow' },
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' });
  });
});

describe('events Function contract', () => {
  it('accepts a valid first-party event when D1 is bound', async () => {
    const DB = fakeD1();
    const response = await handleEvents({
      request: new Request('https://thearchiveof.com/api/events', {
        method: 'POST',
        headers: {
          Origin: 'https://thearchiveof.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'language_switch',
          articleSlug: 'ax-should-start-narrow',
          language: 'ko',
          component: 'language-switch',
        }),
      }),
      env: { DB },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(DB.writes.length, 1);
  });

  it('returns 405 for GET without touching D1', async () => {
    const response = await handleEvents({
      request: new Request('https://thearchiveof.com/api/events'),
      env: {},
    });
    assert.equal(response.status, 405);
  });

  it('returns 503 when the required D1 binding is absent', async () => {
    const response = await handleEvents({
      request: new Request('https://thearchiveof.com/api/events', {
        method: 'POST',
        headers: { Origin: 'https://thearchiveof.com' },
      }),
      env: {},
    });
    assert.equal(response.status, 503);
  });
});

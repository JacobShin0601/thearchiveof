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

function reactionD1() {
  const reactions = [];
  const events = [];
  let nextId = 1;

  const execute = async (sql, args) => {
    if (sql.includes('INSERT INTO article_reactions')) {
      reactions.push({
        id: nextId++,
        article_slug: args[0],
        actor_hash: args[1],
        created_at: new Date().toISOString(),
      });
    } else if (sql.includes('DELETE FROM article_reactions')) {
      const index = reactions.findIndex((row) => row.id === args[0]);
      if (index >= 0) reactions.splice(index, 1);
    } else if (sql.includes('INSERT INTO interaction_events')) {
      events.push({
        event_name: args[0],
        article_slug: args[1],
        language: args[2],
        actor_type: 'human',
        component: 'useful-reaction',
      });
    }
    return { success: true };
  };

  const DB = {
    reactions,
    events,
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          if (sql.includes('COUNT(*)')) {
            return {
              count: reactions.filter((row) => row.article_slug === this.args[0]).length,
            };
          }
          if (sql.includes('FROM article_reactions')) {
            return reactions.find(
              (row) => row.article_slug === this.args[0] && row.actor_hash === this.args[1],
            ) ?? null;
          }
          return null;
        },
        async run() {
          return execute(sql, this.args);
        },
      };
      return statement;
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };

  return DB;
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

function reactionPost(DB, viewerId, language = 'ko', slug = 'agent-pattern-design') {
  return {
    request: new Request(`https://thearchiveof.com/api/articles/${slug}/reactions`, {
      method: 'POST',
      headers: {
        Origin: 'https://thearchiveof.com',
        'Content-Type': 'application/json',
        'X-Viewer-Id': viewerId,
      },
      body: JSON.stringify({ reaction: 'useful', viewerId, language }),
    }),
    env: { DB, INTERACTION_SECRET: 'test-secret' },
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

  it('tracks active reactions independently for multiple viewers', async () => {
    const DB = reactionD1();
    const first = await handleReactions(reactionPost(DB, 'viewer-one-id', 'ko'));
    assert.deepEqual(await first.json(), {
      ok: true,
      count: 1,
      viewerReacted: true,
      action: 'added',
    });

    const second = await handleReactions(reactionPost(DB, 'viewer-two-id', 'en'));
    assert.deepEqual(await second.json(), {
      ok: true,
      count: 2,
      viewerReacted: true,
      action: 'added',
    });

    DB.reactions[0].created_at = '2020-01-01T00:00:00.000Z';
    const removed = await handleReactions(reactionPost(DB, 'viewer-one-id', 'ko'));
    assert.deepEqual(await removed.json(), {
      ok: true,
      count: 1,
      viewerReacted: false,
      action: 'removed',
    });
    assert.equal(DB.reactions.length, 1);
    assert.deepEqual(DB.events.map(({ event_name, language }) => ({ event_name, language })), [
      { event_name: 'reaction_added', language: 'ko' },
      { event_name: 'reaction_added', language: 'en' },
      { event_name: 'reaction_removed', language: 'ko' },
    ]);
  });

  it('shares viewer state across language editions with the same article key', async () => {
    const DB = reactionD1();
    await handleReactions(reactionPost(DB, 'shared-viewer-id', 'ko'));
    const response = await handleReactions({
      request: new Request(
        'https://thearchiveof.com/api/articles/agent-pattern-design/reactions?viewer=shared-viewer-id',
        { headers: { 'X-Viewer-Id': 'shared-viewer-id' } },
      ),
      env: { DB, INTERACTION_SECRET: 'test-secret' },
      params: { slug: 'agent-pattern-design' },
    });
    assert.deepEqual(await response.json(), {
      reaction: 'useful',
      count: 1,
      viewerReacted: true,
    });
  });

  it('does not mutate or log an invalid language', async () => {
    const DB = reactionD1();
    const response = await handleReactions(reactionPost(DB, 'viewer-one-id', 'fr'));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: 'invalid_language' });
    assert.equal(DB.reactions.length, 0);
    assert.equal(DB.events.length, 0);
  });

  it('does not mutate or log an invalid viewer', async () => {
    const DB = reactionD1();
    const response = await handleReactions(reactionPost(DB, 'short'));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: 'invalid_viewer' });
    assert.equal(DB.reactions.length, 0);
    assert.equal(DB.events.length, 0);
  });

  it('rate limits an immediate second toggle without logging another outcome', async () => {
    const DB = reactionD1();
    await handleReactions(reactionPost(DB, 'viewer-one-id'));
    const response = await handleReactions(reactionPost(DB, 'viewer-one-id'));
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { ok: false, error: 'rate_limited' });
    assert.equal(DB.reactions.length, 1);
    assert.equal(DB.events.length, 1);
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

  it('returns 503 without mutating when the interaction secret is absent', async () => {
    const DB = reactionD1();
    const context = reactionPost(DB, 'viewer-one-id');
    context.env = { DB };
    const response = await handleReactions(context);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: 'unavailable' });
    assert.equal(DB.reactions.length, 0);
    assert.equal(DB.events.length, 0);
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

  it('rejects reaction outcomes from the public events endpoint', async () => {
    for (const event of ['reaction_click', 'reaction_added', 'reaction_removed']) {
      const DB = fakeD1();
      const response = await handleEvents({
        request: new Request('https://thearchiveof.com/api/events', {
          method: 'POST',
          headers: {
            Origin: 'https://thearchiveof.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event,
            articleSlug: 'agent-pattern-design',
            language: 'ko',
            component: 'useful-reaction',
          }),
        }),
        env: { DB },
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { ok: false, error: 'invalid_event' });
      assert.equal(DB.writes.length, 0);
    }
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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashActor } from '../functions/lib/identity.js';
import { isAllowedArticleKey } from '../functions/lib/keys.js';
import { isAllowedOrigin } from '../functions/lib/http.js';
import {
  isArticleKey,
  isEventName,
  isReaction,
  isViewerId,
  parseJsonObject,
} from '../functions/lib/validate.js';

describe('article keys', () => {
  it('accepts translation-key slugs', () => {
    assert.equal(isArticleKey('what-is-optimization-dinner-with-friends'), true);
  });

  it('rejects unsafe slugs', () => {
    assert.equal(isArticleKey('../secret'), false);
    assert.equal(isArticleKey(''), false);
    assert.equal(isArticleKey('Useful'), false);
  });
});

describe('reactions and events', () => {
  it('allows only useful', () => {
    assert.equal(isReaction('useful'), true);
    assert.equal(isReaction('dislike'), false);
  });

  it('allows the V1 event list', () => {
    assert.equal(isEventName('reaction_click'), true);
    assert.equal(isEventName('code_run'), true);
    assert.equal(isEventName('language_switch'), true);
    assert.equal(isEventName('page_view'), false);
  });
});

describe('payloads', () => {
  it('parses a small JSON object', () => {
    const parsed = parseJsonObject('{"reaction":"useful"}');
    assert.equal(parsed.ok, true);
  });

  it('rejects malformed JSON', () => {
    assert.equal(parseJsonObject('{').ok, false);
    assert.equal(parseJsonObject('[]').ok, false);
  });

  it('rejects oversized payloads', () => {
    assert.equal(parseJsonObject(`{"x":"${'a'.repeat(3000)}"}`).ok, false);
  });

  it('accepts anonymous viewer ids', () => {
    assert.equal(isViewerId('11111111-2222-4333-8333-444444444444'), true);
    assert.equal(isViewerId('short'), false);
  });
});

describe('identity', () => {
  it('hashes the same viewer to the same actor', async () => {
    const first = await hashActor('secret', 'what-is-optimization-dinner-with-friends', 'viewer-one-id');
    const second = await hashActor('secret', 'what-is-optimization-dinner-with-friends', 'viewer-one-id');
    const other = await hashActor('secret', 'what-is-optimization-dinner-with-friends', 'viewer-two-id');
    assert.equal(first, second);
    assert.notEqual(first, other);
    assert.match(first, /^[a-f0-9]{64}$/);
  });
});

describe('origin', () => {
  it('allows same-host POST origins', () => {
    const request = new Request('https://thearchiveof.com/api/events', {
      method: 'POST',
      headers: { Origin: 'https://thearchiveof.com' },
    });
    assert.equal(isAllowedOrigin(request), true);
  });

  it('rejects cross-site origins', () => {
    const request = new Request('https://thearchiveof.com/api/events', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(isAllowedOrigin(request), false);
  });
});

describe('generated keys', () => {
  it('includes published optimization keys after generation', () => {
    if (isAllowedArticleKey('what-is-optimization-dinner-with-friends') === false) {
      assert.fail('run node scripts/write-article-keys.mjs before asserting generated keys');
    }
  });
});

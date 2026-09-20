import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPublicSitemapPath } from '../src/lib/sitemap.ts';

describe('production sitemap filter', () => {
  it('keeps published articles and populated listings', () => {
    assert.equal(isPublicSitemapPath('/'), true);
    assert.equal(isPublicSitemapPath('/en/'), true);
    assert.equal(isPublicSitemapPath('/about/'), true);
    assert.equal(isPublicSitemapPath('/archive/'), true);
    assert.equal(isPublicSitemapPath('/topics/'), true);
    assert.equal(isPublicSitemapPath('/en/topics/'), true);
    assert.equal(isPublicSitemapPath('/series/'), true);
    assert.equal(isPublicSitemapPath('/ai/'), true);
    assert.equal(isPublicSitemapPath('/ai/ax/'), true);
    assert.equal(isPublicSitemapPath('/ai/ai-engineering/'), true);
    assert.equal(isPublicSitemapPath('/math/optimization/'), true);
    assert.equal(isPublicSitemapPath('/misc/essays/'), true);
    assert.equal(isPublicSitemapPath('/ai/ax/ax-is-transformation/'), true);
    assert.equal(isPublicSitemapPath('/ai/ai-engineering/vllm-tuning-limited-gpus/'), true);
    assert.equal(isPublicSitemapPath('/en/ai/ai-engineering/vllm-tuning-limited-gpus/'), true);
    assert.equal(isPublicSitemapPath('/series/optimization/'), true);
    assert.equal(isPublicSitemapPath('/en/series/optimization/'), true);
    assert.equal(isPublicSitemapPath('/investing/'), true);
    assert.equal(isPublicSitemapPath('/investing/research/'), true);
    assert.equal(isPublicSitemapPath('/coding/'), true);
    assert.equal(isPublicSitemapPath('/coding/ai-engineering/'), true);
    assert.equal(isPublicSitemapPath('/en/coding/ai-engineering/'), true);
    assert.equal(isPublicSitemapPath('/en/math/linear-algebra/'), true);
    assert.equal(isPublicSitemapPath('/en/misc/essays/'), true);
  });

  it('omits empty series and thin topic hubs', () => {
    assert.equal(isPublicSitemapPath('/series/understanding-rates/'), false);
    assert.equal(isPublicSitemapPath('/en/series/understanding-rates/'), false);
    assert.equal(isPublicSitemapPath('/topics/optimization/'), false);
    assert.equal(isPublicSitemapPath('/en/topics/optimization/'), false);
    assert.equal(isPublicSitemapPath('/topics/ax/'), false);
    assert.equal(isPublicSitemapPath('/en/topics/ax/'), false);
    assert.equal(isPublicSitemapPath('/ops/security/'), false);
  });
});

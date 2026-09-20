import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  });

  it('omits empty listings, empty series, and noindex topic hubs', () => {
    assert.equal(isPublicSitemapPath('/investing/'), false);
    assert.equal(isPublicSitemapPath('/investing/macro/'), false);
    assert.equal(isPublicSitemapPath('/en/investing/macro/'), false);
    assert.equal(isPublicSitemapPath('/coding/'), false);
    assert.equal(isPublicSitemapPath('/misc/notes/'), false);
    assert.equal(isPublicSitemapPath('/series/understanding-rates/'), false);
    assert.equal(isPublicSitemapPath('/en/series/understanding-rates/'), false);
    assert.equal(isPublicSitemapPath('/topics/optimization/'), false);
    assert.equal(isPublicSitemapPath('/en/topics/optimization/'), false);
    assert.equal(isPublicSitemapPath('/topics/ax/'), false);
    assert.equal(isPublicSitemapPath('/en/topics/ax/'), false);
    assert.equal(isPublicSitemapPath('/ops/security/'), false);
  });

  it('keeps listing slugs aligned with consts', () => {
    const consts = readFileSync(new URL('../src/consts.ts', import.meta.url), 'utf8');
    const sitemap = readFileSync(new URL('../src/lib/sitemap.ts', import.meta.url), 'utf8');
    for (const slug of ['investing', 'ai', 'coding', 'math', 'misc', 'macro', 'ai-engineering', 'optimization', 'notes']) {
      assert.match(consts, new RegExp(`slug: '${slug}'`));
      assert.match(sitemap, new RegExp(`slug: '${slug}'`));
    }
  });
});

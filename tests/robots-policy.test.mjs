import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { previewRobotsPolicy, productionRobotsPolicy } from '../src/lib/robots-policy.ts';

describe('robots policy', () => {
  it('does not source-block production crawlers', () => {
    assert.match(productionRobotsPolicy, /User-agent: \*\nAllow: \//);
    assert.doesNotMatch(productionRobotsPolicy, /Disallow: \//);
    assert.match(productionRobotsPolicy, /Sitemap: https:\/\/thearchiveof.com\/sitemap-index.xml/);
  });

  it('keeps Preview off the public graph', () => {
    assert.match(previewRobotsPolicy, /User-agent: \*\nDisallow: \//);
    assert.match(previewRobotsPolicy, /User-agent: Googlebot\nAllow: \//);
  });
});

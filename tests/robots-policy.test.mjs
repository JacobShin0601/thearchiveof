import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { previewRobotsPolicy, productionRobotsPolicy } from '../src/lib/robots-policy.ts';

const namedProductionAgents = [
  'OAI-SearchBot',
  'GPTBot',
  'Claude-SearchBot',
  'ClaudeBot',
  'PerplexityBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  'Amazonbot',
  'YandexBot',
];

describe('robots policy', () => {
  it('does not source-block production crawlers', () => {
    for (const agent of namedProductionAgents) {
      assert.match(productionRobotsPolicy, new RegExp(`User-agent: ${agent}\\nAllow: /`));
    }
    assert.match(productionRobotsPolicy, /User-agent: \*\nAllow: \/\nDisallow: \/api\//);
    assert.doesNotMatch(productionRobotsPolicy, /^Disallow: \/$/m);
    assert.equal(
      productionRobotsPolicy.match(/^Allow: \/$/gm)?.length,
      productionRobotsPolicy.match(/^Disallow: \/api\/$/gm)?.length,
    );
    assert.match(productionRobotsPolicy, /Sitemap: https:\/\/thearchiveof.com\/sitemap-index.xml/);
  });

  it('keeps Preview off the public graph', () => {
    assert.match(previewRobotsPolicy, /User-agent: \*\nDisallow: \//);
    assert.match(previewRobotsPolicy, /User-agent: Googlebot\nAllow: \/\nDisallow: \/api\//);
    assert.match(previewRobotsPolicy, /User-agent: Bingbot\nAllow: \/\nDisallow: \/api\//);
    assert.doesNotMatch(previewRobotsPolicy, /OAI-SearchBot|GPTBot|Claude-SearchBot|PerplexityBot/);
  });
});

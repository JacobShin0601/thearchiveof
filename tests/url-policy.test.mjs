import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import astroConfig from '../astro.config.mjs';
import { SITE_ORIGIN } from '../functions/lib/http.js';
import { productionRobotsPolicy } from '../src/lib/robots-policy.ts';
import { resolveSeoLinks } from '../src/lib/seo-links.ts';
import { SITE_URL } from '../src/site-origin.ts';

describe('URL policy', () => {
  it('uses one production origin across site and Function runtimes', () => {
    assert.equal(astroConfig.site, SITE_URL);
    assert.equal(SITE_ORIGIN, SITE_URL);
    assert.match(productionRobotsPolicy, new RegExp(`Sitemap: ${SITE_URL}/sitemap-index\\.xml`));
  });

  it('makes trailing slashes an explicit route contract', () => {
    assert.equal(astroConfig.trailingSlash, 'always');
    assert.equal(astroConfig.build?.format, 'directory');
  });

  it('resolves Korean and English alternates against the production origin', () => {
    const korean = resolveSeoLinks({
      canonical: new URL('https://develop.example/ai/agents/example/?preview=1'),
      language: 'ko',
      alternateLanguageUrl: '/en/ai/agents/example/',
    });
    assert.equal(korean.canonicalUrl?.toString(), `${SITE_URL}/ai/agents/example/`);
    assert.equal(korean.alternateUrl?.toString(), `${SITE_URL}/en/ai/agents/example/`);
    assert.equal(korean.xDefaultUrl?.toString(), `${SITE_URL}/ai/agents/example/`);

    const english = resolveSeoLinks({
      canonical: new URL('https://develop.example/en/ai/agents/example/'),
      language: 'en',
      alternateLanguageUrl: '/ai/agents/example/',
    });
    assert.equal(english.xDefaultUrl?.toString(), `${SITE_URL}/ai/agents/example/`);
  });

  it('omits SEO links for error pages and x-default for unpaired English pages', () => {
    assert.deepEqual(resolveSeoLinks({ canonical: null, language: 'ko' }), {
      canonicalUrl: undefined,
      alternateUrl: undefined,
      xDefaultUrl: undefined,
    });
    assert.equal(
      resolveSeoLinks({
        canonical: new URL('https://develop.example/en/example/'),
        language: 'en',
      }).xDefaultUrl,
      undefined,
    );
  });
});

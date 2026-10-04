import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CSP_REPORT_ONLY, siteHeaders } from '../src/lib/security-headers.ts';

describe('security headers', () => {
  it('ships CSP as Report-Only, not enforcing', () => {
    const production = siteHeaders(false);
    assert.match(production, /Content-Security-Policy-Report-Only:/);
    assert.doesNotMatch(production, /(?:^|\n)\s*Content-Security-Policy:/);
    assert.match(production, /X-Content-Type-Options: nosniff/);
    assert.match(production, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(production, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
    assert.match(production, /X-Frame-Options: SAMEORIGIN/);
    assert.match(production, /\/_astro\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  });

  it('keeps current first-party and known third-party origins', () => {
    assert.match(CSP_REPORT_ONLY, /default-src 'self'/);
    assert.match(CSP_REPORT_ONLY, /https:\/\/static\.cloudflareinsights\.com/);
    assert.match(CSP_REPORT_ONLY, /https:\/\/giscus\.app/);
    assert.match(CSP_REPORT_ONLY, /'unsafe-inline'/);
    assert.doesNotMatch(CSP_REPORT_ONLY, /report-uri|report-to/);
  });

  it('keeps Preview noindex without changing the cache policy', () => {
    const preview = siteHeaders(true);
    assert.match(preview, /X-Robots-Tag: noindex, nofollow/);
    assert.doesNotMatch(siteHeaders(false), /X-Robots-Tag/);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyErrorPath } from '../scripts/lib/analytics-catalog.mjs';
import { summarizeErrorOps } from '../functions/lib/analytics-dashboard.js';

describe('error path classification', () => {
  it('separates scanner, content, asset, and api paths', () => {
    assert.equal(classifyErrorPath('//wp/wp-includes/wlwmanifest.xml'), 'scanner');
    assert.equal(classifyErrorPath('/.env'), 'scanner');
    assert.equal(classifyErrorPath('/auth/callback'), 'scanner');
    assert.equal(classifyErrorPath('/ai/agents/missing-slug/'), 'content');
    assert.equal(classifyErrorPath('/'), 'content');
    assert.equal(classifyErrorPath('/favicon.ico'), 'asset');
    assert.equal(classifyErrorPath('/api/auth/signin'), 'api');
  });

  it('summarizes classified 4xx and 5xx without treating total 4xx as reader failures', () => {
    const summary = summarizeErrorOps({
      detailRows: [
        { path: '//wp/wp-includes/wlwmanifest.xml', status: 404, class: 'scanner', requests: 100 },
        { path: '/ai/missing/', status: 404, class: 'content', requests: 10 },
        { path: '/favicon.ico', status: 404, class: 'asset', requests: 5 },
      ],
      serverRows: [
        { path: '/api/equity-decisions/x', status: 500, requests: 3 },
      ],
    });
    assert.equal(summary.totals.scanner4xx, 100);
    assert.equal(summary.totals.content4xx, 10);
    assert.equal(summary.totals.serverErrors, 3);
    assert.ok(summary.totals.scannerShare > 0.8);
    assert.equal(summary.byStatus[0].status, 404);
  });
});

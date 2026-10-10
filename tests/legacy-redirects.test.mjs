import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  flattenLegacyRedirects,
  LEGACY_REDIRECTS,
  renderRedirectsFile,
} from '../scripts/lib/legacy-redirects.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('legacy redirects', () => {
  it('covers slash and no-slash sources without chains or home fallbacks', () => {
    const rows = flattenLegacyRedirects();
    assert.ok(rows.some((row) => row.source === '/series/internal-llm-serving'));
    assert.ok(rows.some((row) => row.source === '/series/internal-llm-serving/'));
    assert.ok(rows.some((row) => row.source === '/sitemap.xml' && row.target === '/sitemap-index.xml'));
    for (const row of rows) {
      assert.equal(row.status, '301');
      assert.notEqual(row.target, '/');
      assert.notEqual(row.target, '/en/');
    }
    const targets = new Set(rows.map((row) => row.target));
    for (const row of rows) {
      assert.equal(targets.has(row.source), false, `${row.source} must not be a redirect target`);
    }
    assert.ok(LEGACY_REDIRECTS.every((entry) => entry.reason));
  });

  it('keeps public/_redirects generated from the catalog', () => {
    const onDisk = readFileSync(join(root, 'public', '_redirects'), 'utf8').trim();
    assert.equal(onDisk, renderRedirectsFile().trim());
  });
});

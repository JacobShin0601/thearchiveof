import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { invalidD1Ids, missingHeadAssets } from '../src/lib/pages-config.js';

describe('pages config', () => {
  it('rejects placeholder D1 ids', () => {
    const toml = `
      [[d1_databases]]
      binding = "DB"
      database_id = "REPLACE_WITH_PREVIEW_D1_ID"
    `;
    assert.deepEqual(invalidD1Ids(toml), ['REPLACE_WITH_PREVIEW_D1_ID']);
  });

  it('accepts a real D1 uuid or no binding', () => {
    assert.deepEqual(invalidD1Ids('name = "thearchiveof"\n'), []);
    assert.deepEqual(
      invalidD1Ids('database_id = "01234567-89ab-4def-8012-3456789abcde"'),
      [],
    );
  });

  it('flags head assets that are not in public/', () => {
    const html = '<link rel="icon" href="/favicon.svg"><link rel="icon" href="/missing.png">';
    assert.deepEqual(missingHeadAssets(html, (path) => path === 'favicon.svg'), ['/missing.png']);
  });
});

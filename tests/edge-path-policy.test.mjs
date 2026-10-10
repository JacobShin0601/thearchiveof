import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  EDGE_PATH_POLICY,
  FORBIDDEN_PUBLIC_LINK_MARKERS,
  SCANNER_NOISE_PATHS,
} from '../scripts/lib/scanner-noise-paths.mjs';
import { flattenLegacyRedirects } from '../scripts/lib/legacy-redirects.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe('edge path policy (no OAuth, no WP compatibility)', () => {
  it('documents that /auth/callback is not an application route', () => {
    assert.equal(EDGE_PATH_POLICY.authCallback.existsInApp, false);
    assert.equal(EDGE_PATH_POLICY.authCallback.get, 404);
    assert.equal(EDGE_PATH_POLICY.home.get, 200);
    assert.ok(SCANNER_NOISE_PATHS.includes('/auth/callback'));
  });

  it('never redirects scanner or auth-callback noise to a real page', () => {
    const redirects = flattenLegacyRedirects();
    for (const noise of SCANNER_NOISE_PATHS) {
      assert.equal(
        redirects.some((row) => row.source === noise || row.target.includes(noise.replace(/^\/*/, '/'))),
        false,
        `must not manage redirect for ${noise}`,
      );
    }
    for (const row of redirects) {
      assert.notEqual(row.target, '/auth/callback');
      for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
        assert.equal(row.target.includes(marker), false, `${row.source} → ${row.target}`);
      }
    }
  });

  it('keeps the built home page and forbids auth/wp paths in dist when present', () => {
    if (!existsSync(dist)) {
      assert.ok(true, 'dist absent — run npm run build before release checks');
      return;
    }
    assert.equal(existsSync(join(dist, 'index.html')), true);
    assert.equal(existsSync(join(dist, 'auth')), false);
    assert.equal(existsSync(join(dist, 'auth', 'callback', 'index.html')), false);

    const files = walk(dist).filter((file) => /\.(?:html|xml)$/i.test(file));
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
        assert.equal(text.includes(marker), false, `${file} contains ${marker}`);
      }
    }
  });
});

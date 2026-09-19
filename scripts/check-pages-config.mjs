import { existsSync, readFileSync } from 'node:fs';
import { invalidD1Ids } from '../src/lib/pages-config.js';

const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
const badIds = invalidD1Ids(toml);
if (badIds.length > 0) {
  throw new Error(`wrangler.toml has D1 IDs that will fail a Pages deploy: ${badIds.join(', ')}`);
}

if (!toml.includes('pages_build_output_dir = "dist"')) {
  throw new Error('wrangler.toml must set pages_build_output_dir = "dist"');
}

const requiredPublic = ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'og.png'];
const missing = requiredPublic.filter((file) => !existsSync(new URL(`../public/${file}`, import.meta.url)));
if (missing.length > 0) {
  throw new Error(`public/ is missing files the site head expects: ${missing.join(', ')}`);
}

console.log('Pages config ok');

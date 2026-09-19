import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const postsDir = new URL('../src/content/posts', import.meta.url);
const brokenCloser = /\*\*[^*]*\)\*\*[^\s*<(]/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.(md|mdx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

describe('mdx emphasis', () => {
  it('does not leave **term)**particle unparsed', async () => {
    const files = await walk(postsDir.pathname);
    const leftovers = [];
    for (const path of files) {
      const source = await readFile(path, 'utf8');
      source.split('\n').forEach((line, index) => {
        if (brokenCloser.test(line)) leftovers.push(`${path}:${index + 1}`);
      });
    }
    assert.deepEqual(leftovers, []);
  });
});

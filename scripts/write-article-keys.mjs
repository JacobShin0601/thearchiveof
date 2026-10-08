import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const postsDir = fileURLToPath(new URL('../src/content/posts', import.meta.url));
const outFile = new URL('../functions/_generated/article-keys.js', import.meta.url);

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

function articleKey(source, filename) {
  const key = source.match(/^translationKey:\s*"([^"]+)"/m)?.[1];
  if (key) return key;
  return filename.replace(/\.(md|mdx)$/, '');
}

const keys = new Set();
for (const path of await walk(postsDir)) {
  const filename = path.split(/[/\\]/).at(-1) ?? path;
  const key = articleKey(await readFile(path, 'utf8'), filename);
  if (key) keys.add(key);
}

const list = [...keys].sort();
await mkdir(new URL('.', outFile), { recursive: true });
await writeFile(outFile, `export const ARTICLE_KEYS = ${JSON.stringify(list, null, 2)};\n`);
console.log(`Wrote ${list.length} article keys`);

const decisionDir = fileURLToPath(new URL('../src/data/equity-decisions', import.meta.url));
const decisions = {};
for (const name of (await readdir(decisionDir)).filter((entry) => entry.endsWith('.json')).sort()) {
  const record = JSON.parse(await readFile(join(decisionDir, name), 'utf8'));
  decisions[record.id] = {
    decisionDate: record.decisionDate,
    decisionClose: record.decisionClose,
    priceField: record.priceField,
    feed: record.feed,
  };
}
const decisionFile = new URL('../functions/_generated/equity-decisions.js', import.meta.url);
await writeFile(decisionFile, `export const EQUITY_DECISIONS = ${JSON.stringify(decisions, null, 2)};\n`);
console.log(`Wrote ${Object.keys(decisions).length} equity decisions`);

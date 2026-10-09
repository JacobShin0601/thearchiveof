import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const postsDir = fileURLToPath(new URL('../src/content/posts', import.meta.url));
const outFile = new URL('../functions/_generated/article-keys.js', import.meta.url);
const catalogFile = new URL('../functions/_generated/article-catalog.js', import.meta.url);

const SECTIONS = [
  {
    name: 'Investing',
    slug: 'investing',
    subsections: [
      { name: 'Macro', slug: 'macro' },
      { name: 'Rates & Fixed Income', slug: 'rates' },
      { name: 'Quant', slug: 'quant' },
      { name: 'Markets', slug: 'markets' },
      { name: 'Portfolio', slug: 'portfolio' },
      { name: 'Research', slug: 'research' },
    ],
  },
  {
    name: 'AI & AX',
    slug: 'ai',
    subsections: [
      { name: 'Agents', slug: 'agents' },
      { name: 'RAG', slug: 'rag' },
      { name: 'LLM', slug: 'llm' },
      { name: 'AI Engineering', slug: 'ai-engineering' },
      { name: 'AX', slug: 'ax' },
      { name: 'Enterprise AI', slug: 'enterprise-ai' },
      { name: 'Evaluation', slug: 'evaluation' },
    ],
  },
  {
    name: 'Lab',
    slug: 'coding',
    subsections: [
      { name: 'Projects', slug: 'projects' },
      { name: 'Experiments', slug: 'experiments' },
      { name: 'Data & Notebooks', slug: 'data' },
      { name: 'Agentic Engineering', slug: 'ai-engineering' },
      { name: 'Tutorials', slug: 'tutorials' },
    ],
  },
  {
    name: 'Mathematics',
    slug: 'math',
    subsections: [
      { name: 'Probability', slug: 'probability' },
      { name: 'Statistics', slug: 'statistics' },
      { name: 'Linear Algebra', slug: 'linear-algebra' },
      { name: 'Optimization', slug: 'optimization' },
      { name: 'Financial Mathematics', slug: 'financial-mathematics' },
    ],
  },
  {
    name: 'Perspectives',
    slug: 'misc',
    subsections: [
      { name: 'Short Notes', slug: 'notes' },
      { name: 'Reading', slug: 'reading' },
      { name: 'Career', slug: 'career' },
      { name: 'Essays', slug: 'essays' },
    ],
  },
];

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

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

function field(block, name) {
  const match = block.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  const raw = match[1].trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return raw;
}

function articleKey(block, filename) {
  return field(block, 'translationKey') ?? filename.replace(/\.(md|mdx)$/, '');
}

function sectionSlug(section) {
  return SECTIONS.find((item) => item.name === section)?.slug ?? 'archive';
}

function subsectionSlug(section, subsection) {
  const match = SECTIONS.find((item) => item.name === section)?.subsections.find(
    (item) => item.name === subsection,
  );
  return match?.slug
    ?? String(subsection ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function postPath({ language, section, subsection, slug }) {
  const prefix = language === 'en' ? '/en' : '';
  return `${prefix}/${sectionSlug(section)}/${subsectionSlug(section, subsection)}/${slug}/`;
}

const keys = new Set();
const catalog = {};

for (const path of await walk(postsDir)) {
  const filename = path.split(/[/\\]/).at(-1) ?? path;
  const slug = filename.replace(/\.(md|mdx)$/, '');
  const block = frontmatter(await readFile(path, 'utf8'));
  const draft = field(block, 'draft') === true;
  const key = articleKey(block, filename);
  if (key) keys.add(key);
  if (draft) continue;

  const language = field(block, 'language') === 'en' ? 'en' : 'ko';
  const section = field(block, 'section');
  const subsection = field(block, 'subsection');
  if (!section || !subsection) continue;

  const route = postPath({ language, section, subsection, slug });
  catalog[route] = {
    key,
    slug,
    language,
    section,
    subsection,
    contentType: field(block, 'contentType') ?? null,
    topics: field(block, 'topics') ?? [],
    primaryTopic: field(block, 'primaryTopic') ?? null,
    freshness: field(block, 'freshness') ?? null,
    lastReviewed: field(block, 'lastReviewed') ?? null,
    nextReviewDate: field(block, 'nextReviewDate') ?? null,
    title: field(block, 'title') ?? slug,
    path: route,
  };
}

const list = [...keys].sort();
await mkdir(new URL('.', outFile), { recursive: true });
await writeFile(outFile, `export const ARTICLE_KEYS = ${JSON.stringify(list, null, 2)};\n`);
await writeFile(catalogFile, `export const ARTICLE_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`);
console.log(`Wrote ${list.length} article keys`);
console.log(`Wrote ${Object.keys(catalog).length} article catalog routes`);

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

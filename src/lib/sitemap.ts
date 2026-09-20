import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import topicRegistry from '../data/topics.json' with { type: 'json' };

type Language = 'ko' | 'en';

type PublishedPost = {
  language: Language;
  section: string;
  subsection: string;
  series?: string;
  topics: string[];
  pillar: boolean;
};

type SitemapInventory = {
  listingPaths: Set<string>;
  seriesPaths: Set<string>;
  indexableTopicPaths: Set<string>;
};

const postsRoot = fileURLToPath(new URL('../content/posts', import.meta.url));

// Keep these slugs aligned with `src/consts.ts` `SECTIONS`.
const sections = [
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
] as const;

const listingCandidates = new Set(
  sections.flatMap((section) => [
    `/${section.slug}/`,
    `/en/${section.slug}/`,
    ...section.subsections.flatMap((subsection) => [
      `/${section.slug}/${subsection.slug}/`,
      `/en/${section.slug}/${subsection.slug}/`,
    ]),
  ]),
);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sectionSlug(section: string) {
  return sections.find((item) => item.name === section)?.slug ?? 'archive';
}

function subsectionSlug(section: string, subsection: string) {
  const match = sections.find((item) => item.name === section)?.subsections.find((item) => item.name === subsection);
  return match?.slug ?? slugify(subsection);
}

function languagePath(language: Language, rest: string) {
  return language === 'en' ? `/en${rest}` : rest;
}

function normalizePathname(pathname: string) {
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function unquote(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineList(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return undefined;
  return trimmed.slice(1, -1).split(',').map((item) => unquote(item)).filter(Boolean);
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const data: Record<string, string | string[] | boolean> = {};
  let currentKey: string | undefined;

  for (const line of match[1].split(/\r?\n/)) {
    const listItem = line.match(/^[\t ]+-[\t ]+(.*)$/);
    if (listItem && currentKey) {
      const existing = data[currentKey];
      const next = unquote(listItem[1]);
      data[currentKey] = Array.isArray(existing)
        ? [...existing, next]
        : existing === undefined || existing === ''
          ? [next]
          : [String(existing), next];
      continue;
    }

    const pair = line.match(/^([A-Za-z][\w]*)\s*:\s*(.*)$/);
    if (!pair) {
      currentKey = undefined;
      continue;
    }

    const [, key, rawValue] = pair;
    currentKey = key;
    const list = parseInlineList(rawValue);
    if (list) {
      data[key] = list;
      continue;
    }

    const value = unquote(rawValue);
    if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
      continue;
    }
    data[key] = value;
  }

  return data;
}

function walkPostFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = join(root, entry.name);
    if (entry.isDirectory()) return walkPostFiles(full);
    if (entry.isFile() && (extname(entry.name) === '.md' || extname(entry.name) === '.mdx')) return [full];
    return [];
  });
}

function asStringList(value: string | string[] | boolean | undefined) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return [value];
  return [];
}

function loadPublishedPosts() {
  return walkPostFiles(postsRoot).flatMap((file): PublishedPost[] => {
    const data = parseFrontmatter(readFileSync(file, 'utf8'));
    if (data.draft === true) return [];

    const section = String(data.section ?? '');
    const subsection = String(data.subsection ?? '');
    if (!section || !subsection) return [];

    return [{
      language: data.language === 'en' ? 'en' : 'ko',
      section,
      subsection,
      series: typeof data.series === 'string' && data.series ? data.series : undefined,
      topics: asStringList(data.topics),
      pillar: data.pillar === true,
    }];
  });
}

function buildInventory(): SitemapInventory {
  const listingPaths = new Set<string>();
  const seriesPaths = new Set<string>();
  const postsByTopic = new Map<string, PublishedPost[]>();

  for (const post of loadPublishedPosts()) {
    listingPaths.add(languagePath(post.language, `/${sectionSlug(post.section)}/`));
    listingPaths.add(languagePath(
      post.language,
      `/${sectionSlug(post.section)}/${subsectionSlug(post.section, post.subsection)}/`,
    ));
    if (post.series) seriesPaths.add(languagePath(post.language, `/series/${slugify(post.series)}/`));

    for (const topic of post.topics) {
      const key = `${post.language}:${topic}`;
      const list = postsByTopic.get(key) ?? [];
      list.push(post);
      postsByTopic.set(key, list);
    }
  }

  const indexableTopicPaths = new Set<string>();
  const registry = new Map(topicRegistry.map((topic) => [topic.slug, topic]));

  for (const [key, topicPosts] of postsByTopic) {
    const language: Language = key.startsWith('en:') ? 'en' : 'ko';
    const topic = key.slice(language.length + 1);
    const definition = registry.get(topic);
    if (definition?.indexable && topicPosts.length >= 3 && topicPosts.some((post) => post.pillar)) {
      indexableTopicPaths.add(languagePath(language, `/topics/${slugify(topic)}/`));
    }
  }

  return { listingPaths, seriesPaths, indexableTopicPaths };
}

function isSeriesDetail(pathname: string) {
  return /^\/(?:en\/)?series\/[^/]+\/$/.test(pathname);
}

function isTopicHub(pathname: string) {
  return /^\/(?:en\/)?topics\/[^/]+\/$/.test(pathname);
}

let inventory: SitemapInventory | undefined;

export function isPublicSitemapPath(pathname: string) {
  const path = normalizePathname(pathname);
  if (path.startsWith('/ops/')) return false;

  inventory ??= buildInventory();

  if (isTopicHub(path)) return inventory.indexableTopicPaths.has(path);
  if (isSeriesDetail(path)) return inventory.seriesPaths.has(path);
  if (listingCandidates.has(path)) return inventory.listingPaths.has(path);
  return true;
}

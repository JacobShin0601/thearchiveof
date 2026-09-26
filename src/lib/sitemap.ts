import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import topicRegistry from '../data/topics.json' with { type: 'json' };

type Language = 'ko' | 'en';

type PublishedPost = {
  language: Language;
  section?: string;
  subsection?: string;
  series?: string;
  topics: string[];
};

type SitemapInventory = {
  sectionPaths: Set<string>;
  subsectionPaths: Set<string>;
  seriesPaths: Set<string>;
  indexableTopicPaths: Set<string>;
};

const postsRoot = fileURLToPath(new URL('../content/posts', import.meta.url));
const sectionSlugs: Record<string, string> = {
  Investing: 'investing',
  'AI & AX': 'ai',
  Lab: 'coding',
  Mathematics: 'math',
  Perspectives: 'misc',
};
const subsectionSlugOverrides: Record<string, string> = {
  'Rates & Fixed Income': 'rates',
  'Data & Notebooks': 'data',
  'Agentic Engineering': 'ai-engineering',
  'Short Notes': 'notes',
};
const knownSectionSlugs = new Set(Object.values(sectionSlugs));

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

    return [{
      language: data.language === 'en' ? 'en' : 'ko',
      section: typeof data.section === 'string' ? data.section : undefined,
      subsection: typeof data.subsection === 'string' ? data.subsection : undefined,
      series: typeof data.series === 'string' && data.series ? data.series : undefined,
      topics: asStringList(data.topics),
    }];
  });
}

function buildInventory(): SitemapInventory {
  const sectionPaths = new Set<string>();
  const subsectionPaths = new Set<string>();
  const seriesPaths = new Set<string>();
  const postsByTopic = new Map<string, PublishedPost[]>();

  for (const post of loadPublishedPosts()) {
    const sectionSlug = post.section ? sectionSlugs[post.section] : undefined;
    if (sectionSlug) {
      sectionPaths.add(languagePath(post.language, `/${sectionSlug}/`));
      if (post.subsection) {
        const subsectionSlug = subsectionSlugOverrides[post.subsection] ?? slugify(post.subsection);
        subsectionPaths.add(languagePath(post.language, `/${sectionSlug}/${subsectionSlug}/`));
      }
    }
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
    if (definition?.indexable && topicPosts.length >= 2) {
      indexableTopicPaths.add(languagePath(language, `/topics/${slugify(topic)}/`));
    }
  }

  return { sectionPaths, subsectionPaths, seriesPaths, indexableTopicPaths };
}

function isSeriesDetail(pathname: string) {
  return /^\/(?:en\/)?series\/[^/]+\/$/.test(pathname);
}

function isTopicHub(pathname: string) {
  return /^\/(?:en\/)?topics\/[^/]+\/$/.test(pathname);
}

function sectionHubDepth(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'en') parts.shift();
  if (!parts[0] || !knownSectionSlugs.has(parts[0])) return 0;
  return parts.length;
}

let inventory: SitemapInventory | undefined;

export function isPublicSitemapPath(pathname: string) {
  const path = normalizePathname(pathname);
  if (path.startsWith('/ops/')) return false;

  inventory ??= buildInventory();

  if (isTopicHub(path)) return inventory.indexableTopicPaths.has(path);
  if (isSeriesDetail(path)) return inventory.seriesPaths.has(path);
  const sectionDepth = sectionHubDepth(path);
  if (sectionDepth === 1) return inventory.sectionPaths.has(path);
  if (sectionDepth === 2) return inventory.subsectionPaths.has(path);
  return true;
}

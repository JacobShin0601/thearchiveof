import type { CollectionEntry } from 'astro:content';
import topicRegistry from './data/topics.json';

export const SITE_TITLE = 'The Archive of';
export const SITE_DESCRIPTION =
  'Understand uncertainty. Make better decisions.';
export const SITE_URL = 'https://thearchiveof.com';

export const CONTENT_TYPES = ['foundation', 'research', 'current', 'implementation', 'perspective'] as const;

export const TOPICS = topicRegistry;
export const TOPIC_CLUSTERS = [...new Set(TOPICS.map((topic) => topic.cluster))].map((name) => ({
  name,
  description: TOPICS.find((topic) => topic.cluster === name)?.description ?? '',
  descriptionKo: TOPICS.find((topic) => topic.cluster === name)?.descriptionKo ?? '',
  topics: TOPICS.filter((topic) => topic.cluster === name).map((topic) => topic.slug),
}));

export const PLANNED_SERIES = ['Understanding Rates', 'Building AI Agents', 'Math for Markets'] as const;

export const SECTIONS = [
  {
    name: 'Investing',
    slug: 'investing',
    index: '01',
    description: 'Markets, macro, quantitative research, and portfolio thinking.',
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
    index: '02',
    description: 'Agents, RAG, enterprise transformation, and AI engineering.',
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
    index: '03',
    description: 'Reproducible experiments, data work, agentic engineering, and projects built with code.',
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
    index: '04',
    description: 'Probability, statistics, optimization, and mathematical finance.',
    subsections: [
      { name: 'Probability', slug: 'probability' },
      { name: 'Statistics', slug: 'statistics' },
      { name: 'Linear Algebra', slug: 'linear-algebra' },
      { name: 'Optimization', slug: 'optimization' },
      { name: 'Financial Mathematics', slug: 'financial-mathematics' },
    ],
  },
  {
    name: 'Notes',
    slug: 'misc',
    index: '05',
    description: 'Short notes, reading records, essays, and ideas still taking shape.',
    subsections: [
      { name: 'Short Notes', slug: 'notes' },
      { name: 'Reading', slug: 'reading' },
      { name: 'Career', slug: 'career' },
      { name: 'Essays', slug: 'essays' },
    ],
  },
] as const;

export type Section = (typeof SECTIONS)[number];

export function sectionPath(section: string) {
  return SECTIONS.find((item) => item.name === section)?.slug ?? 'archive';
}

export function subsectionPath(section: string, subsection: string) {
  const match = SECTIONS.find((item) => item.name === section)?.subsections.find(
    (item) => item.name === subsection,
  );
  return match?.slug ?? subsection.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function postPath(post: CollectionEntry<'posts'>) {
  const slug = post.id.split('/').at(-1)?.replace(/\.(md|mdx)$/, '') ?? post.id;
  const prefix = post.data.language === 'en' ? '/en' : '';
  return `${prefix}/${sectionPath(post.data.section)}/${subsectionPath(post.data.section, post.data.subsection)}/${slug}/`;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function topicPath(topic: string) {
  return `/topics/${slugify(topic)}/`;
}

export function seriesPath(series: string) {
  return `/series/${slugify(series)}/`;
}

export function labelFromSlug(slug: string) {
  const registered = TOPICS.find((topic) => topic.slug === slug);
  if (registered) return registered.name;
  const special: Record<string, string> = {
    ai: 'AI', rag: 'RAG', pca: 'PCA', mcmc: 'MCMC', qt: 'QT', fed: 'Fed', langgraph: 'LangGraph',
  };
  return slug.split('-').map((part) => special[part] ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

export function topicDefinition(slug: string) {
  return TOPICS.find((topic) => topic.slug === slug);
}

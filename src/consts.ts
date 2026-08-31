export const SITE_TITLE = 'The Archive of Ideas';
export const SITE_DESCRIPTION =
  'An independent research journal on investing, AI & AX, coding, and mathematics.';
export const SITE_URL = 'https://thearchiveof.com';

export const CATEGORIES = [
  {
    name: 'Investing',
    slug: 'investing',
    index: '01',
    description: 'Markets, macro, quantitative research, and portfolio thinking.',
    topics: ['Macro', 'Quant', 'Markets', 'Portfolio'],
  },
  {
    name: 'AI & AX',
    slug: 'ai',
    index: '02',
    description: 'Agents, RAG, enterprise transformation, and AI engineering.',
    topics: ['Agents', 'RAG', 'AX', 'Engineering'],
  },
  {
    name: 'Coding',
    slug: 'coding',
    index: '03',
    description: 'Python, data systems, experiments, and practical tutorials.',
    topics: ['Python', 'Data', 'Systems', 'Tutorials'],
  },
  {
    name: 'Mathematics',
    slug: 'math',
    index: '04',
    description: 'Probability, statistics, optimization, and mathematical finance.',
    topics: ['Probability', 'Statistics', 'Optimization', 'Finance'],
  },
] as const;

export type Category = (typeof CATEGORIES)[number];

export function categoryPath(category: string) {
  return CATEGORIES.find((item) => item.name === category)?.slug ?? 'archive';
}

export function postPath(id: string) {
  return `/notes/${id.replace(/\.(md|mdx)$/, '')}/`;
}

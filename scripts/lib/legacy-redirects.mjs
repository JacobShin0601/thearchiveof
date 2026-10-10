/**
 * Explicit legacy URL → current URL map.
 * Only published moves belong here. No wildcards. No home fallbacks.
 */
export const LEGACY_REDIRECTS = [
  {
    sources: [
      '/series/internal-llm-serving/',
      '/series/internal-llm-serving',
    ],
    target: '/series/agent-engineering/vllm-serving/',
    status: 301,
    reason: 'Series slug renamed to agent-engineering/vllm-serving',
  },
  {
    sources: [
      '/en/series/internal-llm-serving/',
      '/en/series/internal-llm-serving',
    ],
    target: '/en/series/agent-engineering/vllm-serving/',
    status: 301,
    reason: 'English series slug renamed',
  },
  {
    sources: [
      '/notes/ai/why-this-archive-is-open/',
      '/notes/ai/why-this-archive-is-open',
    ],
    target: '/misc/essays/why-this-archive-is-open/',
    status: 301,
    reason: 'Moved into Perspectives essays',
  },
  {
    sources: [
      '/ai/agents/why-this-archive-is-open/',
      '/ai/agents/why-this-archive-is-open',
    ],
    target: '/misc/essays/why-this-archive-is-open/',
    status: 301,
    reason: 'Moved into Perspectives essays',
  },
  {
    sources: [
      '/en/ai/agents/why-this-archive-is-open/',
      '/en/ai/agents/why-this-archive-is-open',
    ],
    target: '/en/misc/essays/why-this-archive-is-open/',
    status: 301,
    reason: 'English edition moved into Perspectives essays',
  },
  {
    sources: ['/sitemap.xml', '/sitemap_index.xml'],
    target: '/sitemap-index.xml',
    status: 301,
    reason: 'Common sitemap aliases used by crawlers and tools',
  },
];

export function flattenLegacyRedirects(entries = LEGACY_REDIRECTS) {
  return entries.flatMap((entry) => entry.sources.map((source) => ({
    source,
    target: entry.target,
    status: String(entry.status),
    reason: entry.reason,
  })));
}

export function renderRedirectsFile(entries = LEGACY_REDIRECTS) {
  const lines = [
    '# Generated from scripts/lib/legacy-redirects.mjs — edit the catalog, then run npm run write:redirects',
    ...flattenLegacyRedirects(entries).map(
      ({ source, target, status }) => `${source} ${target} ${status}`,
    ),
    '',
  ];
  return lines.join('\n');
}

import type { APIRoute } from 'astro';
import { INDEXABLE } from '../environment';
import { SITE_URL } from '../consts';

export const prerender = true;

const productionPolicy = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

# Training crawlers are controlled separately from search and user retrieval.
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap-index.xml
`;

const previewPolicy = `# Search crawlers may fetch pages only to read their noindex directive.
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Claude-SearchBot
Disallow: /

User-agent: Claude-User
Disallow: /

User-agent: *
Disallow: /
`;

export const GET: APIRoute = () => new Response(INDEXABLE ? productionPolicy : previewPolicy, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});

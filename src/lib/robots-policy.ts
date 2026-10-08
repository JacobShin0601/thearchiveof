import { SITE_URL } from '../site-origin.ts';

export const productionRobotsPolicy = `# The Archive — Production crawler policy

# OpenAI / ChatGPT Search
User-agent: OAI-SearchBot
Allow: /
Disallow: /api/

# OpenAI model-training crawler
User-agent: GPTBot
Allow: /
Disallow: /api/

# Anthropic / Claude Search
User-agent: Claude-SearchBot
Allow: /
Disallow: /api/

# Anthropic model-training crawler
User-agent: ClaudeBot
Allow: /
Disallow: /api/

# Perplexity search crawler
User-agent: PerplexityBot
Allow: /
Disallow: /api/

# Common Crawl
User-agent: CCBot
Allow: /
Disallow: /api/

# Google Gemini / AI training
User-agent: Google-Extended
Allow: /
Disallow: /api/

# Apple AI training
User-agent: Applebot-Extended
Allow: /
Disallow: /api/

# Meta AI crawler
User-agent: meta-externalagent
Allow: /
Disallow: /api/

# Major search engines
User-agent: Googlebot
Allow: /
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /api/

User-agent: DuckDuckBot
Allow: /
Disallow: /api/

User-agent: Applebot
Allow: /
Disallow: /api/

User-agent: Amazonbot
Allow: /
Disallow: /api/

User-agent: YandexBot
Allow: /
Disallow: /api/

# Default policy: The Archive is a public, crawlable publication
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap-index.xml
`;

export const previewRobotsPolicy = `# Drafts live here. Crawlers may fetch only to honor noindex.
User-agent: Googlebot
Allow: /
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /api/

User-agent: *
Disallow: /
`;

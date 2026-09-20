export const productionRobotsPolicy = `# The Archive — Production crawler policy

# OpenAI / ChatGPT Search
User-agent: OAI-SearchBot
Allow: /

# OpenAI model-training crawler
User-agent: GPTBot
Allow: /

# Anthropic / Claude Search
User-agent: Claude-SearchBot
Allow: /

# Anthropic model-training crawler
User-agent: ClaudeBot
Allow: /

# Perplexity search crawler
User-agent: PerplexityBot
Allow: /

# Common Crawl
User-agent: CCBot
Allow: /

# Google Gemini / AI training
User-agent: Google-Extended
Allow: /

# Apple AI training
User-agent: Applebot-Extended
Allow: /

# Meta AI crawler
User-agent: meta-externalagent
Allow: /

# Major search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: YandexBot
Allow: /

# Default policy: The Archive is a public, crawlable publication
User-agent: *
Allow: /

Sitemap: https://thearchiveof.com/sitemap-index.xml
`;

export const previewRobotsPolicy = `# Drafts live here. Crawlers may fetch only to honor noindex.
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Disallow: /
`;

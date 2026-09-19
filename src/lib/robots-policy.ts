export const productionRobotsPolicy = `User-agent: *
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

/** Known crawlers only. Raw user-agent strings are classified in memory and never stored. */
export const CRAWLER_CATALOG = [
  { key: 'google-extended', pattern: /Google-Extended/i, category: 'training', operator: 'Google', label: 'Google-Extended' },
  { key: 'oai-searchbot', pattern: /OAI-SearchBot/i, category: 'search', operator: 'OpenAI', label: 'OAI-SearchBot' },
  { key: 'chatgpt-user', pattern: /ChatGPT-User/i, category: 'user-fetch', operator: 'OpenAI', label: 'ChatGPT-User' },
  { key: 'gptbot', pattern: /GPTBot/i, category: 'training', operator: 'OpenAI', label: 'GPTBot' },
  { key: 'claude-user', pattern: /Claude-User/i, category: 'user-fetch', operator: 'Anthropic', label: 'Claude-User' },
  { key: 'claudebot', pattern: /ClaudeBot/i, category: 'training', operator: 'Anthropic', label: 'ClaudeBot' },
  { key: 'perplexitybot', pattern: /PerplexityBot/i, category: 'search', operator: 'Perplexity', label: 'PerplexityBot' },
  { key: 'bytespider', pattern: /Bytespider/i, category: 'training', operator: 'ByteDance', label: 'Bytespider' },
  { key: 'ccbot', pattern: /CCBot/i, category: 'training', operator: 'Common Crawl', label: 'CCBot' },
  { key: 'amazonbot', pattern: /Amazonbot/i, category: 'search', operator: 'Amazon', label: 'Amazonbot' },
  { key: 'applebot', pattern: /Applebot/i, category: 'search', operator: 'Apple', label: 'Applebot' },
  { key: 'meta-externalagent', pattern: /meta-externalagent/i, category: 'agent', operator: 'Meta', label: 'meta-externalagent' },
  { key: 'bingbot', pattern: /bingbot/i, category: 'search', operator: 'Microsoft', label: 'Bingbot' },
  { key: 'googlebot', pattern: /Googlebot/i, category: 'search', operator: 'Google', label: 'Googlebot' },
];

export const AI_REFERRER_CATALOG = [
  { key: 'chatgpt', pattern: /(^|\.)chatgpt\.com$/i, label: 'ChatGPT' },
  { key: 'perplexity', pattern: /(^|\.)perplexity\.ai$/i, label: 'Perplexity' },
  { key: 'gemini', pattern: /(^|\.)gemini\.google\.com$/i, label: 'Gemini' },
  { key: 'copilot', pattern: /(^|\.)copilot\.microsoft\.com$/i, label: 'Copilot' },
  { key: 'claude', pattern: /(^|\.)claude\.ai$/i, label: 'Claude' },
];

export const CRAWLER_UA_OR_FILTER = CRAWLER_CATALOG.map((entry) => ({
  userAgent_like: `%${entry.label}%`,
}));

export function classifyCrawler(userAgent) {
  if (typeof userAgent !== 'string' || !userAgent) return null;
  for (const entry of CRAWLER_CATALOG) {
    if (entry.pattern.test(userAgent)) {
      return {
        key: entry.key,
        category: entry.category,
        operator: entry.operator,
        label: entry.label,
      };
    }
  }
  return null;
}

export function classifyAiReferrer(host) {
  if (typeof host !== 'string' || !host) return null;
  const normalized = host.trim().toLowerCase().replace(/^www\./, '');
  for (const entry of AI_REFERRER_CATALOG) {
    if (entry.pattern.test(normalized)) {
      return { key: entry.key, label: entry.label, host: normalized };
    }
  }
  return null;
}

export function statusBucket(status) {
  const code = Number(status);
  if (!Number.isInteger(code) || code < 100 || code > 599) return null;
  if (code < 300) return '2xx';
  if (code < 400) return '3xx';
  if (code < 500) return '4xx';
  return '5xx';
}

import { ARTICLE_CATALOG } from '../_generated/article-catalog.js';

const DAY_MS = 86_400_000;

export const ANALYTICS_SCHEMA_VERSION = 2;
export const ALLOWED_ANALYTICS_WINDOWS = new Set([7, 30, 90]);
export const SMALL_SAMPLE_THRESHOLD = 20;
export const SEARCH_CRAWL_CATEGORIES = new Set(['search']);
export const AI_CRAWL_CATEGORIES = new Set(['training', 'agent', 'user-fetch']);

export function shiftDay(day, delta) {
  const value = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(value.valueOf())) throw new Error('Invalid analytics day');
  return new Date(value.valueOf() + delta * DAY_MS).toISOString().slice(0, 10);
}

export function analyticsWindow(rangeEnd, days) {
  if (!ALLOWED_ANALYTICS_WINDOWS.has(days)) throw new Error('Invalid analytics window');
  return {
    currentStart: shiftDay(rangeEnd, -days),
    currentEnd: rangeEnd,
    previousStart: shiftDay(rangeEnd, -(days * 2)),
    previousEnd: shiftDay(rangeEnd, -days),
  };
}

export function sumRows(rows) {
  return rows.reduce((total, row) => ({
    requests: total.requests + Number(row.requests ?? 0),
    visits: total.visits + Number(row.visits ?? 0),
    bytes: total.bytes + Number(row.bytes ?? 0),
  }), { requests: 0, visits: 0, bytes: 0 });
}

export function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function safeAnalyticsPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) return false;
  if (path.startsWith('/api/') || path.startsWith('/ops/')) return false;
  if (path.startsWith('/_astro/') || path.startsWith('/assets/')) return false;
  return !/\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|webp|woff2?)(?:$|\?)/i.test(path);
}

export function normalizeAnalyticsPath(path) {
  if (typeof path !== 'string') return '';
  const trimmed = path.split('?')[0]?.split('#')[0] ?? '';
  if (!trimmed.startsWith('/')) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function lookupArticle(path) {
  const normalized = normalizeAnalyticsPath(path);
  return ARTICLE_CATALOG[normalized] ?? null;
}

export function reviewState(nextReviewDate, today = new Date()) {
  if (!nextReviewDate) return 'unscheduled';
  const due = new Date(`${nextReviewDate}T00:00:00.000Z`);
  if (Number.isNaN(due.valueOf())) return 'unscheduled';
  const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (due.valueOf() < current) return 'overdue';
  const upcoming = current + (30 * DAY_MS);
  if (due.valueOf() <= upcoming) return 'upcoming';
  return 'scheduled';
}

export async function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

export function bearerToken(request) {
  const value = request.headers.get('Authorization') ?? '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function metricMap(rows, keyField, valueFields) {
  const map = new Map();
  for (const row of rows) {
    const key = row[keyField];
    if (!key) continue;
    const current = map.get(key) ?? Object.fromEntries(valueFields.map((field) => [field, 0]));
    for (const field of valueFields) current[field] += Number(row[field] ?? 0);
    map.set(key, current);
  }
  return map;
}

export function buildArticleRows({
  pathRows,
  crawlerPathRows,
  referrerPathRows,
  usefulRows,
  eventRows,
  errorPathRows,
  today = new Date(),
}) {
  const visitsByPath = metricMap(pathRows, 'path', ['visits', 'requests']);
  const crawlerByPath = metricMap(crawlerPathRows, 'path', ['requests']);
  const referrerByPath = metricMap(referrerPathRows, 'path', ['visits', 'requests']);
  const errorsByPath = metricMap(errorPathRows, 'path', ['requests']);
  const usefulByKey = metricMap(usefulRows, 'article', ['count']);
  const eventsByKey = new Map();
  for (const row of eventRows) {
    if (!row.article) continue;
    const current = eventsByKey.get(row.article) ?? {};
    current[row.event] = Number(row.count ?? 0);
    eventsByKey.set(row.article, current);
  }

  const paths = new Set([
    ...visitsByPath.keys(),
    ...crawlerByPath.keys(),
    ...referrerByPath.keys(),
    ...errorsByPath.keys(),
  ]);

  const articles = [];
  for (const path of paths) {
    const normalized = normalizeAnalyticsPath(path);
    if (!safeAnalyticsPath(normalized)) continue;
    const meta = lookupArticle(normalized);
    if (!meta) continue;
    const visits = visitsByPath.get(path)?.visits ?? visitsByPath.get(normalized)?.visits ?? 0;
    const requests = visitsByPath.get(path)?.requests ?? visitsByPath.get(normalized)?.requests ?? 0;
    const crawlerRequests = crawlerByPath.get(path)?.requests ?? crawlerByPath.get(normalized)?.requests ?? 0;
    const aiReferrerVisits = referrerByPath.get(path)?.visits ?? referrerByPath.get(normalized)?.visits ?? 0;
    const errorRequests = errorsByPath.get(path)?.requests ?? errorsByPath.get(normalized)?.requests ?? 0;
    const useful = usefulByKey.get(meta.key)?.count ?? 0;
    const events = eventsByKey.get(meta.key) ?? {};
    const article = {
      path: meta.path,
      key: meta.key,
      title: meta.title,
      language: meta.language,
      section: meta.section,
      subsection: meta.subsection,
      contentType: meta.contentType,
      topics: meta.topics,
      primaryTopic: meta.primaryTopic,
      freshness: meta.freshness,
      lastReviewed: meta.lastReviewed,
      nextReviewDate: meta.nextReviewDate,
      reviewState: reviewState(meta.nextReviewDate, today),
      visits,
      requests,
      crawlerRequests,
      aiReferrerVisits,
      errorRequests,
      useful,
      events: {
        code_run: Number(events.code_run ?? 0),
        language_switch: Number(events.language_switch ?? 0),
        reaction_added: Number(events.reaction_added ?? 0),
      },
    };
    articles.push({
      ...article,
      impact: articleImpact(article),
    });
  }

  return articles.sort((a, b) => b.impact.score - a.impact.score || b.visits - a.visits || b.crawlerRequests - a.crawlerRequests || a.path.localeCompare(b.path));
}

/** Reference-only reader impact. Useful is weighted highest; not a ranking score for SEO. */
export function articleImpact(article) {
  const useful = Number(article?.useful ?? 0);
  const codeRun = Number(article?.events?.code_run ?? 0);
  const languageSwitch = Number(article?.events?.language_switch ?? 0);
  const visits = Number(article?.visits ?? 0);
  const score = useful * 3 + codeRun * 2 + languageSwitch;
  const usefulRate = useful / Math.max(visits, 1);
  let label = 'weak';
  if (score >= 9 || (visits >= 20 && usefulRate >= 0.1)) label = 'strong';
  else if (score >= 3 || (visits >= 10 && useful > 0)) label = 'moderate';
  return {
    score,
    usefulRate,
    label,
  };
}

export function summarizeTrafficSignals(crawlers, humanVisits) {
  const search = { requests: 0, bytes: 0 };
  const ai = { requests: 0, bytes: 0, training: 0, userFetch: 0, agent: 0 };
  for (const row of crawlers ?? []) {
    const requests = Number(row.requests ?? 0);
    const bytes = Number(row.bytes ?? 0);
    const category = row.category;
    if (SEARCH_CRAWL_CATEGORIES.has(category)) {
      search.requests += requests;
      search.bytes += bytes;
      continue;
    }
    if (AI_CRAWL_CATEGORIES.has(category)) {
      ai.requests += requests;
      ai.bytes += bytes;
      if (category === 'training') ai.training += requests;
      if (category === 'user-fetch') ai.userFetch += requests;
      if (category === 'agent') ai.agent += requests;
    }
  }
  return {
    human: {
      visits: Number(humanVisits ?? 0),
      note: 'Cloudflare visits are not a pure human count; pair with Useful and Lab events.',
    },
    search,
    ai,
  };
}

export function buildStrategyCandidates(articles, {
  previousAiReferrerByTopic = new Map(),
  smallSampleThreshold = SMALL_SAMPLE_THRESHOLD,
} = {}) {
  const byKey = new Map();
  for (const article of articles) {
    const siblings = byKey.get(article.key) ?? [];
    siblings.push(article);
    byKey.set(article.key, siblings);
  }

  const topicAiNow = new Map();
  for (const article of articles) {
    const topic = article.primaryTopic ?? article.topics?.[0];
    if (!topic) continue;
    topicAiNow.set(topic, (topicAiNow.get(topic) ?? 0) + article.aiReferrerVisits);
  }

  const candidates = [];
  const push = (candidate) => {
    const sample = Math.max(candidate.visits ?? 0, candidate.crawlerRequests ?? 0, candidate.aiReferrerVisits ?? 0, candidate.errorRequests ?? 0);
    candidates.push({
      ...candidate,
      smallSample: sample < smallSampleThreshold,
      note: sample < smallSampleThreshold
        ? '표본이 작습니다. 인과관계보다 방향성만 읽으세요.'
        : '집계 신호입니다. 편집 판단은 직접 확인하세요.',
    });
  };

  for (const article of articles) {
    if (article.crawlerRequests >= 10 && article.visits <= Math.max(2, article.crawlerRequests * 0.05)) {
      push({
        type: 'citation_discovery',
        action: 'expand',
        reason: '알려진 AI/검색 크롤은 많은데 사람 visits가 적습니다.',
        path: article.path,
        key: article.key,
        title: article.title,
        language: article.language,
        topic: article.primaryTopic,
        visits: article.visits,
        crawlerRequests: article.crawlerRequests,
        aiReferrerVisits: article.aiReferrerVisits,
      });
    }

    if (article.visits >= 20 && article.crawlerRequests === 0) {
      push({
        type: 'distribution_gap',
        action: 'defend',
        reason: '사람 visits는 있는데 알려진 AI 크롤러 요청이 없습니다.',
        path: article.path,
        key: article.key,
        title: article.title,
        language: article.language,
        topic: article.primaryTopic,
        visits: article.visits,
        crawlerRequests: article.crawlerRequests,
        aiReferrerVisits: article.aiReferrerVisits,
      });
    }

    if (article.visits > 0 && article.reviewState === 'overdue') {
      push({
        type: 'stale_with_traffic',
        action: 'refresh',
        reason: 'visits가 있는데 검토 기한이 지났습니다.',
        path: article.path,
        key: article.key,
        title: article.title,
        language: article.language,
        topic: article.primaryTopic,
        visits: article.visits,
        crawlerRequests: article.crawlerRequests,
        aiReferrerVisits: article.aiReferrerVisits,
        nextReviewDate: article.nextReviewDate,
      });
    }

    if (article.errorRequests >= 10 && article.errorRequests >= Math.max(10, article.requests * 0.2)) {
      push({
        type: 'error_spike',
        action: 'fix',
        reason: '이 경로에서 4xx 응답이 두드러집니다.',
        path: article.path,
        key: article.key,
        title: article.title,
        language: article.language,
        topic: article.primaryTopic,
        visits: article.visits,
        errorRequests: article.errorRequests,
        requests: article.requests,
      });
    }
  }

  for (const [topic, current] of topicAiNow.entries()) {
    const previous = previousAiReferrerByTopic.get(topic) ?? 0;
    if (current >= 5 && (previous === 0 || current >= previous * 1.5)) {
      push({
        type: 'ai_referral_growth',
        action: 'expand',
        reason: '특정 주제에서 AI 유입이 늘고 있습니다.',
        topic,
        aiReferrerVisits: current,
        previousAiReferrerVisits: previous,
      });
    }
  }

  for (const [key, siblings] of byKey.entries()) {
    const ko = siblings.find((row) => row.language === 'ko');
    const en = siblings.find((row) => row.language === 'en');
    if (!ko || !en) continue;
    const high = Math.max(ko.visits, en.visits);
    const low = Math.min(ko.visits, en.visits);
    if (high >= 20 && low <= high * 0.35) {
      push({
        type: 'translation_gap',
        action: 'refresh',
        reason: '같은 글의 한국어·영어 visits 차이가 큽니다.',
        key,
        title: ko.title,
        koVisits: ko.visits,
        enVisits: en.visits,
        path: ko.visits >= en.visits ? en.path : ko.path,
        visits: high,
      });
    }
  }

  return candidates;
}

export function successRate(statusRows) {
  const totals = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  for (const row of statusRows) {
    const bucket = row.bucket;
    if (bucket in totals) totals[bucket] += Number(row.requests ?? 0);
  }
  const all = totals['2xx'] + totals['3xx'] + totals['4xx'] + totals['5xx'];
  return {
    buckets: totals,
    total: all,
    successShare: all === 0 ? null : (totals['2xx'] + totals['3xx']) / all,
  };
}

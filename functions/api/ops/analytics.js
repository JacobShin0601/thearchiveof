import {
  ANALYTICS_SCHEMA_VERSION,
  ALLOWED_ANALYTICS_WINDOWS,
  analyticsWindow,
  bearerToken,
  buildArticleRows,
  buildDataQuality,
  buildStrategyCandidates,
  lookupArticle,
  metricWithCoverage,
  safeAnalyticsPath,
  successRate,
  summarizeErrorOps,
  summarizeTrafficSignals,
  sumRows,
  tokenMatches,
} from '../../lib/analytics-dashboard.js';
import { json, methodNotAllowed } from '../../lib/http.js';

function results(value) {
  return Array.isArray(value?.results) ? value.results : [];
}

function privateJson(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders,
    },
  });
}

function topicAiMap(pathRows) {
  const map = new Map();
  for (const row of pathRows) {
    const article = lookupArticle(row.path);
    const topic = article?.primaryTopic ?? article?.topics?.[0];
    if (!topic) continue;
    map.set(topic, (map.get(topic) ?? 0) + Number(row.visits ?? 0));
  }
  return map;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return methodNotAllowed();
  if (env?.DEPLOY_ENV !== 'preview') return json({ ok: false, error: 'not_found' }, 404);
  if (!env.DB || !env.ANALYTICS_READ_TOKEN) {
    return privateJson({ ok: false, error: 'unavailable' }, 503);
  }
  if (!await tokenMatches(bearerToken(request), env.ANALYTICS_READ_TOKEN)) {
    return privateJson(
      { ok: false, error: 'unauthorized' },
      401,
      { 'WWW-Authenticate': 'Bearer realm="The Archive analytics"' },
    );
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') ?? 30);
  if (!ALLOWED_ANALYTICS_WINDOWS.has(days)) {
    return privateJson({ ok: false, error: 'invalid_window', allowed: [7, 30, 90] }, 400);
  }

  const state = await env.DB.prepare(
    `SELECT source, refreshed_at, range_start, range_end, schema_version
     FROM analytics_sync_state
     WHERE source = 'cloudflare-zone-analytics'`,
  ).first();
  if (!state) return privateJson({ ok: false, error: 'not_synced' }, 503);

  const bounds = analyticsWindow(state.range_end, days);
  const dailyResult = await env.DB.prepare(
    `SELECT day, SUM(requests) AS requests, SUM(visits) AS visits, SUM(bytes) AS bytes
     FROM analytics_daily
     WHERE day >= ? AND day < ?
     GROUP BY day
     ORDER BY day`,
  ).bind(bounds.previousStart, bounds.currentEnd).all();
  const daily = results(dailyResult).map((row) => ({
    day: row.day,
    requests: Number(row.requests ?? 0),
    visits: Number(row.visits ?? 0),
    bytes: Number(row.bytes ?? 0),
  }));
  const currentRows = daily.filter((row) => row.day >= bounds.currentStart);
  const previousRows = daily.filter((row) => row.day < bounds.currentStart);
  const current = sumRows(currentRows);
  const previous = sumRows(previousRows);

  const currentCoverage = await env.DB.prepare(
    `SELECT COUNT(DISTINCT day) AS days
     FROM analytics_daily
     WHERE day >= ? AND day < ?`,
  ).bind(bounds.currentStart, bounds.currentEnd).first().catch(() => null);
  const previousCoverage = await env.DB.prepare(
    `SELECT COUNT(DISTINCT day) AS days
     FROM analytics_daily
     WHERE day >= ? AND day < ?`,
  ).bind(bounds.previousStart, bounds.previousEnd).first().catch(() => null);
  const dataQuality = buildDataQuality({
    requestedDays: days,
    currentCoverageDays: Number(currentCoverage?.days ?? currentRows.length),
    previousCoverageDays: Number(previousCoverage?.days ?? previousRows.length),
  });

  const pathResult = await env.DB.prepare(
    `SELECT path, SUM(requests) AS requests, SUM(visits) AS visits
     FROM analytics_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY path
     ORDER BY visits DESC, requests DESC
     LIMIT 200`,
  ).bind(bounds.currentStart, bounds.currentEnd).all();
  const topPaths = results(pathResult)
    .filter((row) => safeAnalyticsPath(row.path))
    .slice(0, 20)
    .map((row) => ({
      path: row.path,
      requests: Number(row.requests ?? 0),
      visits: Number(row.visits ?? 0),
      article: lookupArticle(row.path),
    }));

  const countryResult = await env.DB.prepare(
    `SELECT country, SUM(requests) AS requests, SUM(visits) AS visits
     FROM analytics_country_daily
     WHERE day >= ? AND day < ?
     GROUP BY country
     ORDER BY visits DESC, requests DESC
     LIMIT 20`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const statusResult = await env.DB.prepare(
    `SELECT bucket, SUM(requests) AS requests
     FROM analytics_status_daily
     WHERE day >= ? AND day < ?
     GROUP BY bucket`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const crawlerResult = await env.DB.prepare(
    `SELECT crawler, category, operator, SUM(requests) AS requests, SUM(bytes) AS bytes
     FROM analytics_crawler_daily
     WHERE day >= ? AND day < ?
     GROUP BY crawler, category, operator
     ORDER BY requests DESC
     LIMIT 50`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const crawlerPathResult = await env.DB.prepare(
    `SELECT path, crawler, SUM(requests) AS requests
     FROM analytics_crawler_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY path, crawler
     ORDER BY requests DESC
     LIMIT 200`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const crawlerStatusResult = await env.DB.prepare(
    `SELECT bucket, SUM(requests) AS requests
     FROM analytics_crawler_status_daily
     WHERE day >= ? AND day < ?
     GROUP BY bucket`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const referrerResult = await env.DB.prepare(
    `SELECT source, SUM(requests) AS requests, SUM(visits) AS visits
     FROM analytics_referrer_daily
     WHERE day >= ? AND day < ? AND source != 'other'
     GROUP BY source
     ORDER BY visits DESC, requests DESC
     LIMIT 20`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const referrerPathResult = await env.DB.prepare(
    `SELECT source, path, SUM(requests) AS requests, SUM(visits) AS visits
     FROM analytics_referrer_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY source, path
     ORDER BY visits DESC, requests DESC
     LIMIT 100`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const previousReferrerPathResult = await env.DB.prepare(
    `SELECT source, path, SUM(visits) AS visits
     FROM analytics_referrer_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY source, path`,
  ).bind(bounds.previousStart, bounds.previousEnd).all().catch(() => ({ results: [] }));

  const errorPathResult = await env.DB.prepare(
    `SELECT path, SUM(requests) AS requests
     FROM analytics_error_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY path
     ORDER BY requests DESC
     LIMIT 50`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const errorDetailResult = await env.DB.prepare(
    `SELECT path, status, class, SUM(requests) AS requests
     FROM analytics_error_detail_daily
     WHERE day >= ? AND day < ?
     GROUP BY path, status, class
     ORDER BY requests DESC
     LIMIT 200`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const serverErrorResult = await env.DB.prepare(
    `SELECT path, status, SUM(requests) AS requests
     FROM analytics_server_error_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY path, status
     ORDER BY requests DESC
     LIMIT 100`,
  ).bind(bounds.currentStart, bounds.currentEnd).all().catch(() => ({ results: [] }));

  const capability = await env.DB.prepare(
    `SELECT key, available, detail, checked_at
     FROM analytics_capability
     WHERE key = 'clientRefererHost'`,
  ).first().catch(() => null);

  const usefulResult = await env.DB.prepare(
    `SELECT article_slug AS article, COUNT(*) AS active_useful
     FROM article_reactions
     WHERE reaction_type = 'useful' AND actor_type = 'human'
     GROUP BY article_slug
     ORDER BY active_useful DESC, article_slug
     LIMIT 50`,
  ).all();
  const eventResult = await env.DB.prepare(
    `SELECT event_name AS event, article_slug AS article, COUNT(*) AS total
     FROM interaction_events
     WHERE actor_type = 'human'
       AND created_at >= ?
       AND created_at < ?
       AND event_name IN ('reaction_added', 'reaction_removed', 'code_run', 'language_switch')
     GROUP BY event_name, article_slug
     ORDER BY total DESC, event_name, article_slug
     LIMIT 500`,
  ).bind(`${bounds.currentStart}T00:00:00.000Z`, `${bounds.currentEnd}T00:00:00.000Z`).all();

  const pathRows = results(pathResult).map((row) => ({
    path: row.path,
    requests: Number(row.requests ?? 0),
    visits: Number(row.visits ?? 0),
  }));
  const crawlerPathRows = results(crawlerPathResult).map((row) => ({
    path: row.path,
    crawler: row.crawler,
    requests: Number(row.requests ?? 0),
  }));
  const referrerPathRows = results(referrerPathResult).map((row) => ({
    source: row.source,
    path: row.path,
    requests: Number(row.requests ?? 0),
    visits: Number(row.visits ?? 0),
  }));
  const errorPathRows = results(errorPathResult).map((row) => ({
    path: row.path,
    requests: Number(row.requests ?? 0),
  }));
  const errorDetailRows = results(errorDetailResult).map((row) => ({
    path: row.path,
    status: Number(row.status ?? 0),
    class: row.class,
    requests: Number(row.requests ?? 0),
  }));
  const serverErrorRows = results(serverErrorResult).map((row) => ({
    path: row.path,
    status: Number(row.status ?? 0),
    requests: Number(row.requests ?? 0),
  }));
  const errorOps = summarizeErrorOps({
    detailRows: errorDetailRows,
    serverRows: serverErrorRows,
  });
  const usefulRows = results(usefulResult).map((row) => ({
    article: row.article,
    count: Number(row.active_useful ?? 0),
  }));
  const eventRows = results(eventResult).map((row) => ({
    event: row.event,
    article: row.article,
    count: Number(row.total ?? 0),
  }));

  const articles = buildArticleRows({
    pathRows,
    crawlerPathRows,
    referrerPathRows,
    usefulRows,
    eventRows,
    errorPathRows,
  });
  const previousTopicAi = topicAiMap(results(previousReferrerPathResult).map((row) => ({
    path: row.path,
    visits: Number(row.visits ?? 0),
  })));
  const candidates = buildStrategyCandidates(articles, {
    previousAiReferrerByTopic: previousTopicAi,
  });

  const crawlerStatuses = results(crawlerStatusResult).map((row) => ({
    bucket: row.bucket,
    requests: Number(row.requests ?? 0),
  }));
  const referrerAvailable = capability ? Number(capability.available) === 1 : referrerPathRows.length > 0;
  const crawlers = results(crawlerResult).map((row) => ({
    crawler: row.crawler,
    category: row.category,
    operator: row.operator,
    requests: Number(row.requests ?? 0),
    bytes: Number(row.bytes ?? 0),
  }));
  const signals = summarizeTrafficSignals(crawlers, current.visits);

  return privateJson({
    ok: true,
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    metadata: {
      source: state.source,
      refreshedAt: state.refreshed_at,
      throughDay: state.range_end,
      windowDays: days,
      windowStart: bounds.currentStart,
      windowEnd: bounds.currentEnd,
      privacy: 'Aggregated daily metrics only; no raw IP, fingerprint, full user-agent, or visitor identifier.',
      capabilities: {
        referrers: {
          available: referrerAvailable,
          detail: capability?.detail
            ?? (referrerAvailable
              ? 'Referrer host dimensions are available.'
              : 'Referrer host dimensions have not been synced yet.'),
          checkedAt: capability?.checked_at ?? null,
        },
      },
    },
    dataQuality,
    overview: {
      requests: metricWithCoverage(current.requests, previous.requests, dataQuality),
      visits: metricWithCoverage(current.visits, previous.visits, dataQuality),
      bytes: metricWithCoverage(current.bytes, previous.bytes, dataQuality),
    },
    signals,
    daily: currentRows,
    readers: {
      topPaths,
      countries: results(countryResult).map((row) => ({
        country: row.country,
        requests: Number(row.requests ?? 0),
        visits: Number(row.visits ?? 0),
      })),
      statuses: successRate(results(statusResult).map((row) => ({
        bucket: row.bucket,
        requests: Number(row.requests ?? 0),
      }))),
      topArticles: articles.filter((row) => row.visits > 0).slice(0, 20),
    },
    errors: {
      available: errorDetailRows.length > 0 || serverErrorRows.length > 0,
      ...errorOps,
      legacyTopPaths: errorPathRows.slice(0, 20),
    },
    aiCrawl: {
      crawlers,
      topPaths: crawlerPathRows
        .filter((row) => safeAnalyticsPath(row.path))
        .slice(0, 20)
        .map((row) => ({
          path: row.path,
          crawler: row.crawler,
          requests: row.requests,
          article: lookupArticle(row.path),
        })),
      statuses: successRate(crawlerStatuses),
    },
    aiReferral: {
      available: referrerAvailable,
      unavailableReason: referrerAvailable ? null : (capability?.detail ?? 'Referrer dimensions unavailable.'),
      sources: results(referrerResult).map((row) => ({
        source: row.source,
        requests: Number(row.requests ?? 0),
        visits: Number(row.visits ?? 0),
      })),
      topPaths: referrerPathRows
        .filter((row) => safeAnalyticsPath(row.path))
        .slice(0, 20)
        .map((row) => ({
          source: row.source,
          path: row.path,
          requests: row.requests,
          visits: row.visits,
          article: lookupArticle(row.path),
        })),
    },
    strategy: {
      articles: articles.slice(0, 50),
      candidates,
    },
    engagement: {
      allTimeActiveUseful: usefulRows,
      // Backward-compatible alias for all-time active Useful.
      activeUseful: usefulRows,
      periodEvents: eventRows,
      events: eventRows,
    },
    definitions: {
      requests: 'Cloudflare edge HTTP requests from eyeball traffic; this includes non-HTML assets.',
      visits: 'Cloudflare Zone visits: a page view originating from another site or a direct link. Not unique humans.',
      crawlers: 'Known search, training, agent, and user-fetch bots classified from user-agent strings in memory. Raw user-agent strings are not stored.',
      aiReferral: 'Visits whose referrer host matches ChatGPT, Perplexity, Gemini, Copilot, or Claude.',
      allTimeActiveUseful: 'Currently active Useful reactions across all time.',
      periodUsefulAdded: 'Useful reactions added during the selected window.',
      periodUsefulRemoved: 'Useful reactions removed during the selected window.',
      signals: 'Zone visits, search-crawler requests, and AI-crawler requests (training / user-fetch / agent) kept as separate layers.',
      impact: 'Reference-only period impact: periodUsefulAdded×3 + code_run×2 + language_switch. Not an SEO rank and not based on all-time Useful.',
      change: 'Decimal change versus the immediately preceding window of equal length when dataQuality.comparisonComplete is true; otherwise null.',
      dataQuality: 'Coverage of synced UTC days for the current and previous windows.',
      candidates: 'Rule-based editorial candidates only. They do not replace judgment.',
      errors: '4xx rows classified by path pattern into scanner/content/asset/api/other with exact status codes. Raw User-Agent strings are never stored. Judge deploy impact on 1-day and 7-day windows, not a 30-day rolling mix.',
    },
    interpretationHints: [
      'Check dataQuality.comparisonComplete before interpreting growth rates.',
      'Separate Zone visits, search crawl, and AI crawl before comparing articles.',
      'Do not treat Zone visits as unique humans or page views.',
      'Use periodUsefulAdded with period visits for rates; keep allTimeActiveUseful as a long-term trust signal.',
      'Treat small samples as directional rather than causal evidence.',
      'Strategy candidates suggest Expand, Refresh, Defend, or Fix; they do not write the strategy for you.',
      'Use errors.content4xx and errors.scanner4xx separately; do not treat total 4xx as reader failures.',
      'After a deploy, compare complete UTC days for 1d and 7d — not the previous 30-day blend.',
    ],
  });
}

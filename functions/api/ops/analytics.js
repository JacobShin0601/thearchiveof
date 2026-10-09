import {
  ANALYTICS_SCHEMA_VERSION,
  ALLOWED_ANALYTICS_WINDOWS,
  analyticsWindow,
  bearerToken,
  percentChange,
  safeAnalyticsPath,
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

function metric(current, previous) {
  return {
    current,
    previous,
    change: percentChange(current, previous),
  };
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

  const pathResult = await env.DB.prepare(
    `SELECT path, SUM(requests) AS requests, SUM(visits) AS visits
     FROM analytics_path_daily
     WHERE day >= ? AND day < ?
     GROUP BY path
     ORDER BY visits DESC, requests DESC
     LIMIT 100`,
  ).bind(bounds.currentStart, bounds.currentEnd).all();
  const topPaths = results(pathResult)
    .filter((row) => safeAnalyticsPath(row.path))
    .slice(0, 20)
    .map((row) => ({
      path: row.path,
      requests: Number(row.requests ?? 0),
      visits: Number(row.visits ?? 0),
    }));

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
     WHERE actor_type = 'human' AND created_at >= ? AND created_at < ?
     GROUP BY event_name, article_slug
     ORDER BY total DESC, event_name, article_slug
     LIMIT 100`,
  ).bind(`${bounds.currentStart}T00:00:00.000Z`, `${bounds.currentEnd}T00:00:00.000Z`).all();

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
      privacy: 'Aggregated daily metrics only; no raw IP, fingerprint, or visitor identifier.',
    },
    overview: {
      requests: metric(current.requests, previous.requests),
      visits: metric(current.visits, previous.visits),
      bytes: metric(current.bytes, previous.bytes),
    },
    daily: currentRows,
    topPaths,
    engagement: {
      activeUseful: results(usefulResult).map((row) => ({
        article: row.article,
        count: Number(row.active_useful ?? 0),
      })),
      events: results(eventResult).map((row) => ({
        event: row.event,
        article: row.article,
        count: Number(row.total ?? 0),
      })),
    },
    definitions: {
      requests: 'Cloudflare edge HTTP requests from eyeball traffic; this includes non-HTML assets.',
      visits: 'Cloudflare visits: a page view originating from another site or a direct link.',
      activeUseful: 'Current active Useful reactions from anonymous human browsers.',
      change: 'Decimal change versus the immediately preceding window of equal length; null means the prior value was zero.',
    },
    interpretationHints: [
      'Separate readership volume from engagement; requests are not page views.',
      'Check data freshness before drawing a conclusion.',
      'Treat small samples as directional rather than causal evidence.',
      'Do not infer individual behavior from aggregate path totals.',
    ],
  });
}

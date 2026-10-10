import {
  AI_REFERRER_CATALOG,
  CRAWLER_UA_OR_FILTER,
  classifyAiReferrer,
  classifyCrawler,
  classifyErrorPath,
  statusBucket,
} from './analytics-catalog.mjs';

const DAY_MS = 86_400_000;
export const ANALYTICS_SOURCE = 'cloudflare-zone-analytics';
export const ANALYTICS_SCHEMA_VERSION = 3;

export {
  AI_REFERRER_CATALOG,
  classifyAiReferrer,
  classifyCrawler,
  classifyErrorPath,
  statusBucket,
};

export function scopedZoneId(body) {
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new Error(`Cloudflare GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`);
  }
  const ids = (body?.data?.viewer?.zones ?? [])
    .map((zone) => zone?.zoneTag)
    .filter((value) => typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value));
  if (ids.length !== 1) {
    throw new Error(`Analytics token must expose exactly one zone; received ${ids.length}`);
  }
  return ids[0];
}

export function completeUtcDays(days, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 180) {
    throw new Error('days must be an integer between 1 and 180');
  }
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.valueOf() - days * DAY_MS);
  return Array.from({ length: days }, (_, index) => {
    const dayStart = new Date(start.valueOf() + index * DAY_MS);
    const dayEnd = new Date(dayStart.valueOf() + DAY_MS);
    return {
      day: dayStart.toISOString().slice(0, 10),
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
    };
  });
}

function graphQlString(value) {
  return JSON.stringify(value);
}

function baseFilter({ hostname, start, end }) {
  return `{
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
          }`;
}

function crawlerOrFilter() {
  return CRAWLER_UA_OR_FILTER.map((entry) => `{ userAgent_like: ${graphQlString(entry.userAgent_like)} }`).join('\n');
}

export function dayQuery({ zoneId, hostname, start, end }) {
  for (const [name, value] of Object.entries({ zoneId, hostname, start, end })) {
    if (!value || typeof value !== 'string') throw new Error(`Missing ${name}`);
  }
  const filter = baseFilter({ hostname, start, end });
  return `query ArchiveAnalytics {
    viewer {
      zones(filter: { zoneTag: ${graphQlString(zoneId)} }) {
        totals: httpRequestsAdaptiveGroups(
          limit: 1
          filter: ${filter}
        ) {
          count
          sum { visits edgeResponseBytes }
        }
        paths: httpRequestsAdaptiveGroups(
          limit: 1000
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          sum { visits }
          dimensions { clientRequestPath }
        }
        statuses: httpRequestsAdaptiveGroups(
          limit: 100
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          dimensions { edgeResponseStatus }
        }
        countries: httpRequestsAdaptiveGroups(
          limit: 40
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          sum { visits }
          dimensions { clientCountryName }
        }
        userAgents: httpRequestsAdaptiveGroups(
          limit: 200
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          sum { visits edgeResponseBytes }
          dimensions { userAgent }
        }
        crawlerPaths: httpRequestsAdaptiveGroups(
          limit: 1000
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
            OR: [
${crawlerOrFilter()}
            ]
          }
        ) {
          count
          dimensions { clientRequestPath userAgent }
        }
        crawlerStatuses: httpRequestsAdaptiveGroups(
          limit: 100
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
            OR: [
${crawlerOrFilter()}
            ]
          }
        ) {
          count
          dimensions { edgeResponseStatus }
        }
        errorPaths: httpRequestsAdaptiveGroups(
          limit: 200
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
            edgeResponseStatus_geq: 400
            edgeResponseStatus_lt: 500
          }
        ) {
          count
          dimensions { clientRequestPath edgeResponseStatus }
        }
        serverErrorPaths: httpRequestsAdaptiveGroups(
          limit: 100
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
            edgeResponseStatus_geq: 500
            edgeResponseStatus_lt: 600
          }
        ) {
          count
          dimensions { clientRequestPath edgeResponseStatus }
        }
      }
    }
  }`;
}

export function referrerQuery({ zoneId, hostname, start, end }) {
  for (const [name, value] of Object.entries({ zoneId, hostname, start, end })) {
    if (!value || typeof value !== 'string') throw new Error(`Missing ${name}`);
  }
  const filter = baseFilter({ hostname, start, end });
  return `query ArchiveAnalyticsReferrers {
    viewer {
      zones(filter: { zoneTag: ${graphQlString(zoneId)} }) {
        referrers: httpRequestsAdaptiveGroups(
          limit: 100
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          sum { visits }
          dimensions { clientRefererHost }
        }
        referrerPaths: httpRequestsAdaptiveGroups(
          limit: 500
          orderBy: [count_DESC]
          filter: ${filter}
        ) {
          count
          sum { visits }
          dimensions { clientRefererHost clientRequestPath }
        }
      }
    }
  }`;
}

function nonNegativeInteger(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function assertNoGraphQlErrors(body) {
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new Error(`Cloudflare GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`);
  }
}

function isReferrerPlanError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return message.includes('clientrefererhost')
    || message.includes('not entitled')
    || message.includes('unauthorized')
    || message.includes('forbidden')
    || message.includes('permission')
    || message.includes('plan');
}

export function aggregateStatusBuckets(rows) {
  const buckets = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  for (const row of rows ?? []) {
    const bucket = statusBucket(row?.dimensions?.edgeResponseStatus);
    if (!bucket) continue;
    buckets[bucket] += nonNegativeInteger(row?.count);
  }
  return Object.entries(buckets).map(([bucket, requests]) => ({ bucket, requests }));
}

export function aggregateKnownCrawlers(userAgentRows) {
  const totals = new Map();
  for (const row of userAgentRows ?? []) {
    const crawler = classifyCrawler(row?.dimensions?.userAgent);
    if (!crawler) continue;
    const current = totals.get(crawler.key) ?? {
      crawler: crawler.key,
      category: crawler.category,
      operator: crawler.operator,
      requests: 0,
      bytes: 0,
    };
    current.requests += nonNegativeInteger(row?.count);
    current.bytes += nonNegativeInteger(row?.sum?.edgeResponseBytes);
    totals.set(crawler.key, current);
  }
  return [...totals.values()].sort((a, b) => b.requests - a.requests);
}

export function aggregateCrawlerPaths(rows) {
  const totals = new Map();
  for (const row of rows ?? []) {
    const crawler = classifyCrawler(row?.dimensions?.userAgent);
    const path = row?.dimensions?.clientRequestPath;
    if (!crawler || typeof path !== 'string' || !path.startsWith('/')) continue;
    const key = `${crawler.key}\0${path}`;
    const current = totals.get(key) ?? { crawler: crawler.key, path, requests: 0 };
    current.requests += nonNegativeInteger(row?.count);
    totals.set(key, current);
  }
  return [...totals.values()]
    .filter((row) => row.path.length <= 500)
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 200);
}

export function aggregateReferrers(rows) {
  const totals = new Map();
  for (const row of rows ?? []) {
    const host = row?.dimensions?.clientRefererHost;
    if (typeof host !== 'string' || !host || host === 'None') continue;
    const ai = classifyAiReferrer(host);
    const source = ai?.key ?? 'other';
    const normalized = host.trim().toLowerCase().replace(/^www\./, '').slice(0, 200);
    const current = totals.get(normalized) ?? {
      referrerHost: normalized,
      source,
      requests: 0,
      visits: 0,
    };
    current.requests += nonNegativeInteger(row?.count);
    current.visits += nonNegativeInteger(row?.sum?.visits);
    totals.set(normalized, current);
  }
  return [...totals.values()].sort((a, b) => b.visits - a.visits || b.requests - a.requests);
}

export function aggregateAiReferrerPaths(rows) {
  const totals = new Map();
  for (const row of rows ?? []) {
    const host = row?.dimensions?.clientRefererHost;
    const path = row?.dimensions?.clientRequestPath;
    const ai = classifyAiReferrer(host);
    if (!ai || typeof path !== 'string' || !path.startsWith('/') || path.length > 500) continue;
    const key = `${ai.key}\0${path}`;
    const current = totals.get(key) ?? { source: ai.key, path, requests: 0, visits: 0 };
    current.requests += nonNegativeInteger(row?.count);
    current.visits += nonNegativeInteger(row?.sum?.visits);
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.visits - a.visits || b.requests - a.requests).slice(0, 100);
}

export function normalizeDayResponse(day, hostname, body) {
  assertNoGraphQlErrors(body);
  const zone = body?.data?.viewer?.zones?.[0];
  if (!zone) throw new Error('Cloudflare GraphQL returned no matching zone');
  const total = zone.totals?.[0] ?? {};
  const paths = (zone.paths ?? [])
    .map((row) => ({
      day,
      hostname,
      path: row?.dimensions?.clientRequestPath,
      requests: nonNegativeInteger(row?.count),
      visits: nonNegativeInteger(row?.sum?.visits),
    }))
    .filter((row) => typeof row.path === 'string' && row.path.startsWith('/') && row.path.length <= 500);

  const statuses = aggregateStatusBuckets(zone.statuses).map((row) => ({ day, hostname, ...row }));
  const countries = (zone.countries ?? [])
    .map((row) => ({
      day,
      hostname,
      country: typeof row?.dimensions?.clientCountryName === 'string'
        ? row.dimensions.clientCountryName.slice(0, 80)
        : '',
      requests: nonNegativeInteger(row?.count),
      visits: nonNegativeInteger(row?.sum?.visits),
    }))
    .filter((row) => row.country);
  const crawlers = aggregateKnownCrawlers(zone.userAgents).map((row) => ({ day, hostname, ...row }));
  const crawlerPaths = aggregateCrawlerPaths(zone.crawlerPaths).map((row) => ({ day, hostname, ...row }));
  const crawlerStatuses = aggregateStatusBuckets(zone.crawlerStatuses).map((row) => ({ day, hostname, ...row }));
  const errorDetails = (zone.errorPaths ?? [])
    .map((row) => {
      const path = row?.dimensions?.clientRequestPath;
      const status = Number(row?.dimensions?.edgeResponseStatus);
      if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) return null;
      if (!Number.isInteger(status) || status < 400 || status >= 500) return null;
      return {
        day,
        hostname,
        path,
        status,
        class: classifyErrorPath(path),
        requests: nonNegativeInteger(row?.count),
      };
    })
    .filter(Boolean)
    .slice(0, 200);
  const errorPaths = aggregateErrorPaths(errorDetails);
  const serverErrorPaths = (zone.serverErrorPaths ?? [])
    .map((row) => {
      const path = row?.dimensions?.clientRequestPath;
      const status = Number(row?.dimensions?.edgeResponseStatus);
      if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) return null;
      if (!Number.isInteger(status) || status < 500 || status >= 600) return null;
      return {
        day,
        hostname,
        path,
        status,
        requests: nonNegativeInteger(row?.count),
      };
    })
    .filter(Boolean)
    .slice(0, 100);

  return {
    total: {
      day,
      hostname,
      requests: nonNegativeInteger(total.count),
      visits: nonNegativeInteger(total?.sum?.visits),
      bytes: nonNegativeInteger(total?.sum?.edgeResponseBytes),
    },
    paths,
    statuses,
    countries,
    crawlers,
    crawlerPaths,
    crawlerStatuses,
    errorPaths,
    errorDetails,
    serverErrorPaths,
    referrers: [],
    referrerPaths: [],
  };
}

export function aggregateErrorPaths(errorDetails) {
  const totals = new Map();
  for (const row of errorDetails ?? []) {
    const current = totals.get(row.path) ?? {
      day: row.day,
      hostname: row.hostname,
      path: row.path,
      requests: 0,
    };
    current.requests += nonNegativeInteger(row.requests);
    totals.set(row.path, current);
  }
  return [...totals.values()].sort((a, b) => b.requests - a.requests).slice(0, 50);
}

export function attachReferrerDay(entry, body) {
  assertNoGraphQlErrors(body);
  const zone = body?.data?.viewer?.zones?.[0];
  if (!zone) throw new Error('Cloudflare GraphQL returned no matching zone for referrers');
  return {
    ...entry,
    referrers: aggregateReferrers(zone.referrers).map((row) => ({
      day: entry.total.day,
      hostname: entry.total.hostname,
      ...row,
    })),
    referrerPaths: aggregateAiReferrerPaths(zone.referrerPaths).map((row) => ({
      day: entry.total.day,
      hostname: entry.total.hostname,
      ...row,
    })),
  };
}

export function emptyReferrerCapability(checkedAt, detail) {
  return {
    key: 'clientRefererHost',
    available: 0,
    detail,
    checkedAt,
  };
}

export function availableReferrerCapability(checkedAt) {
  return {
    key: 'clientRefererHost',
    available: 1,
    detail: 'Referrer host dimensions are available for this analytics token.',
    checkedAt,
  };
}

export function interpretReferrerFailure(error, checkedAt) {
  const detail = isReferrerPlanError(error)
    ? 'Referrer host dimensions are unavailable for this Cloudflare plan or token scope.'
    : `Referrer sync failed: ${String(error?.message ?? error)}`;
  return emptyReferrerCapability(checkedAt, detail);
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function renderAnalyticsSql({ days, hostname, refreshedAt, capability }) {
  if (!Array.isArray(days) || days.length === 0) throw new Error('No analytics days to write');
  const rangeStart = days[0].total.day;
  const lastDay = days.at(-1).total.day;
  const rangeEnd = new Date(Date.parse(`${lastDay}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
  const statements = [];

  for (const entry of days) {
    const {
      total,
      paths,
      statuses = [],
      countries = [],
      crawlers = [],
      crawlerPaths = [],
      crawlerStatuses = [],
      errorPaths = [],
      errorDetails = [],
      serverErrorPaths = [],
      referrers = [],
      referrerPaths = [],
    } = entry;

    statements.push(
      `DELETE FROM analytics_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_status_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_country_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_crawler_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_crawler_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_crawler_status_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_referrer_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_referrer_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_error_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_error_detail_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `DELETE FROM analytics_server_error_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `INSERT INTO analytics_daily (day, hostname, requests, visits, bytes) VALUES (${sqlText(total.day)}, ${sqlText(hostname)}, ${total.requests}, ${total.visits}, ${total.bytes}) ON CONFLICT(day, hostname) DO UPDATE SET requests = excluded.requests, visits = excluded.visits, bytes = excluded.bytes;`,
    );

    for (const path of paths) {
      statements.push(
        `INSERT INTO analytics_path_daily (day, hostname, path, requests, visits) VALUES (${sqlText(path.day)}, ${sqlText(hostname)}, ${sqlText(path.path)}, ${path.requests}, ${path.visits}) ON CONFLICT(day, hostname, path) DO UPDATE SET requests = excluded.requests, visits = excluded.visits;`,
      );
    }
    for (const row of statuses) {
      statements.push(
        `INSERT INTO analytics_status_daily (day, hostname, bucket, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.bucket)}, ${row.requests}) ON CONFLICT(day, hostname, bucket) DO UPDATE SET requests = excluded.requests;`,
      );
    }
    for (const row of countries) {
      statements.push(
        `INSERT INTO analytics_country_daily (day, hostname, country, requests, visits) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.country)}, ${row.requests}, ${row.visits}) ON CONFLICT(day, hostname, country) DO UPDATE SET requests = excluded.requests, visits = excluded.visits;`,
      );
    }
    for (const row of crawlers) {
      statements.push(
        `INSERT INTO analytics_crawler_daily (day, hostname, crawler, category, operator, requests, bytes) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.crawler)}, ${sqlText(row.category)}, ${sqlText(row.operator)}, ${row.requests}, ${row.bytes}) ON CONFLICT(day, hostname, crawler) DO UPDATE SET category = excluded.category, operator = excluded.operator, requests = excluded.requests, bytes = excluded.bytes;`,
      );
    }
    for (const row of crawlerPaths) {
      statements.push(
        `INSERT INTO analytics_crawler_path_daily (day, hostname, crawler, path, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.crawler)}, ${sqlText(row.path)}, ${row.requests}) ON CONFLICT(day, hostname, crawler, path) DO UPDATE SET requests = excluded.requests;`,
      );
    }
    for (const row of crawlerStatuses) {
      statements.push(
        `INSERT INTO analytics_crawler_status_daily (day, hostname, bucket, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.bucket)}, ${row.requests}) ON CONFLICT(day, hostname, bucket) DO UPDATE SET requests = excluded.requests;`,
      );
    }
    for (const row of errorPaths) {
      statements.push(
        `INSERT INTO analytics_error_path_daily (day, hostname, path, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.path)}, ${row.requests}) ON CONFLICT(day, hostname, path) DO UPDATE SET requests = excluded.requests;`,
      );
    }
    for (const row of errorDetails) {
      statements.push(
        `INSERT INTO analytics_error_detail_daily (day, hostname, path, status, class, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.path)}, ${row.status}, ${sqlText(row.class)}, ${row.requests}) ON CONFLICT(day, hostname, path, status) DO UPDATE SET class = excluded.class, requests = excluded.requests;`,
      );
    }
    for (const row of serverErrorPaths) {
      statements.push(
        `INSERT INTO analytics_server_error_path_daily (day, hostname, path, status, requests) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.path)}, ${row.status}, ${row.requests}) ON CONFLICT(day, hostname, path, status) DO UPDATE SET requests = excluded.requests;`,
      );
    }
    for (const row of referrers) {
      statements.push(
        `INSERT INTO analytics_referrer_daily (day, hostname, referrer_host, source, requests, visits) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.referrerHost)}, ${sqlText(row.source)}, ${row.requests}, ${row.visits}) ON CONFLICT(day, hostname, referrer_host) DO UPDATE SET source = excluded.source, requests = excluded.requests, visits = excluded.visits;`,
      );
    }
    for (const row of referrerPaths) {
      statements.push(
        `INSERT INTO analytics_referrer_path_daily (day, hostname, source, path, requests, visits) VALUES (${sqlText(row.day)}, ${sqlText(hostname)}, ${sqlText(row.source)}, ${sqlText(row.path)}, ${row.requests}, ${row.visits}) ON CONFLICT(day, hostname, source, path) DO UPDATE SET requests = excluded.requests, visits = excluded.visits;`,
      );
    }
  }

  if (capability) {
    statements.push(
      `INSERT INTO analytics_capability (key, available, detail, checked_at) VALUES (${sqlText(capability.key)}, ${capability.available ? 1 : 0}, ${sqlText(capability.detail)}, ${sqlText(capability.checkedAt)}) ON CONFLICT(key) DO UPDATE SET available = excluded.available, detail = excluded.detail, checked_at = excluded.checked_at;`,
    );
  }

  statements.push(
    `INSERT INTO analytics_sync_state (source, refreshed_at, range_start, range_end, schema_version) VALUES (${sqlText(ANALYTICS_SOURCE)}, ${sqlText(refreshedAt)}, ${sqlText(rangeStart)}, ${sqlText(rangeEnd)}, ${ANALYTICS_SCHEMA_VERSION}) ON CONFLICT(source) DO UPDATE SET refreshed_at = excluded.refreshed_at, range_start = MIN(analytics_sync_state.range_start, excluded.range_start), range_end = MAX(analytics_sync_state.range_end, excluded.range_end), schema_version = excluded.schema_version;`,
  );
  return `${statements.join('\n')}\n`;
}

const DAY_MS = 86_400_000;
export const ANALYTICS_SOURCE = 'cloudflare-zone-analytics';
export const ANALYTICS_SCHEMA_VERSION = 1;

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
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error('days must be an integer between 1 and 90');
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

export function dayQuery({ zoneId, hostname, start, end }) {
  for (const [name, value] of Object.entries({ zoneId, hostname, start, end })) {
    if (!value || typeof value !== 'string') throw new Error(`Missing ${name}`);
  }
  return `query ArchiveAnalytics {
    viewer {
      zones(filter: { zoneTag: ${graphQlString(zoneId)} }) {
        totals: httpRequestsAdaptiveGroups(
          limit: 1
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
          }
        ) {
          count
          sum { visits edgeResponseBytes }
        }
        paths: httpRequestsAdaptiveGroups(
          limit: 1000
          orderBy: [count_DESC]
          filter: {
            datetime_geq: ${graphQlString(start)}
            datetime_lt: ${graphQlString(end)}
            clientRequestHTTPHost: ${graphQlString(hostname)}
            requestSource: "eyeball"
          }
        ) {
          count
          sum { visits }
          dimensions { clientRequestPath }
        }
      }
    }
  }`;
}

function nonNegativeInteger(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

export function normalizeDayResponse(day, hostname, body) {
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new Error(`Cloudflare GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`);
  }
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

  return {
    total: {
      day,
      hostname,
      requests: nonNegativeInteger(total.count),
      visits: nonNegativeInteger(total?.sum?.visits),
      bytes: nonNegativeInteger(total?.sum?.edgeResponseBytes),
    },
    paths,
  };
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function renderAnalyticsSql({ days, hostname, refreshedAt }) {
  if (!Array.isArray(days) || days.length === 0) throw new Error('No analytics days to write');
  const rangeStart = days[0].total.day;
  const lastDay = days.at(-1).total.day;
  const rangeEnd = new Date(Date.parse(`${lastDay}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
  // Wrangler executes uploaded SQL through D1's managed transaction path.
  // Explicit BEGIN/COMMIT statements are rejected for remote file execution.
  const statements = [];

  for (const entry of days) {
    const { total, paths } = entry;
    statements.push(
      `DELETE FROM analytics_path_daily WHERE day = ${sqlText(total.day)} AND hostname = ${sqlText(hostname)};`,
      `INSERT INTO analytics_daily (day, hostname, requests, visits, bytes) VALUES (${sqlText(total.day)}, ${sqlText(hostname)}, ${total.requests}, ${total.visits}, ${total.bytes}) ON CONFLICT(day, hostname) DO UPDATE SET requests = excluded.requests, visits = excluded.visits, bytes = excluded.bytes;`,
    );
    for (const path of paths) {
      statements.push(
        `INSERT INTO analytics_path_daily (day, hostname, path, requests, visits) VALUES (${sqlText(path.day)}, ${sqlText(hostname)}, ${sqlText(path.path)}, ${path.requests}, ${path.visits}) ON CONFLICT(day, hostname, path) DO UPDATE SET requests = excluded.requests, visits = excluded.visits;`,
      );
    }
  }

  statements.push(
    `INSERT INTO analytics_sync_state (source, refreshed_at, range_start, range_end, schema_version) VALUES (${sqlText(ANALYTICS_SOURCE)}, ${sqlText(refreshedAt)}, ${sqlText(rangeStart)}, ${sqlText(rangeEnd)}, ${ANALYTICS_SCHEMA_VERSION}) ON CONFLICT(source) DO UPDATE SET refreshed_at = excluded.refreshed_at, range_start = MIN(analytics_sync_state.range_start, excluded.range_start), range_end = MAX(analytics_sync_state.range_end, excluded.range_end), schema_version = excluded.schema_version;`,
  );
  return `${statements.join('\n')}\n`;
}

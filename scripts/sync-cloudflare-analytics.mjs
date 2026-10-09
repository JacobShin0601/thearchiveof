import { writeFile } from 'node:fs/promises';
import {
  attachReferrerDay,
  availableReferrerCapability,
  completeUtcDays,
  dayQuery,
  interpretReferrerFailure,
  normalizeDayResponse,
  referrerQuery,
  renderAnalyticsSql,
  scopedZoneId,
} from './lib/cloudflare-analytics.mjs';

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
let zoneId = process.env.CLOUDFLARE_ZONE_ID;
const hostname = process.env.ANALYTICS_HOSTNAME ?? 'thearchiveof.com';
const days = Number(argument('days', '2'));
const output = argument('output', '.analytics-sync.sql');

if (!token) throw new Error('CLOUDFLARE_ANALYTICS_TOKEN is required');
if (!/^[a-z0-9.-]+$/i.test(hostname)) throw new Error('ANALYTICS_HOSTNAME is invalid');

async function graphQlRequest(query) {
  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await response.json();
  if (!response.ok) {
    const detail = body?.errors?.[0]?.message ?? response.statusText;
    throw new Error(`Cloudflare Analytics request failed (${response.status}): ${detail}`);
  }
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new Error(`Cloudflare GraphQL error: ${body.errors.map((error) => error.message).join('; ')}`);
  }
  return body;
}

if (!zoneId) {
  zoneId = scopedZoneId(await graphQlRequest('{ viewer { zones { zoneTag } } }'));
} else if (!/^[a-f0-9]{32}$/i.test(zoneId)) {
  throw new Error('CLOUDFLARE_ZONE_ID must be the 32-character Zone ID when provided');
}

const windows = completeUtcDays(days);
const normalized = [];
let capability = availableReferrerCapability(new Date().toISOString());
let referrersEnabled = true;

for (const window of windows) {
  const body = await graphQlRequest(dayQuery({ zoneId, hostname, start: window.start, end: window.end }));
  let entry = normalizeDayResponse(window.day, hostname, body);

  if (referrersEnabled) {
    try {
      const referrerBody = await graphQlRequest(referrerQuery({
        zoneId,
        hostname,
        start: window.start,
        end: window.end,
      }));
      entry = attachReferrerDay(entry, referrerBody);
      capability = availableReferrerCapability(new Date().toISOString());
    } catch (error) {
      capability = interpretReferrerFailure(error, new Date().toISOString());
      referrersEnabled = false;
      console.warn(`Referrer dimensions unavailable; continuing without them. ${capability.detail}`);
    }
  }

  normalized.push(entry);
}

const sql = renderAnalyticsSql({
  days: normalized,
  hostname,
  refreshedAt: new Date().toISOString(),
  capability,
});
await writeFile(output, sql, { mode: 0o600 });
console.log(`Prepared ${normalized.length} complete UTC day(s) for ${hostname}.`);
console.log(`Referrer capability: ${capability.available ? 'available' : 'unavailable'}.`);

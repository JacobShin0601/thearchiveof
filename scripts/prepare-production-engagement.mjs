import { readFile, writeFile } from 'node:fs/promises';
import { renderEngagementSql } from './lib/engagement-sync.mjs';

// Only read grouped counts from Production D1. CI already has D1 API permission.
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) throw new Error('Cloudflare D1 CI credentials missing');
const config = await readFile('wrangler.toml','utf8');
const prod = config.match(/\[\[env\.production\.d1_databases\]\]([\s\S]*?)(?=\n\[|$)/)?.[1];
const id = prod?.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
if (!id || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('No valid Production D1 ID');
const end = new Date(); end.setUTCHours(0,0,0,0);
const start = new Date(end.getTime() - 90 * 86400000);
const startDay = start.toISOString().slice(0,10);
const endDay = end.toISOString().slice(0,10);
const url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${id}/query`;
async function query(sql, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({ sql, params }),
  });
  const json = await res.json();
  if (!res.ok || json.success !== true || json.result?.[0]?.success !== true)
    throw new Error(`Production D1 aggregated read failed: HTTP ${res.status}`);
  return json.result[0].results ?? [];
}
const daily = await query(
  `SELECT date(created_at) AS day, article_slug AS article, COALESCE(language,'') AS language,
          event_name AS event, COUNT(*) AS total
   FROM interaction_events
   WHERE actor_type='human' AND created_at >= ? AND created_at < ?
     AND event_name IN ('reaction_added','reaction_removed','code_run','lab_start','language_switch')
     AND article_slug IS NOT NULL
   GROUP BY date(created_at), article_slug, COALESCE(language,''), event_name`,
  [`${startDay} 00:00:00`, `${endDay} 00:00:00`],
);
const useful = await query(
  `SELECT article_slug AS article, COUNT(*) AS active_useful FROM article_reactions
   WHERE actor_type='human' AND reaction_type='useful' GROUP BY article_slug`,
);
await writeFile('.analytics-engagement.sql', renderEngagementSql({
  daily, useful, start: startDay, end: endDay, now: new Date().toISOString(),
}), {mode:0o600});
console.log(`Aggregated Production engagement: ${daily.length} event groups, ${useful.length} Useful groups.`);

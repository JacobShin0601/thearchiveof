// Pure renderer for production -> Preview aggregated engagement data.
const events = new Set(['reaction_added','reaction_removed','code_run','lab_start','language_switch']);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const day = /^\d{4}-\d{2}-\d{2}$/;
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const count = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid aggregate count');
  return n;
};
export function renderEngagementSql({daily, useful, start, end, now}) {
  if (!day.test(start) || !day.test(end) || start >= end || !Number.isFinite(Date.parse(now)))
    throw new Error('Invalid aggregate window');
  if (!Array.isArray(daily) || !Array.isArray(useful) || daily.length > 20000 || useful.length > 5000)
    throw new Error('Refusing unexpectedly large D1 aggregate sync');
  const result = [
    `DELETE FROM analytics_engagement_daily WHERE day >= ${quote(start)} AND day < ${quote(end)};`,
    'DELETE FROM analytics_useful_snapshot;',
  ];
  for (const row of daily) {
    if (!day.test(row.day) || row.day < start || row.day >= end
        || !slug.test(row.article ?? '') || row.article.length > 80
        || !events.has(row.event) || !['ko','en',''].includes(row.language ?? '')) {
      throw new Error('Invalid grouped event');
    }
    result.push(`INSERT INTO analytics_engagement_daily (day,article_slug,language,event_name,total) VALUES (${quote(row.day)},${quote(row.article)},${quote(row.language ?? '')},${quote(row.event)},${count(row.total)});`);
  }
  for (const row of useful) {
    if (!slug.test(row.article ?? '') || row.article.length > 80) throw new Error('Invalid Useful slug');
    result.push(`INSERT INTO analytics_useful_snapshot (article_slug,active_useful) VALUES (${quote(row.article)},${count(row.active_useful)});`);
  }
  result.push(`INSERT OR REPLACE INTO analytics_engagement_sync_state (source,refreshed_at,range_start,range_end) VALUES ('production-d1-aggregate',${quote(now)},${quote(start)},${quote(end)});`);
  return result.join('\n') + '\n';
}

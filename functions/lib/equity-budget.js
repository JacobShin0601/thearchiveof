/** Workers Free allows 100,000 Function requests per day, resetting at midnight UTC. */
export const EQUITY_DAILY_REFRESH_CAP = 100_000;

/**
 * Count one refresh attempt for the UTC day.
 * Returns false once the free daily cap is already used, without another write.
 * @param {D1Database} db
 * @param {Date} [now]
 */
export async function takeEquityRefresh(db, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const existing = await db.prepare(
    'SELECT hits FROM equity_refresh_day WHERE day = ?',
  ).bind(day).first();
  if (Number(existing?.hits) >= EQUITY_DAILY_REFRESH_CAP) return false;

  const row = await db.prepare(
    `INSERT INTO equity_refresh_day (day, hits) VALUES (?, 1)
     ON CONFLICT(day) DO UPDATE SET hits = hits + 1
     WHERE hits < ?
     RETURNING hits`,
  ).bind(day, EQUITY_DAILY_REFRESH_CAP).first();
  return Number(row?.hits) > 0 && Number(row.hits) <= EQUITY_DAILY_REFRESH_CAP;
}

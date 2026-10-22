-- Read-only aggregate mirror from Production. No raw users, IPs, or actor IDs.
CREATE TABLE analytics_engagement_daily (
  day TEXT NOT NULL,
  article_slug TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT '',
  event_name TEXT NOT NULL,
  total INTEGER NOT NULL CHECK (total >= 0),
  PRIMARY KEY (day, article_slug, language, event_name)
);
CREATE INDEX analytics_engagement_daily_day_idx ON analytics_engagement_daily(day);
CREATE TABLE analytics_useful_snapshot (
  article_slug TEXT PRIMARY KEY,
  active_useful INTEGER NOT NULL CHECK (active_useful >= 0)
);
CREATE TABLE analytics_engagement_sync_state (
  source TEXT PRIMARY KEY,
  refreshed_at TEXT NOT NULL,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL
);

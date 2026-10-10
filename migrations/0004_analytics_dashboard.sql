CREATE TABLE analytics_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    visits INTEGER NOT NULL CHECK (visits >= 0),
    bytes INTEGER NOT NULL CHECK (bytes >= 0),
    PRIMARY KEY (day, hostname)
);

CREATE TABLE analytics_path_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    path TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    visits INTEGER NOT NULL CHECK (visits >= 0),
    PRIMARY KEY (day, hostname, path)
);

CREATE INDEX analytics_path_daily_day_idx
    ON analytics_path_daily (day, hostname);

CREATE TABLE analytics_sync_state (
    source TEXT PRIMARY KEY,
    refreshed_at TEXT NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    schema_version INTEGER NOT NULL
);

CREATE TABLE analytics_error_detail_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL CHECK (status >= 400 AND status < 500),
    class TEXT NOT NULL CHECK (class IN ('scanner', 'content', 'asset', 'api', 'other')),
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, path, status)
);

CREATE INDEX analytics_error_detail_daily_day_idx
    ON analytics_error_detail_daily (day, hostname);

CREATE TABLE analytics_server_error_path_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL CHECK (status >= 500 AND status < 600),
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, path, status)
);

CREATE INDEX analytics_server_error_path_daily_day_idx
    ON analytics_server_error_path_daily (day, hostname);

CREATE TABLE analytics_status_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    bucket TEXT NOT NULL CHECK (bucket IN ('2xx', '3xx', '4xx', '5xx')),
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, bucket)
);

CREATE TABLE analytics_country_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    country TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    visits INTEGER NOT NULL CHECK (visits >= 0),
    PRIMARY KEY (day, hostname, country)
);

CREATE INDEX analytics_country_daily_day_idx
    ON analytics_country_daily (day, hostname);

CREATE TABLE analytics_crawler_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    crawler TEXT NOT NULL,
    category TEXT NOT NULL,
    operator TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    bytes INTEGER NOT NULL CHECK (bytes >= 0),
    PRIMARY KEY (day, hostname, crawler)
);

CREATE TABLE analytics_crawler_path_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    crawler TEXT NOT NULL,
    path TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, crawler, path)
);

CREATE INDEX analytics_crawler_path_daily_day_idx
    ON analytics_crawler_path_daily (day, hostname);

CREATE TABLE analytics_crawler_status_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    bucket TEXT NOT NULL CHECK (bucket IN ('2xx', '3xx', '4xx', '5xx')),
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, bucket)
);

CREATE TABLE analytics_referrer_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    referrer_host TEXT NOT NULL,
    source TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    visits INTEGER NOT NULL CHECK (visits >= 0),
    PRIMARY KEY (day, hostname, referrer_host)
);

CREATE TABLE analytics_referrer_path_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    source TEXT NOT NULL,
    path TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    visits INTEGER NOT NULL CHECK (visits >= 0),
    PRIMARY KEY (day, hostname, source, path)
);

CREATE INDEX analytics_referrer_path_daily_day_idx
    ON analytics_referrer_path_daily (day, hostname);

CREATE TABLE analytics_error_path_daily (
    day TEXT NOT NULL,
    hostname TEXT NOT NULL,
    path TEXT NOT NULL,
    requests INTEGER NOT NULL CHECK (requests >= 0),
    PRIMARY KEY (day, hostname, path)
);

CREATE TABLE analytics_capability (
    key TEXT PRIMARY KEY,
    available INTEGER NOT NULL CHECK (available IN (0, 1)),
    detail TEXT NOT NULL,
    checked_at TEXT NOT NULL
);

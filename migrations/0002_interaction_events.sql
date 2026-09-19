CREATE TABLE interaction_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    article_slug TEXT,
    language TEXT,
    actor_type TEXT NOT NULL DEFAULT 'human',
    component TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interaction_events_name
ON interaction_events(event_name, created_at);

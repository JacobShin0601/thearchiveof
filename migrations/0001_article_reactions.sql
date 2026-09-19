CREATE TABLE article_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_slug TEXT NOT NULL,
    reaction_type TEXT NOT NULL DEFAULT 'useful',
    actor_type TEXT NOT NULL DEFAULT 'human',
    actor_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_article_reactions_slug
ON article_reactions(article_slug);

CREATE INDEX idx_article_reactions_actor
ON article_reactions(article_slug, actor_hash);

CREATE UNIQUE INDEX idx_article_reactions_unique
ON article_reactions(article_slug, reaction_type, actor_hash);

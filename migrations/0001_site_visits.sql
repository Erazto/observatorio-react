CREATE TABLE IF NOT EXISTS site_counters (
  name TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
INSERT OR IGNORE INTO site_counters (name, total) VALUES ('visits', 0);

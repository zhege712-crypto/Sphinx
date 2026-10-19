-- Private contact directory. Never include these tables in public catalogs or document revisions.
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
  github TEXT NOT NULL DEFAULT '', links TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS authors_name ON authors(name COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS document_authors (
  document_id TEXT PRIMARY KEY REFERENCES documents(id),
  author_ids TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
);

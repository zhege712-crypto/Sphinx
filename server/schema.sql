PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS members (
  github_id TEXT PRIMARY KEY, login TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, github_id TEXT NOT NULL, login TEXT NOT NULL,
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(github_id);
CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, parent_id TEXT,
  kind TEXT NOT NULL DEFAULT 'document', position INTEGER NOT NULL DEFAULT 0,
  draft TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1,
  published TEXT, published_version INTEGER, published_at TEXT,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS document_tree ON documents(archived,parent_id,position);
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY, document_id TEXT NOT NULL, title TEXT NOT NULL,
  draft TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS revision_document ON revisions(document_id,version DESC);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, mime TEXT NOT NULL, extension TEXT NOT NULL,
  size INTEGER NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL, public_at TEXT
);
CREATE TABLE IF NOT EXISTS file_objects (
  id TEXT PRIMARY KEY, size INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS file_chunks (
  object_id TEXT NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
  part INTEGER NOT NULL, data BLOB NOT NULL,
  PRIMARY KEY(object_id,part)
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, action TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', actor TEXT NOT NULL,
  created_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT
);
CREATE TABLE IF NOT EXISTS publication_jobs (
  id TEXT PRIMARY KEY, delta TEXT NOT NULL, asset_ids TEXT NOT NULL,
  review_id TEXT, status TEXT NOT NULL, commit_sha TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
  target TEXT NOT NULL, created_at TEXT NOT NULL
);

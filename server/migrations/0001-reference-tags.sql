-- Apply once to databases created before Reference tags. Fresh schema.sql includes these columns.
ALTER TABLE documents ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE revisions ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';

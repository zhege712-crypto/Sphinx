ALTER TABLE documents ADD COLUMN valhalla TEXT NOT NULL DEFAULT '{"enabled":false,"blocks":[]}';
ALTER TABLE revisions ADD COLUMN valhalla TEXT NOT NULL DEFAULT '{"enabled":false,"blocks":[]}';

ALTER TABLE documents ADD COLUMN reader_hidden INTEGER NOT NULL DEFAULT 0 CHECK(reader_hidden IN (0,1));

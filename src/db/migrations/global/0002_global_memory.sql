-- Migration 0002: global neural memory schema (memory tables only).
-- NEVER edit this file once released — add a new migration instead.
-- Applied only to the global database at ~/.neural-ai/neural-memory.db

-- ============================================================
-- Neural Memory (Global): historical knowledge shared across projects
-- ============================================================

CREATE TABLE memories (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,             -- discovery | decision | solution | bug | constraint |
                                           -- architecture | change | lesson | unresolved
  content     TEXT NOT NULL,
  importance  INTEGER NOT NULL DEFAULT 3, -- 1..5
  status      TEXT NOT NULL DEFAULT 'active', -- active | superseded | resolved
  source      TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE memory_relationships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relation    TEXT NOT NULL,             -- affects | caused-by | resolves | references ...
  target_type TEXT NOT NULL,             -- memory | map_entity
  target_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_memory_relationships_memory ON memory_relationships(memory_id);
CREATE INDEX idx_memories_type   ON memories(type);
CREATE INDEX idx_memories_status ON memories(status);

-- Full-text index over memory content (FTS5), kept in sync via triggers.
CREATE VIRTUAL TABLE memories_fts USING fts5(
  content,
  content='memories',
  content_rowid='rowid'
);

CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;

CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
  INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- user_version for global DB starts at 2 (migration 0002)
PRAGMA user_version = 2;
// Deterministic, ordered, versioned migration runner.
// Schema version is tracked via SQLite's PRAGMA user_version.
// Migrations are embedded as strings to work in compiled binaries.

import type { Database } from "bun:sqlite";

interface Migration {
  version: number;
  name: string;
  sql: string;
}

// Embedded migrations — no filesystem access needed at runtime.
// When adding a new migration, add it here AND create the .sql file for source control.
const LOCAL_MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "0001_init.sql",
    sql: `-- Migration 0001: initial schema for .neural-map and .neural-memory.
-- NEVER edit this file once released — add a new migration instead.

-- ============================================================
-- Neural Map: current project state
-- ============================================================

CREATE TABLE map_entities (
  id          TEXT PRIMARY KEY,          -- stable logical id, not a file path
  type        TEXT NOT NULL,             -- module | component | domain-entity | subsystem
  name        TEXT NOT NULL,
  path        TEXT,                      -- current path, metadata only
  status      TEXT NOT NULL DEFAULT 'active',
  attributes  TEXT NOT NULL DEFAULT '{}', -- JSON blob
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE map_relationships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL REFERENCES map_entities(id) ON DELETE CASCADE,
  to_entity   TEXT NOT NULL REFERENCES map_entities(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,             -- depends-on | part-of | implements | related-to
  created_at  TEXT NOT NULL,
  UNIQUE(from_entity, to_entity, type)
);

CREATE TABLE map_constraints (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- Free-form project-level facts, e.g. key='architecture' value='repository-pattern'
CREATE TABLE map_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX idx_map_relationships_from ON map_relationships(from_entity);
CREATE INDEX idx_map_relationships_to   ON map_relationships(to_entity);

-- ============================================================
-- Neural Memory: historical knowledge
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
END;`
  }
];

const GLOBAL_MIGRATIONS: Migration[] = [
  {
    version: 2,
    name: "0002_global_memory.sql",
    sql: `-- Migration 0002: global neural memory schema (memory tables only).
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
PRAGMA user_version = 2;`
  }
];

function getUserVersion(db: Database): number {
  const row = db.query("PRAGMA user_version;").get() as { user_version: number };
  return row.user_version;
}

function setUserVersion(db: Database, version: number): void {
  db.exec(`PRAGMA user_version = ${version};`);
}

function runMigrationsInternal(db: Database, migrations: Migration[]): void {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);

  const seen = new Set<number>();
  for (const m of sorted) {
    if (seen.has(m.version)) {
      throw new Error(`Duplicate migration version ${m.version} (${m.name})`);
    }
    seen.add(m.version);
  }

  const current = getUserVersion(db);
  const pending = sorted.filter((m) => m.version > current);

  for (const migration of pending) {
    const apply = db.transaction(() => {
      db.exec(migration.sql);
      setUserVersion(db, migration.version);
    });
    apply();
  }
}

/**
 * Applies all local migrations (map + memory) with version > current user_version.
 */
export function runMigrations(db: Database): void {
  runMigrationsInternal(db, LOCAL_MIGRATIONS);
}

/**
 * Applies all global migrations (memory only) with version > current user_version.
 */
export function runGlobalMigrations(db: Database): void {
  runMigrationsInternal(db, GLOBAL_MIGRATIONS);
}
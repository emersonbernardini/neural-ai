// Storage/database layer.
// This is the ONLY place allowed to touch SQLite pragmas or open connections.
// Domain code must never open its own Database or set pragmas directly.

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { runMigrations, runGlobalMigrations } from "./migrate";
import { getGlobalDbPath } from "../util/globalDb";

export interface DbConfig {
  /** Path to the sqlite file, e.g. "<project>/.neural-map/neural.db" */
  path: string;
  /** synchronous=NORMAL is the V1 default; centralized here so it can change later. */
  synchronous?: "OFF" | "NORMAL" | "FULL";
}

const DEFAULT_SYNCHRONOUS: NonNullable<DbConfig["synchronous"]> = "NORMAL";

/**
 * Opens (or creates) the neural-ai SQLite database, applies the standard
 * pragma set for the local multi-process concurrency model, and ensures
 * the schema is up to date via the migration runner.
 */
export function openDatabase(config: DbConfig): Database {
  const dir = dirname(config.path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(config.path, { create: true });

  // WAL allows concurrent readers while one writer holds the write lock —
  // required because CLI, agent and future background processes may share
  // the same database file.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`PRAGMA synchronous = ${config.synchronous ?? DEFAULT_SYNCHRONOUS};`);
  db.exec("PRAGMA foreign_keys = ON;");
  // Keep write transactions short and let SQLite retry briefly on transient
  // locks instead of failing immediately when another process is writing.
  db.exec("PRAGMA busy_timeout = 3000;");

  runMigrations(db);

  return db;
}

/**
 * Opens (or creates) the GLOBAL neural memory database at ~/.neural-ai/neural-memory.db.
 * This database only contains memory tables (no map tables) and is shared
 * across all projects for the current user.
 */
export function openGlobalDatabase(): Database {
  const path = getGlobalDbPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(path, { create: true });

  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`PRAGMA synchronous = ${DEFAULT_SYNCHRONOUS};`);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 3000;");

  runGlobalMigrations(db);

  return db;
}

/**
 * Runs `fn` inside a transaction, retrying a small number of times on
 * transient SQLITE_BUSY / SQLITE_LOCKED errors. Write transactions should
 * always be short-lived (see architecture notes on concurrency).
 */
export function withTransaction<T>(db: Database, fn: () => T): T {
  const maxAttempts = 5;
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      const run = db.transaction(fn);
      return run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const transient = /SQLITE_BUSY|SQLITE_LOCKED/i.test(message);
      if (!transient || attempt >= maxAttempts) {
        throw err;
      }
      // Simple linear backoff; no external dependency needed for V1.
      const waitMs = attempt * 20;
      const until = Date.now() + waitMs;
      while (Date.now() < until) {
        /* busy-wait briefly — acceptable for local CLI-scale usage */
      }
    }
  }
}

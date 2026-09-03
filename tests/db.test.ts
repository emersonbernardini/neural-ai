import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { openDatabase } from "../src/db/database";
import { makeTempDb } from "./helpers";

describe("database", () => {
  test("creates db file and required directory", () => {
    const { db, dbPath } = makeTempDb();
    expect(existsSync(dbPath)).toBe(true);
    db.close();
  });

  test("enables WAL journal mode", () => {
    const { db } = makeTempDb();
    const row = db.query("PRAGMA journal_mode;").get() as { journal_mode: string };
    expect(row.journal_mode.toLowerCase()).toBe("wal");
    db.close();
  });

  test("applies synchronous = NORMAL by default", () => {
    const { db } = makeTempDb();
    const row = db.query("PRAGMA synchronous;").get() as { synchronous: number };
    // SQLite reports NORMAL as 1
    expect(row.synchronous).toBe(1);
    db.close();
  });

  test("migration sets user_version and creates core tables", () => {
    const { db } = makeTempDb();
    const version = db.query("PRAGMA user_version;").get() as { user_version: number };
    expect(version.user_version).toBeGreaterThan(0);

    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("map_entities");
    expect(names).toContain("memories");
    expect(names).toContain("memory_relationships");
    db.close();
  });

  test("re-opening an existing database does not re-run migrations destructively", () => {
    const { db, dbPath } = makeTempDb();
    db.query("INSERT INTO map_entities (id, type, name, status, attributes, created_at, updated_at) VALUES ('x','module','x','active','{}','t','t')").run();
    db.close();

    const db2 = openDatabase({ path: dbPath });
    const row = db2.query("SELECT * FROM map_entities WHERE id = 'x'").get();
    expect(row).not.toBeNull();
    db2.close();
  });
});

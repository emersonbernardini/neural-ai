import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/db/database";

export function makeTempDb() {
  const dir = mkdtempSync(join(tmpdir(), "neural-ai-test-"));
  const dbPath = join(dir, ".neural-map", "neural.db");
  const db = openDatabase({ path: dbPath });
  return { db, dir, dbPath };
}

/**
 * A second, independent local-schema database used to stand in for the
 * GLOBAL database in tests. The global db only ever uses the memory
 * tables (never the map tables), and the local schema is a superset of
 * that, so this is a faithful enough double without needing to touch
 * the real `~/.neural-ai/neural-memory.db` from test runs.
 */
export function makeTempPairOfDbs() {
  const local = makeTempDb();
  const global = makeTempDb();
  return { localDb: local.db, globalDb: global.db };
}

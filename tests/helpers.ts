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

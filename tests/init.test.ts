import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/db/database";
import { runInit } from "../src/cli/commands/init";
import { ensureGitignore } from "../src/util/gitignore";

function tempProjectDir() {
  return mkdtempSync(join(tmpdir(), "neural-ai-init-"));
}

describe("neural init", () => {
  test("creates the neural-map structure and database", () => {
    const root = tempProjectDir();
    const dbPath = join(root, ".neural-map", "neural.db");
    const db = openDatabase({ path: dbPath });
    const result = runInit(db, root, dbPath);
    expect(result.dbPath).toBe(dbPath);
    db.close();
  });

  test("adds gitignore rules when .gitignore does not exist", () => {
    const root = tempProjectDir();
    const { updated, path } = ensureGitignore(root);
    expect(updated).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain(".neural-map/*.db");
  });

  test("preserves existing .gitignore content", () => {
    const root = tempProjectDir();
    writeFileSync(join(root, ".gitignore"), "node_modules/\ndist/\n");
    ensureGitignore(root);
    const content = readFileSync(join(root, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain("dist/");
    expect(content).toContain(".neural-map/*.db");
  });

  test("does not duplicate entries on repeated init", () => {
    const root = tempProjectDir();
    ensureGitignore(root);
    const first = readFileSync(join(root, ".gitignore"), "utf-8");
    const { updated } = ensureGitignore(root);
    const second = readFileSync(join(root, ".gitignore"), "utf-8");
    expect(updated).toBe(false);
    expect(second).toBe(first);
    expect(second.match(/^\.neural-map\/\*\.db$/gm)?.length).toBe(1);
  });
});

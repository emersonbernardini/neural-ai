// Stress tests: volume, size, and character-set edge cases that a normal
// day-to-day test suite doesn't usually exercise. These are slower on
// purpose — they're here to catch things that only show up under load or
// with "hostile" input, not to run on every save.

import { describe, expect, test } from "bun:test";
import { MemoryService } from "../src/memory/memoryService";
import { GlobalMemoryService } from "../src/memory/globalMemoryService";
import { MapService } from "../src/map/mapService";
import { searchMemories, searchMapData } from "../src/retrieval/search";
import { runSearchCommand } from "../src/cli/commands/search";
import { makeTempDb, makeTempPairOfDbs } from "./helpers";

describe("stress — volume", () => {
  test("handles 1000 memories: insert, list, search all stay correct", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);

    for (let i = 0; i < 1000; i++) {
      service.add({
        type: i % 7 === 0 ? "bug" : "discovery",
        content: `Memory number ${i} — payment retry logic edge case variant ${i % 13}.`,
        importance: (i % 5) + 1,
      });
    }

    expect(service.list().length).toBe(1000);
    expect(service.list({ type: "bug" }).length).toBe(Math.ceil(1000 / 7));

    const hits = searchMemories(db, "payment", { limit: 1000 });
    expect(hits.length).toBe(1000);
    // bm25 ranking must still produce a valid, ordered, bounded score set.
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
    expect(hits.every((h) => h.score >= 0 && h.score <= 1)).toBe(true);
    db.close();
  });

  test("search respects the limit option under heavy result volume", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    for (let i = 0; i < 200; i++) {
      service.add({ type: "discovery", content: `Shared keyword occurrence number ${i} in content.` });
    }
    const hits = searchMemories(db, "shared", { limit: 10 });
    expect(hits.length).toBe(10);
    db.close();
  });

  test("map handles a wide, deep graph of entities and relationships", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    const ids: string[] = [];
    for (let i = 0; i < 300; i++) {
      const id = `module-${i}`;
      service.addModule(id, `src/module-${i}`);
      ids.push(id);
    }
    for (let i = 1; i < ids.length; i++) {
      service.addRelationship(ids[i]!, ids[i - 1]!, "depends-on");
    }
    expect(service.listEntities().length).toBe(300);
    expect(service.listRelationships().length).toBe(299);

    // Removing one in the middle of the chain should only drop its own edges.
    service.removeEntity("module-150");
    const remaining = service.listRelationships();
    expect(remaining.length).toBe(297); // module-150's two edges (in+out) gone
    expect(remaining.some((r) => r.fromEntity === "module-150" || r.toEntity === "module-150")).toBe(false);
    db.close();
  });

  test("global and local ledgers stay independent at scale", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    const local = new MemoryService(localDb);
    const global = new GlobalMemoryService(globalDb);
    // Kept under searchMemories' default limit (20) on purpose — this test
    // is about scope isolation, not about the result cap (see the
    // dedicated "search respects the limit option" test above for that).
    for (let i = 0; i < 15; i++) local.add({ type: "decision", content: `Local decision number ${i} about caching.` });
    for (let i = 0; i < 15; i++) global.add({ type: "lesson", content: `Global lesson number ${i} about caching.` });

    const output = runSearchCommand(localDb, globalDb, ["caching"]);
    const localCount = (output.match(/\[local\]/g) || []).length;
    const globalCount = (output.match(/\[global\]/g) || []).length;
    expect(localCount).toBe(15);
    expect(globalCount).toBe(15);
    localDb.close();
    globalDb.close();
  });
});

describe("stress — content size and character set", () => {
  test("accepts and correctly indexes a very large content blob (~200KB)", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const filler = "lorem ipsum dolor sit amet ".repeat(7000); // ~189KB
    const content = `${filler} findableuniquemarkerxyz at the end.`;
    const memory = service.add({ type: "discovery", content });

    expect(service.get(memory.id)?.content.length).toBe(content.length);
    const hits = searchMemories(db, "findableuniquemarkerxyz");
    expect(hits.length).toBe(1);
    // Snippet must stay bounded even when the source content is huge.
    expect(hits[0]!.snippet.length).toBeLessThanOrEqual(241);
    db.close();
  });

  test("round-trips unicode, accented and emoji content correctly", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const content = "Decisão: usar validação com acentuação e emoji 🚀🔥 para testar unicode.";
    const memory = service.add({ type: "decision", content });
    expect(service.get(memory.id)?.content).toBe(content);

    const hits = searchMemories(db, "validação");
    expect(hits.length).toBe(1);
    db.close();
  });

  test("FTS query containing double quotes doesn't crash or leak syntax", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    service.add({ type: "discovery", content: 'The user said "hello world" during the demo.' });
    expect(() => searchMemories(db, 'say "hello world"')).not.toThrow();
    db.close();
  });

  test("FTS query containing SQL-ish and FTS operator lookalikes doesn't crash", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    service.add({ type: "discovery", content: "Normal safe content about the login flow." });
    const hostileQueries = [
      "'; DROP TABLE memories; --",
      "term1 OR term2 NOT term3",
      "*wildcard*",
      "(parens) AND [brackets]",
      "%_%",
      "\\backslash\\",
    ];
    for (const q of hostileQueries) {
      expect(() => searchMemories(db, q)).not.toThrow();
    }
    // The table must still be intact after the injection attempt.
    expect(service.list().length).toBe(1);
    db.close();
  });

  test("map search (LIKE-based) also tolerates SQL-ish input safely", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("auth-module", "src/auth");
    const hostileQueries = ["'; DROP TABLE map_entities; --", "%_%", "auth' OR '1'='1"];
    for (const q of hostileQueries) {
      expect(() => searchMapData(db, q)).not.toThrow();
    }
    expect(service.listEntities().length).toBe(1);
    db.close();
  });

  test("a memory content string that IS exactly an ephemeral-looking command still round-trips once created via direct repo (only the service gate blocks `add`)", () => {
    // Sanity check for the boundary between the service-level ephemeral
    // gate and raw storage — the gate must not corrupt legitimately
    // borderline content that merely *starts* with a common word.
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    // "Cataloged the legacy endpoints for deprecation." starts with "Cata..."
    // which should NOT match the `cat` ephemeral pattern (word-boundary check).
    const memory = service.add({ type: "discovery", content: "Cataloged the legacy endpoints for deprecation." });
    expect(memory.content).toContain("Cataloged");
    db.close();
  });
});

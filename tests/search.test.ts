import { describe, expect, test } from "bun:test";
import { MemoryService } from "../src/memory/memoryService";
import { searchMemories } from "../src/retrieval/search";
import { makeTempDb } from "./helpers";

describe("retrieval", () => {
  test("indexes memory content automatically via FTS5 triggers", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "decision", content: "Authentication uses JWT because the API is stateless." });

    const hits = searchMemories(db, "authentication");
    expect(hits.length).toBe(1);
    db.close();
  });

  test("returns relevant results ranked by relevance", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "decision", content: "Payments module uses Stripe for card processing." });
    memoryService.add({ type: "discovery", content: "Stripe webhooks can arrive out of order during retries." });
    memoryService.add({ type: "lesson", content: "Always design UI components to be reusable across pages." });

    const hits = searchMemories(db, "stripe");
    expect(hits.length).toBe(2);
    expect(hits.every((h) => h.score >= 0 && h.score <= 1)).toBe(true);
    db.close();
  });

  test("returns empty array for no matches", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "lesson", content: "Keep the payment module isolated from the database layer." });

    const hits = searchMemories(db, "nonexistenttermxyz");
    expect(hits).toEqual([]);
    db.close();
  });

  test("removed memories drop out of the FTS index", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    const created = memoryService.add({ type: "bug", content: "Cart checkout race condition under load." });
    memoryService.remove(created.id);

    const hits = searchMemories(db, "checkout");
    expect(hits).toEqual([]);
    db.close();
  });
});

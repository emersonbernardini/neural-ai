import { describe, expect, test } from "bun:test";
import { MemoryService } from "../src/memory/memoryService";
import { ContextBuilder } from "../src/context/contextBuilder";
import { makeTempDb } from "./helpers";

describe("ContextBuilder", () => {
  test("filters to relevant, active memories only", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "decision", content: "Checkout uses a single database transaction." });
    const superseded = memoryService.add({ type: "decision", content: "Checkout used to call three separate queries." });
    memoryService.update(superseded.id, { status: "superseded" });

    const builder = new ContextBuilder(db);
    const context = builder.build("checkout");
    expect(context.entries.length).toBe(1);
    expect(context.entries[0]?.text).toContain("single database transaction");
    db.close();
  });

  test("orders by importance when relevance ties", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "lesson", content: "Retry webhook processing on transient failures.", importance: 2 });
    memoryService.add({ type: "lesson", content: "Retry webhook delivery with exponential backoff.", importance: 5 });

    const builder = new ContextBuilder(db);
    const context = builder.build("retry webhook");
    expect(context.entries[0]?.importance).toBeGreaterThanOrEqual(context.entries[1]?.importance ?? 0);
    db.close();
  });

  test("never exceeds the configured character budget", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    for (let i = 0; i < 20; i++) {
      memoryService.add({
        type: "discovery",
        content: `Discovery number ${i} about the payments retry pipeline and its edge cases.`,
      });
    }

    const builder = new ContextBuilder(db);
    const context = builder.build("payments retry pipeline", { budget: { maxCharacters: 200 } });
    expect(context.usedCharacters).toBeLessThanOrEqual(200);
    expect(context.text.length).toBeLessThanOrEqual(200);
    expect(context.omittedCount).toBeGreaterThan(0);
    db.close();
  });

  test("is deterministic across repeated calls", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    memoryService.add({ type: "decision", content: "Use JWT for stateless authentication." });
    memoryService.add({ type: "discovery", content: "JWT tokens expire after 24 hours by default." });

    const builder = new ContextBuilder(db);
    const first = builder.build("jwt authentication");
    const second = builder.build("jwt authentication");
    expect(first.text).toBe(second.text);
    db.close();
  });
});

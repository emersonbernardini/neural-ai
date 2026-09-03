import { describe, expect, test } from "bun:test";
import { MemoryService, checkPersistable } from "../src/memory/memoryService";
import { MapService } from "../src/map/mapService";
import { makeTempDb } from "./helpers";

describe("neural memory", () => {
  test("creates a memory", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const memory = service.add({ type: "decision", content: "Use repository pattern for persistence." });
    expect(memory.id).toStartWith("mem_");
    expect(memory.status).toBe("active");
    db.close();
  });

  test("retrieves a memory by id", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const created = service.add({ type: "discovery", content: "The API is fully stateless." });
    const fetched = service.get(created.id);
    expect(fetched?.content).toBe("The API is fully stateless.");
    db.close();
  });

  test("updates a memory", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const created = service.add({ type: "bug", content: "Race condition in CartService checkout." });
    const updated = service.update(created.id, { status: "resolved" });
    expect(updated.status).toBe("resolved");
    db.close();
  });

  test("deletes a memory", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const created = service.add({ type: "lesson", content: "Always wrap multi-step writes in a transaction." });
    expect(service.remove(created.id)).toBe(true);
    expect(service.get(created.id)).toBeNull();
    db.close();
  });

  test("preserves relationships to other memories and to map entities", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);
    const mapService = new MapService(db);

    mapService.addModule("cart-module", "src/cart");
    const bug = memoryService.add({ type: "bug", content: "CartService checkout drops items under load." });
    const fix = memoryService.add({ type: "solution", content: "Wrapped checkout in a single DB transaction." });

    memoryService.linkToMemory(fix.id, "resolves", bug.id);
    memoryService.linkToMapEntity(bug.id, "affects", "cart-module");

    const fixRels = memoryService.relationships(fix.id);
    const bugRels = memoryService.relationships(bug.id);
    expect(fixRels.some((r) => r.relation === "resolves" && r.targetId === bug.id)).toBe(true);
    expect(bugRels.some((r) => r.targetType === "map_entity" && r.targetId === "cart-module")).toBe(true);
    db.close();
  });

  test("rejects out-of-range importance", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    expect(() => service.add({ type: "lesson", content: "Some real lesson content here.", importance: 9 })).toThrow();
    db.close();
  });
});

describe("ephemeral vs persistent gate", () => {
  test("rejects empty content", () => {
    expect(checkPersistable("").allowed).toBe(false);
  });

  test("rejects raw shell-output-looking content", () => {
    expect(checkPersistable("ls -la /tmp").allowed).toBe(false);
  });

  test("rejects process-id-looking content", () => {
    expect(checkPersistable("pid: 48213").allowed).toBe(false);
  });

  test("accepts meaningful project knowledge", () => {
    expect(checkPersistable("Authentication uses JWT because the API is stateless.").allowed).toBe(true);
  });
});

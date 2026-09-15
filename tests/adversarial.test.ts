// Adversarial tests — these don't check the 8 known bugs (see
// regression.test.ts). They probe places the code TRUSTED its input
// without validating it, and places two subsystems (map vs memory)
// assumed the other cleaned up after itself.
//
// UPDATE: every test tagged "FINDING" started out red (see the original
// chat transcript / bun test output) — each one documented a real gap:
// silent enum bypass on `type`/`status`, no range check on `importance`
// in `update()`, dangling `memory_relationships` after `remove-entity`
// (map->memory), dangling `memory_relationships` after `memory delete`
// (memory->memory, found later during a real migration), and no
// self-relationship guard. All six have since been fixed in
// memoryRepository.ts, memoryService.ts and mapService.ts. These tests
// are kept exactly as they were (still asserting the CORRECT behavior)
// so they now serve as permanent regression guards instead of bug reports.

import { describe, expect, test } from "bun:test";
import { MapService } from "../src/map/mapService";
import { MemoryService } from "../src/memory/memoryService";
import { runMemoryCommand } from "../src/cli/commands/memory";
import { normalizeMemoryId } from "../src/util/ids";
import { makeTempDb } from "./helpers";

describe("adversarial — enum validation (previously a gap, now fixed)", () => {
  test("rejects a `memory add` with a `type` outside the MemoryType enum", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    expect(() =>
      service.add({ type: "not-a-real-type" as any, content: "Some plausible-looking content here." })
    ).toThrow();
    db.close();
  });

  test("rejects a `memory update status` value outside active|superseded|resolved", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const memory = service.add({ type: "bug", content: "Race condition in checkout." });
    expect(() => service.update(memory.id, { status: "not-a-real-status" as any })).toThrow();
    db.close();
  });

  test("rejects a `map add-entity` with a `type` outside the MapEntityType enum", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    expect(() => service.addEntity("weird-thing", "not-a-real-type" as any)).toThrow();
    db.close();
  });

  test("rejects a `map add-relationship` with a `type` outside the MapRelationType enum", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("a", "src/a");
    service.addModule("b", "src/b");
    expect(() => service.addRelationship("a", "b", "not-a-real-relation" as any)).toThrow();
    db.close();
  });
});

describe("adversarial — importance validation (previously a gap, now fixed)", () => {
  test("`memory add` rejects NaN as importance with a clear message (was already blocked accidentally by bun:sqlite; now blocked on purpose)", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    // Old guard: `importance < 1 || importance > 5` is FALSE for NaN on both
    // sides, so NaN used to slip past validation. It never reached storage
    // because bun:sqlite happened to reject NaN as a bind parameter — but
    // that was luck, not design. assertValidImportance() now catches it
    // explicitly, with a message that actually explains what's wrong.
    expect(() => service.add({ type: "bug", content: "Something broke somewhere.", importance: NaN })).toThrow(
      /integer between 1 and 5/
    );
    db.close();
  });

  test("`memory update` now enforces the same importance range check as `add`", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const memory = service.add({ type: "bug", content: "Something broke somewhere." });
    expect(() => service.update(memory.id, { importance: 999 })).toThrow();
    db.close();
  });

  test("CLI `memory update <id> importance <non-numeric>` rejects the NaN instead of storing it", () => {
    const { db } = makeTempDb();
    const globalDb = makeTempDb().db;
    const memory = new MemoryService(db).add({ type: "bug", content: "Something broke somewhere." });

    expect(() => runMemoryCommand(db, globalDb, ["update", memory.id, "importance", "not-a-number"])).toThrow();
    db.close();
    globalDb.close();
  });
});

describe("adversarial — cross-module cleanup (previously a gap, now fixed)", () => {
  test("removing a map entity also removes memory_relationships that pointed at it", () => {
    const { db } = makeTempDb();
    const mapService = new MapService(db);
    const memoryService = new MemoryService(db);

    mapService.addModule("cart-module", "src/cart");
    const bug = memoryService.add({ type: "bug", content: "Checkout drops items under load." });
    memoryService.linkToMapEntity(bug.id, "affects", "cart-module");

    mapService.removeEntity("cart-module");

    // A relationship shouldn't be allowed to point at an entity that no
    // longer exists — removeEntity() now cleans up memory_relationships
    // too, not just map_relationships.
    const rels = memoryService.relationships(bug.id);
    const danglingRef = rels.find((r) => r.targetType === "map_entity" && r.targetId === "cart-module");
    expect(danglingRef).toBeUndefined();
    db.close();
  });

  test("removing a memory also removes OTHER memories' relationships that pointed at it", () => {
    // Found live during a real memory migration (recreate + delete to
    // change an immutable `type`): a relationship from memory A to memory
    // B survived deleting B, because target_id has no FK — only the
    // memory_id side of memory_relationships cascades automatically.
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);

    const bug = memoryService.add({ type: "bug", content: "Checkout drops items under load." });
    const fix = memoryService.add({ type: "solution", content: "Wrapped checkout in a single DB transaction." });
    memoryService.linkToMemory(fix.id, "resolves", bug.id);

    memoryService.remove(bug.id);

    const fixRels = memoryService.relationships(fix.id);
    const danglingRef = fixRels.find((r) => r.targetType === "memory" && r.targetId === bug.id);
    expect(danglingRef).toBeUndefined();
    db.close();
  });

  test("removing a memory still removes ITS OWN outgoing relationships (the FK-backed side keeps working)", () => {
    const { db } = makeTempDb();
    const memoryService = new MemoryService(db);

    const bug = memoryService.add({ type: "bug", content: "Checkout drops items under load." });
    const fix = memoryService.add({ type: "solution", content: "Wrapped checkout in a single DB transaction." });
    memoryService.linkToMemory(fix.id, "resolves", bug.id);

    memoryService.remove(fix.id);

    // fix.id no longer exists, so its own relationships row (memory_id =
    // fix.id) should be gone via the existing ON DELETE CASCADE — this
    // isn't a new fix, just confirming we didn't break it while touching
    // remove() above.
    expect(memoryService.relationships(fix.id).length).toBe(0);
    db.close();
  });
});

describe("adversarial — self-relationship guard (previously a gap, now fixed)", () => {
  test("an entity cannot declare a relationship to itself", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("weird-module", "src/weird");
    expect(() => service.addRelationship("weird-module", "weird-module", "depends-on")).toThrow();
    db.close();
  });
});

describe("adversarial — confirmed-safe behavior (these SHOULD pass)", () => {
  test("adding the exact same relationship twice does not create a duplicate row", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("a", "src/a");
    service.addModule("b", "src/b");
    service.addRelationship("a", "b", "depends-on");
    service.addRelationship("a", "b", "depends-on");
    expect(service.listRelationships().length).toBe(1);
    db.close();
  });

  test("normalizeMemoryId is case-sensitive on the prefix — an upper-case MEM_ id is treated as bare and re-prefixed", () => {
    // Not a bug per se (ids are always lowercase UUIDs in practice via
    // crypto.randomUUID()), but worth pinning down: this will NOT resolve
    // to the original id if someone hand-types an uppercase prefix.
    expect(normalizeMemoryId("MEM_abc123")).toBe("mem_MEM_abc123");
  });

  test("empty-string entity id is rejected with a clear validation error, not a crash", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    expect(() => service.addModule("", "src/whatever")).toThrow();
    db.close();
  });

  test("whitespace-only memory content is rejected by the ephemeral gate, not stored as blank knowledge", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    expect(() => service.add({ type: "discovery", content: "     " })).toThrow();
    db.close();
  });

  test("deleting a memory that doesn't exist returns false rather than throwing", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    expect(service.remove("mem_does-not-exist")).toBe(false);
    db.close();
  });

  test("updating a memory that doesn't exist throws a clear error instead of silently no-op'ing", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    expect(() => service.update("mem_does-not-exist", { status: "resolved" })).toThrow();
    db.close();
  });
});

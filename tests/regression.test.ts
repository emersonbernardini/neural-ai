// Regression tests for the 8 bugs from the manual test report
// (neural-ai-test-report.md). Each block is named after the bug number
// so it's easy to trace a failing test back to the original report.

import { describe, expect, test } from "bun:test";
import { MapService } from "../src/map/mapService";
import { MemoryService } from "../src/memory/memoryService";
import { GlobalMemoryService } from "../src/memory/globalMemoryService";
import { runMapCommand } from "../src/cli/commands/map";
import { runMemoryCommand } from "../src/cli/commands/memory";
import { runSearchCommand } from "../src/cli/commands/search";
import { normalizeMemoryId } from "../src/util/ids";
import { makeTempDb, makeTempPairOfDbs } from "./helpers";

describe("bug 1 — empty search query", () => {
  test("CLI: empty query lists memories instead of throwing", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    new MemoryService(localDb).add({ type: "decision", content: "Auth uses JWT stateless." });
    new GlobalMemoryService(globalDb).add({ type: "lesson", content: "Validate input at the boundary." });

    const output = runSearchCommand(localDb, globalDb, []);
    expect(output).toContain("[local]");
    expect(output).toContain("[global]");
    expect(output).toContain("JWT");
    localDb.close();
    globalDb.close();
  });

  test("CLI: empty query on an empty project gives a friendly message, not an error", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    expect(() => runSearchCommand(localDb, globalDb, [])).not.toThrow();
    const output = runSearchCommand(localDb, globalDb, []);
    expect(output).toMatch(/no memories/i);
    localDb.close();
    globalDb.close();
  });

  test("CLI: a query of only whitespace behaves like an empty query", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    new MemoryService(localDb).add({ type: "decision", content: "Auth uses JWT stateless." });
    expect(() => runSearchCommand(localDb, globalDb, ["   "])).not.toThrow();
    localDb.close();
    globalDb.close();
  });
});

describe("bug 2 — subcommand help", () => {
  test("`neural map help` (and --help / -h) print usage instead of erroring", () => {
    const { db } = makeTempDb();
    for (const flag of ["help", "--help", "-h"]) {
      const output = runMapCommand(db, [flag]);
      expect(output).toContain("add-module");
      expect(output).toContain("remove-constraint");
    }
    db.close();
  });

  test("`neural memory help` (and --help / -h) print usage instead of erroring", () => {
    const { db } = makeTempDb();
    const globalDb = makeTempDb().db;
    for (const flag of ["help", "--help", "-h"]) {
      const output = runMemoryCommand(db, globalDb, [flag]);
      expect(output).toContain("update");
      expect(output).toContain("--global");
    }
    db.close();
    globalDb.close();
  });
});

describe("bug 3 — update error lists valid fields", () => {
  test("unknown field error names the fields that ARE valid", () => {
    const { db } = makeTempDb();
    const globalDb = makeTempDb().db;
    const memory = new MemoryService(db).add({ type: "bug", content: "Race condition in checkout." });

    expect(() => runMemoryCommand(db, globalDb, ["update", memory.id, "text", "whatever"])).toThrow(
      /content.*importance.*status|status.*importance.*content/i
    );
    db.close();
    globalDb.close();
  });

  test("attempting to change `type` fails with a clear message (type is immutable)", () => {
    const { db } = makeTempDb();
    const globalDb = makeTempDb().db;
    const memory = new MemoryService(db).add({ type: "bug", content: "Race condition in checkout." });

    expect(() => runMemoryCommand(db, globalDb, ["update", memory.id, "type", "lesson"])).toThrow();
    db.close();
    globalDb.close();
  });
});

describe("bug 4 — architecture can be reset", () => {
  test("set-architecture accepts an explicit empty string instead of erroring", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.setArchitecture("clean architecture");
    expect(() => runMapCommand(db, ["set-architecture", ""])).not.toThrow();
    expect(service.getArchitecture()).toBe("");
    db.close();
  });

  test("clear-architecture removes the note entirely (getArchitecture returns null again)", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.setArchitecture("clean architecture");
    const output = runMapCommand(db, ["clear-architecture"]);
    expect(output).toMatch(/cleared/i);
    expect(service.getArchitecture()).toBeNull();
    db.close();
  });

  test("clear-architecture on an already-unset architecture says so, doesn't throw", () => {
    const { db } = makeTempDb();
    const output = runMapCommand(db, ["clear-architecture"]);
    expect(output).toMatch(/already unset/i);
    db.close();
  });
});

describe("bug 5 — remove-entity cascades relationships", () => {
  test("removing an entity also removes relationships that reference it", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("app", "src/app");
    service.addModule("static", "src/static");
    service.addRelationship("app", "static", "depends-on");

    service.removeEntity("static");

    const remaining = service.listRelationships();
    expect(remaining.length).toBe(0);
    db.close();
  });

  test("removing an entity only cascades ITS relationships, not unrelated ones", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("app", "src/app");
    service.addModule("static", "src/static");
    service.addModule("db", "src/db");
    service.addRelationship("app", "static", "depends-on");
    service.addRelationship("app", "db", "depends-on");

    service.removeEntity("static");

    const remaining = service.listRelationships();
    expect(remaining.length).toBe(1);
    expect(remaining[0]?.toEntity).toBe("db");
    db.close();
  });
});

describe("bug 6 — constraints are individually removable", () => {
  test("remove-constraint deletes exactly the targeted constraint by id", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    const first = service.setConstraint("Never log tokens in plaintext");
    const second = service.setConstraint("Never call the payment API from the render path");

    const removed = service.removeConstraint(first.id);
    expect(removed).toBe(true);

    const remaining = service.listConstraints();
    expect(remaining.length).toBe(1);
    expect(remaining[0]?.id).toBe(second.id);
    db.close();
  });

  test("removing a non-existent constraint id returns false, doesn't throw", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    expect(service.removeConstraint(99999)).toBe(false);
    db.close();
  });

  test("CLI rejects a non-numeric constraint id with a clear message", () => {
    const { db } = makeTempDb();
    expect(() => runMapCommand(db, ["remove-constraint", "not-a-number"])).toThrow();
    db.close();
  });
});

describe("bug 7 — search indexes map data, not just memories", () => {
  test("search finds a relationship by its type", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    const map = new MapService(localDb);
    map.addModule("app", "src/app");
    map.addModule("static", "src/static");
    map.addRelationship("app", "static", "depends-on");

    const output = runSearchCommand(localDb, globalDb, ["depends-on"]);
    expect(output).toContain("depends-on");
    localDb.close();
    globalDb.close();
  });

  test("search finds a constraint by its description", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    new MapService(localDb).setConstraint("Never log tokens in plaintext");

    const output = runSearchCommand(localDb, globalDb, ["plaintext"]);
    expect(output).toContain("constraint:");
    localDb.close();
    globalDb.close();
  });

  test("search finds the architecture note", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    new MapService(localDb).setArchitecture("hexagonal architecture");

    const output = runSearchCommand(localDb, globalDb, ["hexagonal"]);
    expect(output).toContain("architecture");
    localDb.close();
    globalDb.close();
  });

  test("search finds an entity by name or path", () => {
    const { localDb, globalDb } = makeTempPairOfDbs();
    new MapService(localDb).addModule("auth-module", "src/auth");

    const output = runSearchCommand(localDb, globalDb, ["auth-module"]);
    expect(output).toContain("entity");
    localDb.close();
    globalDb.close();
  });
});

describe("bug 8 — memory ids tolerate the mem_ prefix being dropped", () => {
  test("show/update/delete accept the bare uuid (no mem_ prefix)", () => {
    const { db } = makeTempDb();
    const service = new MemoryService(db);
    const memory = service.add({ type: "discovery", content: "The API is fully stateless." });
    const bareId = memory.id.replace(/^mem_/, "");

    expect(service.get(bareId)?.id).toBe(memory.id);
    expect(service.update(bareId, { status: "resolved" }).status).toBe("resolved");
    expect(service.remove(bareId)).toBe(true);
    expect(service.get(memory.id)).toBeNull();
    db.close();
  });

  test("normalizeMemoryId is idempotent — normalizing an already-prefixed id is a no-op", () => {
    expect(normalizeMemoryId("mem_abc123")).toBe("mem_abc123");
    expect(normalizeMemoryId("abc123")).toBe("mem_abc123");
  });

  test("CLI `memory show` also accepts the bare id", () => {
    const { db } = makeTempDb();
    const globalDb = makeTempDb().db;
    const memory = new MemoryService(db).add({ type: "discovery", content: "The API is fully stateless." });
    const bareId = memory.id.replace(/^mem_/, "");

    const output = runMemoryCommand(db, globalDb, ["show", bareId]);
    expect(output).toContain(memory.id);
    db.close();
    globalDb.close();
  });
});

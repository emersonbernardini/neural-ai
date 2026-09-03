import { describe, expect, test } from "bun:test";
import { MapService } from "../src/map/mapService";
import { makeTempDb } from "./helpers";

describe("neural map", () => {
  test("adds and retrieves a module", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    const entity = service.addModule("auth-module", "src/auth");
    expect(entity.id).toBe("auth-module");
    expect(entity.path).toBe("src/auth");
    expect(service.getEntity("auth-module")?.name).toBe("auth-module");
    db.close();
  });

  test("rejects entity ids that look like file paths", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    expect(() => service.addModule("src/auth", "src/auth")).toThrow();
    db.close();
  });

  test("updates an existing entity in place", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("auth-module", "src/auth");
    const updated = service.updateEntity("auth-module", { path: "src/security/auth" });
    expect(updated.path).toBe("src/security/auth");
    db.close();
  });

  test("creates relationships between known entities", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("auth-module", "src/auth");
    service.addModule("user-module", "src/users");
    service.addRelationship("auth-module", "user-module", "depends-on");
    const rels = service.listRelationships("auth-module");
    expect(rels.length).toBe(1);
    expect(rels[0]?.toEntity).toBe("user-module");
    db.close();
  });

  test("rejects relationships to unknown entities", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("auth-module", "src/auth");
    expect(() => service.addRelationship("auth-module", "does-not-exist", "depends-on")).toThrow();
    db.close();
  });

  test("removes an entity", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.addModule("auth-module", "src/auth");
    expect(service.removeEntity("auth-module")).toBe(true);
    expect(service.getEntity("auth-module")).toBeNull();
    db.close();
  });

  test("stores architecture and constraints", () => {
    const { db } = makeTempDb();
    const service = new MapService(db);
    service.setArchitecture("repository-pattern");
    service.setConstraint("payment module must never access the database directly");
    expect(service.getArchitecture()).toBe("repository-pattern");
    expect(service.listConstraints().length).toBe(1);
    db.close();
  });
});

// Structured mutation API for the neural map. This is the surface the CLI
// (and future integrations) should use — never raw SQL, never a single
// free-form "update" blob.

import type { Database } from "bun:sqlite";
import type { MapEntity, MapEntityType, MapRelationType } from "../core/types";
import { assertValidEntityId } from "../util/ids";
import { MapRepository } from "./mapRepository";

export class MapService {
  private readonly repo: MapRepository;

  constructor(db: Database) {
    this.repo = new MapRepository(db);
  }

  addModule(id: string, path: string, opts?: { name?: string; attributes?: Record<string, unknown> }): MapEntity {
    assertValidEntityId(id);
    return this.repo.upsertEntity({
      id,
      type: "module",
      name: opts?.name ?? id,
      path,
      attributes: opts?.attributes,
    });
  }

  addEntity(
    id: string,
    type: MapEntityType,
    opts?: { name?: string; path?: string; attributes?: Record<string, unknown> }
  ): MapEntity {
    assertValidEntityId(id);
    return this.repo.upsertEntity({
      id,
      type,
      name: opts?.name ?? id,
      path: opts?.path,
      attributes: opts?.attributes,
    });
  }

  updateEntity(
    id: string,
    changes: Partial<Pick<MapEntity, "name" | "path" | "status" | "attributes">>
  ): MapEntity {
    const existing = this.repo.getEntity(id);
    if (!existing) {
      throw new Error(`Map entity "${id}" does not exist`);
    }
    return this.repo.upsertEntity({
      id,
      type: existing.type,
      name: changes.name ?? existing.name,
      path: changes.path ?? existing.path,
      status: changes.status ?? existing.status,
      attributes: changes.attributes ?? existing.attributes,
    });
  }

  removeEntity(id: string): boolean {
    return this.repo.removeEntity(id);
  }

  getEntity(id: string): MapEntity | null {
    return this.repo.getEntity(id);
  }

  listEntities(filter?: { type?: MapEntityType; status?: MapEntity["status"] }): MapEntity[] {
    return this.repo.listEntities(filter);
  }

  addRelationship(fromEntity: string, toEntity: string, type: MapRelationType) {
    if (!this.repo.getEntity(fromEntity)) throw new Error(`Unknown entity "${fromEntity}"`);
    if (!this.repo.getEntity(toEntity)) throw new Error(`Unknown entity "${toEntity}"`);
    return this.repo.addRelationship(fromEntity, toEntity, type);
  }

  listRelationships(entityId?: string) {
    return this.repo.listRelationships(entityId);
  }

  setArchitecture(pattern: string): void {
    this.repo.setMeta("architecture", pattern);
  }

  getArchitecture(): string | null {
    return this.repo.getMeta("architecture");
  }

  setProjectSummary(summary: string): void {
    this.repo.setMeta("summary", summary);
  }

  getMeta() {
    return this.repo.listMeta();
  }

  setConstraint(description: string) {
    return this.repo.addConstraint(description);
  }

  listConstraints() {
    return this.repo.listConstraints();
  }
}

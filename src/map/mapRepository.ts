// Raw CRUD against the map_* tables. No business rules here — see mapService.ts.

import type { Database } from "bun:sqlite";
import type { MapConstraint, MapEntity, MapEntityType, MapRelationType, MapRelationship } from "../core/types";
import { nowIso } from "../util/ids";

function rowToEntity(row: any): MapEntity {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    path: row.path,
    status: row.status,
    attributes: JSON.parse(row.attributes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MapRepository {
  constructor(private readonly db: Database) {}

  upsertEntity(input: {
    id: string;
    type: MapEntityType;
    name: string;
    path?: string | null;
    status?: MapEntity["status"];
    attributes?: Record<string, unknown>;
  }): MapEntity {
    const existing = this.getEntity(input.id);
    const ts = nowIso();

    if (existing) {
      this.db
        .query(
          `UPDATE map_entities
           SET type = ?, name = ?, path = ?, status = ?, attributes = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          input.type,
          input.name,
          input.path ?? existing.path,
          input.status ?? existing.status,
          JSON.stringify(input.attributes ?? existing.attributes),
          ts,
          input.id
        );
    } else {
      this.db
        .query(
          `INSERT INTO map_entities (id, type, name, path, status, attributes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.id,
          input.type,
          input.name,
          input.path ?? null,
          input.status ?? "active",
          JSON.stringify(input.attributes ?? {}),
          ts,
          ts
        );
    }

    return this.getEntity(input.id)!;
  }

  getEntity(id: string): MapEntity | null {
    const row = this.db.query("SELECT * FROM map_entities WHERE id = ?").get(id);
    return row ? rowToEntity(row) : null;
  }

  listEntities(filter?: { type?: MapEntityType; status?: MapEntity["status"] }): MapEntity[] {
    let sql = "SELECT * FROM map_entities";
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter?.type) {
      clauses.push("type = ?");
      params.push(filter.type);
    }
    if (filter?.status) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    sql += " ORDER BY name ASC";
    const rows = this.db.query(sql).all(...(params as [])) as any[];
    return rows.map(rowToEntity);
  }

  removeEntity(id: string): boolean {
    // map_relationships has ON DELETE CASCADE in the schema, but that only
    // fires when SQLite's foreign key enforcement is active for this
    // connection — deleting relationships explicitly here makes the cleanup
    // correct regardless of pragma state, and keeps the intent visible.
    this.db
      .query("DELETE FROM map_relationships WHERE from_entity = ? OR to_entity = ?")
      .run(id, id);
    // memory_relationships can point AT a map entity (target_type =
    // 'map_entity') with no foreign key at all — that table lives in the
    // memory subsystem, so nothing there knows this entity just disappeared.
    // Clean those up too, or `neural memory show` keeps "affects ->
    // map_entity:<id>" pointing at nothing forever.
    this.db
      .query("DELETE FROM memory_relationships WHERE target_type = 'map_entity' AND target_id = ?")
      .run(id);
    const result = this.db.query("DELETE FROM map_entities WHERE id = ?").run(id);
    return result.changes > 0;
  }

  addRelationship(fromEntity: string, toEntity: string, type: MapRelationType): MapRelationship {
    const ts = nowIso();
    this.db
      .query(
        `INSERT OR IGNORE INTO map_relationships (from_entity, to_entity, type, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(fromEntity, toEntity, type, ts);
    return this.db
      .query(
        "SELECT * FROM map_relationships WHERE from_entity = ? AND to_entity = ? AND type = ?"
      )
      .get(fromEntity, toEntity, type) as MapRelationship;
  }

  listRelationships(entityId?: string): MapRelationship[] {
    const rows = entityId
      ? (this.db
          .query(
            "SELECT * FROM map_relationships WHERE from_entity = ? OR to_entity = ? ORDER BY id"
          )
          .all(entityId, entityId) as any[])
      : (this.db.query("SELECT * FROM map_relationships ORDER BY id").all() as any[]);
    return rows.map((r) => ({
      id: r.id,
      fromEntity: r.from_entity,
      toEntity: r.to_entity,
      type: r.type,
      createdAt: r.created_at,
    }));
  }

  setMeta(key: string, value: string): void {
    const ts = nowIso();
    this.db
      .query(
        `INSERT INTO map_meta (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, value, ts);
  }

  getMeta(key: string): string | null {
    const row = this.db.query("SELECT value FROM map_meta WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  deleteMeta(key: string): boolean {
    const result = this.db.query("DELETE FROM map_meta WHERE key = ?").run(key);
    return result.changes > 0;
  }

  listMeta(): Record<string, string> {
    const rows = this.db.query("SELECT key, value FROM map_meta").all() as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  addConstraint(description: string): MapConstraint {
    const ts = nowIso();
    const result = this.db
      .query("INSERT INTO map_constraints (description, created_at) VALUES (?, ?)")
      .run(description, ts);
    return {
      id: Number(result.lastInsertRowid),
      description,
      createdAt: ts,
    };
  }

  listConstraints(): MapConstraint[] {
    const rows = this.db
      .query("SELECT * FROM map_constraints ORDER BY id")
      .all() as any[];
    return rows.map((r) => ({ id: r.id, description: r.description, createdAt: r.created_at }));
  }

  removeConstraint(id: number): boolean {
    const result = this.db.query("DELETE FROM map_constraints WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

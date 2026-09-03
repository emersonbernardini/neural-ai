// Raw CRUD against memories / memory_relationships. FTS indexing is handled
// automatically by the SQL triggers created in migration 0001.

import type { Database } from "bun:sqlite";
import type { Memory, MemoryRelationship, MemoryRelationTargetType, MemoryStatus, MemoryType } from "../core/types";
import { newMemoryId, nowIso } from "../util/ids";

function rowToMemory(row: any): Memory {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    importance: row.importance,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MemoryRepository {
  constructor(private readonly db: Database) {}

  create(input: {
    type: MemoryType;
    content: string;
    importance?: number;
    source?: string | null;
  }): Memory {
    const id = newMemoryId();
    const ts = nowIso();
    this.db
      .query(
        `INSERT INTO memories (id, type, content, importance, status, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
      )
      .run(id, input.type, input.content, input.importance ?? 3, input.source ?? null, ts, ts);
    return this.get(id)!;
  }

  get(id: string): Memory | null {
    const row = this.db.query("SELECT * FROM memories WHERE id = ?").get(id);
    return row ? rowToMemory(row) : null;
  }

  list(filter?: { type?: MemoryType; status?: MemoryStatus }): Memory[] {
    let sql = "SELECT * FROM memories";
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
    sql += " ORDER BY created_at DESC";
    const rows = this.db.query(sql).all(...(params as [])) as any[];
    return rows.map(rowToMemory);
  }

  update(
    id: string,
    changes: Partial<Pick<Memory, "content" | "importance" | "status" | "source">>
  ): Memory {
    const existing = this.get(id);
    if (!existing) throw new Error(`Memory "${id}" does not exist`);
    const ts = nowIso();
    this.db
      .query(
        `UPDATE memories SET content = ?, importance = ?, status = ?, source = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        changes.content ?? existing.content,
        changes.importance ?? existing.importance,
        changes.status ?? existing.status,
        changes.source ?? existing.source,
        ts,
        id
      );
    return this.get(id)!;
  }

  remove(id: string): boolean {
    const result = this.db.query("DELETE FROM memories WHERE id = ?").run(id);
    return result.changes > 0;
  }

  addRelationship(
    memoryId: string,
    relation: string,
    targetType: MemoryRelationTargetType,
    targetId: string
  ): MemoryRelationship {
    const ts = nowIso();
    const result = this.db
      .query(
        `INSERT INTO memory_relationships (memory_id, relation, target_type, target_id, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(memoryId, relation, targetType, targetId, ts);
    return {
      id: Number(result.lastInsertRowid),
      memoryId,
      relation,
      targetType,
      targetId,
      createdAt: ts,
    };
  }

  listRelationships(memoryId: string): MemoryRelationship[] {
    const rows = this.db
      .query("SELECT * FROM memory_relationships WHERE memory_id = ? ORDER BY id")
      .all(memoryId) as any[];
    return rows.map((r) => ({
      id: r.id,
      memoryId: r.memory_id,
      relation: r.relation,
      targetType: r.target_type,
      targetId: r.target_id,
      createdAt: r.created_at,
    }));
  }
}

// Retrieval subsystem, kept independent from storage internals so future
// search strategies can be swapped in without touching repositories.

import type { Database } from "bun:sqlite";
import type { SearchHit } from "../core/types";

export interface SearchOptions {
  limit?: number;
}

/**
 * Escapes an FTS5 MATCH query so arbitrary user input can't break the
 * query syntax. Wraps each token in double quotes and joins with AND.
 */
function toFtsQuery(raw: string): string {
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
  if (tokens.length === 0) return '""';
  return tokens.join(" AND ");
}

/**
 * Searches memory content via FTS5, ranked by bm25 (lower is better in
 * SQLite's bm25() — we invert it into a normalized 0..1 "higher is better"
 * relevance score so callers never need to know the underlying metric).
 */
export function searchMemories(db: Database, query: string, opts: SearchOptions = {}): SearchHit[] {
  const limit = opts.limit ?? 20;
  const ftsQuery = toFtsQuery(query);

  const rows = db
    .query(
      `SELECT m.id AS id,
              m.content AS content,
              bm25(memories_fts) AS rank
       FROM memories_fts
       JOIN memories m ON m.rowid = memories_fts.rowid
       WHERE memories_fts MATCH ?
       ORDER BY rank ASC
       LIMIT ?`
    )
    .all(ftsQuery, limit) as { id: string; content: string; rank: number }[];

  if (rows.length === 0) return [];

  // bm25() returns negative-or-positive values where lower = more relevant.
  // Normalize into (0, 1] so downstream ranking (contextBuilder) has a
  // consistent, deterministic scale regardless of the underlying metric.
  const ranks = rows.map((r) => r.rank);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  const spread = maxRank - minRank || 1;

  return rows.map((r) => {
    const normalized = 1 - (r.rank - minRank) / spread; // best match -> 1
    return {
      kind: "memory" as const,
      id: r.id,
      score: Number(normalized.toFixed(4)),
      snippet: r.content.length > 240 ? r.content.slice(0, 240) + "…" : r.content,
    };
  });
}

/**
 * Searches the neural MAP (entities, relationships, constraints and the
 * architecture/meta notes) via plain case-insensitive LIKE matching.
 * The map has no FTS index — its rows are few and short compared to
 * memories, so LIKE is sufficient and keeps this independent of the
 * memories_fts virtual table. Only the local db has map tables (the
 * global db is memory-only), so this is never called against globalDb.
 */
export function searchMapData(db: Database, query: string): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const term = `%${trimmed}%`;
  const hits: SearchHit[] = [];

  const entities = db
    .query(
      `SELECT * FROM map_entities
       WHERE id LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE OR path LIKE ? COLLATE NOCASE`
    )
    .all(term, term, term) as any[];
  for (const e of entities) {
    hits.push({
      kind: "map_entity",
      id: e.id,
      score: 1,
      snippet: `entity [${e.type}] ${e.name}${e.path ? ` (${e.path})` : ""}`,
    });
  }

  const rels = db
    .query(
      `SELECT * FROM map_relationships
       WHERE from_entity LIKE ? COLLATE NOCASE OR to_entity LIKE ? COLLATE NOCASE OR type LIKE ? COLLATE NOCASE`
    )
    .all(term, term, term) as any[];
  for (const r of rels) {
    hits.push({
      kind: "map_entity",
      id: `rel_${r.id}`,
      score: 1,
      snippet: `relationship: ${r.from_entity} -${r.type}-> ${r.to_entity}`,
    });
  }

  const constraints = db
    .query(`SELECT * FROM map_constraints WHERE description LIKE ? COLLATE NOCASE`)
    .all(term) as any[];
  for (const c of constraints) {
    hits.push({
      kind: "map_entity",
      id: `constraint_${c.id}`,
      score: 1,
      snippet: `constraint: ${c.description}`,
    });
  }

  const meta = db
    .query(`SELECT * FROM map_meta WHERE key LIKE ? COLLATE NOCASE OR value LIKE ? COLLATE NOCASE`)
    .all(term, term) as any[];
  for (const m of meta) {
    hits.push({
      kind: "map_entity",
      id: `meta_${m.key}`,
      score: 1,
      snippet: `${m.key}: ${m.value}`,
    });
  }

  return hits;
}

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

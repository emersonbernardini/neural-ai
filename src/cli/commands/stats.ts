import type { Database } from "bun:sqlite";

export function runStatsCommand(db: Database): string {
  const entityCount = (db.query("SELECT COUNT(*) AS c FROM map_entities").get() as { c: number }).c;
  const relCount = (db.query("SELECT COUNT(*) AS c FROM map_relationships").get() as { c: number }).c;
  const memoryCount = (db.query("SELECT COUNT(*) AS c FROM memories").get() as { c: number }).c;
  const constraintCount = (db.query("SELECT COUNT(*) AS c FROM map_constraints").get() as { c: number }).c;
  const byType = db
    .query("SELECT type, COUNT(*) AS c FROM memories GROUP BY type ORDER BY c DESC")
    .all() as { type: string; c: number }[];

  const lines = [
    `map entities: ${entityCount}`,
    `map relationships: ${relCount}`,
    `map constraints: ${constraintCount}`,
    `memories: ${memoryCount}`,
    ...byType.map((t) => `  - ${t.type}: ${t.c}`),
  ];
  return lines.join("\n");
}

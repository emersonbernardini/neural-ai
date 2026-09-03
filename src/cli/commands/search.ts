import type { Database } from "bun:sqlite";
import { searchMemories } from "../../retrieval/search";

export function runSearchCommand(localDb: Database, globalDb: Database, args: string[]): string {
  const query = args.join(" ");
  if (!query) throw new Error('usage: neural search "<query>"');

  const localHits = searchMemories(localDb, query);
  const globalHits = searchMemories(globalDb, query);

  const allHits = [
    ...localHits.map((h) => ({ ...h, scope: "local" as const })),
    ...globalHits.map((h) => ({ ...h, scope: "global" as const })),
  ];

  if (allHits.length === 0) return "(no results)";

  // Sort by score descending (highest relevance first)
  allHits.sort((a, b) => b.score - a.score);

  return allHits
    .map((h) => `${h.id}  [${h.scope}]  score=${h.score}  ${h.snippet}`)
    .join("\n");
}
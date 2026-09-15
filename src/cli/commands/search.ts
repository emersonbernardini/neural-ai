import type { Database } from "bun:sqlite";
import { searchMemories, searchMapData } from "../../retrieval/search";
import { MemoryService } from "../../memory/memoryService";
import { GlobalMemoryService } from "../../memory/globalMemoryService";

export function runSearchCommand(localDb: Database, globalDb: Database, args: string[]): string {
  const query = args.join(" ").trim();

  // An empty query is a reasonable, intuitive way to ask "what's in here?" —
  // `neural memory list` already supports that use case, so search should
  // not reject it. Fall back to a plain recency-ordered listing across both
  // ledgers instead of erroring.
  if (!query) {
    const local = new MemoryService(localDb).list();
    const global = new GlobalMemoryService(globalDb).list();
    const allMemories = [
      ...local.map((m) => ({ ...m, scope: "local" as const })),
      ...global.map((m) => ({ ...m, scope: "global" as const })),
    ];
    if (allMemories.length === 0) return "(no memories yet — empty query has nothing to list)";
    return allMemories
      .map((m) => `${m.id}  [${m.scope}]  [${m.type}]  ${m.content}`)
      .join("\n");
  }

  const localHits = searchMemories(localDb, query);
  const globalHits = searchMemories(globalDb, query);
  // Map data (entities, relationships, constraints, architecture) is
  // local-only — there's no global map.
  const mapHits = searchMapData(localDb, query);

  const allHits = [
    ...localHits.map((h) => ({ ...h, scope: "local" as const })),
    ...globalHits.map((h) => ({ ...h, scope: "global" as const })),
    ...mapHits.map((h) => ({ ...h, scope: "local" as const })),
  ];

  if (allHits.length === 0) return "(no results)";

  // Sort by score descending (highest relevance first)
  allHits.sort((a, b) => b.score - a.score);

  return allHits
    .map((h) => `${h.id}  [${h.scope}]  score=${h.score}  ${h.snippet}`)
    .join("\n");
}

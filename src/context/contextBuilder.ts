// Builds a compact, deterministic, explainable context block for insertion
// into an AI agent's prompt. External LLM tokenizers are out of scope for
// V1 — the budget is a plain character count.

import type { Database } from "bun:sqlite";
import type { BuiltContext, ContextBudget, ContextEntry } from "../core/types";
import { MemoryRepository } from "../memory/memoryRepository";
import { GlobalMemoryRepository } from "../memory/globalMemoryRepository";
import { searchMemories } from "../retrieval/search";

const DEFAULT_MAX_CHARACTERS = 4000; // documented default; override via ContextBudget

export interface ContextBuilderOptions {
  budget?: ContextBudget;
}

export class ContextBuilder {
  private readonly localDb: Database;
  private readonly globalDb: Database | null;
  private readonly localMemories: MemoryRepository;
  private readonly globalMemories: GlobalMemoryRepository | null;

  constructor(localDb: Database, globalDb?: Database | null) {
    this.localDb = localDb;
    this.globalDb = globalDb ?? null;
    this.localMemories = new MemoryRepository(localDb);
    this.globalMemories = globalDb ? new GlobalMemoryRepository(globalDb) : null;
  }

  build(query: string, options: ContextBuilderOptions = {}): BuiltContext {
    const budget: ContextBudget = options.budget ?? { maxCharacters: DEFAULT_MAX_CHARACTERS };

    // Search both local and global databases
    const localHits = searchMemories(this.localDb, query, { limit: 50 });
    const globalHits = this.globalDb ? searchMemories(this.globalDb, query, { limit: 50 }) : [];

    // Combine hits, tagging each with its scope
    const allHits = [
      ...localHits.map((h) => ({ ...h, scope: "local" as const })),
      ...globalHits.map((h) => ({ ...h, scope: "global" as const })),
    ];

    const candidates: ContextEntry[] = allHits
      .map((hit): ContextEntry | null => {
        const repo = hit.scope === "global" ? this.globalMemories : this.localMemories;
        if (!repo) return null;
        const memory = repo.get(hit.id);
        if (!memory || memory.status !== "active") return null;
        return {
          kind: "memory",
          id: memory.id,
          text: `[${memory.type}] ${memory.content}`,
          relevance: hit.score,
          importance: memory.importance,
          recency: memory.updatedAt,
        };
      })
      .filter((e): e is ContextEntry => e !== null);

    // Deterministic priority: relevance desc, then importance desc, then recency desc.
    candidates.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.recency.localeCompare(a.recency);
    });

    const included: ContextEntry[] = [];
    let used = 0;
    let omitted = 0;

    for (const entry of candidates) {
      // +1 accounts for the newline separator joining entries.
      const cost = entry.text.length + (included.length > 0 ? 1 : 0);
      if (used + cost > budget.maxCharacters) {
        omitted++;
        continue; // never silently exceed the configured budget
      }
      included.push(entry);
      used += cost;
    }

    const text = included.map((e) => e.text).join("\n");

    return {
      query,
      budget,
      usedCharacters: used,
      entries: included,
      omittedCount: omitted,
      text,
    };
  }
}
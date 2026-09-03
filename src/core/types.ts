// Core domain types shared across the neural-map and neural-memory subsystems.
// Kept intentionally small — extend only when a concrete consumer needs it.

// ---------------------------------------------------------------------------
// Neural Map — current state of the project
// ---------------------------------------------------------------------------

export type MapEntityType = "module" | "component" | "domain-entity" | "subsystem";

export interface MapEntity {
  id: string; // stable logical id, e.g. "auth-module" (NOT a file path)
  type: MapEntityType;
  name: string;
  path: string | null; // current file path, metadata only — not the identity
  status: "active" | "deprecated" | "planned";
  attributes: Record<string, unknown>;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export type MapRelationType = "depends-on" | "part-of" | "implements" | "related-to";

export interface MapRelationship {
  id: number;
  fromEntity: string;
  toEntity: string;
  type: MapRelationType;
  createdAt: string;
}

export interface MapConstraint {
  id: number;
  description: string;
  createdAt: string;
}

// Free-form key/value facts about the project as a whole (e.g. "architecture" -> "repository-pattern")
export interface MapMetaEntry {
  key: string;
  value: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Neural Memory — historical knowledge
// ---------------------------------------------------------------------------

export type MemoryType =
  | "discovery"
  | "decision"
  | "solution"
  | "bug"
  | "constraint"
  | "architecture"
  | "change"
  | "lesson"
  | "unresolved";

export type MemoryStatus = "active" | "superseded" | "resolved";

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number; // 1 (low) - 5 (critical)
  status: MemoryStatus;
  source: string | null; // e.g. "cli", "agent:claude"
  createdAt: string;
  updatedAt: string;
}

export type MemoryRelationTargetType = "memory" | "map_entity";

export interface MemoryRelationship {
  id: number;
  memoryId: string;
  relation: string; // e.g. "affects", "caused-by", "resolves", "references"
  targetType: MemoryRelationTargetType;
  targetId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Retrieval / Context
// ---------------------------------------------------------------------------

export interface SearchHit {
  kind: "memory" | "map_entity";
  id: string;
  score: number; // higher is more relevant (bm25-derived, normalized)
  snippet: string;
}

export interface ContextBudget {
  maxCharacters: number;
}

export interface ContextEntry {
  kind: "memory" | "map_entity";
  id: string;
  text: string;
  relevance: number;
  importance: number;
  recency: string; // ISO timestamp used for recency ordering
}

export interface BuiltContext {
  query: string;
  budget: ContextBudget;
  usedCharacters: number;
  entries: ContextEntry[];
  omittedCount: number;
  text: string; // final compact context, ready for prompt insertion
}

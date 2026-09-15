// Structured mutation API for neural memory, plus a deterministic
// ephemeral-vs-persistent gate. V1 deliberately uses explicit rules instead
// of any classification model — see architecture notes, section 12.

import type { Database } from "bun:sqlite";
import type { Memory, MemoryRelationTargetType, MemoryStatus, MemoryType } from "../core/types";
import { MEMORY_STATUSES, MEMORY_TYPES } from "../core/types";
import { MemoryRepository } from "./memoryRepository";
import { normalizeMemoryId } from "../util/ids";

function assertValidImportance(importance: number): void {
  if (typeof importance !== "number" || !Number.isFinite(importance) || !Number.isInteger(importance)) {
    throw new Error(`importance must be an integer between 1 and 5 (got ${JSON.stringify(importance)})`);
  }
  if (importance < 1 || importance > 5) {
    throw new Error(`importance must be between 1 and 5 (got ${importance})`);
  }
}

/**
 * Deterministic rules for what should NOT become permanent memory.
 * Kept intentionally simple and explicit (no ML/heuristic scoring in V1).
 */
const EPHEMERAL_PATTERNS: RegExp[] = [
  /^\s*(ls|pwd|cd|cat|echo)\b/i, // raw shell/command output
  /^\s*pid[:=]\s*\d+/i, // process ids
  /^\s*(debug|trace)[:=]/i, // temporary debug output
];

export interface PersistenceCheck {
  allowed: boolean;
  reason?: string;
}

export function checkPersistable(content: string): PersistenceCheck {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { allowed: false, reason: "empty content" };
  }
  if (trimmed.length < 8) {
    return { allowed: false, reason: "too short to be meaningful knowledge" };
  }
  for (const pattern of EPHEMERAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `matches ephemeral pattern: ${pattern}` };
    }
  }
  return { allowed: true };
}

export class MemoryService {
  private readonly repo: MemoryRepository;

  constructor(db: Database) {
    this.repo = new MemoryRepository(db);
  }

  add(input: {
    type: MemoryType;
    content: string;
    importance?: number;
    source?: string | null;
  }): Memory {
    if (!MEMORY_TYPES.includes(input.type)) {
      throw new Error(`invalid memory type "${input.type}" — valid types: ${MEMORY_TYPES.join(", ")}`);
    }
    const check = checkPersistable(input.content);
    if (!check.allowed) {
      throw new Error(`Refusing to persist ephemeral content: ${check.reason}`);
    }
    if (input.importance !== undefined) {
      assertValidImportance(input.importance);
    }
    return this.repo.create(input);
  }

  get(id: string): Memory | null {
    return this.repo.get(normalizeMemoryId(id));
  }

  list(filter?: { type?: MemoryType; status?: MemoryStatus }): Memory[] {
    return this.repo.list(filter);
  }

  update(id: string, changes: Partial<Pick<Memory, "content" | "importance" | "status" | "source">>): Memory {
    if (changes.status !== undefined && !MEMORY_STATUSES.includes(changes.status)) {
      throw new Error(`invalid status "${changes.status}" — valid statuses: ${MEMORY_STATUSES.join(", ")}`);
    }
    if (changes.importance !== undefined) {
      assertValidImportance(changes.importance);
    }
    return this.repo.update(normalizeMemoryId(id), changes);
  }

  remove(id: string): boolean {
    return this.repo.remove(normalizeMemoryId(id));
  }

  linkToMemory(memoryId: string, relation: string, targetMemoryId: string) {
    return this.repo.addRelationship(normalizeMemoryId(memoryId), relation, "memory", normalizeMemoryId(targetMemoryId));
  }

  linkToMapEntity(memoryId: string, relation: string, mapEntityId: string) {
    return this.repo.addRelationship(normalizeMemoryId(memoryId), relation, "map_entity", mapEntityId);
  }

  relationships(memoryId: string) {
    return this.repo.listRelationships(normalizeMemoryId(memoryId));
  }
}

// Global neural memory service — same API as MemoryService but operates
// on the global database (~/.neural-ai/neural-memory.db) instead of the
// project-local database.

import type { Database } from "bun:sqlite";
import type { Memory, MemoryRelationTargetType, MemoryStatus, MemoryType } from "../core/types";
import { MemoryService, checkPersistable, type PersistenceCheck } from "./memoryService";

export { checkPersistable, type PersistenceCheck };

export class GlobalMemoryService extends MemoryService {
  constructor(db: Database) {
    super(db);
  }
}
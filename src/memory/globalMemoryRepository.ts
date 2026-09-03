// Global neural memory repository — same API as MemoryRepository but operates
// on the global database (~/.neural-ai/neural-memory.db) instead of the
// project-local database.

import type { Database } from "bun:sqlite";
import { MemoryRepository } from "./memoryRepository";

export class GlobalMemoryRepository extends MemoryRepository {
  constructor(db: Database) {
    super(db);
  }
}
// Global database path resolution.
// The global neural memory lives at ~/.neural-ai/neural-memory.db
// and is shared across all projects for the current user.

import { homedir } from "node:os";
import { join } from "node:path";

const GLOBAL_DIR_NAME = ".neural-ai";
const GLOBAL_DB_NAME = "neural-memory.db";

export function getGlobalDbPath(): string {
  return join(homedir(), GLOBAL_DIR_NAME, GLOBAL_DB_NAME);
}

export function getGlobalDirPath(): string {
  return join(homedir(), GLOBAL_DIR_NAME);
}
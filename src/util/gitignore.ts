// Ensures the neural-ai database files are git-ignored, without ever
// clobbering a pre-existing .gitignore.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MARKER = "# neural-ai (do not commit local knowledge database)";
const RULES = [".neural-map/*.db", ".neural-map/*.db-wal", ".neural-map/*.db-shm"];

/**
 * Adds neural-ai ignore rules to <projectRoot>/.gitignore.
 * - Preserves existing content.
 * - Adds the marker + rules only if the marker isn't already present.
 * - Never duplicates entries on repeated `neural init` runs.
 */
export function ensureGitignore(projectRoot: string): { updated: boolean; path: string } {
  const path = join(projectRoot, ".gitignore");
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";

  if (existing.includes(MARKER)) {
    return { updated: false, path };
  }

  const block = [MARKER, ...RULES].join("\n");
  const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
  const separator = existing.length > 0 ? (needsLeadingNewline ? "\n\n" : "\n") : "";
  const next = existing + separator + block + "\n";

  writeFileSync(path, next, "utf-8");
  return { updated: true, path };
}

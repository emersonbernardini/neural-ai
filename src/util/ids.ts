// ID and timestamp helpers. Map entity ids are stable logical slugs supplied
// by the caller (e.g. "auth-module") — they are NOT generated here, since
// their whole purpose is to be a human-chosen identity independent of paths.

export function newMemoryId(): string {
  return `mem_${crypto.randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/** Validates that a map entity id looks like a stable logical slug, not a path. */
export function assertValidEntityId(id: string): void {
  if (id.includes("/") || id.includes("\\")) {
    throw new Error(
      `Invalid entity id "${id}": entity ids must be stable logical identifiers, not file paths.`
    );
  }
  if (!SLUG_RE.test(id)) {
    throw new Error(
      `Invalid entity id "${id}": use lowercase letters, digits and hyphens (e.g. "auth-module").`
    );
  }
}

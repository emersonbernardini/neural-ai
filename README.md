# neural-ai

Local-first project knowledge & memory system for coding agents.

**Website:** https://nmap-ai.netlify.app  
**Repository:** https://github.com/emersonbernardini/neural-ai

Two independent, complementary ledgers:

- **`.neural-map`** — the *current* structural state of a project (modules, components,
  relationships, architecture, constraints).
- **`.neural-memory`** — the *historical* knowledge accumulated while working on a project
  (decisions, discoveries, bugs, solutions, lessons) as discrete knowledge units, not a
  conversation transcript.

V1 stores both under a single SQLite database at `<project>/.neural-map/neural.db` (WAL mode).
The map and memory tables are logically independent — neither mutates the other automatically.

## Requirements

- [Bun](https://bun.sh) (uses `bun:sqlite` — no external SQLite driver)

## Install

### Option 1: Binary (recommended — no Bun required at runtime)

```bash
# Download latest release from GitHub Releases
# Or build from source (see below)
```

### Option 2: From source (requires Bun)

```bash
git clone https://github.com/emersonbernardini/neural-ai.git
cd neural-ai
bun install
bun run build          # compiles to ./dist/neural (standalone binary)
./dist/neural init       # test it works
sudo mv ./dist/neural /usr/local/bin/neural  # install globally (optional)
```

### Option 3: bun link (development)

```bash
git clone https://github.com/emersonbernardini/neural-ai.git
cd neural-ai
bun install
bun link               # makes `neural` available globally
```

## Quick Start

```bash
cd your-project
neural init

# Register project structure
neural map add-module auth-module src/auth
neural map add-relationship auth-module user-module depends-on
neural map set-architecture "clean architecture"
neural map show

# Record knowledge (local to this project)
neural memory add decision "Auth uses JWT stateless"
neural memory add bug "Race condition on concurrent login"

# Record reusable knowledge (global, shared across projects)
neural memory add --global lesson "Always validate input at boundary"
neural memory add --global preference "Conventional commits: feat/fix/chore"

# Search across both ledgers
neural search "JWT"
neural search "validate input"

# Get stats
neural stats
```

## CLI Reference

```bash
# Project initialization
neural init                           # creates .neural-map/, .gitignore, AGENTS.md

# Map commands (project structure)
neural map add-module <id> <path>
neural map add-entity <id> <type> <name> [path]
neural map add-relationship <from> <to> <type>    # depends-on | part-of | implements | related-to
neural map set-architecture "<description>"
neural map set-constraint "<rule>"
neural map remove-entity <id>
neural map show

# Memory commands (knowledge)
neural memory [--global] add <type> "<content>"   # type: decision|discovery|solution|bug|lesson|architecture|change|constraint|unresolved
neural memory [--global] list [type]
neural memory [--global] show <id>
neural memory [--global] update <id> <field> <value>  # field: importance|status|content
neural memory [--global] delete <id>

# Search (queries both local + global)
neural search "<query>"

# Stats
neural stats
```

## Architecture

```
src/
  core/types.ts           domain models shared across the system
  db/database.ts          single place that opens connections & sets pragmas (WAL, synchronous=NORMAL)
  db/migrate.ts           deterministic migration runner (PRAGMA user_version)
  db/migrations/          versioned .sql files, never edited after release
  map/mapRepository.ts    raw CRUD for map_* tables
  map/mapService.ts       structured mutation API (add-module, set-architecture, ...)
  memory/memoryRepository.ts  raw CRUD for memories / memory_relationships
  memory/memoryService.ts     structured API + deterministic ephemeral-vs-persistent gate
  retrieval/search.ts     FTS5-backed search, normalized bm25 ranking
  context/contextBuilder.ts   relevance -> importance -> recency ranking under a character budget
  cli/                    thin dispatcher over the services above
```

## Database Schema (V1)

- `map_entities`, `map_relationships`, `map_constraints`, `map_meta`
- `memories`, `memory_relationships`, `memories_fts` (FTS5, kept in sync via triggers)

Map entities use stable logical ids (e.g. `auth-module`) as their identity — file paths are
stored as metadata only, so a later refactor that moves a file does not orphan historical
knowledge.

## Context Budget

`ContextBuilder.build(query, { budget })` defaults to `maxCharacters: 4000`. Entries are ranked
deterministically (relevance → importance → recency) and truncated to never exceed the budget;
omitted entries are counted, not silently dropped.

## Programmatic Usage (for agents)

```typescript
import { ContextBuilder } from "neural-ai/src/context/contextBuilder";
import { openDatabase, openGlobalDatabase } from "neural-ai/src/db/database";

const db = openDatabase({ path: "./.neural-map/neural.db" });
const globalDb = openGlobalDatabase();

const builder = new ContextBuilder(db, globalDb);
const context = builder.build("your query", { budget: { maxCharacters: 4000 } });

// context.text → ready for prompt injection
// context.entries → structured entries with relevance, importance, recency
// context.omittedCount → how many were left out due to budget
```

## For AI Agents (AGENTS.md)

Run `neural init` in a project — it creates an `AGENTS.md` file with instructions
so any coding agent knows how to use neural-ai automatically.

## Known Limitations (V1)

- No embeddings / vector search — retrieval is FTS5 keyword search only.
- No automatic repository scanning — all map/memory entries are added explicitly via the CLI.
- No automatic synchronization between `.neural-map` and `.neural-memory`.
- Single SQLite file for both ledgers (logically separated by table, not by file).
- `withTransaction`'s busy-retry uses a simple busy-wait loop, adequate for local CLI-scale
  concurrency, not for high write throughput.

## Roadmap

- Optional intelligence layer for memory consolidation / knowledge extraction.
- `neural map reconcile` command to flag entities whose recorded `path` no longer exists.
- Export of `.neural-memory` to human-readable format.
- Web dashboard at https://nmap-ai.netlify.app

## License

MIT
# Dependências entre módulos

status: confirmado

```
cli
 ├─ depende → map          (mapService)
 ├─ depende → memory       (memoryService, globalMemoryService)
 ├─ depende → retrieval    (searchMemories, via search.ts)
 ├─ depende → db           (openDatabase, openGlobalDatabase, no entrypoint)
 └─ depende → util         (ensureGitignore, getGlobalDbPath)

map
 ├─ depende → db           (Database, tipos)
 └─ depende → core         (MapEntity, MapRelationship, ...)

memory (local)
 ├─ depende → db
 └─ depende → core

memory (global)
 ├─ depende → db           (openGlobalDatabase)
 └─ depende → core

retrieval
 ├─ depende → db
 └─ depende → core

context
 ├─ depende → retrieval    (searchMemories)
 ├─ depende → memory       (MemoryRepository + GlobalMemoryRepository, leitura direta)
 └─ depende → core

db
 └─ depende → core (nenhuma, é a camada mais baixa além de core)

util
 └─ sem dependências internas
```

## Consumidores por módulo
- `core`: consumido por todos os outros módulos (tipos compartilhados).
- `db`: consumido por `map`, `memory (local)`, `memory (global)`, `retrieval`, `context` (indireto via memory), `cli`.
- `map`, `memory (local)`, `memory (global)`, `retrieval`: consumidos por `cli` e (retrieval/memory) por `context`.
- `util`: consumido só por `cli` (gitignore, getGlobalDbPath) e internamente por `map`/`memory` (ids).

## Observação de acoplamento
`context/contextBuilder.ts` acessa `MemoryRepository` e `GlobalMemoryRepository` diretamente (não via `MemoryService`) —
é leitura pura, sem passar pelo gate ephemeral/persistente (que só se aplica em escrita).
Isso é intencional, não um bug — mas é o primeiro lugar a checar se o Context um dia passar
a incluir memórias que deveriam ter sido filtradas na escrita.
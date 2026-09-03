# neural-ai — INDEX

Mapa neural persistente do projeto (protocolo MGPP). Não contém código-fonte
completo — é um roteador. Consulte antes de explorar arquivos.

## Arquitetura
→ [architecture.md](./architecture.md)

## Dependências entre módulos
→ [dependencies.md](./dependencies.md)

## Decisões técnicas
→ [decisions.md](./decisions.md)

## Módulos

| Módulo | Caminho | Responsabilidade | Nó |
|---|---|---|---|
| core | `src/core/` | Tipos de domínio compartilhados | [modules/core.md](./modules/core.md) |
| db | `src/db/` | Conexão SQLite, pragmas, migrations (local + global) | [modules/db.md](./modules/db.md) |
| map | `src/map/` | Neural map: repository + service | [modules/map.md](./modules/map.md) |
| memory | `src/memory/` | Neural memory: local + global (repository + service) | [modules/memory.md](./modules/memory.md) |
| retrieval | `src/retrieval/` | Busca FTS5 | [modules/retrieval.md](./modules/retrieval.md) |
| context | `src/context/` | ContextBuilder (budget de caracteres, merge local+global) | [modules/context.md](./modules/context.md) |
| cli | `src/cli/` | Dispatcher e subcomandos (--global flag) | [modules/cli.md](./modules/cli.md) |
| util | `src/util/` | ids, gitignore, globalDb path | [modules/util.md](./modules/util.md) |

## Testes
`tests/` espelha os módulos 1:1 (`db.test.ts`, `map.test.ts`, `memory.test.ts`,
`search.test.ts`, `context.test.ts`, `init.test.ts`). Status atual: 34/34 passando
(confirmado por execução real do usuário via `bun test`, ver `changes/0001-*.md`).

## Áreas recentemente modificadas
- `src/cli/commands/init.ts` — `neural init` agora cria AGENTS.md + adiciona ao .gitignore
- `src/memory/globalMemory*.ts` — memory global (repository + service)
- `src/util/globalDb.ts` — path resolution para DB global (~/.neural-ai)
- `src/db/migrations/global/0002_global_memory.sql` — migração dedicada global
- `src/cli/commands/memory.ts` — flag --global
- `src/cli/commands/search.ts` — busca merge local+global
- `src/context/contextBuilder.ts` — merge local+global no contexto
- `tests/init.test.ts` — regex de asserção corrigida (falso positivo, não bug de produção). Ver `changes/0001-*.md`.

## Fora de escopo em V1 (não procurar/implementar sem discutir antes)
Embeddings, vector search, agentes autônomos, sync com a nuvem, web UI, workers em
background, análise automática de repositório, coordenação multi-agente, sincronização
automática entre `.neural-map` e `.neural-memory`.
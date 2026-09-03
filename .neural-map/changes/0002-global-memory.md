Módulo: memory (transversal — db, cli, context, util)

Mudança:
Implementação da Memória Global Persistente (~/.neural-ai/neural-memory.db) — segundo ledger da visão original (neural-ai.md:9-10). O projeto agora tem dois ledgers independentes:
- Local: <project>/.neural-map/neural.db (map + memory do projeto atual)
- Global: ~/.neural-ai/neural-memory.db (memory compartilhada entre todos os projetos)

Por quê:
Visão original (neural-ai.md) define dois mapas neurais: "Mapa Persistente → memória geral entre chats" e "Mapa Local do Projeto". A implementação anterior só tinha o local. Esta change entrega o global.

Nós afetados:
- memory: + globalMemoryRepository.ts, globalMemoryService.ts (wrappers reusando lógica local)
- db: + openGlobalDatabase(), runGlobalMigrations(), migrations/global/0002_global_memory.sql
- util: + globalDb.ts (getGlobalDbPath, getGlobalDirPath)
- cli: index.ts (abre ambos DBs), commands/memory.ts (--global flag), commands/search.ts (merge local+global)
- context: ContextBuilder agora aceita globalDb opcional e faz merge de resultados

Relações registradas:
dependencies.md atualizado — memory agora tem duas variantes (local/global), ambas dependem de db + core.
context agora depende de MemoryRepository + GlobalMemoryRepository.
cli depende de openGlobalDatabase e getGlobalDbPath.

Arquivos:
- src/util/globalDb.ts (novo)
- src/db/migrations/global/0002_global_memory.sql (novo)
- src/memory/globalMemoryRepository.ts (novo)
- src/memory/globalMemoryService.ts (novo)
- src/db/database.ts (openGlobalDatabase, runGlobalMigrations)
- src/db/migrate.ts (runGlobalMigrations, loadMigrations parametrizado)
- src/cli/index.ts (abre globalDb, passa para comandos)
- src/cli/commands/memory.ts (--global flag)
- src/cli/commands/search.ts (merge local+global)
- src/context/contextBuilder.ts (merge local+global no build)
- .neural-map/INDEX.md (atualizado)
- .neural-map/dependencies.md (atualizado)
- .neural-map/modules/memory.md (atualizado)
- .neural-map/modules/db.md (atualizado)
- .neural-map/modules/cli.md (atualizado)
- .neural-map/modules/context.md (atualizado)
- .neural-map/modules/util.md (atualizado)

Impacto futuro esperado:
- Agentes podem consultar/registrar conhecimento global (padrões reutilizáveis, preferências, lições cross-projeto)
- ContextBuilder injeta tanto memórias locais quanto globais no prompt (ranking unificado)
- Próximo passo natural: camada de inteligência para consolidação (promoção local→global, dedup, síntese)
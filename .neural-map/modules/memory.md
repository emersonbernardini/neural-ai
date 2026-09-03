[NÓ]
caminho: src/memory/
responsabilidade: conhecimento histórico (memórias, relacionamentos memory↔memory e memory↔map_entity)
arquivos:
  - memoryRepository.ts — CRUD SQL puro sobre memories/memory_relationships (FTS sincronizado por trigger)
  - memoryService.ts — API estruturada (add, update, remove, linkToMemory, linkToMapEntity) +
    checkPersistable() (gate ephemeral-vs-persistente, regex determinístico)
  - globalMemoryRepository.ts — wrapper sobre MemoryRepository para DB global (~/.neural-ai/neural-memory.db)
  - globalMemoryService.ts — wrapper sobre MemoryService para DB global
exports: MemoryService, MemoryRepository, GlobalMemoryService, GlobalMemoryRepository, checkPersistable
depende_de: db, core
usado_por: cli/commands/memory.ts, context/contextBuilder.ts (leitura direta via MemoryRepository/GlobalMemoryRepository)
invariantes:
  - importance sempre 1..5 (validado em MemoryService.add)
  - conteúdo vazio, curto (<8 chars) ou "ephemeral" (ls/pwd/pid/debug output) é rejeitado
  - DB global só tem tabelas de memory (sem map_*), migração dedicada em db/migrations/global/
status: confirmado
revisão: global memory adicionado (migração 0002, arquivos globalMemory*)
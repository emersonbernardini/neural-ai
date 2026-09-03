[NÓ]
caminho: src/db/
responsabilidade: única camada autorizada a abrir Database e setar pragmas SQLite; migrations (local + global)
arquivos:
  - database.ts — openDatabase(), openGlobalDatabase(), withTransaction() (retry em SQLITE_BUSY/LOCKED)
  - migrate.ts — runMigrations(), runGlobalMigrations() via PRAGMA user_version
  - migrations/0001_init.sql — schema completo local (map_* + memories + memories_fts + triggers)
  - migrations/global/0002_global_memory.sql — schema global (somente memories + memories_fts + triggers)
exports: openDatabase, openGlobalDatabase, withTransaction, runMigrations, runGlobalMigrations
depende_de: core (tipos, indireto), util (getGlobalDbPath)
usado_por: map, memory (local), memory (global), retrieval, context (indireto via memory), cli (entrypoint)
invariantes:
  - WAL sempre ligado; synchronous=NORMAL é o default (configurável em DbConfig)
  - migrations nunca são editadas após release — só novas migrations
  - DB global em ~/.neural-ai/neural-memory.db (não versionado, compartilhado entre projetos)
status: confirmado
revisão: openGlobalDatabase, runGlobalMigrations, migração global adicionados
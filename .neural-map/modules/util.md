[NÓ]
caminho: src/util/
responsabilidade: helpers sem estado — ids/timestamps, integração segura com .gitignore, path global DB
arquivos:
  - ids.ts — newMemoryId(), nowIso(), assertValidEntityId() (slug, sem "/" ou "\\")
  - gitignore.ts — ensureGitignore(projectRoot): preserva conteúdo, evita duplicata (marcador único)
  - globalDb.ts — getGlobalDbPath(), getGlobalDirPath() (~/.neural-ai/neural-memory.db)
exports: newMemoryId, nowIso, assertValidEntityId, ensureGitignore, getGlobalDbPath, getGlobalDirPath
depende_de: (nenhum módulo interno)
usado_por: map (assertValidEntityId), memory (newMemoryId/nowIso), cli/commands/init.ts (ensureGitignore), db (openGlobalDatabase)
status: confirmado
revisão: globalDb.ts adicionado
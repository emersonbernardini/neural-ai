[NÓ]
caminho: src/cli/
responsabilidade: interface de linha de comando — parsing de argv, dispatch, formatação de output
arquivos:
  - index.ts — entrypoint (#!/usr/bin/env bun), abre DB local + global, dispatch
  - commands/init.ts — `neural init` (cria .neural-map/, .gitignore, AGENTS.md)
  - commands/map.ts — `neural map add-module|add-entity|add-relationship|set-architecture|set-constraint|remove-entity|show`
  - commands/memory.ts — `neural memory [--global] add|list|show|update|delete`
  - commands/search.ts — `neural search "<query>"` (merge local+global)
  - commands/stats.ts — `neural stats`
exports: (bin, não é importado por outros módulos)
depende_de: db, map, memory (local + global), retrieval, util
usado_por: (ponto de entrada — ninguém depende dele)
status: confirmado
revisão: --global flag, busca merge, abre DB global no entrypoint, init cria AGENTS.md
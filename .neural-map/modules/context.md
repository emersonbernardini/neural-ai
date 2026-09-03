[NÓ]
caminho: src/context/contextBuilder.ts
responsabilidade: construir contexto compacto e determinístico para inserção em prompt de agente (merge local+global)
exports: ContextBuilder (build(query, {budget}))
depende_de: retrieval (searchMemories), memory (MemoryRepository + GlobalMemoryRepository, leitura direta), core
invariantes:
  - só inclui memórias com status "active"
  - ordenação determinística: relevância desc → importância desc → recência desc
  - budget default 4000 caracteres; nunca excede o configurado; omitidos são contados (omittedCount)
  - busca e merge de memórias locais (projeto) + globais (usuário)
status: confirmado
revisão: merge local+global adicionado
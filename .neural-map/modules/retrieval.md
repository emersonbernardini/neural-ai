[NÓ]
caminho: src/retrieval/search.ts
responsabilidade: busca full-text sobre memórias via FTS5, com ranking normalizado
exports: searchMemories(db, query, opts)
depende_de: db (schema memories_fts), core (SearchHit)
usado_por: cli/commands/search.ts, context/contextBuilder.ts
invariantes:
  - query é escapada token-a-token antes do MATCH (evita quebra de sintaxe FTS5)
  - score sempre normalizado em [0,1], onde 1 = mais relevante (bm25 é invertido)
status: confirmado
revisão: bootstrap inicial

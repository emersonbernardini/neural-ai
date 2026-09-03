# Decisões

status: confirmado (registradas durante a implementação inicial)

## Decisão: um único arquivo SQLite para map + memory
Motivo: simplicidade em V1; as duas continuam logicamente independentes (tabelas separadas,
nenhum trigger cruzado). Alternativa rejeitada: dois arquivos `.db` separados — adiado para
não overengenheirar antes de existir um consumidor real da separação física.

## Decisão: ids de entidade são slugs, não paths
Motivo: um refactor que move um arquivo não pode invalidar conhecimento histórico. Path vira
metadado (`map_entities.path`), nunca a chave primária.

## Decisão: FTS5 + bm25 normalizado, sem embeddings
Motivo: escopo explícito de V1 exclui vector search. bm25 é convertido para uma escala 0–1
("maior = mais relevante") para a camada de retrieval não vazar a métrica interna do SQLite
pros consumidores (context builder, CLI).

## Decisão: gate ephemeral-vs-persistente é regex determinístico
Motivo: item 12 da spec original pede regras explícitas, não classificação por IA, em V1.
Localização: `memory/memoryService.ts::checkPersistable`.

## Decisão: `.gitignore` do usuário nunca é sobrescrito
Motivo: requisito explícito (spec original, seção 20) — `ensureGitignore` detecta, preserva
conteúdo existente, adiciona só se ausente, nunca duplica (via marcador `MARKER`).

## Decisão: budget do ContextBuilder é caractere, não token
Motivo: tokenizers de LLM externos estão fora do escopo de V1 (spec original, seção 17).
Default documentado: 4000 caracteres.

## Decisão (MGPP): `.neural-map/` do próprio repo não é versionado
Motivo: protocolo MGPP, Parte 27 — mapa é estado operacional do agente, não deve poluir
commits/PRs. Ver `changes/0001-mgpp-bootstrap.md` para a atualização de `.gitignore` aplicada.

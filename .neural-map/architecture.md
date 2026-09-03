# Arquitetura

status: confirmado (autoria própria, não inferido)

## Stack
Bun + TypeScript, `bun:sqlite` (sem driver externo), SQLite FTS5, WAL + `synchronous=NORMAL`.
Sem dependências externas de runtime.

## Padrão
Camadas: `cli` → `service` → `repository` → `db`.
- `cli/commands/*` só faz parsing de argv e formatação de output — não tem lógica de domínio.
- `*Service` (mapService, memoryService) contém as regras (validação de id, gate ephemeral/persistente,
  checagem de relacionamentos).
- `*Repository` (mapRepository, memoryRepository) é SQL puro, sem regra de negócio.
- `db/database.ts` é o único lugar autorizado a abrir `Database` ou setar pragmas.

## Persistência
Um único arquivo SQLite (`<project>/.neural-map/neural.db`) guarda as tabelas de
`.neural-map` e `.neural-memory` — separadas logicamente por tabela, não por arquivo físico.
As duas ficam como ledgers independentes: nenhuma escreve na outra automaticamente (V1).

## Retrieval / Context
`retrieval/search.ts` faz FTS5 + bm25 normalizado (0–1). `context/contextBuilder.ts` consome
isso, ordena por relevância → importância → recência, e corta por orçamento de caracteres
(default 4000) sem nunca estourar o limite — entradas descartadas são contadas, não silenciadas.

## Identidade estável
Entidades do map usam id lógico estável (slug, ex: `auth-module`), nunca o path como identidade.
Path é só metadado. Validado em `util/ids.ts::assertValidEntityId`.

## Migrations
`PRAGMA user_version` + arquivos `.sql` versionados em `db/migrations/`, aplicados em ordem,
nunca editados após release (`db/migrate.ts`).

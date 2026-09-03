Módulo: (transversal — mapa MGPP)

Mudança:
Bootstrap do `.neural-map/` markdown (INDEX.md, architecture.md, dependencies.md,
decisions.md, modules/*.md) para o próprio repositório neural-ai, seguindo o protocolo MGPP.

Por quê:
Ativação do protocolo MGPP nesta sessão. O mapa passa a ser obrigatório após o primeiro
mapeamento — este é esse primeiro mapeamento.

Nós afetados:
Todos os módulos (core, db, map, memory, retrieval, context, cli, util) — criação inicial.

Relações registradas:
Grafo de dependências completo em dependencies.md (cli → {map, memory, retrieval, util};
map/memory/retrieval → db; context → retrieval + memory; todos → core).

Arquivos:
- .neural-map/INDEX.md (novo)
- .neural-map/architecture.md (novo)
- .neural-map/dependencies.md (novo)
- .neural-map/decisions.md (novo)
- .neural-map/modules/*.md (novo, 8 arquivos)
- .neural-map/changes/0001-mgpp-bootstrap.md (este arquivo)
- .gitignore (atualizado — ver nota abaixo)

Nota adicional (mesma sessão, anterior ao bootstrap):
`tests/init.test.ts` tinha uma asserção com regex frouxo demais
(`/\.neural-map\/\*\.db\b/g`) que também casava `.db-wal` e `.db-shm`, gerando falso
positivo de "duplicata" (3 matches em vez de 1). Corrigido para
`/^\.neural-map\/\*\.db$/gm`. Não era bug de produção — `ensureGitignore()` sempre
funcionou corretamente (confirmado por `updated === false` e conteúdo inalterado no
mesmo teste). Resultado: 34/34 testes passando, confirmado por execução real do
usuário via `bun test`.

Impacto futuro esperado:
Sessões futuras devem consultar INDEX.md antes de explorar `src/` — não reler módulos
sem gatilho de invalidação (arquivo criado/removido/renomeado, dependência mudou,
teste contradiz o mapa).

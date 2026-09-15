import type { Database } from "bun:sqlite";
import { ensureGitignore } from "../../util/gitignore";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface InitResult {
  dbPath: string;
  gitignoreUpdated: boolean;
  agentsCreated: boolean;
}

const AGENTS_MD = `# Instruções para Agentes — neural-ai

Este projeto usa **neural-ai** para memória persistente entre sessões de um agente
de código. Este documento é a referência completa: leia-o inteiro uma vez e
depois use-o como consulta. O objetivo é que você nunca precise adivinhar
sintaxe ou descobrir por tentativa e erro — todo comando, todo campo válido e
todo comportamento de borda está documentado aqui.

## Conceito: dois ledgers independentes

- **\`.neural-map\`** — o estado **atual** e estrutural do projeto: módulos,
  componentes, relacionamentos entre eles, arquitetura, constraints. Não é
  histórico — é uma foto de "como o projeto é agora". Comandos: \`neural map ...\`.
- **\`.neural-memory\`** — o conhecimento **histórico** acumulado enquanto se
  trabalha no projeto: decisões, descobertas, bugs, soluções, lições. Cada
  entrada é uma unidade de conhecimento discreta, não uma transcrição de
  conversa. Comandos: \`neural memory ...\`.

Os dois são logicamente independentes: nada em um altera o outro
automaticamente. Tudo fica em SQLite (WAL) em \`.neural-map/neural.db\`
(local) e \`~/.neural-ai/neural-memory.db\` (global, compartilhado entre
projetos). Ambos os arquivos de banco já estão no \`.gitignore\` — não commite.

## Rotina obrigatória no início de cada sessão

\`\`\`bash
neural map show
neural search "<tópico da task atual>"
\`\`\`

Isso carrega o estado estrutural do projeto e qualquer conhecimento (local
+ global) relevante para o que você está prestes a fazer, antes de tocar em
qualquer código.

## Referência completa de comandos

### \`neural init\`
Inicializa o projeto: cria/migra o banco local, garante entradas no
\`.gitignore\` e cria este AGENTS.md se ainda não existir. Idempotente — pode
rodar de novo sem duplicar nada.

### \`neural map <subcomando> ...\`
Mutação estruturada do mapa do projeto. Não existe um \`neural map update
"<texto livre>"\` genérico — cada aspecto do mapa tem seu próprio comando.

| Subcomando | Uso | Notas |
|---|---|---|
| \`add-module\` | \`neural map add-module <id> <path> [name]\` | atalho para uma entity do tipo \`module\` |
| \`add-entity\` | \`neural map add-entity <id> <type> [path] [name]\` | \`type\`: \`module\` \\| \`component\` \\| \`domain-entity\` \\| \`subsystem\` |
| \`add-relationship\` | \`neural map add-relationship <from> <to> <type>\` | \`type\`: \`depends-on\` \\| \`part-of\` \\| \`implements\` \\| \`related-to\`. Ambas as entities precisam existir antes. |
| \`remove-entity\` | \`neural map remove-entity <id>\` | remove a entity **e** qualquer relationship que a referencie (cleanup automático) |
| \`set-architecture\` | \`neural map set-architecture <pattern>\` | define/sobrescreve a nota de arquitetura do projeto |
| \`clear-architecture\` | \`neural map clear-architecture\` | remove a nota de arquitetura por completo (para "resetar" em vez de sobrescrever com string vazia) |
| \`set-constraint\` | \`neural map set-constraint <description>\` | adiciona uma constraint; o comando retorna o id numérico dela |
| \`remove-constraint\` | \`neural map remove-constraint <id>\` | remove pelo id numérico mostrado em \`neural map show\` |
| \`show\` (padrão) | \`neural map show\` ou apenas \`neural map\` | imprime arquitetura, entities e constraints (com seus ids) |
| \`help\` | \`neural map help\` (ou \`--help\`/\`-h\`) | imprime esta mesma tabela resumida no terminal |

**IDs de entity** são slugs lógicos estáveis escolhidos por você (ex.:
\`auth-module\`), nunca gerados automaticamente e nunca um caminho de arquivo.
Regra: apenas letras minúsculas, dígitos e hífen, sem \`/\` ou \`\\\`. O campo
\`path\` é só metadado (pode mudar quando o arquivo se move; o \`id\` não muda).

### \`neural memory [--global] <subcomando> ...\`
Mutação estruturada do conhecimento histórico. Sem a flag \`--global\`, opera
no banco local do projeto; com ela, opera no banco global (compartilhado
entre todos os projetos do usuário).

| Subcomando | Uso | Notas |
|---|---|---|
| \`add\` | \`neural memory add [--global] <type> "<content>"\` | \`type\`: \`discovery\` \\| \`decision\` \\| \`solution\` \\| \`bug\` \\| \`constraint\` \\| \`architecture\` \\| \`change\` \\| \`lesson\` \\| \`unresolved\` |
| \`list\` | \`neural memory list [--global] [type]\` | \`type\` opcional filtra pelo mesmo enum acima |
| \`show\` | \`neural memory show [--global] <id>\` | mostra o conteúdo completo e as relationships da memória |
| \`update\` | \`neural memory update [--global] <id> <field> <value>\` | \`field\`: \`content\` \\| \`importance\` \\| \`status\`. \`type\` **não** é editável (é fixo na criação). |
| \`delete\` | \`neural memory delete [--global] <id>\` | remoção definitiva |
| \`help\` | \`neural memory help\` (ou \`--help\`/\`-h\`) | imprime esta mesma tabela resumida no terminal |

- \`importance\`: inteiro de 1 (baixa) a 5 (crítica). \`add\` rejeita valores
  fora dessa faixa.
- \`status\`: \`active\` \\| \`superseded\` \\| \`resolved\`.
- **IDs de memória** aceitam as duas formas: o \`mem_<uuid>\` completo mostrado
  por \`list\`/\`add\`, ou apenas a parte \`<uuid>\` sem o prefixo — ambas
  resolvem para a mesma memória em \`show\`/\`update\`/\`delete\`.

**Filtro de conteúdo efêmero:** \`add\` recusa conteúdo que não pareça
conhecimento persistente de verdade — string vazia, menos de 8 caracteres, ou
que combine com padrões de saída de shell/debug (ex.: começa com \`ls\`,
\`pwd\`, \`cd\`, \`cat\`, \`echo\`, \`pid:\`, \`debug:\`, \`trace:\`). Se você receber
"Refusing to persist ephemeral content", reescreva o conteúdo como uma frase
de conhecimento (ex.: em vez de \`echo $PID\`, registre "processo do worker
trava com PID reaproveitado após restart").

### \`neural search ["<query>"]\`
Busca full-text (FTS5 + bm25) sobre o conteúdo das memórias (local **e**
global simultaneamente), **e** busca simples (LIKE, case-insensitive) sobre o
mapa local: nomes/paths de entities, relationships, constraints e a nota de
arquitetura. Os resultados de ambas as fontes vêm juntos, ordenados por
relevância, marcados com o scope (\`[local]\`/\`[global]\`).

- \`neural search "jwt"\` → memórias e itens do mapa que mencionem "jwt".
- \`neural search\` (sem argumento, ou \`""\`) → **não é erro**: lista todas as
  memórias (local + global), da mais recente para a mais antiga — útil como
  atalho para "o que existe até agora".
- Se quiser só as memórias locais paginadas por tipo, prefira
  \`neural memory list <type>\`; \`search\` sempre cruza os dois ledgers.

### \`neural stats\`
Contagens rápidas: entities do mapa, relationships, constraints, memórias
totais e por tipo. Sem argumentos.

## Quando registrar o quê

| Momento | Comando | Exemplo |
|---------|---------|---------|
| Decisão arquitetural | \`neural memory add decision "..."\` | "Auth usa JWT stateless" |
| Bug descoberto | \`neural memory add bug "..."\` | "Race condition no login" |
| Bug corrigido | \`neural memory update <id> status resolved\` | |
| Lição reutilizável entre projetos | \`neural memory add --global lesson "..."\` | "Sempre validar input no boundary" |
| Novo módulo criado | \`neural map add-module <id> <path>\` | \`neural map add-module auth src/auth\` |
| Dependência entre módulos | \`neural map add-relationship a b depends-on\` | |
| Regra que não pode ser violada | \`neural map set-constraint "..."\` | "Nunca fazer chamada de rede síncrona no render" |
| Padrão arquitetural do projeto | \`neural map set-architecture "..."\` | "clean architecture" |
| Módulo removido/refatorado para fora | \`neural map remove-entity <id>\` | também limpa relationships associadas |

## Fluxo de exemplo completo

\`\`\`bash
neural init

# Estruturar o projeto
neural map add-module auth-module src/auth
neural map add-module user-module src/user
neural map add-relationship auth-module user-module depends-on
neural map set-architecture "clean architecture"
neural map set-constraint "Nunca logar tokens em texto puro"
neural map show

# Registrar conhecimento (local a este projeto)
neural memory add decision "Auth usa JWT stateless"
neural memory add bug "Race condition em login concorrente"

# Registrar conhecimento reutilizável (global, entre projetos)
neural memory add --global lesson "Sempre validar input no boundary"

# Consultar depois
neural search "JWT"
neural search "depends-on"
neural search ""            # lista tudo

# Corrigir/depurar
neural memory update mem_abc123 status resolved
neural memory show abc123   # também funciona sem o prefixo mem_
neural map remove-constraint 1
neural map clear-architecture

neural stats
\`\`\`

## Contexto para prompt (uso programático)

Para injetar contexto relevante direto em um prompt de LLM, em vez de rodar
\`neural search\` e colar a saída manualmente:

\`\`\`typescript
import { ContextBuilder } from "neural-ai/src/context/contextBuilder";
import { openDatabase, openGlobalDatabase } from "neural-ai/src/db/database";

const db = openDatabase({ path: "./.neural-map/neural.db" });
const gdb = openGlobalDatabase();
const ctx = new ContextBuilder(db, gdb).build("sua query", { budget: { maxCharacters: 4000 } });
// ctx.text → string já formatada e cabendo no orçamento de caracteres, pronta para o prompt
// ctx.omittedCount → quantas entradas relevantes ficaram de fora por causa do budget
\`\`\`

O \`ContextBuilder\` só busca em **memórias** (não no mapa) e ordena por
relevância → importância → recência, cortando quando o orçamento de
caracteres estoura.

## Erros comuns e como resolver

| Sintoma | Causa | O que fazer |
|---|---|---|
| \`unknown field "text"\` em \`memory update\` | campo inválido | use \`content\`, \`importance\` ou \`status\` (a mensagem de erro já lista os válidos) |
| \`Refusing to persist ephemeral content\` | conteúdo curto demais ou parece saída de comando | reescreva como frase de conhecimento persistente |
| \`Invalid entity id\` | id do mapa com \`/\`, maiúsculas ou caracteres inválidos | use um slug: minúsculas, dígitos, hífen |
| \`memory "..." not found\` | id errado ou memória no outro scope | confira se precisa de \`--global\`; o prefixo \`mem_\` é opcional em ambos os casos |
| dúvida sobre subcomandos disponíveis | — | \`neural map help\` / \`neural memory help\` / \`neural --help\` |
`;

const AGENTS_GITIGNORE_ENTRY = "AGENTS.md";

/**
 * \`neural init\` — initializes the project knowledge system.
 * The database itself is opened by the caller (see cli/index.ts), since
 * opening it is also what triggers migrations to run.
 */
export function runInit(db: Database, projectRoot: string, dbPath: string): InitResult {
  // Touch the connection so callers can confirm the schema is ready.
  db.query("SELECT 1").get();
  const gitignore = ensureGitignore(projectRoot);

  // Create AGENTS.md if it doesn't exist
  const agentsPath = join(projectRoot, "AGENTS.md");
  let agentsCreated = false;
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, AGENTS_MD, "utf-8");
    agentsCreated = true;
  }

  // Also add AGENTS.md to .gitignore if not already there
  const gitignorePath = join(projectRoot, ".gitignore");
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf-8") : "";
  if (!existing.includes(AGENTS_GITIGNORE_ENTRY)) {
    const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
    const separator = existing.length > 0 ? (needsLeadingNewline ? "\n\n" : "\n") : "";
    const next = existing + separator + AGENTS_GITIGNORE_ENTRY + "\n";
    writeFileSync(gitignorePath, next, "utf-8");
  }

  return { dbPath, gitignoreUpdated: gitignore.updated, agentsCreated };
}
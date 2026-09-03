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

Este projeto usa **neural-ai** para memória persistente entre sessões.

## Como funciona
- Dois ledgers: **Local** (este projeto) + **Global** (compartilhado entre projetos)
- CLI: \`neural\` (instalado globalmente via \`bun link\`)

## Rotina obrigatória no início de cada sessão
\`\`\`bash
neural map show
neural search "<tópico da task atual>"
\`\`\`

## Quando registrar
| Momento | Comando | Exemplo |
|---------|---------|---------|
| Decisão arquitetural | \`neural memory add decision "..."\` | "Auth usa JWT stateless" |
| Bug descoberto | \`neural memory add bug "..."\` | "Race condition no login" |
| Lição reutilizável | \`neural memory add --global lesson "..."\` | "Sempre validar input no boundary" |
| Novo módulo | \`neural map add-module <id> <path>\` | \`neural map add-module auth src/auth\` |
| Dependência | \`neural map add-relationship a b depends-on\` | |

## Busca unificada
\`neural search "termo"\` → retorna resultados marcados \`[local]\` ou \`[global]\`, ordenados por relevância.

## Contexto para prompt (programático)
\`\`\`typescript
import { ContextBuilder } from "neural-ai/src/context/contextBuilder";
import { openDatabase, openGlobalDatabase } from "neural-ai/src/db/database";

const db = openDatabase({ path: "./.neural-map/neural.db" });
const gdb = openGlobalDatabase();
const ctx = new ContextBuilder(db, gdb).build("sua query", { budget: { maxCharacters: 4000 } });
// ctx.text → string pronta para injetar no prompt
\`\`\`
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
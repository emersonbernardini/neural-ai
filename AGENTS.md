# Instruções para Agentes — neural-ai

Este projeto usa **neural-ai** para memória persistente entre sessões.

## Como funciona
- Dois ledgers: **Local** (este projeto) + **Global** (compartilhado entre projetos)
- CLI: `neural` (instalado globalmente via `bun link`)

## REGRA ABSOLUTA — Início de Sessão
**SEMPRE execute antes de qualquer tarefa:**
```bash
neural map show
neural search "<tópico da task atual>"
```
Não inicie trabalho sem consultar o mapa neural. O mapa é a fonte primária de navegação — evita leitura desnecessária de arquivos.

## REGRA ABSOLUTA — Carregar Skill MGPP
**SEMPRE carregue a skill mgpp no início da sessão:**
```bash
skill mgpp
```
A skill MGPP define o protocolo de execução obrigatório (mapa → contexto → validação → alteração mínima → teste → atualizar → registrar). Sem ela, o agente não segue o fluxo correto.

Se a skill não estiver instalada na IDE, leia a cópia em `~/.neural-memory/skills/mgpp/SKILL.md` (memória global) ou gere-a na pasta de skills da IDE.

## Quando registrar (obrigatório)
| Momento | Comando | Exemplo |
|---------|---------|---------|
| Decisão arquitetural | `neural memory add decision "..."` | "Auth usa JWT stateless" |
| Bug descoberto | `neural memory add bug "..."` | "Race condition no login" |
| Lição reutilizável | `neural memory add --global lesson "..."` | "Sempre validar input no boundary" |
| Novo módulo | `neural map add-module <id> <path>` | `neural map add-module auth src/auth` |
| Dependência | `neural map add-relationship a b depends-on` | |

## Busca unificada
`neural search "termo"` → retorna resultados `[local]` ou `[global]`, ordenados por relevância.

## Contexto para prompt (programático)
```typescript
import { ContextBuilder } from "neural-ai/src/context/contextBuilder";
import { openDatabase, openGlobalDatabase } from "neural-ai/src/db/database";

const db = openDatabase({ path: "./.neural-map/neural.db" });
const gdb = openGlobalDatabase();
const ctx = new ContextBuilder(db, gdb).build("sua query", { budget: { maxCharacters: 4000 } });
// ctx.text → string pronta para injetar no prompt
```

## Protocolo MGPP — Resumo Executável
Ao receber qualquer tarefa, siga **exatamente** esta pipeline:

```
INTERPRETAR
↓
CONSULTAR MAPA (neural map show / neural search)
↓
LOCALIZAR NÓS RELEVANTES (apenas o necessário)
↓
VALIDAR INFORMAÇÕES CRÍTICAS NO CÓDIGO ATUAL
↓
IMPLEMENTAR MÍNIMO NECESSÁRIO (diff pontual)
↓
TESTAR (typecheck, lint, build, testes)
↓
ATUALIZAR MAPA (neural map add-*, neural memory add)
↓
REGISTRAR ALTERAÇÃO RELEVANTE (change ledger)
```

**NUNCA:**
- Ler todo o projeto sem consultar o mapa primeiro
- Regenerar arquivos completos para ajustes pontuais
- Pular validação (typecheck/build) antes de considerar "pronto"
- Registrar mudança no mapa que não foi realmente aplicada

## Fonte da Verdade (hierarquia)
1. **Código atual** (execução real)
2. **Configuração atual** (package.json, tsconfig, etc.)
3. **Documentação atual** (README, specs, docs/)
4. **Mapa Neural** (índice operacional)
5. **Inferência** (último recurso)

Se houver conflito: confie na fonte mais alta, atualize o mapa, continue só após resolver.

## Validação Obrigatória
Antes de finalizar qualquer alteração de código:
```bash
bun run typecheck   # ou npm run typecheck
bun run lint        # ou npm run lint
bun run build       # ou npm run build
bun test            # se houver testes
```
Falha em qualquer etapa = tarefa incompleta.

## Git — Branch Policy
- **main** = única branch que sobe para GitHub (protegida)
- **develop** = branch de trabalho local
- Commits em develop → PR para main → merge após CI passar
- Não faça push direto para main

## .neural-map/ — Não Versionar
`.neural-map/` é estado operacional local. **NÃO commitar.**
Verifique `.gitignore` contenha `.neural-map/`. Se já rastreado: `git rm -r --cached .neural-map/`.

## Skills Globais — Fallback
Se skill não estiver na IDE (`~/.config/opencode/skills/` ou `~/.agents/skills/`):
1. Leia `~/.neural-memory/skills/<skill>/SKILL.md`
2. Ou gere na pasta de skills da IDE antes de prosseguir
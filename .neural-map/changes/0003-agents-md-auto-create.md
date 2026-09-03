Módulo: cli (init)

Mudança:
`neural init` agora cria automaticamente `AGENTS.md` na raiz do projeto com instruções para agentes, e adiciona `AGENTS.md` ao `.gitignore`.

Por quê:
Reduz atrito de onboarding — o agente lê o `AGENTS.md` ao entrar no projeto e já sabe como usar o neural-ai sem configuração manual.

Nós afetados:
- cli/commands/init.ts — lógica de criação do AGENTS.md e atualização do .gitignore
- cli/index.ts — output atualizado para mostrar status do AGENTS.md

Arquivos:
- src/cli/commands/init.ts (modificado)
- src/cli/index.ts (modificado)
- .neural-map/modules/cli.md (atualizado)
- .neural-map/INDEX.md (atualizado)

Impacto futuro esperado:
- Projetos novos já vêm prontos para agentes
- Menos perguntas "como uso isso?" na primeira sessão
- AGENTS.md pode ser customizado pelo usuário após criação (não sobrescrito)
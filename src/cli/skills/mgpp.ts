export const MGPP_SKILL = `---
name: mgpp
description: Protocolo de otimização de contexto e execução para agentes de IA, usando um mapa neural persistente do projeto, atualização incremental, análise de impacto e alterações mínimas.
---

MGPP — Mapa Neural de Projeto / Maximum Generation Productivity Performance

Protocolo de execução para qualquer tarefa neste projeto. Objetivo: maximizar produtividade, qualidade e precisão reduzindo releitura, exploração redundante, geração desnecessária, contexto desperdiçado e rodadas de esclarecimento.

---

PARTE 1 — Mapa Neural Persistente

1. Princípio fundamental

Trate o projeto como um sistema conectado, não como uma coleção de arquivos independentes.

Antes de modificar qualquer coisa, determine:

- qual parte do sistema é relevante;
- quais módulos participam dela;
- quais dependências e consumidores podem ser afetados;
- quais contratos, tipos, APIs e invariantes estão envolvidos;
- qual é o menor conjunto de arquivos necessário para executar a tarefa com segurança.

Use o mapa neural para localizar informação e o código atual para confirmar a verdade.

Prioridade:

Mapa Neural → contexto relevante → trecho específico → arquivo completo

Nunca leia arquivos indiscriminadamente quando o mapa já permite localizar a informação necessária.

---

PARTE 2 — Bootstrap do Mapa Neural

2. Inicialização

Ao entrar em um projeto, procure primeiro por:

.neural-map/INDEX.md

na raiz do projeto.

Se o mapa existir

1. Leia ".neural-map/INDEX.md".
2. Identifique os domínios e módulos relacionados à tarefa.
3. Consulte somente os nós relevantes.
4. Verifique o código atual apenas quando houver necessidade de validação.
5. Não reconstrua o mapa inteiro.

Se o mapa não existir

1. Explore a estrutura do projeto.
2. Identifique arquitetura, domínios, módulos, arquivos importantes e dependências.
3. Analise pontos de entrada, APIs, persistência, configurações e fluxos relevantes.
4. Construa uma representação compacta das relações.
5. Persista o mapa na raiz em ".neural-map/".
6. Crie primeiro "INDEX.md".
7. Só depois prossiga normalmente com a tarefa.

O mapa persistente é obrigatório após o primeiro mapeamento de um projeto.

---

PARTE 3 — Estrutura Persistente

3. Estrutura padrão

Quando apropriado, utilize:

.neural-map/
├── INDEX.md
├── architecture.md
├── dependencies.md
├── decisions.md
├── modules/
│ ├── <module>.md
│ └── ...
├── flows/
│ ├── <flow>.md
│ └── ...
└── changes/
├── <change>.md
└── ...

Não crie arquivos desnecessários. Projetos pequenos podem utilizar apenas:

.neural-map/
└── INDEX.md

Projetos maiores devem dividir o mapa para evitar que o próprio mapa se transforme em um arquivo grande e caro de consultar.

---

PARTE 4 — INDEX como Roteador

4. INDEX.md

".neural-map/INDEX.md" é a porta de entrada obrigatória do mapa.

Ele deve ser pequeno e permitir localizar rapidamente:

- arquitetura;
- domínios;
- módulos;
- fluxos;
- dependências;
- decisões;
- áreas recentemente modificadas;
- nós potencialmente relevantes para cada tarefa.

O INDEX não deve conter código-fonte completo.

Exemplo conceitual:

Projeto
├── Auth
│ └── modules/auth.md
├── Users
│ └── modules/users.md
├── Billing
│ └── modules/billing.md
├── Fluxos
│ └── flows/payment.md
├── Arquitetura
│ └── architecture.md
└── Decisões
└── decisions.md

O objetivo é:

tarefa
↓
INDEX
↓
nó relevante
↓
arquivo necessário

Não:

tarefa
↓
ler projeto inteiro

---

PARTE 5 — Construção do Mapa

5. Informações a mapear

Durante o mapeamento inicial, identifique quando aplicável:

- arquitetura;
- domínios;
- módulos;
- submódulos;
- arquivos importantes;
- responsabilidades;
- dependências;
- consumidores;
- fluxos de dados;
- APIs;
- interfaces;
- contratos;
- modelos;
- entidades;
- tipos;
- persistência;
- configurações;
- scripts;
- pontos de entrada;
- componentes reutilizáveis;
- padrões arquiteturais;
- convenções;
- decisões técnicas;
- restrições;
- integrações externas;
- pontos críticos;
- possíveis gargalos;
- dívida técnica relevante.

Não documente informação apenas por completude. Priorize informação que reduza futuras explorações.

---

PARTE 6 — Modelo do Mapa

6. Grafo conceitual

Organize o projeto mentalmente como um grafo.

Nó

Pode representar:

- arquivo;
- módulo;
- função;
- classe;
- componente;
- entidade;
- serviço;
- conceito;
- fluxo;
- integração.

Relação

Pode representar:

- importa;
- depende;
- chama;
- implementa;
- estende;
- persiste;
- expõe;
- consome;
- configura;
- pertence a;
- influencia;
- é consumido por.

Metadados

Registre apenas o necessário:

- responsabilidade;
- contratos;
- invariantes;
- dependências;
- consumidores;
- decisões;
- observações;
- status;
- marcador de revisão.

Hierarquia preferencial:

Projeto
→ Domínio
→ Módulo
→ Submódulo
→ Arquivo
→ Símbolo

---

PARTE 7 — Nós Compactos

7. Representação mínima

Não armazene o conteúdo completo dos arquivos.

Sempre que possível, represente um nó assim:

[NÓ]
caminho: src/modules/auth/auth.service.ts
responsabilidade: regras de autenticação
exports: AuthService
depende_de: AuthRepository, TokenService
usado_por: AuthController
status: confirmado
revisão: <marcador>

O mapa deve funcionar como índice, não como cópia do código.

Quanto menor o mapa sem perder capacidade de localização, melhor.

---

PARTE 8 — Fonte da Verdade

8. Hierarquia de confiabilidade

Use:

Código atual

>

Configuração atual

>

Documentação atual

>

Mapa Neural

>

Inferência

>

Suposição

O mapa nunca substitui o código.

Se houver conflito:

1. confie na fonte mais atual;
2. atualize o mapa;
3. continue somente após resolver a divergência quando ela afetar a tarefa.

Nunca invente informações para preencher lacunas.

Classifique informações como:

confirmado
inferido
desconhecido

Se uma decisão importante depender de algo inferido ou desconhecido, confirme no código.

---

PARTE 9 — Invalidação e Drift

9. Gatilhos de revisão

Um nó deve ser revisado quando:

- o usuário informar que a área mudou;
- o arquivo tiver sido criado;
- o arquivo tiver sido removido;
- o arquivo tiver sido renomeado;
- uma alteração alterar sua responsabilidade;
- uma dependência mudar;
- uma API ou contrato mudar;
- um teste ou erro contradizer o mapa;
- uma nova implementação puder ter divergido do mapa;
- uma decisão estrutural depender de informação potencialmente obsoleta.

Fora desses casos, não releia o arquivo simplesmente por precaução.

10. Detecção de drift

Se o código real divergir do mapa:

Código novo
↓
identificar divergência
↓
atualizar mapa
↓
reavaliar dependências
↓
continuar tarefa

Nunca force uma implementação baseada em informação antiga apenas porque ela está registrada no mapa.

---

PARTE 10 — Atualização Incremental

11. Regra de atualização

Nunca reconstrua o mapa inteiro após uma alteração localizada.

Atualize somente:

- nós afetados;
- relações afetadas;
- dependências afetadas;
- decisões afetadas;
- fluxos afetados.

Exemplo:

AuthService mudou

Não implica:

reler e remapear todo o projeto

Pode implicar apenas:

modules/auth.md
dependencies.md
changes/<alteração>.md

---

PARTE 11 — Change Ledger

12. Registro de alterações

Alterações arquiteturais ou relevantes devem gerar um registro compacto em:

.neural-map/changes/

O registro deve responder:

- o que mudou;
- por que mudou;
- quais nós foram afetados;
- quais relações mudaram;
- quais arquivos foram alterados;
- qual impacto futuro é esperado.

Exemplo:

Módulo: auth

Mudança:
AuthService passou a depender de AuthRepository.

Impacto:
AuthController → AuthService → AuthRepository

Arquivos:
src/modules/auth/auth.service.ts
src/modules/auth/auth.repository.ts

Mapa afetado:
modules/auth.md
dependencies.md

Não registre alterações triviais que não possuam valor futuro.

---

PARTE 12 — Livro-razão de Estado

13. Proposto ≠ aplicado

Nunca considere uma alteração aplicada apenas porque ela foi sugerida.

Estados possíveis:

proposto
pendente
aplicado
validado

Uma alteração só pode ser marcada como aplicada após confirmação por:

- execução de ferramenta;
- arquivo efetivamente alterado;
- teste executado;
- compilação;
- typecheck;
- confirmação explícita do usuário;
- outro mecanismo confiável.

Não registre no mapa uma mudança que não foi realmente aplicada.

---

PARTE 13 — Execução de Tarefas

14. Pipeline padrão

Ao receber uma tarefa:

Interpretar
↓
Consultar INDEX
↓
Localizar nós relevantes
↓
Determinar dependências
↓
Ler somente o necessário
↓
Confirmar informações críticas
↓
Implementar
↓
Validar
↓
Atualizar mapa
↓
Registrar alteração relevante

Não explore o projeto sem motivo concreto.

---

PARTE 14 — Análise de Impacto

15. Antes de modificar

Antes de alterar um componente, identifique:

- consumidores;
- dependências;
- contratos;
- interfaces;
- tipos relacionados;
- efeitos colaterais;
- persistência;
- APIs;
- testes;
- configurações;
- pontos de entrada.

Procure especificamente:

- dependências ocultas;
- contratos quebrados;
- imports afetados;
- tipos incompatíveis;
- duplicação;
- acoplamento desnecessário;
- violações arquiteturais;
- efeitos colaterais.

Quanto maior o risco estrutural da alteração, maior deve ser a profundidade da validação.

---

PARTE 15 — Leitura Econômica

16. Estratégia de leitura

Utilize:

Mapa
↓
trecho relevante
↓
arquivo relacionado
↓
arquivo completo somente se necessário

Nunca:

mapear
↓
ler todos os arquivos novamente

Se o mapa já contém a responsabilidade, dependências e interfaces de um módulo, não releia seu conteúdo completo sem um gatilho de invalidação.

---

PARTE 16 — Contexto de Sessão

17. Estado mínimo

Mantenha o contexto de sessão limitado ao que pode afetar decisões futuras:

- arquitetura relevante;
- convenções;
- decisões e motivos;
- restrições;
- estado atual;
- dívida técnica relevante;
- alterações recentes;
- impactos prováveis.

Não repita conteúdo do mapa que já pode ser consultado.

---

PARTE 17 — Diffs e Mudanças Mínimas

18. Regra de alteração mínima

NÃO regenere código que não precisa mudar.

Para ajustes pontuais, aplique somente a alteração necessária.

Formato mínimo:

- código antigo

* código novo

Quando o ambiente permitir aplicação automática, prefira diff unificado real:

--- a/src/modules/exemplo.ts
+++ b/src/modules/exemplo.ts
@@ -10,3 +10,3 @@

- código antigo

* código novo

Preserve o restante do arquivo.

Nunca faça alterações cosméticas ou refatorações não solicitadas apenas porque está trabalhando na mesma área.

---

PARTE 18 — Pacotes e Artefatos

19. Não reempacotar desnecessariamente

Em projetos empacotados:

.zip
.tar
.tar.gz

não reempacote todo o projeto após cada alteração.

Preferência:

mudança pontual → entregar somente arquivos alterados
mudança estrutural → reempacotar quando necessário

Reempacote completamente somente quando:

- houver uma nova entrega significativa;
- múltiplos arquivos mudarem substancialmente;
- a integridade do pacote exigir;
- o usuário solicitar explicitamente.

---

PARTE 19 — Validação

20. Validação barata como oráculo

Quando existir uma ferramenta barata e confiável, prefira executá-la a confiar apenas em raciocínio manual.

Priorize, conforme o projeto:

formatter
→ linter
→ typechecker
→ compilador
→ testes unitários
→ testes de integração

Não execute ferramentas irrelevantes apenas para demonstrar atividade.

O objetivo é maximizar informação obtida por unidade de custo.

---

PARTE 20 — Triagem de Dependências Externas

21. Código próprio vs. terceiros

Antes de corrigir um comportamento aparentemente defeituoso:

1. determine se o problema realmente pertence ao código do projeto;
2. verifique se é comportamento esperado de uma dependência;
3. determine se a versão utilizada possui limitações conhecidas;
4. só então altere o código próprio.

Não tente corrigir localmente um comportamento que pertence legitimamente a uma biblioteca externa.

---

PARTE 21 — Perguntas

22. Ambiguidade

Faça perguntas somente quando a resposta alterar materialmente a implementação.

Se houver várias ambiguidades relevantes:

perguntas relacionadas
↓
uma única rodada

Agrupe perguntas.

Ambiguidade pequena deve ser resolvida com a interpretação mais razoável, declarando a hipótese brevemente quando necessário.

Não desperdice rodadas de contexto com perguntas que podem ser resolvidas pelo código, documentação ou mapa.

---

PARTE 22 — Projetos Grandes

23. Navegação hierárquica

Em projetos grandes, opere no maior nível possível.

Exemplo:

Projeto
↓
Domínio
↓
Módulo
↓
Submódulo
↓
Arquivo
↓
Símbolo

Só desça um nível quando a tarefa exigir.

Se o INDEX identificar corretamente o domínio, não explore outros domínios.

---

PARTE 23 — Economia de Inferência

24. Princípio de custo

O objetivo não é simplesmente reduzir quantidade de texto.

O objetivo é reduzir:

- tokens de entrada;
- tokens de saída;
- arquivos lidos;
- chamadas de ferramentas;
- reconstrução de contexto;
- processamento redundante;
- reanálise;
- geração descartada;
- rodadas de esclarecimento.

Prefira uma operação que produza muita informação relevante com pouco contexto.

---

PARTE 24 — Estratégia de Consulta

25. Consultas direcionadas

Antes de abrir um arquivo, pergunte:

Qual informação estou tentando obter?

Se o mapa já responder, não leia o arquivo.

Se o mapa apontar o arquivo, leia apenas o trecho necessário.

Se o trecho não for suficiente, amplie progressivamente:

nó
→ símbolo
→ trecho
→ arquivo
→ dependências
→ contexto estrutural

A leitura deve crescer conforme a necessidade, não antecipadamente.

---

PARTE 25 — Regra de Segurança

26. Precisão acima de economia

Nunca economize contexto quando isso aumentar significativamente o risco de erro.

Se houver dúvida sobre:

- segurança;
- migração;
- banco de dados;
- concorrência;
- API pública;
- autenticação;
- autorização;
- alterações arquiteturais;
- dados persistentes;
- comportamento crítico;

confirme diretamente no código e nas configurações atuais.

Economia de tokens nunca justifica uma decisão baseada em informação desatualizada.

---

PARTE 26 — Regra Principal

27. Protocolo MGPP

Sempre que possível:

CONSULTAR
↓
LOCALIZAR
↓
VALIDAR
↓
ALTERAR O MÍNIMO
↓
TESTAR
↓
ATUALIZAR
↓
REGISTRAR

Nunca:

LER TUDO
↓
REGENERAR TUDO
↓
REEXPLICAR TUDO

O mapa neural existe para reduzir exploração.

O Change Ledger existe para reduzir reconstrução histórica.

O INDEX existe para reduzir navegação.

Os nós compactos existem para reduzir contexto.

Os diffs existem para reduzir geração.

A validação existe para reduzir raciocínio desnecessário.

A fonte de verdade existe para impedir que economia comprometa precisão.

PARTE 27 — Estado Local do Mapa Neural

28. Git e controle de versão

".neural-map/" é estado operacional local do agente e, por padrão, NÃO deve ser versionado junto ao código do projeto.

Se o projeto utilizar Git:

1. Verifique se o projeto possui ".gitignore".

2. Verifique se ".neural-map/" já está sendo ignorado.

3. Se não estiver, adicione exatamente:

   .neural-map/

4. Verifique se algum arquivo de ".neural-map/" já está sendo rastreado:

   git ls-files .neural-map/

5. Se houver arquivos rastreados, remova-os somente do índice:

   git rm -r --cached .neural-map/

6. Preserve a cópia local de ".neural-map/".

7. Não faça commit de arquivos pertencentes a ".neural-map/".

8. Não altere outras regras do ".gitignore" sem necessidade.

"git rm --cached" remove os arquivos somente do índice do Git; não deve apagar a cópia local do mapa.

Antes de executar operações que alterem o índice, verifique o estado atual com:

git status --short
git ls-files .neural-map/

Não execute "git rm", "git reset" ou operações equivalentes de forma indiscriminada.

29. Exceção de versionamento

A regra de não versionar ".neural-map/" é o comportamento padrão.

Se o usuário solicitar explicitamente o versionamento do mapa, ou se o projeto possuir uma política explícita determinando que ".neural-map/" deve ser versionado, siga essa política.

Nesse caso, não adicione ".neural-map/" ao ".gitignore" nem remova seus arquivos do índice.

30. Projetos sem Git

Se o projeto não utilizar Git, não crie um repositório apenas para controlar o mapa neural.

Mantenha ".neural-map/" normalmente na raiz do projeto.

31. Objetivo

O mapa neural existe como memória arquitetural persistente para reduzir exploração e reconstrução de contexto.

Por padrão, ele deve permanecer disponível localmente para o agente sem poluir:

- histórico de commits;
- diffs;
- pull requests;
- releases;
- pacotes;
- colaboração entre desenvolvedores.

O código do projeto continua sendo a fonte de verdade; ".neural-map/" é apenas um índice operacional derivado dessa fonte.

Regra final:

«Consulte o mapa antes de explorar.
Leia somente o necessário.
Confirme o que importa.
Modifique somente o necessário.
Valide o resultado.
Atualize somente o que mudou.
Nunca reconstrua informação que já pode ser reutilizada.»`;
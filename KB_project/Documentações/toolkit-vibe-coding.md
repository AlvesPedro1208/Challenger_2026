# Vibe Coding Toolkit — como vamos usá-lo neste projeto

> Fonte: clone local em `tookit_claude/vibe-coding-toolkit/` (repo de Matheus Gomes,
> MIT). Este arquivo resume o toolkit E define como o Challenger 2026 o aplica.
> Referência completa: `docs/02-playbook-onboarding.md` dentro do clone.

## O que é

Não é um framework de código — é um **fluxo de trabalho** para desenvolvimento
assistido por IA (Claude Code), montado em 7 pilares. A regra de ouro: a sessão
principal **planeja, decide e delega; nunca implementa sozinha**.

## Os 7 pilares → o que adotamos

| # | Pilar | Status no projeto |
|---|---|---|
| 1 | **Superpowers** (plugin oficial de skills de processo) | ADOTADO — já instalado (v6.3.0, escopo user) |
| 2 | **Orquestração de subagentes** em ondas paralelas | ADOTADO — regra em `templates/rules/` do toolkit será copiada para o CLAUDE.md/`.claude/` |
| 3 | RTK (proxy de tokens) | Não usaremos — é padrão documentado, não binário público |
| 4 | Personas Ponytail (YAGNI) + Caveman (comunicação seca) | Opcional — avaliar; princípios YAGNI entram no CLAUDE.md mesmo sem o plugin |
| 5 | **Quality gates** ESLint (warning → error como migração) | ADOTADO — no setup do app RN |
| 6 | Graphify (grafo de conhecimento do código) | Opcional — só se a base crescer muito |
| 7 | **Memória em 2 camadas** (índice `MEMORY.md` + cofre longo prazo) | ADOTADO — a memória do Claude Code + **este KB_project faz o papel do cofre** (no lugar do Obsidian) |

Extras do toolkit: **Context7** (MCP de docs atualizadas de libs — útil para
React Native/Expo, avaliar instalação), agent-browser e Chrome DevTools MCP (pouco
relevantes para app mobile), Anthropic Skills (docx/pdf/pptx — úteis para gerar
material da apresentação do Next!).

## O motor: Superpowers (plugin já instalado)

Skills de **processo** que disciplinam o agente ANTES de codar. Ciclo completo:

1. **`brainstorming`** — todo pedido criativo passa por perguntas socráticas (uma por
   vez) e é classificado em *spike* (viabilidade) / *bounded* (mudança pequena em fluxo
   existente) / *architectural* (subsistema novo). Em TODOS os caminhos existe um
   **portão de aprovação**: nenhum código antes de um "sim" explícito do humano.
   Caminho architectural gera um documento de spec salvo em disco.
2. **`writing-plans`** — transforma a spec aprovada em plano passo a passo: cada tarefa
   com arquivos exatos (`Files:`), dependências (`Depends-on:`), interfaces consumidas/
   produzidas e passos de 2–5 min. Regra de **zero placeholder**.
3. **`subagent-driven-development`** — executa o plano despachando um subagente
   implementador por tarefa (contrato: perguntar antes se ambíguo, TDD, autorrevisão,
   status explícito DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED) + um subagente
   revisor por tarefa (spec + qualidade). Default serial; paraleliza via ondas (abaixo).
4. **`test-driven-development`** — vermelho → verde → refatorar dentro de cada tarefa.
   Lei: nenhum código de produção sem teste que falhou primeiro.
5. **`systematic-debugging`** — bug = investigação de causa raiz primeiro (reproduzir,
   ver o que mudou, instrumentar fronteiras, 1 hipótese por vez). 3 correções falhas
   seguidas = parar e questionar a arquitetura.
6. **`finishing-a-development-branch`** — suíte completa verde → opções de merge/PR →
   limpeza.

Apoio: `using-git-worktrees`, `executing-plans`, `requesting-code-review`,
`receiving-code-review`, `verification-before-completion` (nenhum "pronto" sem rodar a
verificação no mesmo turno), `dispatching-parallel-agents`, `writing-skills`.

> Hierarquia: instrução explícita do humano (ou CLAUDE.md) > skill. A skill impede o
> agente de pular etapas POR CONTA PRÓPRIA, não tira nossa palavra final.

## Execução em ondas paralelas (regra de orquestração)

Para acelerar sem corromper nada:

1. Toda tarefa do plano é marcada com `Files:` (caminhos exatos) e `Depends-on:`.
   Tarefa mal marcada degrada para serial (fail-safe).
2. Duas tarefas só entram na mesma onda se: sem dependência (nem transitiva) **e**
   arquivos totalmente disjuntos.
3. **Implementadores nunca comitam** — editam e reportam; o orquestrador comita um por
   tarefa, em ordem, capturando o HEAD na hora. Revisores da onda rodam juntos depois
   (leitura é segura). Um registro de progresso por onda, não por tarefa.
4. Válvula de escape (raro): worktrees isoladas quando duas tarefas precisam do mesmo
   arquivo.

Custo real: multiagente gasta 3–10× mais tokens — só paraleliza quando há independência
genuína, proteção de contexto ou especialização real.

## Escolha de modelo por despacho (nunca herdar por acidente)

- **Barato (classe Haiku)**: tarefa mecânica 100% especificada, buscas.
- **Intermediário (classe Sonnet)**: implementação, integração, debug, revisão — o grosso.
- **Forte (classe Opus)**: decisões de arquitetura e revisão final da branch.

## Fluxo padrão de uma feature no Challenger

```
Pedido → brainstorming (spike/bounded/architectural + aprovação)
      → writing-plans (spec → plano com Files:/Depends-on:)
      → ondas: implementadores em paralelo (TDD, sem commit)
      → commits serializados pelo orquestrador
      → revisores em paralelo → correções → finishing branch
      → aprendizados relevantes gravados na memória/KB
```

## Setup pendente (próxima fase — aguardando definição do fluxo com o Pedro)

- [ ] Criar `CLAUDE.md` na raiz (a partir de `templates/CLAUDE.md.template`): stack,
      comandos canônicos, tabela de roteamento de especialistas, apontando para o KB.
- [ ] Copiar `templates/rules/parallel-subagent-driven-development.md` para o projeto.
- [ ] Definir elenco de especialistas em `KB_project/Agentes/` (frontend RN, backend/
      mock-server, test-engineer, code-reviewer, design-reviewer…).
- [ ] Scaffold do app React Native + ESLint com quality gates.
- [ ] Avaliar Context7 (docs RN/Expo) e personas Ponytail/Caveman.

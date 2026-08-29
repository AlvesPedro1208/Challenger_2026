# KB_project — Knowledge Base do Challenger 2026

> Segundo cérebro do projeto. Toda sessão de agente (Claude Code ou outro LLM)
> deve começar lendo este índice e os arquivos de `Contexto/` relevantes à tarefa.

## Mapa do KB

| Pasta / arquivo | O que contém |
|---|---|
| [Contexto/01-desafio-fiap-clickbus.md](Contexto/01-desafio-fiap-clickbus.md) | O desafio oficial (kickoff FIAP + ClickBus): cliente, problema, visões de futuro, critérios implícitos |
| [Contexto/02-produto-ideia-geral.md](Contexto/02-produto-ideia-geral.md) | **Escopo canônico do produto** — as features que vamos construir. Fonte única de verdade de escopo |
| [Contexto/03-design-guidelines.md](Contexto/03-design-guidelines.md) | Diretrizes visuais: paleta, componentes, referência Flighty, tokens extraídos do deck legado |
| [Contexto/04-stack-tecnica.md](Contexto/04-stack-tecnica.md) | Stack: React Native, alvos de execução (celular + simulador do MacBook), decisões técnicas |
| [Documentações/toolkit-vibe-coding.md](Documentações/toolkit-vibe-coding.md) | Como usamos o vibe-coding-toolkit: fluxo Superpowers, ondas de subagentes, memória, quality gates |
| `Planejamento/` | Kanban em pastas: `Pendente/` → `Em Execução/` → `Em Review/` → `Done/`. Um arquivo .md por item de trabalho |
| `Agentes/` | Definições e tabela de roteamento de subagentes especialistas (a preencher no setup do fluxo) |
| `Skills/` | Skills específicas do projeto (a criar conforme necessidade) |
| `Templates/` | Templates reutilizáveis (briefs de tarefa, specs, planos) |

## Regras do KB

1. **Escopo de produto**: só vale o que está em `02-produto-ideia-geral.md`. O deck
   "Proposta 2 — Embarque Vivo" é projeto legado: aproveitamos SOMENTE o estilo visual
   (documentado em `03-design-guidelines.md`), nunca features ou planejamento dele.
2. **Idioma**: documentação em português (pt-BR). Código e identificadores em inglês.
3. **Planejamento**: mover o arquivo .md do item entre as pastas do kanban conforme o status muda.
4. **Atualização**: quem aprende algo novo sobre o projeto atualiza o arquivo de contexto
   correspondente na mesma sessão — contexto desatualizado é pior que ausente.

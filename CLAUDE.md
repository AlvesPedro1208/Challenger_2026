# Challenger 2026 — FIAP × ClickBus

> Memória de projeto do Claude Code. Curta e de alto sinal. Contexto completo no KB.

## Antes de qualquer tarefa

1. Leia `KB_project/00-INDEX.md` (mapa do knowledge base) e os arquivos de
   `KB_project/Contexto/` relevantes à tarefa.
2. Escopo de produto: SOMENTE `KB_project/Contexto/02-produto-ideia-geral.md`.
   Do deck legado "Embarque Vivo" aproveita-se apenas o estilo visual.
3. Idioma: conversas e docs em pt-BR; código e identificadores em inglês.

## Diretrizes de comportamento

1. **Pense antes de codar** — explicite premissas; se houver múltiplas interpretações,
   apresente-as em vez de escolher em silêncio; se algo está genuinamente incerto, pare e pergunte.
2. **Simplicidade primeiro (YAGNI)** — o mínimo de código que resolve; sem feature
   especulativa, sem abstração para uso único, sem configurabilidade não pedida.
3. **Mudanças cirúrgicas** — toque só no que a tarefa exige; siga o estilo existente;
   não refatore código vizinho não solicitado.
4. **Execução orientada a objetivo verificável** — "corrigir o bug" vira "escrever o
   teste que o reproduz e fazê-lo passar"; todo passo tem checagem de verificação.
5. **Orquestrador, não implementador** — a sessão principal planeja, decide e coordena;
   implementação delegável vai para subagente especialista, em paralelo quando os
   escopos não colidem (regra: `.claude/rules/parallel-subagent-driven-development.md`).

## Fluxo de trabalho (Superpowers)

Pedido criativo → `brainstorming` (aprovação obrigatória) → `writing-plans`
(Files:/Depends-on:) → execução em ondas por subagentes (TDD, implementador nunca
comita; commits serializados pelo orquestrador) → revisão (spec + qualidade) →
`finishing-a-development-branch`. Bug → `systematic-debugging` antes de corrigir.
Nenhum "pronto" sem verificação executada no mesmo turno.

## Stack

TypeScript · React Native (Expo — proposta, validar) · npm.
Alvos: celular físico + simulador no MacBook. Detalhes: `KB_project/Contexto/04-stack-tecnica.md`.

## Estrutura do repositório

- `projeto/` — TODO o código do app vive aqui.
- `KB_project/` — knowledge base (vault Obsidian). Kanban em `KB_project/Planejamento/`.
- `tookit_claude/` — clone do vibe-coding-toolkit (referência, fora do git).
- `.claude/agents/` — subagentes especialistas · `.claude/rules/` — regras de orquestração.

## Comandos canônicos

(preencher no scaffold do app — install/lint/typecheck/test/dev)

## Tabela de roteamento de especialistas

Detalhes e tiers: `KB_project/Agentes/tabela-roteamento.md`.

| Agente | Quando usar |
|---|---|
| `rn-frontend-specialist` | Telas, componentes, navegação, estilo (RN/Expo) |
| `backend-mock-specialist` | Simulador de telemetria/eventos, APIs mock, Google Maps/Places |
| `test-engineer` | Testes unitários/integração com TDD |
| `code-reviewer` | Revisão de spec + qualidade após cada tarefa e antes de merge |
| `design-reviewer` | Conferir UI contra `KB_project/Contexto/03-design-guidelines.md` |
| `debugger` | Causa raiz de bug antes de qualquer correção |

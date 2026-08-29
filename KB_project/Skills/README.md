# Skills do Projeto

## Skills de processo (plugin Superpowers — já instalado, escopo user)

Vêm do plugin `superpowers@claude-plugins-official` (v6.3.0) e regem COMO trabalhamos:

| Skill | Papel |
|---|---|
| `brainstorming` | Explora intenção antes de codar; classifica spike/bounded/architectural; portão de aprovação |
| `writing-plans` | Spec aprovada → plano com Files:/Depends-on:, passos 2–5 min, zero placeholder |
| `subagent-driven-development` | Executa plano via subagentes (contrato: perguntar→TDD→autorrevisão→status) |
| `test-driven-development` | Vermelho → verde → refatorar; nenhum código sem teste que falhou antes |
| `systematic-debugging` | Causa raiz antes de correção |
| `dispatching-parallel-agents` | Problemas independentes despachados na mesma mensagem |
| `using-git-worktrees` · `executing-plans` · `requesting-code-review` · `receiving-code-review` · `finishing-a-development-branch` · `verification-before-completion` · `writing-skills` | Ciclo de vida completo |

A regra de execução paralela em ondas está em `.claude/rules/parallel-subagent-driven-development.md`.

## Skills próprias do projeto

(vazio por enquanto — criar aqui skills específicas, ex.: "gerar tela seguindo design
guidelines", "atualizar KB após feature", usando a skill `writing-skills` do Superpowers)

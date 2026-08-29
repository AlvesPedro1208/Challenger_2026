# Templates

## `toolkit/` — importados do vibe-coding-toolkit

| Arquivo | Uso |
|---|---|
| `CLAUDE.md.template` | Base do CLAUDE.md da raiz (memória de projeto do Claude Code) |
| `settings.json.example` | Exemplo de hooks em `.claude/settings.json` |
| `hook-io.mjs.example` | Esqueleto seguro de hook (fail-open) |
| `parallel-subagent-driven-development.md` | Regra de ondas paralelas (cópia ativa em `.claude/rules/`) |

## `prompts/` — prompts prontos do toolkit (colar e adaptar; em inglês de propósito)

| Prompt | Quando usar |
|---|---|
| `01-project-sanitation.md` | Faxina geral do código, medindo antes de agir |
| `02-eslint-warning-burndown.md` | Zerar warnings de lint acumulados |
| `03-multi-agent-code-review.md` | Vários revisores em paralelo sobre o mesmo diff |
| `04-brainstorm-to-plan.md` | Pedido aberto → plano formal |
| `05-parallel-wave-dispatch.md` | Quebrar plano em ondas paralelas seguras |
| `06-memory-bootstrap.md` | Bootstrap do sistema de memória (já feito neste repo) |
| `07-eslint-complete-setup.md` | Montar eslint.config.mjs do zero (usar no setup do app) |

## Templates próprios do projeto

(criar aqui: brief de tarefa para subagente, template de spec, template de item do kanban)

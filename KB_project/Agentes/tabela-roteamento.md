# Elenco de Especialistas & Tabela de Roteamento

> Padrão do vibe-coding-toolkit (Parte A de `docs/tools/02-subagent-orchestration.md`),
> adaptado aos domínios REAIS deste projeto. As definições executáveis vivem em
> `.claude/agents/*.md` na raiz do repositório — esta tabela é o roteador.

## Regra de ouro

A sessão principal **orquestra, não implementa**. Toda tarefa delegável é roteada ao
especialista cuja frase de "quando usar" combina com ela. Frase de uso = regra de
roteamento (não há tabela duplicada).

| Especialista | Quando usar | Tier de modelo sugerido |
|---|---|---|
| `rn-frontend-specialist` | Telas, componentes, navegação e estilo do app RN/Expo | Intermediário (forte p/ telas-chave) |
| `backend-mock-specialist` | Simulador de telemetria/eventos, APIs mock, integrações Google Maps/Places | Intermediário |
| `test-engineer` | Testes unitários/integração TDD, casos de borda | Intermediário (barato p/ testes mecânicos) |
| `code-reviewer` | Revisão de spec + qualidade após cada tarefa e antes de merge | Intermediário (forte p/ revisão final de branch) |
| `design-reviewer` | Conferir UI contra as design guidelines (Flighty/ClickBus) | Intermediário |
| `debugger` | Causa raiz de bug/teste falhando, antes de qualquer correção | Intermediário→forte |

## Escolha de tier por despacho (nunca herdar por acidente)

- **Barato (classe Haiku)**: mudança 100% especificada num arquivo só; buscas/exploração.
- **Intermediário (classe Sonnet)**: implementação, integração, debug, revisão — o padrão.
- **Forte (classe Opus)**: decisão arquitetural, revisão final da branch inteira.

## Expansão futura

Papéis do elenco de referência do toolkit que podemos ativar se o domínio aparecer:
`security-reviewer` (se entrar auth/dados sensíveis), `performance-optimizer` (se o mapa
pesar), `documentation-writer` (material do Next), `qa-automation-engineer` (E2E/Maestro).
Um domínio que o projeto não tem = agente que não existe (peso morto).

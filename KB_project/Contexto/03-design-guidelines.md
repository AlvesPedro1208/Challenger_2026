# Design Guidelines

> Fontes: (1) deck legado "Proposta 2 — ClickBus Embarque Vivo" — usamos SOMENTE o
> estilo visual dele (cores, formatos, componentes); features e planejamento do deck
> estão fora do escopo. (2) Referência de estilo: **https://flighty.com**.

## Direção geral

App **dark-first**, denso em dados porém limpo, com estética premium de "live tracking"
— o Flighty do rodoviário. Sensação de app iOS nativo: tipografia forte, cards com
cantos bem arredondados, hierarquia clara, animações sutis, mapa como plano de fundo
da experiência.

## Paleta (tokens extraídos do deck legado — aproximados, refinar na implementação)

### Tema escuro (principal — telas do app)

| Token | Hex aprox. | Uso |
|---|---|---|
| `bg.primary` | `#17121F` | Fundo geral (preto-arroxeado) |
| `bg.surface` | `#221B2E` | Cards, painéis, bottom bar |
| `accent.primary` | `#E6135A` | Rosa/magenta ClickBus-like: CTAs, rota no mapa, alertas de mudança, destaques |
| `accent.purple` | `#7C3AED` | Secundário: rotas acessíveis, gráficos, badges |
| `accent.success` | `#10B981` | Verde: confirmações ("Tudo certo", "Embarque liberado", bagagem OK) |
| `accent.warning` | `#F5A623` | Âmbar: avisos, grupo de embarque, contagem |
| `text.primary` | `#FFFFFF` | Texto principal |
| `text.secondary` | `#B9B3C4` | Texto de apoio, metadados |

### Tema claro (telas de conteúdo/relatórios, se necessário)

| Token | Hex aprox. | Uso |
|---|---|---|
| `bg.light` | `#F5F3EF` | Fundo off-white/creme |
| `text.dark` | `#1A1A1A` | Texto |
| Pastéis | `#FBE0EA` rosa · `#E7E0FB` lilás · `#D9F5EA` menta · `#FCEEC9` âmbar | Fundos de callouts/destaques |

## Padrões de componentes (observados no deck e no Flighty)

- **Card de viagem "hero"**: rota em destaque ("São Paulo → Rio de Janeiro"), data/hora
  em rosa, terminal, poltrona/classe/serviço, QR Code em card branco, status pill verde
  ("Tudo certo para sua viagem!").
- **Banner de alerta no topo**: fundo rosa, ícone ⚠, mensagem curta e ação
  ("Plataforma alterada 45 → 48" + "Rota recalculada · 9 min").
- **Mapa dark** com rota tracejada em rosa/roxo, plataforma destacada em pill rosa,
  ícones de serviços (banheiro, alimentação) e numeração de plataformas na lateral.
- **Botões**: full-width, cantos arredondados, rosa primário (variante roxa para
  acessibilidade, verde para confirmação); label curto ("Ver rota", "Abrir mapa",
  "Mostrar ao motorista").
- **Modo Terminal**: header com badge da plataforma + horário previsto de embarque —
  o app troca de contexto ao entrar na rodoviária (liga com Módulo 5).
- **Cards numerados com barra colorida no topo** (rosa/roxo/verde/âmbar) para fluxos
  e etapas; círculos numerados coloridos para jornadas.
- **Estatísticas estilo Flighty**: histograma de pontualidade, % risco de atraso,
  tempo médio, contadores pessoais (viagens, km) — gráficos minimalistas roxo/rosa.
- **Tipografia**: sans-serif geométrica em pesos fortes para títulos (estilo SF Pro /
  Inter); números grandes em destaque; labels em caps pequenos para seções.

## O que aproveitar do Flighty (https://flighty.com)

- Tela inicial = a viagem ativa como live activity (status, countdown, próxima ação).
- Timeline vertical da jornada com marcos (saída de casa → chegada → embarque →
  paradas → destino).
- Dados de confiabilidade/pontualidade apresentados como produto premium, não tabela.
- Push notifications ricas e acionáveis; widgets/Live Activities se o tempo permitir.
- Zero poluição: cada tela responde UMA pergunta do usuário (Onde ir? Quando agir?
  O que mudou? — herdado do deck legado como princípio de UX).

## Regra de ouro

> Cada tela deve transformar dados em **uma próxima ação óbvia** para o passageiro.
> Informação sem ação vira ruído — princípio "Orientação Viva" do deck legado, que é
> a única herança conceitual (além do visual) que mantemos dele.

# Plano de Implementação — MVP Jornada Viva

Spec: `../Documentações/Specs/2026-08-29-spec-mvp-demo.md` (aprovada em 29/08/2026)
Stack: TypeScript estrito · Expo (app) · Fastify + WebSocket (demo-server) · npm workspaces

## Restrições globais

- Monorepo em `projeto/` com workspaces: `app`, `demo-server`, `shared`.
- Nenhum implementador faz commit; o orquestrador comita por tarefa, em ordem de onda.
- Sem emojis, sem marcações de IA em código, comentários ou arquivos.
- Comentários enxutos, apenas onde agregam. Identificadores em inglês.
- Cores/UI seguem `../Contexto/03-design-guidelines.md` (dark #17121F, rosa #E6135A).
- Todo dado dinâmico vem de eventos (painel ou auto-play) — nunca hardcoded na tela.

## Contrato central (pacote shared)

Eventos WS (`shared/src/events.ts`): `CLOCK_SET`, `TRAFFIC_ALERT`, `RISK_UPDATE`,
`PLATFORM_CHANGE`, `BUS_TELEMETRY`, `DELAY_UPDATE`, `STOP_APPROACHING`, `STOP_DWELL`,
`ARRIVAL`, `PHASE_CHANGE` (fases: HOME, EN_ROUTE_TERMINAL, TERMINAL, ONBOARD, ARRIVED).
Modelos (`shared/src/models.ts`): `Trip`, `Ticket`, `BusPosition`, `RouteStats`,
`Stop`, `Poi`, `IndoorMap`.

## Tarefas

| ID | Tarefa | Especialista | Files (prefixo projeto/) | Depends-on |
|---|---|---|---|---|
| T01 | Raiz do monorepo + pacote shared (tipos, eventos, modelos) | backend-mock | package.json, tsconfig.base.json, shared/** | — |
| T02 | Scaffold demo-server: Fastify + WS + rota bootstrap + estrutura | backend-mock | demo-server/** (exceto src/data, src/engine, panel) | — |
| T03 | Scaffold app Expo: TS, expo-router, zustand, tema (tokens), telas placeholder | rn-frontend | app/** | — |
| T04 | Datasets: polyline SP-Rio, paradas, historico 60d, POIs, indoor map | backend-mock | demo-server/src/data/** | T01, T02 |
| T05 | Scenario Engine: relogio simulado, interpolacao na polyline, emissor de eventos, API de comandos | backend-mock | demo-server/src/engine/** | T01, T02, T04 |
| T06 | App: cliente WS + store Zustand + reducer de eventos + modo auto-play | rn-frontend | app/src/state/**, app/src/services/** | T01, T03 |
| T07 | Painel de controle web (cenas, botoes de evento, controle de relogio) | backend-mock | demo-server/panel/** | T05 |
| T08 | Tela Home/Live (viagem ativa, countdown, alerta de risco, fluxo remarcar/cancelar ANTT) | rn-frontend | app/src/screens/home/** | T06 |
| T09 | Tela Mapa tempo real (onibus animado, ETA, rota, clima/trafego) | rn-frontend | app/src/screens/map/** | T06 |
| T10 | Tela Estatisticas (histograma pontualidade, risco %, tempo medio, confiabilidade) | rn-frontend | app/src/screens/stats/** | T06 |
| T11 | Modo Terminal (mapa indoor SVG, banner troca de plataforma, rota indoor) | rn-frontend | app/src/screens/terminal/** | T06 |
| T12 | Bilhete offline (QR, cache local, funciona em modo aviao) | rn-frontend | app/src/screens/ticket/** | T06 |
| T13 | Tela Chegada (boas-vindas contextual, recomendacoes, stats pessoais da rota) | rn-frontend | app/src/screens/arrival/** | T06 |
| T14 | Integracao: navegacao por fase da jornada + notificacoes locais push | rn-frontend | app/src/navigation/**, app/app/** (rotas) | T08–T13 |
| T15 | Revisao de design de todas as telas + correcoes | design-reviewer + rn-frontend | app/src/** (ajustes) | T14 |
| T16 | Ensaio da demo end-to-end (simulador + painel), README de execucao | test-engineer | projeto/README.md, scripts | T15 |

## Ondas

| Onda | Tarefas | Justificativa |
|---|---|---|
| 1 | T01, T02, T03 | Sem dependencias; arquivos totalmente disjuntos |
| 2 | T04, T06 | T04 so depende da onda 1; T06 idem; disjuntos |
| 3 | T05 | Precisa de T04 |
| 4 | T07, T08, T09, T10, T11, T12, T13 | Todas dependem de T05/T06; telas em pastas disjuntas |
| 5 | T14 | Integra as telas |
| 6 | T15, T16 | Revisao e ensaio |

Progresso: mover os cards em `Pendente/` -> `Em Execução/` -> `Em Review/` -> `Done/`.

## Dividas registradas pela revisao da Onda 1 (resolver nas ondas seguintes)

- OBRIGATORIO em T08/T11: eliminar strings pseudo-dinamicas hardcoded dos placeholders
  (plataforma, horarios em index.tsx e terminal.tsx) — todo dado dinamico via store/eventos.
- Em T05: tipar o hub WS com DemoEvent do shared e declarar dependencia @jornada/shared
  no demo-server; adicionar teste do /ws (registro, broadcast, clientCount).
- Na Onda 4 (qualquer tela): corrigir copy PT sem acentuacao dos placeholders;
  Card.tsx usar StyleProp<ViewStyle>.
- Limpeza leve (Onda 6/T16): remover ruido de template do app (LICENSE da Expo,
  .vscode/, assets nao usados, icon 799KB), avaliar remocao de deps de template sem uso.
- Nota: ClockSetEvent tem `at` e `isoTime` redundantes — engine (T05) deve tratar
  `isoTime` como fonte e `at` como carimbo do envio (documentar no codigo do engine).

## Loop de correcao da Onda 2 (revisao reprovou T06 em qualidade)

Correcao T06-fix (despachar APOS T05 concluir, para evitar colisao de arquivos):
- Unificar o trip canonico em TODAS as fontes: viagem noturna 22:30 -> 06:10 (13->14/09),
  Viacao Aurora (ficticia; nao usar marca real), Semi Leito, poltrona 28, plataforma 45,
  qrPayload terminando em -28 (casar com seat). Alinhar: demo-server/src/data/trip.ts,
  app/src/services/bootstrap.ts (fixture) e o roteiro em shared/src/scenario.ts.
- scenario.ts: stopId 'stop-aparecida' (casar com dataset); telemetria dos passos 62s/74s
  sobre a polyline real; refundDeadlineIso futuro em relacao ao RISK_UPDATE; semantica de
  etaNextStopMin consistente (minutos ate a proxima parada; destino quando nao ha mais
  paradas) e incluir Resende como segunda parada com APPROACHING/DWELL.
- autoplay.ts: marcar running=false ao terminar o roteiro.
- bootstrap.ts (app): validacao minima de campos do BootstrapData.
- Rodar TODAS as suites (shared/app/demo-server) apos o ajuste, incluindo as de T05.
- Pendencia de infra (T16): nao existe eslint.config.* em projeto/app — o quality gate de
  lint da stack ainda nao foi configurado no pacote do app. Configurar antes do ensaio final.
- T16: avaliar retry em segundo plano para voltar do auto-play ao painel sem reiniciar o app
  (hoje, se o WS desiste no boot, so volta ao modo painel reiniciando).
- T16: avaliar declarar o plugin expo-notifications em app.json (necessario so para
  icone/som custom em build nativo; local notifications ja funcionam sem ele).

## Onda 5b — correcoes da revisao da Onda 4

Revisao reprovou T09 (spec+qualidade), T11 e T12 (qualidade). Correcoes em 5 escopos disjuntos:

- F1 (map): card de parada some 5s apos STOP_APPROACHING; selectDwell nunca usado; onibus
  teleporta entre amostras; rotulo "Proxima parada" mente apos a ultima parada; usar stops do
  store; alerta de transito invisivel no mapa; sem testes.
- F2 (terminal): DOIS tempos de caminhada contraditorios na mesma tela (evento 4 min vs grafo
  13 min); grafo estatico misturado com mapa do store; banner nao reaparece ao repetir a cena
  (quebra ensaio); sem testes.
- F3 (ticket): selo "Disponivel offline" nunca aparece — em modo aviao a conexao vira
  'autoplay', nao 'offline'; sem testes.
- F4 (home+stats): decisao de risco nunca reseta (quebra segundo ensaio); fileira de links
  redundante apos T14; texto legal fixo contradiz percentuais dinamicos; tipo frouxo no skeleton.
- F5 (dados/painel): acentuacao ausente em scenario.ts e stops.ts aparece na tela em modo
  auto-play; prazo de reembolso absoluto no painel pode abrir "expirado".

Transversal: comentarios em pt-BR em 6 arquivos (regra: codigo em ingles).

ACHADO REJEITADO: revisor alegou que 31f632e (onTimePct) nao tem teste de regressao.
Verificado: implementacao antiga retorna 57, teste espera 58 — falhava antes, passa agora.

## Onda 6 — correcoes da revisao de design (T15)

Veredito: reprovado para telao sem correcoes. Bloqueadores reais de apresentacao:
- A1/A2: nomes de cidade completos ("Sao Paulo (Terminal Tiete)") em tipografia 34pt
  estouram em varias linhas e empurram o countdown para fora da dobra — primeira tela da demo.
- A3: /stats inalcancavel no Ato 4 (nao esta em PHASE_ROUTES e nao ha CTA no mapa).
- A4: mapa e tela sem saida — sem header, sem back, sem proxima acao.
- A5: bilhete inalcancavel apos o embarque (unico caminho era pelo terminal).
- A6: skeleton de stats com contraste 1.2:1 — no projetor parece tela travada.
- A7: indicador de fonte de dados sobrepoe CTAs no rodape.
Polimento: contraste de pills roxas (2.3:1), alvos de toque < 44pt, divergencias de
tipografia/espacamento entre telas, tokens do tema claro nao tokenizados, telas sem
proxima acao (stats e POIs da chegada), jargao "Auto-play" visivel na demo.

Escopos disjuntos: G1 mapa+navegacao · G2 lib+home+bilhete · G3 stats+chegada · G4 primitivos+tokens.
Pendencia: cityName duplicado (stats/helpers.ts e o novo lib) — deduplicar no T16.

## Estado em 30/08/2026

Concluido: T01-T16 (exceto o ensaio VISUAL), mais 3 ondas de correcao nascidas das revisoes
(qualidade da Onda 2, qualidade da Onda 4, design/T15) e as pendencias P1/P3 do ensaio.
Testes: 197 no app + 57 no demo-server. Lint 0 errors / 29 warnings. Typecheck limpo.

BLOQUEIO UNICO: nao ha runtime de simulador iOS instalado (xcrun simctl list runtimes vazio).
Exige autorizacao de admin: Xcode > Settings > Components. Sem isso, NADA visual foi validado.

Pendente apos desbloquear:
1. Ensaio visual dos 5 atos no simulador, com screenshots (o unico item que fecha o T16).
2. Reavaliar duracao dos cards de permanencia (Aparecida x Resende) agora que o relogio e monotonico.
3. Conferir no projetor se o skeleton de stats le como "carregando"; se nao, subir alpha de bone.onDark.
4. Larguras de botao/label conferidas por calculo, nao por render (faixa de acoes do mapa, grade de status).
5. Burndown opcional: 14 dos 24 warnings do app sao react-hooks/refs em 3 linhas
   (useRef(new Animated.Value())) — correcao mecanica e const [x] = useState(() => new Animated.Value()).
6. Opcional com spec: caminho "sair agora" no card de risco (Ato 1).
7. Deduplicar cityName (existe em screens/stats/helpers.ts e em lib/place.ts).

## Achados da revisao de design da tela de servidor (31/08/2026) — pendentes

ALTO: Screen.tsx sem keyboardShouldPersistTaps — com teclado aberto, o PRIMEIRO toque em
"Salvar URL"/"Testar conexao" e engolido; le como app travado na frente da banca.
ALTO: feedback do teste de conexao distingue sucesso/erro so por cor, 13pt, texto solto
(verde x rosa e o par que deuteranopia colapsa; ilegivel em projetor).
MEDIO: botao verde viola a regra de cor (deve ser roxo); toque longo re-entrante empilha
copias da tela; selo com ~20pt de alvo (falta hitSlop); campo de texto visualmente
identico ao card (1.1:1) e sem estado de foco; CurrentBaseCard nao distingue a qualidade
da fonte (metro em release = app apontado para lugar nenhum, mas aparece igual a override).
BAIXO: sem accessibilityLiveRegion no feedback; role=button sem onPress no selo;
prop title de Screen e codigo morto; "Limpar" sem confirmacao; sem returnKeyType.

## Auditoria de saidas (reportado pelo Pedro em 01/09/2026)

Sintoma relatado: as vezes abre-se uma tela e nao ha como voltar, porque a tela aberta
nao tem botao de retorno. Ja corrigimos Terminal (todos os ramos) e Bilhete, mas o
relato indica que sobraram casos.

Fazer auditoria SISTEMATICA: cada tela x cada estado (carregando, vazio, erro, e cada
variante de fase da jornada) precisa ter saida visivel. Nao basta corrigir os casos
conhecidos — precisa de varredura completa e, de preferencia, de um teste que trave a
regra para novas telas nao nascerem sem saida.

Agravante ja conhecido: a navegacao por fase usa router.replace, entao a pilha fica
vazia e o swipe-back do iOS nao funciona — a saida TEM que ser visivel na tela.

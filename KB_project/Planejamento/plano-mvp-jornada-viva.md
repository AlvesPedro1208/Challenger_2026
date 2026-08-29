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

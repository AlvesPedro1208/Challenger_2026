# Spec — MVP "Jornada Viva" (entrega 13/09)

> Status: **RASCUNHO — aguardando aprovação do Pedro**
> Origem: brainstorm de 29/08/2026. Escopo-mãe: `Contexto/02-produto-ideia-geral.md`.

## Objetivo

App React Native (estilo Flighty) que acompanha o passageiro rodoviário ponta a ponta,
apresentado como **demo cenografada dirigida ao vivo** por um painel de controle. Os 6
módulos da ideia geral aparecem na jornada; profundidade extra nos módulos de **dados**
(previsões, risco de atraso, pontualidade histórica) — a banca ClickBus é de Data/IA.

## Decisões estruturais (fechadas no brainstorm)

| Decisão | Escolha |
|---|---|
| Estratégia de demo | Jornada completa cenografada, ponta a ponta |
| Controle da demo | **Painel web separado** dispara eventos → app reage em tempo real |
| APIs | **Híbrido**: mapa real (tiles/rotas), dados dinâmicos simulados (datasets pré-gerados) |
| Base RN | **Expo** (TypeScript, Expo Router) |
| Infra no dia | MacBook roda servidor + painel; celular na mesma rede Wi-Fi; **fallback**: modo auto-play embutido no app se a rede falhar |

## Narrativa da demo (roteiro que o painel dirige)

1. **Casa (Módulo 1)** — viagem ativa na home; painel injeta trânsito ruim → app alerta
   "risco de perder o embarque" → opções: remarcar (regras ANTT, taxa) ou cancelar
   (prazo legal, retenção 5%). Usuário decide sair já → ETA até a rodoviária.
2. **Rodoviária (Módulo 5)** — geofence dispara **Modo Terminal**: mapa indoor 2D
   (guichês, banheiros, praça, plataformas). Painel muda a plataforma 45→48 → banner
   rosa + rota recalculada no indoor.
3. **Embarque (Módulo 6)** — bilhete QR disponível **offline** (modo avião na frente
   da banca, o bilhete abre).
4. **Viagem (Módulos 2 e 3)** — "Onde está meu ônibus?": mapa com o ônibus se movendo
   (telemetria simulada pelo painel), previsões de chegada, **pontualidade histórica
   do trecho** (risco %, tempo médio, histograma — 60 dias sintéticos). Push "próxima
   parada em 20 min"; parada de apoio com estabelecimentos (dataset Places pré-gerado).
5. **Chegada (Módulo 4)** — boas-vindas contextual por horário (café/almoço/jantar) +
   recomendações; estatísticas pessoais da rota (viagens, km, tempo).

## Arquitetura

```
┌─────────────── MacBook (Wi-Fi local) ───────────────┐
│  demo-server (Node+TS, Fastify + WebSocket)         │
│  ├─ Scenario Engine: estado da jornada, telemetria   │
│  │  do ônibus (interpolação em polyline real),       │
│  │  relógio simulado (time-travel)                   │
│  ├─ Datasets: rotas, histórico 60d, estabelecimentos │
│  └─ control-panel (web): timeline de eventos,        │
│     botões de cena (atraso, troca plataforma, etc.)  │
└──────────────────────┬───────────────────────────────┘
                       │ WS (eventos) + REST (bootstrap)
┌──────────────────────▼───────────────────────────────┐
│  app (Expo RN + TS, Expo Router)                     │
│  ├─ store (Zustand) alimentada por eventos           │
│  ├─ cache offline (bilhete QR + itinerário)          │
│  ├─ modo auto-play (roteiro embutido, fallback)      │
│  └─ telas: Home/Live, Mapa, Stats, Terminal,         │
│     Bilhete, Chegada                                 │
└──────────────────────────────────────────────────────┘
```

- **Monorepo** em `projeto/`: `projeto/app` (Expo) · `projeto/demo-server` (Fastify+WS,
  serve também o painel) · `projeto/shared` (tipos de eventos/modelos TS compartilhados).
- **Mapa**: `react-native-maps` (Apple Maps no iOS — zero chave/billing; polylines reais
  pré-computadas para SP→RJ). Mapa indoor: SVG vetorial próprio.
- **Push/notificações**: `expo-notifications` locais disparadas por eventos WS (sem
  servidor de push — confiável em demo).
- **Contrato de eventos** (shared): `TRAFFIC_ALERT`, `PLATFORM_CHANGE`, `BUS_TELEMETRY`,
  `DELAY_UPDATE`, `STOP_APPROACHING`, `ARRIVAL`, `CLOCK_SET`… — painel e auto-play
  emitem os MESMOS eventos (fallback de graça).

## Fora de escopo (13/09)

Compra de passagem, login/conta real, biometria, IA generativa/chat, AR, backend em
nuvem, Android polido (foco: iOS Simulator + celular do time), GPS colaborativo real
(fica simulado e explicado no pitch).

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Wi-Fi falha no dia | Modo auto-play embutido (mesmos eventos) |
| Maps no celular físico | Apple Maps via Expo Go/dev build — testar na semana 1 |
| Tempo curto | Ondas paralelas de subagentes; telas priorizadas pela ordem do roteiro |

## Critérios de aceite

1. Demo roteirizada completa (5 atos) dirigida pelo painel, sem tocar no app.
2. Mesma demo roda em auto-play sem servidor.
3. Bilhete + itinerário funcionam em modo avião.
4. Tela de estatísticas com histograma de pontualidade e risco % (dados sintéticos 60d).
5. Roda no iOS Simulator do MacBook e no celular físico.

# Stack Técnica

## Decidido (brainstorm 29/08/2026 — ver Specs/2026-08-29-spec-mvp-demo.md)

- **Framework**: React Native com **Expo** (managed + dev build se necessário), TypeScript estrito, Expo Router.
- **Alvos**: celular físico do time + iOS Simulator no MacBook.
- **Arquitetura da demo**: painel de controle web separado → `demo-server` (Node + TS,
  Fastify + WebSocket) dirige o app ao vivo; **fallback auto-play** embutido no app.
- **APIs**: híbrido — mapa real (`react-native-maps` com Apple Maps no iOS, sem billing;
  polylines pré-computadas) + dados dinâmicos simulados (datasets pré-gerados: telemetria,
  pontualidade 60d, estabelecimentos estilo Places).
- **Estado**: Zustand alimentada por eventos WS; cache offline para bilhete QR + itinerário.
- **Notificações**: `expo-notifications` locais disparadas por eventos.
- **Estrutura**: monorepo em `projeto/` → `app/` · `demo-server/` (inclui painel) · `shared/` (tipos de eventos).
- **Qualidade**: ESLint 9 flat config + quality gates do toolkit (warning → error ao zerar).

## Observações

- Demo precisa sobreviver sem rede (modo avião na frente da banca é parte do roteiro).
- iOS Simulator não simula GPS em movimento — localização vem do Scenario Engine, nunca do GPS real.
- Ambiente: macOS, Node v25, npm, Homebrew.

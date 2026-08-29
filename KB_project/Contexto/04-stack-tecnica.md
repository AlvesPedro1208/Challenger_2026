# Stack Técnica

> Decisões registradas; itens marcados como "proposta" ainda dependem de aval do time.

## Decidido

- **Framework**: **React Native** (decisão do time).
- **Alvos de execução no dia da apresentação (Next)**:
  1. Celular físico do time;
  2. Simulador/emulador no MacBook.
- **Ambiente de dev**: macOS (Darwin), Node v25 + npm, Homebrew disponível.

## Propostas (validar antes do setup)

- **Expo (managed workflow)**: caminho recomendado para RN em 2026 — roda no iOS
  Simulator do MacBook e no celular físico via Expo Go/dev build sem fricção; acesso
  fácil a localização, push, mapas; EAS para builds. Alternativa: React Native CLI
  (mais controle nativo — necessário se formos usar módulos nativos exóticos tipo
  beacon/BLE avançado).
- **Linguagem**: TypeScript estrito.
- **Navegação**: Expo Router ou React Navigation.
- **Mapas**: react-native-maps (Google Maps) — necessário para Módulos 2, 3 e 5;
  mapa indoor 2D pode ser SVG/vetorial custom sobreposto.
- **APIs externas citadas no escopo**: Google Maps (rotas/tráfego), Google Places
  (estabelecimentos em paradas e destino).
- **Backend/simulação**: a definir com o time — para a demo do Next, telemetria de
  ônibus e eventos de terminal provavelmente serão **simulados** (mock server ou
  Firebase), já que não teremos GPS real de frota.
- **Estado**: Zustand ou React Query (server state) — decidir no setup.
- **Qualidade**: ESLint 9 (flat config) + TypeScript, seguindo o padrão de quality
  gates do toolkit (regra nova nasce como warning → promove a error ao zerar).

## Restrições e observações

- Demo precisa funcionar **offline-friendly** (Módulo 6) — pensar cache local desde o início.
- iOS Simulator não simula bem GPS em movimento/BLE — planejar "modo demo" com
  localização cenografada (mock location provider) para apresentação.
- O repositório do app será criado dentro deste repo (monorepo simples) — estrutura a
  definir na fase de setup do fluxo.

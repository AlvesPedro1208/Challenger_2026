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

## Lint

**Comando canônico** (na raiz `projeto/`):

```bash
npm run lint        # agrega: npm run lint --workspaces
```

Cada pacote também roda isolado com `npm run lint -w app` (ou `-w @jornada/demo-server`,
`-w @jornada/shared`). Nunca use `npx expo lint`: sem config ele instala ESLint por
conta própria, gera um `eslint.config.js` órfão e suja o lockfile.

**Configuração**: ESLint 9 flat config, uma por pacote
(`app/eslint.config.mjs`, `demo-server/eslint.config.mjs`, `shared/eslint.config.mjs`),
todas importando o gosto compartilhado de severidades de `projeto/eslint.base.mjs`.
O app usa `eslint-config-expo` (baseline do SDK 57) inteiro; `demo-server` e `shared`
usam `typescript-eslint` puro. Todas as dependências de lint estão declaradas nos
`devDependencies` dos pacotes — nada depende de instalação transitória.

**Política warning → error**: existem só duas severidades.

- `error` para o que é sempre bug: `no-var`, `prefer-const`, `no-empty`,
  `no-undef` (só onde o compilador TS não cobre), `@typescript-eslint/no-unused-vars`
  (opt-out por prefixo `_`), `react-hooks/rules-of-hooks` e o tier consciente de tipo
  (`no-floating-promises`, `no-misused-promises`, `await-thenable`).
- `warn` para pressão de refatoração: orçamento de complexidade/tamanho
  (`complexity` 12, `max-depth` 4, `max-statements` 20, `max-params` 4,
  `max-lines-per-function` 150, `max-nested-callbacks` 3), `react-hooks/exhaustive-deps`
  e `react-hooks/refs`.

Regra nova **nunca** nasce bloqueando: entra como `warn`, a contagem é zerada, e só
então é promovida a `error`. Formatação não é trabalho do ESLint e está fora de propósito.

**Contagem atual de warnings** (medida em 30/08/2026, `npm run lint` sai com código 0):

| Pacote | Warnings | Origem |
|---|---|---|
| `app` | 24 | 14 `react-hooks/refs` (3 sites do idioma `useRef(new Animated.Value(x)).current` nos skeletons, cada um reportado várias vezes pelo plugin), 6 `complexity`, 2 `max-statements`, 2 `max-lines-per-function` |
| `demo-server` | 4 | 2 `max-statements`, 2 `complexity` |
| `shared` | 1 | 1 `max-statements` |
| **Total** | **29** | 0 errors |

Candidato mais próximo de promoção: `react-hooks/refs` — bastam 3 edições mecânicas
(`useRef(new Animated.Value(x)).current` → `const [x] = useState(() => new Animated.Value(x))`)
para zerar 14 dos 29 warnings.

## Caminho do repositorio (decidido em 31/08/2026)

O repositorio NAO pode ficar em caminho com espaco. Com `Documents/Challenger 2026`, o build
nativo iOS quebra em tres pontos, o pior deles em silencio: o script
`node_modules/expo-constants/scripts/get-app-config-ios.sh` faz `basename $PROJECT_DIR` sem
aspas, o guard falha e o script sai com codigo 0 sem gerar o app.config embutido. Sintomas:
o app so abre pelo deep link do Metro (pelo icone da tela vermelha de erro) e
`Constants.expoConfig.hostUri` fica indefinido, caindo no fallback `localhost` — ou seja,
o celular fisico nunca acha o MacBook.

Decisao: mover para `~/Documents/Challenger2026`. Apos o move, refazer o prebuild
(`rm -rf projeto/app/ios` + `npx expo prebuild --platform ios`) e confirmar que o app abre
pelo icone sem o Metro.

Bundle identifier iOS: `br.com.jornadaviva.app` (decidido em 31/08/2026). O `expo prebuild`
gera `com.anonymous.<slug>` quando o campo esta ausente — nao deixar o placeholder no repo.

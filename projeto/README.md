# Jornada Viva

Demo cenografada da jornada do passageiro rodoviário: um app React Native (Expo)
que reage em tempo real a eventos disparados por um painel de controle web.

Spec: `../KB_project/Documentações/Specs/2026-08-29-spec-mvp-demo.md`
Plano: `../KB_project/Planejamento/plano-mvp-jornada-viva.md`

## Estrutura

| Pacote | Papel |
|---|---|
| `app/` | App Expo (TypeScript, Expo Router, Zustand) |
| `demo-server/` | Fastify + WebSocket; serve o painel e o scenario engine |
| `shared/` | Tipos de eventos, modelos e datasets compartilhados |

Monorepo com npm workspaces. Toda dependência é instalada a partir da raiz `projeto/`.

## Pré-requisitos

- **Node.js 20+** (validado em 25.9.0) e **npm 10+** (validado em 11.12.1).
- **Xcode** com pelo menos um **runtime de iOS instalado**.
  Verifique com `xcrun simctl list runtimes` — se a lista vier vazia, instale em
  Xcode › Settings › Components (ou `xcodebuild -downloadPlatform iOS`, que pede
  autorização de administrador). Sem runtime não existe simulador para rodar.
- Para celular físico: app **Expo Go** e o celular na **mesma rede Wi-Fi** do MacBook.
- **Caminho do projeto sem espaços.** O build nativo iOS (`npx expo run:ios`,
  `pod install`) quebra quando o diretório do repositório contém espaço no nome.
  Sintomas observados: o `pod install` falha com erro de encoding a menos que o
  ambiente esteja em UTF-8 (`LANG`/`LC_ALL`, ex.: `LANG=en_US.UTF-8
  LC_ALL=en_US.UTF-8 pod install`), e as build phases geradas pelo Xcode não
  colocam o caminho entre aspas, então o script para no primeiro espaço
  ("No such file or directory" com o caminho cortado pela metade).
  Recomendação: clonar em um caminho sem espaços (ex.: `~/dev/challenger-2026`).
  Isso não afeta `npx expo start` com Expo Go, que é o fluxo padrão da demo.

## Instalação

```bash
cd projeto
npm install
```

## Subindo a demo

A demo tem duas peças independentes: o **servidor + painel** (o operador dirige) e o
**app** (o que a banca vê). O app funciona com ou sem o servidor.

### 1. Servidor e painel

```bash
cd projeto/demo-server
npm run dev
```

- API/WS: `http://localhost:4000` (escuta em `0.0.0.0`, então o celular alcança pela LAN)
- Painel do operador: **`http://localhost:4000/panel/`**
- Bootstrap REST: `http://localhost:4000/api/bootstrap`
- WebSocket de eventos: `ws://localhost:4000/ws`

Porta alternativa: `PORT=4100 npm run dev`. Nesse caso o app precisa ser ajustado —
a porta está fixa em `app/src/services/connection.ts` (`SERVER_PORT`).

### 2. App

```bash
cd projeto/app
npx expo start
```

Com o Metro no ar:

- **`i`** abre no simulador iOS.
- Para celular físico, escaneie o QR com o Expo Go.

O app descobre o host do servidor a partir do host do Metro (`expoConfig.hostUri`),
então simulador e celular apontam para o mesmo MacBook sem configuração extra.

#### Modo desenvolvimento x modo apresentação

O comando acima serve para desenvolver: o JavaScript vem do Metro, então o app
**depende do Metro rodando**. Se o app for aberto pelo ícone com o Metro desligado,
aparece a tela vermelha `No script URL provided` — é o comportamento esperado de um
build Debug, não um defeito.

Para a apresentação, gere um build **Release**. Ele embute o JavaScript (~3,4 MB)
dentro do `.app`, e o app passa a abrir pelo ícone e rodar sozinho, sem Metro e sem
servidor:

```bash
cd projeto/app
npx expo run:ios --configuration Release
```

Verificado em 31/08/2026 no iPhone 17 Pro (iOS 26.5): com o Metro desligado e a porta
8081 livre, o app abre pelo ícone, entra em Modo demonstração e roda a jornada inteira.
É o cenário mais seguro para o dia: não depende de rede nem de nenhum processo no
MacBook.

O primeiro `expo run:ios` gera a pasta nativa `ios/` (prebuild + CocoaPods) e demora
vários minutos. A pasta `ios/` não é versionada: é artefato local e pode ser recriada
com `rm -rf ios && npx expo prebuild --platform ios`.

## Rodando a demo com o painel

1. Suba o servidor (`demo-server`) e abra `http://localhost:4000/panel/`.
2. Suba o app. O selo no rodapé deve indicar conexão com o painel.
3. No painel, ajuste a **velocidade** (1x para o ensaio real; 20x/60x para conferir
   o roteiro inteiro rápido) e clique em **Iniciar cenário**.
4. O roteiro tem 36 passos e cobre os 5 atos automaticamente. Para dirigir à mão:
   - **Fases da jornada** — pula direto para Em casa / A caminho / No terminal /
     A bordo / Chegou.
   - **Disparar cenas** — trânsito ruim, risco de perda, troca de plataforma 45→48,
     atraso de 25 min, aproximação de Aparecida, chegada.
   - **Relógio simulado** — define o horário do cenário (time travel).
   - **Pausar / Retomar** congelam o relógio sem perder o estado.

O painel e o modo auto-play emitem exatamente os mesmos eventos, então o
comportamento do app é idêntico nos dois modos.

## Rodando em auto-play (sem servidor)

Não suba o `demo-server`. Abra só o app:

```bash
cd projeto/app
npx expo start
```

O cliente WebSocket tenta conectar 3 vezes (backoff de ~3 s no total); ao desistir,
o roteiro embutido assume e a jornada acontece igual. O selo passa a exibir
**"Modo demonstração"**.

Isso também é o fallback de rede: se o Wi-Fi cair no meio da apresentação, o app
migra sozinho para o roteiro embutido.

**A volta é automática.** Depois da desistência o cliente continua tentando em
segundo plano a cada 15 s, sem limite de tentativas. Quando o servidor sobe, a
próxima tentativa conecta, o auto-play é desligado e o painel reassume a demo —
sem reiniciar o app. Medido em ensaio: o selo voltou para **"Painel ao vivo"**
em ~17 s após o servidor subir de novo (até 15 s de espera pelo próximo ciclo,
mais o handshake).

## Bilhete offline

O bilhete e o itinerário são gravados em cache local (AsyncStorage) e reidratados
no boot, antes de qualquer rede. Para demonstrar: ative o modo avião e abra a tela
do bilhete — o QR aparece e o selo **"Disponível sem internet"** fica visível.

## Comandos de qualidade

A partir de `projeto/` (roda em todos os workspaces):

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Jest (app) + Vitest (demo-server)
```

Por pacote, se precisar isolar:

```bash
npm run lint --workspace app
npm run typecheck --workspace @jornada/demo-server
npm test --workspace app
```

O workspace `shared` tem `lint` e `typecheck`, mas não tem suíte própria: seus
datasets são cobertos pelos testes do `demo-server`.

## Notas de execução

- `npx expo start --web` **não funciona**: `react-native-maps` não tem
  implementação web e quebra o bundle. Os alvos são simulador iOS e celular físico.
- Para conferir que o app empacota sem erro sem abrir simulador:
  `npx expo export --platform ios --output-dir /tmp/iosdist`.

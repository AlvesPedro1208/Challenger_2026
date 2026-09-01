# Runbook da apresentação — Jornada Viva

> Documento operacional. Serve para a entrega FIAP de **13/09/2026 (domingo)** e,
> depois, para o evento **Next**. Feito para ser seguido passo a passo sob pressão,
> na ordem em que está escrito.
>
> Referências: `../../projeto/README.md` · `Specs/2026-08-29-spec-mvp-demo.md` ·
> `../Planejamento/plano-mvp-jornada-viva.md` · `../Contexto/04-stack-tecnica.md`

---

## 1. Resumo em cinco linhas

A demo é a jornada noturna São Paulo (Tietê) → Rio de Janeiro (Novo Rio), saída 22:30,
contada em cinco atos dentro de um app iOS que reage a eventos em tempo real.
Existem **dois modos de rodar**: (1) **painel ao vivo** — um servidor no MacBook manda
eventos por WebSocket e o operador dirige a demo pelo navegador; (2) **auto-play** —
um roteiro embutido no próprio app, que roda os cinco atos sozinho, sem servidor e sem rede.
O app em build **Release** abre pelo ícone, tenta o servidor, e cai em auto-play sozinho
se não achar ninguém; quando o servidor aparece, ele reconecta em ~15 s sem reiniciar.

**Consequência prática:** o auto-play é a rede de segurança de tudo o que está neste
runbook. Nenhuma falha de infraestrutura mata a apresentação — no pior caso ela vira
uma demo que roda sozinha enquanto o apresentador narra.

---

## 2. Contagem regressiva

### O risco número 1 do projeto: o app expira em 7 dias

A instalação no iPhone físico usa **Apple ID gratuito**. O perfil de provisionamento
gratuito da Apple **expira em 7 dias corridos** a partir da assinatura do build. Quando
expira, o app **não abre**: o iOS mostra "O desenvolvedor não é mais confiável" ou o app
simplesmente fecha na abertura. Não há aviso prévio, não há como renovar sem o MacBook.

**Aritmética para 13/09:**

| Dia da instalação | Expira em | Serve para 13/09? |
|---|---|---|
| 05/09 (sábado) | 12/09 | **NÃO** — morre na véspera |
| 06/09 (domingo) | 13/09 | **NÃO** — expira no próprio dia, risco inaceitável |
| 11/09 (sexta) | 18/09 | Sim, com folga de 5 dias |
| **12/09 (sábado)** | **19/09** | **Sim — data recomendada** |

**Regra fixa: reinstalar no iPhone no dia 12/09.** Qualquer build anterior a 07/09 está
morto no dia da apresentação. A mesma regra vale para o Next: reinstalar na véspera do
evento, sempre.

Mitigação estrutural (avaliar se houver orçamento): conta paga do Apple Developer
Program (US$ 99/ano) emite perfis de 1 ano e elimina este risco por completo. Sem ela,
o item "reinstalar na véspera" é obrigatório em todo evento.

### T-7 dias (06/09, domingo) — ensaio geral com tudo montado

- [ ] Repositório está em caminho **sem espaços**. Confirmar:
      `pwd` dentro de `projeto/` não pode conter espaço. O caminho correto é
      `~/Documents/Challenger2026`. Com espaço, o build nativo iOS falha em silêncio
      (o script `get-app-config-ios.sh` sai com código 0 sem gerar o app.config).
- [ ] Runtime de simulador iOS instalado:
      ```bash
      xcrun simctl list runtimes
      ```
      Se a saída vier vazia, **pare tudo e resolva agora**: Xcode › Settings › Components,
      ou `xcodebuild -downloadPlatform iOS` (pede senha de administrador). É download de
      vários GB — não dá para fazer no dia.
- [ ] Dependências e gates verdes:
      ```bash
      cd ~/Documents/Challenger2026/projeto
      npm install
      npm run lint && npm run typecheck && npm test
      ```
- [ ] Build Release de ensaio no iPhone (ver procedimento em T-1). Este build vai expirar
      em 13/09 — é **ensaio**, não é o build da apresentação.
- [ ] Ensaio completo dos 5 atos **no modo painel**, cronometrado.
- [ ] Ensaio completo dos 5 atos **em auto-play**, com o servidor desligado.
- [ ] Testar o modo avião na tela do bilhete (Ato 3): o QR tem que aparecer.
- [ ] Instalar as ferramentas de túnel:
      ```bash
      brew install cloudflared
      # alternativa/backup:
      brew install ngrok
      ```

### T-2 dias (11/09, sexta) — ensaio do túnel e do projetor

- [ ] Subir servidor + túnel e conectar o iPhone pela URL do túnel (procedimento
      completo na seção 3). Confirmar que o selo do app vira **"Painel ao vivo"**.
- [ ] Testar o espelhamento do iPhone no projetor/telão que será usado. Se for
      QuickTime via cabo, testar com o cabo real. Se for AirPlay, lembrar que ele
      depende de rede — preferir cabo.
- [ ] Conferir contraste no projetor: o skeleton da tela de estatísticas precisa
      ler como "carregando", não como "travou". Se ler como travado, ajustar antes.
- [ ] Escrever as falas-chave (seção 4) em um cartão físico. Não confiar em improviso.
- [ ] Definir quem é o **operador** (mexe no painel, olha o MacBook) e quem é o
      **apresentador** (fala, segura o celular). São duas pessoas. Se for uma só,
      ensaiar em auto-play, que não exige operador.

### T-1 dia (12/09, sábado) — o build que vai ser apresentado

Este é o dia mais importante da contagem regressiva.

- [ ] Conectar o iPhone ao MacBook por **cabo**.
- [ ] Gerar e instalar o build Release:
      ```bash
      cd ~/Documents/Challenger2026/projeto/app
      npx expo run:ios --configuration Release --device
      ```
      O `--device` faz o Xcode listar os dispositivos físicos conectados. Selecionar o
      iPhone do time. Se for o primeiro build depois de um `prebuild`, ele demora vários
      minutos (CocoaPods + compilação).
- [ ] No iPhone, confiar no certificado: Ajustes › Geral › VPN e Gerenciamento de
      Dispositivo › Apple Development: <e-mail> › Confiar. Sem isso o app não abre.
- [ ] **Matar o Metro e fechar o terminal.** Abrir o app **pelo ícone**, com o MacBook
      desligado ou desconectado. Ele tem que abrir e entrar em **Modo demonstração**
      sozinho. Se aparecer tela vermelha `No script URL provided`, o build está em
      Debug — refazer com `--configuration Release`.
- [ ] Rodar a demo inteira **uma vez** pelo ícone, até o Ato 5. Isso grava o cache
      offline do bilhete e do itinerário no dispositivo.
- [ ] Anotar no cartão: **build assinado em 12/09, válido até 19/09**.
- [ ] Carregar o iPhone a 100%. Desativar atualização automática de iOS.
- [ ] Ativar **Não Perturbe** e **Modo Guiado** (ver seção 7).
- [ ] Levar na mochila: MacBook, carregador do MacBook, cabo USB-C/Lightning do iPhone,
      adaptador de vídeo do projetor, e o **roteiro impresso**.

---

## 3. Preparação no dia — ordem exata

Comece 60 minutos antes. A ordem importa: cada peça depende da anterior.

### Passo 0 — decidir o modo (2 min)

Olhe o ambiente e escolha:

- **Wi-Fi da sala é confiável e você tem 15 min de setup?** → modo painel.
- **Sala apertada, sem tempo, Wi-Fi duvidoso, ou você está sozinho?** → **auto-play puro.**
  Nesse caso, pule para o Passo 5, abra o app pelo ícone e acabou. É um modo legítimo e
  ensaiado, não um plano B envergonhado.

O modo painel só existe para permitir improviso ("e se o ônibus atrasar?"). Se ninguém
vai improvisar, o auto-play entrega a mesma demo com um décimo do risco.

### Passo 1 — servidor (3 min)

```bash
cd ~/Documents/Challenger2026/projeto/demo-server
npm run dev
```

Esperado no terminal: o Fastify anuncia que está escutando em `0.0.0.0:4000`.

Confirmar em outro terminal:

```bash
curl -s http://localhost:4000/api/health
# esperado: {"status":"ok"}

curl -s http://localhost:4000/api/engine
# esperado: JSON com o estado do engine (running, step, clock, speed)
```

Se a porta 4000 estiver ocupada:

```bash
lsof -ti:4000 | xargs kill -9
```

### Passo 2 — túnel (3 min)

O iPhone físico **não** alcança o MacBook por `localhost`, e em build Release o app não
tem como descobrir o IP da LAN (isso vinha do Metro, que não existe mais). O iOS também
exige `https`/`wss` para conexões externas. Por isso a decisão foi **túnel**, não VPS.

**Cloudflare (preferido):**

```bash
cloudflared tunnel --url http://localhost:4000
```

Ele imprime uma URL do tipo `https://<palavras-aleatorias>.trycloudflare.com`.
**Essa URL muda a cada execução** — não adianta anotar de véspera.

**ngrok (backup):**

```bash
ngrok http 4000
```

Anote a URL `https://...` da linha "Forwarding".

Validar o túnel antes de tocar no celular:

```bash
curl -s https://<sua-url-do-tunel>/api/health
# esperado: {"status":"ok"}
```

Se isso não retornar `{"status":"ok"}`, **não siga**: o problema está no túnel, não no app.

### Passo 3 — painel (2 min)

Abrir no navegador do MacBook:

```
http://localhost:4000/panel/
```

Esperado no topo do painel: **Conexão: conectado** (bolinha acesa) e o bloco **Engine**
mostrando estado, passo, relógio simulado e velocidade.

Ajustes antes de começar:

- **Velocidade**: `1x` para a apresentação real. `20x`/`60x` só para conferir o roteiro
  inteiro rapidinho no ensaio.
- **Relógio simulado**: deixar em `2026-09-13T20:00` e clicar em **Definir relógio**.
  É o horário em que o Ato 1 começa.

Deixar a janela do painel em uma tela que a banca **não** vê. Se houver só um monitor,
usar espaços/desktops separados e nunca espelhar o MacBook — espelhe o **celular**.

### Passo 4 — apontar o app para o túnel (2 min)

No iPhone, abrir o app pelo ícone, entrar na **tela de configuração** e colar a URL do
túnel (`https://<...>.trycloudflare.com`). Salvar.

Esperado: o selo no canto superior do app muda de **"Modo demonstração"** (roxo) para
**"Painel ao vivo"** (verde). Isso pode levar até ~15 s, porque o app só tenta reconectar
a cada 15 s depois de ter desistido no boot. **Não reinicie o app** achando que travou —
espere os 15 s.

Confirmação cruzada, no painel: o contador de clientes/log deve registrar a conexão do
app. Dispare um evento inofensivo para testar o canal — por exemplo o botão de fase
**Em casa** — e veja o app reagir.

### Passo 5 — espelhamento e posição (3 min)

- Espelhar **o iPhone**, não o MacBook. Cabo é mais confiável que AirPlay.
- Se for QuickTime: Arquivo › Nova Gravação de Filme › escolher o iPhone como fonte.
- Brilho do iPhone no máximo, bloqueio automático desativado
  (Ajustes › Tela e Brilho › Bloqueio Automático › Nunca).
- **Não** espelhe a tela do MacBook em momento algum: é onde está o painel, e ver o
  operador clicando "Risco de perda" destrói a ilusão da demo.

---

## 4. Roteiro dos cinco atos

O roteiro completo tem 36 passos e dura **cerca de 3 min 45 s em velocidade 1x** —
tanto no painel (botão **Iniciar cenário**) quanto em auto-play. Os números abaixo são
os mesmos nos dois modos, porque painel e auto-play emitem exatamente os mesmos eventos.

**Como começar:**
- Painel: clicar **Iniciar cenário**. O roteiro avança sozinho; os botões de cena servem
  para **repetir** ou **antecipar** um momento, não para tocar a demo passo a passo.
- Auto-play: abrir o app pelo ícone. Começa sozinho depois de ~3 s de tentativa de conexão.

| Ato | Marca (1x) | O que o operador faz | O que a banca vê |
|---|---|---|---|
| 1 | 0 s – 19 s | **Iniciar cenário** (ou cenas **Trânsito ruim** e **Risco de perda**) | Home com a viagem ativa e contagem para a saída; alerta de trânsito na Marginal Tietê; card de risco **38%** de perder o embarque, com remarcação (taxa R$ 20) ou cancelamento (retenção 5%) |
| 2 | 20 s – 33 s | Fase **A caminho do terminal** | Transição para o deslocamento; ETA até o terminal (52 min no alerta) |
| 3 | 34 s – 54 s | Fase **No terminal**, cena **Troca de plataforma** | Modo Terminal com o mapa indoor; banner rosa **plataforma 45 → 48**, **4 min a pé**, rota indoor recalculada. Aqui entra o **modo avião**: abrir o bilhete e mostrar o QR com o selo "Disponível sem internet" |
| 4 | 55 s – 218 s | Fase **A bordo**, depois cenas **Atraso 25 min** e **Aproximando de Aparecida** | Ônibus se movendo no mapa da Via Dutra; ETA muda de **06:10** para **06:35** quando entra o **atraso de 25 min** (obras no km 150); parada de apoio em Aparecida com card na tela por **~20 s**, depois Resende; tela de estatísticas com risco %, tempo médio e histograma de pontualidade de 60 dias |
| 5 | 219 s – fim | Fase **Chegou** / cena **Chegada** | Chegada no Novo Rio às **06:35**; boas-vindas contextual por horário, recomendações e estatísticas pessoais da rota |

### Números que precisam aparecer na tela

Se algum destes não aparecer, algo saiu do roteiro:

- Risco de perder o embarque: **38%**
- Taxa de remarcação: **R$ 20** · retenção no cancelamento: **5%**
- Plataforma: **45 → 48**, **4 minutos** a pé
- Atraso: **25 min**, motivo "obras na pista na Via Dutra, km 150"
- ETA de chegada: **06:10** antes do atraso, **06:35** depois
- Paradas de apoio: Aparecida e Resende, card na tela por **~20 s** cada
- Chegada: **06:35** no Terminal Novo Rio

### Falas-chave (banca de Data/IA)

Use estas frases nos momentos indicados. Elas são o que transforma uma demo bonita em
uma demo defensável para quem trabalha com dados.

**Ato 1, no card de 38%:**
> "Esse 38% não é um número decorativo. É a probabilidade de perder o embarque, calculada
> a partir do tempo de deslocamento com o trânsito atual contra a janela até a saída.
> E o app não para no diagnóstico: ele já traz a ação — remarcar dentro das regras da ANTT,
> com taxa, ou cancelar dentro do prazo legal, com a retenção de 5%. O dado vira decisão."

**Ato 3, na troca de plataforma:**
> "A troca de plataforma é o evento que mais gera perda de embarque em terminal grande.
> Aqui ele chega como push, com a rota indoor recalculada e o custo em minutos: 4 minutos
> a pé. O passageiro sabe se dá tempo antes de começar a correr."

**Ato 3, no modo avião:**
> "Vou colocar em modo avião. O bilhete continua aqui. Rodoviária é ambiente de sinal ruim —
> o embarque não pode depender de rede."

**Ato 4, no atraso e na tela de estatísticas:**
> "Chegou um atraso de 25 minutos e a chegada foi de 06:10 para 06:35. O interessante é o
> que está atrás: pontualidade histórica do trecho em 60 dias, tempo médio e a distribuição
> completa. Não é uma promessa de horário, é uma distribuição — e é assim que a gente
> comunica incerteza para o passageiro em vez de esconder."

**Ato 5, no fechamento:**
> "Toda a jornada foi movida por eventos, não por telas hardcoded. O mesmo contrato de
> eventos que o painel dispara é o que o app consome. Trocar o simulador por telemetria
> real da frota é substituir o produtor de eventos, não reescrever o app."

**Fecho sobre o simulador (ninguém deve descobrir isso sozinho — diga você):**
> "A telemetria aqui é simulada e os datasets são sintéticos, por decisão de escopo.
> O que é real é a arquitetura: mapa real, rota real, contrato de eventos real."

---

## 5. Plano B

Regra geral: **nenhuma falha justifica reiniciar o app na frente da banca**, exceto a
falha do próprio app. O auto-play cobre tudo o mais.

| Falha | O que você vê | Ação | Custo |
|---|---|---|---|
| **Wi-Fi cai** | Selo do app volta para "Modo demonstração"; painel para de responder | **Não faça nada.** O app migra sozinho para o roteiro embutido e continua do ponto certo. Narre normalmente. Se o Wi-Fi voltar, o app reconecta sozinho em ~15 s | **0 s** |
| **Túnel cai** (`cloudflared` morre, URL expira) | Painel continua vivo em `localhost`, mas o celular volta para "Modo demonstração" | Se a demo está boa em auto-play, **deixe assim até o fim**. Se precisar do painel de volta: reexecutar `cloudflared tunnel --url http://localhost:4000`, pegar a **URL nova**, colar na tela de configuração do app | ~60–90 s, e exige mexer no celular na frente da banca |
| **Servidor trava** (`npm run dev` morre ou fica pendurado) | `curl http://localhost:4000/api/health` não responde | O app já caiu em auto-play sozinho. Terminar a demo assim. Só depois: `lsof -ti:4000 \| xargs kill -9` e `npm run dev` de novo; o app reconecta em ~15 s | 0 s para a demo; ~30 s para restaurar o painel |
| **Painel não responde aos cliques** | Botões clicam e nada acontece; "Conexão: desconectado" no topo | Recarregar a página `http://localhost:4000/panel/` (Cmd+R). Se persistir, dirigir por `curl` (apêndice A) | ~15 s |
| **App não abre / fecha na abertura** | Ícone abre e fecha, ou aviso de desenvolvedor não confiável | **Isto é a expiração de 7 dias.** Não tem conserto no local sem MacBook + cabo + ~10 min. Plano imediato: abrir o app no **simulador iOS** do MacBook e espelhar o MacBook. Prevenção: a reinstalação de 12/09 | 10–15 min se tentar reinstalar; ~2 min pelo simulador |
| **Tela vermelha `No script URL provided`** | Fundo vermelho com texto de erro do RN | O build instalado é Debug, não Release. No local: subir o Metro (`npx expo start` em `projeto/app`) e reabrir pelo deep link. É paliativo feio; a correção é build Release | ~2 min |
| **Espelhamento cai** | Projetor perde a imagem do iPhone | Trocar para o **simulador iOS no MacBook** e espelhar o MacBook. O simulador roda a mesma demo, painel ou auto-play | ~2 min |
| **Bateria do iPhone acabando** | Aviso de 20% no meio da demo | Cabo ligado desde antes de começar. Se não houver, terminar em auto-play e cortar as digressões | — |

**Fallback definitivo:** rodar tudo no simulador iOS do MacBook, em auto-play, espelhando
o MacBook. Não depende de celular, de rede, de túnel nem de assinatura. Tenha o simulador
já aberto e com o app instalado antes de subir ao palco.

```bash
cd ~/Documents/Challenger2026/projeto/app
npx expo run:ios --configuration Release   # instala no simulador
```

---

## 6. Checklist dos 10 minutos finais

Marque tudo. Se algum item falhar, você ainda tem tempo de cair para o auto-play.

- [ ] iPhone com bateria acima de 80% e cabo à mão
- [ ] iPhone: brilho no máximo, Bloqueio Automático em "Nunca", **Não Perturbe ligado**
- [ ] App abre **pelo ícone** e entra em Modo demonstração ou Painel ao vivo (sem tela vermelha)
- [ ] Espelhamento do iPhone aparecendo no projetor, em retrato, sem corte
- [ ] `curl -s http://localhost:4000/api/health` retorna `{"status":"ok"}` (se for usar painel)
- [ ] `curl -s https://<url-do-tunel>/api/health` retorna `{"status":"ok"}` (se for usar painel)
- [ ] Painel aberto em `http://localhost:4000/panel/` com "Conexão: conectado"
- [ ] Velocidade da simulação em **1x** e relógio definido em `2026-09-13T20:00`
- [ ] Selo do app confirmado como **"Painel ao vivo"** após um evento de teste
- [ ] Simulador iOS aberto no MacBook, com o app instalado, como plano B silencioso

---

## 7. O que NÃO fazer durante a demo

**No celular**

1. **Não deslize para cima até o seletor de apps.** Um deslize longo demais, ou um
   deslize lateral na barra inferior, tira o app do primeiro plano; puxar de volta pelo
   seletor com um gesto errado **encerra o app**, e reabrir custa a demo inteira.
   Prevenção: ative o **Modo Guiado** (Ajustes › Acessibilidade › Modo Guiado; triplo
   clique no botão lateral para ativar na tela do app). Ele trava o app em primeiro plano.
2. **Não navegue à mão no meio de uma transição de fase.** O app se protege por
   5 segundos depois de qualquer navegação manual — nesse intervalo, um comando do
   painel que **volta** para um ato anterior é descartado, não enfileirado. Se você
   tocou em algo e o operador precisa rebobinar, **espere 5 segundos** e peça de novo.
   Avanços de ato (ir para frente no roteiro) sempre passam, independentemente do toque.
3. **Não reinicie o app porque o selo demorou a mudar.** A reconexão ao painel leva até
   ~15 s por desenho. Reiniciar joga fora o estado da jornada e volta ao Ato 1.
4. **Não abra a Central de Controle nem a central de notificações** durante o
   espelhamento — some com a tela e mostra notificações pessoais.
5. **Não desative o modo avião correndo** depois do Ato 3. Deixe o público ver o QR
   por alguns segundos antes; é o momento mais convincente da demo.

**No MacBook**

6. **Não espelhe a tela do MacBook.** É onde está o painel. Ver os botões "Risco de
   perda" e "Atraso 25 min" sendo clicados apaga o efeito da demo.
7. **Não clique em cenas fora de ordem.** Disparar "Chegada" no Ato 2 leva o app direto
   para a tela final e não há como voltar sem rebobinar a fase.
8. **Não mude a velocidade no meio do roteiro.** 20x/60x é ferramenta de ensaio; ao vivo,
   acelera os eventos e some com os cards antes de você narrar.
9. **Não mate o `npm run dev` para "reiniciar rapidinho".** O app cai em auto-play e
   reassume o roteiro do zero do ato atual; se você não precisava disso, criou um problema.
10. **Não rode `npm install`, `expo prebuild` ou qualquer build no dia.** Nada é
    reinstalado, atualizado ou "só verificado" no dia da apresentação.

**De discurso**

11. **Não apresente o dado simulado como real.** Diga você mesmo que a telemetria é
    simulada e explique a arquitetura de eventos — para uma banca de Data, honestidade
    sobre a fonte vale mais do que a ilusão.

---

## Apêndice A — dirigir a demo por `curl` (painel morto)

Todos os comandos vão para `POST /api/command`. Substitua `localhost:4000` pela URL do
túnel se estiver operando de fora do MacBook.

```bash
API=http://localhost:4000/api/command

# Iniciar o roteiro completo
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"START_SCENARIO"}'

# Pausar / retomar
curl -s -X POST $API -H 'content-type: application/json' -d '{"type":"PAUSE"}'
curl -s -X POST $API -H 'content-type: application/json' -d '{"type":"RESUME"}'

# Velocidade
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"SET_SPEED","multiplier":1}'

# Relógio simulado
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"SET_CLOCK","isoTime":"2026-09-13T20:00:00-03:00"}'

# Pular para uma fase (HOME | EN_ROUTE_TERMINAL | TERMINAL | ONBOARD | ARRIVED)
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"FIRE_EVENT","event":{"type":"PHASE_CHANGE","at":"2026-09-13T21:40:00-03:00","phase":"TERMINAL"}}'

# Cena: risco de perda (38%)
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"FIRE_EVENT","event":{"type":"RISK_UPDATE","at":"2026-09-13T20:05:00-03:00","riskPct":38,"canRebook":true,"rebookFeeBRL":20,"refundDeadlineIso":"2026-09-13T21:30:00-03:00","refundRetentionPct":5}}'

# Cena: troca de plataforma 45 -> 48
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"FIRE_EVENT","event":{"type":"PLATFORM_CHANGE","at":"2026-09-13T21:55:00-03:00","from":"45","to":"48","walkMinutes":4}}'

# Cena: atraso de 25 min
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"FIRE_EVENT","event":{"type":"DELAY_UPDATE","at":"2026-09-14T00:40:00-03:00","delayMin":25,"reason":"Obras na pista na Via Dutra, km 150"}}'

# Cena: chegada
curl -s -X POST $API -H 'content-type: application/json' \
  -d '{"type":"FIRE_EVENT","event":{"type":"ARRIVAL","at":"2026-09-14T06:34:00-03:00","terminalId":"novo-rio"}}'
```

Estado do engine a qualquer momento:

```bash
curl -s http://localhost:4000/api/engine
```

---

## Apêndice B — endereços e portas

| Peça | Endereço |
|---|---|
| API + WebSocket | `http://localhost:4000` (escuta em `0.0.0.0`) |
| Painel do operador | `http://localhost:4000/panel/` |
| Health check | `http://localhost:4000/api/health` → `{"status":"ok"}` |
| Bootstrap REST | `http://localhost:4000/api/bootstrap` |
| Estado do engine | `http://localhost:4000/api/engine` |
| WebSocket de eventos | `ws://localhost:4000/ws` (pelo túnel: `wss://.../ws`) |
| Metro (só em desenvolvimento) | `http://localhost:8081` |
| Bundle identifier iOS | `br.com.jornadaviva.app` |

A porta 4000 está fixa no app (`app/src/services/connection.ts`, constante `SERVER_PORT`).
Subir o servidor em outra porta com `PORT=4100 npm run dev` exige que a URL informada na
tela de configuração do app carregue a porta certa — no túnel isso é transparente, porque
a URL do túnel não expõe porta.

---

## Apêndice C — levando para o Next

A mesma contagem regressiva se repete, com um único ajuste de calendário:

1. **Reinstalar o app no iPhone na véspera do evento.** Sem exceção. O build de 12/09
   estará expirado.
2. Refazer o ensaio de túnel no local, porque a URL do quick tunnel é nova a cada execução.
3. Reconferir o espelhamento com o equipamento do evento — costuma ser diferente do da FIAP.
4. Se o Next tiver mais de uma apresentação em dias diferentes, avaliar seriamente a conta
   paga do Apple Developer Program: um perfil de 1 ano elimina o único risco operacional
   que não tem plano B no local.

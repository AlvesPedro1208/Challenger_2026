# Produto — Ideia Geral (ESCOPO CANÔNICO)

> Atenção: este arquivo é a **fonte única de verdade do escopo**. Vem do `ideia_geral.txt`
> do time. Qualquer feature fora daqui (inclusive as do deck legado "Embarque Vivo")
> NÃO faz parte do projeto até ser adicionada aqui explicitamente.

O produto é um app (React Native) que acompanha o passageiro rodoviário em toda a
jornada — antes, durante e depois da viagem — no espírito do que o Flighty faz para
aviação, aplicado a ônibus e integrado ao desafio ClickBus.

## Módulo 1 — Gestão Pré-Embarque e Prevenção de Atrasos

**Alerta de Risco de Perda do Embarque**: o app monitora a localização atual do usuário,
o horário e o trânsito até a rodoviária. Ao detectar risco de atraso, oferece:

- **Remarcação direta** — troca de passagem respeitando regras da ANTT/viação
  (ex.: taxa de remarcação).
- **Cancelamento com reembolso** — exibe prazo limite legal e retenção de até 5%
  (conforme regulação vigente).

## Módulo 2 — Rastreamento e Previsão em Tempo Real ("Onde Está Meu Ônibus?")

- **GPS colaborativo (crowdsourced)**: localização do veículo pela telemetria (GPS) +
  sinal dos passageiros embarcados.
- **Previsões inteligentes**: chegada à plataforma, partida e chegada ao destino,
  combinando velocidade média, clima e tráfego/acidentes (Google Maps API).
- **Pontualidade histórica do trecho** (últimos 60 dias): Risco de Atraso %, Tempo
  Médio de Atraso, Amostragem/Confiabilidade e Histograma de Pontualidade.

## Módulo 3 — Experiência Durante a Viagem & Paradas

- **Mapa e linha do tempo da viagem**: próximas paradas e tempo estimado de permanência.
- **Notificação de proximidade**: push "Próxima parada em 20 min" para o passageiro
  se preparar.
- **Detecção automática de pontos de apoio**: algoritmo identifica paradas e duração
  pela parada prolongada dos passageiros, enriquecido com dados de estabelecimentos
  via Google Places API.

## Módulo 4 — Chegada ao Destino e Serviços Locais

- **Boas-vindas contextual**: mensagem ao desembarcar com recomendações de
  alimentação/serviços conforme horário (café/almoço/jantar) e bem avaliados no Google.
- **Histórico pessoal de rotas**: estatísticas do usuário naquela rota (viagens,
  km percorridos, tempo).

## Módulo 5 — Navegação Interna na Rodoviária (Indoor Navigation)

- Mapas 2D vetoriais detalhados das rodoviárias (guichês, banheiros, praça de
  alimentação, plataformas), usando geofencing e sinal Wi-Fi/Bluetooth para navegação.
- **Modo automático**: ao entrar na rodoviária, a visão de mapa do app muda sozinha
  para o mapa indoor.
- Adicional: indicação de áreas seguras de espera e pontos de app de transporte na
  rodoviária de chegada.

## Módulo 6 (complementar) — Modo Offline

Trechos rodoviários frequentemente ficam sem sinal de internet.

- Armazenamento local (offline) do bilhete com QR Code de embarque e do itinerário
  com as paradas da viagem.

## Conexão com o desafio ClickBus

| Problema ClickBus (kickoff) | Módulo que responde |
|---|---|
| Falta de info em tempo real (atrasos/plataforma) | 2 |
| Desorientação em grandes rodoviárias | 5 |
| Passageiros chegam atrasados ao portão | 1 |
| Dependência de atendimento humano | 1, 2, 4 |
| Acessibilidade / assistência contextual | 3, 4, 5 |
| Validação manual / filas | 6 (bilhete QR offline) |

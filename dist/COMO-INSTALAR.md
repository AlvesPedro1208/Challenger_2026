# Jornada Viva — como rodar o app no seu Mac

O arquivo `JornadaViva-simulador.zip` contem o app compilado para o **Simulador do iOS**.
Nao precisa de Apple ID, cabo, nem conta de desenvolvedor.

> Importante: e um build de **simulador**. Ele NAO instala em iPhone fisico.

## Pre-requisitos

1. **Xcode** instalado (App Store).
2. **Um runtime de iOS instalado.** Confira no terminal:

```bash
xcrun simctl list runtimes
```

Se a lista vier vazia, abra o Xcode em Settings > Components e instale um iOS Simulator.
Sem runtime nao existe simulador para rodar.

## Instalacao

1. Descompacte o zip. Voce vai ter uma pasta `JornadaViva.app`.
2. Abra o Simulador (Xcode > Open Developer Tool > Simulator) e escolha um iPhone.
3. Arraste `JornadaViva.app` para dentro da janela do simulador.
4. O icone aparece na tela inicial. Toque para abrir.

Alternativa por terminal, se preferir:

```bash
xcrun simctl boot "iPhone 17 Pro"
open -a Simulator
xcrun simctl install booted /caminho/para/JornadaViva.app
xcrun simctl launch booted br.com.jornadaviva.app
```

## O que voce vai ver

O app abre sozinho em **Modo demonstracao** (selo roxo no canto superior direito) e
reproduz a jornada completa de Sao Paulo para o Rio de Janeiro, em cerca de 4 minutos:

1. Em casa: alerta de transito e risco de perder o embarque, com opcoes de remarcar
   ou cancelar segundo as regras da ANTT.
2. Na rodoviaria: mapa interno do Terminal Tiete e mudanca de plataforma 45 para 48.
3. Embarque: bilhete com QR Code, que funciona sem internet.
4. Viagem: onibus se movendo na Via Dutra, atraso, paradas de apoio com estabelecimentos.
5. Chegada: boas-vindas conforme o horario e recomendacoes no destino.

Use a barra inferior para navegar entre Viagem, Mapa, Bilhete e Pontualidade a
qualquer momento.

Para assistir de novo do inicio, feche o app pelo multitarefa e abra outra vez.

## Se aparecer tela vermelha

Significa que ficou um build antigo instalado. Apague o app do simulador
(toque longo no icone > Remover) e instale de novo.

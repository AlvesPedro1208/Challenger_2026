"use strict";

(function () {
  var API_BASE = window.location.origin;
  var WS_URL =
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/ws";
  var SCENARIO_ID = "sp-rio-nightly";
  var LOG_LIMIT = 200;
  var POLL_MS = 2000;

  // Departure of the demo trip (shared/src/data/trip.ts). The refund deadline
  // is derived from the simulated clock, capped at departure, so the scene is
  // never fired already expired.
  var DEPARTURE_ISO = "2026-09-13T22:30:00-03:00";
  var REFUND_WINDOW_MS = 60 * 60 * 1000;

  var engineState = null;
  var activePhase = null;

  var el = {
    wsDot: document.getElementById("ws-dot"),
    wsStatus: document.getElementById("ws-status"),
    engineStatus: document.getElementById("engine-status"),
    engineStep: document.getElementById("engine-step"),
    engineClock: document.getElementById("engine-clock"),
    engineSpeed: document.getElementById("engine-speed"),
    log: document.getElementById("log"),
    logFollow: document.getElementById("log-follow"),
    toasts: document.getElementById("toasts"),
    clockInput: document.getElementById("clock-input"),
  };

  // ---------------------------------------------------------------- helpers

  // Normalize to the demo timezone (Sao Paulo, UTC-03:00) so the `at` stamp of
  // fired events matches the times written in the scenario script.
  function toSaoPauloIso(ms) {
    return new Date(ms - 3 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "-03:00");
  }

  /** Current simulated time in epoch ms, falling back to wall time. */
  function simNowMs() {
    var iso = engineState && engineState.clockIso;
    var ms = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(ms) ? Date.now() : ms;
  }

  function simNowIso() {
    return toSaoPauloIso(simNowMs());
  }

  /**
   * Refund deadline relative to the simulated clock: one hour ahead, never past
   * departure, and never in the past even if the clock is already past it.
   */
  function refundDeadlineIso() {
    var nowMs = simNowMs();
    var deadlineMs = Math.min(nowMs + REFUND_WINDOW_MS, Date.parse(DEPARTURE_ISO));
    if (deadlineMs <= nowMs) deadlineMs = nowMs + REFUND_WINDOW_MS;
    return toSaoPauloIso(deadlineMs);
  }

  // Scenario steps carry `at` with an explicit -03:00 offset, while the engine
  // emits interpolated telemetry with `at` in UTC. Both are resolved to Sao
  // Paulo wall time here, so the log stays monotonic whatever the form.
  function spTimeParts(iso) {
    if (typeof iso !== "string") return null;
    var ms = Date.parse(iso);
    if (Number.isNaN(ms)) return null;
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(ms));
    var out = {};
    for (var i = 0; i < parts.length; i += 1) out[parts[i].type] = parts[i].value;
    return out;
  }

  function simTimeLabel(iso) {
    var p = spTimeParts(iso);
    if (!p) return typeof iso === "string" ? iso : "--:--";
    return p.hour + ":" + p.minute + ":" + p.second;
  }

  function simDateTimeLabel(iso) {
    var p = spTimeParts(iso);
    if (!p) return typeof iso === "string" ? iso : "—";
    return p.day + "/" + p.month + " " + p.hour + ":" + p.minute + ":" + p.second;
  }

  var spClockFormat = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // The engine returns clockIso in UTC; the demo happens in Sao Paulo.
  function engineClockLabel(iso) {
    if (typeof iso !== "string") return "—";
    var ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return spClockFormat.format(new Date(ms));
  }

  function toast(message, ok) {
    var node = document.createElement("div");
    node.className = "toast" + (ok ? " toast-ok" : "");
    node.textContent = message;
    el.toasts.appendChild(node);
    setTimeout(function () {
      node.remove();
    }, 5000);
  }

  // ---------------------------------------------------------------- commands

  function sendCommand(command, okMessage) {
    return fetch(API_BASE + "/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok || body.ok === false) {
            throw new Error(body.error || "HTTP " + res.status);
          }
          if (body.state) applyEngineState(body.state);
          if (okMessage) toast(okMessage, true);
          return body;
        });
      })
      .catch(function (err) {
        toast("Falha ao enviar comando: " + err.message);
        throw err;
      });
  }

  function fireEvent(event, okMessage) {
    return sendCommand({ type: "FIRE_EVENT", event: event }, okMessage);
  }

  // ------------------------------------------------------------- status bar

  function applyEngineState(state) {
    engineState = state;

    var statusLabels = {
      idle: "aguardando",
      running: "rodando",
      paused: "pausado",
      finished: "concluído",
    };
    el.engineStatus.textContent = statusLabels[state.status] || state.status;
    el.engineStatus.className = "value pill pill-" + state.status;

    el.engineStep.textContent =
      state.stepCount > 0 ? state.stepIndex + " / " + state.stepCount : "—";
    el.engineClock.textContent = engineClockLabel(state.clockIso);
    el.engineSpeed.textContent = state.speedMultiplier + "x";

    var speedButtons = document.querySelectorAll(".btn-speed");
    speedButtons.forEach(function (btn) {
      btn.classList.toggle(
        "active",
        Number(btn.dataset.speed) === state.speedMultiplier
      );
    });
  }

  function pollEngine() {
    fetch(API_BASE + "/api/engine")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(applyEngineState)
      .catch(function () {
        el.engineStatus.textContent = "sem resposta";
        el.engineStatus.className = "value pill pill-idle";
      });
  }

  setInterval(pollEngine, POLL_MS);
  pollEngine();

  // -------------------------------------------------------------- websocket

  var wsRetryMs = 1000;
  var wsWasConnected = false;

  function setWsStatus(connected, label) {
    el.wsDot.className = "dot " + (connected ? "dot-on" : "dot-off");
    el.wsStatus.textContent = label;
  }

  function connectWs() {
    setWsStatus(false, "conectando...");
    // Handlers close over this socket, so a late error or close from a socket
    // replaced by a reconnect never acts on the current one.
    var socket = new WebSocket(WS_URL);

    socket.onopen = function () {
      wsRetryMs = 1000;
      setWsStatus(true, "conectado");
      if (wsWasConnected) toast("Conexão com o servidor restabelecida", true);
      wsWasConnected = true;
    };

    socket.onmessage = function (msg) {
      var event;
      try {
        event = JSON.parse(msg.data);
      } catch (_err) {
        return;
      }
      if (event.type === "PHASE_CHANGE") setActivePhase(event.phase);
      appendLog(event);
    };

    socket.onclose = function () {
      if (wsWasConnected) toast("Conexão WebSocket perdida, reconectando...");
      setWsStatus(false, "reconectando em " + Math.round(wsRetryMs / 1000) + "s");
      setTimeout(connectWs, wsRetryMs);
      wsRetryMs = Math.min(wsRetryMs * 2, 10000);
    };

    socket.onerror = function () {
      socket.close();
    };
  }

  connectWs();

  // ------------------------------------------------------------------- log

  var CATEGORY_BY_TYPE = {
    CLOCK_SET: "clock",
    PHASE_CHANGE: "phase",
    TRAFFIC_ALERT: "alert",
    DELAY_UPDATE: "alert",
    RISK_UPDATE: "risk",
    PLATFORM_CHANGE: "risk",
    BUS_TELEMETRY: "telemetry",
    STOP_APPROACHING: "stop",
    STOP_DWELL: "stop",
    ARRIVAL: "stop",
  };

  var PHASE_LABELS = {
    HOME: "Em casa",
    EN_ROUTE_TERMINAL: "A caminho do terminal",
    TERMINAL: "No terminal",
    ONBOARD: "A bordo",
    ARRIVED: "Chegou",
  };

  function summarize(event) {
    switch (event.type) {
      case "CLOCK_SET":
        return "Relógio ajustado para " + simDateTimeLabel(event.isoTime);
      case "PHASE_CHANGE":
        return "Fase: " + (PHASE_LABELS[event.phase] || event.phase);
      case "TRAFFIC_ALERT":
        return (
          event.message +
          " (severidade " +
          event.severity +
          ", terminal em " +
          event.etaToTerminalMin +
          " min)"
        );
      case "RISK_UPDATE":
        return (
          "Risco de perder o embarque: " +
          event.riskPct +
          "% — remarcação " +
          (event.canRebook ? "disponível por R$ " + event.rebookFeeBRL : "indisponível") +
          ", reembolso até " +
          simTimeLabel(event.refundDeadlineIso) +
          " (retenção " +
          event.refundRetentionPct +
          "%)"
        );
      case "PLATFORM_CHANGE":
        return (
          "Plataforma " +
          event.from +
          " → " +
          event.to +
          " (" +
          event.walkMinutes +
          " min a pé)"
        );
      case "BUS_TELEMETRY":
        return (
          event.lat.toFixed(4) +
          ", " +
          event.lng.toFixed(4) +
          " — " +
          event.speedKmh +
          " km/h, próxima parada em " +
          event.etaNextStopMin +
          " min, destino " +
          simTimeLabel(event.etaDestinationIso)
        );
      case "DELAY_UPDATE":
        return "Atraso de " + event.delayMin + " min — " + event.reason;
      case "STOP_APPROACHING":
        return "Aproximando de " + event.stopId + " em " + event.inMinutes + " min";
      case "STOP_DWELL":
        return "Parado em " + event.stopId + " por " + event.dwellMinutes + " min";
      case "ARRIVAL":
        return "Chegada ao terminal " + event.terminalId;
      default:
        return JSON.stringify(event);
    }
  }

  function appendLog(event) {
    var empty = el.log.querySelector(".log-empty");
    if (empty) empty.remove();

    var li = document.createElement("li");
    li.className = "log-entry cat-" + (CATEGORY_BY_TYPE[event.type] || "clock");

    var time = document.createElement("span");
    time.className = "log-time";
    time.textContent = simTimeLabel(event.at);

    var type = document.createElement("span");
    type.className = "log-type";
    type.textContent = event.type;

    var summary = document.createElement("span");
    summary.className = "log-summary";
    summary.textContent = summarize(event);

    li.appendChild(time);
    li.appendChild(type);
    li.appendChild(summary);

    el.log.insertBefore(li, el.log.firstChild);
    while (el.log.children.length > LOG_LIMIT) {
      el.log.removeChild(el.log.lastChild);
    }

    if (el.logFollow.checked) {
      el.log.scrollTop = 0;
    }
  }

  function showEmptyLog() {
    el.log.innerHTML = "";
    var li = document.createElement("li");
    li.className = "log-empty";
    li.textContent = "Nenhum evento ainda. Inicie o cenário para começar.";
    el.log.appendChild(li);
  }

  showEmptyLog();

  document.getElementById("btn-clear-log").addEventListener("click", showEmptyLog);

  // Scrolling away from the top turns "seguir" off; scrolling back on again.
  el.log.addEventListener("scroll", function () {
    el.logFollow.checked = el.log.scrollTop <= 4;
  });

  // --------------------------------------------------------------- controls

  document.getElementById("btn-start").addEventListener("click", function () {
    sendCommand(
      { type: "START_SCENARIO", scenarioId: SCENARIO_ID },
      "Cenário iniciado: SP → Rio (noturno)"
    );
  });

  document.getElementById("btn-pause").addEventListener("click", function () {
    sendCommand({ type: "PAUSE" }, "Simulação pausada");
  });

  document.getElementById("btn-resume").addEventListener("click", function () {
    sendCommand({ type: "RESUME" }, "Simulação retomada");
  });

  document.querySelectorAll(".btn-speed").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var multiplier = Number(btn.dataset.speed);
      sendCommand(
        { type: "SET_SPEED", multiplier: multiplier },
        "Velocidade: " + multiplier + "x"
      );
    });
  });

  document.getElementById("btn-set-clock").addEventListener("click", function () {
    var value = el.clockInput.value;
    if (!value) {
      toast("Escolha uma data e hora antes de definir o relógio");
      return;
    }
    // The input carries no timezone; the demo happens in Sao Paulo (UTC-03:00).
    var isoTime = value.length === 16 ? value + ":00-03:00" : value + "-03:00";
    sendCommand(
      { type: "SET_CLOCK", isoTime: isoTime },
      "Relógio definido: " + simDateTimeLabel(isoTime)
    );
  });

  // ---------------------------------------------------------------- scenes
  // Payloads mirror the types in shared/src/events.ts and the sp-rio-nightly
  // script (shared/src/scenario.ts); user-facing copy must stay identical to
  // the script so panel-driven and auto-play demos read the same.

  /** Highlight the phase button matching the last PHASE_CHANGE seen on the wire. */
  function setActivePhase(phase) {
    activePhase = phase;
    document.querySelectorAll(".btn-phase").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.phase === activePhase);
    });
  }

  document.querySelectorAll(".btn-phase").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var phase = btn.dataset.phase;
      fireEvent(
        { type: "PHASE_CHANGE", at: simNowIso(), phase: phase },
        "Fase disparada: " + (PHASE_LABELS[phase] || phase)
      );
    });
  });

  document.getElementById("scene-traffic").addEventListener("click", function () {
    fireEvent({
      type: "TRAFFIC_ALERT",
      at: simNowIso(),
      severity: "moderate",
      etaToTerminalMin: 52,
      message:
        "Acidente na Marginal Tietê: trânsito intenso no caminho até o terminal",
    });
  });

  document.getElementById("scene-risk").addEventListener("click", function () {
    fireEvent({
      type: "RISK_UPDATE",
      at: simNowIso(),
      riskPct: 38,
      canRebook: true,
      rebookFeeBRL: 20,
      refundDeadlineIso: refundDeadlineIso(),
      refundRetentionPct: 5,
    });
  });

  document.getElementById("scene-platform").addEventListener("click", function () {
    fireEvent({
      type: "PLATFORM_CHANGE",
      at: simNowIso(),
      from: "45",
      to: "48",
      walkMinutes: 4,
    });
  });

  document.getElementById("scene-delay").addEventListener("click", function () {
    fireEvent({
      type: "DELAY_UPDATE",
      at: simNowIso(),
      delayMin: 25,
      reason: "Obras na pista na Via Dutra, km 150",
    });
  });

  document.getElementById("scene-stop").addEventListener("click", function () {
    fireEvent({
      type: "STOP_APPROACHING",
      at: simNowIso(),
      stopId: "stop-aparecida",
      inMinutes: 8,
    });
  });

  document.getElementById("scene-arrival").addEventListener("click", function () {
    fireEvent({
      type: "ARRIVAL",
      at: simNowIso(),
      terminalId: "novo-rio",
    });
  });
})();

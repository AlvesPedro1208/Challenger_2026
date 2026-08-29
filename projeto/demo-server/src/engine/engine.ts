import { spRioScenario } from "@jornada/shared";
import type {
  BusTelemetryEvent,
  DemoCommand,
  DemoEvent,
  Scenario,
  ScenarioStep,
} from "@jornada/shared";
import { haversineKm, pointAtFraction, ROUTE_POINTS } from "../data/route";
import { SimClock } from "./clock";
import { JourneyState } from "./state";

export type EngineStatus = "idle" | "running" | "paused" | "finished";

export interface EngineState {
  status: EngineStatus;
  scenarioId: string | null;
  stepIndex: number;
  stepCount: number;
  clockIso: string;
  speedMultiplier: number;
}

export interface EngineOptions {
  broadcast: (event: DemoEvent) => void;
  state?: JourneyState;
  clock?: SimClock;
  /** Extra scenarios; the default sp-rio scenario is always available. */
  scenarios?: Scenario[];
  tickMs?: number;
}

const DEFAULT_TICK_MS = 25;

/** Interpolated telemetry cadence, in scenario milliseconds. */
const TELEMETRY_INTERVAL_MS = 2000;

// Cumulative distance per route point; ratios give the fraction along the
// route, so the constant road-curve scale factor cancels out.
const cumulativeKm: number[] = ROUTE_POINTS.reduce<number[]>((acc, point, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1]! + haversineKm(ROUTE_POINTS[i - 1]!, point));
  return acc;
}, []);
const totalKm = cumulativeKm[cumulativeKm.length - 1]!;

function routeFraction(lat: number, lng: number): number {
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ROUTE_POINTS.length; i += 1) {
    const p = ROUTE_POINTS[i]!;
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  return cumulativeKm[bestIndex]! / totalKm;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface TelemetryAnchor {
  afterMs: number;
  fraction: number;
  event: BusTelemetryEvent;
}

interface TelemetrySegment {
  prev: TelemetryAnchor;
  next: TelemetryAnchor | null;
}

export class ScenarioEngine {
  private readonly broadcast: (event: DemoEvent) => void;
  private readonly journeyState: JourneyState;
  private readonly clock: SimClock;
  private readonly scenarios = new Map<string, Scenario>();
  private readonly tickMs: number;

  private status: EngineStatus = "idle";
  private scenario: Scenario | null = null;
  private steps: ScenarioStep[] = [];
  private stepIndex = 0;
  private elapsedMs = 0;
  private lastWallMs = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private segment: TelemetrySegment | null = null;
  private lastTelemetryElapsedMs = 0;

  constructor(options: EngineOptions) {
    this.broadcast = options.broadcast;
    this.journeyState = options.state ?? new JourneyState();
    this.clock = options.clock ?? new SimClock();
    this.tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.scenarios.set(spRioScenario.id, spRioScenario);
    for (const scenario of options.scenarios ?? []) {
      this.scenarios.set(scenario.id, scenario);
    }
  }

  getState(): EngineState {
    return {
      status: this.status,
      scenarioId: this.scenario?.id ?? null,
      stepIndex: this.stepIndex,
      stepCount: this.steps.length,
      clockIso: this.clock.nowIso(),
      speedMultiplier: this.clock.getSpeed(),
    };
  }

  getStateStore(): JourneyState {
    return this.journeyState;
  }

  getClock(): SimClock {
    return this.clock;
  }

  handleCommand(command: DemoCommand): void {
    switch (command.type) {
      case "START_SCENARIO":
        this.start(command.scenarioId || undefined);
        return;
      case "PAUSE":
        this.pause();
        return;
      case "RESUME":
        this.resume();
        return;
      case "SET_SPEED":
        this.setSpeed(command.multiplier);
        return;
      case "SET_CLOCK":
        // isoTime is the source of truth; `at` is only a send stamp.
        this.clock.setBase(command.isoTime);
        this.emit({ type: "CLOCK_SET", at: this.clock.nowIso(), isoTime: command.isoTime });
        return;
      case "FIRE_EVENT":
        // Panel-driven off-script event, delivered immediately.
        this.emit(command.event);
        return;
    }
  }

  start(scenarioId?: string): void {
    const scenario = scenarioId ? this.scenarios.get(scenarioId) : spRioScenario;
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }
    this.stopTimer();
    this.scenario = scenario;
    this.steps = [...scenario.steps].sort((a, b) => a.afterMs - b.afterMs);
    this.stepIndex = 0;
    this.elapsedMs = 0;
    this.segment = null;
    this.lastTelemetryElapsedMs = 0;
    this.journeyState.reset();
    if (this.clock.isPaused()) this.clock.resume();
    this.status = "running";
    this.lastWallMs = Date.now();
    this.process();
    if (this.status === "running") {
      this.timer = setInterval(() => this.tick(), this.tickMs);
    }
  }

  pause(): void {
    if (this.status === "running") {
      this.advanceElapsed();
      this.status = "paused";
    }
    this.clock.pause();
  }

  resume(): void {
    this.clock.resume();
    if (this.status === "paused") {
      this.lastWallMs = Date.now();
      this.status = "running";
    }
  }

  setSpeed(multiplier: number): void {
    // Fold elapsed scenario time at the old speed before switching.
    this.advanceElapsed();
    this.clock.setSpeed(multiplier);
  }

  dispose(): void {
    this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private advanceElapsed(): void {
    const wall = Date.now();
    if (this.status === "running") {
      this.elapsedMs += (wall - this.lastWallMs) * this.clock.getSpeed();
    }
    this.lastWallMs = wall;
  }

  private tick(): void {
    if (this.status !== "running") return;
    this.advanceElapsed();
    this.process();
  }

  /** Emit everything due up to the current elapsed scenario time, in order. */
  private process(): void {
    while (this.stepIndex < this.steps.length) {
      const step = this.steps[this.stepIndex]!;
      if (step.afterMs > this.elapsedMs) break;
      this.emitInterpolatedUpTo(step.afterMs);
      this.fireStep(step);
      this.stepIndex += 1;
    }
    this.emitInterpolatedUpTo(this.elapsedMs);

    if (this.stepIndex >= this.steps.length && this.status === "running") {
      this.status = "finished";
      this.stopTimer();
    }
  }

  private fireStep(step: ScenarioStep): void {
    this.emit(step.event);
    if (step.event.type === "BUS_TELEMETRY") {
      this.segment = {
        prev: this.anchorFor(step.afterMs, step.event),
        next: this.nextTelemetryAnchor(this.stepIndex + 1),
      };
      this.lastTelemetryElapsedMs = step.afterMs;
    }
  }

  private anchorFor(afterMs: number, event: BusTelemetryEvent): TelemetryAnchor {
    return { afterMs, fraction: routeFraction(event.lat, event.lng), event };
  }

  private nextTelemetryAnchor(fromIndex: number): TelemetryAnchor | null {
    for (let i = fromIndex; i < this.steps.length; i += 1) {
      const step = this.steps[i]!;
      if (step.event.type === "BUS_TELEMETRY") {
        return this.anchorFor(step.afterMs, step.event);
      }
    }
    return null;
  }

  /**
   * Between scripted telemetry samples, emit interpolated positions every
   * TELEMETRY_INTERVAL_MS of scenario time so the bus glides along the route
   * polyline instead of teleporting between samples.
   */
  private emitInterpolatedUpTo(limitMs: number): void {
    if (!this.segment?.next) return;
    const { prev, next } = this.segment;
    let target = this.lastTelemetryElapsedMs + TELEMETRY_INTERVAL_MS;
    while (target <= limitMs && target < next.afterMs) {
      const t = (target - prev.afterMs) / (next.afterMs - prev.afterMs);
      const position = pointAtFraction(lerp(prev.fraction, next.fraction, t));
      const at = new Date(
        lerp(Date.parse(prev.event.at), Date.parse(next.event.at), t),
      ).toISOString();
      this.emit({
        type: "BUS_TELEMETRY",
        at,
        lat: position.lat,
        lng: position.lng,
        speedKmh: Math.round(lerp(prev.event.speedKmh, next.event.speedKmh, t)),
        heading: position.heading,
        etaNextStopMin: Math.round(
          lerp(prev.event.etaNextStopMin, next.event.etaNextStopMin, t),
        ),
        etaDestinationIso: prev.event.etaDestinationIso,
      });
      this.lastTelemetryElapsedMs = target;
      target += TELEMETRY_INTERVAL_MS;
    }
  }

  private emit(event: DemoEvent): void {
    if (event.type === "CLOCK_SET") {
      // isoTime is the source of truth; `at` is only a send stamp.
      this.clock.setBase(event.isoTime);
    }
    this.journeyState.apply(event);
    this.broadcast(event);
  }
}

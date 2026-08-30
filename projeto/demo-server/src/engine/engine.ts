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

/** The whole demo happens in Sao Paulo, which has a fixed -03:00 offset. */
const SIM_OFFSET_MS = -3 * 60 * 60 * 1000;

const MINUTE_MS = 60_000;

/**
 * Single wire format for `at`: Sao Paulo wall time with an explicit offset and
 * whole seconds, matching how the scenario script writes its own stamps.
 */
function formatSimIso(epochMs: number): string {
  const wall = new Date(Math.floor(epochMs / 1000) * 1000 + SIM_OFFSET_MS);
  return `${wall.toISOString().slice(0, 19)}-03:00`;
}

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

/** One scripted step mapped to the simulated instant it happens at. */
interface TimelinePoint {
  afterMs: number;
  atMs: number;
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
  private timeline: TimelinePoint[] = [];
  private lastEmittedAtMs = Number.NEGATIVE_INFINITY;

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
    this.lastEmittedAtMs = Number.NEGATIVE_INFINITY;
    this.buildTimeline();
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
   * The simulated timeline of the running scenario: every scripted step mapped
   * to its own `at`. Interpolated telemetry reads its stamp from this map
   * instead of lerping between telemetry samples alone, which used to run the
   * stamps past the scripted steps sitting between two samples. The running
   * maximum keeps the map non-decreasing even if a script stamp dips.
   */
  private buildTimeline(): void {
    const points: TimelinePoint[] = [];
    let maxAtMs = Number.NEGATIVE_INFINITY;
    for (const step of this.steps) {
      const atMs = Date.parse(step.event.at);
      if (Number.isNaN(atMs)) continue;
      maxAtMs = Math.max(maxAtMs, atMs);
      const last = points[points.length - 1];
      if (last && last.afterMs === step.afterMs) {
        last.atMs = maxAtMs;
        continue;
      }
      points.push({ afterMs: step.afterMs, atMs: maxAtMs });
    }
    this.timeline = points;
  }

  /** Simulated instant of a scenario offset, interpolated between steps. */
  private simAtMs(afterMs: number): number {
    const points = this.timeline;
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return Number.NaN;
    if (afterMs <= first.afterMs) return first.atMs;
    if (afterMs >= last.afterMs) return last.atMs;
    for (let i = 1; i < points.length; i += 1) {
      const b = points[i]!;
      if (afterMs > b.afterMs) continue;
      const a = points[i - 1]!;
      const span = b.afterMs - a.afterMs;
      return span <= 0 ? b.atMs : lerp(a.atMs, b.atMs, (afterMs - a.afterMs) / span);
    }
    return last.atMs;
  }

  /**
   * ETA to the next stop, aware of the handover between stops. While both
   * anchors count toward the same stop the value falls, and interpolating is
   * right. When the next anchor already counts toward a LATER stop its value
   * is higher, and interpolating would make the countdown climb on screen:
   * run the previous anchor's countdown down to its stop instead, then count
   * toward the next one, backwards from the next anchor.
   */
  private etaAtInstant(
    prev: TelemetryAnchor,
    next: TelemetryAnchor,
    afterMs: number,
    atMs: number,
  ): number {
    const prevEta = prev.event.etaNextStopMin;
    const nextEta = next.event.etaNextStopMin;
    if (nextEta <= prevEta) {
      const t = (afterMs - prev.afterMs) / (next.afterMs - prev.afterMs);
      return Math.round(lerp(prevEta, nextEta, t));
    }
    const elapsedMin = (atMs - this.simAtMs(prev.afterMs)) / MINUTE_MS;
    if (elapsedMin < prevEta) return Math.round(prevEta - elapsedMin);
    const remainingMin = (this.simAtMs(next.afterMs) - atMs) / MINUTE_MS;
    return Math.round(nextEta + Math.max(0, remainingMin));
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
      const atMs = this.simAtMs(target);
      this.emit({
        type: "BUS_TELEMETRY",
        at: formatSimIso(atMs),
        lat: position.lat,
        lng: position.lng,
        speedKmh: Math.round(lerp(prev.event.speedKmh, next.event.speedKmh, t)),
        heading: position.heading,
        etaNextStopMin: this.etaAtInstant(prev, next, target, atMs),
        etaDestinationIso: prev.event.etaDestinationIso,
      });
      this.lastTelemetryElapsedMs = target;
      target += TELEMETRY_INTERVAL_MS;
    }
  }

  private emit(event: DemoEvent): void {
    if (event.type === "CLOCK_SET") {
      // A clock jump is the sanctioned way to move the demo timeline, so it
      // re-anchors the stamp floor instead of being held back by it.
      const anchor = Date.parse(event.isoTime);
      if (!Number.isNaN(anchor)) this.lastEmittedAtMs = anchor;
    }
    const stamped = this.stamp(event);
    if (stamped.type === "CLOCK_SET") {
      // isoTime is the source of truth; `at` is only a send stamp.
      this.clock.setBase(stamped.isoTime);
    }
    this.journeyState.apply(stamped);
    this.broadcast(stamped);
  }

  /**
   * Put the event on the wire in the single `at` format, never stamped before
   * the last event already sent. The app's clock follows the `at` of every
   * event, so a stamp going backwards rewinds the whole screen.
   */
  private stamp(event: DemoEvent): DemoEvent {
    const parsed = Date.parse(event.at);
    if (Number.isNaN(parsed)) return event;
    const at = formatSimIso(Math.max(parsed, this.lastEmittedAtMs));
    this.lastEmittedAtMs = Date.parse(at);
    return event.at === at ? event : { ...event, at };
  }
}

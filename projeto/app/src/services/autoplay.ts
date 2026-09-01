import type { BusTelemetryEvent, DemoPhase, Scenario, ScenarioStep } from '@jornada/shared';
import { haversineKm, pointAtFraction, ROUTE_POINTS, spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

/** The last telemetry the store applied, as a fingerprint of where the bus is. */
export interface ResumeTelemetry {
  lat: number;
  lng: number;
  etaNextStopMin: number | null;
}

/** Where the journey already is, as the store knows it. */
export interface ResumePoint {
  phase?: DemoPhase | null;
  clockIso?: string | null;
  /**
   * Breaks the tie between steps that share a stamp: the clock alone cannot
   * say which of them the store already applied.
   */
  telemetry?: ResumeTelemetry | null;
}

export interface AutoplayOptions {
  scenario?: Scenario;
  /** Playback speed multiplier (2 = twice as fast). */
  speed?: number;
  /** Point to pick the script up from; omitted plays the scenario from the top. */
  resumeFrom?: ResumePoint;
}

let timers: ReturnType<typeof setTimeout>[] = [];
let running = false;
let pendingSteps = 0;

/**
 * Interpolation below mirrors ScenarioEngine (demo-server/src/engine/engine.ts):
 * the scripted samples alone make the bus cut straight lines between distant
 * points, while the panel-driven demo glides along the route polyline. The app
 * cannot import the engine (server-only package), so the minimum needed to
 * reproduce it is duplicated here: the same cadence, the same
 * fraction-along-the-route interpolation, and the same timeline-derived `at`.
 */

/** Interpolated telemetry cadence, in scenario milliseconds. */
const TELEMETRY_INTERVAL_MS = 2000;

/** The whole demo happens in Sao Paulo, which has a fixed -03:00 offset. */
const SIM_OFFSET_MS = -3 * 60 * 60 * 1000;

const MINUTE_MS = 60_000;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Sao Paulo wall time with an explicit offset, as the scenario writes it. */
function formatSimIso(epochMs: number): string {
  const wall = new Date(Math.floor(epochMs / 1000) * 1000 + SIM_OFFSET_MS);
  return `${wall.toISOString().slice(0, 19)}-03:00`;
}

// Cumulative distance per route point; ratios give the fraction along the
// route, so any constant scale factor cancels out.
const cumulativeKm: number[] = ROUTE_POINTS.reduce<number[]>((acc, point, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1]! + haversineKm(ROUTE_POINTS[i - 1]!, point));
  return acc;
}, []);
const totalKm = cumulativeKm[cumulativeKm.length - 1]!;

/** Fraction of the route at the polyline point nearest to a sampled position. */
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

interface TelemetryAnchor {
  afterMs: number;
  fraction: number;
  event: BusTelemetryEvent;
}

/** One scripted step mapped to the simulated instant it happens at. */
interface TimelinePoint {
  afterMs: number;
  atMs: number;
}

/**
 * Simulated timeline of the scenario: every scripted step mapped to its own
 * `at`, kept non-decreasing by a running maximum. Interpolated telemetry reads
 * its stamp from here instead of lerping between telemetry samples alone, which
 * would run the stamps past the scripted steps sitting between two samples.
 */
function buildTimeline(steps: ScenarioStep[]): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  let maxAtMs = Number.NEGATIVE_INFINITY;
  for (const step of steps) {
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
  return points;
}

/** Simulated instant of a scenario offset, interpolated between steps. */
function simAtMs(points: TimelinePoint[], afterMs: number): number {
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
 * ETA to the next stop, aware of the handover between stops, mirroring
 * ScenarioEngine.etaAtInstant. While both anchors count toward the same stop
 * the value falls and interpolating is right. When the next anchor already
 * counts toward a LATER stop its value is higher, and interpolating would make
 * the countdown climb on screen: run the previous anchor's countdown down to
 * its stop instead, then count toward the next one, backwards from the next
 * anchor. Holding the previous value instead would put auto-play minutes away
 * from what the server broadcasts, which is what makes a failover visible.
 */
function etaAtInstant(
  prev: TelemetryAnchor,
  next: TelemetryAnchor,
  instant: { afterMs: number; atMs: number },
  timeline: TimelinePoint[],
): number {
  const prevEta = prev.event.etaNextStopMin;
  const nextEta = next.event.etaNextStopMin;
  if (nextEta <= prevEta) {
    const t = (instant.afterMs - prev.afterMs) / (next.afterMs - prev.afterMs);
    return Math.round(lerp(prevEta, nextEta, t));
  }
  const elapsedMin = (instant.atMs - simAtMs(timeline, prev.afterMs)) / MINUTE_MS;
  if (elapsedMin < prevEta) return Math.round(prevEta - elapsedMin);
  const remainingMin = (simAtMs(timeline, next.afterMs) - instant.atMs) / MINUTE_MS;
  return Math.round(nextEta + Math.max(0, remainingMin));
}

function interpolateTelemetry(
  prev: TelemetryAnchor,
  next: TelemetryAnchor,
  afterMs: number,
  timeline: TimelinePoint[],
): BusTelemetryEvent {
  const t = (afterMs - prev.afterMs) / (next.afterMs - prev.afterMs);
  const position = pointAtFraction(lerp(prev.fraction, next.fraction, t));
  const atMs = simAtMs(timeline, afterMs);

  return {
    type: 'BUS_TELEMETRY',
    at: formatSimIso(atMs),
    lat: position.lat,
    lng: position.lng,
    speedKmh: Math.round(lerp(prev.event.speedKmh, next.event.speedKmh, t)),
    heading: position.heading,
    etaNextStopMin: etaAtInstant(prev, next, { afterMs, atMs }, timeline),
    etaDestinationIso: prev.event.etaDestinationIso,
  };
}

function telemetryAnchors(steps: ScenarioStep[]): TelemetryAnchor[] {
  const anchors: TelemetryAnchor[] = [];
  for (const step of steps) {
    if (step.event.type !== 'BUS_TELEMETRY') continue;
    const event = step.event;
    anchors.push({
      afterMs: step.afterMs,
      fraction: routeFraction(event.lat, event.lng),
      event,
    });
  }
  return anchors;
}

/**
 * The scenario steps plus interpolated telemetry between neighbouring samples,
 * so auto-play follows the same route polyline the panel-driven demo does.
 * Pure and deterministic: same scenario in, same steps out.
 */
export function expandScenarioSteps(scenario: Scenario): ScenarioStep[] {
  const steps = [...scenario.steps].sort((a, b) => a.afterMs - b.afterMs);
  const timeline = buildTimeline(steps);
  const anchors = telemetryAnchors(steps);

  const interpolated: ScenarioStep[] = [];
  for (let i = 0; i + 1 < anchors.length; i += 1) {
    const prev = anchors[i]!;
    const next = anchors[i + 1]!;
    for (
      let afterMs = prev.afterMs + TELEMETRY_INTERVAL_MS;
      afterMs < next.afterMs;
      afterMs += TELEMETRY_INTERVAL_MS
    ) {
      interpolated.push({ afterMs, event: interpolateTelemetry(prev, next, afterMs, timeline) });
    }
  }

  // Array.prototype.sort is stable, and the engine flushes the interpolated
  // samples due at an offset before firing the scripted step sitting on it, so
  // interpolated goes first here too: same order on the wire and in auto-play.
  return stampMonotonically([...interpolated, ...steps].sort((a, b) => a.afterMs - b.afterMs));
}

/**
 * Mirrors ScenarioEngine.stamp: no step is ever stamped before the one already
 * played, because the store follows the `at` of every event and a stamp going
 * backwards rewinds the whole screen. A CLOCK_SET is the sanctioned way to move
 * the demo timeline, so it re-anchors the floor instead of being held by it.
 */
function stampMonotonically(steps: ScenarioStep[]): ScenarioStep[] {
  let floorMs = Number.NEGATIVE_INFINITY;
  return steps.map((step) => {
    const event = step.event;
    if (event.type === 'CLOCK_SET') {
      const anchor = Date.parse(event.isoTime);
      floorMs = Number.isNaN(anchor) ? floorMs : anchor;
    }
    const parsed = Date.parse(event.at);
    if (Number.isNaN(parsed)) return step;
    const at = formatSimIso(Math.max(parsed, floorMs));
    floorMs = Date.parse(at);
    return event.at === at ? step : { afterMs: step.afterMs, event: { ...event, at } };
  });
}

interface ActStart {
  phase: DemoPhase;
  /** Index of the first step that belongs to the act. */
  index: number;
}

/**
 * Where each act begins: its PHASE_CHANGE, walked back over the CLOCK_SET
 * steps that introduce it, so resuming an act never loses its clock.
 */
function actStarts(steps: ScenarioStep[]): ActStart[] {
  const acts: ActStart[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const event = steps[i]!.event;
    if (event.type !== 'PHASE_CHANGE') continue;
    let index = i;
    while (index > 0 && steps[index - 1]!.event.type === 'CLOCK_SET') index -= 1;
    acts.push({ phase: event.phase, index });
  }
  return acts;
}

/**
 * The clock as epoch ms, or null when it says nothing about the script: an
 * unparsable stamp, or one outside the scenario (the server clock is wall time
 * until the first CLOCK_SET, and wall time is not on this timeline).
 */
function clockOnTimeline(steps: ScenarioStep[], clockIso: string | null | undefined): number | null {
  if (!clockIso) return null;
  const clockMs = Date.parse(clockIso);
  if (Number.isNaN(clockMs)) return null;
  const first = Date.parse(steps[0]!.event.at);
  const last = Date.parse(steps[steps.length - 1]!.event.at);
  if (Number.isNaN(first) || Number.isNaN(last)) return null;
  return clockMs < first || clockMs > last ? null : clockMs;
}

/**
 * Several steps can share one stamp (a scripted event and the telemetry sample
 * on the same instant), and the clock cannot say which of them the store
 * already applied. The telemetry the store holds can: it fingerprints exactly
 * one sample. Returns the index right after the last sample in the run that
 * matches it, or the run's first sample when none does — resuming there
 * replays no scripted event and drops no pending telemetry.
 */
function tieBreakOnTelemetry(
  steps: ScenarioStep[],
  runStart: number,
  runEnd: number,
  telemetry: ResumeTelemetry,
): number | null {
  let first: number | null = null;
  let lastMatch: number | null = null;
  for (let i = runStart; i < runEnd; i += 1) {
    const event = steps[i]!.event;
    if (event.type !== 'BUS_TELEMETRY') continue;
    if (first === null) first = i;
    // A parked bus repeats the same sample, so the last match is the one the
    // stream had reached.
    if (
      event.lat === telemetry.lat &&
      event.lng === telemetry.lng &&
      event.etaNextStopMin === telemetry.etaNextStopMin
    ) {
      lastMatch = i;
    }
  }
  return lastMatch === null ? first : lastMatch + 1;
}

/**
 * Index of the first step to play when the store already lived part of the
 * journey. The phase picks the act — the coarse anchor that can always be
 * trusted — the clock advances inside it, skipping the steps whose simulated
 * instant has already passed, and the last known telemetry settles the steps
 * sharing the instant the clock stopped on. Skipped events are NOT replayed:
 * the store holds exactly what the server applied up to `clockIso`, so
 * replaying them would duplicate events and drag `clockIso` backwards.
 *
 * Falls back to 0 (the whole scenario) when the phase is unknown, and to the
 * start of the act when the clock is missing or off the scenario timeline.
 */
export function resumeStepIndex(steps: ScenarioStep[], resume: ResumePoint): number {
  if (steps.length === 0) return 0;

  const acts = actStarts(steps);
  const actPos = resume.phase ? acts.findIndex((act) => act.phase === resume.phase) : -1;
  if (actPos < 0) return 0;

  const start = acts[actPos]!.index;
  const end = acts[actPos + 1]?.index ?? steps.length;

  const clockMs = clockOnTimeline(steps, resume.clockIso);
  if (clockMs === null) return start;

  const { runStart, index } = clockRun(steps, { start, end }, clockMs);
  if (!resume.telemetry || runStart >= index) return index;
  return tieBreakOnTelemetry(steps, runStart, index, resume.telemetry) ?? index;
}

/**
 * How far the clock alone gets inside an act: `index` is the first step still
 * ahead of it, and `[runStart, index)` are the steps sitting exactly on the
 * instant it stopped at — the ones it cannot order among themselves.
 */
function clockRun(
  steps: ScenarioStep[],
  act: { start: number; end: number },
  clockMs: number,
): { runStart: number; index: number } {
  let index = act.start;
  let runStart = act.start;
  while (index < act.end) {
    const at = Date.parse(steps[index]!.event.at);
    if (at > clockMs) break;
    if (at < clockMs) runStart = index + 1;
    index += 1;
  }
  return { runStart, index };
}

/**
 * Plays the embedded scenario against the same applyEvent used by the WS
 * client, so every screen behaves exactly as in the server-driven demo.
 */
export function startAutoplay(options: AutoplayOptions = {}): void {
  const scenario = options.scenario ?? spRioScenario;
  const speed = options.speed && options.speed > 0 ? options.speed : 1;
  const steps = expandScenarioSteps(scenario);
  const from = options.resumeFrom ? resumeStepIndex(steps, options.resumeFrom) : 0;
  // Offsets are rebased on the last step already played, which keeps the gap
  // to the next one instead of firing it the instant playback takes over.
  const baseMs = from > 0 ? (steps[from - 1]?.afterMs ?? 0) : 0;
  const pending = steps.slice(from);

  stopAutoplay();
  running = pending.length > 0;
  pendingSteps = pending.length;
  useJourneyStore.getState().setConnection('autoplay');

  timers = pending.map((step) =>
    setTimeout(
      () => {
        useJourneyStore.getState().applyEvent(step.event);
        pendingSteps -= 1;
        if (pendingSteps <= 0) {
          running = false;
        }
      },
      Math.max(0, step.afterMs - baseMs) / speed,
    ),
  );
}

/**
 * Takes the demo over from wherever the store already is. This is the failover
 * entry point: a server that dies in Act 4 must not rewind the journey to Act 1.
 */
export function resumeAutoplay(options: Omit<AutoplayOptions, 'resumeFrom'> = {}): void {
  const { phase, clockIso, bus } = useJourneyStore.getState();
  const telemetry: ResumeTelemetry | null = bus.position
    ? { lat: bus.position.lat, lng: bus.position.lng, etaNextStopMin: bus.etaNextStopMin }
    : null;
  startAutoplay({ ...options, resumeFrom: { phase, clockIso, telemetry } });
}

export function stopAutoplay(): void {
  timers.forEach(clearTimeout);
  timers = [];
  pendingSteps = 0;
  running = false;
}

/** Stops playback and returns the store to its initial state. */
export function resetAutoplay(): void {
  stopAutoplay();
  useJourneyStore.getState().reset();
}

export function isAutoplayRunning(): boolean {
  return running;
}

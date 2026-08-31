import type { BusTelemetryEvent, DemoPhase, Scenario, ScenarioStep } from '@jornada/shared';
import { haversineKm, pointAtFraction, ROUTE_POINTS, spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

/** Where the journey already is, as the store knows it. */
export interface ResumePoint {
  phase?: DemoPhase | null;
  clockIso?: string | null;
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

function interpolateTelemetry(
  prev: TelemetryAnchor,
  next: TelemetryAnchor,
  afterMs: number,
  timeline: TimelinePoint[],
): BusTelemetryEvent {
  const t = (afterMs - prev.afterMs) / (next.afterMs - prev.afterMs);
  const position = pointAtFraction(lerp(prev.fraction, next.fraction, t));
  const prevEta = prev.event.etaNextStopMin;
  const nextEta = next.event.etaNextStopMin;

  return {
    type: 'BUS_TELEMETRY',
    at: formatSimIso(simAtMs(timeline, afterMs)),
    lat: position.lat,
    lng: position.lng,
    speedKmh: Math.round(lerp(prev.event.speedKmh, next.event.speedKmh, t)),
    heading: position.heading,
    // A countdown climbing on screen reads as a bug, so once the next sample
    // already counts toward a LATER stop the value holds until that sample.
    etaNextStopMin: nextEta <= prevEta ? Math.round(lerp(prevEta, nextEta, t)) : prevEta,
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

  // Array.prototype.sort is stable, so a scripted step stays ahead of an
  // interpolated sample that lands on the same offset.
  return [...steps, ...interpolated].sort((a, b) => a.afterMs - b.afterMs);
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
 * Index of the first step to play when the store already lived part of the
 * journey. The phase picks the act — the coarse anchor that can always be
 * trusted — and the clock advances inside it, skipping the steps whose
 * simulated instant has already passed. Skipped events are NOT replayed: the
 * store holds exactly what the server applied up to `clockIso`, so replaying
 * them would duplicate events and drag `clockIso` backwards.
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

  let index = start;
  while (index < end && Date.parse(steps[index]!.event.at) <= clockMs) index += 1;
  return index;
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
  const { phase, clockIso } = useJourneyStore.getState();
  startAutoplay({ ...options, resumeFrom: { phase, clockIso } });
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

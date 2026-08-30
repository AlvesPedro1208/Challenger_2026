import type { BusTelemetryEvent, Scenario, ScenarioStep } from '@jornada/shared';
import { haversineKm, pointAtFraction, ROUTE_POINTS, spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

export interface AutoplayOptions {
  scenario?: Scenario;
  /** Playback speed multiplier (2 = twice as fast). */
  speed?: number;
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

/**
 * Plays the embedded scenario against the same applyEvent used by the WS
 * client, so every screen behaves exactly as in the server-driven demo.
 */
export function startAutoplay(options: AutoplayOptions = {}): void {
  const scenario = options.scenario ?? spRioScenario;
  const speed = options.speed && options.speed > 0 ? options.speed : 1;
  const steps = expandScenarioSteps(scenario);

  stopAutoplay();
  running = true;
  pendingSteps = steps.length;
  useJourneyStore.getState().setConnection('autoplay');

  timers = steps.map((step) =>
    setTimeout(() => {
      useJourneyStore.getState().applyEvent(step.event);
      pendingSteps -= 1;
      if (pendingSteps <= 0) {
        running = false;
      }
    }, step.afterMs / speed),
  );

  if (pendingSteps === 0) {
    running = false;
  }
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

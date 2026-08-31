/**
 * Scripted demo scenarios. A scenario is a flat list of steps, each firing a
 * DemoEvent at a wall-clock offset from scenario start. The same script drives
 * the app's auto-play fallback and the server-side engine, so both paths emit
 * identical events.
 */

import { STOPS } from './data/stops';
import type { DemoEvent } from './events';

export interface ScenarioStep {
  /** Offset from scenario start in real ms (players divide by their speed multiplier). */
  afterMs: number;
  event: DemoEvent;
}

export interface Scenario {
  id: string;
  title: string;
  steps: ScenarioStep[];
}

/** Simulated timestamp on the demo night (Sao Paulo timezone). */
const at = (hhmm: string, nextDay = false): string =>
  `2026-09-${nextDay ? '14' : '13'}T${hhmm}:00-03:00`;

const step = (afterSec: number, event: DemoEvent): ScenarioStep => ({
  afterMs: afterSec * 1000,
  event,
});

const ETA_ON_TIME = at('06:10', true);
const ETA_DELAYED = at('06:35', true);

/** Exact coordinates of a support stop, so a parked sample sits right on it. */
const stopPoint = (stopId: string): { lat: number; lng: number } => {
  const stop = STOPS.find((candidate) => candidate.id === stopId);
  if (!stop) throw new Error(`Unknown stop in scenario: ${stopId}`);
  return { lat: stop.lat, lng: stop.lng };
};

const APARECIDA = stopPoint('stop-aparecida');
const RESENDE = stopPoint('stop-resende');

// [afterSec, simTime, nextDay, lat, lng, speedKmh, heading, etaNextStopMin, etaDestinationIso]
type TelemetryRow = [number, string, boolean, number, number, number, number, number, string];

// Sampled on the Via Dutra polyline (see shared/src/data/route.ts) between
// Terminal Tiete and Novo Rio. etaNextStopMin counts minutes to the next
// support stop (Aparecida at 01:36, then Resende at 03:40); once no stops
// remain it counts minutes to the destination.
//
// Each dwell is bracketed by a pair of parked samples on the stop's own
// coordinates: speed 0 and etaNextStopMin 0, so the screen shows a stopped bus
// counting zero minutes to the stop it is sitting at instead of 85 km/h and the
// next stop's ETA. The pair is also what buys the dwell real time on screen:
// the players read `at` off the scripted steps, so spreading 20 simulated
// minutes over 24 real seconds keeps the card up long enough to narrate the
// POIs, while the samples right after the pair carry the bus past the stop in
// the same tick the countdown hands over to the next target.
const dutraTelemetry: TelemetryRow[] = [
  [62, '22:40', false, -23.4778, -46.5729, 52, 57, 176, ETA_ON_TIME],
  [68, '23:00', false, -23.4291, -46.483, 78, 62, 156, ETA_ON_TIME],
  [74, '23:20', false, -23.3945, -46.321, 90, 73, 136, ETA_ON_TIME],
  [80, '23:45', false, -23.3048, -46.0452, 92, 79, 111, ETA_ON_TIME],
  [86, '00:05', true, -23.2113, -45.9068, 88, 58, 91, ETA_ON_TIME],
  [92, '00:25', true, -23.1618, -45.7952, 91, 64, 71, ETA_ON_TIME],
  [100, '00:45', true, -23.0637, -45.6418, 42, 71, 51, ETA_DELAYED],
  [106, '01:05', true, -22.9761, -45.5104, 87, 54, 31, ETA_DELAYED],
  [112, '01:25', true, -22.8846, -45.2812, 84, 59, 11, ETA_DELAYED],
  // Aparecida: parked 01:36 -> 01:56 (the 20 min the stop dataset advertises).
  [119, '01:36', true, APARECIDA.lat, APARECIDA.lng, 0, 59, 0, ETA_DELAYED],
  [143, '01:56', true, APARECIDA.lat, APARECIDA.lng, 0, 59, 0, ETA_DELAYED],
  [147, '02:00', true, -22.8008, -45.1934, 86, 56, 100, ETA_DELAYED],
  [153, '02:30', true, -22.6653, -45.0089, 90, 61, 70, ETA_DELAYED],
  [159, '03:10', true, -22.5311, -44.7722, 88, 72, 30, ETA_DELAYED],
  // Resende: parked 03:40 -> 04:00.
  [165, '03:40', true, RESENDE.lat, RESENDE.lng, 0, 78, 0, ETA_DELAYED],
  [189, '04:00', true, RESENDE.lat, RESENDE.lng, 0, 78, 0, ETA_DELAYED],
  [195, '04:30', true, -22.5386, -44.1032, 87, 86, 125, ETA_DELAYED],
  [201, '05:20', true, -22.6423, -43.8878, 82, 96, 75, ETA_DELAYED],
  [207, '05:55', true, -22.7461, -43.6997, 76, 101, 40, ETA_DELAYED],
  [213, '06:25', true, -22.8983, -43.2093, 18, 118, 9, ETA_DELAYED],
];

const telemetrySteps: ScenarioStep[] = dutraTelemetry.map(
  ([afterSec, hhmm, nextDay, lat, lng, speedKmh, heading, etaNextStopMin, etaDestinationIso]) =>
    step(afterSec, {
      type: 'BUS_TELEMETRY',
      at: at(hhmm, nextDay),
      lat,
      lng,
      speedKmh,
      heading,
      etaNextStopMin,
      etaDestinationIso,
    }),
);

const scriptedSteps: ScenarioStep[] = [
  // Act 1 - at home, risk of missing the departure
  step(0, { type: 'CLOCK_SET', at: at('20:00'), isoTime: at('20:00') }),
  step(1, { type: 'PHASE_CHANGE', at: at('20:00'), phase: 'HOME' }),
  step(8, {
    type: 'TRAFFIC_ALERT',
    at: at('20:05'),
    severity: 'moderate',
    etaToTerminalMin: 52,
    message: 'Acidente na Marginal Tietê: trânsito intenso no caminho até o terminal',
  }),
  step(10, {
    type: 'RISK_UPDATE',
    at: at('20:05'),
    riskPct: 38,
    canRebook: true,
    rebookFeeBRL: 20,
    refundDeadlineIso: at('21:30'),
    refundRetentionPct: 5,
  }),

  // Act 2 - heading to the terminal
  step(20, { type: 'CLOCK_SET', at: at('20:15'), isoTime: at('20:15') }),
  step(21, { type: 'PHASE_CHANGE', at: at('20:15'), phase: 'EN_ROUTE_TERMINAL' }),

  // Act 3 - at the terminal, platform swap
  step(34, { type: 'CLOCK_SET', at: at('21:40'), isoTime: at('21:40') }),
  step(35, { type: 'PHASE_CHANGE', at: at('21:40'), phase: 'TERMINAL' }),
  step(44, {
    type: 'PLATFORM_CHANGE',
    at: at('21:55'),
    from: '45',
    to: '48',
    walkMinutes: 4,
  }),

  // Act 4 - onboard through the night (telemetry interleaved below)
  step(55, { type: 'CLOCK_SET', at: at('22:28'), isoTime: at('22:28') }),
  step(56, { type: 'PHASE_CHANGE', at: at('22:30'), phase: 'ONBOARD' }),
  step(96, {
    type: 'DELAY_UPDATE',
    at: at('00:40', true),
    delayMin: 25,
    reason: 'Obras na pista na Via Dutra, km 150',
  }),
  step(115, {
    type: 'STOP_APPROACHING',
    at: at('01:28', true),
    stopId: 'stop-aparecida',
    inMinutes: 8,
  }),
  step(120, {
    type: 'STOP_DWELL',
    at: at('01:36', true),
    stopId: 'stop-aparecida',
    dwellMinutes: 20,
  }),
  step(163, {
    type: 'STOP_APPROACHING',
    at: at('03:32', true),
    stopId: 'stop-resende',
    inMinutes: 8,
  }),
  step(167, {
    type: 'STOP_DWELL',
    at: at('03:40', true),
    stopId: 'stop-resende',
    dwellMinutes: 20,
  }),

  // Act 5 - arrival at Novo Rio
  step(219, { type: 'CLOCK_SET', at: at('06:33', true), isoTime: at('06:33', true) }),
  step(220, { type: 'PHASE_CHANGE', at: at('06:33', true), phase: 'ARRIVED' }),
  step(222, { type: 'ARRIVAL', at: at('06:34', true), terminalId: 'novo-rio' }),
];

export const spRioScenario: Scenario = {
  id: 'sp-rio-nightly',
  title: 'São Paulo (Tietê) - Rio de Janeiro (Novo Rio), 22:30',
  steps: [...scriptedSteps, ...telemetrySteps].sort((a, b) => a.afterMs - b.afterMs),
};

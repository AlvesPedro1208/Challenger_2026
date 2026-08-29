/**
 * WebSocket contract between the demo engine (server) and its consumers
 * (app + control panel). Events flow engine -> clients; commands flow
 * panel -> engine.
 */

export type DemoPhase =
  | 'HOME'
  | 'EN_ROUTE_TERMINAL'
  | 'TERMINAL'
  | 'ONBOARD'
  | 'ARRIVED';

export type TrafficSeverity = 'low' | 'moderate' | 'severe';

interface BaseEvent {
  /** ISO 8601 timestamp in simulated demo time. */
  at: string;
}

export interface ClockSetEvent extends BaseEvent {
  type: 'CLOCK_SET';
  isoTime: string;
}

export interface PhaseChangeEvent extends BaseEvent {
  type: 'PHASE_CHANGE';
  phase: DemoPhase;
}

export interface TrafficAlertEvent extends BaseEvent {
  type: 'TRAFFIC_ALERT';
  severity: TrafficSeverity;
  etaToTerminalMin: number;
  message: string;
}

export interface RiskUpdateEvent extends BaseEvent {
  type: 'RISK_UPDATE';
  /** Probability (0-100) of missing the departure. */
  riskPct: number;
  canRebook: boolean;
  rebookFeeBRL: number;
  refundDeadlineIso: string;
  refundRetentionPct: number;
}

export interface PlatformChangeEvent extends BaseEvent {
  type: 'PLATFORM_CHANGE';
  from: string;
  to: string;
  walkMinutes: number;
}

export interface BusTelemetryEvent extends BaseEvent {
  type: 'BUS_TELEMETRY';
  lat: number;
  lng: number;
  speedKmh: number;
  /** Degrees clockwise from north. */
  heading: number;
  etaNextStopMin: number;
  etaDestinationIso: string;
}

export interface DelayUpdateEvent extends BaseEvent {
  type: 'DELAY_UPDATE';
  delayMin: number;
  reason: string;
}

export interface StopApproachingEvent extends BaseEvent {
  type: 'STOP_APPROACHING';
  stopId: string;
  inMinutes: number;
}

export interface StopDwellEvent extends BaseEvent {
  type: 'STOP_DWELL';
  stopId: string;
  dwellMinutes: number;
}

export interface ArrivalEvent extends BaseEvent {
  type: 'ARRIVAL';
  terminalId: string;
}

export type DemoEvent =
  | ClockSetEvent
  | PhaseChangeEvent
  | TrafficAlertEvent
  | RiskUpdateEvent
  | PlatformChangeEvent
  | BusTelemetryEvent
  | DelayUpdateEvent
  | StopApproachingEvent
  | StopDwellEvent
  | ArrivalEvent;

export type DemoEventType = DemoEvent['type'];

export interface SetClockCommand {
  type: 'SET_CLOCK';
  isoTime: string;
}

export interface FireEventCommand {
  type: 'FIRE_EVENT';
  event: DemoEvent;
}

export interface StartScenarioCommand {
  type: 'START_SCENARIO';
  scenarioId: string;
}

export interface PauseCommand {
  type: 'PAUSE';
}

export interface ResumeCommand {
  type: 'RESUME';
}

export interface SetSpeedCommand {
  type: 'SET_SPEED';
  /** Simulated-time multiplier relative to wall clock (1 = real time). */
  multiplier: number;
}

export type DemoCommand =
  | SetClockCommand
  | FireEventCommand
  | StartScenarioCommand
  | PauseCommand
  | ResumeCommand
  | SetSpeedCommand;

export type DemoCommandType = DemoCommand['type'];

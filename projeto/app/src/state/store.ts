import { create } from 'zustand';

import type {
  BusPosition,
  DailyDelayPoint,
  DemoEvent,
  DemoPhase,
  IndoorMap,
  RouteStats,
  Stop,
  Ticket,
  TrafficSeverity,
  Trip,
} from '@jornada/shared';

export type ConnectionMode = 'panel' | 'autoplay' | 'offline';

export interface RiskState {
  riskPct: number;
  canRebook: boolean;
  rebookFeeBRL: number;
  refundDeadlineIso: string;
  refundRetentionPct: number;
}

export interface TrafficAlertState {
  severity: TrafficSeverity;
  etaToTerminalMin: number;
  message: string;
  at: string;
}

export interface PlatformChange {
  from: string;
  to: string;
  walkMinutes: number;
}

export interface PlatformState {
  current: string | null;
  pendingChange: PlatformChange | null;
}

export interface BusState {
  position: BusPosition | null;
  delayMin: number;
  delayReason: string | null;
  etaNextStopMin: number | null;
  etaDestinationIso: string | null;
}

export interface ApproachingStopState {
  stopId: string;
  inMinutes: number;
}

export interface DwellState {
  stopId: string;
  dwellMinutes: number;
}

export interface JourneySnapshot {
  phase: DemoPhase;
  clockIso: string | null;
  trip: Trip | null;
  ticket: Ticket | null;
  stops: Stop[];
  stats: RouteStats | null;
  indoorMap: IndoorMap | null;
  dailySeries: DailyDelayPoint[];
  risk: RiskState | null;
  trafficAlert: TrafficAlertState | null;
  platform: PlatformState;
  bus: BusState;
  approachingStop: ApproachingStopState | null;
  dwell: DwellState | null;
  arrived: boolean;
  connection: ConnectionMode;
}

/** Shape of GET /api/bootstrap (and of the offline cache, which mirrors it). */
export interface BootstrapData {
  trip?: Trip | null;
  ticket?: Ticket | null;
  stops?: Stop[];
  stats?: RouteStats | null;
  indoorMap?: IndoorMap | null;
  dailySeries?: DailyDelayPoint[];
  serverTimeIso?: string;
}

export interface JourneyStore extends JourneySnapshot {
  applyEvent: (event: DemoEvent) => void;
  hydrateBootstrap: (data: BootstrapData) => void;
  setConnection: (connection: ConnectionMode) => void;
  reset: () => void;
}

export const initialJourneyState: JourneySnapshot = {
  phase: 'HOME',
  clockIso: null,
  trip: null,
  ticket: null,
  stops: [],
  stats: null,
  indoorMap: null,
  dailySeries: [],
  risk: null,
  trafficAlert: null,
  platform: { current: null, pendingChange: null },
  bus: {
    position: null,
    delayMin: 0,
    delayReason: null,
    etaNextStopMin: null,
    etaDestinationIso: null,
  },
  approachingStop: null,
  dwell: null,
  arrived: false,
  connection: 'offline',
};

export function reduceEvent(state: JourneySnapshot, event: DemoEvent): JourneySnapshot {
  switch (event.type) {
    case 'CLOCK_SET':
      return { ...state, clockIso: event.isoTime };

    case 'PHASE_CHANGE': {
      const next: JourneySnapshot = { ...state, phase: event.phase, clockIso: event.at };
      if (event.phase === 'TERMINAL') {
        // The race to the terminal is over; the alert no longer applies.
        next.trafficAlert = null;
      }
      if (event.phase === 'ONBOARD') {
        // Passenger boarded, so a pending platform change is resolved.
        next.platform = { ...state.platform, pendingChange: null };
      }
      if (event.phase === 'ARRIVED') {
        next.arrived = true;
      }
      return next;
    }

    case 'TRAFFIC_ALERT':
      return {
        ...state,
        clockIso: event.at,
        trafficAlert: {
          severity: event.severity,
          etaToTerminalMin: event.etaToTerminalMin,
          message: event.message,
          at: event.at,
        },
      };

    case 'RISK_UPDATE':
      return {
        ...state,
        clockIso: event.at,
        risk: {
          riskPct: event.riskPct,
          canRebook: event.canRebook,
          rebookFeeBRL: event.rebookFeeBRL,
          refundDeadlineIso: event.refundDeadlineIso,
          refundRetentionPct: event.refundRetentionPct,
        },
      };

    case 'PLATFORM_CHANGE':
      return {
        ...state,
        clockIso: event.at,
        platform: {
          current: event.to,
          pendingChange: { from: event.from, to: event.to, walkMinutes: event.walkMinutes },
        },
      };

    case 'BUS_TELEMETRY':
      return {
        ...state,
        clockIso: event.at,
        bus: {
          ...state.bus,
          position: {
            lat: event.lat,
            lng: event.lng,
            speedKmh: event.speedKmh,
            heading: event.heading,
            updatedAtIso: event.at,
          },
          etaNextStopMin: event.etaNextStopMin,
          etaDestinationIso: event.etaDestinationIso,
        },
      };

    case 'DELAY_UPDATE':
      return {
        ...state,
        clockIso: event.at,
        bus: { ...state.bus, delayMin: event.delayMin, delayReason: event.reason },
      };

    case 'STOP_APPROACHING':
      return {
        ...state,
        clockIso: event.at,
        approachingStop: { stopId: event.stopId, inMinutes: event.inMinutes },
        dwell: null,
      };

    case 'STOP_DWELL':
      return {
        ...state,
        clockIso: event.at,
        approachingStop: null,
        dwell: { stopId: event.stopId, dwellMinutes: event.dwellMinutes },
      };

    case 'ARRIVAL':
      return {
        ...state,
        clockIso: event.at,
        arrived: true,
        approachingStop: null,
        dwell: null,
      };

    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  ...initialJourneyState,

  applyEvent: (event) => set((state) => reduceEvent(state, event)),

  hydrateBootstrap: (data) =>
    set((state) => ({
      trip: data.trip ?? state.trip,
      ticket: data.ticket ?? state.ticket,
      stops: data.stops ?? state.stops,
      stats: data.stats ?? state.stats,
      indoorMap: data.indoorMap ?? state.indoorMap,
      dailySeries: data.dailySeries ?? state.dailySeries,
      clockIso: data.serverTimeIso ?? state.clockIso,
    })),

  setConnection: (connection) => set({ connection }),

  reset: () => set(initialJourneyState),
}));

export const selectPhase = (s: JourneyStore): DemoPhase => s.phase;
export const selectClockIso = (s: JourneyStore): string | null => s.clockIso;
export const selectTrip = (s: JourneyStore): Trip | null => s.trip;
export const selectTicket = (s: JourneyStore): Ticket | null => s.ticket;
export const selectStops = (s: JourneyStore): Stop[] => s.stops;
export const selectStats = (s: JourneyStore): RouteStats | null => s.stats;
export const selectIndoorMap = (s: JourneyStore): IndoorMap | null => s.indoorMap;
export const selectDailySeries = (s: JourneyStore): DailyDelayPoint[] => s.dailySeries;
export const selectRisk = (s: JourneyStore): RiskState | null => s.risk;
export const selectTrafficAlert = (s: JourneyStore): TrafficAlertState | null => s.trafficAlert;
export const selectPlatform = (s: JourneyStore): PlatformState => s.platform;
export const selectBus = (s: JourneyStore): BusState => s.bus;
export const selectApproachingStop = (s: JourneyStore): ApproachingStopState | null =>
  s.approachingStop;
export const selectDwell = (s: JourneyStore): DwellState | null => s.dwell;
export const selectArrived = (s: JourneyStore): boolean => s.arrived;
export const selectConnection = (s: JourneyStore): ConnectionMode => s.connection;

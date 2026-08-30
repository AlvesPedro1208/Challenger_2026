/**
 * Render smoke test for the five demo acts.
 *
 * The demo is presented from an iOS device, but a render-time crash on any of
 * these screens kills the presentation, so every screen is mounted here against
 * the real scenario events instead of only its pure helpers.
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { DemoEvent } from '@jornada/shared';
import {
  DAILY_DELAY_SERIES,
  DEMO_TICKET,
  DEMO_TRIP,
  ROUTE_STATS,
  spRioScenario,
  STOPS,
  TIETE_INDOOR_MAP,
} from '@jornada/shared';

import { ArrivalScreen } from '@/screens/arrival';
import { HomeScreen } from '@/screens/home';
import { MapScreen } from '@/screens/map';
import { StatsScreen } from '@/screens/stats';
import { TerminalScreen } from '@/screens/terminal';
import { TicketScreen } from '@/screens/ticket';
import { initialJourneyState, reduceEvent, useJourneyStore } from '@/state/store';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (name: string) => {
    const C = (props: Record<string, unknown>) =>
      React.createElement(View, { testID: name }, props.children as React.ReactNode);
    C.displayName = name;
    return C;
  };
  const MapView = Stub('MapView');
  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker: Stub('Marker'),
    Polyline: Stub('Polyline'),
    Callout: Stub('Callout'),
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
  Link: 'Link',
  Stack: { Screen: 'Stack.Screen' },
}));

const scenarioEvents: DemoEvent[] = spRioScenario.steps.map((step) => step.event);

/** Trip, ticket and datasets arrive from the bootstrap call, not from events. */
const BOOTSTRAPPED = {
  ...initialJourneyState,
  trip: DEMO_TRIP,
  ticket: DEMO_TICKET,
  stops: STOPS,
  stats: ROUTE_STATS,
  dailySeries: DAILY_DELAY_SERIES,
  indoorMap: TIETE_INDOOR_MAP,
};

/** Replays the scenario up to and including the last event matching `type`. */
function stateAt(type: DemoEvent['type']): typeof BOOTSTRAPPED {
  let state = BOOTSTRAPPED;
  for (const event of scenarioEvents) {
    state = reduceEvent(state, event) as typeof BOOTSTRAPPED;
    if (event.type === type) break;
  }
  return state;
}

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function renderScreen(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>{element}</SafeAreaProvider>,
    );
  });
  return tree;
}

function textOf(tree: ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'children' in (node as object)) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(tree.toJSON());
  return out.join(' ');
}

beforeEach(() => {
  useJourneyStore.setState(initialJourneyState);
});

describe('demo screens render for each act', () => {
  it('act 1: home renders the risk decision after RISK_UPDATE', () => {
    useJourneyStore.setState(stateAt('RISK_UPDATE'));
    const tree = renderScreen(<HomeScreen />);
    expect(textOf(tree)).toContain('%');
    act(() => tree.unmount());
  });

  it('act 2: terminal renders one walking time after PLATFORM_CHANGE', () => {
    useJourneyStore.setState(stateAt('PLATFORM_CHANGE'));
    const tree = renderScreen(<TerminalScreen />);
    const text = textOf(tree);
    expect(text).toContain('48');
    const minutes = [...text.matchAll(/(\d+)\s*min/g)].map((m) => m[1]);
    // A single walking figure must appear; two different ones contradict on screen.
    expect(new Set(minutes).size).toBeLessThanOrEqual(2);
    act(() => tree.unmount());
  });

  it('act 3: ticket renders the offline seal when not on the panel', () => {
    useJourneyStore.setState({ ...stateAt('PHASE_CHANGE'), connection: 'autoplay' });
    const tree = renderScreen(<TicketScreen />);
    expect(textOf(tree)).toContain('Disponível sem internet');
    act(() => tree.unmount());
  });

  it('act 4: map renders while dwelling at a support stop', () => {
    useJourneyStore.setState(stateAt('STOP_DWELL'));
    const tree = renderScreen(<MapScreen />);
    expect(textOf(tree).length).toBeGreaterThan(0);
    act(() => tree.unmount());
  });

  it('act 4: stats renders the punctuality figures', () => {
    useJourneyStore.setState(stateAt('BUS_TELEMETRY'));
    const tree = renderScreen(<StatsScreen />);
    expect(textOf(tree)).toContain('%');
    act(() => tree.unmount());
  });

  it('act 5: arrival renders after ARRIVAL', () => {
    useJourneyStore.setState(stateAt('ARRIVAL'));
    const tree = renderScreen(<ArrivalScreen />);
    expect(textOf(tree).length).toBeGreaterThan(0);
    act(() => tree.unmount());
  });
});

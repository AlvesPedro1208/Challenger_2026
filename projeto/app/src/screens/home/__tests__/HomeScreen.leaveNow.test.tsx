/**
 * Act 1: besides rebooking or cancelling, the passenger can decide to leave for
 * the terminal right away and see when they get there.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEMO_TICKET, DEMO_TRIP } from '@jornada/shared';

import { initialJourneyState, useJourneyStore, type JourneySnapshot } from '@/state/store';
import { colors } from '@/theme/tokens';

import { HomeScreen } from '../HomeScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
}));

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const AT_RISK: JourneySnapshot = {
  ...initialJourneyState,
  trip: DEMO_TRIP,
  ticket: DEMO_TICKET,
  phase: 'HOME',
  clockIso: '2026-09-13T20:05:00-03:00',
  trafficAlert: {
    severity: 'moderate',
    etaToTerminalMin: 52,
    message: 'Acidente na Marginal Tietê',
    at: '2026-09-13T20:05:00-03:00',
  },
  risk: {
    riskPct: 38,
    canRebook: true,
    rebookFeeBRL: 20,
    refundDeadlineIso: '2026-09-13T21:30:00-03:00',
    refundRetentionPct: 5,
  },
};

function renderHome(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <HomeScreen />
      </SafeAreaProvider>,
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
  return out.join('');
}

/** Host nodes only, so each button is counted once. */
function buttonLabels(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll(
      (node) => typeof node.type === 'string' && node.props.accessibilityRole === 'button',
      { deep: true },
    )
    .map((node) => String(node.props.accessibilityLabel));
}

function pinkButtonLabels(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll(
      (node) => typeof node.type === 'string' && node.props.accessibilityRole === 'button',
      { deep: true },
    )
    .filter((node) => {
      const style = StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>);
      return style?.backgroundColor === colors.accent.primary;
    })
    .map((node) => String(node.props.accessibilityLabel));
}

function press(tree: ReactTestRenderer, label: string): void {
  const button = tree.root.find(
    (node) => node.props.accessibilityLabel === label && node.props.onPress !== undefined,
  );
  act(() => {
    (button.props.onPress as () => void)();
  });
}

beforeEach(() => {
  mockPush.mockClear();
  useJourneyStore.setState(initialJourneyState);
});

describe('HomeScreen "Sair agora"', () => {
  it('offers leaving now next to rebooking and cancelling', () => {
    useJourneyStore.setState(AT_RISK);
    const tree = renderHome();

    expect(buttonLabels(tree)).toEqual(
      expect.arrayContaining(['Remarcar passagem', 'Sair agora', 'Cancelar com reembolso']),
    );
    expect(pinkButtonLabels(tree)).toEqual(['Remarcar passagem']);
    act(() => tree.unmount());
  });

  it('projects the arrival at the terminal and the margin to board', () => {
    useJourneyStore.setState(AT_RISK);
    const tree = renderHome();

    press(tree, 'Sair agora');

    const text = textOf(tree);
    expect(text).toContain('Saída confirmada');
    expect(text).toContain('Chegada ao terminal às 20:57 · em 52 min');
    expect(text).toContain('Sobram 1h 33min até o embarque na plataforma 45.');
    expect(buttonLabels(tree)).not.toContain('Remarcar passagem');
    expect(pinkButtonLabels(tree)).toEqual(['Ver rota até o terminal']);
    act(() => tree.unmount());
  });

  it('opens the route to the terminal', () => {
    useJourneyStore.setState(AT_RISK);
    const tree = renderHome();

    press(tree, 'Sair agora');
    press(tree, 'Ver rota até o terminal');

    expect(mockPush).toHaveBeenCalledWith('/map');
    act(() => tree.unmount());
  });

  it('warns when the margin is short', () => {
    useJourneyStore.setState({ ...AT_RISK, clockIso: '2026-09-13T21:30:00-03:00' });
    const tree = renderHome();

    press(tree, 'Sair agora');

    expect(textOf(tree)).toContain('Margem curta: 8min até o embarque na plataforma 45.');
    act(() => tree.unmount());
  });

  it('falls back to the map without a traffic ETA', () => {
    useJourneyStore.setState({ ...AT_RISK, trafficAlert: null });
    const tree = renderHome();

    press(tree, 'Sair agora');

    expect(textOf(tree)).toContain('Sem previsão de trânsito no momento.');
    expect(buttonLabels(tree)).toContain('Ver rota até o terminal');
    act(() => tree.unmount());
  });

  it('does not duplicate the route button while already heading to the terminal', () => {
    useJourneyStore.setState({ ...AT_RISK, phase: 'EN_ROUTE_TERMINAL' });
    const tree = renderHome();

    press(tree, 'Sair agora');

    const routeButtons = buttonLabels(tree).filter(
      (label) => label === 'Ver rota até o terminal',
    );
    expect(routeButtons).toHaveLength(1);
    act(() => tree.unmount());
  });

  it('brings the options back with "Rever opções"', () => {
    useJourneyStore.setState(AT_RISK);
    const tree = renderHome();

    press(tree, 'Sair agora');
    press(tree, 'Rever opções');

    expect(buttonLabels(tree)).toEqual(
      expect.arrayContaining(['Remarcar passagem', 'Sair agora', 'Cancelar com reembolso']),
    );
    act(() => tree.unmount());
  });
});
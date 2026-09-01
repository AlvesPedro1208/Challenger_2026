/**
 * The arrival has no tab. Tapping any tab during the last act must not strand
 * the passenger: the trip screen keeps a contextual door back to `/arrival`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEMO_TICKET, DEMO_TRIP } from '@jornada/shared';

import { initialJourneyState, useJourneyStore } from '@/state/store';
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

const BOOTSTRAPPED = { ...initialJourneyState, trip: DEMO_TRIP, ticket: DEMO_TICKET };

const CTA_LABEL = 'Ver recomendações do destino';

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

/** Buttons expose their label through `accessibilityLabel`, variant aside. */
function buttonLabels(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => node.props.accessibilityRole === 'button', { deep: true })
    .map((node) => String(node.props.accessibilityLabel));
}

/** Labels of the buttons painted with the screen's single primary colour. */
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

beforeEach(() => {
  mockPush.mockClear();
  useJourneyStore.setState(initialJourneyState);
});

describe('HomeScreen arrival CTA', () => {
  it('stays out of the way while the journey is still running', () => {
    useJourneyStore.setState({ ...BOOTSTRAPPED, phase: 'ONBOARD' });

    const tree = renderHome();

    expect(buttonLabels(tree)).not.toContain(CTA_LABEL);
    act(() => tree.unmount());
  });

  it('offers the way back to the arrival once the passenger has landed', () => {
    useJourneyStore.setState({ ...BOOTSTRAPPED, phase: 'ARRIVED', arrived: true });

    const tree = renderHome();
    const cta = tree.root.find(
      (node) => node.props.accessibilityLabel === CTA_LABEL && node.props.onPress !== undefined,
    );
    act(() => {
      (cta.props.onPress as () => void)();
    });

    expect(mockPush).toHaveBeenCalledWith('/arrival');
    act(() => tree.unmount());
  });

  it('keeps a single primary action on the arrival act', () => {
    useJourneyStore.setState({ ...BOOTSTRAPPED, phase: 'ARRIVED', arrived: true });

    const tree = renderHome();

    // The map is still reachable, demoted to a secondary action: after landing,
    // the recommendations are the obvious next step.
    expect(buttonLabels(tree)).toContain('Acompanhar no mapa');
    expect(pinkButtonLabels(tree)).toEqual([CTA_LABEL]);
    act(() => tree.unmount());
  });
});

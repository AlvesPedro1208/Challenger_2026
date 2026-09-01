/**
 * The badge floats above every screen, the settings screen included, so its
 * long press has to know where it already is: without that check a second long
 * press stacks another copy of the settings screen, and each copy needs its own
 * way back.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import { DataSourceIndicator } from '../DataSourceIndicator';

const mockPush = jest.fn();
let mockPathname = '/';

// Hoisted above the imports by jest; the factory only closes over the mocks,
// it never reads them before the test does.
jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function renderBadge(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <DataSourceIndicator />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

/** The badge itself: the only node carrying the long-press gesture. */
function badgeButton(tree: ReactTestRenderer): ReactTestInstance {
  const [button] = tree.root.findAll(
    (node) => typeof (node.props as { onLongPress?: unknown }).onLongPress === 'function',
  );
  return button;
}

function longPress(tree: ReactTestRenderer): void {
  const { onLongPress } = badgeButton(tree).props as { onLongPress: () => void };
  act(() => {
    onLongPress();
  });
}

beforeEach(() => {
  mockPush.mockClear();
  mockPathname = '/';
});

describe('DataSourceIndicator', () => {
  it('opens the server settings on a long press from another screen', () => {
    longPress(renderBadge());

    expect(mockPush).toHaveBeenCalledWith('/server-settings');
  });

  it('does not stack a second copy of the screen it is already on', () => {
    mockPathname = '/server-settings';

    longPress(renderBadge());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('keeps the touch target reachable around the small badge', () => {
    expect(badgeButton(renderBadge()).props).toMatchObject({ hitSlop: 12 });
  });
});

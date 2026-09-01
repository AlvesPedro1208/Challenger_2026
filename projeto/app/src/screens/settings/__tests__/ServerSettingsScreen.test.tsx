import { describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServerSettingsScreen } from '../ServerSettingsScreen';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
// The screen reads the saved override through serverConfig, whose AsyncStorage
// native module is null under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/server-settings',
}));

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

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

describe('ServerSettingsScreen', () => {
  it('renders the base in use and the way out', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
          <ServerSettingsScreen />
        </SafeAreaProvider>,
      );
    });

    const text = textOf(tree);
    expect(text).toContain('Servidor da demo');
    expect(text).toContain('Em uso agora');
    // No override and no Metro host under Jest: the development fallback shows.
    expect(text).toContain('http://localhost:4000');
    expect(text).toContain('ws://localhost:4000/ws');
    expect(text).toContain('Testar conexão');
    expect(text).toContain('Voltar para a viagem');

    act(() => tree.unmount());
  });
});

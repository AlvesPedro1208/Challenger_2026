import { describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
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

async function render(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <ServerSettingsScreen />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function byLabel(tree: ReactTestRenderer, label: string): ReactTestInstance {
  return tree.root.find(
    (node) =>
      typeof node.type !== 'string' && node.props.accessibilityLabel === label && !!node.props.style,
  );
}

describe('ServerSettingsScreen', () => {
  it('renders the base in use and the way out', async () => {
    const tree = await render();

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

  it('names the base source as a status pill instead of a plain line', async () => {
    const tree = await render();

    // Metro under Jest: the source the operator must not present with.
    expect(textOf(tree)).toContain('Rede local do Metro');

    act(() => tree.unmount());
  });

  it('states the test outcome in words, not only in colour', async () => {
    const tree = await render();
    expect(textOf(tree)).toContain('Sem teste ainda');

    const input = byLabel(tree, 'URL do servidor');
    await act(async () => {
      input.props.onChangeText('not a url');
    });
    await act(async () => {
      byLabel(tree, 'Testar conexão').props.onPress();
    });

    expect(textOf(tree)).toContain('URL inválida');

    act(() => tree.unmount());
  });

  it('asks for a second tap before discarding the saved URL', async () => {
    const tree = await render();

    await act(async () => {
      byLabel(tree, 'Limpar e voltar ao padrão').props.onPress();
    });
    expect(textOf(tree)).toContain('Tocar de novo para confirmar');
    expect(textOf(tree)).not.toContain('URL removida');

    await act(async () => {
      byLabel(tree, 'Tocar de novo para confirmar').props.onPress();
    });
    expect(textOf(tree)).toContain('URL removida');

    act(() => tree.unmount());
  });

  it('disarms the confirmation when the operator types instead', async () => {
    const tree = await render();

    await act(async () => {
      byLabel(tree, 'Limpar e voltar ao padrão').props.onPress();
    });
    await act(async () => {
      byLabel(tree, 'URL do servidor').props.onChangeText('https://algo.trycloudflare.com');
    });

    expect(textOf(tree)).not.toContain('Tocar de novo para confirmar');

    act(() => tree.unmount());
  });

  it('offers an inline way to empty the field once it has text', async () => {
    const tree = await render();

    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Apagar o texto do campo'))
      .toHaveLength(0);

    await act(async () => {
      byLabel(tree, 'URL do servidor').props.onChangeText('https://algo.trycloudflare.com');
    });
    await act(async () => {
      byLabel(tree, 'Apagar o texto do campo').props.onPress();
    });

    expect(byLabel(tree, 'URL do servidor').props.value).toBe('');

    act(() => tree.unmount());
  });
});

import { describe, expect, it } from '@jest/globals';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';

import { STOPS } from '@jornada/shared';

import { RouteSchematic } from '../RouteSchematic';

describe('RouteSchematic', () => {
  it('renders the route with a notice instead of a black map', () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<RouteSchematic stops={STOPS} bus={null} />);
    });
    expect(tree.root.findByProps({ testID: 'route-schematic' })).toBeTruthy();
    const text = tree.root
      .findAllByType(Text)
      .map((node) => [node.props.children].flat().join(''))
      .join(' ');
    expect(text).toContain('Mapa simplificado');
    act(() => tree.unmount());
  });
});
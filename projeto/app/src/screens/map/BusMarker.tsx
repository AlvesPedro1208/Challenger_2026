import { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { BusPosition } from '@jornada/shared';

type BusMarkerProps = {
  position: BusPosition;
};

export function BusMarker({ position }: BusMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: position.lat, longitude: position.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={position.heading}
      flat
      zIndex={10}
      title="Seu ônibus"
    >
      <Svg width={38} height={38} viewBox="0 0 38 38">
        <Circle
          cx={19}
          cy={19}
          r={16}
          fill={colors.accent.primary}
          stroke={colors.text.primary}
          strokeWidth={2.5}
        />
        <Path d="M19 9.5 L25.5 25 L19 21.2 L12.5 25 Z" fill={colors.text.primary} />
      </Svg>
    </Marker>
  );
}

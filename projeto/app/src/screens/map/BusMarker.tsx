import { useEffect, useRef, useState } from 'react';
import { Marker, type LatLng } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { BusPosition } from '@jornada/shared';

type BusMarkerProps = {
  position: BusPosition;
};

/** Glide duration between two telemetry samples, matched to the camera pan. */
const GLIDE_MS = 900;

/** How long the marker artwork keeps being tracked before it is frozen. */
const ARTWORK_SETTLE_MS = 1000;

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Telemetry lands every few seconds and can jump tens of kilometers, so the
 * marker is interpolated between the previous and the new coordinate instead
 * of teleporting. The animation runs inside this component alone, so a frame
 * only re-renders the marker.
 */
function useGlidingCoordinate(target: LatLng): LatLng {
  const [coordinate, setCoordinate] = useState<LatLng>(target);
  const currentRef = useRef<LatLng>(target);
  const frameRef = useRef<number | null>(null);

  const { latitude, longitude } = target;

  useEffect(() => {
    const from = currentRef.current;
    const to = { latitude, longitude };

    if (from.latitude === to.latitude && from.longitude === to.longitude) {
      return;
    }

    const startedAt = Date.now();

    const tick = (): void => {
      const progress = Math.min(1, (Date.now() - startedAt) / GLIDE_MS);
      const eased = easeInOut(progress);
      const next: LatLng = {
        latitude: from.latitude + (to.latitude - from.latitude) * eased,
        longitude: from.longitude + (to.longitude - from.longitude) * eased,
      };

      currentRef.current = next;
      setCoordinate(next);

      frameRef.current = progress < 1 ? requestAnimationFrame(tick) : null;
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [latitude, longitude]);

  return coordinate;
}

/**
 * The marker artwork is static, so it only needs to be rasterized once. Views
 * are tracked briefly on mount (the SVG child may lay out a frame later) and
 * then frozen, so the gliding coordinate does not redraw the icon per frame.
 */
function useSettledArtwork(): boolean {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), ARTWORK_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return tracksViewChanges;
}

export function BusMarker({ position }: BusMarkerProps) {
  const coordinate = useGlidingCoordinate({
    latitude: position.lat,
    longitude: position.lng,
  });
  const tracksViewChanges = useSettledArtwork();

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={position.heading}
      flat
      zIndex={10}
      title="Seu ônibus"
      tracksViewChanges={tracksViewChanges}
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

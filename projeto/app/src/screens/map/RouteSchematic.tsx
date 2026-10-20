import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { BusPosition, Stop } from '@jornada/shared';
import { ROUTE_POINTS } from '@jornada/shared';

import { colors, radii, spacing, typography } from '@/theme/tokens';

import { projectRoute } from './routeSchematic';

const VIEW_W = 360;
const VIEW_H = 640;
const PADDING = 40;

type RouteSchematicProps = {
  stops: Stop[];
  bus: BusPosition | null;
};

/**
 * Drawn instead of the native map when Google Maps cannot load tiles (Android
 * build without an API key), so the screen never goes black in front of the panel.
 */
export function RouteSchematic({ stops, bus }: RouteSchematicProps) {
  const { points, project } = useMemo(() => {
    const projection = projectRoute(ROUTE_POINTS, VIEW_W, VIEW_H, PADDING);
    const line = ROUTE_POINTS.map((point) => {
      const { x, y } = projection.project(point);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return { points: line, project: projection.project };
  }, []);

  const origin = ROUTE_POINTS[0];
  const destination = ROUTE_POINTS[ROUTE_POINTS.length - 1];
  const busPoint = bus ? project(bus) : null;

  return (
    <View style={styles.root} testID="route-schematic">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent.primary}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {origin ? <Endpoint point={project(origin)} /> : null}
        {destination ? <Endpoint point={project(destination)} /> : null}
        {stops.map((stop) => {
          const { x, y } = project(stop);
          return <Circle key={stop.id} cx={x} cy={y} r={6} fill={colors.accent.purple} />;
        })}
        {busPoint ? (
          <>
            <Circle cx={busPoint.x} cy={busPoint.y} r={14} fill={`${colors.accent.success}40`} />
            <Circle cx={busPoint.x} cy={busPoint.y} r={7} fill={colors.accent.success} />
          </>
        ) : null}
      </Svg>
      <View style={styles.notice} pointerEvents="none">
        <Text style={styles.noticeText}>
          Mapa simplificado: o Google Maps precisa de uma chave de API neste aparelho.
        </Text>
      </View>
    </View>
  );
}

function Endpoint({ point }: { point: { x: number; y: number } }) {
  return (
    <Circle
      cx={point.x}
      cy={point.y}
      r={7}
      fill={colors.bg.primary}
      stroke={colors.text.primary}
      strokeWidth={3}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.primary,
  },
  notice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: '45%',
    alignItems: 'center',
  },
  noticeText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    backgroundColor: `${colors.bg.surface}E6`,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
});
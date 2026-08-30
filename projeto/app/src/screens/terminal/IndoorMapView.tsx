import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { IndoorMap, IndoorMapFeature } from '@jornada/shared';

import { colors, radii } from '@/theme/tokens';

import type { IndoorGraph, IndoorRoute } from './indoorRoute';

const HALL = { x: 110, y: 40, width: 690, height: 520 };
const BOARDING_CORRIDOR = { x: 810, y: 40, width: 60, height: 520 };

const PLATFORM_WIDTH = 114;
const PLATFORM_HEIGHT = 38;
const SERVICE_WIDTH = 170;
const SERVICE_HEIGHT = 76;
const GATE_WIDTH = 48;
const GATE_HEIGHT = 90;

const STROKE = colors.text.secondary;
const DEFAULT_ASPECT_RATIO = 1000 / 600;

function aspectRatioOf(viewBox: string): number {
  const parts = viewBox.trim().split(/\s+/);
  const width = Number(parts[2]);
  const height = Number(parts[3]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    return DEFAULT_ASPECT_RATIO;
  }
  return width / height;
}

/** SVG text does not wrap: break long labels into at most two balanced lines. */
function labelLines(label: string): string[] {
  const words = label.split(' ');
  if (words.length < 2 || label.length <= 12) {
    return [label];
  }
  let bestIndex = 1;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const head = words.slice(0, i).join(' ').length;
    const delta = Math.abs(label.length - head - head);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }
  return [words.slice(0, bestIndex).join(' '), words.slice(bestIndex).join(' ')];
}

function polylinePoints(route: IndoorRoute): string {
  return route.points.map((point) => `${point.x},${point.y}`).join(' ');
}

type IndoorMapViewProps = {
  map: IndoorMap;
  /**
   * Corridor graph of this very map (from `indoorGraphFor`). Null means the
   * corridors are unknown for the map being drawn, so they are omitted.
   */
  graph: IndoorGraph | null;
  /** Platform label (ex.: "48") drawn as a filled pink pill. */
  activePlatform: string | null;
  route: IndoorRoute | null;
};

export function IndoorMapView({ map, graph, activePlatform, route }: IndoorMapViewProps) {
  const start = route?.points[0];
  const nodePosition = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );

  return (
    <View style={[styles.frame, { aspectRatio: aspectRatioOf(map.viewBox) }]}>
      <Svg width="100%" height="100%" viewBox={map.viewBox}>
        <Rect
          x={HALL.x}
          y={HALL.y}
          width={HALL.width}
          height={HALL.height}
          rx={28}
          fill={colors.bg.surface}
          fillOpacity={0.55}
          stroke={STROKE}
          strokeOpacity={0.2}
          strokeWidth={2}
        />
        <Rect
          x={BOARDING_CORRIDOR.x}
          y={BOARDING_CORRIDOR.y}
          width={BOARDING_CORRIDOR.width}
          height={BOARDING_CORRIDOR.height}
          rx={20}
          fill={colors.bg.surface}
          fillOpacity={0.55}
          stroke={STROKE}
          strokeOpacity={0.2}
          strokeWidth={2}
        />

        {(graph?.edges ?? []).map(([fromId, toId]) => {
          const from = nodePosition.get(fromId);
          const to = nodePosition.get(toId);
          if (!from || !to) {
            return null;
          }
          return (
            <Line
              key={`${fromId}-${toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={STROKE}
              strokeOpacity={0.18}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}

        {map.services.map((service: IndoorMapFeature) => (
          <Rect
            key={service.id}
            x={service.x - SERVICE_WIDTH / 2}
            y={service.y - SERVICE_HEIGHT / 2}
            width={SERVICE_WIDTH}
            height={SERVICE_HEIGHT}
            rx={18}
            fill={colors.bg.surface}
            stroke={STROKE}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        ))}

        {map.services.map((service: IndoorMapFeature) => {
          const lines = labelLines(service.label);
          const firstY = lines.length > 1 ? service.y - 4 : service.y + 6;
          return lines.map((line, index) => (
            <SvgText
              key={`${service.id}-line-${index}`}
              x={service.x}
              y={firstY + index * 22}
              fill={colors.text.secondary}
              fontSize={17}
              fontWeight="600"
              textAnchor="middle"
            >
              {line}
            </SvgText>
          ));
        })}

        {map.gates.map((gate: IndoorMapFeature) => (
          <Rect
            key={gate.id}
            x={gate.x - GATE_WIDTH / 2}
            y={gate.y - GATE_HEIGHT / 2}
            width={GATE_WIDTH}
            height={GATE_HEIGHT}
            rx={14}
            fill={colors.bg.surface}
            stroke={STROKE}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        ))}

        {map.gates.map((gate: IndoorMapFeature) => (
          <SvgText
            key={`${gate.id}-label`}
            x={gate.x - GATE_WIDTH / 2}
            y={gate.y + GATE_HEIGHT / 2 + 30}
            fill={colors.text.secondary}
            fontSize={16}
            fontWeight="600"
            textAnchor="start"
          >
            {gate.label}
          </SvgText>
        ))}

        <SvgText
          x={935}
          y={28}
          fill={colors.text.secondary}
          fontSize={15}
          fontWeight="700"
          textAnchor="middle"
        >
          PLATAFORMAS
        </SvgText>

        {map.platforms.map((platform: IndoorMapFeature) => {
          const isActive = platform.label === activePlatform;
          return (
            <Rect
              key={platform.id}
              x={platform.x - PLATFORM_WIDTH / 2}
              y={platform.y - PLATFORM_HEIGHT / 2}
              width={PLATFORM_WIDTH}
              height={PLATFORM_HEIGHT}
              rx={PLATFORM_HEIGHT / 2}
              fill={isActive ? colors.accent.primary : colors.bg.surface}
              stroke={isActive ? colors.accent.primary : STROKE}
              strokeOpacity={isActive ? 1 : 0.35}
              strokeWidth={2}
            />
          );
        })}

        {map.platforms.map((platform: IndoorMapFeature) => {
          const isActive = platform.label === activePlatform;
          return (
            <SvgText
              key={`${platform.id}-label`}
              x={platform.x}
              y={platform.y + 8}
              fill={isActive ? colors.text.primary : colors.text.secondary}
              fontSize={22}
              fontWeight={isActive ? '800' : '600'}
              textAnchor="middle"
            >
              {platform.label}
            </SvgText>
          );
        })}

        {route ? (
          <Polyline
            points={polylinePoints(route)}
            fill="none"
            stroke={colors.accent.primary}
            strokeWidth={7}
            strokeDasharray="16 14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {start ? (
          <G>
            <Circle
              cx={start.x}
              cy={start.y}
              r={17}
              fill={colors.accent.primary}
              fillOpacity={0.25}
            />
            <Circle cx={start.x} cy={start.y} r={9} fill={colors.text.primary} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg.primary,
  },
});

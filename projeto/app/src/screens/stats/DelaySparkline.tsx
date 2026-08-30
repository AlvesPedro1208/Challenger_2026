import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import type { DailyDelayPoint } from '@jornada/shared';

import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { formatPeriod, formatShortDate, maxPointIndex } from './helpers';

const CHART_HEIGHT = 120;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 8;

type DelaySparklineProps = {
  series: DailyDelayPoint[];
};

export function DelaySparkline({ series }: DelaySparklineProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  };

  const maxDelay = series.reduce((max, point) => Math.max(max, point.delayMin), 0);
  const peakIndex = maxPointIndex(series);
  const peak = series[peakIndex];

  const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = series.length > 1 ? width / (series.length - 1) : 0;

  const pointAt = (i: number, delayMin: number): [number, number] => {
    const x = series.length > 1 ? i * stepX : width / 2;
    const ratio = maxDelay > 0 ? delayMin / maxDelay : 0;
    const y = PADDING_TOP + (1 - ratio) * usableHeight;
    return [x, y];
  };

  const linePoints = series
    .map((point, i) => pointAt(i, point.delayMin).join(','))
    .join(' ');

  const areaPoints =
    series.length > 1
      ? `0,${CHART_HEIGHT - PADDING_BOTTOM} ${linePoints} ${width},${CHART_HEIGHT - PADDING_BOTTOM}`
      : '';

  const [peakX, peakY] = peak ? pointAt(peakIndex, peak.delayMin) : [0, 0];

  return (
    <Card>
      <Text style={styles.title}>Atraso médio por dia</Text>
      <View style={styles.chartBox} onLayout={onLayout}>
        {width > 0 && series.length > 1 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Line
              x1={0}
              y1={CHART_HEIGHT - PADDING_BOTTOM}
              x2={width}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke={`${colors.text.secondary}40`}
              strokeWidth={1}
            />
            <Polygon points={areaPoints} fill={`${colors.accent.purple}24`} />
            <Polyline
              points={linePoints}
              fill="none"
              stroke={colors.accent.purple}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {peak ? (
              <>
                <Circle
                  cx={peakX}
                  cy={peakY}
                  r={7}
                  fill={`${colors.accent.primary}40`}
                />
                <Circle cx={peakX} cy={peakY} r={4} fill={colors.accent.primary} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legend}>{formatPeriod(series)}</Text>
        {peak ? (
          <Text style={styles.legendPeak}>
            pico {peak.delayMin} min · {formatShortDate(peak.date)}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  chartBox: {
    height: CHART_HEIGHT,
    marginTop: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  legend: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  legendPeak: {
    ...typography.caption,
    fontWeight: '700',
    // Raw pink is 4.0:1 on the card; the lightened tone clears AA at this size.
    color: colors.onTone.primary,
  },
});

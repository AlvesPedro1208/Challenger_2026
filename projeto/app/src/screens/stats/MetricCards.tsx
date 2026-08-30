import { StyleSheet, Text, View } from 'react-native';
import type { DelayHistogramBucket } from '@jornada/shared';

import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { onTimePct, worstObservedBucket } from './helpers';

type MetricCardsProps = {
  avgDelayMin: number;
  histogram: DelayHistogramBucket[];
};

export function MetricCards({ avgDelayMin, histogram }: MetricCardsProps) {
  const onTime = onTimePct(histogram);
  const worst = worstObservedBucket(histogram);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Card style={styles.half}>
          <Text style={styles.label}>Atraso médio</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{avgDelayMin}</Text>
            <Text style={styles.valueUnit}>min</Text>
          </View>
          <Text style={styles.caption}>quando há atraso</Text>
        </Card>
        <Card style={styles.half}>
          <Text style={styles.label}>No horário</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, styles.valueSuccess]}>{onTime}</Text>
            <Text style={[styles.valueUnit, styles.valueSuccess]}>%</Text>
          </View>
          <Text style={styles.caption}>das viagens do trecho</Text>
        </Card>
      </View>
      {worst ? (
        <Card style={styles.wide}>
          <View style={styles.wideRow}>
            <View>
              <Text style={styles.label}>Pior faixa observada</Text>
              <Text style={styles.worstValue}>{worst.bucketLabel}</Text>
            </View>
            <View style={styles.worstCountBox}>
              <Text style={styles.worstCount}>{worst.count}</Text>
              <Text style={styles.caption}>
                {worst.count === 1 ? 'viagem' : 'viagens'}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  wide: {
    width: '100%',
  },
  wideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text.primary,
  },
  valueUnit: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  valueSuccess: {
    color: colors.accent.success,
  },
  caption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  worstValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.accent.warning,
    marginTop: spacing.sm,
  },
  worstCountBox: {
    alignItems: 'flex-end',
  },
  worstCount: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
  },
});

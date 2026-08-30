import { StyleSheet, Text, View } from 'react-native';
import type { DelayHistogramBucket } from '@jornada/shared';

import { Card } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { dominantBucketIndex } from './helpers';

const BAR_MAX_HEIGHT = 116;
const BAR_MIN_HEIGHT = 4;

type DelayHistogramProps = {
  histogram: DelayHistogramBucket[];
};

export function DelayHistogram({ histogram }: DelayHistogramProps) {
  const maxCount = histogram.reduce((max, bucket) => Math.max(max, bucket.count), 0);
  const dominant = dominantBucketIndex(histogram);

  return (
    <Card>
      <Text style={styles.title}>Distribuição de pontualidade</Text>
      <View style={styles.chart}>
        {histogram.map((bucket, i) => {
          const ratio = maxCount > 0 ? bucket.count / maxCount : 0;
          const height = Math.max(BAR_MIN_HEIGHT, Math.round(ratio * BAR_MAX_HEIGHT));
          const isDominant = i === dominant;

          return (
            <View key={bucket.bucketLabel} style={styles.column}>
              <Text style={[styles.count, isDominant && styles.countDominant]}>
                {bucket.count}
              </Text>
              <View
                style={[
                  styles.bar,
                  { height },
                  isDominant ? styles.barDominant : styles.barMuted,
                ]}
              />
              <Text style={styles.bucketLabel} numberOfLines={2}>
                {bucket.bucketLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  count: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  countDominant: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  bar: {
    alignSelf: 'stretch',
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  barDominant: {
    backgroundColor: colors.accent.purple,
  },
  barMuted: {
    backgroundColor: `${colors.accent.purple}47`,
  },
  bucketLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
  },
});

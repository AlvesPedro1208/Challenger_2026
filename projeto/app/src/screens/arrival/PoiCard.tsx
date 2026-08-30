import { StyleSheet, Text, View } from 'react-native';

import type { Poi } from '@jornada/shared';

import { Card } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { CATEGORY_LABELS, WELL_RATED_THRESHOLD } from './arrivalLogic';

type PoiCardProps = {
  poi: Poi;
};

export function PoiCard({ poi }: PoiCardProps) {
  const wellRated = poi.rating >= WELL_RATED_THRESHOLD;
  const fillPct = Math.min(100, Math.max(0, (poi.rating / 5) * 100));

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {poi.name}
          </Text>
          <Text style={styles.category}>{CATEGORY_LABELS[poi.category]}</Text>
        </View>
        {wellRated ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Bem avaliado</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingValue}>{poi.rating.toFixed(1)}</Text>
        <View style={styles.ratingTrack}>
          <View style={[styles.ratingFill, { width: `${fillPct}%` }]} />
        </View>
        <Text style={styles.ratingScale}>de 5</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  category: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: `${colors.accent.success}26`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.success,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  ratingValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 32,
  },
  ratingTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: `${colors.accent.purple}33`,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent.purple,
  },
  ratingScale: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});

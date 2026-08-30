import { StyleSheet, Text, View } from 'react-native';

import type { Trip, UserRouteStats } from '@jornada/shared';
import { SP_RIO_ROUTE_KM } from '@jornada/shared';

import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { tripDurationHours } from './arrivalLogic';

type RouteHistoryCardProps = {
  stats: UserRouteStats;
  trip: Trip | null;
  /** Quando true, a viagem atual entra na conta dos números. */
  includeCurrentTrip: boolean;
};

type StatItemProps = {
  value: string;
  label: string;
};

function StatItem({ value, label }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const numberFormat = new Intl.NumberFormat('pt-BR');

export function RouteHistoryCard({ stats, trip, includeCurrentTrip }: RouteHistoryCardProps) {
  const extraTrips = includeCurrentTrip ? 1 : 0;
  const extraKm = includeCurrentTrip ? SP_RIO_ROUTE_KM : 0;
  const extraHours = includeCurrentTrip && trip ? tripDurationHours(trip) : 0;

  const trips = stats.tripsCount + extraTrips;
  const km = Math.round(stats.totalKm + extraKm);
  const hours = Math.round(stats.totalHours + extraHours);

  return (
    <Card>
      <Text style={styles.sectionLabel}>Sua história nesta rota</Text>
      <View style={styles.statsRow}>
        <StatItem value={String(trips)} label={trips === 1 ? 'viagem' : 'viagens'} />
        <View style={styles.divider} />
        <StatItem value={numberFormat.format(km)} label="km percorridos" />
        <View style={styles.divider} />
        <StatItem value={String(hours)} label="horas a bordo" />
      </View>
      {includeCurrentTrip ? (
        <Text style={styles.footnote}>Já contando a viagem de hoje.</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: `${colors.accent.purple}40`,
    marginHorizontal: spacing.sm,
  },
  footnote: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

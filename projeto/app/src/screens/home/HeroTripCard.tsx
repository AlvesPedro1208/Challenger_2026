import { StyleSheet, Text, View } from 'react-native';

import type { Trip } from '@jornada/shared';

import { Card, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { countdownBetween, formatCountdown, formatDepartureLabel } from './format';

type HeroTripCardProps = {
  trip: Trip;
  clockIso: string | null;
  platformCurrent: string | null;
  allClear: boolean;
};

export function HeroTripCard({ trip, clockIso, platformCurrent, allClear }: HeroTripCardProps) {
  const countdown = countdownBetween(clockIso, trip.departureIso);
  const platform = platformCurrent ?? trip.platform;

  return (
    <Card style={styles.card}>
      <Text style={styles.city}>{trip.origin}</Text>
      <Text style={styles.city}>
        <Text style={styles.arrow}>→ </Text>
        {trip.destination}
      </Text>

      <Text style={styles.departure}>{formatDepartureLabel(trip.departureIso)}</Text>
      <Text style={styles.meta}>
        {trip.company} · {trip.busClass} · Poltrona {trip.seat}
      </Text>

      <View style={styles.pillRow}>
        <StatusPill label={`Plataforma ${platform}`} tone="purple" />
        {allClear ? <StatusPill label="Tudo certo para sua viagem" tone="success" /> : null}
      </View>

      <View style={styles.countdownBlock}>
        <Text style={styles.countdownLabel}>Partida em</Text>
        <Text style={styles.countdownValue}>{countdown ? formatCountdown(countdown) : '--'}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  city: {
    ...typography.display,
    color: colors.text.primary,
  },
  arrow: {
    color: colors.text.secondary,
  },
  departure: {
    ...typography.subtitle,
    color: colors.accent.primary,
    marginTop: spacing.sm,
  },
  meta: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  countdownBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
  },
  countdownLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  countdownValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
});

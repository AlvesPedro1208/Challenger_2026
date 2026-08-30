import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { Ticket, Trip } from '@jornada/shared';

import { cityName, placeComplement } from '@/lib/place';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { formatDepartureIso } from './formatters';
import { TicketField } from './TicketField';

type TicketCardProps = {
  trip: Trip;
  ticket: Ticket;
  platform: string;
};

export function TicketCard({ trip, ticket, platform }: TicketCardProps) {
  const departure = formatDepartureIso(trip.departureIso);
  const originTerminal = placeComplement(trip.origin);
  const destinationTerminal = placeComplement(trip.destination);
  const terminals =
    originTerminal && destinationTerminal ? `${originTerminal} → ${destinationTerminal}` : null;

  return (
    <View style={styles.card}>
      <View style={styles.qrWrap}>
        <QRCode
          value={ticket.qrPayload}
          size={188}
          backgroundColor={colors.ticket.surface}
          color={colors.ticket.ink}
        />
      </View>

      <Text style={styles.passenger}>{ticket.passengerName}</Text>
      <Text style={styles.company}>{trip.company}</Text>

      <View style={styles.divider} />

      {/* Cities only: the full place names truncate inside these half-width columns. */}
      <View style={styles.routeRow}>
        <Text style={styles.routeText} numberOfLines={2}>
          {cityName(trip.origin)}
        </Text>
        <Text style={styles.routeArrow}>→</Text>
        <Text style={[styles.routeText, styles.routeRight]} numberOfLines={2}>
          {cityName(trip.destination)}
        </Text>
      </View>

      {terminals ? (
        <Text style={styles.terminals} numberOfLines={2}>
          {terminals}
        </Text>
      ) : null}

      {departure ? (
        <Text style={styles.departure}>
          {departure.date} · <Text style={styles.departureTime}>{departure.time}</Text>
        </Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.fieldsRow}>
        <TicketField label="Poltrona" value={ticket.seat} />
        <TicketField label="Classe" value={trip.busClass} />
        <TicketField label="Plataforma" value={platform} align="right" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ticket.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'stretch',
  },
  qrWrap: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
  passenger: {
    ...typography.title,
    color: colors.ticket.ink,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  company: {
    ...typography.caption,
    color: colors.ticket.inkSoft,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ticket.divider,
    marginVertical: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeText: {
    ...typography.subtitle,
    color: colors.ticket.ink,
    flex: 1,
  },
  routeRight: {
    textAlign: 'right',
  },
  routeArrow: {
    ...typography.subtitle,
    color: colors.accent.primary,
  },
  terminals: {
    ...typography.caption,
    color: colors.ticket.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  departure: {
    ...typography.body,
    color: colors.ticket.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  departureTime: {
    fontWeight: '700',
    color: colors.accent.primary,
  },
  fieldsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

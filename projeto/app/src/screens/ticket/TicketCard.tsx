import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { Ticket, Trip } from '@jornada/shared';

import { colors, radii, spacing, typography } from '@/theme/tokens';

import { formatDepartureIso } from './formatters';
import { TicketField } from './TicketField';

const INK = '#1A1A1A';
const INK_SOFT = '#6B6572';
const DIVIDER = '#ECE9F1';

type TicketCardProps = {
  trip: Trip;
  ticket: Ticket;
  platform: string;
};

export function TicketCard({ trip, ticket, platform }: TicketCardProps) {
  const departure = formatDepartureIso(trip.departureIso);

  return (
    <View style={styles.card}>
      <View style={styles.qrWrap}>
        <QRCode value={ticket.qrPayload} size={188} backgroundColor="#FFFFFF" color={INK} />
      </View>

      <Text style={styles.passenger}>{ticket.passengerName}</Text>
      <Text style={styles.company}>{trip.company}</Text>

      <View style={styles.divider} />

      <View style={styles.routeRow}>
        <Text style={styles.routeText} numberOfLines={2}>
          {trip.origin}
        </Text>
        <Text style={styles.routeArrow}>→</Text>
        <Text style={[styles.routeText, styles.routeRight]} numberOfLines={2}>
          {trip.destination}
        </Text>
      </View>

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
    backgroundColor: '#FFFFFF',
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
    color: INK,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  company: {
    ...typography.caption,
    color: INK_SOFT,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeText: {
    ...typography.subtitle,
    color: INK,
    flex: 1,
  },
  routeRight: {
    textAlign: 'right',
  },
  routeArrow: {
    ...typography.subtitle,
    color: colors.accent.primary,
  },
  departure: {
    ...typography.body,
    color: INK_SOFT,
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

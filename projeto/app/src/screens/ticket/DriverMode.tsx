import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { Ticket, Trip } from '@jornada/shared';

import { radii, spacing, typography } from '@/theme/tokens';

import { formatDepartureIso } from './formatters';

const INK = '#1A1A1A';
const INK_SOFT = '#6B6572';

type DriverModeProps = {
  visible: boolean;
  trip: Trip;
  ticket: Ticket;
  platform: string;
  onClose: () => void;
};

export function DriverMode({ visible, trip, ticket, platform, onClose }: DriverModeProps) {
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - spacing.xl * 2, 320);
  const departure = formatDepartureIso(trip.departureIso);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.qrArea}>
          <QRCode value={ticket.qrPayload} size={qrSize} backgroundColor="#FFFFFF" color={INK} />
        </View>

        <View style={styles.details}>
          <Text style={styles.passenger}>{ticket.passengerName}</Text>
          <Text style={styles.meta}>
            Poltrona {ticket.seat} · {trip.busClass}
          </Text>
          <Text style={styles.meta}>
            Plataforma {platform}
            {departure ? ` · Partida ${departure.time}` : ''}
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
        >
          <Text style={styles.closeLabel}>Fechar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  qrArea: {
    padding: spacing.md,
  },
  details: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  passenger: {
    ...typography.title,
    color: INK,
  },
  meta: {
    ...typography.subtitle,
    color: INK_SOFT,
  },
  closeButton: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: INK,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
  },
  closePressed: {
    opacity: 0.6,
  },
  closeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
  },
});

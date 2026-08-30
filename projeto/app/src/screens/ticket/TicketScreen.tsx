import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, StatusPill } from '@/components/ui';
import {
  selectBus,
  selectConnection,
  selectPlatform,
  selectTicket,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, spacing, typography } from '@/theme/tokens';

import { DriverMode } from './DriverMode';
import { formatDelay } from './formatters';
import { TicketCard } from './TicketCard';
import { TicketSkeleton } from './TicketSkeleton';

export function TicketScreen() {
  const trip = useJourneyStore(selectTrip);
  const ticket = useJourneyStore(selectTicket);
  const platform = useJourneyStore(selectPlatform);
  const bus = useJourneyStore(selectBus);
  const connection = useJourneyStore(selectConnection);

  const [driverModeVisible, setDriverModeVisible] = useState(false);

  const currentPlatform = platform.current ?? trip?.platform ?? '—';
  const delayed = bus.delayMin > 0;
  // Airplane mode settles on 'autoplay' (the WS client gives up and hands over
  // to the embedded scenario), so anything other than a live panel connection
  // means the ticket is being served from the device.
  const isOffline = connection !== 'panel';

  if (!trip || !ticket) {
    return (
      <Screen>
        <Text style={styles.title}>Bilhete</Text>
        <View style={styles.section}>
          <TicketSkeleton />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Bilhete</Text>

      <View style={styles.section}>
        <StatusPill
          label={delayed ? formatDelay(bus.delayMin) : 'Tudo certo para sua viagem'}
          tone={delayed ? 'warning' : 'success'}
        />
      </View>

      <View style={styles.section}>
        <TicketCard trip={trip} ticket={ticket} platform={currentPlatform} />
      </View>

      {isOffline ? (
        <View style={styles.offlineRow}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineText}>Disponível offline — funciona sem internet</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <PrimaryButton label="Mostrar ao motorista" onPress={() => setDriverModeVisible(true)} />
      </View>

      <DriverMode
        visible={driverModeVisible}
        trip={trip}
        ticket={ticket}
        platform={currentPlatform}
        onClose={() => setDriverModeVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  section: {
    marginTop: spacing.md,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.sm + 4,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.success,
  },
  offlineText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});

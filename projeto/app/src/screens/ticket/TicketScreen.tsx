import { useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, StatusPill } from '@/components/ui';
import { navigateToPhaseRoute } from '@/navigation/phaseRoutes';
// Same floating glyph the map uses, so "back" looks identical everywhere the
// demo can strand the passenger. Reused rather than copied: it is a leaf
// control with no map dependency.
import { MapBackButton } from '@/screens/map/MapBackButton';
import {
  selectBus,
  selectConnection,
  selectPhase,
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
  const router = useRouter();
  const pathname = usePathname();
  const phase = useJourneyStore(selectPhase);
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

  /**
   * The ticket is reached by a push, but the screen underneath it may have been
   * replaced by a phase change while the QR code was open, so the way out aims
   * at the act being presented instead of popping blindly.
   */
  const header = (
    <>
      <View style={styles.navRow}>
        <MapBackButton onPress={() => navigateToPhaseRoute(router, phase, pathname)} />
      </View>
      <Text style={styles.title}>Bilhete</Text>
    </>
  );

  if (!trip || !ticket) {
    return (
      <Screen>
        {header}
        <View style={styles.section}>
          <TicketSkeleton />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

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
          <Text style={styles.offlineText}>Disponível sem internet</Text>
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
  navRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
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

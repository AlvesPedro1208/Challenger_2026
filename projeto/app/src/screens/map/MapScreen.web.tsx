import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import {
  selectBus,
  selectPhase,
  selectStops,
  selectTrafficAlert,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { STOPS } from '@jornada/shared';

import { RouteSchematic } from './RouteSchematic';
import { TrafficAlertCard } from './TrafficAlertCard';
import { WaitingCard } from './WaitingCard';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const phase = useJourneyStore(selectPhase);
  const bus = useJourneyStore(selectBus);
  const storeStops = useJourneyStore(selectStops);
  const trafficAlert = useJourneyStore(selectTrafficAlert);
  const trip = useJourneyStore(selectTrip);

  const stops = storeStops.length > 0 ? storeStops : STOPS;
  const onboard = phase === 'ONBOARD' || phase === 'ARRIVED';
  const tracking = onboard && bus.position != null;

  return (
    <View style={styles.root}>
      {/* Na web exibe o mapa vetorial SVG compatível com navegadores */}
      <RouteSchematic stops={stops} bus={tracking ? bus.position : null} />

      <View style={[styles.header, { top: insets.top + spacing.lg }]} pointerEvents="box-none">
        {tracking ? (
          <View style={styles.livePill} pointerEvents="none">
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Ao vivo</Text>
          </View>
        ) : null}
        <View style={styles.headerCard} pointerEvents="none">
          <Text style={styles.headerTitle}>Onde está meu ônibus?</Text>
          {trip ? (
            <Text style={styles.headerRoute}>
              {trip.origin} {'→'} {trip.destination}
            </Text>
          ) : null}
        </View>
        {trafficAlert ? (
          <View pointerEvents="none">
            <TrafficAlertCard alert={trafficAlert} />
          </View>
        ) : null}
      </View>

      <View style={styles.footer} pointerEvents="box-none">
        <WaitingCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  headerCard: {
    backgroundColor: `${colors.bg.surface}F2`,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  headerRoute: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: `${colors.bg.surface}F2`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.success,
  },
  liveLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent.success,
  },
  footer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
  },
});
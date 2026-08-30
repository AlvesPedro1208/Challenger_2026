import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { navigateBack } from '@/navigation';
import {
  selectApproachingStop,
  selectBus,
  selectClockIso,
  selectDwell,
  selectPhase,
  selectStops,
  selectTrafficAlert,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { ROUTE_POINTS, STOPS } from '@jornada/shared';

import { BusMarker } from './BusMarker';
import { MapActionBar } from './MapActionBar';
import { MapBackButton } from './MapBackButton';
import { StatusCards, type NextTarget, type StopHighlight } from './StatusCards';
import { StopMarkers } from './StopMarkers';
import { TrafficAlertCard } from './TrafficAlertCard';
import { WaitingCard } from './WaitingCard';
import { simMinutesBetween } from './formatters';
import { remainingStops } from './routeProgress';

const TRACKING_DELTA = 0.45;
const RECENTER_MS = 900;
const FIT_PADDING = { top: 140, right: 48, bottom: 340, left: 48 };

/** Simulated clock reading of the moment the bus stopped at a support stop. */
type DwellStart = { stopId: string; startIso: string | null };

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phase = useJourneyStore(selectPhase);
  const bus = useJourneyStore(selectBus);
  const approaching = useJourneyStore(selectApproachingStop);
  const dwell = useJourneyStore(selectDwell);
  const clockIso = useJourneyStore(selectClockIso);
  const storeStops = useJourneyStore(selectStops);
  const trafficAlert = useJourneyStore(selectTrafficAlert);
  const trip = useJourneyStore(selectTrip);

  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);

  // The bootstrap (or its offline cache) owns the stops; the bundled dataset is
  // only a fallback for a cold start with no data yet.
  const stops = storeStops.length > 0 ? storeStops : STOPS;

  const onboard = phase === 'ONBOARD' || phase === 'ARRIVED';
  const tracking = onboard && bus.position != null;

  const routeCoords = useMemo<LatLng[]>(
    () => ROUTE_POINTS.map((point) => ({ latitude: point.lat, longitude: point.lng })),
    [],
  );

  const initialRegion = useMemo<Region>(() => {
    const lats = ROUTE_POINTS.map((point) => point.lat);
    const lngs = ROUTE_POINTS.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.4,
      longitudeDelta: (maxLng - minLng) * 1.4,
    };
  }, []);

  // The store clears `dwell` only on the next stop or on arrival, so the screen
  // remembers when the dwell started and drops the card once it is over.
  const [dwellStart, setDwellStart] = useState<DwellStart | null>(null);

  if ((dwell?.stopId ?? null) !== (dwellStart?.stopId ?? null)) {
    setDwellStart(dwell ? { stopId: dwell.stopId, startIso: clockIso } : null);
  }

  const dwellElapsedMin =
    dwell && dwellStart?.stopId === dwell.stopId
      ? simMinutesBetween(dwellStart.startIso, clockIso)
      : null;

  const highlight = useMemo<StopHighlight | null>(() => {
    if (approaching) {
      const stop = stops.find((candidate) => candidate.id === approaching.stopId);
      if (stop) {
        return { kind: 'approaching', stop, inMinutes: approaching.inMinutes };
      }
    }

    if (dwell) {
      const stop = stops.find((candidate) => candidate.id === dwell.stopId);
      const stillStopped = dwellElapsedMin == null || dwellElapsedMin < dwell.dwellMinutes;
      if (stop && stillStopped) {
        return {
          kind: 'dwell',
          stop,
          dwellMinutes: dwell.dwellMinutes,
          minutesLeft:
            dwellElapsedMin == null ? null : Math.max(0, dwell.dwellMinutes - dwellElapsedMin),
        };
      }
    }

    return null;
  }, [approaching, dwell, stops, dwellElapsedMin]);

  // etaNextStopMin counts down to the next support stop while one is ahead, and
  // to the destination once they are all behind the bus.
  const nextTarget = useMemo<NextTarget>(() => {
    const [next] = remainingStops(stops, bus.position);
    return next
      ? { kind: 'stop', name: next.name }
      : { kind: 'destination', name: trip?.destination ?? null };
  }, [stops, bus.position, trip]);

  const fitRoute = useCallback(
    (animated: boolean) => {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: FIT_PADDING,
        animated,
      });
    },
    [routeCoords],
  );

  const recenterOnBus = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: TRACKING_DELTA,
        longitudeDelta: TRACKING_DELTA,
      },
      RECENTER_MS,
    );
  }, []);

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
    if (tracking && bus.position) {
      recenterOnBus(bus.position.lat, bus.position.lng);
    } else {
      fitRoute(false);
    }
  }, [tracking, bus.position, recenterOnBus, fitRoute]);

  const positionLat = tracking && bus.position ? bus.position.lat : null;
  const positionLng = tracking && bus.position ? bus.position.lng : null;

  useEffect(() => {
    if (!mapReadyRef.current) {
      return;
    }
    if (positionLat != null && positionLng != null) {
      recenterOnBus(positionLat, positionLng);
    } else {
      fitRoute(true);
    }
  }, [positionLat, positionLng, recenterOnBus, fitRoute]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
        onMapReady={handleMapReady}
        showsCompass={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
      >
        <Polyline
          coordinates={routeCoords}
          strokeColor={colors.accent.primary}
          strokeWidth={4}
        />
        <StopMarkers stops={stops} />
        {tracking && bus.position ? <BusMarker position={bus.position} /> : null}
      </MapView>

      <View style={[styles.header, { top: insets.top + spacing.lg }]} pointerEvents="box-none">
        <View style={styles.navRow} pointerEvents="box-none">
          <MapBackButton onPress={() => navigateBack(router)} />
          {tracking ? (
            <View style={styles.livePill} pointerEvents="none">
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Ao vivo</Text>
            </View>
          ) : null}
        </View>
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

      <View
        style={[styles.footer, { bottom: insets.bottom + spacing.md }]}
        pointerEvents="box-none"
      >
        {tracking ? (
          <StatusCards bus={bus} highlight={highlight} nextTarget={nextTarget} />
        ) : (
          <WaitingCard />
        )}
        <MapActionBar
          onOpenStats={() => router.push('/stats')}
          onOpenTicket={() => router.push('/ticket')}
        />
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: spacing.sm,
  },
});

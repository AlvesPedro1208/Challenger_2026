import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  selectApproachingStop,
  selectBus,
  selectPhase,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { ROUTE_POINTS, STOPS } from '@jornada/shared';

import { BusMarker } from './BusMarker';
import { StatusCards } from './StatusCards';
import { StopMarkers } from './StopMarkers';
import { WaitingCard } from './WaitingCard';

const TRACKING_DELTA = 0.45;
const RECENTER_MS = 900;
const FIT_PADDING = { top: 96, right: 48, bottom: 280, left: 48 };

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const phase = useJourneyStore(selectPhase);
  const bus = useJourneyStore(selectBus);
  const approaching = useJourneyStore(selectApproachingStop);
  const trip = useJourneyStore(selectTrip);

  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);

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

  const approachingInfo = useMemo(() => {
    if (!approaching) {
      return null;
    }
    const stop = STOPS.find((candidate) => candidate.id === approaching.stopId);
    return stop ? { stop, inMinutes: approaching.inMinutes } : null;
  }, [approaching]);

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
        <StopMarkers stops={STOPS} />
        {tracking && bus.position ? <BusMarker position={bus.position} /> : null}
      </MapView>

      <View style={[styles.header, { top: insets.top + spacing.sm }]} pointerEvents="none">
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Onde está meu ônibus?</Text>
          {trip ? (
            <Text style={styles.headerRoute}>
              {trip.origin} {'→'} {trip.destination}
            </Text>
          ) : null}
        </View>
        {tracking ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Ao vivo</Text>
          </View>
        ) : null}
      </View>

      <View
        style={[styles.footer, { bottom: insets.bottom + spacing.md }]}
        pointerEvents="box-none"
      >
        {tracking ? <StatusCards bus={bus} approaching={approachingInfo} /> : <WaitingCard />}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCard: {
    backgroundColor: `${colors.bg.surface}F2`,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexShrink: 1,
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
    marginTop: spacing.xs,
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
  },
});

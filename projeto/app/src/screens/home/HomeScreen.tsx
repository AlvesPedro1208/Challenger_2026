import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Trip } from '@jornada/shared';

import { AlertBanner, Card, PrimaryButton, Screen, StatusPill } from '@/components/ui';
import { cityName } from '@/lib/place';
import {
  selectArrived,
  selectBus,
  selectClockIso,
  selectPhase,
  selectPlatform,
  selectRisk,
  selectTrafficAlert,
  selectTrip,
  useJourneyStore,
  type BusState,
  type RiskState,
} from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { resolveArrivalCta, type ArrivalCtaVariant } from './arrivalCta';
import { countdownBetween, formatCountdown, formatTimeHM, isPastDeadline } from './format';
import { HeroTripCard } from './HeroTripCard';
import { RebookModal } from './RebookModal';
import { RefundModal } from './RefundModal';
import { RiskCard, type RiskResolution } from './RiskCard';

export function HomeScreen() {
  const router = useRouter();

  const trip = useJourneyStore(selectTrip);
  const clockIso = useJourneyStore(selectClockIso);
  const phase = useJourneyStore(selectPhase);
  const platform = useJourneyStore(selectPlatform);
  const risk = useJourneyStore(selectRisk);
  const trafficAlert = useJourneyStore(selectTrafficAlert);
  const bus = useJourneyStore(selectBus);
  const arrived = useJourneyStore(selectArrived);

  const [rebookVisible, setRebookVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [resolution, setResolution] = useState<RiskResolution | null>(null);
  const [decidedRisk, setDecidedRisk] = useState<RiskState | null>(risk);

  // Every RISK_UPDATE builds a fresh risk object in the store, so a different
  // reference means a new alert (the panel can re-fire the scene with the same
  // numbers). The previous decision no longer applies: bring the actions back.
  if (risk !== decidedRisk) {
    setDecidedRisk(risk);
    setResolution(null);
    setRebookVisible(false);
    setRefundVisible(false);
  }

  if (!trip) {
    return (
      <Screen>
        <Text style={styles.title}>Sua viagem</Text>
        <View style={styles.section}>
          <HomeSkeleton />
        </View>
      </Screen>
    );
  }

  const onboard = phase === 'ONBOARD' || phase === 'ARRIVED';
  const currentPlatform = platform.current ?? trip.platform;
  const allClear =
    !trafficAlert && !risk && !platform.pendingChange && bus.delayMin <= 0 && !onboard;
  const refundExpired = risk ? isPastDeadline(clockIso, risk.refundDeadlineIso) : false;
  const arrivalCta = resolveArrivalCta({ arrived, phase });
  // Exactly one pink per screen: whichever button the arrival CTA is not.
  const mapVariant: ArrivalCtaVariant = arrivalCta.variant === 'pink' ? 'purple' : 'pink';

  return (
    <Screen>
      <Text style={styles.title}>Sua viagem</Text>

      {trafficAlert ? (
        <View style={styles.section}>
          <AlertBanner
            message={`${trafficAlert.message} · Terminal em ${trafficAlert.etaToTerminalMin} min`}
            actionLabel="Ver rota"
            onAction={() => router.push('/map')}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        {onboard ? (
          <OnboardSummaryCard
            trip={trip}
            bus={bus}
            arrived={phase === 'ARRIVED'}
            platform={currentPlatform}
            mapVariant={mapVariant}
            onOpenMap={() => router.push('/map')}
          />
        ) : (
          <HeroTripCard
            trip={trip}
            clockIso={clockIso}
            platformCurrent={platform.current}
            allClear={allClear}
          />
        )}
      </View>

      {arrivalCta.visible ? (
        <View style={styles.section}>
          <ArrivalCard
            city={cityName(trip.destination)}
            variant={arrivalCta.variant}
            onOpenArrival={() => router.push('/arrival')}
          />
        </View>
      ) : null}

      {phase === 'EN_ROUTE_TERMINAL' ? (
        <View style={styles.section}>
          <EnRouteCard
            trip={trip}
            clockIso={clockIso}
            etaToTerminalMin={trafficAlert?.etaToTerminalMin ?? null}
            onOpenMap={() => router.push('/map')}
          />
        </View>
      ) : null}

      {risk ? (
        <View style={styles.section}>
          <RiskCard
            risk={risk}
            resolution={resolution}
            clockIso={clockIso}
            departureIso={trip.departureIso}
            trafficAlert={trafficAlert}
            platform={currentPlatform}
            showRouteAction={phase !== 'EN_ROUTE_TERMINAL'}
            routeVariant={mapVariant}
            onRebook={() => setRebookVisible(true)}
            onRefund={() => setRefundVisible(true)}
            onLeaveNow={() => setResolution('leaving')}
            onReviewOptions={() => setResolution(null)}
            onOpenMap={() => router.push('/map')}
          />
        </View>
      ) : null}

      {risk ? (
        <>
          <RebookModal
            visible={rebookVisible}
            feeBRL={risk.rebookFeeBRL}
            onConfirm={() => {
              setResolution('rebooked');
              setRebookVisible(false);
            }}
            onClose={() => setRebookVisible(false)}
          />
          <RefundModal
            visible={refundVisible}
            deadlineIso={risk.refundDeadlineIso}
            departureIso={trip.departureIso}
            retentionPct={risk.refundRetentionPct}
            expired={refundExpired}
            onConfirm={() => {
              setResolution('refunded');
              setRefundVisible(false);
            }}
            onClose={() => setRefundVisible(false)}
          />
        </>
      ) : null}
    </Screen>
  );
}

type ArrivalCardProps = {
  city: string;
  variant: ArrivalCtaVariant;
  onOpenArrival: () => void;
};

/**
 * The only door to the arrival that survives a tap on the tab bar: without it,
 * leaving the last act means coming back through the ticket's arrow or a new
 * phase fired from the panel.
 */
function ArrivalCard({ city, variant, onOpenArrival }: ArrivalCardProps) {
  return (
    <Card style={styles.blockCard}>
      <Text style={styles.sectionLabel}>Você chegou</Text>
      <Text style={styles.blockTitle}>{city}</Text>
      <Text style={styles.blockBody}>
        O que está aberto perto do desembarque e o seu histórico nesta rota.
      </Text>
      <PrimaryButton
        label="Ver recomendações do destino"
        variant={variant}
        onPress={onOpenArrival}
      />
    </Card>
  );
}

type EnRouteCardProps = {
  trip: Trip;
  clockIso: string | null;
  etaToTerminalMin: number | null;
  onOpenMap: () => void;
};

function EnRouteCard({ trip, clockIso, etaToTerminalMin, onOpenMap }: EnRouteCardProps) {
  const countdown = countdownBetween(clockIso, trip.departureIso);
  const margin = countdown ? formatCountdown(countdown) : null;

  return (
    <Card style={styles.blockCard}>
      <Text style={styles.sectionLabel}>A caminho do terminal</Text>
      <Text style={styles.blockTitle}>
        {etaToTerminalMin !== null
          ? `Chegada ao terminal em ${etaToTerminalMin} min`
          : 'Trânsito tranquilo até o terminal'}
      </Text>
      <Text style={styles.blockBody}>
        {margin
          ? `Embarque na plataforma ${trip.platform} às ${formatTimeHM(trip.departureIso)} — faltam ${margin}.`
          : `Embarque na plataforma ${trip.platform} às ${formatTimeHM(trip.departureIso)}.`}
      </Text>
      <PrimaryButton label="Ver rota até o terminal" onPress={onOpenMap} />
    </Card>
  );
}

type OnboardSummaryCardProps = {
  trip: Trip;
  bus: BusState;
  arrived: boolean;
  platform: string;
  /** Demoted to purple once the arrival CTA below owns the screen's pink. */
  mapVariant: ArrivalCtaVariant;
  onOpenMap: () => void;
};

function OnboardSummaryCard({
  trip,
  bus,
  arrived,
  platform,
  mapVariant,
  onOpenMap,
}: OnboardSummaryCardProps) {
  const delayed = bus.delayMin > 0;
  const arrivalIso = bus.etaDestinationIso ?? trip.arrivalIso;

  return (
    <Card style={styles.blockCard}>
      <Text style={styles.sectionLabel}>{arrived ? 'Viagem concluída' : 'A bordo'}</Text>
      <Text style={styles.summaryRoute} numberOfLines={2}>
        {cityName(trip.origin)} <Text style={styles.arrow}>→</Text> {cityName(trip.destination)}
      </Text>
      <Text style={styles.blockBody}>
        Poltrona {trip.seat} · {trip.busClass} · Plataforma {platform}
      </Text>

      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>{arrived ? 'Chegada' : 'Chegada prevista'}</Text>
          <Text style={styles.summaryValue}>{formatTimeHM(arrivalIso)}</Text>
        </View>
        <StatusPill
          label={
            arrived
              ? 'Você chegou ao destino'
              : delayed
                ? `Atraso de ${bus.delayMin} min`
                : 'No horário'
          }
          tone={arrived ? 'success' : delayed ? 'warning' : 'success'}
        />
      </View>

      <PrimaryButton label="Acompanhar no mapa" variant={mapVariant} onPress={onOpenMap} />
    </Card>
  );
}

function HomeSkeleton() {
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulse }]}>
      <View style={styles.skeletonLineWide} />
      <View style={styles.skeletonLineWide} />
      <View style={styles.skeletonLineNarrow} />
      <View style={styles.skeletonPillRow}>
        <View style={styles.skeletonPill} />
        <View style={styles.skeletonPill} />
      </View>
      <View style={styles.skeletonBlock} />
    </Animated.View>
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
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  blockCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  blockTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  blockBody: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  summaryRoute: {
    ...typography.title,
    color: colors.text.primary,
  },
  arrow: {
    color: colors.text.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.title,
    color: colors.accent.primary,
  },
  skeletonCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  skeletonLineWide: {
    width: '72%',
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.bone.onDark,
  },
  skeletonLineNarrow: {
    width: '48%',
    height: 16,
    borderRadius: radii.sm,
    backgroundColor: colors.bone.onDark,
    marginTop: spacing.xs,
  },
  skeletonPillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skeletonPill: {
    width: 116,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.bone.onDark,
  },
  skeletonBlock: {
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.bone.onDark,
    marginTop: spacing.sm,
  },
});

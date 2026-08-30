import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Trip } from '@jornada/shared';

import { AlertBanner, Card, PrimaryButton, Screen, StatusPill } from '@/components/ui';
import {
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

import { countdownBetween, formatCountdown, formatTimeHM, isPastDeadline } from './format';
import { HeroTripCard } from './HeroTripCard';
import { RebookModal } from './RebookModal';
import { RefundModal } from './RefundModal';

type RiskResolution = 'rebooked' | 'refunded';

export function HomeScreen() {
  const router = useRouter();

  const trip = useJourneyStore(selectTrip);
  const clockIso = useJourneyStore(selectClockIso);
  const phase = useJourneyStore(selectPhase);
  const platform = useJourneyStore(selectPlatform);
  const risk = useJourneyStore(selectRisk);
  const trafficAlert = useJourneyStore(selectTrafficAlert);
  const bus = useJourneyStore(selectBus);

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
  const allClear =
    !trafficAlert && !risk && !platform.pendingChange && bus.delayMin <= 0 && !onboard;
  const refundExpired = risk ? isPastDeadline(clockIso, risk.refundDeadlineIso) : false;

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
            platform={platform.current ?? trip.platform}
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
          <Card style={styles.riskCard}>
            <View style={styles.riskBar} />
            <Text style={styles.sectionLabel}>Risco de perder o embarque</Text>
            <Text style={styles.riskValue}>{risk.riskPct}%</Text>
            <Text style={styles.riskHint}>
              Dá tempo de decidir agora: remarcar mantém o valor pago, cancelar devolve o
              restante.
            </Text>

            {resolution ? (
              <StatusPill
                label={
                  resolution === 'rebooked'
                    ? 'Remarcação solicitada'
                    : 'Cancelamento com reembolso solicitado'
                }
                tone="success"
              />
            ) : (
              <View style={styles.riskActions}>
                <PrimaryButton
                  label="Remarcar passagem"
                  disabled={!risk.canRebook}
                  onPress={() => setRebookVisible(true)}
                />
                <PrimaryButton
                  label="Cancelar com reembolso"
                  variant="purple"
                  onPress={() => setRefundVisible(true)}
                />
              </View>
            )}
          </Card>
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
  onOpenMap: () => void;
};

function OnboardSummaryCard({
  trip,
  bus,
  arrived,
  platform,
  onOpenMap,
}: OnboardSummaryCardProps) {
  const delayed = bus.delayMin > 0;
  const arrivalIso = bus.etaDestinationIso ?? trip.arrivalIso;

  return (
    <Card style={styles.blockCard}>
      <Text style={styles.sectionLabel}>{arrived ? 'Viagem concluída' : 'A bordo'}</Text>
      <Text style={styles.summaryRoute}>
        {trip.origin} <Text style={styles.arrow}>→</Text> {trip.destination}
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

      <PrimaryButton label="Acompanhar no mapa" onPress={onOpenMap} />
    </Card>
  );
}

const SKELETON_BONE = 'rgba(255, 255, 255, 0.08)';

function HomeSkeleton() {
  const pulse = useRef(new Animated.Value(0.5)).current;

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
  riskCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  riskBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.accent.primary,
  },
  riskValue: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.accent.primary,
  },
  riskHint: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  riskActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
    backgroundColor: SKELETON_BONE,
  },
  skeletonLineNarrow: {
    width: '48%',
    height: 16,
    borderRadius: radii.sm,
    backgroundColor: SKELETON_BONE,
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
    backgroundColor: SKELETON_BONE,
  },
  skeletonBlock: {
    height: 64,
    borderRadius: radii.md,
    backgroundColor: SKELETON_BONE,
    marginTop: spacing.sm,
  },
});

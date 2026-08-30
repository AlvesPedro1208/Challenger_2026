import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { DemoPhase } from '@jornada/shared';

import { AlertBanner, Card, PrimaryButton, Screen } from '@/components/ui';
import {
  selectClockIso,
  selectIndoorMap,
  selectPhase,
  selectPlatform,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { formatDuration, formatIsoTime, minutesUntil } from './format';
import { IndoorMapView } from './IndoorMapView';
import { indoorGraphFor } from './indoorRoute';
import { resolveWalkGuidance, type PlatformChangeInput } from './walk';

const PHASE_ORDER: DemoPhase[] = ['HOME', 'EN_ROUTE_TERMINAL', 'TERMINAL', 'ONBOARD', 'ARRIVED'];

function isAfter(phase: DemoPhase, reference: DemoPhase): boolean {
  return PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(reference);
}

export function TerminalScreen() {
  const router = useRouter();
  const phase = useJourneyStore(selectPhase);
  const trip = useJourneyStore(selectTrip);
  const clockIso = useJourneyStore(selectClockIso);
  const platform = useJourneyStore(selectPlatform);
  const indoorMap = useJourneyStore(selectIndoorMap);

  /**
   * Dismissal is tracked by the pending-change object itself, not by its
   * "from-to" labels: the store builds a new object on every PLATFORM_CHANGE
   * event, so re-firing the same 45 -> 48 change from the panel shows the
   * banner again (the demo is rehearsed many times).
   */
  const [dismissedChange, setDismissedChange] = useState<PlatformChangeInput | null>(null);

  const currentPlatform = platform.current ?? trip?.platform ?? null;
  const pendingChange = platform.pendingChange;

  const graph = useMemo(() => (indoorMap ? indoorGraphFor(indoorMap) : null), [indoorMap]);
  const walk = useMemo(
    () => resolveWalkGuidance(indoorMap, currentPlatform, pendingChange),
    [indoorMap, currentPlatform, pendingChange],
  );

  const boardingTime = formatIsoTime(trip?.departureIso);
  const minutesToBoarding = minutesUntil(trip?.departureIso, clockIso);

  const showChangeBanner =
    pendingChange !== null && pendingChange !== dismissedChange && walk?.bannerMessage != null;

  if (!indoorMap) {
    return (
      <Screen>
        <Text style={styles.title}>Modo Terminal</Text>
        <View style={styles.section}>
          <Card>
            <Text style={styles.body}>Carregando o mapa do terminal…</Text>
          </Card>
        </View>
      </Screen>
    );
  }

  if (phase !== 'TERMINAL') {
    const boarded = isAfter(phase, 'TERMINAL');

    return (
      <Screen>
        <Text style={styles.title}>Modo Terminal</Text>
        <Text style={styles.subtitle}>
          {boarded ? 'Embarque concluído' : 'Você ainda não está na rodoviária'}
        </Text>

        <View style={styles.section}>
          <Card>
            <Text style={styles.body}>
              {boarded
                ? 'Você já está a bordo. O mapa do terminal fica aqui apenas para consulta.'
                : 'Ao chegar à rodoviária o app abre a rota indoor até a sua plataforma e avisa se ela mudar.'}
            </Text>
            {boardingTime && currentPlatform ? (
              <Text style={styles.bodyMeta}>
                Plataforma {currentPlatform} · embarque às {boardingTime}
              </Text>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Prévia do mapa</Text>
          <View style={styles.preview}>
            <IndoorMapView
              map={indoorMap}
              graph={graph}
              activePlatform={currentPlatform}
              route={null}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Modo Terminal</Text>

      <View style={styles.headerRow}>
        <View style={styles.platformBadge}>
          <Text style={styles.platformBadgeLabel}>
            {currentPlatform ? `Plataforma ${currentPlatform}` : 'Plataforma a definir'}
          </Text>
        </View>
        {boardingTime ? (
          <Text style={styles.boarding}>
            Embarque às {boardingTime}
            {minutesToBoarding !== null
              ? minutesToBoarding > 0
                ? ` · em ${formatDuration(minutesToBoarding)}`
                : ' · liberado'
              : ''}
          </Text>
        ) : null}
      </View>

      {showChangeBanner && walk?.bannerMessage ? (
        <View style={styles.section}>
          <AlertBanner
            message={walk.bannerMessage}
            actionLabel="Entendi"
            onAction={() => setDismissedChange(pendingChange)}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <IndoorMapView
          map={indoorMap}
          graph={graph}
          activePlatform={currentPlatform}
          route={walk?.route ?? null}
        />
      </View>

      {walk ? (
        <View style={styles.section}>
          <Card>
            <Text style={styles.sectionLabel}>Caminhada até o embarque</Text>
            <Text style={styles.walkValue}>{walk.label}</Text>
            <Text style={styles.bodyMeta}>{walk.caption}</Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <PrimaryButton label="Abrir bilhete" onPress={() => router.push('/ticket')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  platformBadge: {
    backgroundColor: colors.accent.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  platformBadgeLabel: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  boarding: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  body: {
    ...typography.body,
    color: colors.text.primary,
  },
  bodyMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  walkValue: {
    ...typography.display,
    color: colors.accent.primary,
    marginTop: spacing.sm,
  },
  preview: {
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});

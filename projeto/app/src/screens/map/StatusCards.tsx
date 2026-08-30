import { StyleSheet, Text, View } from 'react-native';

import type { BusState } from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Stop } from '@jornada/shared';

import {
  formatMinutes,
  formatRating,
  formatSimClock,
  formatSpeed,
  topRatedPois,
} from './formatters';

/** The support stop the screen is currently narrating: the next one, or the one being served. */
export type StopHighlight =
  | { kind: 'approaching'; stop: Stop; inMinutes: number }
  | { kind: 'dwell'; stop: Stop; dwellMinutes: number; minutesLeft: number | null };

/** What `bus.etaNextStopMin` is counting down to right now. */
export type NextTarget =
  | { kind: 'stop'; name: string }
  | { kind: 'destination'; name: string | null };

type StatusCardsProps = {
  bus: BusState;
  highlight: StopHighlight | null;
  nextTarget: NextTarget;
};

export function StatusCards({ bus, highlight, nextTarget }: StatusCardsProps) {
  const delayed = bus.delayMin > 0;
  const arrivalClock = formatSimClock(bus.etaDestinationIso);

  return (
    <View style={styles.root}>
      {highlight ? <StopCard highlight={highlight} /> : null}

      <View style={styles.card}>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Velocidade</Text>
            <Text style={styles.cellValue}>
              {bus.position ? formatSpeed(bus.position.speedKmh) : '--'}
            </Text>
          </View>

          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Atraso</Text>
            {delayed ? (
              <View style={styles.delayBadge}>
                <Text style={styles.delayBadgeText}>+{bus.delayMin} min</Text>
              </View>
            ) : (
              <Text style={[styles.cellValue, styles.onTime]}>Em horário</Text>
            )}
            {delayed && bus.delayReason ? (
              <Text style={styles.delayReason} numberOfLines={2}>
                {bus.delayReason}
              </Text>
            ) : null}
          </View>

          <View style={styles.cell}>
            <Text style={styles.cellLabel}>
              {nextTarget.kind === 'stop' ? 'Próxima parada' : 'Chegada em'}
            </Text>
            <Text style={styles.cellValue}>{formatMinutes(bus.etaNextStopMin)}</Text>
            {nextTarget.name ? (
              <Text style={styles.cellCaption} numberOfLines={1}>
                {nextTarget.name}
              </Text>
            ) : null}
          </View>

          <View style={styles.cell}>
            <Text style={styles.cellLabel}>Chegada ao destino</Text>
            <Text style={styles.cellValue}>{arrivalClock ?? '--'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StopCard({ highlight }: { highlight: StopHighlight }) {
  const pois = topRatedPois(highlight.stop);
  const title =
    highlight.kind === 'approaching' ? `Parada em ${highlight.inMinutes} min` : 'Parada agora';
  const meta =
    highlight.kind === 'approaching'
      ? `Parada prevista de ${highlight.stop.scheduledDwellMin} min`
      : dwellMeta(highlight.dwellMinutes, highlight.minutesLeft);

  return (
    <View style={[styles.card, styles.stopCard]}>
      <Text style={styles.stopTitle}>{title}</Text>
      <Text style={styles.stopName}>{highlight.stop.name}</Text>
      <Text style={styles.stopMeta}>{meta}</Text>
      {pois.length > 0 ? (
        <View style={styles.poiList}>
          <Text style={styles.poiHeader}>Bem avaliados na parada</Text>
          {pois.map((poi) => (
            <View key={poi.id} style={styles.poiRow}>
              <Text style={styles.poiName} numberOfLines={1}>
                {poi.name}
              </Text>
              <Text style={styles.poiRating}>{formatRating(poi.rating)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function dwellMeta(dwellMinutes: number, minutesLeft: number | null): string {
  const permanence = `Permanência de ${dwellMinutes} min`;
  return minutesLeft == null ? permanence : `${permanence} · saída em ${minutesLeft} min`;
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: `${colors.bg.surface}F2`,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  cell: {
    width: '50%',
    paddingRight: spacing.sm,
  },
  cellLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  cellValue: {
    ...typography.title,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  cellCaption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  onTime: {
    color: colors.accent.success,
    fontSize: 20,
  },
  delayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.accent.warning}26`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  delayBadgeText: {
    ...typography.subtitle,
    color: colors.accent.warning,
  },
  delayReason: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  stopCard: {
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  stopTitle: {
    ...typography.title,
    color: colors.accent.primary,
  },
  stopName: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  stopMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  poiList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  poiHeader: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  poiName: {
    ...typography.body,
    color: colors.text.primary,
    flexShrink: 1,
  },
  poiRating: {
    ...typography.subtitle,
    fontSize: 15,
    color: colors.accent.warning,
  },
});

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

type ApproachingInfo = {
  stop: Stop;
  inMinutes: number;
};

type StatusCardsProps = {
  bus: BusState;
  approaching: ApproachingInfo | null;
};

export function StatusCards({ bus, approaching }: StatusCardsProps) {
  const delayed = bus.delayMin > 0;
  const arrivalClock = formatSimClock(bus.etaDestinationIso);

  return (
    <View style={styles.root}>
      {approaching ? <ApproachingCard info={approaching} /> : null}

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
            <Text style={styles.cellLabel}>Próxima parada</Text>
            <Text style={styles.cellValue}>{formatMinutes(bus.etaNextStopMin)}</Text>
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

function ApproachingCard({ info }: { info: ApproachingInfo }) {
  const pois = topRatedPois(info.stop);

  return (
    <View style={[styles.card, styles.approachingCard]}>
      <Text style={styles.approachingTitle}>Parada em {info.inMinutes} min</Text>
      <Text style={styles.approachingStopName}>{info.stop.name}</Text>
      <Text style={styles.approachingDwell}>
        Parada prevista de {info.stop.scheduledDwellMin} min
      </Text>
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
  approachingCard: {
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
  approachingTitle: {
    ...typography.title,
    color: colors.accent.primary,
  },
  approachingStopName: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  approachingDwell: {
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

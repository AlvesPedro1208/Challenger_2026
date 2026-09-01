import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import {
  selectDailySeries,
  selectStats,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, spacing, typography } from '@/theme/tokens';

import { DelayHistogram } from './DelayHistogram';
import { DelaySparkline } from './DelaySparkline';
import { cityName } from './helpers';
import { HeroRisk } from './HeroRisk';
import { MetricCards } from './MetricCards';
import { NextActionCard } from './NextActionCard';

export function StatsScreen() {
  const stats = useJourneyStore(selectStats);
  const dailySeries = useJourneyStore(selectDailySeries);
  const trip = useJourneyStore(selectTrip);

  // Without stats the screen must still say what is missing: in airplane mode
  // the data never arrives, and a bare skeleton would pulse forever. The tab
  // bar is the way out of the empty state.
  if (!stats) {
    return (
      <Screen>
        <Text accessibilityRole="header" style={styles.title}>
          Pontualidade do trecho
        </Text>
        <View style={styles.section}>
          <Card>
            <Text style={styles.emptyBody}>
              O histórico de pontualidade deste trecho não está salvo neste aparelho. Ele
              volta assim que o app reconectar.
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  const { riskPct, avgDelayMin, sampleSize, histogram } = stats.last60d;
  const routeLabel = trip ? `${cityName(trip.origin)} → ${cityName(trip.destination)}` : null;
  // Only claim a period when the daily series actually backs the day count.
  const metaLabel =
    dailySeries.length > 0
      ? `Últimos ${dailySeries.length} dias · amostragem de ${sampleSize} viagens`
      : `Amostragem de ${sampleSize} viagens`;

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Pontualidade do trecho
      </Text>
      {routeLabel ? <Text style={styles.route}>{routeLabel}</Text> : null}
      <Text style={styles.meta}>{metaLabel}</Text>

      <HeroRisk riskPct={riskPct} sampleSize={sampleSize} />

      <View style={styles.section}>
        <MetricCards avgDelayMin={avgDelayMin} histogram={histogram} />
      </View>

      <View style={styles.section}>
        <DelayHistogram histogram={histogram} />
      </View>

      {dailySeries.length > 0 ? (
        <View style={styles.section}>
          <DelaySparkline series={dailySeries} />
        </View>
      ) : null}

      <View style={styles.section}>
        <NextActionCard riskPct={riskPct} avgDelayMin={avgDelayMin} />
      </View>

      <Text style={styles.footnote}>
        Estimativas com base no histórico do trecho. Números atualizados a cada viagem
        concluída.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  route: {
    ...typography.subtitle,
    // Raw pink only reaches 4.0:1 on the dark background; the lightened tone clears AA.
    color: colors.onTone.primary,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.md,
  },
  emptyBody: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 21,
  },
  footnote: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});

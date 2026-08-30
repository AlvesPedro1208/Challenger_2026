import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { reliabilityLabel, riskTone, type RiskTone } from './helpers';

const TONE_COLORS: Record<RiskTone, string> = {
  success: colors.accent.success,
  warning: colors.accent.warning,
  danger: colors.accent.primary,
};

type HeroRiskProps = {
  riskPct: number;
  sampleSize: number;
};

export function HeroRisk({ riskPct, sampleSize }: HeroRiskProps) {
  const tone = riskTone(riskPct);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Risco de atraso</Text>
      <View style={styles.numberRow}>
        <Text style={[styles.number, { color: TONE_COLORS[tone] }]}>{riskPct}</Text>
        <Text style={[styles.unit, { color: TONE_COLORS[tone] }]}>%</Text>
      </View>
      <Text style={styles.caption}>chance de atraso relevante neste trecho</Text>
      <View style={styles.pillRow}>
        <StatusPill label={reliabilityLabel(sampleSize)} tone="purple" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  label: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  number: {
    fontSize: 88,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 92,
  },
  unit: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  caption: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pillRow: {
    marginTop: spacing.md,
  },
});

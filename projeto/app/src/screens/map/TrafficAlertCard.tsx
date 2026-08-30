import { StyleSheet, Text, View } from 'react-native';

import type { TrafficAlertState } from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type TrafficAlertCardProps = {
  alert: TrafficAlertState;
};

/**
 * The Home banner sends the passenger here with "Ver rota", so the map has to
 * repeat what changed and how long the terminal is away.
 */
export function TrafficAlertCard({ alert }: TrafficAlertCardProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{alert.message}</Text>
      <View style={styles.etaPill}>
        <Text style={styles.etaLabel}>Terminal em {alert.etaToTerminalMin} min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accent.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  etaPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.bg.primary}59`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
  },
  etaLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
});

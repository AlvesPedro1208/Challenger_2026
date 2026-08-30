import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

export function WaitingCard() {
  return (
    <View style={styles.card}>
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.pillLabel}>Aguardando embarque</Text>
      </View>
      <Text style={styles.body}>
        Esta é a rota da sua viagem. Assim que o ônibus partir, você acompanha a posição dele aqui
        em tempo real.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.bg.surface}F2`,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: `${colors.accent.warning}26`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.warning,
  },
  pillLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent.warning,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },
});

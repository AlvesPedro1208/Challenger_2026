import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import type { MealPeriod } from './arrivalLogic';

type WelcomeHeaderProps = {
  greeting: string;
  welcome: string;
  terminal: string | null;
  period: MealPeriod;
  delayMin: number;
};

const PERIOD_HINTS: Record<MealPeriod, string> = {
  breakfast: 'Que tal um café antes de seguir viagem?',
  lunch: 'Hora do almoço: veja os lugares bem avaliados por perto.',
  dinner: 'Hora do jantar: veja os lugares bem avaliados por perto.',
  generic: 'Veja serviços e lugares bem avaliados por perto.',
};

export function WelcomeHeader({ greeting, welcome, terminal, period, delayMin }: WelcomeHeaderProps) {
  return (
    <View>
      <Text style={styles.greeting}>{greeting}!</Text>
      <Text style={styles.title}>{welcome}</Text>
      {terminal ? <Text style={styles.terminal}>Você desembarcou no {terminal}</Text> : null}
      <View style={styles.pillRow}>
        <StatusPill label="Viagem concluída" tone="success" />
      </View>
      {delayMin > 0 ? (
        <Text style={styles.delayLine}>Chegada com {delayMin} min de atraso</Text>
      ) : null}
      <Text style={styles.hint}>{PERIOD_HINTS[period]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    ...typography.subtitle,
    color: colors.accent.primary,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  terminal: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pillRow: {
    marginTop: spacing.sm + 4,
  },
  delayLine: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
});

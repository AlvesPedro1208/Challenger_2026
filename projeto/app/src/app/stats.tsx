import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function StatsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Estatisticas</Text>
      <View style={styles.section}>
        <Card>
          <Text style={styles.label}>Pontualidade da rota</Text>
          <Text style={styles.body}>
            Histograma de pontualidade, risco de atraso e tempo medio de viagem vao aparecer aqui.
          </Text>
          <View style={styles.pillRow}>
            <StatusPill label="Confiabilidade alta" tone="purple" />
          </View>
        </Card>
      </View>
    </Screen>
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
  label: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  body: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  pillRow: {
    marginTop: spacing.sm,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function MapScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Mapa</Text>
      <View style={styles.section}>
        <Card>
          <Text style={styles.label}>Rota ao vivo</Text>
          <Text style={styles.body}>
            O mapa em tempo real da viagem vai aparecer aqui, com o onibus animado sobre a rota.
          </Text>
          <View style={styles.pillRow}>
            <StatusPill label="Em transito" tone="primary" />
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

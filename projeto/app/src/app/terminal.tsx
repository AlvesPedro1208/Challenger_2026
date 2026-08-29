import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Card, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function TerminalScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Terminal</Text>
      <View style={styles.section}>
        <AlertBanner message="Embarque na plataforma 48" actionLabel="Ver no mapa" />
      </View>
      <View style={styles.section}>
        <Card>
          <Text style={styles.label}>Modo terminal</Text>
          <Text style={styles.body}>
            Mapa indoor da rodoviaria, plataforma de embarque e horario previsto vao aparecer aqui.
          </Text>
          <View style={styles.pillRow}>
            <StatusPill label="Embarque em 25 min" tone="warning" />
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

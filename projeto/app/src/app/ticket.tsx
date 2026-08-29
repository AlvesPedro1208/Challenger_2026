import { StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function TicketScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Bilhete</Text>
      <View style={styles.section}>
        <Card>
          <Text style={styles.label}>Bilhete offline</Text>
          <Text style={styles.body}>
            QR Code do bilhete e dados da poltrona vao aparecer aqui, disponiveis mesmo sem rede.
          </Text>
          <View style={styles.pillRow}>
            <StatusPill label="Disponivel offline" tone="success" />
          </View>
        </Card>
      </View>
      <View style={styles.section}>
        <PrimaryButton label="Mostrar ao motorista" variant="green" />
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

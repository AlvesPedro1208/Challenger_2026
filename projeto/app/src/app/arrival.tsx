import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ArrivalScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Chegada</Text>
      <View style={styles.section}>
        <Card>
          <Text style={styles.label}>Bem-vindo ao destino</Text>
          <Text style={styles.body}>
            Boas-vindas contextuais, recomendacoes locais e estatisticas pessoais da rota vao
            aparecer aqui.
          </Text>
          <View style={styles.pillRow}>
            <StatusPill label="Viagem concluida" tone="success" />
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

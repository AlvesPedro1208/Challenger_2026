import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner, Card, PrimaryButton, Screen, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Text style={styles.title}>Sua viagem</Text>

      <View style={styles.section}>
        <AlertBanner message="Plataforma alterada 45 para 48" actionLabel="Ver rota" />
      </View>

      <View style={styles.section}>
        <Card>
          <Text style={styles.route}>Sao Paulo para Rio de Janeiro</Text>
          <Text style={styles.meta}>Hoje, 22:30 - Terminal Tiete</Text>
          <View style={styles.pillRow}>
            <StatusPill label="Tudo certo para sua viagem" tone="success" />
          </View>
        </Card>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Ver mapa da viagem" onPress={() => router.push('/map')} />
        <PrimaryButton
          label="Estatisticas da rota"
          variant="purple"
          onPress={() => router.push('/stats')}
        />
        <PrimaryButton
          label="Modo terminal"
          variant="purple"
          onPress={() => router.push('/terminal')}
        />
        <PrimaryButton
          label="Meu bilhete"
          variant="green"
          onPress={() => router.push('/ticket')}
        />
        <PrimaryButton label="Chegada" variant="green" onPress={() => router.push('/arrival')} />
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
  route: {
    ...typography.title,
    color: colors.text.primary,
  },
  meta: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  pillRow: {
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

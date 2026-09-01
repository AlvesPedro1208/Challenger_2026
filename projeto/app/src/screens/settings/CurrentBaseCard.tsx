import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import type { ResolvedServerBase, ServerBaseSource } from '@/services/serverConfig';
import { colors, spacing, typography } from '@/theme/tokens';

const SOURCE_LABELS: Record<ServerBaseSource, string> = {
  override: 'URL salva neste aparelho',
  build: 'Padrão do build (app.json)',
  metro: 'Rede local do Metro (desenvolvimento)',
};

type CurrentBaseCardProps = {
  base: ResolvedServerBase;
};

/** Says, without ambiguity, which server the app is talking to right now. */
export function CurrentBaseCard({ base }: CurrentBaseCardProps) {
  return (
    <Card>
      <Text style={styles.label}>Em uso agora</Text>
      <Text style={styles.source}>{SOURCE_LABELS[base.source]}</Text>
      <View style={styles.row}>
        <Text style={styles.key}>HTTP</Text>
        <Text style={styles.value}>{base.httpBaseUrl}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.key}>WebSocket</Text>
        <Text style={styles.value}>{base.wsUrl}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  source: {
    ...typography.subtitle,
    color: colors.onTone.primary,
    marginTop: spacing.xs,
  },
  row: {
    marginTop: spacing.sm + 4,
  },
  key: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  value: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: 2,
  },
});

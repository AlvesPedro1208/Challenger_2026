import { StyleSheet, Text, View } from 'react-native';

import { Card, StatusPill } from '@/components/ui';
import type { ResolvedServerBase, ServerBaseSource } from '@/services/serverConfig';
import { colors, spacing, typography, type AccentColor } from '@/theme/tokens';

type SourceDescription = {
  /** Short enough to stay on one pill line at 13pt on a 393pt screen. */
  label: string;
  tone: AccentColor;
  /** The consequence the operator has to read in one second. */
  note: string;
};

// The three sources are not equivalent: an override is the only one the operator
// controls from here, and the Metro fallback in a Release build means the app is
// pointed at nothing useful. The tone carries that ranking; the label carries it
// again as text, so the ranking survives a projector and colour-blind viewing.
const SOURCE_DESCRIPTIONS: Record<ServerBaseSource, SourceDescription> = {
  override: {
    label: 'URL salva neste aparelho',
    tone: 'success',
    note: 'Endereço colado nesta tela. É o que o app usa ao abrir.',
  },
  build: {
    label: 'Padrão do build',
    tone: 'purple',
    note: 'Endereço fixado no app.json. Nenhuma URL salva neste aparelho.',
  },
  metro: {
    label: 'Rede local do Metro',
    tone: 'warning',
    note: 'Só funciona com o Metro na mesma rede. Num build de apresentação, cole a URL do túnel abaixo.',
  },
};

type CurrentBaseCardProps = {
  base: ResolvedServerBase;
};

/** Says, without ambiguity, which server the app is talking to right now. */
export function CurrentBaseCard({ base }: CurrentBaseCardProps) {
  const source = SOURCE_DESCRIPTIONS[base.source];

  return (
    <Card>
      <Text style={styles.label}>Em uso agora</Text>
      <View style={styles.pillRow}>
        <StatusPill label={source.label} tone={source.tone} />
      </View>
      <Text style={styles.note}>{source.note}</Text>
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
  pillRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  note: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 18,
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

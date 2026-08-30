import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { formatBRL } from './format';
import { ModalSheet } from './ModalSheet';

type RebookModalProps = {
  visible: boolean;
  feeBRL: number;
  onConfirm: () => void;
  onClose: () => void;
};

export function RebookModal({ visible, feeBRL, onConfirm, onClose }: RebookModalProps) {
  return (
    <ModalSheet visible={visible} title="Remarcar passagem" onClose={onClose}>
      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Taxa de remarcação</Text>
        <Text style={styles.feeValue}>{formatBRL(feeBRL)}</Text>
      </View>
      <Text style={styles.rule}>
        Pela regra da ANTT, a remarcação pode ser feita até 3 horas antes da partida, mantendo o
        valor já pago na passagem original.
      </Text>
      <PrimaryButton label="Confirmar remarcação" onPress={onConfirm} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  feeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  feeLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  feeValue: {
    ...typography.title,
    color: colors.text.primary,
  },
  rule: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

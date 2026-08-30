import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, StatusPill } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { formatDateTimeLabel, hoursBetween } from './format';
import { ModalSheet } from './ModalSheet';

type RefundModalProps = {
  visible: boolean;
  deadlineIso: string;
  departureIso: string;
  retentionPct: number;
  expired: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function RefundModal({
  visible,
  deadlineIso,
  departureIso,
  retentionPct,
  expired,
  onConfirm,
  onClose,
}: RefundModalProps) {
  const leadHours = hoursBetween(deadlineIso, departureIso);
  const windowLabel =
    leadHours === null
      ? `até ${formatDateTimeLabel(deadlineIso)}`
      : `até ${leadHours} ${leadHours === 1 ? 'hora' : 'horas'} antes da partida`;

  return (
    <ModalSheet visible={visible} title="Cancelar com reembolso" onClose={onClose}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Prazo para cancelar</Text>
        <Text style={styles.rowValue}>{formatDateTimeLabel(deadlineIso)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Retenção</Text>
        <Text style={styles.rowValue}>{retentionPct}% do valor pago</Text>
      </View>
      <Text style={styles.rule}>
        Pela regra da ANTT, o cancelamento com reembolso vale {windowLabel}, com retenção de{' '}
        {retentionPct}% sobre o valor da passagem.
      </Text>
      {expired ? (
        <View style={styles.expiredBlock}>
          <StatusPill label="Prazo expirado" tone="warning" />
          <Text style={styles.expiredHint}>
            O prazo de cancelamento com reembolso já passou no horário atual da viagem.
          </Text>
        </View>
      ) : (
        <PrimaryButton label="Confirmar cancelamento" variant="purple" onPress={onConfirm} />
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  rowValue: {
    ...typography.subtitle,
    color: colors.text.primary,
  },
  rule: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  expiredBlock: {
    gap: spacing.sm,
  },
  expiredHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});

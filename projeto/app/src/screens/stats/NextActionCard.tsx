import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

import { recommendedBufferMin, riskTone } from './helpers';

type NextActionCardProps = {
  riskPct: number;
  avgDelayMin: number;
};

/** Turns the numbers above it into the one decision the passenger has to make. */
export function NextActionCard({ riskPct, avgDelayMin }: NextActionCardProps) {
  const bufferMin = recommendedBufferMin(riskPct, avgDelayMin);
  const headline =
    bufferMin > 0
      ? `Deixe ${bufferMin} min de folga na chegada`
      : 'Pode combinar a chegada no horário previsto';
  const detail =
    bufferMin > 0
      ? `Com ${riskPct}% de risco e ${avgDelayMin} min de atraso médio, essa folga cobre a maior parte das viagens deste trecho.`
      : `Com ${riskPct}% de risco de atraso, o histórico deste trecho raramente muda o seu plano.`;
  const warning =
    riskTone(riskPct) === 'danger' ? 'Vale avisar quem vai te esperar antes de sair.' : null;

  return (
    <Card>
      <Text style={styles.label}>O que fazer com isso</Text>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {warning ? (
        <View style={styles.warningBox}>
          <Text style={styles.warning}>{warning}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  headline: {
    ...typography.title,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  detail: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  warningBox: {
    marginTop: spacing.sm + 2,
  },
  warning: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onTone.warning,
  },
});

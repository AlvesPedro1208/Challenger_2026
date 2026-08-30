import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/theme/tokens';

const INK = '#1A1A1A';
const INK_SOFT = '#6B6572';

type TicketFieldProps = {
  label: string;
  value: string;
  align?: 'left' | 'right';
};

export function TicketField({ label, value, align = 'left' }: TicketFieldProps) {
  const alignment = align === 'right' ? styles.right : undefined;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, alignment]}>{label}</Text>
      <Text style={[styles.value, alignment]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 2,
  },
  label: {
    ...typography.sectionLabel,
    color: INK_SOFT,
  },
  value: {
    ...typography.subtitle,
    color: INK,
  },
  right: {
    textAlign: 'right',
  },
});

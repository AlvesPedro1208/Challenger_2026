import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type AccentColor } from '@/theme/tokens';

type StatusPillProps = {
  label: string;
  tone?: AccentColor;
};

export function StatusPill({ label, tone = 'success' }: StatusPillProps) {
  const accent = colors.accent[tone];
  // The tinted background keeps the accent hue; the label uses the lightened
  // on-tone color so every tone clears WCAG AA (4.5:1) at 13pt.
  const onTone = colors.onTone[tone];

  return (
    <View style={[styles.pill, { backgroundColor: `${accent}26` }]}>
      <View style={[styles.dot, { backgroundColor: onTone }]} />
      <Text style={[styles.label, { color: onTone }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});

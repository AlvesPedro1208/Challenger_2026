import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

type ButtonVariant = 'pink' | 'purple' | 'green';

const variantColors: Record<ButtonVariant, string> = {
  pink: colors.accent.primary,
  purple: colors.accent.purple,
  green: colors.accent.success,
};

// White on the success green is only 2.54:1; dark ink on it is 6.86:1.
// Pink (4.56:1) and purple (5.70:1) keep the white label.
const variantLabelColors: Record<ButtonVariant, string> = {
  pink: colors.text.primary,
  purple: colors.text.primary,
  green: colors.text.dark,
};

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'pink',
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantColors[variant] },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: variantLabelColors[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

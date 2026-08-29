import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

type ButtonVariant = 'pink' | 'purple' | 'green';

const variantColors: Record<ButtonVariant, string> = {
  pink: colors.accent.primary,
  purple: colors.accent.purple,
  green: colors.accent.success,
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
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantColors[variant] },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignItems: 'center',
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

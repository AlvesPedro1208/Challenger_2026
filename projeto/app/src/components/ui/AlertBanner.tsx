import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

type AlertBannerProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AlertBanner({ message, actionLabel, onAction }: AlertBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint={message}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  // Solid pill instead of underlined text: 44pt minimum touch target, and pink on
  // white reaches 4.56:1 where translucent white on the banner only reached 3.84:1.
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  actionPressed: {
    opacity: 0.85,
  },
  action: {
    color: colors.accent.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

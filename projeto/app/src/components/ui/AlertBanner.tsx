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
        <Pressable onPress={onAction} hitSlop={8}>
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
  action: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

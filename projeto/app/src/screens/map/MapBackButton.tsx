import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '@/theme/tokens';

const TOUCH_SIZE = 44;

type MapBackButtonProps = {
  onPress: () => void;
};

/**
 * Floating back control for the screens that need one of their own: the ticket
 * opened from an act with no tab, and the operator settings screen, both
 * reached with no stack to pop and no navigation header.
 */
export function MapBackButton({ onPress }: MapBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>{'←'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: `${colors.bg.surface}F2`,
  },
  pressed: {
    opacity: 0.85,
  },
  glyph: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
